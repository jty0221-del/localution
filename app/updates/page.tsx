// app/updates/page.tsx
// ============================================================
// 업데이트 내역 — 타임라인 공개 페이지
//   · 비로그인도 접근 가능
//   · 서버 컴포넌트 (ISR 60초)
//   · released_at 기준 월 단위 그룹핑
//   · 18차-5 핫픽스: 하단 CTA 로그인 여부에 따라 분기
//       - 로그인 상태 → "← 대시보드로" (/dashboard)
//       - 비로그인   → "← 홈으로"     (/)
// ============================================================
import { Metadata } from 'next'
import Link from 'next/link'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const revalidate = 60

export const metadata: Metadata = {
  title: '업데이트 내역 | 로컬루션',
  description: '자영업자·소상공인을 위한 로컬루션의 새로운 기능과 개선사항을 확인하세요.',
}

type UpdateRow = {
  id: string
  title: string
  summary: string
  highlight: string | null
  category: 'feature' | 'fix' | 'notice' | 'beta'
  released_at: string // YYYY-MM-DD
  cover_url: string | null
  link_url: string | null
}

const CATEGORY_LABEL: Record<UpdateRow['category'], { label: string; cls: string }> = {
  feature: { label: 'NEW',    cls: 'bg-blue-100 text-blue-700' },
  fix:     { label: 'FIX',    cls: 'bg-amber-100 text-amber-700' },
  notice:  { label: '공지',   cls: 'bg-slate-100 text-slate-700' },
  beta:    { label: 'BETA',   cls: 'bg-purple-100 text-purple-700' },
}

function formatYearMonth(dateStr: string) {
  // "2026-04-20" → "2026.04"
  return dateStr.slice(0, 7).replace('-', '.')
}

async function getBaseUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

