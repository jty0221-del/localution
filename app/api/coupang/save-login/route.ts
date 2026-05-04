// app/api/coupang/save-login/route.ts
// ============================================================
// 60차: 쿠팡이츠 — 배민 패턴 (Vercel save-login)
//   POST { coupang_id, coupang_pw }
//   · 한국 proxy raw HTTP 로 직접 로그인 시도
//   · 성공 시 cookies 를 platform_credentials.extra_data 에 암호화 저장
//   · 워커는 그 cookies 사용 (Playwright form login fallback 안 거침)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createCipheriv, randomBytes } from 'crypto'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { coupangProxyLogin } from '@/app/lib/coupang-login'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ALGO = 'aes-256-gcm'

function loadKek(): Buffer {
  const raw = process.env.ENCRYPTION_KEK_HEX || ''
  let hex = ''
  for (const c of raw) { if (c !== ' ' && c !== '\t' && c !== '\n' && c !== '\r') hex += c }
  if (hex.length !== 64) throw new Error('ENCRYPTION_KEK_HEX 설정 필요 (64 hex chars)')
  return Buffer.from(hex, 'hex')
}

function encryptStr(plain: string): { enc: string; iv: string; tag: string } {
  const kek = loadKek()
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGO, kek, iv)
  const enc = Buffer.concat([cipher.update(Buffer.from(plain, 'utf8')), cipher.final()])
  return { enc: enc.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64') }
}

// Worker 호환 2단 AES (배민과 동일 패턴 — 비번 재로그인 대비)
function encryptSecret(plain: string): {
  ciphertext: string; iv: string; tag: string
  dek_ciphertext: string; dek_iv: string; dek_tag: string
} {
  const kek = loadKek()
  const dek = randomBytes(32)
  const dekIv = randomBytes(12)
  const c1 = createCipheriv(ALGO, dek, dekIv)
  const enc = Buffer.concat([c1.update(Buffer.from(plain, 'utf8')), c1.final()])
  const encTag = c1.getAuthTag()
  const kekIv = randomBytes(12)
  const c2 = createCipheriv(ALGO, kek, kekIv)
  const dekEnc = Buffer.concat([c2.update(dek), c2.final()])
  const dekTag = c2.getAuthTag()
  dek.fill(0)
  return {
    ciphertext: enc.toString('base64'),
    iv: dekIv.toString('base64'),
    tag: encTag.toString('base64'),
    dek_ciphertext: dekEnc.toString('base64'),
    dek_iv: kekIv.toString('base64'),
    dek_tag: dekTag.toString('base64'),
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  const userId = auth.userId!
  const svc = createServiceClient()

  try {
    const body = await req.json().catch(() => ({}))
    const { coupang_id, coupang_pw } = body || {}

    if (!coupang_id || !String(coupang_id).trim()) {
      return NextResponse.json({ ok: false, error: '아이디를 입력해주세요.' }, { status: 400 })
    }
    if (!coupang_pw || !String(coupang_pw).trim()) {
      return NextResponse.json({ ok: false, error: '비밀번호를 입력해주세요.' }, { status: 400 })
    }

    const id = String(coupang_id).trim()
    const pw = String(coupang_pw).trim()

    // 한국 proxy 로 직접 로그인 시도
    const result = await coupangProxyLogin(id, pw)

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: result.error,
          tried: result.tried,
          hint: 'Vercel raw HTTP 로그인 실패 — Akamai 보호 가능. 워커 Playwright 경로로 fallback 됩니다.',
        },
        { status: 502 }
      )
    }

    // ── 성공: cookies + ID/PW 암호화 저장 ──
    const idEnc = encryptStr(id)
    const pwEnc = encryptStr(pw)
    const cookieEnc = encryptStr(result.cookieStr)
    const pwWorker = encryptSecret(pw)

    const { data: existing } = await svc
      .from('platform_credentials').select('id, extra_data')
      .eq('user_id', userId).eq('platform', 'coupangeats').maybeSingle()

    const existingExtra = (existing?.extra_data as Record<string, unknown>) || {}
    const extraData: Record<string, unknown> = {
      ...existingExtra,
      // playwright cookie 형식 (워커가 addCookies 로 그대로 사용)
      session_cookies: result.cookies,
      // 1단 AES (Vercel 직접 호출 시 복호화)
      coupang_id_enc: idEnc.enc,
      coupang_id_iv: idEnc.iv,
      coupang_id_tag: idEnc.tag,
      coupang_pw_enc: pwEnc.enc,
      coupang_pw_iv: pwEnc.iv,
      coupang_pw_tag: pwEnc.tag,
      coupang_cookie_enc: cookieEnc.enc,
      coupang_cookie_iv: cookieEnc.iv,
      coupang_cookie_tag: cookieEnc.tag,
      coupang_login_method: result.method,
      coupang_login_at: new Date().toISOString(),
    }

    const row: Record<string, unknown> = {
      user_id: userId,
      platform: 'coupangeats',
      account_id: id,
      // Worker 호환 컬럼 (2단 AES)
      password_encrypted: pwWorker.ciphertext,
      password_iv: pwWorker.iv,
      password_tag: pwWorker.tag,
      dek_encrypted: pwWorker.dek_ciphertext,
      dek_iv: pwWorker.dek_iv,
      dek_tag: pwWorker.dek_tag,
      last_login_status: 'success:save-login',
      last_login_at: new Date().toISOString(),
      extra_data: extraData,
      updated_at: new Date().toISOString(),
    }

    // whoami 데이터에서 storeId 자동 발견
    if (result.whoami) {
      const storeId =
        result.whoami.responsibleStoreId ||
        result.whoami.storeId ||
        result.whoami.defaultStoreId ||
        (Array.isArray(result.whoami.stores) && result.whoami.stores[0]?.storeId) ||
        null
      const storeName =
        result.whoami.storeName ||
        (Array.isArray(result.whoami.stores) && (result.whoami.stores[0]?.name || result.whoami.stores[0]?.storeName)) ||
        null
      if (storeId) row.platform_store_id = String(storeId)
      if (storeName) row.platform_store_name = String(storeName)
    }

    if (existing) {
      const { error } = await svc.from('platform_credentials')
        .update(row).eq('id', (existing as any).id)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await svc.from('platform_credentials').insert(row)
      if (error) throw new Error(error.message)
    }

    return NextResponse.json({
      ok: true,
      message: '쿠팡이츠 연동 완료! 리뷰를 자동으로 가져와요.',
      method: result.method,
      cookieCount: result.cookies.length,
      storeId: row.platform_store_id || null,
      storeName: row.platform_store_name || null,
    })
  } catch (e: any) {
    console.error('[coupang/save-login] error:', e?.message)
    return NextResponse.json({ ok: false, error: e?.message || '연동 실패' }, { status: 500 })
  }
}
