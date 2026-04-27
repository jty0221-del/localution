import { NextRequest, NextResponse } from 'next/server'

function stripHtml(str: string) {
  return str.replace(/<[^>]*>/g, '').trim()
}

// 업체명 유사도 체크 (부분 포함이면 매칭)
function isMatch(title: string, businessName: string): boolean {
  const t = stripHtml(title).toLowerCase().replace(/\s/g, '')
  const b = businessName.toLowerCase().replace(/\s/g, '')
  if (!b || b === '내가게') return false
  return t.includes(b) || b.includes(t)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const keyword = searchParams.get('keyword') || ''
  const businessName = searchParams.get('businessName') || ''

  if (!keyword.trim()) {
    return NextResponse.json({ error: '키워드를 입력해주세요' }, { status: 400 })
  }

  const clientId = process.env.NAVER_CLIENT_ID
  const clientSecret = process.env.NAVER_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.json({ rank: null, error: 'API 키 미설정' }, { status: 200 })
  }

  // 최대 100위까지 탐색 (display=5씩, 20번 호출)
  const MAX_RANK = 100
  const DISPLAY = 5

  try {
    for (let start = 1; start <= MAX_RANK; start += DISPLAY) {
      const url = 'https://openapi.naver.com/v1/search/local.json'
        + '?query=' + encodeURIComponent(keyword)
        + '&display=' + DISPLAY
        + '&start=' + start
        + '&sort=random'

      const res = await fetch(url, {
        headers: {
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret,
        },
        cache: 'no-store',
      })

      if (!res.ok) {
        const errText = await res.text()
        console.error('[Naver Rank API]', res.status, errText)
        return NextResponse.json({ rank: null, error: 'API 오류: ' + res.status }, { status: 200 })
      }

      const data = await res.json()
      const items: Array<{ title: string }> = data.items || []

      // 결과가 없으면 순위권 밖
      if (items.length === 0) {
        return NextResponse.json({ rank: null, total: data.total || 0 })
      }

      // 이번 페이지에서 업체명 찾기
      for (let i = 0; i < items.length; i++) {
        if (isMatch(items[i].title, businessName)) {
          return NextResponse.json({
            rank: start + i,
            total: data.total || 0,
            matchedTitle: stripHtml(items[i].title),
          })
        }
      }

      // total이 현재 start보다 작으면 더 이상 결과 없음
      if (data.total && data.total < start + DISPLAY) {
        return NextResponse.json({ rank: null, total: data.total })
      }
    }

    // 100위 이내에 없음
    return NextResponse.json({ rank: null, total: 0, outOfRange: true })

  } catch (err) {
    console.error('[Naver Rank Fetch Error]', err)
    return NextResponse.json({ rank: null, error: '연결 실패' }, { status: 200 })
  }
}
