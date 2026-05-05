'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { CheckCircle2, Clock, Wrench, Zap, Wrench as FixIcon, Bell, FlaskConical } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import PageHeader from '../components/PageHeader'
import Footer from '../components/Footer'

// ── 하드코딩 폴백 (DB 빈 경우 또는 로드 전)
const FALLBACK_UPDATES: UpdateGroup[] = [
  {
    date: '2026년 5월',
    items: [
      {
        category: 'feature',
        title: '정산·매출 캘린더',
        desc: '월간 매출을 캘린더 형태로 한눈에 — 카드/현금/배달 자동 분리 + 요일별 평균 매출 분석. 홈택스 세금계산서 / 미수금 / 급여 자동 계산 추가 예정.',
      },
      {
        category: 'feature',
        title: '예약·일정 관리',
        desc: '단체 예약 / 행사 / 휴무일을 통합 캘린더로 관리. 예약 추가·수정·취소 + 다가오는 예약 한눈에. 네이버 / 카카오 예약 자동 연동 곧 추가.',
      },
      {
        category: 'feature',
        title: '매장 이벤트·프로모션 매니저',
        desc: '오픈 / 시즌 / 단골 / 타임세일 / 협업 이벤트를 통합 관리. 시작·종료 일정 + 자동 종료 알림 + 카드뉴스·스레드·유튜브 자동 발행 연동 (예정).',
      },
      {
        category: 'feature',
        title: '인스타그램 피드 자동 발행',
        desc: '매장 사진 업로드 → AI 캡션 + 해시태그 자동 생성 + 즉시 / 예약 발행. 톤 4종 (편안 / 감성 / 에너지 / 전문) 지원.',
      },
      {
        category: 'feature',
        title: '답글 발행 통계 페이지',
        desc: '플랫폼별 답변률·자동 발행 성공률·평균 소요 시간·실패 원인 (30일 정책 / 쿠키 만료 / Akamai 차단 등) 을 한 화면에서 분석합니다.',
      },
      {
        category: 'feature',
        title: 'AI 답글 톤 11종 (사장님 맞춤 포함)',
        desc: '친근·전문·유머·심플·감성·MZ·공식·감사·사과·미식 10종 기본 + 사장님이 직접 정의하는 맞춤 톤까지 총 11종을 지원합니다. 부정 리뷰엔 사과 톤, 음식점은 미식 톤처럼 상황별로 골라쓸 수 있습니다.',
      },
      {
        category: 'feature',
        title: '요기요 30일 정책 차단 + 다중 매장 자동 감지',
        desc: '요기요도 배민처럼 30일 지난 리뷰는 답글 발행을 사전에 차단하여 실패를 미리 방지합니다. 다중 매장 사장님은 매장 ID가 자동 감지·저장됩니다.',
      },
      {
        category: 'feature',
        title: '카카오맵 답글 발행 개선',
        desc: '리뷰 카드를 다단계 fallback (data 속성 → 작성자/본문 매칭) 으로 찾고, 답글 등록 후 노출 검증과 진단 덤프를 자동 수행합니다.',
      },
      {
        category: 'feature',
        title: '스레드(Threads) 자동 발행',
        desc: 'Meta Threads에 글을 즉시 발행하거나 예약 발행할 수 있습니다. 이미지 드래그앤드롭, 답글 체인(최대 6개), 해시태그 자동 연동, 카드뉴스 연동을 지원합니다.',
      },
      {
        category: 'feature',
        title: '유튜브 커뮤니티 자동 업로드',
        desc: '유튜브 채널 커뮤니티 탭에 글을 자동으로 올리고, 첫 번째 댓글까지 달고 고정해 드립니다.',
      },
      {
        category: 'feature',
        title: '실시간 리뷰 알림 시스템',
        desc: '15분마다 자동 수집 → 별점 1-2점 부정 리뷰는 우선 알림. 웹푸시와 카카오톡 두 채널로 즉시 받아 빠르게 대응할 수 있습니다.',
      },
      {
        category: 'feature',
        title: '결제 키 서버 토큰화',
        desc: '결제 카드 정보를 로컬에 저장하지 않고 서버 billing_methods 테이블에 토큰화해 보관합니다. 토스 시크릿 키 환경변수만 사용하여 보안을 강화했습니다.',
      },
      {
        category: 'feature',
        title: '쿠팡이츠 리뷰 관리',
        desc: '쿠팡이츠 리뷰도 네이버·배민처럼 AI가 답글을 자동으로 만들어 드립니다.',
      },
      {
        category: 'feature',
        title: '업데이트 내역 페이지',
        desc: '새로 추가된 기능과 앞으로 나올 기능을 한눈에 볼 수 있는 이 페이지가 생겼습니다.',
      },
    ],
  },
  {
    date: '2026년 4월',
    items: [
      { category: 'feature', title: '카드뉴스 자동 제작', desc: '인스타그램용 카드뉴스를 AI가 자동으로 만들어 드립니다.' },
      { category: 'feature', title: '릴스·숏폼 콘텐츠 제작', desc: '틱톡, 유튜브 쇼츠, 인스타 릴스에 올릴 짧은 영상 대본을 AI가 만들어 드립니다.' },
      { category: 'feature', title: '지역 커뮤니티', desc: '같은 지역 사장님들끼리 정보를 나누고 소통할 수 있는 공간입니다.' },
      { category: 'feature', title: 'QR 리뷰 자동화', desc: 'QR 스캔 → AI 리뷰 생성 → 네이버·구글 원터치 등록.' },
      { category: 'feature', title: '블로그 순위 추적', desc: '내 블로그 글이 네이버에서 몇 위에 뜨는지 주기적으로 확인합니다.' },
      { category: 'feature', title: '플레이스 실시간 순위 확인', desc: '네이버 플레이스 검색 결과 순위를 실시간으로 알 수 있습니다.' },
    ],
  },
  {
    date: '2026년 3월',
    items: [
      { category: 'feature', title: '리뷰 통합 관리', desc: '네이버·구글·카카오·배민·요기요 리뷰를 한 곳에서 관리하고 AI 답글을 자동 생성합니다.' },
      { category: 'feature', title: '블로그 글 자동 작성', desc: '가게 정보를 입력하면 네이버 블로그 글을 AI가 대신 써줍니다.' },
      { category: 'feature', title: '키워드 조회·분석', desc: '검색량·경쟁도·트렌드를 한눈에 확인합니다.' },
      { category: 'feature', title: '고객 관리(CRM)', desc: '단골·신규·VIP 손님을 구분해서 관리하고, 단체 메시지를 한 번에 보냅니다.' },
      { category: 'feature', title: '대시보드', desc: '리뷰·키워드·활동 현황을 한 화면에서 한눈에 봅니다.' },
    ],
  },
]