// v1.6m: 완료 항목 수동 큐레이션 (DB updates 비어있어도 표시)
const STATIC_UPDATES: UpdateRow[] = [
  {
    id: 'baemin-v1',
    title: '배민 자동화 시스템 v1 완성',
    summary: '아이디 + 비밀번호 입력만으로 자동 연동\n· 매일 오후 1시 자동 리뷰 수집 (cron)\n· 30일치 리뷰 자동 fetch (다중 매장 지원)\n· 30일 정책 자동 인식 (배민 본사 제한)\n· 새 리뷰 들어오면 Web Push + 카카오톡 알림 (별점 1-2점 우선)\n· AI 답글 자동 생성 + 발행\n· Akamai WAF 우회 (in-browser fetch)',
    highlight: '사장님은 ID/PW만 입력하면 끝 — 25+ 디버그 후 안정화',
    category: 'feature',
    released_at: '2026-05-05',
    cover_url: null, link_url: null,
  },
  {
    id: 'coupang-v76',
    title: '쿠팡이츠 자동화 시스템 v76 완성',
    summary: '5시간 25차 fix → 0% → 100% 작동\n· Vercel save-login (Akamai 통과)\n· APIRequestContext post_reply (12초 발행)\n· 트래픽 95% 절감 (cron 1일 1회 + 14일 + 리소스 차단)\n· 6개월치 리뷰 자동 수집',
    highlight: '쿠팡이츠 답글 자동 발행 12초 작동 검증',
    category: 'feature',
    released_at: '2026-05-04',
    cover_url: null, link_url: null,
  },
  {
    id: 'naver-v37',
    title: '네이버 플레이스 답글 자동등록 v37',
    summary: '14 iteration 완성 — 외부/내부 placeId 분리\n· 매 15분 자동 fetch (cron)\n· 별점 1-2점 우선순위 알림\n· bookingBusinessId Int 매핑',
    highlight: '네이버 답글 자동 발행 정상 작동',
    category: 'feature',
    released_at: '2026-05-03',
    cover_url: null, link_url: null,
  },
  {
    id: 'dashboard-78',
    title: '메인 대시보드 전 플랫폼 통합 표시',
    summary: '· 상단 미니 리뷰 (네이버/쿠팡/배민 각 매장 최신 2건)\n· 하단 "최근 리뷰" 전 플랫폼 통합 정렬\n· 별점 / 미답변 / 감정 분석 자동 집계\n· 하드코딩 데모 데이터 제거 → 빈 상태 + 연동 CTA',
    highlight: 'connected race 해소 — 즉시 표시',
    category: 'feature',
    released_at: '2026-05-04',
    cover_url: null, link_url: null,
  },
  {
    id: 'notification-v1',
    title: '실시간 알림 시스템 v1',
    summary: '· Web Push (브라우저 알림)\n· 카카오톡 알림톡 (선택 가입 사장님)\n· 별점 1-2점 부정 리뷰 우선순위 큐\n· 24시간 중복 방지 (notification_log)\n· 매 fetch 사이클마다 자동 트리거',
    highlight: null,
    category: 'feature',
    released_at: '2026-05-03',
    cover_url: null, link_url: null,
  },
  {
    id: 'community-v1',
    title: '지역 커뮤니티 페이지',
    summary: '· 전국 / 지역별 게시판 (서울/경기/인천/부산/대구 등)\n· 업종별 분류 (음식점, 카페, 미용실 등)\n· 포인트 시스템 + 레벨 표시',
    highlight: null,
    category: 'feature',
    released_at: '2026-04-28',
    cover_url: null, link_url: null,
  },
  {
    id: 'qr-review',
    title: 'QR 리뷰 자동화',
    summary: '· QR 스캔 → 고객 맞춤 리뷰 4단계 (정보→사진→AI생성→플랫폼등록)\n· 네이버/구글/카카오 원클릭 등록\n· 사장님 reward 텍스트 자동 표시',
    highlight: null,
    category: 'feature',
    released_at: '2026-04-20',
    cover_url: null, link_url: null,
  },
  {
    id: 'crm-v1',
    title: 'CRM 고객 관리',
    summary: '· 고객 태그 (VIP / 단골 / 신규 / 블랙리스트)\n· 단체 메시지 발송 ({고객명} 치환)\n· 예약 발송 스케줄러\n· 블랙컨슈머 방어망 (지역 사장님 공유)',
    highlight: null,
    category: 'feature',
    released_at: '2026-04-15',
    cover_url: null, link_url: null,
  },
  {
    id: 'billing-tokenization',
    title: '결제 키 서버 토큰화',
    summary: '· billing_methods 테이블 분리\n· localStorage 결제 키 완전 제거\n· 토스 시크릿 키 환경변수만 사용\n· /api/billing/me 엔드포인트',
    highlight: '보안 강화 (PCI-DSS 준수)',
    category: 'fix',
    released_at: '2026-05-03',
    cover_url: null, link_url: null,
  },
  {
    id: 'marketing-keyword',
    title: '키워드 조회 / 분석 도구',
    summary: '· 네이버 검색량 + 트렌드\n· 콘텐츠 포화도 분석\n· 블로그 글 작성 도우미\n· 블로그 지수 조회',
    highlight: '소상공인 마케팅 인사이트',
    category: 'feature',
    released_at: '2026-04-25',
    cover_url: null, link_url: null,
  },
]

async function fetchUpdates(): Promise<UpdateRow[]> {
  const base = await getBaseUrl()
  try {
    const res = await fetch(`${base}/api/updates`, { next: { revalidate: 60 } })
    if (!res.ok) return STATIC_UPDATES
    const json = await res.json()
    const dbUpdates: UpdateRow[] = Array.isArray(json.updates) ? json.updates : []
    // DB + 정적 큐레이션 합본 (DB 비어있어도 정적 콘텐츠 표시)
    if (dbUpdates.length === 0) return STATIC_UPDATES
    // 둘 다 있으면 released_at 기준 합쳐서 정렬 (중복 id 제거)
    const ids = new Set(dbUpdates.map(u => u.id))
    const merged = [...dbUpdates, ...STATIC_UPDATES.filter(u => !ids.has(u.id))]
    merged.sort((a, b) => b.released_at.localeCompare(a.released_at))
    return merged
  } catch {
    return STATIC_UPDATES
  }
}

