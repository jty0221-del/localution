// app/api/baemin/save-login/route.ts
// Worker(worker/src/lib/credentials.ts)가 읽는 포맷으로 저장:
//   account_id (평문), password_encrypted/iv/tag (DEK 암호화),
//   dek_encrypted/iv/tag (KEK 암호화) — 2단 AES-256-GCM
import { NextRequest, NextResponse } from 'next/server'
import { createCipheriv, randomBytes } from 'crypto'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

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

// worker/src/lib/crypto.ts 의 encryptSecret() 와 동일한 2단 암호화
function encryptSecret(plaintext: string): {
  ciphertext: string; iv: string; tag: string
  dek_ciphertext: string; dek_iv: string; dek_tag: string
} {
  const kek = loadKek()
  // 1) DEK 생성 후 평문 암호화
  const dek = randomBytes(32)
  const dekIv = randomBytes(12)
  const c1 = createCipheriv(ALGO, dek, dekIv)
  const enc = Buffer.concat([c1.update(Buffer.from(plaintext, 'utf8')), c1.final()])
  const encTag = c1.getAuthTag()
  // 2) DEK 자체를 KEK로 암호화
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

    // 2단 암호화 (Worker crypto.ts 와 동일 구조)
    const pwEnc = encryptSecret(pw)

    // 기존 레코드 확인 → insert or update
    const { data: existing } = await svc
      .from('platform_credentials')
      .select('id')
      .eq('user_id', userId)
      .eq('platform', 'baemin')
      .maybeSingle()

    const row: Record<string, unknown> = {
      user_id:             userId,
      platform:            'baemin',
      account_id:          id,
      password_encrypted:  pwEnc.ciphertext,
      password_iv:         pwEnc.iv,
      password_tag:        pwEnc.tag,
      dek_encrypted:       pwEnc.dek_ciphertext,
      dek_iv:              pwEnc.dek_iv,
      dek_tag:             pwEnc.dek_tag,
      last_login_status:   'pending',
    }
    if (shopNo) row.platform_store_id = shopNo

    if (existing) {
      const { error } = await svc.from('platform_credentials')
        .update(row)
        .eq('id', (existing as any).id)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await svc.from('platform_credentials')
        .insert(row)
      if (error) throw new Error(error.message)
    }

    return NextResponse.json({
      ok: true,
      message: '배민 연동 완료! 리뷰 수집을 시작하면 자동으로 가져와요.',
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || '저장 실패' }, { status: 500 })
  }
}
