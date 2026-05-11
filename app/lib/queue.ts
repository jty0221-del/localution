// app/lib/queue.ts
// ============================================================
// 32차-4 · BullMQ 큐 클라이언트 (Vercel 측 → Railway Worker 로 enqueue)
//   · REDIS_URL 필수 (Vercel env 에 Railway 와 동일한 값으로 설정)
//   · 큐 이름은 Worker 와 동일: 'platform-jobs'
//   · 싱글턴 패턴 — Node 런타임에서 재사용
// ============================================================
import { Queue, QueueOptions } from 'bullmq'
import IORedis from 'ioredis'

export type Platform = 'naver_place' | 'baemin' | 'yogiyo' | 'coupangeats' | 'kakao_map' | 'threads'
export type Action = 'fetch_reviews' | 'post_reply' | 'fetch_rank' | 'health_check' | 'fetch_menu' | 'threads_publish'

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
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
  })
  return redisClient
}

export function getPlatformQueue(): Queue<PlatformJobData> {
  if (queueInstance) return queueInstance
  const connection = getRedis()
  const opts: QueueOptions = {
    connection,
    defaultJobOptions: {
      // 37차-19: CAPTCHA 풀이 실패 등 transient error 자동 재시도 (총 3회 시도)
      attempts: 3,
      backoff: { type: 'exponential', delay: 8_000 },  // 8s, 16s, 32s
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
): Promise<{ ok: true; jobId: string; deduped?: boolean } | { ok: false; error: string }> {
  try {
    const q = getPlatformQueue()
    // BullMQ priority: 낮은 숫자 = 높은 우선순위 (1 이 가장 먼저 처리)
    //   post_reply → 1 (사용자 즉시 발행 요청 — 최우선)
    //   fetch_reviews → 10 (자동 수집 — post_reply 끝나야 처리)
    //   명시 priority 가 있으면 그것 우선 (override)
    const defaultPriority = data.action === 'post_reply' ? 1
      : data.action === 'fetch_reviews' ? 10
      : 5
    const priority = opts.priority ?? defaultPriority

    // 🔒 DEDUP: post_reply 는 (platform, userId, platform_review_id) 단위로 deterministic jobId
    //    → 같은 리뷰 반복 enqueue 차단 (BullMQ 는 같은 jobId 무시)
    //    auto-publish / retry-queued-replies / force-publish 모두 자동 dedup
    let jobId = opts.jobId
    if (!jobId && data.action === 'post_reply') {
      const reviewId = String((data.payload as any)?.platform_review_id || (data.payload as any)?.review_id || 'unknown')
      jobId = `pr_${data.platform}_${data.userId.slice(0, 8)}_${reviewId.slice(0, 32)}`
    }

    // jobId 가 이미 존재하면 BullMQ 는 기존 잡 반환 (q.add 에 deduplication 옵션 활용)
    const job = await q.add(`${data.platform}:${data.action}`, data, {
      jobId,
      priority,
    })

    // 같은 jobId 재사용 확인: job.opts.jobId 가 우리가 준 값이지만 실제 enqueue 됐는지 보려면
    //   timestamp 가 방금이 아니면 (= 기존 잡) deduped 표시
    const justNow = Math.abs(Date.now() - (job.timestamp || 0)) < 2000
    return { ok: true, jobId: String(job.id), deduped: !justNow }
  } catch (e: any) {
    // BullMQ "Job exists" 에러는 silent: deduplicated 로 처리
    const msg = e?.message || String(e)
    if (/already exists|exists with the same id/i.test(msg)) {
      return { ok: true, jobId: opts.jobId || 'dedup', deduped: true }
    }
    return { ok: false, error: msg }
  }
}
