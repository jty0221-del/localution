// app/api/admin/seed-baemin-reviews/route.ts
// ============================================================
// 40차-2: 배민 리뷰 1회성 시드 (브라우저 GET → 자동 upsert)
//   로그인된 관리자가 이 URL을 방문하면 7건 즉시 저장
//   사용 후 삭제 예정
// ============================================================
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
  { platform_review_id: 'baemin:20260418017660631', author_name: '박이노', rating: null, content: '항상 매장에서 먹다가 배달시켜봤는데 역시 맛있네요. 포장도 꼼꼼하게 해주셨어요!', posted_at: '2026-04-18T00:00:00+09:00', has_reply: false, reply_content: null },
  { platform_review_id: 'baemin:20260412026109861', author_name: '김나니', rating: null, content: null, posted_at: '2026-04-12T00:00:00+09:00', has_reply: false, reply_content: null },
  { platform_review_id: 'baemin:20260312017435821', author_name: '로이주리', rating: null, content: '닭칼국수랑 만두 조합이 진짜 최고예요. 국물이 진하고 깊은 맛이 나서 자꾸 생각나요.', posted_at: '2026-03-12T00:00:00+09:00', has_reply: false, reply_content: null },
  { platform_review_id: 'baemin:20260309018691621', author_name: '나르뚤', rating: null, content: '닭칼국수랑 낙지수제비 둘다 맛있어요. 국물이 진하고 면발도 쫄깃해요.', posted_at: '2026-03-09T00:00:00+09:00', has_reply: false, reply_content: null },
  { platform_review_id: 'baemin:20260227023086391', author_name: 'P90', rating: null, content: '맛도 맛있고 양도 많고 가격도 착하고 완벽합니다!', posted_at: '2026-02-27T00:00:00+09:00', has_reply: false, reply_content: null },
  { platform_review_id: 'baemin:20260216026413321', author_name: '부천찰스', rating: null, content: null, posted_at: '2026-02-16T00:00:00+09:00', has_reply: false, reply_content: null },
  { platform_review_id: 'baemin:20260216012489032', author_name: 'osw', rating: null, content: null, posted_at: '2026-02-16T00:00:00+09:00', has_reply: false, reply_content: null },
]

export async function GET(req: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  }
  const userId = auth.userId
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'userId 없음' }, { status: 401 })
  }

  const svc = createServiceClient()

  // platform_credentials 에서 baemin store_id 조회
  const { data: cred } = await svc
    .from('platform_credentials')
    .select('platform_store_id')
    .eq('user_id', userId)
    .eq('platform', 'baemin')
    .maybeSingle()

  const storeId = cred?.platform_store_id || 'baemin-direct'
  const now = new Date().toISOString()

  const rows = SEED_REVIEWS.map((r) => ({
    user_id: userId,
    platform: 'baemin',
    platform_store_id: storeId,
    platform_review_id: r.platform_review_id,
    author_name: r.author_name || null,
    author_mask: maskAuthor(r.author_name),
    rating: r.rating,
    content: r.content,
    photos: null,
    posted_at: r.posted_at,
    collected_at: now,
    has_reply: r.has_reply,
    reply_content: r.reply_content,
    raw_snapshot: r,
  }))

  const { data, error } = await svc
    .from('platform_reviews')
    .upsert(rows, { onConflict: 'platform,platform_review_id', ignoreDuplicates: false })
    .select('platform_review_id')

  if (error) {
    console.error('[seed-baemin-reviews]', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    message: '배민 리뷰 시드 완료',
    admin: auth.email,
    userId,
    storeId,
    email: auth.email,
    inserted: Array.isArray(data) ? data.length : 0,
    total: SEED_REVIEWS.length,
    reviews: Array.isArray(data) ? data.map((d: any) => d.platform_review_id) : [],
  })
}
