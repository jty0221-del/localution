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
      .select('id, user_id, platform, platform_store_id, platform_review_id, draft_reply, has_reply, reply_status')
      .eq('id', reviewId)
      .maybeSingle()

    if (selErr) return NextResponse.json({ ok: false, error: '리뷰 조회 실패: ' + selErr.message }, { status: 500 })
    if (!row) return NextResponse.json({ ok: false, error: '리뷰 없음' }, { status: 404 })
    if (row.user_id !== userId) return NextResponse.json({ ok: false, error: '권한 없음' }, { status: 403 })
    if (row.has_reply) return NextResponse.json({ ok: false, error: '이미 답글이 달린 리뷰예요' }, { status: 409 })

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

    // ── 배민: 직접 API 우선 ────────────────────────────────────────
    if (row.platform === 'baemin' && extra.baemin_cookie_enc) {
      try {
        const cookieStr = decryptStr(extra.baemin_cookie_enc, extra.baemin_cookie_iv, extra.baemin_cookie_tag)
        const shopNo = String(storeId !== 'unknown' ? storeId : '14637452')
        const result = await postBaeminReplyDirect(cookieStr, shopNo, row.platform_review_id, draft)

        if (result.ok) {
          await svc.from('platform_reviews')
            .update({
              has_reply: true,
              reply_content: draft,
              reply_status: 'submitted',
              reply_submitted_at: new Date().toISOString(),
              reply_error: null,
            })
            .eq('id', reviewId).eq('user_id', userId)

          return NextResponse.json({
            ok: true,
            mode: 'direct',
            reply_status: 'submitted',
            note: '답글이 배민에 바로 등록됐어요! ✅',
          })
        }

        // 쿠키 만료 → 안내 (Worker 폴백은 어차피 로그인 실패이므로 의미없음)
        if (result.expired) {
          return NextResponse.json({
            ok: false,
            code: 'COOKIE_EXPIRED',
            error: '배민 세션이 만료됐어요. 배민 쿠키를 다시 저장하면 답글을 등록할 수 있어요.',
            cookie_page: '/my/platforms/baemin/session',
          }, { status: 401 })
        }

        // 기타 실패 → Worker 폴백
        console.error('[auto-publish] baemin direct failed:', result.reason, '— falling back to worker')
      } catch (decryptErr: any) {
        console.error('[auto-publish] baemin cookie decrypt error:', decryptErr?.message)
      }
    }

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
