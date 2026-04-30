import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

function makeSignature(timestamp: string, method: string, path: string, secretKey: string): string {
  const message = timestamp + '.' + method + '.' + path
  const key = Buffer.from(secretKey, 'base64')
  return crypto.createHmac('sha256', key).update(message).digest('base64')
}

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get('keyword') || ''
  if (!keyword.trim()) return NextResponse.json({ error: '키워드 필요' }, { status: 400 })

  const apiKey    = process.env.NAVER_AD_API_KEY
  const secretKey = process.env.NAVER_AD_SECRET_KEY
  const customerId = process.env.NAVER_AD_CUSTOMER_ID

  if (!apiKey || !secretKey || !customerId) {
    return NextResponse.json({ error: '검색광고 API 키 미설정' }, { status: 500 })
  }

  try {
    const timestamp = String(Date.now())
    const path = '/keywordstool'
    const signature = makeSignature(timestamp, 'GET', path, secretKey)

    const url = 'https://api.naver.com/keywordstool?hintKeywords=' + encodeURIComponent(keyword) + '&showDetail=1'

    const res = await fetch(url, {
      headers: {
        'X-Timestamp':  timestamp,
        'X-API-KEY':    apiKey,
        'X-Customer':   customerId,
        'X-Signature':  signature,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      return NextResponse.json({ error: 'Naver Ad API ' + res.status, detail: errText })
    }

    const data = await res.json()
    const list: Array<{ relKeyword: string; monthlyPcQcCnt: number | '<10'; monthlyMobileQcCnt: number | '<10' }> = data.keywordList || []

    const item = list.find(k => k.relKeyword === keyword) || list[0]
    if (!item) return NextResponse.json({ pcQcCnt: null, mobileQcCnt: null, totalQcCnt: null })

    const pc     = typeof item.monthlyPcQcCnt === 'number'     ? item.monthlyPcQcCnt     : null
    const mobile = typeof item.monthlyMobileQcCnt === 'number' ? item.monthlyMobileQcCnt : null
    const total  = pc !== null && mobile !== null ? pc + mobile : null

    return NextResponse.json({ pcQcCnt: pc, mobileQcCnt: mobile, totalQcCnt: total })
  } catch (err) {
    console.error('[naver-keyword-volume]', err)
    return NextResponse.json({ error: '연결 실패' })
  }
}
