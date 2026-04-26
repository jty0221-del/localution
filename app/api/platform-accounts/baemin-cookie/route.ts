// app/api/platform-accounts/baemin-cookie/route.ts
// 배민 세션 쿠키 저장/조회
import { NextRequest, NextResponse } from 'next/server'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALGO = 'aes-256-gcm'

function loadKek(): Buffer {
  const raw = process.env.ENCRYPTION_KEK_HEX || ''
  const hex = raw.replace(/\s+/g, '')
  if (hex.length !== 64) throw new Error('ENCRYPTION_KEK_HEX 설정 필요')
  return Buffer.from(hex, 'hex')
}

function encryptStr(plain: string): { enc: string; iv: string; tag: string } {
  const kek = loadKek()
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGO, kek, iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return { enc: enc.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64') }
}

export async function GET(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false }, { status: auth.status })
  const svc = createServiceClient()
  const { data } = await svc
    .from('platform_credentials')
    .select('extra_data, platform_store_id')
    .eq('user_id', auth.userId)
    .eq('platform', 'baemin')
    .maybeSingle()
  const hasSession = !!(data?.extra_data as any)?.baemin_cookie_enc
  return NextResponse.json({ ok: true, has_session: hasSession, shop_no: data?.platform_store_id ?? null })
}

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  try {
    const body = await req.json()
    const cookieStr = String(body.cookie_str || '').replace(/^cookie:\s*/i, '').trim()
    const shopNo = String(body.shop_no || '').trim()
    if (!cookieStr || cookieStr.length < 10) {
      return NextResponse.json({ ok: false, error: '쿠키 값이 비어있어요.' }, { status: 400 })
    }
    const { enc, iv, tag } = encryptStr(cookieStr)
    const svc = createServiceClient()
    const now = new Date().toISOString()
    const extraData = { baemin_cookie_enc: enc, baemin_cookie_iv: iv, baemin_cookie_tag: tag, baemin_cookie_updated_at: now }
    const { data: existing } = await svc
      .from('platform_credentials')
      .select('id, extra_data')
      .eq('user_id', auth.userId)
      .eq('platform', 'baemin')
      .maybeSingle()
    if (existing) {
      await svc.from('platform_credentials')
        .update({ extra_data: { ...((existing.extra_data as any) || {}), ...extraData }, platform_store_id: shopNo || undefined, updated_at: now })
        .eq('user_id', auth.userId).eq('platform', 'baemin')
    } else {
      await svc.from('platform_credentials')
        .insert({ user_id: auth.userId, platform: 'baemin', account_id: 'baemin-session', platform_store_id: shopNo || '14637452', extra_data: extraData, connected_at: now, updated_at: now })
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'unknown' }, { status: 500 })
  }
}
