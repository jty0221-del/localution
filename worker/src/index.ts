// deploy-trigger: 1777617729860
// worker/src/index.ts
// ==================================================================
// 42ì°¨-2: fly.io ì¬ìì ë£¨í ìì 
//   Â· ENCRYPTION_KEY_HEX â ENCRYPTION_KEK_HEX ì´ë¦ íµì¼
//   Â· í¬ì¤ìë² / ê²½ë¡ë 200 ìëµ ì¶ê°
// ==================================================================
import { Worker, Queue, Job } from 'bullmq'
import IORedis from 'ioredis'
import pino from 'pino'
import http from 'http'
import { chromium, Browser } from 'playwright'
import { createClient } from '@supabase/supabase-js'
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

  // proxy ì¤ì ì ë°ëì chromium.launch() ë ë²¨ìì í´ì¼ í¨
  // browser.newContext() ë ë²¨ìì proxy auth ì¤ì  ì ERR_PROXY_AUTH_UNSUPPORTED ë°ì
  const proxyHost = process.env.PROXY_HOST
  const proxyPort = process.env.PROXY_PORT
  const proxyUser = process.env.PROXY_USER
  const proxyPass = process.env.PROXY_PASS
  const proxyProto = process.env.PROXY_PROTOCOL || 'socks5'  // socks5 ê¸°ë³¸ê° â HTTPë Chromium 91+ ë³´ì ì ì±ì¼ë¡ ERR_PROXY_AUTH_UNSUPPORTED ë°ì

  const launchOptions: any = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
    ],
  }

  if (proxyHost && proxyPort) {
    launchOptions.proxy = { server: `${proxyProto}://${proxyHost}:${proxyPort}` }
    if (proxyUser) launchOptions.proxy.username = proxyUser
    if (proxyPass) launchOptions.proxy.password = proxyPass
    log.info({ proxy: `${proxyProto}://${proxyHost}:${proxyPort}`, hasAuth: !!(proxyUser && proxyPass) }, 'chromium: launching with proxy')
  } else {
    log.warn('chromium: no proxy configured (PROXY_HOST/PORT missing)')
  }

  browserSingleton = await chromium.launch(launchOptions)
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
      // 43ì°¨-2: runJob ì´ throw íë©´ BullMQ ê° ì¡ì retry/fail ì²ë¦¬.
      //         ë¡ê¹ì ì¬ê¸°ì í ë² ëªííê² ë¨ê¸´ë¤ (worker.on('failed') ë í¸ë¦¬ê±°ë¨).
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

// BullMQ Queue (enqueue ì ì©) â ê°ì Redis connection ì¬ì¬ì©
const jobQueue = new Queue<PlatformJobData>(QUEUE_NAME, { connection })

const TRIGGER_SECRET = process.env.TRIGGER_SECRET || ''

