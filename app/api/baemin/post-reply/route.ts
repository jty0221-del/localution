// app/api/baemin/post-reply/route.ts
// ============================================================
// 배민 답글 등록 API (BAEMIN v1 — 쿠팡 v76 패턴 적용)
//   · 사전 차단: reply_status='submitted' OR has_reply OR raw_snapshot.replies (66차/69차)
//   · 응답 body 검증 (63차) — HTTP 200이어도 실제 등록 안된 경우 차단
//   · 401/403 → auto-login 자동 재로그인 후 retry 1회
//   · 성공 시 reply_status='submitted' + reply_submitted_at 기록 (74차)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { baeminProxyLogin } from '@/app/lib/baemin-login'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

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
  const d = createDecipheriv(ALGO, kek, Buffer.from(iv, 'base64'))
  d.setAuthTag(Buffer.from(tag, 'base64'))
  return Buffer.concat([d.update(Buffer.from(enc, 'base64')), d.final()]).toString('utf8')
}
function encryptStr(plain: string): { enc: string; iv: string; tag: string } {
  const kek = loadKek()
  const iv = randomBytes(12)
  const c = createCipheriv(ALGO, kek, iv)
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()])
  return { enc: enc.toString('base64'), iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64') }
}

// ── 응답 body 검증 (쿠팡 63차 패턴) ────────────────────────
// 배민 self-api 답글 등록은 HTTP 200이어도 status/code 필드로 진짜 성공 판단 필요
function isReplySuccess(json: any): boolean {
  if (!json || typeof json !== 'object') return true  // body 없는 200 = 일단 성공 간주
  // 명시적 실패 신호
  const code = String(json.code ?? json.status ?? json.resultCode ?? '').toUpperCase()
  if (code && code !== 'SUCCESS' && code !== 'OK' && code !== '0' && code !== '200') {
    return false
  }
  if (json.success === false || json.error || json.errorMessage) return false
  return true
}

async function postReplyOnce(
  cookieStr: string, shopNo: string, reviewNo: string, comment: string,
): Promise<{ ok: boolean; status: number; body: any; error?: string }> {
  const apiUrl = BAEMIN_API + '/v1/review/shops/' + shopNo + '/reviews/comments'

  let xsrfToken = ''
  for (const part of cookieStr.split(';')) {
    const kv = part.trim()
    const eq = kv.indexOf('=')
    if (eq === -1) continue
    const name = kv.slice(0, eq).trim().toLowerCase()
    if (name === 'xsrf-token' || name === '_xsrf' || name === 'csrf_token') {
      xsrfToken = kv.slice(eq + 1).trim()
      break
    }
  }

  const headers: Record<string, string> = {
    'Cookie': cookieStr,
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    'Referer': 'https://self.baemin.com/shops/' + shopNo + '/reviews',
    'Origin': 'https://self.baemin.com',
    'Accept': 'application/json',
    'service-channel': 'SELF_SERVICE_PC',
    'X-Web-Version': 'v20260422143632',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
  }
  if (xsrfToken) headers['X-XSRF-TOKEN'] = xsrfToken

  try {
    const res = await fetch(apiUrl, {
      method: 'POST', headers,
      body: JSON.stringify({ reviewNo, comment, shopNo: Number(shopNo) }),
      signal: AbortSignal.timeout(15000),
    })
    const text = await res.text().catch(() => '')
    let body: any = null
    try { body = text ? JSON.parse(text) : null } catch { body = { raw: text.slice(0, 200) } }
    if (!res.ok) return { ok: false, status: res.status, body, error: 'HTTP ' + res.status }
    if (!isReplySuccess(body)) {
      return { ok: false, status: res.status, body, error: '응답 body 검증 실패: ' + JSON.stringify(body).slice(0, 200) }
    }
    return { ok: true, status: res.status, body }
  } catch (e: any) {
    return { ok: false, status: 0, body: null, error: e?.message || 'fetch failed' }
  }
}

