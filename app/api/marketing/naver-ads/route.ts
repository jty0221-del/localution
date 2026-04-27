import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const AD_BASE = 'https://api.searchad.naver.com'

function sign(timestamp: number, method: string, path: string): string {
  const secret = process.env.NAVER_AD_SECRET_KEY || ''
  const msg = `${timestamp}.${method}.${path}`
  const key = Buffer.from(secret, 'base64')
  return crypto.createHmac('sha256', key).update(msg).digest('base64')
}

function adHeaders(method: string, path: string) {
  const ts = Date.now()
  return {
    'Content-Type': 'application/json; charset=UTF-8',
    'X-Timestamp': String(ts),
    'X-API-KEY': process.env.NAVER_AD_API_KEY || '',
    'X-Customer': process.env.NAVER_AD_CUSTOMER_ID || '',
    'X-Signature': sign(ts, method, path),
  }
}

function checkEnv() {
  if (!process.env.NAVER_AD_API_KEY || !process.env.NAVER_AD_SECRET_KEY || !process.env.NAVER_AD_CUSTOMER_ID) {
    return '네이버 광고 API 키가 설정되지 않았습니다. .env.local에 NAVER_AD_API_KEY, NAVER_AD_SECRET_KEY, NAVER_AD_CUSTOMER_ID를 추가해주세요.'
  }
  return null
}

// GET /api/marketing/naver-ads?type=volume&keywords=부천맛집,부천역맛집
// GET /api/marketing/naver-ads?type=bid&keyword=부천맛집
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type    = searchParams.get('type') || 'volume'
  const keyword = searchParams.get('keyword') || ''
  const keywords = searchParams.get('keywords') || keyword

  if (!keywords.trim()) {
    return NextResponse.json({ error: '키워드를 입력해주세요.' }, { status: 400 })
  }

  const envErr = checkEnv()
  if (envErr) return NextResponse.json({ error: envErr }, { status: 503 })

  const kwList = keywords.split(',').map(k => k.trim()).filter(Boolean).slice(0, 10)

  try {
    // ── 검색량 + 파생 키워드 ─────────────────────────────────────────
    if (type === 'volume') {
      const path = '/keywordstool'
      const qs = '?hintKeywords=' + encodeURIComponent(kwList.join(',')) + '&showDetail=1'
      const res = await fetch(AD_BASE + path + qs, { headers: adHeaders('GET', path) })
      if (!res.ok) {
        const txt = await res.text()
        return NextResponse.json({ error: `API 오류 ${res.status}: ${txt}` }, { status: res.status })
      }
      const data = await res.json()
      // keywordList: [{ relKeyword, monthlyPcQcCnt, monthlyMobileQcCnt, ... }]
      return NextResponse.json({ ok: true, type: 'volume', keywords: data.keywordList || [] })
    }

    // ── 파워링크 입찰가 (순위별 PC + MOBILE) ────────────────────────
    if (type === 'bid') {
      const kw = kwList[0]
      const path = '/estimate/performance/bid/keyword'
      const ranks = [1, 2, 3, 4, 5]
      const devices = ['PC', 'MOBILE'] as const

      const rows = await Promise.all(ranks.map(async (rank) => {
        const [pcRes, mobileRes] = await Promise.all(
          devices.map(async (device) => {
            const qs = `?keyword=${encodeURIComponent(kw)}&device=${device}&keywordPlusYn=N&bidrankYn=Y&rank=${rank}`
            const r = await fetch(AD_BASE + path + qs, { headers: adHeaders('GET', path) })
            if (!r.ok) return null
            return r.json()
          })
        )
        return {
          rank,
          pc:     pcRes?.estimate?.bid     ?? pcRes?.bid     ?? null,
          mobile: mobileRes?.estimate?.bid ?? mobileRes?.bid ?? null,
        }
      }))

      return NextResponse.json({ ok: true, type: 'bid', keyword: kw, rows })
    }

    return NextResponse.json({ error: '잘못된 type. volume 또는 bid 사용' }, { status: 400 })

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `서버 오류: ${msg}` }, { status: 500 })
  }
}
