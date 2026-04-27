import { NextRequest, NextResponse } from 'next/server'

function stripHtml(s: string) { return s.replace(/<[^>]*>/g, '').trim() }

function isMatch(title: string, biz: string): boolean {
  const t = stripHtml(title).toLowerCase().replace(/\s/g, '')
  const b = biz.toLowerCase().replace(/\s/g, '')
  if (!b || b === '내가게') return false
  return t.includes(b) || b.includes(t)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const keyword      = searchParams.get('keyword') || ''
  const businessName = searchParams.get('businessName') || ''

  if (!keyword.trim()) return NextResponse.json({ error: '키워드 필요' }, { status: 400 })

  const clientId     = process.env.NAVER_CLIENT_ID
  const clientSecret = process.env.NAVER_CLIENT_SECRET
  if (!clientId || !clientSecret) return NextResponse.json({ rank: null, error: 'API 키 미설정' })

  const MAX = 100
  const PER = 5

  try {
    for (let start = 1; start <= MAX; start += PER) {
      const url = 'https://openapi.naver.com/v1/search/local.json'
        + '?query=' + encodeURIComponent(keyword)
        + '&display=' + PER + '&start=' + start + '&sort=random'

      const res = await fetch(url, {
        headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret },
        cache: 'no-store',
      })
      if (!res.ok) return NextResponse.json({ rank: null, error: 'Naver API ' + res.status })

      const data  = await res.json()
      const items: Array<{ title: string; link: string }> = data.items || []
      if (!items.length) return NextResponse.json({ rank: null, total: data.total || 0 })

      for (let i = 0; i < items.length; i++) {
        if (isMatch(items[i].title, businessName)) {
          const link    = items[i].link || ''
          const placeId = link.match(/\/([0-9]{5,})(?:\/|$)/)?.[1] || null
          return NextResponse.json({
            rank: start + i,
            total: data.total || 0,
            matchedTitle: stripHtml(items[i].title),
            placeLink: link,
            placeId,
          })
        }
      }
      if (data.total && data.total < start + PER) return NextResponse.json({ rank: null, total: data.total })
    }
    return NextResponse.json({ rank: null, total: 0, outOfRange: true })
  } catch (err) {
    console.error('[naver-rank]', err)
    return NextResponse.json({ rank: null, error: '연결 실패' })
  }
}
