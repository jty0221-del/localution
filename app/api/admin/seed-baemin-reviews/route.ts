// app/api/admin/seed-baemin-reviews/route.ts
import { NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function maskAuthor(name: string): string {
  if (!name || name.length <= 1) return name
  if (name.length === 2) return name[0] + '*'
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1]
}

const SEED_REVIEWS = [
  {
    id: 'baemin-seed-001', author: '박이노', date: '2026-04-18',
    content: '항상 매장에서 먹다가 배달시켜봤는데 역시 맛있네요. 포장도 꼼꼼하게 해주셨어요!',
    photos: ['https://picsum.photos/seed/bm1a/300/300','https://picsum.photos/seed/bm1b/300/300'],
  },
  {
    id: 'baemin-seed-002', author: '김나니', date: '2026-04-12',
    content: '',
    photos: [],
  },
  {
    id: 'baemin-seed-003', author: '로이주리', date: '2026-03-12',
    content: '닭칼국수랑 만두 조합이 진짜 최고예요. 국물이 진하고 깊은 맛이 나서 자꾸 생각나요.',
    photos: ['https://picsum.photos/seed/bm3a/300/300'],
  },
  {
    id: 'baemin-seed-004', author: '나르뚤', date: '2026-03-09',
    content: '닭칼국수랑 낙지수제비 둘다 맛있어요. 국물이 진하고 면발도 쫄깃해요.',
    photos: [],
  },
  {
    id: 'baemin-seed-005', author: 'P90', date: '2026-02-27',
    content: '맛도 맛있고 양도 많고 가격도 착하고 완벽합니다!',
    photos: ['https://picsum.photos/seed/bm5a/300/300','https://picsum.photos/seed/bm5b/300/300','https://picsum.photos/seed/bm5c/300/300'],
  },
  {
    id: 'baemin-seed-006', author: '부천찰스', date: '2026-02-16',
    content: '',
    photos: [],
  },
  {
    id: 'baemin-seed-007', author: 'osw', date: '2026-02-16',
    content: '',
    photos: [],
  },
  {
    id: 'baemin-seed-008', author: '하늘이엄마', date: '2026-04-20',
    content: '아이들이 너무 좋아해요. 국물이 시원하고 면발이 쫄깃해서 온 가족이 다 맛있게 먹었어요.',
    photos: ['https://picsum.photos/seed/bm8a/300/300'],
  },
  {
    id: 'baemin-seed-009', author: '최민준', date: '2026-04-15',
    content: '배달이 빠르고 음식이 뜨겁게 왔어요. 닭칼국수 진한 국물이 일품!',
    photos: [],
  },
  {
    id: 'baemin-seed-010', author: '단골손님', date: '2026-04-08',
    content: '매주 주문하는 단골입니다. 항상 맛 유지해주셔서 감사해요. 앞으로도 자주 올게요!',
    photos: ['https://picsum.photos/seed/bm10a/300/300','https://picsum.photos/seed/bm10b/300/300'],
  },
  {
    id: 'baemin-seed-011', author: '김도현', date: '2026-04-01',
    content: '닭칼국수 양이 많아서 두 끼도 가능해요. 가성비 최고!',
    photos: [],
  },
  {
    id: 'baemin-seed-012', author: '이수연', date: '2026-03-25',
    content: '처음 주문해봤는데 이제 단골될 것 같아요. 국물이 진하고 깊어서 감동이었어요.',
    photos: ['https://picsum.photos/seed/bm12a/300/300'],
  },
  {
    id: 'baemin-seed-013', author: '박준혁', date: '2026-03-20',
    content: '만두 추가해서 먹었는데 조합 진짜 맛있네요. 다음엔 수제비도 도전해볼게요.',
    photos: [],
  },
  {
    id: 'baemin-seed-014', author: '정유나', date: '2026-03-05',
    content: '배달 포장이 정말 꼼꼼해서 국물 하나도 안 흘렸어요. 음식도 당연히 맛있고!',
    photos: ['https://picsum.photos/seed/bm14a/300/300','https://picsum.photos/seed/bm14b/300/300'],
  },
  {
    id: 'baemin-seed-015', author: '강민서', date: '2026-02-28',
    content: '추운 날 뜨거운 국물 최고예요. 빠른 배달도 감사합니다.',
    photos: [],
  },
  {
    id: 'baemin-seed-016', author: '오재현', date: '2026-02-22',
    content: '면발이 쫄깃하고 육수가 진해서 맛있어요. 양도 넉넉하고!',
    photos: ['https://picsum.photos/seed/bm16a/300/300'],
  },
  {
    id: 'baemin-seed-017', author: '윤지영', date: '2026-02-10',
    content: '혼자 먹기에도 양이 충분해요. 국물 다 먹을 만큼 맛있었어요.',
    photos: [],
  },
  {
    id: 'baemin-seed-018', author: '임태호', date: '2026-01-30',
    content: '겨울에 딱 맞는 음식이에요. 국물이 진해서 몸이 따뜻해지는 느낌!',
    photos: ['https://picsum.photos/seed/bm18a/300/300','https://picsum.photos/seed/bm18b/300/300'],
  },
  {
    id: 'baemin-seed-019', author: '한소연', date: '2026-01-20',
    content: '재주문했어요. 처음이랑 똑같이 맛있어서 믿고 시킬 수 있는 집!',
    photos: [],
  },
  {
    id: 'baemin-seed-020', author: '조민호', date: '2026-01-10',
    content: '닭칼국수 맛이 기대 이상이었어요. 국물이 너무 깔끔하고 면발도 좋아요. 강추!',
    photos: ['https://picsum.photos/seed/bm20a/300/300'],
  },
]

export async function POST() {
  const auth = await requireUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  const userId = auth.userId
  const svc = createServiceClient()

  const rows = SEED_REVIEWS.map(r => ({
    user_id: userId,
    platform: 'baemin',
    platform_review_id: r.id,
    author_name: r.author,
    author_mask: maskAuthor(r.author),
    content: r.content || null,
    rating: null,
    photos: r.photos,
    has_reply: false,
    posted_at: r.date + 'T12:00:00+09:00',
    collected_at: new Date().toISOString(),
    reply_content: null,
    reply_posted_at: null,
  }))

  const { data, error } = await svc
    .from('platform_reviews')
    .upsert(rows, { onConflict: 'platform,platform_review_id' })
    .select('id')

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    message: '배민 시드 리뷰 20개 추가 완료',
    inserted: data?.length ?? 0,
    total: rows.length,
  })
}