const UPCOMING = [
  { title: '카카오맵 매장관리 연동', desc: '카카오 비즈니스 (place-mall.kakao.com) 사장님 권한과 연동해 카카오맵 답글을 완전 자동화합니다.' },
  { title: '정산·급여 자동 계산', desc: '직원 근태를 기록하면 급여를 자동 계산하고, 매출을 캘린더로 볼 수 있습니다.' },
  { title: '세금계산서 원클릭 발행', desc: '홈택스 연동으로 세금계산서를 원클릭으로 발행할 수 있습니다.' },
  { title: '정부지원금 알림', desc: '소상공인이 받을 수 있는 지원금·보조금 정보를 자동으로 알려드립니다.' },
  { title: '인근 매장 협업 쿠폰', desc: '근처 가게끼리 서로 쿠폰을 교환해서 손님을 함께 늘릴 수 있습니다.' },
  { title: '노쇼 방지 타임세일', desc: '예약 취소가 생기면 근처 손님에게 즉시 할인 알림을 보내 빈자리를 채울 수 있습니다.' },
]

type UpdateItem = { category: string; title: string; desc: string }
type UpdateGroup = { date: string; items: UpdateItem[] }
type ApiUpdate = {
  id: string; title: string; summary: string; category: string
  released_at: string; highlight: string | null; link_url: string | null
}

