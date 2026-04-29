// app/api/baemin/post-reply/route.ts
// 배민 셀프서비스 API로 답글 등록
import { NextRequest, NextResponse } from 'next/server'
import { createDecipheriv } from 'crypto'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

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

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  const userId = auth.userId

  try {
    const body = await req.json()
    const { review_db_id, platform_review_id, comment, shop_no } = body || {}

    if (!comment || comment.trim().length === 0) {
      return NextResponse.json({ ok: false, error: '답글 내용이 비어있어요.' }, { status: 400 })
    }

    const svc = createServiceClient()

    // ── 1) 쿠키 로드 ──
    const { data: cred } = await svc
      .from('platform_credentials')
      .select('extra_data, platform_store_id')
      .eq('user_id', userId)
      .eq('platform', 'baemin')
      .maybeSingle()

    const extra = (cred?.extra_data as any) || {}
    if (!extra.baemin_cookie_enc) {
      return NextResponse.json({ ok: false, error: '배민 쿠키가 없어요. 먼저 배민 쿠키를 저장해주세요.', code: 'NO_COOKIE' }, { status: 400 })
    }

    const cookieStr = decryptStr(extra.baemin_cookie_enc, extra.baemin_cookie_iv, extra.baemin_cookie_tag)
    const shopNo = String(shop_no || cred?.platform_store_id || '14637452')

    // platform_review_id에서 실제 reviewNo 추출 (baemin-real-{no} 형식)
    const rawReviewId = String(platform_review_id || '').replace('baemin-real-', '').replace('baemin-seed-', '')

    // ── 2) 배민 API 답글 등록 ──
    const apiUrl = BAEMIN_API + '/v1/review/shops/' + shopNo + '/reviews/comments'
    const baeminRes = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Cookie': cookieStr,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://self.baemin.com/shops/' + shopNo + '/reviews',
        'Origin': 'https://self.baemin.com',
        'Accept': 'application/json',
        'service-channel': 'SELF_SERVICE_PC',
        'X-Web-Version': 'v20260422143632',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
      },
      body: JSON.stringify({
        reviewNo: rawReviewId,
        comment: comment.trim(),
        shopNo: Number(shopNo),
      }),
    })

    if (!baeminRes.ok) {
      const errText = await baeminRes.text().catch(() => '')
      if (baeminRes.status === 401 || baeminRes.status === 403) {
        return NextResponse.json({ ok: false, error: '쿠키가 만료됐어요. 배민 쿠키를 다시 저장해주세요.', code: 'COOKIE_EXPIRED' }, { status: 401 })
      }
      return NextResponse.json({ ok: false, error: 'Baemin API 오류 (' + baeminRes.status + '): ' + errText.slice(0, 200) }, { status: 500 })
    }

    // ── 3) DB 업데이트 ──
    if (review_db_id) {
      await svc.from('platform_reviews')
        .update({ has_reply: true })
        .eq('id', review_db_id)
        .eq('user_id', userId)
    }

    return NextResponse.json({ ok: true, message: '답글이 등록됐어요.' })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'unknown' }, { status: 500 })
  }
}
