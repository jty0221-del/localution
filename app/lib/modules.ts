/**
 * 로컬루션 모듈 카탈로그 — 단일 진실 공급원(SSOT)
 *
 * ⚠️ 이 파일을 수정하면 전체 사이트의 모듈 정보가 일괄 반영된다.
 *   - /pricing        : 가격 카드
 *   - /my/subscription: 내 구독 페이지
 *   - Sidebar         : 잠금 아이콘·업셀 배지
 *   - GatedRoute      : 라우트 진입 차단
 *   - /locked         : 결제 유도 페이지
 *   - useEntitlements : 권한 체크 훅
 *
 * 새 모듈 추가 절차:
 *   1) MODULES 배열에 모듈 추가 (id, name, price, paths, icon, desc)
 *   2) SIDEBAR_MODULE_MAP 에 경로별 모듈 ID 매핑 추가
 *   3) 페이지(app/marketing/xxx/page.tsx)에 <GatedRoute moduleId="xxx"> 감싸기
 *   4) 끝. 다른 파일 수정 불필요.
 */

export type ModuleCategory = '사장님' | '마케터' | '공통'

export type ModuleStatus = 'live' | 'beta' | 'coming-soon'

export type ModuleId =
  | 'ai-review'
  | 'alimtalk'
  | 'accounting'
  | 'local-synergy'
  | 'qr-stamp'
  | 'keyword'
  | 'blog-ai'
  | 'competitor'
  | 'report'
  | 'crm'
  | 'ai-chat'
  | 'sns-manage'
  | 'card-news'
  | 'platform-hub'
  | 'blog-tracking'

export interface Module {
  id: ModuleId
  name: string
  shortName: string
  price: number // 월 구독료 (원)
  category: ModuleCategory
  status: ModuleStatus
  popular?: boolean
  /** 이 모듈이 잠금 해제하는 사이드바 경로들 (prefix 매칭) */
  paths: string[]
  /** lucide-react 아이콘 이름 */
  icon: string
  /** 한 줄 설명 */
  desc: string
  /** 결제 유도 페이지에서 보여줄 3~5가지 핵심 기능 */
  bullets: string[]
  /** 베타/예정 모듈은 배지로 표시 */
  badge?: string
}

/**
 * 12개 모듈 전체 카탈로그 (월 990원~1990원)
 * popular=true 는 /pricing 에서 "인기" 배지로 표시
 */
