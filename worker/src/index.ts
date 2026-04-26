// worker/src/index.ts
// ==================================================================
// 42차-2: fly.io 재시작 루프 수정
//   · ENCRYPTION_KEY_HEX → ENCRYPTION_KEK_HEX 이름 통일
//   · 헬스서버 / 경로도 200 응답 추가
// ==================================================================
import { Worker, Queue, Job } from 'bullmq'
import IORedis from 'ioredis'
import pino from 'pino'
import http from 'http'
import { chromium, Browser } from 'playwright'
import { runJob, PlatformJobData } from './jobs'

const log = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'production' ? undefined : { target: 'pino-pretty' },
})

const REDIS_URL = process.env.REDIS_URL
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ENCRYPTION_KEK_HEX = process.env.ENCRYPTION_KEK_HEX

if (!REDIS_URL) {
  log.fatal('REDIS_URL missing')
  process.exit(1)
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  log.fatal('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing')
  process.exit(1)
}
if (!ENCRYPTION_KEK_HEX || ENCRYPTION_KEK_HEX.length !== 64) {
  log.fatal({ val: ENCRYPTION_KEK_HEX?.length }, 'ENCRYPTION_KEK_HEX must be 64 hex chars')
  process.exit(1)
}

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})

connection.on('connect', () => log.info('redis connected'))
connection.on('error', (err) => log.error({ err }, 'redis error'))

let browserSingleton: Browser | null = null
async function getBrowser(): Promise<Browser> {
  if (browserSingleton && browserSingleton.isConnected()) return browserSingleton
  log.info('launching chromium...')
  browserSingleton = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
    ],
  })
  log.info('chromium launched')
  return browserSingleton
}

const QUEUE_NAME = 'platform-jobs'

const worker = new Worker<PlatformJobData>(
  QUEUE_NAME,
  async (job: Job<PlatformJobData>) => {
    log.info({ jobId: job.id, name: job.name, data: { platform: job.data.platform, action: job.data.action } }, 'job start')
    try {
      const browser = await getBrowser()
      const result = await runJob(job.data, log, browser)
      log.info({ jobId: job.id, result: result.status }, 'job done')
      return result
    } catch (err: any) {
      // 43차-2: runJob 이 throw 하면 BullMQ 가 잡을 retry/fail 처리.
      //         로깅은 여기서 한 번 명확하게 남긴다 (worker.on('failed') 도 트리거됨).
      log.error({ jobId: job.id, err: err?.message, stack: err?.stack }, 'job exception')
      throw err
    }
  },
  {
    connection,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '2', 10),
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1000 },
  }
)

worker.on('completed', (job) => {
  log.info({ jobId: job.id }, 'completed')
})

worker.on('failed', (job, err) => {
  log.error({ jobId: job?.id, err: err?.message }, 'failed')
})

worker.on('error', (err) => {
  log.error({ err: err.message }, 'worker error')
})

const port = parseInt(process.env.PORT || '8080', 10)
const healthServer = http.createServer(async (req, res) => {
  if (req.url === '/health' || req.url === '/') {
    // 43차-2: Redis 연결 상태까지 점검해야 fly.io 헬스체크가 의미 있음
    let redisOk = false
    try {
      const pong = await connection.ping()
      redisOk = pong === 'PONG'
    } catch {
      redisOk = false
    }
    const status = redisOk ? 200 : 503
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: redisOk ? 'ok' : 'degraded',
      queue: QUEUE_NAME,
      redis: redisOk ? 'connected' : 'disconnected',
      ts: new Date().toISOString(),
    }))
    return
  }
  res.writeHead(404)
  res.end()
})

healthServer.listen(port, () => {
  log.info({ port }, 'health server listening')
})

// 43차-6: Cloud Run 의 SIGTERM → SIGKILL 그레이스 기간은 기본 10초.
//   합산 타임아웃이 10초를 넘으면 강제 종료되어 큐가 깨질 수 있으므로
//   각 단계 타임아웃을 압축 (worker 5s + redis 1.5s + browser 2s = 8.5s).
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T | null> {
  return Promise.race<T | null>([
    p.catch(() => null) as Promise<T | null>,
    new Promise<null>(resolve => setTimeout(() => {
      log.warn({ label, ms }, 'shutdown step timed out')
      resolve(null)
    }, ms)),
  ])
}

async function shutdown(signal: string) {
  log.info({ signal }, 'shutting down')
  try {
    await withTimeout(worker.close(), 5000, 'worker.close')
    await withTimeout(connection.quit().then(() => undefined), 1500, 'redis.quit')
    healthServer.close()
    if (browserSingleton) {
      await withTimeout(browserSingleton.close(), 2000, 'browser.close')
      browserSingleton = null
    }
  } catch (e) {
    log.error({ e }, 'shutdown error')
  } finally {
    process.exit(0)
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

log.info({ queue: QUEUE_NAME, concurrency: worker.opts.concurrency }, 'worker ready')
