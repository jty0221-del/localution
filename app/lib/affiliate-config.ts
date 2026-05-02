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
  overrideOriginalPrice?: string // 할인 전 가격 "9,000원"
  overrideDiscountRate?: number // 할인율 (%) — 8, 59, 10 등
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
    overrideImage: 'https://shop-phinf.pstatic.net/20251027_128/1761573101583l8hXn_JPEG/22910348695284178_1416527083.jpg?type=o1000',
    overrideTitle: '네이버영수증리뷰 이벤트 큐알 qr코드 방문자 미니배너 아크릴 스탠드 탁상 테이블 S미니',
    overridePrice: '6,900원',
    overrideOriginalPrice: '9,000원',
    overrideDiscountRate: 23,
    badge: 'BEST',
    badgeColor: '#DC2626',
  },
  {
    slot: 2,
    url: 'https://naver.me/FkadzuRw',
    previewSourceUrl: 'https://smartstore.naver.com/ongigonggan/products/9984511568',
    enabled: true,
    overrideImage: 'https://shop-phinf.pstatic.net/20250205_186/1738713730809NOVln_JPEG/12068510598706092_79327913.jpg?type=o1000',
    overrideTitle: '이벤트배너 큐알 코드 네이버 영수증리뷰QR 아치형 (S size)',
    overridePrice: '6,400원',
    overrideOriginalPrice: '7,000원',
    overrideDiscountRate: 8,
  },
  {
    slot: 3,
    url: 'https://naver.me/x0OhoNFH',
    previewSourceUrl: 'https://smartstore.naver.com/oneam/products/11431999261',
    enabled: true,
    overrideImage: 'https://shop-phinf.pstatic.net/20250205_186/1738713730809NOVln_JPEG/12068510598706092_79327913.jpg?type=o1000',
    overrideTitle: '네이버 큐알 영수증 리뷰 QR 코드 아크릴 스탠드 배너 카카오톡',
    overridePrice: '15,900원',
    overrideOriginalPrice: '39,000원',
    overrideDiscountRate: 59,
    badge: '추천',
    badgeColor: '#3182F6',
  },
  {
    slot: 4,
    url: 'https://naver.me/x1ugY8C7',
    previewSourceUrl: 'https://smartstore.naver.com/ongigonggan/products/10005180354',
    enabled: true,
    overrideImage: 'https://shop-phinf.pstatic.net/20240227_38/1709035843929dsekI_JPEG/19.jpg?type=w848',
    overrideTitle: '영수증리뷰QR 영수증리뷰 큐알 코드 이벤트 배너 개업선물',
    overridePrice: '4,900원',
    overrideOriginalPrice: '5,500원',
    overrideDiscountRate: 10,
  },
  {
    slot: 5,
    url: 'https://naver.me/5l2CQyBP',
    previewSourceUrl: 'https://smartstore.naver.com/ledcup/products/12107443979',
    enabled: true,
    overrideImage: 'https://shop-phinf.pstatic.net/20251210_208/1765347652444du6yi_JPEG/19507591954148882_1901171491.jpg?type=o1000',
    overrideTitle: 'QR코드 네이버 영수증리뷰 스탠드 POP 큐알 테이블배너 네이버(그린)-부착형',
    overridePrice: '4,500원',
    overrideOriginalPrice: '5,500원',
    overrideDiscountRate: 18,
    badge: '신상',
    badgeColor: '#7C3AED',
  },
]

export const SHOW_EMPTY_SLOTS = false
