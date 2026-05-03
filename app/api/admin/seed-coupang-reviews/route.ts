// app/api/admin/seed-coupang-reviews/route.ts
// 41차-4: 쿠팡이츠 리뷰 시드 (브라우저 GET → 자동 upsert)
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function maskAuthor(name: string | null | undefined): string | null {
  if (!name) return null
  const s = String(name).trim()
  if (s.length <= 1) return s + '*'
  if (s.length === 2) return s[0] + '*'
  return s[0] + '*'.repeat(Math.max(1, s.length - 2)) + s.slice(-1)
}

const SEED_REVIEWS = [
  { platform_review_id: 'coupang:20260422019801234', author_name: '김도현', rating: 5,
    content: '쿠팡이츠로 처음 시켜봤는데 진짜 대박이에요. 닭칼국수 국물이 이렇게 진할 수가! 만두도 찰지고 맛있어요.',
    photos: [],
    posted_at: '2026-04-22T00:00:00+09:00', has_reply: false },
  { platform_review_id: 'coupang:20260420014567890', author_name: '송지은', rating: 5,
    content: '배달 시간도 딱 맞고 따뜻하게 왔어요. 낙지수제비가 특히 맛있었어요. 자꾸 생각나는 맛이에요!',
    photos: [],
    posted_at: '2026-04-20T00:00:00+09:00', has_reply: false },
  { platform_review_id: 'coupang:20260417011234567', author_name: '임재원', rating: 4,
    content: '국물이 깊고 진해요. 양도 많아서 한 끼 든든하게 먹었어요. 재주문 의사 있어요.',
    photos: [],
    posted_at: '2026-04-17T00:00:00+09:00', has_reply: false },
  { platform_review_id: 'coupang:20260413008765432', author_name: '오예린', rating: 2,
    content: '음식은 맛있었는데 배달이 너무 늦어서요. 그래도 맛은 인정합니다.',
    photos: null, posted_at: '2026-04-13T00:00:00+09:00', has_reply: false },
  { platform_review_id: 'coupang:20260408005432198', author_name: '나승민', rating: 5,
    content: '가족이랑 같이 먹었는데 다들 맛있다고 했어요. 칼국수 면발이 쫄깃하고 국물이 진해요. 완전 추천!',
    photos: [],
    posted_at: '2026-04-08T00:00:00+09:00', has_reply: false },
  { platform_review_id: 'coupang:20260402003219870', author_name: '유하은', rating: 5,
    content: '사장님이 메모 남겨주신 것도 감동이고 음식도 너무 맛있어요. 포장 상태도 완벽!',
    photos: null, posted_at: '2026-04-02T00:00:00+09:00', has_reply: false },
  { platform_review_id: 'coupang:20260325001987654', author_name: '류성훈', rating: 4,
    content: '맛있어요. 특히 만두가 제 스타일이에요. 다음에도 주문할게요.',
    photos: null, posted_at: '2026-03-25T00:00:00+09:00', has_reply: false },
]

export async function GET(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  const userId = auth.userId
  if (!userId) return NextResponse.json({ ok: false, error: 'userId 없음' }, { status: 401 })
  const svc = createServiceClient()
  const { data: cred } = await svc.from('platform_credentials').select('platform_store_id')
    .eq('user_id', userId).eq('platform', 'coupangeats').maybeSingle()
  const storeId = cred?.platform_store_id || 'coupangeats-direct'
  const now = new Date().toISOString()
  const rows = SEED_REVIEWS.map((r) => ({
    user_id: userId, platform: 'coupangeats', platform_store_id: storeId,
    platform_review_id: r.platform_review_id, author_name: r.author_name || null,
    author_mask: maskAuthor(r.author_name), rating: r.rating, content: r.content,
    photos: r.photos, posted_at: r.posted_at, collected_at: now,
    has_reply: r.has_reply, raw_snapshot: r,
  }))
  const { data, error } = await svc.from('platform_reviews')
    .upsert(rows, { onConflict: 'platform,platform_review_id', ignoreDuplicates: false })
    .select('platform_review_id')
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, message: '쿠팡이츠 시드 완료', inserted: Array.isArray(data) ? data.length : 0, total: SEED_REVIEWS.length })
}
