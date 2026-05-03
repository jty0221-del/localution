import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { requireUser } from '@/app/lib/userAuth'
import { rateLimitByIp } from '@/app/lib/rateLimit'

const AD_BASE = 'https://api.searchad.naver.com'

function sign(ts: number, method: string, path: string) {
  const secret = process.env.NAVER_AD_SECRET_KEY || ''
  return crypto.createHmac('sha256', secret).update(ts + '.' + method + '.' + path).digest('base64')
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

function openHeaders() {
  return {
    'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID || '',
    'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET || '',
  }
}

export async function GET(req: NextRequest) {
  // 인증 + rate limit (네이버 광고 유료 API 보호)
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: auth.status })
  const rl = rateLimitByIp(req, `naver-kw-detail:${auth.userId}`, 30, 60)
  if (!rl.ok) {
    return NextResponse.json({ error: 'rate_limited', message: `${rl.resetIn}초 후 다시 시도해주세요.` }, { status: 429 })
  }

  const keyword = new URL(req.url).searchParams.get('keyword') || ''
  if (!keyword.trim()) return NextResponse.json({ error: '키워드를 입력해주세요.' }, { status: 400 })

  try {
    const adPath = '/keywordstool'
    const adQs = '?hintKeywords=' + encodeURIComponent(keyword) + '&showDetail=1'

    const [adRes, blogRes, cafeRes] = await Promise.all([
      fetch(AD_BASE + adPath + adQs, { headers: adHeaders('GET', adPath) }),
      fetch('https://openapi.naver.com/v1/search/blog?query=' + encodeURIComponent(keyword) + '&display=1', { headers: openHeaders() }),
      fetch('https://openapi.naver.com/v1/search/cafearticle?query=' + encodeURIComponent(keyword) + '&display=1', { headers: openHeaders() }),
    ])

    const adData   = adRes.ok   ? await adRes.json()  : null
    const blogData = blogRes.ok ? await blogRes.json() : null
    const cafeData = cafeRes.ok ? await cafeRes.json() : null

    const kwData = (adData?.keywordList || []).find((k: { relKeyword: string }) => k.relKeyword === keyword)
      || adData?.keywordList?.[0]
      || null

    const now = new Date()
    const endDate   = now.toISOString().slice(0, 10)
    const startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString().slice(0, 10)

    const dlRes = await fetch('https://openapi.naver.com/v1/datalab/search', {
      method: 'POST',
      headers: { ...openHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate, endDate, timeUnit: 'month',
        keywordGroups: [{ groupName: keyword, keywords: [keyword] }],
      }),
    })
    const dlData = dlRes.ok ? await dlRes.json() : null

    const pc     = Number(kwData?.monthlyPcQcCnt)     || 0
    const mobile = Number(kwData?.monthlyMobileQcCnt) || 0
    const total  = pc + mobile
    const blog   = blogData?.total || 0
    const cafe   = cafeData?.total || 0
    const contentTotal = blog + cafe
    const saturation   = total > 0 ? Math.round((contentTotal / total) * 10) / 10 : 0

    return NextResponse.json({
      ok: true, keyword,
      volume: { pc, mobile, total, compIdx: kwData?.compIdx || '-' },
      content: { blog, cafe, total: contentTotal, saturation },
      trend: dlData?.results?.[0]?.data || [],
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
