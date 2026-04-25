// app/api/platform-accounts/naver-cookie/route.ts
// 43차: 네이버 세션 쿠키 저장/조회
//   GET  -> 마지막 저장 시각 반환 (쿠키 값 자체는 반환 안 함)
//   POST -> 쿠키 JSON 암호화 저장 (KEK 직접 사용 AES-256-GCM)
import { NextRequest, NextResponse } from 'next/server'
import { createCipheriv, randomBytes } from 'crypto'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALGO = 'aes-256-gcm'

function loadKek(): Buffer {
  const raw = process.env.ENCRYPTION_KEK_HEX || ''
  const hex = raw.replace(/s+/g, '')
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) throw new Error('ENCRYPTION_KEK_HEX 설정 필요')
  return Buffer.from(hex, 'hex')
}

function encryptCookie(plain: string): { enc: string; iv: string; tag: string } {
  const kek = loadKek()
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGO, kek, iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return {
    enc: enc.toString('base64'),
    iv:  iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
  }
}

export async function GET() {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  const svc = createServiceClient()
  try {
    const { data } = await svc
      .from('naver_session_cookies')
      .select('updated_at')
      .eq('user_id', auth.userId)
      .maybeSingle()
    return NextResponse.json({ ok: true, has_cookie: !!data, updated_at: data?.updated_at ?? null })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  let body: { cookie_json?: string; nid_aut?: string; nid_ses?: string } = {}
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  let cookieJson: string
  if (body.cookie_json) {
    try { JSON.parse(body.cookie_json); cookieJson = body.cookie_json } catch {
      return NextResponse.json({ ok: false, error: '쿠키 JSON 형식이 올바르지 않아요' }, { status: 400 })
    }
  } else if (body.nid_aut && body.nid_ses) {
    cookieJson = JSON.stringify([
      { name: 'NID_AUT', value: body.nid_aut.trim(), domain: '.naver.com', path: '/', httpOnly: true, secure: true },
      { name: 'NID_SES', value: body.nid_ses.trim(), domain: '.naver.com', path: '/', httpOnly: true, secure: true },
    ])
  } else {
    return NextResponse.json({ ok: false, error: 'cookie_json 또는 nid_aut + nid_ses 필요' }, { status: 400 })
  }

  try {
    const { enc, iv, tag } = encryptCookie(cookieJson)
    const svc = createServiceClient()
    const now = new Date().toISOString()
    const { data: existing } = await svc
      .from('naver_session_cookies').select('id').eq('user_id', auth.userId).maybeSingle()
    if (existing?.id) {
      await svc.from('naver_session_cookies')
        .update({ cookie_enc: enc, cookie_iv: iv, cookie_tag: tag, updated_at: now })
        .eq('user_id', auth.userId)
    } else {
      await svc.from('naver_session_cookies')
        .insert({ user_id: auth.userId, cookie_enc: enc, cookie_iv: iv, cookie_tag: tag, updated_at: now })
    }
    return NextResponse.json({ ok: true, updated_at: now })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 })
  }
}
