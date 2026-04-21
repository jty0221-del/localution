// worker/src/index.ts
// ============================================================
// 23차-3: Railway Worker 엔트리포인트
//   · BullMQ 기반 플랫폼 자동화 워커
//   · 지원 플랫폼: naver_place / baemin / yogiyo / coupangeats
//   · Redis 연결 → 잡 큐 구독 → 어댑터 라우팅 → Playwright 실행
// ============================================================
import { Worker, Queue, Job } from 'bullmq'
import IORedis from 'ioredis'
import pino from 'pino'
import http from 'http'
import { runJob, PlatformJobData } from './jobs'

const log = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'production' ? undefined : { target: 'pino-pretty' },
})

// ─────────────────────────────────────────────
// 환경 변수 검증
// ─────────────────────────────────────────────
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
  log.fatal('ENCRYPTION_KEK_HEX must be 64 hex chars (32 bytes)')
  process.exit(1)
}

// ─────────────────────────────────────────────
// Redis 연결
// ─────────────────────────────────────────────
const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null, // BullMQ 권장
  enableReadyCheck: false,
})

connection.on('connect', () => log.info('redis connected'))
connection.on('error', (err) => log.error({ err }, 'redis error'))

// ─────────────────────────────────────────────
// Worker 등록 — 큐 이름: 'platform-jobs'
// ─────────────────────────────────────────────
const QUEUE_NAME = 'platform-jobs'

const worker = new Worker<PlatformJobData>(
  QUEUE_NAME,
  async (job: Job<PlatformJobData>) => {
    log.info({ jobId: job.id, name: job.name, data: { platform: job.data.platform, action: job.data.action } }, 'job start')
    const result = await runJob(job.data, log)
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

// ─────────────────────────────────────────────
// 헬스체크 HTTP 서버 (Railway 가 healthcheck path 붙이는 경우 대비)
// ─────────────────────────────────────────────
const port = parseInt(process.env.PORT || '3000', 10)
const healthServer = http.createServer((req, res) => {
  if (req.url === '/health') {
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

// ─────────────────────────────────────────────
// Graceful shutdown
// ─────────────────────────────────────────────
async function shutdown(signal: string) {
  log.info({ signal }, 'shutting down')
  try {
    await worker.close()
    await connection.quit()
    healthServer.close()
  } catch (e) {
    log.error({ e }, 'shutdown error')
  } finally {
    process.exit(0)
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

log.info({ queue: QUEUE_NAME, concurrency: worker.opts.concurrency }, 'worker ready')
