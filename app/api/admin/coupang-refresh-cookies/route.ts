// app/api/admin/coupang-refresh-cookies/route.ts
// ============================================================
// v38: 관리자가 사용자의 쿠팡이츠 쿠키를 강제 갱신
//   · 저장된 암호화 ID/PW 복호화 → Korean proxy 로 재 로그인 → 새 쿠키 저장
//   · 사용 케이스: Akamai 가 stale cookie 거부 시 / 사장님 요청 시
//
// POST { user_id }  → 해당 사용자의 cookies 강제 갱신
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { requireAdmin, createServiceClient } from '@/app/lib/adminAuth'
import { coupangProxyLogin } from '@/app/lib/coupang-login'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ALGO = 'aes-256-gcm'

function loadKek(): Buffer {
  const raw = process.env.ENCRYPTION_KEK_HEX || ''
  let hex = ''
  for (const c of raw) { if (c !== ' ' && c !== '\t' && c !== '\n' && c !== '\r') hex += c }
  if (hex.length !== 64) throw new Error('ENCRYPTION_KEK_HEX 필요')
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
  const enc = Buffer.concat([c.update(Buffer.from(plain, 'utf8')), c.final()])
  return { enc: enc.toString('base64'), iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64') }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.message }, { status: admin.status })

  let body: any = {}
  try { body = await req.json() } catch {}

  const userId = String(body?.user_id || '').trim()
  if (!userId) return NextResponse.json({ ok: false, error: 'user_id 필수' }, { status: 400 })

  const svc = createServiceClient()
  const { data: cred } = await svc
    .from('platform_credentials')
    .select('account_id, extra_data, platform_store_id')
    .eq('user_id', userId).eq('platform', 'coupangeats').maybeSingle()

  if (!cred) {
    return NextResponse.json({ ok: false, error: '쿠팡이츠 자격증명 없음' }, { status: 404 })
  }

  const extra = (cred.extra_data as any) || {}

  // 1단 AES 복호화 (Vercel save-login 형식)
  let coupangId = ''
  let coupangPw = ''
  try {
    if (extra.coupang_id_enc && extra.coupang_id_iv && extra.coupang_id_tag) {
      coupangId = decryptStr(extra.coupang_id_enc, extra.coupang_id_iv, extra.coupang_id_tag)
    } else if (cred.account_id) {
      coupangId = String(cred.account_id)
    }
    if (extra.coupang_pw_enc && extra.coupang_pw_iv && extra.coupang_pw_tag) {
      coupangPw = decryptStr(extra.coupang_pw_enc, extra.coupang_pw_iv, extra.coupang_pw_tag)
    }
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      error: '저장된 자격증명 복호화 실패: ' + (e?.message || String(e)),
      hint: '사용자가 save-login 으로 다시 로그인 필요',
    }, { status: 500 })
  }

  if (!coupangId || !coupangPw) {
    return NextResponse.json({
      ok: false,
      error: '저장된 ID 또는 PW 없음',
      hint: '사용자가 직접 /my/platforms/coupangeats/connect 에서 다시 로그인 필요',
      has_id: !!coupangId,
      has_pw: !!coupangPw,
    }, { status: 400 })
  }

  // 강제 재 로그인
  const result = await coupangProxyLogin(coupangId, coupangPw)
  if (!result.ok) {
    return NextResponse.json({
      ok: false,
      error: '재 로그인 실패: ' + result.error,
      tried: result.tried,
    }, { status: 502 })
  }

  // 새 쿠키 저장
  const cookieEnc = encryptStr(result.cookieStr)
  const newExtra: Record<string, unknown> = {
    ...extra,
    session_cookies: result.cookies,
    coupang_cookie_enc: cookieEnc.enc,
    coupang_cookie_iv: cookieEnc.iv,
    coupang_cookie_tag: cookieEnc.tag,
    coupang_login_method: result.method,
    coupang_login_at: new Date().toISOString(),
    coupang_refreshed_by_admin: admin.email,
    coupang_refreshed_at: new Date().toISOString(),
  }

  const { error: upErr } = await svc
    .from('platform_credentials')
    .update({
      extra_data: newExtra,
      last_login_status: 'success:cookies-refreshed-by-admin',
      last_login_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId).eq('platform', 'coupangeats')

  if (upErr) return NextResponse.json({ ok: false, error: 'DB 저장 실패: ' + upErr.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    user_id_short: userId.slice(0, 12) + '...',
    cookies_count: result.cookies.length,
    login_method: result.method,
    has_whoami: !!result.whoami,
    triggered_by: admin.email,
    message: '쿠팡이츠 쿠키 강제 갱신 완료. 다음 cron 사이클부터 fresh cookies 사용.',
  })
}
