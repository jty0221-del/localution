import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * 배달 플랫폼 연동 API
 * 배달의민족 / 요기요 / 쿠팡이츠는 공개 API 없음
 * → 사장님 계정 ID + 매장 ID 입력 방식으로 연결 정보만 저장
 * → 추후 Selenium 기반 자동 리뷰 수집으로 확장 예정
 *
 * POST /api/platforms/delivery
 * { platform: 'baemin' | 'yogiyo' | 'coupangeats', action: 'save' | 'reviews', ... }
 */

type DeliveryPlatform = 'baemin' | 'yogiyo' | 'coupangeats'

const PLATFORM_META: Record<DeliveryPlatform, { name: string; storeUrl: (id: string) => string }> = {
  baemin: {
    name: '배달의민족',
    storeUrl: (id) => `https://baemin.me/${id}`,
  },
  yogiyo: {
    name: '요기요',
    storeUrl: (id) => `https://www.yogiyo.co.kr/restaurant/${id}/`,
  },
  coupangeats: {
    name: '쿠팡이츠',
    storeUrl: (id) => `https://store.coupangeats.com/store/${id}`,
  },
}

// ── 배달의민족 사장님 광장 URL → 매장 ID 추출 ────────────────
function extractDeliveryId(platform: DeliveryPlatform, input: string): string | null {
  const s = input.trim()
  if (!s) return null

  // 숫자/영문 슬러그 ID 직접 입력
  if (/^[a-zA-Z0-9_-]{3,}$/.test(s)) return s

  if (platform === 'baemin') {
    const m = s.match(/baemin\.me\/([a-zA-Z0-9_-]+)/) ||
              s.match(/baemin\.com\/store\/([a-zA-Z0-9_-]+)/)
    return m?.[1] || null
  }
  if (platform === 'yogiyo') {
    const m = s.match(/yogiyo\.co\.kr\/restaurant\/(\d+)/) ||
              s.match(/restaurant\/(\d+)/)
    return m?.[1] || null
  }
  if (platform === 'coupangeats') {
    const m = s.match(/coupangeats\.com\/store\/([a-zA-Z0-9_-]+)/) ||
              s.match(/store\/([a-zA-Z0-9_-]+)/)
    return m?.[1] || null
  }
  return null
}

// ── 목업 리뷰 생성 ────────────────────────────────────────────
function mockReviews(platform: DeliveryPlatform, storeId: string) {
  const reviewsByPlatform = {
    baemin: [
      { id: `b-${storeId}-1`, rating: 5, author: '배**', date: '2026-04-13', text: '배달 빠르고 음식 맛있어요! 포장도 깔끔합니다.', replied: false },
      { id: `b-${storeId}-2`, rating: 4, author: '민**', date: '2026-04-10', text: '양 많고 맛있는데 좀 짜요.', replied: true },
      { id: `b-${storeId}-3`, rating: 5, author: '김**', date: '2026-04-08', text: '사장님이 친절하게 메모도 써주셨어요 감동', replied: true },
    ],
    yogiyo: [
      { id: `y-${storeId}-1`, rating: 5, author: '요**', date: '2026-04-12', text: '항상 맛있게 잘 먹고 있어요!', replied: false },
      { id: `y-${storeId}-2`, rating: 3, author: '기**', date: '2026-04-09', text: '배달은 빠른데 음식이 식어서 왔어요.', replied: false },
    ],
    coupangeats: [
      { id: `c-${storeId}-1`, rating: 5, author: '쿠**', date: '2026-04-11', text: '할인 쿠폰 써서 가성비 최고였어요!', replied: false },
      { id: `c-${storeId}-2`, rating: 4, author: '팡**', date: '2026-04-06', text: '쿠팡이츠 배달 빠르네요. 음식도 맛있음.', replied: true },
    ],
  }
  return reviewsByPlatform[platform]
}

// ── POST /api/platforms/delivery ─────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { platform, action, input, storeId } = body

    if (!platform || !PLATFORM_META[platform as DeliveryPlatform]) {
      return NextResponse.json({ error: '유효하지 않은 플랫폼' }, { status: 400 })
    }
    const p = platform as DeliveryPlatform
    const meta = PLATFORM_META[p]

    // 1) ID 추출 + 검증
    if (action === 'verify') {
      const externalId = extractDeliveryId(p, input || '')
      if (!externalId) {
        return NextResponse.json({
          error: `유효한 ${meta.name} 매장 URL 또는 ID가 아닙니다`,
        }, { status: 400 })
      }
      return NextResponse.json({
        platform: p,
        externalId,
        name: `${meta.name} 매장 (${externalId})`,
        url: meta.storeUrl(externalId),
        verified: true,
      })
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch (err) {
    console.error('delivery platform error:', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// ── GET /api/platforms/delivery?platform=baemin&storeId=xxx ──
export async function GET(req: NextRequest) {
  const platform = req.nextUrl.searchParams.get('platform') as DeliveryPlatform
  const storeId  = req.nextUrl.searchParams.get('storeId')

  if (!platform || !storeId) {
    return NextResponse.json({ error: 'platform, storeId 필요' }, { status: 400 })
  }
  if (!PLATFORM_META[platform]) {
    return NextResponse.json({ error: '유효하지 않은 플랫폼' }, { status: 400 })
  }

  return NextResponse.json({
    platform,
    storeId,
    source: 'mock',
    reviews: mockReviews(platform, storeId),
    stats: { total: platform === 'baemin' ? 243 : platform === 'yogiyo' ? 118 : 87, avg: 4.5, replied: 0 },
  })
}
