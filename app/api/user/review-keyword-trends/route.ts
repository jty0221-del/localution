// app/api/user/review-keyword-trends/route.ts
// ============================================================
// v38: 최근 리뷰의 키워드 트렌드 분석
//   · 자주 등장하는 단어 → 메뉴/서비스 강점 파악
//   · 부정 리뷰 빈출 키워드 → 개선점
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// 무의미 단어 (한글 stopwords)
const STOPWORDS = new Set([
  '있어요', '있고', '있는', '없어요', '없는', '같아요', '같은', '너무', '정말', '진짜', '아주', '매우', '엄청', '되게',
  '먹었', '먹고', '먹는', '먹어', '갔어요', '갔다', '왔어요', '와서', '봤어요', '봤다', '보고',
  '그리고', '그래서', '근데', '하지만', '그런데', '저는', '제가', '저희', '우리', '여기',
  '오늘', '어제', '내일', '시간', '맛이', '가격', '음식이',  // 너무 일반적
  '재방문', '방문', '의지', '안내', '리뷰', '입니다', '습니다', '있습니다', '없습니다',
  '같습니다', '하나', '하루', '진짜로', '그냥', '그게', '아니', '예요', '에요', '이에요', '거든',
])

function extractKeywords(text: string): string[] {
  if (!text) return []
  // 2-4 글자 한글 추출 (명사/형용사 위주)
  const matches = text.match(/[가-힣]{2,4}/g) || []
  const seen = new Set<string>()
  const out: string[] = []
  for (const m of matches) {
    if (STOPWORDS.has(m)) continue
    // 어미 자르기 (간단)
    let w = m
    if (w.endsWith('해요') || w.endsWith('했어') || w.endsWith('하는')) w = w.slice(0, -2)
    if (w.length < 2) continue
    if (seen.has(w)) continue
    seen.add(w)
    out.push(w)
  }
  return out
}

export async function GET(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const days = Math.max(7, Math.min(180, parseInt(searchParams.get('days') || '30', 10)))
  const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString()

  const svc = createServiceClient()
  const { data } = await svc
    .from('platform_reviews')
    .select('content, rating, platform')
    .eq('user_id', auth.userId)
    .gte('posted_at', since)
    .not('content', 'is', null)
    .limit(3000)

  // 전체 / 긍정 (4~5점) / 부정 (1~2점) 분리
  const positiveFreq: Record<string, number> = {}
  const negativeFreq: Record<string, number> = {}
  const allFreq: Record<string, number> = {}

  for (const r of (data || [])) {
    const keywords = extractKeywords(r.content || '')
    for (const k of keywords) {
      allFreq[k] = (allFreq[k] || 0) + 1
      if (r.rating != null) {
        if (r.rating >= 4) positiveFreq[k] = (positiveFreq[k] || 0) + 1
        if (r.rating <= 2) negativeFreq[k] = (negativeFreq[k] || 0) + 1
      }
    }
  }

  const topByFreq = (obj: Record<string, number>, n: number) =>
    Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, c]) => ({ keyword: k, count: c }))

  return NextResponse.json({
    ok: true,
    days,
    total_reviews_analyzed: data?.length || 0,
    top_keywords: topByFreq(allFreq, 30),
    positive_keywords: topByFreq(positiveFreq, 20),
    negative_keywords: topByFreq(negativeFreq, 15),
  })
}
