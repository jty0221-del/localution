// app/api/naver-rank/route.ts
// ============================================================
// 플레이스 키워드 순위 단건 조회 (매장 등록 없이 즉석 확인용)
//
// 2026-08-04 리팩터:
//   기존 구현은 지역검색 오픈API 를 start=1,6,11... 로 페이징했으나
//   해당 API 는 start 최대 1 · display 최대 5 라 구조적으로 상위 5위까지만
//   조회 가능했고, 상호명 문자열 매칭이라 지점명·띄어쓰기로 오탐이 났다.
//   또한 어떤 프론트에서도 호출되지 않는 고아 라우트였다.
//
//   이제 app/lib/place-rank.ts 의 scanPlaceRank() 에 위임한다.
//   (placeId 매칭 + map_api → mobile_list → local_openapi 순차 폴백)
//   순위 측정 로직이 두 곳에 존재하면 반드시 어긋나므로 단일 출처를 유지한다.
//
//   GET ?keyword=부천가발&placeId=1234567
//   GET ?keyword=부천가발&businessName=모앤도트
//
// 기록은 남기지 않는다. 시계열이 필요하면 /api/place/keyword-rank 를 쓸 것.
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { rateLimitByIp } from '@/app/lib/rateLimit'
import { scanPlaceRank } from '@/app/lib/place-rank'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: auth.status })
  }

  const rl = rateLimitByIp(req, `naver-rank:${auth.userId}`, 20, 60)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'rate_limited', message: `${rl.resetIn}초 후 다시 시도해주세요.` },
      { status: 429 },
    )
  }

  const sp = new URL(req.url).searchParams
  const keyword = (sp.get('keyword') || '').trim()
  const placeId = (sp.get('placeId') || '').trim() || null
  const businessName = (sp.get('businessName') || '').trim() || null

  if (!keyword) {
    return NextResponse.json({ error: '키워드가 필요해요' }, { status: 400 })
  }
  if (!placeId && !businessName) {
    return NextResponse.json({ error: 'placeId 또는 businessName 이 필요해요' }, { status: 400 })
  }

  const result = await scanPlaceRank({ keyword, placeId, businessName, maxRank: 100 })

  if (result.method === 'none') {
    return NextResponse.json(
      { rank: null, error: '순위를 가져오지 못했어요', detail: result.errors.join(', ') },
      { status: 502 },
    )
  }

  return NextResponse.json({
    rank: result.rank,
    total: result.total,
    method: result.method,
    matchedTitle: result.matchedName,
  })
}
