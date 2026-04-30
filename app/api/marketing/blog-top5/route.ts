import { NextRequest, NextResponse } from 'next/server'

// GET /api/marketing/blog-top5?keyword=부천맛집
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const keyword = (searchParams.get('keyword') || '').trim()

  if (!keyword) return NextResponse.json({ error: '키워드를 입력해주세요.' }, { status: 400 })

  const clientId = process.env.NAVER_CLIENT_ID
  const clientSecret = process.env.NAVER_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 미설정' }, { status: 503 })
  }

  const url = `https://openapi.naver.com/v1/search/blog?query=${encodeURIComponent(keyword)}&display=5&sort=sim`

  try {
    const res = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
      next: { revalidate: 300 }, // 5분 캐시
    })
    if (!res.ok) {
      const txt = await res.text()
      return NextResponse.json({ error: `네이버 API 오류 ${res.status}: ${txt}` }, { status: res.status })
    }
    const data = await res.json()
    // items: [{ title, link, description, bloggername, bloggerlink, postdate }]
    const items = (data.items || []).map((item: Record<string, string>, idx: number) => ({
      rank: idx + 1,
      title: item.title.replace(/<[^>]*>/g, ''),
      link: item.link,
      description: item.description.replace(/<[^>]*>/g, ''),
      bloggername: item.bloggername,
      bloggerlink: item.bloggerlink,
      postdate: item.postdate,
    }))
    return NextResponse.json({ ok: true, keyword, items })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `서버 오류: ${msg}` }, { status: 500 })
  }
}
