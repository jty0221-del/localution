// app/lib/regions-community.ts
// 커뮤니티 지역 게시판 시드 (14차 · MVP + 15차 위치기반)
// ─────────────────────────────────────────────────────
export type CommunityRegion = {
  id: string
  label: string
  parent_label: string | null  // 시/도. null = 전국
  sort_order: number
  // 15차 추가: 대표 좌표 (구청/시청 기준, 근사치)
  lat?: number
  lng?: number
}

export const COMMUNITY_REGIONS: CommunityRegion[] = [
  { id: 'nationwide',       label: '전국',          parent_label: null,    sort_order:   0 },

  { id: 'seoul-gangnam',    label: '강남구',        parent_label: '서울',  sort_order:  10, lat: 37.5172, lng: 127.0473 },
  { id: 'seoul-songpa',     label: '송파구',        parent_label: '서울',  sort_order:  11, lat: 37.5145, lng: 127.1059 },
  { id: 'seoul-seocho',     label: '서초구',        parent_label: '서울',  sort_order:  12, lat: 37.4837, lng: 127.0324 },
  { id: 'seoul-mapo',       label: '마포구',        parent_label: '서울',  sort_order:  13, lat: 37.5663, lng: 126.9019 },
  { id: 'seoul-yongsan',    label: '용산구',        parent_label: '서울',  sort_order:  14, lat: 37.5326, lng: 126.9910 },
  { id: 'seoul-seongdong',  label: '성동구',        parent_label: '서울',  sort_order:  15, lat: 37.5633, lng: 127.0371 },

  { id: 'busan-haeundae',   label: '해운대구',      parent_label: '부산',  sort_order:  30, lat: 35.1631, lng: 129.1636 },
  { id: 'busan-suyeong',    label: '수영구',        parent_label: '부산',  sort_order:  31, lat: 35.1455, lng: 129.1132 },
  { id: 'busan-dongnae',    label: '동래구',        parent_label: '부산',  sort_order:  32, lat: 35.1970, lng: 129.0839 },

  { id: 'gyeonggi-bundang', label: '성남 분당구',   parent_label: '경기',  sort_order:  50, lat: 37.3823, lng: 127.1190 },
  { id: 'gyeonggi-suwon',   label: '수원시',        parent_label: '경기',  sort_order:  51, lat: 37.2636, lng: 127.0286 },
  { id: 'gyeonggi-goyang',  label: '고양시',        parent_label: '경기',  sort_order:  52, lat: 37.6584, lng: 126.8320 },
  { id: 'gyeonggi-hwaseong',label: '화성시',        parent_label: '경기',  sort_order:  53, lat: 37.1995, lng: 126.8311 },

  { id: 'incheon-songdo',   label: '송도(연수구)',  parent_label: '인천',  sort_order:  70, lat: 37.3826, lng: 126.6565 },

  { id: 'daegu-suseong',    label: '수성구',        parent_label: '대구',  sort_order:  80, lat: 35.8582, lng: 128.6301 },
  { id: 'daejeon-yuseong',  label: '유성구',        parent_label: '대전',  sort_order:  90, lat: 36.3626, lng: 127.3568 },
  { id: 'gwangju-seogu',    label: '서구',          parent_label: '광주',  sort_order: 100, lat: 35.1526, lng: 126.8901 },
  { id: 'jeju-city',        label: '제주시',        parent_label: '제주',  sort_order: 120, lat: 33.4996, lng: 126.5312 },
]

/** id → 라벨 */
export function regionLabel(id: string | null | undefined): string {
  if (!id) return '전국'
  const r = COMMUNITY_REGIONS.find(x => x.id === id)
  if (!r) return '전국'
  return r.parent_label ? `${r.parent_label} ${r.label}` : r.label
}

/** 시/도 기준으로 그룹핑 */
export function groupedRegions(): Array<{ parent: string | null; items: CommunityRegion[] }> {
  const map = new Map<string | null, CommunityRegion[]>()
  for (const r of COMMUNITY_REGIONS) {
    const key = r.parent_label ?? null
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(r)
  }
  return Array.from(map.entries()).map(([parent, items]) => ({ parent, items }))
}

// ─────────────────────────────────────────────────────
// 위치기반 (15차 · 당근식 근처 지역 추천)
// ─────────────────────────────────────────────────────
/** Haversine 거리(km) */
export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const s1 = Math.sin(dLat / 2)
  const s2 = Math.sin(dLng / 2)
  const c = s1 * s1 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * s2 * s2
  return 2 * R * Math.asin(Math.sqrt(c))
}

/** 내 좌표에서 가까운 순으로 정렬된 지역 목록(전국 제외) */
export function nearestRegions(
  lat: number,
  lng: number,
  limit = 5,
): Array<CommunityRegion & { distance_km: number }> {
  return COMMUNITY_REGIONS
    .filter(r => r.lat != null && r.lng != null)
    .map(r => ({ ...r, distance_km: haversineKm(lat, lng, r.lat!, r.lng!) }))
    .sort((a, b) => a.distance_km - b.distance_km)
    .slice(0, limit)
}
