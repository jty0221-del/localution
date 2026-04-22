// app/lib/queue.ts
// ============================================================
// 32차-4 · BullMQ 큐 클라이언트 (Vercel 측 → Railway Worker 로 enqueue)
//   · REDIS_URL 필수 (Vercel env 에 Railway 와 동일한 값으로 설정)
//   · 큐 이름은 Worker 와 동일: 'platform-jobs'
//   · 싱글턴 패턴 — Node 런타임에서 재사용
// ============================================================
import { Queue, QueueOptions } from 'bullmq'
import IORedis from 'ioredis'

export type Platform = 'naver_place' | 'baemin' | 'yogiyo' | 'coupangeats' | 'kakao_map'
export type Action = 'fetch_reviews' | 'post_reply' | 'fetch_rank' | 'health_check'

export interface PlatformJobData {
  platform: Platform
  action: Action
  userId: string
  storeId: string
  payload?: Record<string, unknown>
}

const QUEUE_NAME = 'platform-jobs'

let redisClient: IORedis | null = null
let queueInstance: Queue<PlatformJobData> | null = null

function getRedis(): IORedis {
  if (redisClient) return redisClient
  const url = process.env.REDIS_URL
  if (!url) throw new Error('REDIS_URL missing — BullMQ enqueue 불가')
  redisClient = new IORedis(url, {
    maxRetriesPerRequest: null,   // BullMQ requirement
    enableReadyCheck: false,
    lazyConnect: false,
    connectTimeout: 5000,          // 5s 내 연결 못 하면 즉시 실패
    commandTimeout: 8000,          // 개별 커맨드 8s timeout
    retryStrategy: (times) => (times > 2 ? null : Math.min(times * 500, 2000)),
  })
  redisClient.on('error', () => {/* swallow — throw는 enqueue 단에서 */})
  return redisClient
}

export function getPlatformQueue(): Queue<PlatformJobData> {
  if (queueInstance) return queueInstance
  const connection = getRedis()
  const opts: QueueOptions = {
    connection,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'exponential', delay: 15_000 },
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 1000 },
    },
  }
  queueInstance = new Queue<PlatformJobData>(QUEUE_NAME, opts)
  return queueInstance
}

export async function enqueuePlatformJob(
  data: PlatformJobData,
  opts: { jobId?: string; priority?: number } = {},
): Promise<{ ok: true; jobId: string } | { ok: false; error: string }> {
  try {
    const q = getPlatformQueue()
    // 10s 이상 걸리면 강제 실패 — hang 방지
    const addPromise = q.add(`${data.platform}:${data.action}`, data, {
      jobId: opts.jobId,
      priority: opts.priority,
    })
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('enqueue timeout (10s) — Redis 연결 확인')), 10_000),
    )
    const job = await Promise.race([addPromise, timeout])
    return { ok: true, jobId: String(job.id) }
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) }
  }
}
