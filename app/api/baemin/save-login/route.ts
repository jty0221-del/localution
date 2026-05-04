// app/api/baemin/save-login/route.ts
// 프록시로 실제 로그인 → 쿠키 + Worker 호환 2단 AES 모두 저장
import { NextRequest, NextResponse } from 'next/server'
import { createCipheriv, randomBytes } from 'crypto'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { baeminProxyLogin } from '@/app/lib/baemin-login'
import { enqueuePlatformJob } from '@/app/lib/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

// Worker 호환 2단 AES (Railway Worker fallback용)
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
    ciphertext:     enc.toString('base64'),
    iv:             dekIv.toString('base64'),
    tag:            encTag.toString('base64'),
    dek_ciphertext: dekEnc.toString('base64'),
    dek_iv:         kekIv.toString('base64'),
    dek_tag:        dekTag.toString('base64'),
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  const userId = auth.userId!
  const svc = createServiceClient()

  try {
    const body = await req.json().catch(() => ({}))
    const { baemin_id, baemin_pw, shop_no } = body || {}

    if (!baemin_id || !String(baemin_id).trim()) {
      return NextResponse.json({ ok: false, error: '아이디를 입력해주세요.' }, { status: 400 })
    }
    if (!baemin_pw || !String(baemin_pw).trim()) {
      return NextResponse.json({ ok: false, error: '비밀번호를 입력해주세요.' }, { status: 400 })
    }

    const id = String(baemin_id).trim()
    const pw = String(baemin_pw).trim()
    const shopNo = String(shop_no || '').trim() || null

    // v1.6: RSA 로그인 시도 — 실패해도 ID/PW 는 저장 + Worker 가 fresh 로그인 처리
    // (Akamai 로 인해 Vercel 직접 로그인이 자주 실패하므로 fail-open 정책)
    let cookieStr = ''
    let cookieSaveSuccess = false
    let proxyLoginError: string | null = null
    try {
      cookieStr = await baeminProxyLogin(id, pw)
      cookieSaveSuccess = !!cookieStr && cookieStr.length > 10
    } catch (e: any) {
      proxyLoginError = e?.message || 'unknown'
      console.warn('[baemin-save-login] RSA login failed (will fallback to Worker):', proxyLoginError)
    }

    // 1단 AES (id/pw)
    const idEnc = encryptStr(id)
    const pwEnc = encryptStr(pw)
    // 2단 AES (Worker fallback 호환)
    const pwWorker = encryptSecret(pw)

    const extraData: Record<string, unknown> = {
      baemin_id_enc:     idEnc.enc,     baemin_id_iv:     idEnc.iv,     baemin_id_tag:     idEnc.tag,
      baemin_pw_enc:     pwEnc.enc,     baemin_pw_iv:     pwEnc.iv,     baemin_pw_tag:     pwEnc.tag,
    }
    if (cookieSaveSuccess) {
      const cookieEnc = encryptStr(cookieStr)
      extraData.baemin_cookie_enc = cookieEnc.enc
      extraData.baemin_cookie_iv  = cookieEnc.iv
      extraData.baemin_cookie_tag = cookieEnc.tag
      extraData.cookie_saved_at   = new Date().toISOString()
    }
    if (proxyLoginError) {
      extraData.last_proxy_login_error = proxyLoginError.slice(0, 200)
    }

    const { data: existing } = await svc
      .from('platform_credentials').select('id')
      .eq('user_id', userId).eq('platform', 'baemin').maybeSingle()

    const row: Record<string, unknown> = {
      user_id:            userId,
      platform:           'baemin',
      account_id:         id,
      password_encrypted: pwWorker.ciphertext,
      password_iv:        pwWorker.iv,
      password_tag:       pwWorker.tag,
      dek_encrypted:      pwWorker.dek_ciphertext,
      dek_iv:             pwWorker.dek_iv,
      dek_tag:            pwWorker.dek_tag,
      last_login_status:  cookieSaveSuccess ? 'success' : 'pending_worker_login',
      extra_data:         extraData,
    }
    if (shopNo) row.platform_store_id = shopNo

    if (existing) {
      const { error } = await svc.from('platform_credentials')
        .update(row).eq('id', (existing as any).id)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await svc.from('platform_credentials').insert(row)
      if (error) throw new Error(error.message)
    }

    // ── 자동 fetch 트리거 (쿠팡 60차 패턴) ──
    // 연결 즉시 14일치 리뷰 수집 큐에 enqueue → 사용자 대기 시간 단축
    let queued = false
    let queueJobId: string | undefined
    try {
      if (process.env.REDIS_URL) {
        const jr = await enqueuePlatformJob({
          platform: 'baemin',
          action: 'fetch_reviews',
          userId,
          storeId: shopNo || 'unknown',
          payload: { shop_no: shopNo, days_back: 30, source: 'save-login' },
        })
        if (jr.ok) { queued = true; queueJobId = jr.jobId }
      }
    } catch (qe: any) {
      console.warn('[baemin-save-login] enqueue failed:', qe?.message)
    }

    return NextResponse.json({
      ok: true,
      message: cookieSaveSuccess
        ? '배민 연동 완료! 리뷰를 자동으로 수집하고 있어요.'
        : '배민 ID/비번 저장 완료. 리뷰 수집 자동 시작 (1-2분 소요).',
      queued,
      jobId: queueJobId,
      proxy_login_ok: cookieSaveSuccess,
      proxy_login_error: proxyLoginError,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || '연동 실패' }, { status: 500 })
  }
}
