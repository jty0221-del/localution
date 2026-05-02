// app/lib/affiliate-config.ts
// ============================================================
// QR 제작 업체 광고 링크 (네이버 쇼핑 커넥트)
//
//   · 5개 슬롯 — 사용자가 실제 affiliate URL 제공하면 url 만 교체
//   · enabled: false 면 그 슬롯은 화면에 노출 안 됨
//   · overrideImage/Title/Price 는 사용자가 별도 제공한 값으로 자동 추출 결과 덮어쓰기
// ============================================================

export type AffiliateProduct = {
  slot: number               // 1 ~ 5
  url: string                // 네이버 쇼핑 / 브랜드 커넥트 URL
  enabled: boolean
  overrideImage?: string     // 미리보기 이미지가 안 잡힐 때 직접 지정
  overrideTitle?: string     // 제목 직접 지정
  overrideDesc?: string      // 설명 직접 지정 (선택)
  badge?: string             // 'BEST' | '신상' | '추천' 등 작은 라벨
  badgeColor?: string        // hex 색상
}

// 네이버 쇼핑 커넥트 affiliate URL 5개 (2026-05-03)
// 미리보기(이미지/가격/평점/리뷰수)는 /api/affiliate/preview 가 자동 추출 + 5분 캐시
// 자동 추출 안 되는 항목은 overrideImage / overrideTitle / overrideDesc 로 보강 가능
export const AFFILIATE_PRODUCTS: AffiliateProduct[] = [
  { slot: 1, url: 'https://naver.me/xtNHROhY', enabled: true, badge: 'BEST',  badgeColor: '#DC2626' },
  { slot: 2, url: 'https://naver.me/FkadzuRw', enabled: true },
  { slot: 3, url: 'https://naver.me/x0OhoNFH', enabled: true, badge: '추천',   badgeColor: '#3182F6' },
  { slot: 4, url: 'https://naver.me/x1ugY8C7', enabled: true },
  { slot: 5, url: 'https://naver.me/5l2CQyBP', enabled: true, badge: '신상',   badgeColor: '#7C3AED' },
]

// 광고 슬롯이 비어있으면 안내 placeholder 보여줄지 여부
export const SHOW_EMPTY_SLOTS = false
