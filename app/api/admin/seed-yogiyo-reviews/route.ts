// app/api/admin/seed-yogiyo-reviews/route.ts
// 41차-4: 요기요 리뷰 시드 (브라우저 GET → 자동 upsert)
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
 { platform_review_id: 'yogiyo:20260421008831201', author_name: '이현지', rating: 5,
 content: '국물이 진짜 깊고 진해요. 닭칼국수 면발도 쫄깃하고 양도 많아서 너무 만족스러워요. 재주문 각이에요!',
 photos: [],
 posted_at: '2026-04-21T00:00:00+09:00', has_reply: false },
 { platform_review_id: 'yogiyo:20260419004521893', author_name: '최준혁', rating: 4,
 content: '배달 빠르고 음식 따뜻하게 왔어요. 만두가 특히 맛있었어요. 다음에 또 시킬게요.',
 photos: [],
 posted_at: '2026-04-19T00:00:00+09:00', has_reply: false },
 { platform_review_id: 'yogiyo:20260415011209841', author_name: '박서연', rating: 5,
 content: '처음 주문했는데 이게 이렇게 맛있을 줄이야... 낙지수제비도 시켜볼 걸 그랬어요. 다음에는 세트로 시킬게요!',
 photos: null, posted_at: '2026-04-15T00:00:00+09:00', has_reply: false },
 { platform_review_id: 'yogiyo:20260410007654321', author_name: '정민호', rating: 3,
 content: '맛은 있는데 배달이 좀 늦었어요. 음식은 맛있었어요.',
 photos: null, posted_at: '2026-04-10T00:00:00+09:00', has_reply: false },
 { platform_review_id: 'yogiyo:20260405003219876', author_name: '강지수', rating: 5,
 content: '남편이랑 둘이 먹었는데 둘 다 대만족이에요! 국물 맛이 집에서 직접 끓인 것처럼 깊고 진해요.',
 photos: [],
 posted_at: '2026-04-05T00:00:00+09:00', has_reply: false },
 { platform_review_id: 'yogiyo:20260328009876543', author_name: '윤태양', rating: 4,
 content: '가성비 최고입니다. 양도 많고 맛도 좋아요.',
 photos: null, posted_at: '2026-03-28T00:00:00+09:00', has_reply: false },
 { platform_review_id: 'yogiyo:20260320001234567', author_name: '한소희', rating: 5,
 content: '포장이 깔끔하고 국물이 새지 않았어요. 칼국수 면이 부드럽고 쫄깃해서 완전 제 스타일이에요!',
 photos: [],
 posted_at: '2026-03-20T00:00:00+09:00', has_reply: false },
]

export async function GET(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
 const userId = auth.userId
 if (!userId) return NextResponse.json({ ok: false, error: 'userId 없음' }, { status: 401 })
 const svc = createServiceClient()
 const { data: cred } = await svc.from('platform_credentials').select('platform_store_id')
 .eq('user_id', userId).eq('platform', 'yogiyo').maybeSingle()
 const storeId = cred?.platform_store_id || 'yogiyo-direct'
 const now = new Date().toISOString()
 const rows = SEED_REVIEWS.map((r) => ({
 user_id: userId, platform: 'yogiyo', platform_store_id: storeId,
 platform_review_id: r.platform_review_id, author_name: r.author_name || null,
 author_mask: maskAuthor(r.author_name), rating: r.rating, content: r.content,
 photos: r.photos, posted_at: r.posted_at, collected_at: now,
 has_reply: r.has_reply, raw_snapshot: r,
 }))
 const { data, error } = await svc.from('platform_reviews')
 .upsert(rows, { onConflict: 'platform,platform_review_id', ignoreDuplicates: false })
 .select('platform_review_id')
 if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
 return NextResponse.json({ ok: true, message: '요기요 시드 완료', inserted: Array.isArray(data) ? data.length : 0, total: SEED_REVIEWS.length })
}
