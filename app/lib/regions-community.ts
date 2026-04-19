// app/lib/regions-community.ts
// 커뮤니티 지역 게시판 시드 (14차 · MVP)
// ─────────────────────────────────────────────────────
export type CommunityRegion = {
  id: string
  label: string
  parent_label: string | null  // 시/도. null = 전국
  sort_order: number
}

export const COMMUNITY_REGIONS: CommunityRegion[] = [
  { id: 'nationwide',       label: '전국',          parent_label: null,    sort_order:   0 },

  { id: 'seoul-gangnam',    label: '강남구',        parent_label: '서울',  sort_order:  10 },
  { id: 'seoul-songpa',     label: '송파구',        parent_label: '서울',  sort_order:  11 },
  { id: 'seoul-seocho',     label: '서초구',        parent_label: '서울',  sort_order:  12 },
  { id: 'seoul-mapo',       label: '마포구',        parent_label: '서울',  sort_order:  13 },
  { id: 'seoul-yongsan',    label: '용산구',        parent_label: '서울',  sort_order:  14 },
  { id: 'seoul-seongdong',  label: '성동구',        parent_label: '서울',  sort_order:  15 },

  { id: 'busan-haeundae',   label: '해운대구',      parent_label: '부산',  sort_order:  30 },
  { id: 'busan-suyeong',    label: '수영구',        parent_label: '부산',  sort_order:  31 },
  { id: 'busan-dongnae',    label: '동래구',        parent_label: '부산',  sort_order:  32 },

  { id: 'gyeonggi-bundang', label: '성남 분당구',   parent_label: '경기',  sort_order:  50 },
  { id: 'gyeonggi-suwon',   label: '수원시',        parent_label: '경기',  sort_order:  51 },
  { id: 'gyeonggi-goyang',  label: '고양시',        parent_label: '경기',  sort_order:  52 },
  { id: 'gyeonggi-hwaseong',label: '화성시',        parent_label: '경기',  sort_order:  53 },

  { id: 'incheon-songdo',   label: '송도(연수구)',  parent_label: '인천',  sort_order:  70 },

  { id: 'daegu-suseong',    label: '수성구',        parent_label: '대구',  sort_order:  80 },
  { id: 'daejeon-yuseong',  label: '유성구',        parent_label: '대전',  sort_order:  90 },
  { id: 'gwangju-seogu',    label: '서구',          parent_label: '광주',  sort_order: 100 },
  { id: 'jeju-city',        label: '제주시',        parent_label: '제주',  sort_order: 120 },
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
