// app/api/stores/me/route.ts
// ============================================================
// 32차-5: 카테고리 자동채움 수정
//   - platform_store_name 이 "네이버 플레이스" 등 플랫폼명인 경우 무효 처리
//   - fetchNaverCategory: stores.name 우선 → naver_link.external_name 순
// ============================================================
import { NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { createServiceClient } from '@/app/lib/adminAuth'
import { VALID_PLATFORMS, PLATFORM_LABELS } from '@/app/lib/platform-credentials'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function maskAccountId(id: string | null | undefined): string {
  if (!id) return ''
  const s = String(id)
  if (s.length <= 4) return s[0] + '*'.repeat(Math.max(0, s.length - 1))
  return s.slice(0, 2) + '*'.repeat(Math.max(2, s.length - 4)) + s.slice(-2)
}

function stripHtml(str: string): string {
  let result = ''
  let inTag = false
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '<') { inTag = true; continue }
    if (str[i] === '>') { inTag = false; continue }
    if (!inTag) result += str[i]
  }
  return result.trim()
}

// "네이버 플레이스", "스마트플레이스" 등 실제 매장명이 아닌 값을 필터링
const GENERIC_NAMES = [
  '네이버 플레이스', '네이버플레이스', 'naver place', 'naverplace',
  '스마트플레이스', 'smartplace', 'smart place',
  '배달의민족', '요기요', '쿠팡이츠', '카카오맵', '구글',
]
function isValidStoreName(name: string | null | undefined): boolean {
  if (!name) return false
  const trimmed = name.trim()
  if (trimmed.length < 2) return false
  const lower = trimmed.toLowerCase()
  return !GENERIC_NAMES.some(g => lower === g.toLowerCase())
}

async function fetchNaverCategory(storeName: string): Promise<string> {
  const clientId     = process.env.NAVER_CLIENT_ID
  const clientSecret = process.env.NAVER_CLIENT_SECRET
  if (!clientId || !clientSecret || !storeName) return ''
  try {
    const url = 'https://openapi.naver.com/v1/search/local.json?query=' +
      encodeURIComponent(storeName) + '&display=5&sort=random'
    const res = await fetch(url, {
      headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret },
      cache: 'no-store',
    })
    if (!res.ok) return ''
    const data = await res.json()
    if (!Array.isArray(data.items) || data.items.length === 0) return ''
    const target = storeName.toLowerCase()
    for (const item of data.items) {
      const title = stripHtml(item.title || '').toLowerCase()
      if (title.includes(target) || target.includes(title)) {
        return stripHtml(item.category || '')
      }
    }
    return stripHtml(data.items[0].category || '')
  } catch (_) {
    return ''
  }
}

