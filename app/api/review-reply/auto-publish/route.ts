// app/api/review-reply/auto-publish/route.ts
// ============================================================
// 리뷰 자동 발행
//   배민: 저장 쿠키로 직접 API 우선 → Worker 큐 폴백
//   기타: Worker 큐 우선 (기존 동작 유지)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createDecipheriv } from 'crypto'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { enqueuePlatformJob } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALGO = 'aes-256-gcm'
const BAEMIN_API = 'https://self-api.baemin.com'

function loadKek(): Buffer {
  const raw = process.env.ENCRYPTION_KEK_HEX || ''
  let hex = ''
  for (const c of raw) { if (c !== ' ' && c !== '\t' && c !== '\n' && c !== '\r') hex += c }
  if (hex.length !== 64) throw new Error('ENCRYPTION_KEK_HEX 설정 필요')
  return Buffer.from(hex, 'hex')
}

function decryptStr(enc: string, iv: string, tag: string): string {
  const kek = loadKek()
  const decipher = createDecipheriv(ALGO, kek, Buffer.from(iv, 'base64'))
  decipher.setAuthTag(Buffer.from(tag, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(enc, 'base64')), decipher.final()]).toString('utf8')
}

// 배민 직접 답글 등록 (저장된 쿠키 사용)
async function postBaeminReplyDirect(
  cookieStr: string,
  shopNo: string,
  platformReviewId: string,
  draft: string,
): Promise<{ ok: true } | { ok: false; reason: string; expired?: boolean }> {
  const rawId = platformReviewId
    .replace(/^baemin(-real-|-seed-|:)?/, '')
    .replace(/^baemin-/, '')

  // XSRF 토큰 추출
  let xsrfToken = ''
  for (const part of cookieStr.split(';')) {
    const kv = part.trim()
    const eqIdx = kv.indexOf('=')
    if (eqIdx === -1) continue
    const name = kv.slice(0, eqIdx).trim().toLowerCase()
    if (name === 'xsrf-token' || name === '_xsrf') {
      xsrfToken = kv.slice(eqIdx + 1).trim()
      break
    }
  }

  const headers: Record<string, string> = {
    'Cookie': cookieStr,
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    'Referer': 'https://self.baemin.com/shops/' + shopNo + '/reviews',
    'Origin': 'https://self.baemin.com',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'ko-KR,ko;q=0.9',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
  }
  if (xsrfToken) headers['X-XSRF-TOKEN'] = xsrfToken

  try {
    const res = await fetch(
      BAEMIN_API + '/v1/review/shops/' + shopNo + '/reviews/comments',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          reviewNo: rawId,
          comment: draft,
          shopNo: Number(shopNo),
        }),
        cache: 'no-store',
      }
    )

    if (res.ok) return { ok: true }

    if (res.status === 401 || res.status === 403) {
      return { ok: false, reason: '쿠키 만료 또는 권한 없음 (HTTP ' + res.status + ')', expired: true }
    }

    const txt = await res.text().catch(() => '')
    return { ok: false, reason: 'Baemin API 오류 HTTP ' + res.status + ': ' + txt.slice(0, 200) }
  } catch (e: any) {
    return { ok: false, reason: e?.message || 'network error' }
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  }
  const userId = auth.userId!

  let body: any = {}
  try { body = await req.json() } catch {}

  const reviewId = String(body?.review_id || '').trim()
  if (!reviewId) {
    return NextResponse.json({ ok: false, error: 'review_id 필요' }, { status: 400 })
  }

  try {
    const svc = createServiceClient()

    // 1) 리뷰 조회
    const { data: row, error: selErr } = await svc
      .from('platform_reviews')
      .select('id, user_id, platform, platform_store_id, platform_review_id, draft_reply, has_reply, reply_status, posted_at')
      .eq('id', reviewId)
      .maybeSingle()

    if (selErr) return NextResponse.json({ ok: false, error: '리뷰 조회 실패: ' + selErr.message }, { status: 500 })
    if (!row) return NextResponse.json({ ok: false, error: '리뷰 없음' }, { status: 404 })
    if (row.user_id !== userId) return NextResponse.json({ ok: false, error: '권한 없음' }, { status: 403 })

    // 73차: has_reply 차단 제거 — 워커 pre-check (66차/69차) 가 실제 상태 판단
    //   기존 버그: DB has_reply=true 면 즉시 409 차단 → enqueue 안 됨
    //   문제 케이스:
    //     - DB 가 잘못 마킹된 경우 (실제 답글 없는데 has_reply=true)
    //     - 사장님이 답글 단 후 다시 우리 시스템으로 갱신하고 싶을 때
    //   해결: 워커가 실제 답글 존재 여부 정확히 판단 (raw_snapshot.replies + reply_content)
    //   reply_status='submitted' 만 진짜 차단 (우리가 이미 발행 완료한 것)
    if (row.reply_status === 'submitted') {
      return NextResponse.json({
        ok: false,
        code: 'ALREADY_SUBMITTED',
        error: '이미 답글이 발행됐어요. 페이지를 새로고침해주세요.',
      }, { status: 409 })
    }

    // v1.6m: 배민 정책 — 30일 지난 리뷰는 답글 등록 불가
    if (row.platform === 'baemin' && row.posted_at) {
      const postedMs = new Date(row.posted_at).getTime()
      if (!isNaN(postedMs)) {
        const daysAgo = (Date.now() - postedMs) / 86400_000
        if (daysAgo > 30) {
          return NextResponse.json({
            ok: false,
            code: 'BAEMIN_REPLY_EXPIRED',
            error: '배민 정책상 30일이 지난 리뷰에는 답글을 등록할 수 없어요. (배민 자체 제한)',
            posted_at: row.posted_at,
            days_ago: Math.round(daysAgo),
          }, { status: 422 })
        }
      }
    }

    const draft = String(row.draft_reply || '').trim()
    if (!draft) return NextResponse.json({ ok: false, error: '먼저 초안을 저장해주세요' }, { status: 400 })

    if (['submitting'].includes(String(row.reply_status ?? 'none'))) {
      return NextResponse.json({ ok: false, error: '현재 처리 중이에요. 잠시 후 다시 시도해주세요' }, { status: 409 })
    }

    // 2) 자격증명 + extra_data 조회
    const { data: cred } = await svc
      .from('platform_credentials')
      .select('platform_store_id, extra_data')
      .eq('user_id', userId)
      .eq('platform', row.platform)
      .maybeSingle()

    const storeId = row.platform_store_id || cred?.platform_store_id || 'unknown'
    const extra = (cred?.extra_data as any) || {}

    // v1.6k: 배민 direct API 경로 폐기 — Akamai 가 Vercel raw fetch 영구 차단
    // (cookie 멀쩡해도 Akamai _abck JS challenge 미통과 → 403)
    // → 무조건 Worker (Playwright + 한국 프록시) 로 위임

    // ── Worker 큐 ──────────────────────────────────────────────────
    const hasCredentials = !!cred
    const redisAvailable = !!process.env.REDIS_URL

    if (hasCredentials && redisAvailable) {
      const bizId: string | undefined = row.platform === 'naver_place'
        ? (extra?.smartplace_biz_id || undefined)
        : undefined

      // 72차: post_reply enqueue 전에 사장님 본인 fetch_reviews 큐 정리
      // 큐 적체 시 post_reply priority 1 이어도 active job 끝나야 처리됨 → 답글 발행 지연
      // 답글 발행이 사용자 의도에 가까우니 fetch_reviews 는 다음 cron 으로 미루기
      try {
        const { getPlatformQueue } = await import('@/app/lib/queue')
        const q = getPlatformQueue()
        const waiting = await q.getWaiting(0, 999)
        let cleanedCount = 0
        for (const j of waiting) {
          if (j.data?.userId === userId && j.data?.action === 'fetch_reviews') {
            try { await j.remove(); cleanedCount++ } catch (_) {}
          }
        }
        if (cleanedCount > 0) {
          console.log('[auto-publish] 큐 정리 — fetch_reviews ' + cleanedCount + '개 제거 (post_reply 우선)')
        }
      } catch (e) {
        console.warn('[auto-publish] queue cleanup failed (non-fatal):', e)
      }

      const jobPayload: Record<string, string> = {
        platform_review_id: row.platform_review_id,
        reply_text: draft,
      }
      if (bizId) jobPayload.biz_id = bizId
      // v1.6k: baemin shop_no 명시 — Worker 가 정확한 매장 페이지로 navigate
      if (row.platform === 'baemin' && row.platform_store_id) {
        jobPayload.shop_no = String(row.platform_store_id)
      }

      const jobResult = await enqueuePlatformJob({
        platform: row.platform as any,
        action: 'post_reply',
        userId,
        storeId,
        payload: jobPayload,
      })

      if (!jobResult.ok) {
        return NextResponse.json({
          ok: false,
          code: 'QUEUE_FAILED',
          error: '큐 등록 실패(' + jobResult.error + '). 잠시 후 다시 시도해주세요.',
        }, { status: 500 })
      }

      await svc.from('platform_reviews')
        .update({ reply_status: 'queued', reply_queued_at: new Date().toISOString(), reply_error: null })
        .eq('id', reviewId).eq('user_id', userId)

      return NextResponse.json({
        ok: true,
        mode: 'worker',
        reply_status: 'queued',
        jobId: jobResult.jobId,
        note: 'Worker가 자동으로 답글을 등록해요. 잠시 후 새로고침하면 결과를 확인할 수 있어요.',
      })
    }

    // ── 자격증명 없음 ─────────────────────────────────────────────
    return NextResponse.json({
      ok: false,
      code: 'NO_CREDENTIALS',
      error: row.platform + ' 계정이 연결되지 않았어요. 계정을 연결하면 자동으로 답글이 등록됩니다.',
      connect_href: '/my/platforms/' + row.platform + '/connect',
    }, { status: 422 })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: '예외: ' + (e?.message ?? String(e)) }, { status: 500 })
  }
}