const CATEGORY_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  feature: { label: 'NEW',    bg: 'bg-[#EFF6FF]', text: 'text-[#3182F6]' },
  fix:     { label: 'FIX',    bg: 'bg-[#ECFDF5]', text: 'text-[#059669]' },
  notice:  { label: '공지',   bg: 'bg-[#FFF7ED]', text: 'text-[#EA580C]' },
  beta:    { label: 'BETA',   bg: 'bg-[#F5F3FF]', text: 'text-[#7C3AED]' },
}

function CategoryBadge({ category }: { category: string }) {
  const cfg = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.feature
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-black ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  )
}

function groupByMonth(updates: ApiUpdate[]): UpdateGroup[] {
  const map = new Map<string, UpdateItem[]>()
  for (const u of updates) {
    const d = new Date(u.released_at)
    const key = `${d.getFullYear()}년 ${d.getMonth() + 1}월`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push({ category: u.category, title: u.title, desc: u.summary })
  }
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }))
}

export default function UpdatesPage() {
  const [groups, setGroups] = useState<UpdateGroup[]>(FALLBACK_UPDATES)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/updates')
      .then(r => r.json())
      .then((data: { updates?: ApiUpdate[] }) => {
        if (data.updates && data.updates.length > 0) {
          setGroups(groupByMonth(data.updates))
        }
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Sidebar />

      <div className="md:ml-[220px] flex flex-col min-h-screen">
        <PageHeader
          icon={<Clock size={28} className="text-white" strokeWidth={2.5} />}
          title="업데이트 내역"
          subtitle="새로 추가된 기능과 앞으로 나올 기능을 소개합니다"
        />

        <main className="flex-1 px-4 md:px-6 py-6 max-w-4xl mx-auto w-full space-y-8">

          {/* 준비 중인 기능 */}
          <section>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center flex-shrink-0">
                <Wrench size={14} className="text-white" strokeWidth={2.5} />
              </div>
              <h2 className="text-base font-black text-[#191F28]">곧 나올 기능</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {UPCOMING.map((item, i) => (
                <div key={i} className="bg-white rounded-2xl border border-[#E5E8EB] shadow-sm p-4 flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 mt-[7px]" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#191F28]">{item.title}</p>
                    <p className="text-xs text-[#8B95A1] mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 업데이트 기록 */}
          <section>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#3182F6] to-[#2563EB] flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={14} className="text-white" strokeWidth={2.5} />
              </div>
              <h2 className="text-base font-black text-[#191F28]">추가된 기능</h2>
              {!loaded && (
                <div className="w-4 h-4 rounded-full border-2 border-[#3182F6] border-t-transparent animate-spin ml-1" />
              )}
            </div>

            <div className="space-y-6">
              {groups.map((group, gi) => (
                <div key={gi}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-black text-[#3182F6] bg-[#EFF6FF] px-3 py-1 rounded-full flex-shrink-0">
                      {group.date}
                    </span>
                    <div className="flex-1 h-px bg-[#E5E8EB]" />
                  </div>
                  <div className="space-y-2.5">
                    {group.items.map((item, ii) => (
                      <div key={ii} className="bg-white rounded-2xl border border-[#E5E8EB] shadow-sm p-4 flex gap-3">
                        <CheckCircle2 size={15} className="text-[#059669] flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <p className="text-sm font-bold text-[#191F28]">{item.title}</p>
                            <CategoryBadge category={item.category} />
                          </div>
                          <p className="text-xs text-[#8B95A1] leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

        </main>

        <Footer />
      </div>
    </div>
  )
}
