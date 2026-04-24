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
  log.fatal('SUPABASE_URL / SUPBASE_SERVICE_ROLE_KEY missing')
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
    const browser = await getBrowser()
    const result = await runJob(job.data, log, browser)
    log.info({ jobId: job.id, result: result.status }, 'job done')
    return result
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
const healthServer = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', queue: QUEUE_NAME, ts: new Date().toISOString() }))
    return
  }
  res.writeHead(404)
  res.end()
})

healthServer.listen(port, () => {
  log.info({ port }, 'health server listening')
})

async function shutdown(signal: string) {
  log.info({ signal }, 'shutting down')
  try {
    await worker.close()
    await connection.quit()
    healthServer.close()
    if (browserSingleton) {
      await browserSingleton.close().catch(() => null)
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

log.info({ queue: QUEUE_NAME, COncurrency: worker.opts.concurrency }, 'worker ready')