// ------------------------------------------------------------
// 로그인 여부 감지 (쿠키 존재 여부만 확인, 토큰 검증은 생략)
//   · localution_user (OAuth)  — 제품 기본 로그인 쿠키
//   · sb-*-auth-token          — Supabase 세션 폴백
// ------------------------------------------------------------
async function isLoggedIn(): Promise<boolean> {
  try {
    const store = await cookies()
    if (store.get('localution_user')?.value) return true
    const sb = store.getAll().find(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'))
    return !!sb?.value
  } catch {
    return false
  }
}

export default async function UpdatesPage() {
  const [updates, loggedIn] = await Promise.all([fetchUpdates(), isLoggedIn()])

  const ctaHref  = loggedIn ? '/dashboard' : '/'
  const ctaLabel = loggedIn ? '← 대시보드로' : '← 홈으로'

  return (
    <main className="min-h-screen bg-[#F8F9FB] pb-24">
      {/* ---- 상단 헤더 ---- */}
      <section className="px-5 pt-16 md:pt-24 pb-10 md:pb-14">
        <div className="max-w-3xl mx-auto text-center">
          <div className="mx-auto w-10 h-10 rounded-full bg-blue-500/10 text-blue-600 grid place-items-center mb-4">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 8a6 6 0 1 0-12 0c0 7 12 7 12 0z"/>
              <path d="M8 8a6 6 0 1 0 12 0c0 7-12 7-12 0z"/>
            </svg>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            <span className="text-blue-600">원클릭</span>으로 모든 것을{' '}
            <span className="text-blue-600">자동화</span>하세요
          </h1>
          <p className="mt-3 text-sm md:text-base text-slate-500">
            로컬루션의 새로운 기능과 개선 내역을 한눈에 확인하세요.
          </p>
        </div>
      </section>

      {/* ---- 타임라인 카드 ---- */}
      <section className="px-5">
        <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-sm ring-1 ring-slate-100 px-5 md:px-10 py-8 md:py-12">
          <h2 className="text-center text-base md:text-lg font-semibold text-slate-900 mb-8 md:mb-10">
            업데이트 내역
          </h2>

          {updates.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">
              등록된 업데이트 내역이 없습니다.
            </div>
          ) : (
            <ol className="relative pl-6 md:pl-8">
              {/* 세로 연결선 */}
              <span
                aria-hidden
                className="absolute left-[7px] md:left-[9px] top-3 bottom-3 w-px bg-gradient-to-b from-blue-200 via-slate-200 to-transparent"
              />

              {updates.map((u) => {
                const cat = CATEGORY_LABEL[u.category] ?? CATEGORY_LABEL.feature
                return (
                  <li key={u.id} className="relative mb-10 last:mb-0">
                    {/* 마커 */}
                    <span
                      aria-hidden
                      className="absolute -left-6 md:-left-8 top-1.5 w-4 h-4 rounded-full bg-blue-500 ring-4 ring-blue-100"
                    />

                    {/* 날짜 */}
                    <div className="text-xs md:text-sm text-slate-500 text-center mb-2">
                      {formatYearMonth(u.released_at)}
                    </div>

                    {/* 카드 */}
                    <div className="rounded-2xl bg-slate-50 border border-slate-100 px-5 py-5 md:px-6 md:py-6">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${cat.cls}`}>
                          {cat.label}
                        </span>
                        {u.link_url ? (
                          <a
                            href={u.link_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm md:text-base font-semibold text-blue-700 hover:underline"
                          >
                            {u.title}
                          </a>
                        ) : (
                          <h3 className="text-sm md:text-base font-semibold text-blue-700 text-center">
                            {u.title}
                          </h3>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 text-center whitespace-pre-line leading-relaxed">
                        {u.summary}
                      </p>
                      {u.highlight ? (
                        <p className="mt-2 text-sm text-blue-600 text-center font-medium whitespace-pre-line">
                          {u.highlight}
                        </p>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ol>
          )}

          <div className="mt-10 md:mt-12 text-center">
            <Link
              href={ctaHref}
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition"
            >
              {ctaLabel}
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