const port = parseInt(process.env.PORT || '8080', 10)
const healthServer = http.createServer(async (req, res) => {
  if (req.url === '/health' || req.url === '/') {
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

  // GET /jobs  â ìµê·¼ ìë£/ì¤í¨ ì¡ ì¡°í (ëë²ê·¸ì©)
  if (req.method === 'GET' && req.url && req.url.startsWith('/jobs')) {
    const auth = req.headers['authorization'] || ''
    if (TRIGGER_SECRET && auth !== `Bearer ${TRIGGER_SECRET}`) {
      res.writeHead(401, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: 'unauthorized' }))
      return
    }
    try {
      const completed = await jobQueue.getCompleted(0, 9)
      const failed = await jobQueue.getFailed(0, 9)
      const active = await jobQueue.getActive(0, 9)
      const waiting = await jobQueue.getWaiting(0, 9)
      const toInfo = (j: any) => ({
        id: j.id,
        name: j.name,
        data: { platform: j.data?.platform, action: j.data?.action, userId: j.data?.userId?.slice(0, 8) },
        returnvalue: j.returnvalue,
        failedReason: j.failedReason,
        processedOn: j.processedOn,
        finishedOn: j.finishedOn,
      })
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        ok: true,
        counts: { completed: completed.length, failed: failed.length, active: active.length, waiting: waiting.length },
        completed: completed.map(toInfo),
        failed: failed.map(toInfo),
        active: active.map(toInfo),
      }))
    } catch (e: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: e?.message }))
    }
    return
  }

  // POST /trigger  â ìë ì¡ ë±ë¡ (íì¤í¸/ëë²ê·¸ì©)
  if (req.method === 'POST' && req.url === '/trigger') {
    // optional secret check
    const auth = req.headers['authorization'] || ''
    if (TRIGGER_SECRET && auth !== `Bearer ${TRIGGER_SECRET}`) {
      res.writeHead(401, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: 'unauthorized' }))
      return
    }
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', async () => {
      try {
        const data: PlatformJobData = JSON.parse(body)
        const jobId = `manual_${data.platform}_${data.action}_${Date.now()}`
        const job = await jobQueue.add(`${data.platform}:${data.action}`, data, { jobId })
        log.info({ jobId: job.id, data }, '/trigger: job enqueued')
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, jobId: job.id }))
      } catch (e: any) {
        log.error({ err: e?.message }, '/trigger error')
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: false, error: e?.message }))
      }
    })
    return
  }

  // GET /debug-creds  â platform_credentials íì´ë¸ íë«í¼ë³ ì¹´ì´í¸ ì¡°í
  if (req.method === 'GET' && req.url === '/debug-creds') {
    const auth = req.headers['authorization'] || ''
    if (TRIGGER_SECRET && auth !== `Bearer ${TRIGGER_SECRET}`) {
      res.writeHead(401, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: 'unauthorized' }))
      return
    }
    try {
      const svc = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
      const { data, error } = await svc
        .from('platform_credentials')
        .select('platform, last_login_status, user_id')
        .limit(100)
      if (error) throw new Error('DB error: ' + error.message)
      const summary: Record<string, number> = {}
      for (const r of (data || [])) {
        summary[r.platform] = (summary[r.platform] || 0) + 1
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, total: data?.length || 0, byPlatform: summary, sample: data?.slice(0,3).map(r => ({platform: r.platform, status: r.last_login_status, userId: r.user_id?.slice(0,8)+'...'})) }))
    } catch (e: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: e?.message }))
    }
    return
  }

  // POST /run-all?platform=coupangeats  â ëª¨ë  ì ì  ì¡ ì¼ê´ ë±ë¡
  if (req.method === 'POST' && req.url && req.url.startsWith('/run-all')) {
    const auth = req.headers['authorization'] || ''
    if (TRIGGER_SECRET && auth !== `Bearer ${TRIGGER_SECRET}`) {
      res.writeHead(401, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: 'unauthorized' }))
      return
    }
    const platform = new URL(req.url, 'http://localhost').searchParams.get('platform') || 'coupangeats'
    try {
      const svc = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
      const { data: creds, error } = await svc
        .from('platform_credentials')
        .select('user_id, platform_store_id')
        .eq('platform', platform)
        .or('last_login_status.neq.disabled,last_login_status.is.null')
      if (error) throw new Error('DB error: ' + error.message)
      const queued: string[] = []
      for (const cred of (creds || [])) {
        const jobId = `runall_${cred.user_id}_${platform}_${Date.now()}`
        const job = await jobQueue.add(`${platform}:fetch_reviews`, {
          platform: platform as any,
          action: 'fetch_reviews',
          userId: cred.user_id,
          storeId: cred.platform_store_id || 'unknown',
        }, { jobId })
        queued.push(String(job.id))
        log.info({ jobId: job.id, userId: cred.user_id, platform }, '/run-all: enqueued')
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, platform, queued, total: queued.length }))
    } catch (e: any) {
      log.error({ err: e?.message }, '/run-all error')
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: e?.message }))
    }
    return
  }

  res.writeHead(404)
  res.end()
})

healthServer.listen(port, () => {
  log.info({ port }, 'health server listening')
})

// 43ì°¨-2: ë¸ë¼ì°ì /Redis ì¢ë£ê° í ê±¸ë¦¬ë©´ fly.io SIGKILL ê¹ì§ ìê°ì´ ê±¸ë¦¼.
//         ê° ë¨ê³ì ì§§ì íìììì ë¬ì ë¹ ë¥´ê² ì ë¦¬íê³  ë¹ ì ¸ëê°ë¤.
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
    await withTimeout(worker.close(), 8000, 'worker.close')
    await withTimeout(connection.quit().then(() => undefined), 3000, 'redis.quit')
    healthServer.close()
    if (browserSingleton) {
      await withTimeout(browserSingleton.close(), 5000, 'browser.close')
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