async function refreshCookieFromCreds(svc: any, userId: string, cred: any): Promise<string | null> {
  const extra = (cred?.extra_data as any) || {}
  let pw = ''
  try {
    if (extra.baemin_pw_enc && extra.baemin_pw_iv && extra.baemin_pw_tag) {
      pw = decryptStr(extra.baemin_pw_enc, extra.baemin_pw_iv, extra.baemin_pw_tag)
    } else if (cred.password_encrypted && cred.dek_encrypted) {
      const kek = loadKek()
      const dekD = createDecipheriv(ALGO, kek, Buffer.from(cred.dek_iv, 'base64'))
      dekD.setAuthTag(Buffer.from(cred.dek_tag, 'base64'))
      const dek = Buffer.concat([dekD.update(Buffer.from(cred.dek_encrypted, 'base64')), dekD.final()])
      const pwD = createDecipheriv(ALGO, dek, Buffer.from(cred.password_iv, 'base64'))
      pwD.setAuthTag(Buffer.from(cred.password_tag, 'base64'))
      pw = Buffer.concat([pwD.update(Buffer.from(cred.password_encrypted, 'base64')), pwD.final()]).toString('utf8')
    }
  } catch { return null }
  if (!pw) return null
  const id = cred.account_id || extra.baemin_id || ''
  if (!id) return null
  try {
    const cookieStr = await baeminProxyLogin(id, pw)
    if (cookieStr && cookieStr.length > 10) {
      const enc = encryptStr(cookieStr)
      await svc.from('platform_credentials').update({
        extra_data: { ...extra, baemin_cookie_enc: enc.enc, baemin_cookie_iv: enc.iv, baemin_cookie_tag: enc.tag, cookie_saved_at: new Date().toISOString() },
        last_login_status: 'success', last_login_at: new Date().toISOString(),
      }).eq('user_id', userId).eq('platform', 'baemin')
      return cookieStr
    }
  } catch { /* ignore */ }
  return null
}

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  const userId = auth.userId!

  try {
    const body = await req.json()
    const { review_db_id, platform_review_id, comment, shop_no } = body || {}

    if (!comment || comment.trim().length === 0) {
      return NextResponse.json({ ok: false, error: '답글 내용이 비어있어요.' }, { status: 400 })
    }

    const svc = createServiceClient()

    // ── 1) 사전 차단 (66차/69차 — 중복 답글 방지) ──
    if (review_db_id) {
      const { data: existing } = await svc
        .from('platform_reviews')
        .select('has_reply, reply_content, reply_status, raw_snapshot')
        .eq('id', review_db_id).eq('user_id', userId).maybeSingle()

      if (existing) {
        if (existing.reply_status === 'submitted') {
          return NextResponse.json({ ok: false, code: 'ALREADY_SUBMITTED', error: '이미 답글이 발행됐어요.' }, { status: 409 })
        }
        const snapReplies = (existing.raw_snapshot as any)?.ownerReply
          || (existing.raw_snapshot as any)?.reply
          || (existing.raw_snapshot as any)?.replyContent
        if (existing.has_reply || existing.reply_content || snapReplies) {
          return NextResponse.json({ ok: false, code: 'HAS_REPLY', error: '이미 답글이 등록된 리뷰예요.' }, { status: 409 })
        }
      }
    }

    // ── 2) 자격증명 로드 ──
    const { data: cred } = await svc
      .from('platform_credentials')
      .select('account_id, extra_data, platform_store_id, password_encrypted, password_iv, password_tag, dek_encrypted, dek_iv, dek_tag')
      .eq('user_id', userId).eq('platform', 'baemin').maybeSingle()

    const extra = (cred?.extra_data as any) || {}
    if (!extra.baemin_cookie_enc) {
      return NextResponse.json({ ok: false, error: '배민 쿠키가 없어요. 배민 계정을 먼저 연결해주세요.', code: 'NO_COOKIE' }, { status: 400 })
    }

    let cookieStr = decryptStr(extra.baemin_cookie_enc, extra.baemin_cookie_iv, extra.baemin_cookie_tag)
    const shopNo = String(shop_no || cred?.platform_store_id || '14637452')
    const rawReviewId = String(platform_review_id || '').replace('baemin-real-', '').replace('baemin-seed-', '')

    if (!rawReviewId) {
      return NextResponse.json({ ok: false, error: 'platform_review_id 가 비어있어요.' }, { status: 400 })
    }

    // ── 3) 발행 (1차 시도) ──
    let result = await postReplyOnce(cookieStr, shopNo, rawReviewId, comment.trim())

    // ── 4) 401/403 → 자동 재로그인 후 retry ──
    if (!result.ok && (result.status === 401 || result.status === 403)) {
      const newCookie = await refreshCookieFromCreds(svc, userId, cred)
      if (newCookie) {
        cookieStr = newCookie
        result = await postReplyOnce(cookieStr, shopNo, rawReviewId, comment.trim())
      }
    }

    if (!result.ok) {
      // 쿠키 만료 명시
      if (result.status === 401 || result.status === 403) {
        return NextResponse.json({ ok: false, error: '쿠키가 만료됐어요. 배민을 다시 연결해주세요.', code: 'COOKIE_EXPIRED' }, { status: 401 })
      }
      return NextResponse.json({
        ok: false,
        error: '답글 등록 실패: ' + (result.error || ('HTTP ' + result.status)),
        status: result.status,
        body: result.body,
      }, { status: 500 })
    }

    // ── 5) DB 업데이트 (성공) ──
    if (review_db_id) {
      await svc.from('platform_reviews')
        .update({
          has_reply: true,
          reply_content: comment.trim(),
          reply_status: 'submitted',
          reply_submitted_at: new Date().toISOString(),
        })
        .eq('id', review_db_id).eq('user_id', userId)
    }

    return NextResponse.json({ ok: true, message: '답글이 등록됐어요.', status: result.status })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'unknown' }, { status: 500 })
  }
}
