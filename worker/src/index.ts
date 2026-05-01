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
async function closeBrowser() {
  if (browserSingleton) {
    try { await browserSingleton.close() } catch {}
    browserSingleton = null
    log.info('chromium closed and reset')
  }
}

async function getBrowser(): Promise<Browser> {
  // 좀비 브라우저 감지: isConnected()=true 이어도 실제 ping 으로 확인
  if (browserSingleton) {
    if (!browserSingleton.isConnected()) {
      log.warn('chromium: singleton disconnected — resetting')
      await closeBrowser()
    } else {
      // 빠른 활성 확인: 새 blank 페이지 열기
      try {
        const testCtx = await browserSingleton.newContext()
        await testCtx.close()
        return browserSingleton
      } catch (e: any) {
        log.warn({ err: e?.message }, 'chromium: singleton alive-check failed — resetting')
        await closeBrowser()
      }
    }
  }

  log.info('launching chromium...')

  // proxy 설정은 반드시 chromium.launch() 레벨에서 해야 함
  // browser.newContext() 레벨에서 proxy auth 설정 시 ERR_PROXY_AUTH_UNSUPPORTED 발생
  const proxyHost = process.env.PROXY_HOST
  const proxyPort = process.env.PROXY_PORT
  const proxyUser = process.env.PROXY_USER
  const proxyPass = process.env.PROXY_PASS
  const proxyProto = process.env.PROXY_PROTOCOL || 'socks5'  // socks5 기본값 — HTTP는 Chromium 91+ 보안 정책으로 ERR_PROXY_AUTH_UNSUPPORTED 발생

  const launchOptions: any = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-sync',
      '--disable-translate',
      '--mute-audio',
      '--no-first-run',
      '--safebrowsing-disable-auto-update',
      '--disable-blink-features=AutomationControlled',
      '--js-flags=--max-old-space-size=256',
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
      // runJob 이 throw 하면 BullMQ 가 잡을 retry/fail 처리.
      log.error({ jobId: job.id, err: err?.message, stack: err?.stack }, 'job exception')
      throw err
    } finally {
      // 매 잡 종료 후 브라우저 닫기 → 메모리 해제 (다음 잡은 새 브라우저 사용)
      // 특히 브라우저 에러 발생 시 좀비 상태를 막기 위해 반드시 리셋
      await closeBrowser()
    }
  },
  {
    connection,
    concurrency: 1,   // 브라우저 메모리 압박 방지 — 동시 실행 금지 (1GB 머신)
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

// BullMQ Queue (enqueue 전용) — 같은 Redis connection 재사용
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

  // GET /jobs  — 최근 완료/실패 잡 조회 (디버그용)
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

  // POST /trigger  — 수동 잡 등록 (테스트/디버그용)
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

  // GET /debug-creds  — platform_credentials 테이블 플랫폼별 카운트 조회
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

  // POST /run-all?platform=coupangeats  — 모든 유저 잡 일괄 등록
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

  // GET /build-info  — 런타임 빌드 정보 확인 (naver.ts 버전 검증용)
  if (req.method === 'GET' && req.url === '/build-info') {
    try {
      const fs = await import('fs')
      const naverJs = fs.readFileSync('/app/dist/adapters/naver.js', 'utf-8')
      const hasVersion = naverJs.includes('NAVER_CODE_VERSION')
      const versionMatch = naverJs.match(/NAVER_CODE_VERSION\s*=\s*'([^']+)'/)
      // 주요 에러 메시지 문자열 감지
      const hasOldMsg = naverJs.includes('Railway IP') || naverJs.includes('아이디·비밀번호 오류')
      const hasV2Msg = naverJs.includes('[v2] naver login failed')
      const hasV3Msg = naverJs.includes('v3-timeout')
      const hasAbortSignal = naverJs.includes('AbortSignal.timeout')
      // 에러 메시지 주변 30자 추출
      const v2Idx = naverJs.indexOf('[v2] naver login failed')
      const railwayIdx = naverJs.indexOf('Railway IP')
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        ok: true,
        naverJsSize: naverJs.length,
        hasVersionConst: hasVersion,
        versionValue: versionMatch?.[1] || null,
        hasOldMsg,
        hasV2Msg,
        hasV3Msg,
        hasAbortSignal,
        v2MsgSnippet: v2Idx >= 0 ? naverJs.slice(Math.max(0, v2Idx - 10), v2Idx + 60) : null,
        railwayMsgSnippet: railwayIdx >= 0 ? naverJs.slice(Math.max(0, railwayIdx - 10), railwayIdx + 80) : null,
        naverJsSnippet: naverJs.slice(0, 200),
      }))
    } catch (e: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: e?.message }))
    }
    return
  }

  // GET /env-proxy  — 프록시 환경변수 확인 (진단용)
  if (req.method === 'GET' && req.url === '/env-proxy') {
    const ph = process.env.PROXY_HOST
    const pp = process.env.PROXY_PORT
    const pu = process.env.PROXY_USER
    const pw = process.env.PROXY_PASS
    const proto = process.env.PROXY_PROTOCOL
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      PROXY_HOST: ph || '(not set)',
      PROXY_PORT: pp || '(not set)',
      PROXY_USER: pu ? pu.slice(0, 4) + '***' : '(not set)',
      PROXY_PASS: pw ? pw.slice(0, 4) + '***' : '(not set)',
      PROXY_PROTOCOL: proto || '(not set)',
      useProxy: !!(ph && pp),
      hasAuth: !!(pu && pw),
    }))
    return
  }

  // GET /test-proxy  — tunnelFetch 직접 테스트 (진단용)
  if (req.method === 'GET' && req.url === '/test-proxy') {
    const ph = (process.env.PROXY_HOST || '').trim()
    const pp = parseInt((process.env.PROXY_PORT || '0').trim(), 10)
    const pu = (process.env.PROXY_USER || '').trim()
    const pw = (process.env.PROXY_PASS || '').trim()
    if (!ph || !pp || !pu || !pw) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: 'proxy env vars missing' }))
      return
    }
    try {
      const http = await import('node:http')
      const tls = await import('node:tls')
      // Test HTTP CONNECT to proxy
      const connectResult = await new Promise<{ ok: boolean; code: number; body: string }>((resolve) => {
        const proxyAuth = Buffer.from(`${pu}:${pw}`).toString('base64')
        const r = http.default.request({
          hostname: ph, port: pp, method: 'CONNECT',
          path: 'store.coupangeats.com:443',
          headers: { 'Host': 'store.coupangeats.com:443', 'Proxy-Authorization': `Basic ${proxyAuth}`, 'Proxy-Connection': 'keep-alive' },
          timeout: 8000,
        })
        r.on('connect', (res2: any, sock: any) => {
          sock.destroy()
          resolve({ ok: true, code: res2.statusCode, body: '' })
        })
        r.on('response', (res2: any) => {
          let b = ''
          res2.on('data', (c: any) => { b += c.toString() })
          res2.on('end', () => resolve({ ok: false, code: res2.statusCode, body: b.slice(0, 100) }))
        })
        r.on('error', (e: any) => resolve({ ok: false, code: 0, body: String(e.message) }))
        r.on('timeout', () => { r.destroy(); resolve({ ok: false, code: -1, body: 'CONNECT timeout 8s' }) })
        r.end()
      })
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ proxy: `${ph}:${pp}`, ...connectResult }))
    } catch (e: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: e?.message }))
    }
    return
  }

  // GET /test-ip  — Playwright 브라우저로 공개 IP 확인 (SOCKS5 프록시 검증용)
  if (req.method === 'GET' && req.url === '/test-ip') {
    try {
      const browser = await getBrowser()
      const context = await browser.newContext()
      const page = await context.newPage()
      const result = await page.evaluate(() =>
        fetch('https://ipinfo.io/json').then(r => r.json()).catch((e: any) => ({ error: String(e) }))
      ).catch((e: any) => ({ error: String(e) }))
      await context.close().catch(() => null)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        proxyProto: process.env.PROXY_PROTOCOL || 'socks5',
        proxyHost: process.env.PROXY_HOST || '(none)',
        ipInfo: result,
      }))
    } catch (e: any) {
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

// 43차-2: 브라우저/Redis 종료가 행 걸리면 fly.io SIGKILL 까지 시간이 걸림.
//         각 단계에 짧은 타임아웃을 둬서 빠르게 정리하고 빠져나간다.
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
