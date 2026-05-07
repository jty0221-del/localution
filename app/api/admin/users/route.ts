// app/api/admin/users/route.ts
// ============================================================
// 관리자: 전체 사용자 목록 + 매장 정보 + 분류 (지역/업종) + 연동 플랫폼 수
//
// GET → { rows: [...], total, by_region, by_industry }
// ============================================================
import { NextResponse } from 'next/server'
import { createServiceClient, requireAdmin } from '@/app/lib/adminAuth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// 주소 → 시/도 단위 region 추출 (서울특별시 / 경기도 / 부천시 등)
function extractRegion(address: string | null | undefined): string | null {
  if (!address) return null
  const s = String(address).trim()
  if (!s) return null
  // "경기 부천시 ..." / "서울특별시 강남구 ..." / "인천 미추홀구 ..." 등
  const first = s.split(/\s+/)[0] || ''
  // 시/도 표준화
  const map: Record<string, string> = {
    '서울': '서울', '서울특별시': '서울', '서울시': '서울',
    '부산': '부산', '부산광역시': '부산', '부산시': '부산',
    '대구': '대구', '대구광역시': '대구', '대구시': '대구',
    '인천': '인천', '인천광역시': '인천', '인천시': '인천',
    '광주': '광주', '광주광역시': '광주', '광주시': '광주',
    '대전': '대전', '대전광역시': '대전', '대전시': '대전',
    '울산': '울산', '울산광역시': '울산', '울산시': '울산',
    '세종': '세종', '세종특별자치시': '세종', '세종시': '세종',
    '경기': '경기', '경기도': '경기',
    '강원': '강원', '강원도': '강원', '강원특별자치도': '강원',
    '충북': '충북', '충청북도': '충북',
    '충남': '충남', '충청남도': '충남',
    '전북': '전북', '전라북도': '전북', '전북특별자치도': '전북',
    '전남': '전남', '전라남도': '전남',
    '경북': '경북', '경상북도': '경북',
    '경남': '경남', '경상남도': '경남',
    '제주': '제주', '제주도': '제주', '제주특별자치도': '제주',
  }
  return map[first] || first.slice(0, 4) || null
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin.ok) {
    return NextResponse.json({ error: admin.message }, { status: admin.status })
  }

  try {
    const svc = createServiceClient()

    // 1) Supabase auth 사용자 + localution_user 쿠키 사용자 통합 — Supabase admin.listUsers 만 가져옴
    //    (OAuth 사용자도 Supabase auth.users 에 row 가 만들어지는 케이스 있음)
    const { data: usersData, error: uErr } = await svc.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })
    if (uErr) throw uErr
    const authUsers = usersData?.users ?? []

    // 2) stores 테이블에서 모든 매장 (각 user 의 매장)
    const { data: storesData } = await svc
      .from('stores')
      .select('user_id, id, name, category, location, address, phone, naver_place_id, created_at, updated_at')
      .order('updated_at', { ascending: false })

    const stores = storesData || []
    const storesByUser = new Map<string, any[]>()
    for (const s of stores) {
      const arr = storesByUser.get(s.user_id) || []
      arr.push(s)
      storesByUser.set(s.user_id, arr)
    }

    // 3) platform_credentials 에서 연동 플랫폼 정보
    const { data: credsData } = await svc
      .from('platform_credentials')
      .select('user_id, platform, platform_store_name, last_login_status, last_login_at, connected_at')

    const creds = credsData || []
    const credsByUser = new Map<string, any[]>()
    for (const c of creds) {
      const arr = credsByUser.get(c.user_id) || []
      arr.push(c)
      credsByUser.set(c.user_id, arr)
    }

    // 4) platform_reviews 카운트 (user 별 총 리뷰 수)
    const { data: revData } = await svc
      .from('platform_reviews')
      .select('user_id', { count: 'exact', head: false })
    const reviewCount = new Map<string, number>()
    for (const r of (revData || [])) {
      reviewCount.set(r.user_id, (reviewCount.get(r.user_id) || 0) + 1)
    }

    // 5) Supabase auth 에 없지만 stores / platform_credentials 에 user_id 있는 OAuth 사용자도 포함
    const allUserIds = new Set<string>()
    for (const u of authUsers) allUserIds.add(u.id)
    for (const s of stores) allUserIds.add(s.user_id)
    for (const c of creds) allUserIds.add(c.user_id)

    const authMap = new Map<string, any>()
    for (const u of authUsers) authMap.set(u.id, u)

    const rows: any[] = []
    for (const uid of allUserIds) {
      const auth = authMap.get(uid)
      const storeList = storesByUser.get(uid) || []
      const credList = credsByUser.get(uid) || []
      const primary = storeList[0]
      const region = extractRegion(primary?.address || primary?.location)

      const platforms = credList.map((c: any) => c.platform)
      const lastLogin = credList
        .map((c: any) => c.last_login_at)
        .filter(Boolean)
        .sort()
        .reverse()[0] || null

      rows.push({
        user_id: uid,
        email: auth?.email || null,
        provider: auth?.app_metadata?.provider || null,
        signed_up_at: auth?.created_at || primary?.created_at || credList[0]?.connected_at || null,
        last_sign_in_at: auth?.last_sign_in_at || null,
        store_count: storeList.length,
        primary_store: primary ? {
          name: primary.name,
          category: primary.category,
          address: primary.address,
          location: primary.location,
          phone: primary.phone,
          naver_place_id: primary.naver_place_id,
        } : null,
        region,
        category: primary?.category || null,
        platforms,
        platform_count: platforms.length,
        last_platform_login_at: lastLogin,
        review_count: reviewCount.get(uid) || 0,
      })
    }

    // 가입 최신 순
    rows.sort((a, b) => {
      const ta = new Date(a.signed_up_at || 0).getTime()
      const tb = new Date(b.signed_up_at || 0).getTime()
      return tb - ta
    })

    // 분류 집계
    const byRegion: Record<string, number> = {}
    const byCategory: Record<string, number> = {}
    const byPlatform: Record<string, number> = {}
    for (const r of rows) {
      if (r.region) byRegion[r.region] = (byRegion[r.region] || 0) + 1
      if (r.category) byCategory[r.category] = (byCategory[r.category] || 0) + 1
      for (const p of r.platforms) byPlatform[p] = (byPlatform[p] || 0) + 1
    }

    return NextResponse.json({
      ok: true,
      total: rows.length,
      with_store: rows.filter(r => r.store_count > 0).length,
      with_platform: rows.filter(r => r.platform_count > 0).length,
      by_region: byRegion,
      by_category: byCategory,
      by_platform: byPlatform,
      rows,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'users query failed' },
      { status: 500 },
    )
  }
}