export async function GET() {
  const auth = await requireUser()
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  }

  const svc = createServiceClient()
  const userId = auth.userId

  // ── 1) platform_credentials ───────────────────────────────────
  let credentials: Array<{
    platform: string
    account_id: string | null
    platform_store_id: string | null
    platform_store_name: string | null
    connected_at: string | null
  }> = []
  try {
    const { data, error } = await svc
      .from('platform_credentials')
      .select('platform, account_id, platform_store_id, platform_store_name, updated_at')
      .eq('user_id', userId)
    if (error) console.warn('[stores/me] platform_credentials select failed:', error.message)
    if (!error && Array.isArray(data)) {
      credentials = data.map((r: any) => ({
        platform: r.platform,
        account_id: r.account_id ?? null,
        platform_store_id: r.platform_store_id ?? null,
        // 무효 이름(네이버 플레이스 등) null 처리
        platform_store_name: isValidStoreName(r.platform_store_name) ? r.platform_store_name : null,
        connected_at: r.updated_at ?? null,
      }))
    }
  } catch (e) {
    console.warn('[stores/me] platform_credentials threw:', e)
  }

  // ── 2) place_targets ──────────────────────────────────────────
  let naverLink: {
    external_id: string | null
    external_name: string | null
    external_url: string | null
    address: string | null
    category: string | null
  } | null = null
  try {
    const { data, error } = await svc
      .from('place_targets')
      .select('place_id, name, url, address, category')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
    if (!error && Array.isArray(data) && data.length > 0) {
      const t: any = data[0]
      naverLink = {
        external_id: t.place_id ?? null,
        external_name: isValidStoreName(t.name) ? t.name : null,
        external_url: t.url || (t.place_id ? 'https://map.naver.com/p/entry/place/' + t.place_id : null),
        address: t.address ?? null,
        category: t.category ?? null,
      }
    }
  } catch (_) {}

  // platform_credentials fallback
  if (!naverLink) {
    const np = credentials.find((c) => c.platform === 'naver_place')
    if (np && (np.platform_store_id || np.platform_store_name)) {
      naverLink = {
        external_id: np.platform_store_id ?? null,
        external_name: np.platform_store_name ?? null, // 이미 위에서 무효 필터링됨
        external_url: np.platform_store_id
          ? 'https://map.naver.com/p/entry/place/' + np.platform_store_id
          : null,
        address: null,
        category: null,
      }
    }
  }

  // ── 3) stores 테이블 ──────────────────────────────────────────
  let store: any = null
  try {
    const fullSel =
      'id, slug, name, category, location, address, phone, main_keyword, sub_keywords, naver_place_id, naver_url, naver_place_url, naver_blog_url, description, tone, cover_color, reward_type, reward_value, updated_at'
    const liteSel =
      'id, slug, name, category, location, address, phone, main_keyword, sub_keywords, naver_place_id, naver_url, naver_place_url, naver_blog_url, tone, cover_color, reward_type, reward_value, updated_at'
    let { data, error } = await svc
      .from('stores')
      .select(fullSel)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
    if (error && /description/i.test(error.message || '')) {
      const retry = await svc.from('stores').select(liteSel)
        .eq('user_id', userId).order('updated_at', { ascending: false }).limit(1)
      data = retry.data as any
      error = retry.error
    }
    if (!error && Array.isArray(data) && data.length > 0) store = data[0]
  } catch (_) {}

  // ── 3-B) category 자동 보충 ───────────────────────────────────
  // 카테고리가 없으면: stores.name → naverLink.external_name 순으로 검색
  if (naverLink && !naverLink.category && !store?.category) {
    const searchName = (store && isValidStoreName(store.name))
      ? store.name
      : (naverLink.external_name || '')
    if (searchName) {
      const fetched = await fetchNaverCategory(searchName)
      if (fetched) naverLink.category = fetched
    }
  }

  // ── 3.5) platform_reviews 집계 ────────────────────────────────
  const reviewAgg: Record<
    string,
    { review_count: number; rating_avg: number | null; unreplied_count: number; latest_collected_at: string | null }
  > = {}
  try {
    const { data: rv, error: rvErr } = await svc
      .from('platform_reviews')
      .select('platform, rating, has_reply, collected_at')
      .eq('user_id', userId)
    if (rvErr) {
      console.warn('[stores/me] platform_reviews agg failed:', rvErr.message)
    } else if (Array.isArray(rv)) {
      for (const r of rv as Array<{ platform: string; rating: number | null; has_reply: boolean; collected_at: string | null }>) {
        const key = r.platform
        if (!reviewAgg[key]) reviewAgg[key] = { review_count: 0, rating_avg: null, unreplied_count: 0, latest_collected_at: null }
        const slot = reviewAgg[key]
        slot.review_count += 1
        if (!r.has_reply) slot.unreplied_count += 1
        if (r.collected_at && (!slot.latest_collected_at || r.collected_at > slot.latest_collected_at)) {
          slot.latest_collected_at = r.collected_at
        }
      }
      for (const key of Object.keys(reviewAgg)) {
        const subset = (rv as any[]).filter(
          (r) => r.platform === key && typeof r.rating === 'number' && r.rating >= 1 && r.rating <= 5,
        )
        if (subset.length > 0) {
          const sum = subset.reduce((a, b) => a + Number(b.rating), 0)
          reviewAgg[key].rating_avg = Number((sum / subset.length).toFixed(2))
        }
      }
    }
  } catch (e) {
    console.warn('[stores/me] platform_reviews agg threw:', e)
  }

  // ── 4) 플랫폼 통합 배열 ────────────────────────────────────────
  const storesNaverPlaceId: string | null = (store && (store as any).naver_place_id) || null
  const storesName: string | null = (store && (store as any).name) || null
  const platforms = (VALID_PLATFORMS as readonly string[]).map((p) => {
    const c = credentials.find((x) => x.platform === p)
    const agg = reviewAgg[p] ?? null
    let connected = !!c
    let platform_store_id: string | null = c?.platform_store_id ?? null
    let platform_store_name: string | null = c?.platform_store_name ?? null
    if (p === 'naver_place' && !connected) {
      if (naverLink && (naverLink.external_id || naverLink.external_name)) {
        connected = true
        platform_store_id = platform_store_id ?? naverLink.external_id ?? null
        platform_store_name = platform_store_name ?? naverLink.external_name ?? null
      } else if (storesNaverPlaceId) {
        connected = true
        platform_store_id = platform_store_id ?? storesNaverPlaceId
        platform_store_name = platform_store_name ?? storesName
      } else if ((agg?.review_count ?? 0) > 0) {
        connected = true
      }
    }
    if (!connected && (agg?.review_count ?? 0) > 0) connected = true
    return {
      platform: p,
      label: (PLATFORM_LABELS as Record<string, string>)[p] ?? p,
      connected,
      account_id_masked: c ? maskAccountId(c.account_id) : '',
      platform_store_id,
      platform_store_name,
      connected_at: c?.connected_at ?? null,
      review_count: agg?.review_count ?? 0,
      rating_avg: agg?.rating_avg ?? null,
      unreplied_count: agg?.unreplied_count ?? 0,
      latest_collected_at: agg?.latest_collected_at ?? null,
    }
  })

  // ── 5) 지도 정보 ───────────────────────────────────────────────
  const mapAddress = store?.address || naverLink?.address || null
  const map = mapAddress ? { address: mapAddress, lat: null as number | null, lng: null as number | null } : null

  return NextResponse.json({ ok: true, user_id: userId, store, platforms, naver_link: naverLink, map })
}