export const MODULES: readonly Module[] = [
  // ===== 사장님 카테고리 =====
  {
    id: 'ai-review',
    name: 'AI 리뷰 자동 답글',
    shortName: '리뷰 답글',
    price: 990,
    category: '사장님',
    status: 'live',
    popular: true,
    paths: ['/review-admin', '/reviews'],
    icon: 'MessageSquare',
    desc: '네이버·구글·배민·요기요·쿠팡 5개 플랫폼 리뷰에 AI가 자동 답글.',
    bullets: [
      '5개 플랫폼 리뷰 한 곳에서 관리',
      'AI 답글 자동 생성 (내 말투 학습)',
      '별점 1~3점 리뷰 알림',
      '답글 템플릿 저장·재사용',
    ],
  },
  {
    id: 'alimtalk',
    name: '알림톡 마케팅',
    shortName: '알림톡',
    price: 990,
    category: '사장님',
    status: 'coming-soon',
    paths: ['/alimtalk'],
    icon: 'Bell',
    desc: '고객에게 카카오 알림톡으로 쿠폰·이벤트·재방문 유도 메시지 발송.',
    bullets: [
      '카카오 알림톡 템플릿 제공',
      '예약 발송·정기 발송',
      'CRM 연동 타겟 필터',
      '발송 성과 리포트',
    ],
    badge: '2026.Q3',
  },
  {
    id: 'accounting',
    name: 'AI 정산·행정',
    shortName: '정산',
    price: 990,
    category: '사장님',
    status: 'coming-soon',
    paths: ['/settlement'],
    icon: 'Calculator',
    desc: '배달앱·카드 매출 자동 정산, 세금계산서·부가세 신고 보조.',
    bullets: [
      '배민·요기초·쿠팡 매출 자동 수집',
      '일/주/월 매출 리포트',
      '부가세 신고 자료 자동 생성',
      '인건비·재료비 대시보드',
    ],
    badge: '2026.Q4',
  },
  {
    id: 'local-synergy',
    name: '로컬 시너지',
    shortName: '로컬 시너지',
    price: 990,
    category: '사장님',
    status: 'coming-soon',
    paths: ['/local-synergy'],
    icon: 'Users',
    desc: '동네 가게끼리 교차 쿠폰·이벤트로 고객 상호 유치.',
    bullets: [
      '근처 가게 자동 매칭',
      '공동 쿠폰 발행',
      '추천 방문 트래킹',
      '시너지 리포트',
    ],
    badge: '2026.Q4',
  },
  {
    id: 'qr-stamp',
    name: 'QR 스탬프 적립',
    shortName: 'QR 스탬프',
    price: 990,
    category: '사장님',
    status: 'live',
    paths: ['/qr-admin'],
    icon: 'QrCode',
    desc: 'QR 한 번으로 리뷰·스탬프 적립. 재방문율 2배.',
    bullets: [
      '매장별 고유 QR 생성',
      '방문 스탬프 자동 적립',
      '리워드 쿠폰 발행',
      '재방문 고객 분석',
    ],
  },

  // ===== 마케터 카테고리 =====
  {
    id: 'keyword',
    name: '키워드 분석',
    shortName: '키워드',
    price: 1990,
    category: '마케터',
    status: 'live',
    popular: true,
    paths: ['/marketing/keyword-rank', '/marketing/keyword-score', '/marketing/place'],
    icon: 'Search',
    desc: '네이버 플레이스 순위·검색량·경쟁강도까지 한 번에.',
    bullets: [
      '플레이스 순위 일일 추적',
      '키워드별 검색량·경쟁강도',
      '내 업체 진단 점수',
      '상승·하락 키워드 자동 리포트',
    ],
  },
  {
    id: 'blog-ai',
    name: 'AI 블로그 포스팅',
    shortName: '블로그 AI',
    price: 1490,
    category: '마케터',
    status: 'live',
    paths: ['/marketing/blog-post'],
    icon: 'PenLine',
    desc: '업체 정보 입력하면 네이버 SEO 최적화 블로그 초안 자동 생성.',
    bullets: [
      '업체 정보 기반 초안 생성',
      '네이버 SEO 구조 최적화',
      '키워드 자동 삽입',
      '하루 여러 건 배치 생성',
    ],
  },
  {
    id: 'card-news',
    name: '인스타 카드뉴스 제작',
    shortName: '카드뉴스',
    price: 1490,
    category: '마케터',
    status: 'beta',
    paths: [],
    icon: 'Layers',
    desc: '주제만 던지면 인스타 캐러셀 10장이 AI로 완성 · PNG 저장.',
    bullets: [
      '인스타 1080×1350 캐러셀 템플릿',
      'Claude AI 슬라이드 카피 자동 생성',
      '커버·본문·CTA 구조 자동 구성',
      'PNG 일괄 다운로드 (저장/공유/팔로우 유도)',
    ],
    badge: 'NEW',
  },
  {
    id: 'blog-tracking',
    name: '블로그 순위 추적',
    shortName: '블로그 순위',
    price: 1490,
    category: '마케터',
    status: 'live',
    paths: [],
    icon: 'TrendingUp',
    desc: '내 블로그 글이 스마트블록·블로그탭·인기글 어디 몇 위에 떴는지 일 1회 자동 추적.',
    bullets: [
      '스마트블록·블로그탭·인기글 3구간 순위',
      '일 1회 자동 크롤링',
      '진입/이탈 순간 카톡 알림',
      '키워드별 히스토리 그래프',
    ],
  },
  {
    id: 'competitor',
    name: '경쟁사 분석',
    shortName: '경쟁사',
    price: 1990,
    category: '마케터',
    status: 'coming-soon',
    paths: ['/marketing/competitor'],
    icon: 'TrendingUp',
    desc: '근처 경쟁 업체 리뷰·순위·광고 활동 실시간 모니터링.',
    bullets: [
      '경쟁사 자동 추적 (최대 5개)',
      '리뷰 증가 추이',
      '플레이스 순위 변동',
      '광고 집행 감지 알림',
    ],
    badge: '2026.Q3',
  },
  {
    id: 'report',
    name: '마케팅 성과 리포트',
    shortName: '성과 리포트',
    price: 990,
    category: '마케터',
    status: 'beta',
    paths: ['/dashboard'],
    icon: 'BarChart3',
    desc: '모든 모듈 활동을 한 장 PDF 리포트로 자동 생성.',
    bullets: [
      '월간 성과 PDF 자동 발송',
      '리뷰·순위·매출 통합 뷰',
      '전월 대비 개선률',
      '다운로드·공유 링크',
    ],
    badge: 'Beta',
  },

  // ===== 공통 카테고리 =====
  {
    id: 'crm',
    name: 'CRM 고객관리',
    shortName: 'CRM',
    price: 1290,
    category: '공통',
    status: 'live',
    popular: true,
    paths: ['/customers', '/crm'],
    icon: 'UserCheck',
    desc: '고객 방문·구매·리뷰 이력을 한 곳에서 추적.',
    bullets: [
      '고객 프로필 자동 통합',
      '방문·구매 히스토리',
      'VIP 자동 분류',
      '세그먼트별 마케팅',
    ],
  },
  {
    id: 'ai-chat',
    name: 'AI 비서 채팅',
    shortName: 'AI 비서',
    price: 990,
    category: '공통',
    status: 'coming-soon',
    paths: ['/ai-chat'],
    icon: 'Bot',
    desc: '내 업체 데이터를 학습한 24시간 마케팅 상담사.',
    bullets: [
      '내 업체 전용 AI 비서',
      '실시간 마케팅 조언',
      '데이터 기반 답변',
      '채팅 이력 저장',
    ],
    badge: '2026.Q4',
  },
  {
    id: 'sns-manage',
    name: 'SNS 자동 포스팅',
    shortName: 'SNS 자동',
    price: 1490,
    category: '공통',
    status: 'beta',
    paths: ['/marketing/reels'],
    icon: 'Share2',
    desc: '릴스·블로그·인스타그램에 한 번에 자동 발행.',
    bullets: [
      '릴스 대본 AI 생성',
      '인스타그램 자동 업로드',
      '해시태그 자동 추천',
      '발행 스케줄 관리',
    ],
    badge: 'Beta',
  },
  {
    id: 'platform-hub',
    name: '플랫폼 통합 관리',
    shortName: '플랫폼 허브',
    price: 990,
    category: '공통',
    status: 'beta',
    paths: [],
    icon: 'Zap',
    desc: '네이버·배민·요기요·쿠팡이츠 4곳을 한 계정으로 연결해 리뷰·공지 대리 게시.',
    bullets: [
      '4대 플랫폼 자격증명 AES-256 암호화',
      '리뷰 답글 대리 게시',
      '공지·이벤트 일괄 업로드',
      '동의 이력·작업 로그 감사 추적',
    ],
    badge: 'NEW',
  },
] as const

