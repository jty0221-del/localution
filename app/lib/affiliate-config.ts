// app/lib/affiliate-config.ts
// ============================================================
// QR 제작 업체 광고 링크 (네이버 쇼핑 커넥트)
//
//   · 5개 슬롯
//   · url               = 클릭 시 이동 URL (CPS affiliate, 예: naver.me/...)
//   · previewSourceUrl  = 메타 추출 시도용 직접 URL (예: smartstore.naver.com/...)
//   · 자동 추출 실패 시 override* 사용 (이미지·제목·가격·평점·리뷰수)
//   · enabled: false 면 화면에 미노출
// ============================================================

export type AffiliateProduct = {
  slot: number
  url: string                   // 클릭 시 이동 (CPS affiliate)
  previewSourceUrl?: string     // 메타 추출 시도용 직접 URL
  enabled: boolean
  // 자동 추출 안 될 때 직접 채워넣을 값
  overrideImage?: string        // 상품 대표 이미지 URL
  overrideTitle?: string        // 상품 이름
  overrideDesc?: string         // 짧은 설명
  overridePrice?: string        // "29,800원" 형식
  overrideRating?: number       // 4.8 (1~5)
  overrideReviewCount?: number  // 234
  // 카드 디자인
  badge?: string                // 'BEST' | '신상' | '추천' 등
  badgeColor?: string           // hex 색상
}

// 5개 affiliate (네이버 쇼핑 커넥트) — 사용자가 클릭하면 CPS 수익 발생
// 미리보기는 previewSourceUrl 에서 시도하되 SPA/봇탐지로 실패 가능 → override* 사용
export const AFFILIATE_PRODUCTS: AffiliateProduct[] = [
  {
    slot: 1,
    url: 'https://naver.me/xtNHROhY',
    previewSourceUrl: 'https://smartstore.naver.com/jdripper/products/11479895384',
    enabled: true,
    badge: 'BEST',
    badgeColor: '#DC2626',
  },
  {
    slot: 2,
    url: 'https://naver.me/FkadzuRw',
    previewSourceUrl: 'https://smartstore.naver.com/ongigonggan/products/9984511568',
    enabled: true,
  },
  {
    slot: 3,
    url: 'https://naver.me/x0OhoNFH',
    previewSourceUrl: 'https://smartstore.naver.com/oneam/products/11431999261',
    enabled: true,
    badge: '추천',
    badgeColor: '#3182F6',
  },
  {
    slot: 4,
    url: 'https://naver.me/x1ugY8C7',
    previewSourceUrl: 'https://smartstore.naver.com/ongigonggan/products/10005180354',
    enabled: true,
  },
  {
    slot: 5,
    url: 'https://naver.me/5l2CQyBP',
    previewSourceUrl: 'https://smartstore.naver.com/ledcup/products/12107443979',
    enabled: true,
    badge: '신상',
    badgeColor: '#7C3AED',
  },
]

export const SHOW_EMPTY_SLOTS = false
