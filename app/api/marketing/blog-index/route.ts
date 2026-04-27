import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url') || ''

  if (!url.trim()) return NextResponse.json({ error: '블로그 URL을 입력해주세요.' }, { status: 400 })

  // blogId 추출
  let blogId = ''
  try {
    const u = new URL(url.startsWith('http') ? url : 'https://' + url)
    if (u.hostname.includes('blog.naver.com')) {
      blogId = u.pathname.replace(/^\//, '').split('/')[0]
    } else if (u.hostname.endsWith('.blog.me')) {
      blogId = u.hostname.replace('.blog.me', '')
    }
    if (!blogId) blogId = url.replace(/https?:\/\/[^/]*\//, '').split('/')[0].trim()
  } catch {
    const m = url.match(/blog\.naver\.com\/([^/?#\s]+)/)
    blogId = m?.[1] || url.trim()
  }

  if (!blogId) return NextResponse.json({ error: '네이버 블로그 URL을 입력해주세요.' }, { status: 400 })

  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36'

  // ── BLAI API (키 있을 때만) ─────────────────────────────────────────
  const blaiKey = process.env.BLAI_API_KEY
  if (blaiKey) {
    try {
      const r = await fetch('https://api.blai.co.kr/v1/blog?blogId=' + encodeURIComponent(blogId), {
        headers: { Authorization: 'Bearer ' + blaiKey, 'Content-Type': 'application/json' }
      })
      if (r.ok) {
        const d = await r.json()
        return NextResponse.json({ ok: true, source: 'blai', ...d })
      }
    } catch {}
  }

  // ── Naver 공개 데이터 fallback ─────────────────────────────────────
  const [mainRes, rssRes, visitRes] = await Promise.all([
    fetch('https://blog.naver.com/' + blogId, { headers:{ 'User-Agent': UA } }).catch(()=>null),
    fetch('https://rss.blog.naver.com/' + blogId + '.xml', { headers:{ 'User-Agent': UA } }).catch(()=>null),
    // 네이버 블로그 방문자 통계 (공개 블로그 일부에서 작동)
    fetch('https://blog.naver.com/NVisitorgp4Ajax.naver?blogId=' + blogId, {
      headers: { 'User-Agent': UA, Referer: 'https://blog.naver.com/' + blogId }
    }).catch(()=>null),
  ])

  let blogName = blogId, description = '', category = '', latestPostDate = ''
  let postCount = 0, visitorToday = 0, visitorTotal = 0, neighborCount = 0
  let visitorDaily: { date: string; count: number }[] = []

  // RSS 파싱
  if (rssRes?.ok) {
    const xml = await rssRes.text()
    const grab = (tag: string) => xml.match(new RegExp('<' + tag + '><!\[CDATA\[([\s\S]*?)\]\]><\/' + tag + '>|<' + tag + '>([^<]+)<\/' + tag + '>'))?.[1] || xml.match(new RegExp('<' + tag + '>([^<]+)<\/' + tag + '>'))?.[1] || ''
    const rawTitle = grab('title')
    if (rawTitle && rawTitle !== '네이버 블로그') blogName = rawTitle.trim()
    description = grab('description').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').slice(0,120)
    category    = grab('category').trim()
    const items = xml.match(/<item>/g) || []
    postCount   = items.length
    const pubDate = xml.match(/<pubDate>([^<]+)<\/pubDate>/)?.[1]
    if (pubDate) { const d = new Date(pubDate); if (!isNaN(d.getTime())) latestPostDate = d.toLocaleDateString('ko-KR') }
  }

  // 방문자 통계 Ajax 파싱
  if (visitRes?.ok) {
    const vText = await visitRes.text()
    try {
      // 응답 형태: {visitCountList:[{visitDate:"20240101",visitCount:123},...], todayVisitCount:45}
      const vJson = JSON.parse(vText)
      if (vJson.todayVisitCount !== undefined) visitorToday = Number(vJson.todayVisitCount) || 0
      if (Array.isArray(vJson.visitCountList)) {
        visitorDaily = vJson.visitCountList.slice(-30).map((v: Record<string,unknown>) => ({
          date:  String(v.visitDate || '').replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
          count: Number(v.visitCount) || 0,
        }))
        visitorTotal = visitorDaily.reduce((s, v) => s + v.count, 0)
      }
    } catch {
      // 숫자 패턴으로 추출 시도
      const m = vText.match(/"todayVisitCount":(\d+)/)
      if (m) visitorToday = parseInt(m[1], 10)
    }
  }

  // 메인 HTML 파싱 (방문자/이웃 보조)
  if (mainRes?.ok) {
    const html = await mainRes.text()
    const bnMatch = html.match(/<title>([^|<]{2,50})/)
    if (bnMatch?.[1] && (blogName === blogId)) blogName = bnMatch[1].trim()

    if (!visitorTotal) {
      const vm = html.match(/visitorgp[^>]*>([\d,]+)|방문자[\s\S]{0,30}?([\d,]+)명/)
      if (vm) visitorTotal = parseInt((vm[1]||vm[2]||'0').replace(/,/g,''), 10) || 0
    }
    const nm = html.match(/이웃[\s\S]{0,40}?([\d,]+)/)
    if (nm) neighborCount = parseInt(nm[1].replace(/,/g,''), 10) || 0
    const pm = html.match(/전체[글보기\s]*?([\d,]+)/)
    if (pm) postCount = parseInt(pm[1].replace(/,/g,''), 10) || postCount
  }

  // 지수 계산
  function calcIndex() {
    const vS = visitorTotal >= 1000000 ? 40 : visitorTotal >= 500000 ? 36 : visitorTotal >= 100000 ? 30 : visitorTotal >= 50000 ? 24 : visitorTotal >= 10000 ? 18 : visitorTotal >= 1000 ? 12 : visitorTotal >= 100 ? 6 : 2
    const nS = neighborCount >= 5000 ? 30 : neighborCount >= 1000 ? 25 : neighborCount >= 500 ? 20 : neighborCount >= 100 ? 14 : neighborCount >= 50 ? 9 : neighborCount >= 10 ? 5 : 1
    const pS = postCount >= 1000 ? 20 : postCount >= 500 ? 17 : postCount >= 200 ? 14 : postCount >= 100 ? 10 : postCount >= 50 ? 7 : postCount >= 20 ? 4 : 1
    let uS = 0
    if (latestPostDate) {
      const diff = (Date.now() - new Date(latestPostDate).getTime()) / 86400000
      uS = diff < 1 ? 10 : diff < 3 ? 9 : diff < 7 ? 7 : diff < 30 ? 4 : 1
    }
    const score = vS + nS + pS + uS
    const grade = score >= 85 ? 'S' : score >= 70 ? 'A' : score >= 50 ? 'B' : score >= 30 ? 'C' : 'D'
    const color = { S:'#7C3AED', A:'#3182F6', B:'#12B76A', C:'#F59E0B', D:'#8B95A1' }[grade]!
    return { score, grade, gradeColor: color, factors: { vScore:vS, nScore:nS, pScore:pS, uScore:uS } }
  }

  return NextResponse.json({
    ok: true, source: 'naver',
    blogId, blogName, description, category, latestPostDate,
    postCount, visitorToday, visitorTotal, neighborCount,
    visitorDaily,
    index: calcIndex(),
    blogUrl: 'https://blog.naver.com/' + blogId,
    blaiReady: !blaiKey,  // BLAI API Key 미설정 시 true → UI에서 안내
  })
}