/**
 * 사이드바 경로 → 필요 모듈 ID 매핑 (역방향 인덱스)
 * middleware / GatedRoute 에서 O(1) 조회용.
 *
 * ⚠️ 경로는 prefix 매칭. 더 구체적인 경로를 먼저 배치.
 */
export const SIDEBAR_MODULE_MAP: Record<string, ModuleId | null> = {
  // 공개/공통 페이지 (모듈 불필요)
  '/dashboard': null,          // 대시보드는 모두 접근 (단, 성과 리포트 탭은 report 모듈 필요)
  '/settings': null,           // 설정 페이지
  '/inquiry': null,            // 문의 페이지
  '/my': null,                 // 마이페이지
  '/my/subscription': null,    // 구독 관리
  '/reservations': null,       // 예약 (기본 제공)

  // 리뷰 관리 (ai-review 모듈)
  '/review-admin': 'ai-review',
  '/reviews': 'ai-review',

  // QR 스탬프
  '/qr-admin': 'qr-stamp',

  // 키워드 분석
  '/marketing/keyword-rank': 'keyword',
  '/marketing/keyword-score': 'keyword',
  '/marketing/place': 'keyword',

  // 블로그 AI
  '/marketing/blog-post': 'blog-ai',

  // SNS 자동 포스팅
  '/marketing/reels': 'sns-manage',

  // CRM
  '/customers': 'crm',
  '/crm': 'crm',

  // 경쟁사
  '/marketing/competitor': 'competitor',

  // 예정 모듈 경로 (아직 라우트 없음)
  '/alimtalk': 'alimtalk',
  '/settlement': 'accounting',
  '/local-synergy': 'local-synergy',
  '/ai-chat': 'ai-chat',
}

