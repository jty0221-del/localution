import { NextRequest, NextResponse } from 'next/server'

// 네이버 블로그 지수 조회
// 블로그 URL에서 blogId 추출 → 블로그 RSS + 메인 페이지 파싱
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url') || ''

  if (!url.trim()) {
    return NextResponse.json({ error: '블로그 URL을 입력해주세요.' }, { status: 400 })
  }

  // blogId 추출: https://blog.naver.com/blogId 또는 https://blogId.blog.me
  let blogId = ''
  try {
    const u = new URL(url.startsWith('http') ? url : 'https://' + url)
    if (u.hostname === 'blog.naver.com' || u.hostname === 'www.blog.naver.com') {
      blogId = u.pathname.replace(/^\//, '').split('/')[0]
    } else if (u.hostname.endsWith('.blog.me')) {
      blogId = u.hostname.replace('.blog.me', '')
    }
  } catch {
    // URL 파싱 실패 시 직접 처리
    const m = url.match(/blog\.naver\.com\/([^/?#]+)/)
    if (m) blogId = m[1]
  }

  if (!blogId) {
    return NextResponse.json({ error: '네이버 블로그 URL을 입력해주세요. (예: blog.naver.com/아이디)' }, { status: 400 })
  }

  try {
    // 블로그 메인 페이지 fetch (RSS 포함)
    const [mainRes, rssRes] = await Promise.all([
      fetch('https://blog.naver.com/' + blogId, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36' }
      }).catch(() => null),
      fetch('https://rss.blog.naver.com/' + blogId + '.xml', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      }).catch(() => null),
    ])

    let blogName = blogId
    let postCount = 0
    let latestPostDate = ''
    let description = ''
    let category = '분류 없음'

    // RSS 파싱 (최신 글 날짜, 제목, 카테고리)
    if (rssRes?.ok) {
      const rssText = await rssRes.text()
      const titleMatch    = rssText.match(/<title>([^<]+)<\/title>/)
      const descMatch     = rssText.match(/<description>([^<]+)<\/description>/)
      const pubDateMatch  = rssText.match(/<pubDate>([^<]+)<\/pubDate>/)
      const itemsCount    = (rssText.match(/<item>/g) || []).length
      const catMatch      = rssText.match(/<category>([^<]+)<\/category>/)

      if (titleMatch?.[1] && titleMatch[1] !== '네이버 블로그') blogName = titleMatch[1].trim()
      if (descMatch?.[1]) description = descMatch[1].trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').slice(0, 100)
      if (pubDateMatch?.[1]) {
        const d = new Date(pubDateMatch[1])
        if (!isNaN(d.getTime())) latestPostDate = d.toLocaleDateString('ko-KR')
      }
      if (catMatch?.[1]) category = catMatch[1].trim()
      postCount = itemsCount  // RSS는 최근 10~20개만 노출
    }

    // 메인 페이지 파싱 (방문자, 이웃, 포스트 수)
    let visitorToday   = 0
    let visitorTotal   = 0
    let neighborCount  = 0
    let postTotal      = 0

    if (mainRes?.ok) {
      const html = await mainRes.text()

      // 방문자 수 (data-view-count or 유사 패턴)
      const vcMatch  = html.match(/visitor[^"]*"[^"]*"([\d,]+)"/)
      const vtMatch  = html.match(/방문자[\s\S]{0,50}?([\d,]+)명/)
      if (vcMatch?.[1]) visitorTotal = parseInt(vcMatch[1].replace(/,/g, ''), 10) || 0
      if (vtMatch?.[1]) visitorTotal = parseInt(vtMatch[1].replace(/,/g, ''), 10) || visitorTotal

      // 이웃 수
      const neighborMatch = html.match(/이웃[\s\S]{0,30}?([\d,]+)/)
      if (neighborMatch?.[1]) neighborCount = parseInt(neighborMatch[1].replace(/,/g, ''), 10) || 0

      // 전체 글 수
      const postMatch = html.match(/전체[글보기\s]*([\d,]+)/)
      if (postMatch?.[1]) postTotal = parseInt(postMatch[1].replace(/,/g, ''), 10) || 0

      // blogName HTML에서도 시도
      const bnMatch = html.match(/<title>([^|<]+)/)
      if (bnMatch?.[1] && blogName === blogId) blogName = bnMatch[1].trim()
    }

    // 블로그 지수 점수 계산 (자체 알고리즘)
    // 기준: 방문자 누적, 이웃 수, 최신화 여부, 글 수
    function calcIndex(): { score: number; grade: string; gradeColor: string; factors: Record<string, number> } {
      const totalV = visitorTotal || 0
      const nCount = neighborCount || 0
      const pCount = postTotal || postCount || 0

      // 방문자 점수 (40%)
      let vScore = 0
      if (totalV >= 1000000) vScore = 40
      else if (totalV >= 500000) vScore = 36
      else if (totalV >= 100000) vScore = 30
      else if (totalV >= 50000)  vScore = 24
      else if (totalV >= 10000)  vScore = 18
      else if (totalV >= 1000)   vScore = 12
      else if (totalV >= 100)    vScore = 6
      else vScore = 2

      // 이웃 점수 (30%)
      let nScore = 0
      if (nCount >= 5000) nScore = 30
      else if (nCount >= 1000) nScore = 25
      else if (nCount >= 500)  nScore = 20
      else if (nCount >= 100)  nScore = 14
      else if (nCount >= 50)   nScore = 9
      else if (nCount >= 10)   nScore = 5
      else nScore = 1

      // 글 수 점수 (20%)
      let pScore = 0
      if (pCount >= 1000) pScore = 20
      else if (pCount >= 500) pScore = 17
      else if (pCount >= 200) pScore = 14
      else if (pCount >= 100) pScore = 10
      else if (pCount >= 50)  pScore = 7
      else if (pCount >= 20)  pScore = 4
      else pScore = 1

      // 최신화 점수 (10%)
      let uScore = 0
      if (latestPostDate) {
        const daysDiff = (Date.now() - new Date(latestPostDate).getTime()) / 86400000
        if (daysDiff < 1)       uScore = 10
        else if (daysDiff < 3)  uScore = 9
        else if (daysDiff < 7)  uScore = 7
        else if (daysDiff < 30) uScore = 4
        else uScore = 1
      }

      const score = vScore + nScore + pScore + uScore
      let grade = 'D', gradeColor = '#8B95A1'
      if (score >= 85) { grade = 'S'; gradeColor = '#7C3AED' }
      else if (score >= 70) { grade = 'A'; gradeColor = '#3182F6' }
      else if (score >= 50) { grade = 'B'; gradeColor = '#12B76A' }
      else if (score >= 30) { grade = 'C'; gradeColor = '#F59E0B' }

      return { score, grade, gradeColor, factors: { vScore, nScore, pScore, uScore } }
    }

    const idx = calcIndex()

    return NextResponse.json({
      ok: true,
      blogId,
      blogName,
      description,
      category,
      latestPostDate,
      postCount: postTotal || postCount,
      visitorToday,
      visitorTotal,
      neighborCount,
      index: idx,
      blogUrl: 'https://blog.naver.com/' + blogId,
    })

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: '조회 오류: ' + msg }, { status: 500 })
  }
}