// ========= 헬퍼 함수 =========

/** ID 로 모듈 조회 */
export function getModule(id: ModuleId): Module | undefined {
  return MODULES.find(m => m.id === id)
}

/** 경로 → 필요 모듈 ID (없으면 null = 공개 페이지) */
export function getRequiredModuleForPath(pathname: string): ModuleId | null {
  // 1) 정확히 일치
  if (pathname in SIDEBAR_MODULE_MAP) {
    return SIDEBAR_MODULE_MAP[pathname]
  }
  // 2) prefix 매칭 (가장 긴 것 우선)
  const matches = Object.keys(SIDEBAR_MODULE_MAP)
    .filter(prefix => pathname.startsWith(prefix + '/'))
    .sort((a, b) => b.length - a.length)
  if (matches.length > 0) {
    return SIDEBAR_MODULE_MAP[matches[0]]
  }
  return null
}

/** 번들 할인 계산: 3+ 10%, 5+ 15%, 8+ 20% */
export function calculateBundleDiscount(count: number): number {
  if (count >= 8) return 0.2
  if (count >= 5) return 0.15
  if (count >= 3) return 0.1
  return 0
}

/** 여러 모듈 총 월 요금 (번들 할인 적용) */
export function calculateMonthlyTotal(moduleIds: ModuleId[]): {
  subtotal: number
  discount: number
  total: number
  discountRate: number
} {
  const modules = moduleIds
    .map(id => getModule(id))
    .filter((m): m is Module => m !== undefined)
  const subtotal = modules.reduce((sum, m) => sum + m.price, 0)
  const discountRate = calculateBundleDiscount(modules.length)
  const discount = Math.round(subtotal * discountRate)
  return {
    subtotal,
    discount,
    total: subtotal - discount,
    discountRate,
  }
}

/** 카테고리별 필터 */
export function getModulesByCategory(category: ModuleCategory): Module[] {
  return MODULES.filter(m => m.category === category)
}

/** 라이브 상태 모듈만 (결제 가능한 것) */
export function getLiveModules(): Module[] {
  return MODULES.filter(m => m.status === 'live' || m.status === 'beta')
}

/** 페르소나별 추천 번들 */
export const PERSONA_BUNDLES = {
  'owner-solo': {
    name: '1인 자영업자',
    desc: '혼자 운영하는 소규모 매장',
    modules: ['ai-review', 'qr-stamp', 'crm'] as ModuleId[],
  },
  'owner-team': {
    name: '팀 운영 사장님',
    desc: '직원 2~10명 규모 매장',
    modules: ['ai-review', 'qr-stamp', 'crm', 'keyword', 'report'] as ModuleId[],
  },
  'marketer': {
    name: '마케터·대행사',
    desc: '여러 업체 관리하는 마케터',
    modules: ['keyword', 'blog-ai', 'competitor', 'report', 'sns-manage'] as ModuleId[],
  },
  'sales': {
    name: '프랜차이즈·영업',
    desc: '다점포 브랜드',
    modules: ['ai-review', 'qr-stamp', 'crm', 'keyword', 'report', 'competitor'] as ModuleId[],
  },
} as const

export type PersonaId = keyof typeof PERSONA_BUNDLES
