'use client'

// 🔧 force-dynamic 제거 (2026-04-19) — 공개 랜딩이라 정적 shell 생성 허용 (LCP 개선)
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Footer from './components/Footer'
import TopNav from './components/TopNav'
import {
  MessageCircle, QrCode, Users, FileText, Sparkles,
  Coffee, UtensilsCrossed, Dumbbell,
  Flame, Heart, PenLine, Wine, UserPlus, Camera, Star,
  ArrowRight, MapPin, Video, Layers, Zap, TrendingUp,
} from 'lucide-react'

const FEATURES = [
  {
    Icon: MapPin,
    title: '네이버 플레이스 SEO',
    desc: '내 업체 노출 순위·키워드·진단을 실시간으로. 경쟁사 대비 위치까지 한눈에.',
    color: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50',
    tags: ['순위 추적', '진단 점수', '개선 제안'],
    href: '/marketing/place',
    badge: 'HOT',
  },
  {
    Icon: PenLine,
    title: '네이버 블로그 포스팅',
    desc: '업종·키워드·페르소나만 넣으면 SEO 최적화 3,000자 포스팅이 자동 완성.',
    color: 'from-indigo-500 to-blue-600',
    bg: 'bg-indigo-50',
    tags: ['SEO 최적화', '체류시간', '사진 배치'],
    href: '/marketing/blog-post',
    badge: 'NEW',
  },
  {
    Icon: Video,
    title: '릴스·쇼츠 자동 기획',
    desc: 'AI가 트렌드·훅·장면별 촬영 지시서까지 원클릭으로 만들어줘요.',
    color: 'from-pink-500 to-rose-600',
    bg: 'bg-pink-50',
    tags: ['인스타 릴스', '유튜브 쇼츠', '촬영 대본'],
    href: '/marketing/reels',
    badge: 'NEW',
  },
  {
    Icon: MessageCircle,
    title: 'AI 리뷰 자동 답글',
    desc: '네이버·구글·배민 리뷰를 AI가 분석하고 맞춤 답글을 자동 생성해요. 하루 5분으로 100% 응답률.',
    color: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50',
    tags: ['네이버', '구글', '배민', '카카오'],
    href: '/service-intro',
  },
  {
    Icon: QrCode,
    title: 'QR 리뷰 자동화',
    desc: 'QR 코드 하나로 고객이 직접 AI 리뷰를 작성해요. 별점 5점 기본, 말투 6종, 사진 10장까지.',
    color: 'from-green-500 to-emerald-600',
    bg: 'bg-green-50',
    tags: ['QR 스캔', 'AI 생성', '네이버 연동'],
    href: '/review/demo',
    badge: '체험가능',
  },
  {
    Icon: Users,
    title: 'CRM 고객관리',
    desc: '방문 고객을 VIP·단골·신규로 자동 분류하고, 맞춤 메시지로 재방문을 유도해요.',
    color: 'from-purple-500 to-violet-600',
    bg: 'bg-purple-50',
    tags: ['자동 분류', '알림톡', '재방문 유도'],
    href: '/service-intro',
  },
  {
    Icon: Layers,
    title: '카드뉴스 자동 제작',
    desc: '주제만 던지면 인스타 캐러셀 10장이 AI로 완성. 스크롤 멈추는 훅·저장 유도·해시태그까지.',
    color: 'from-rose-500 to-orange-500',
    bg: 'bg-rose-50',
    tags: ['인스타 캐러셀', 'PNG 저장', 'Claude AI'],
    href: '/marketing/card-news',
    badge: 'NEW',
  },
  {
    Icon: Zap,
    title: '플랫폼 통합 관리',
    desc: '네이버·배민·요기요·쿠팡이츠 4곳 한 계정으로 연결. 리뷰·답글·순위를 한 화면에서.',
    color: 'from-indigo-500 to-purple-600',
    bg: 'bg-indigo-50',
    tags: ['4대 플랫폼', '대리 게시', 'AES-256'],
    href: '/my/platforms',
    badge: 'NEW',
  },
  {
    Icon: TrendingUp,
    title: '블로그 순위 추적',
    desc: '내 블로그 글이 스마트블록·블로그탭·인기글 어디에 몇 위로 떴는지 매일 자동 체크.',
    color: 'from-amber-500 to-yellow-500',
    bg: 'bg-amber-50',
    tags: ['일 1회 자동', '스마트블록', '카톡 알림'],
    href: '/marketing/blog-tracking',
  },
]

// ─────────────────────────────────────────────────────────────
// 데모 데이터 (실제 데이터 연결 전 예시용)
// /api/landing-stats 가 실제 값을 반환하면 자동 교체됨
// ─────────────────────────────────────────────────────────────
const STATS_DEMO = [
  { num: '400+', label: '베타 사장님' },
  { num: '5만+', label: 'AI 답글 누적' },
  { num: '+0.6점', label: '평균 별점 상승' },
  { num: '3배', label: '리뷰 수집 속도' },
]

const HERO_DEMO = {
  reviewsPerMonth: '+20개',
  reviewsPerMonthLabel: '월 평균 리뷰 증가',
  avgRating: '4.7점',
  avgRatingLabel: '평균 별점',
}

type Testimonial = {
  name: string
  store: string
  text: string
  rating: number
  iconKey: 'coffee' | 'food' | 'gym'
  color: string
}

const ICON_MAP = {
  coffee: Coffee,
  food: UtensilsCrossed,
  gym: Dumbbell,
} as const

const TESTIMONIALS_DEMO: Testimonial[] = [
  {
    name: '김○○ 사장님',
    store: '부천 카페 운영',
    text: '매일 리뷰 답글 다는 게 너무 힘들었는데, 로컬루션 쓰고 나서 5분도 안 걸려요. 별점도 4.2에서 4.8로 올라갔어요!',
    rating: 5,
    iconKey: 'coffee',
    color: '#8B5CF6',
  },
  {
    name: '이○○ 대표님',
    store: '서울 맛집 운영',
    text: '클라이언트 10곳 동시 관리하는데 로컬루션 없으면 못 살아요. 키워드 분석이랑 리뷰 관리가 한 곳에 있어서 너무 편해요.',
    rating: 5,
    iconKey: 'food',
    color: '#F59E0B',
  },
  {
    name: '박○○ 원장님',
    store: '일산 헬스장 운영',
    text: 'QR 리뷰 붙여놨더니 손님들이 알아서 리뷰 써줘요. 한 달에 리뷰 50개 이상 늘었어요.',
    rating: 5,
    iconKey: 'gym',
    color: '#10B981',
  },
]

// QR 톤 뱃지 (브랜드 아이콘으로 교체)
const QR_TONES = [
  { Icon: Flame,     label: 'Z세대' },
  { Icon: Heart,     label: '맘카페' },
  { Icon: PenLine,   label: '솔직담백' },
  { Icon: Wine,      label: '미식가' },
  { Icon: UserPlus,  label: '친구추천' },
  { Icon: Camera,    label: '인스타감성' },
]

export default function LandingPage() {
  // 루트 `/` 는 공개 랜딩 페이지 — 자동 리다이렉트 없음
  // 로그인 상태는 TopNav 가 쿠키 기반으로 '대시보드 바로가기' 로 표시

  // 실제 데이터 들어오기 전까지는 데모 값으로 노출. API 에서 null 이 아닌 값이 오면 자동 교체.
  const [stats, setStats] = useState(STATS_DEMO)
  const [hero, setHero] = useState(HERO_DEMO)
  const [testimonials, setTestimonials] = useState<Testimonial[]>(TESTIMONIALS_DEMO)
  const [isDemo, setIsDemo] = useState(true)
  // 25차-1: 쿠키 기반 로그인 여부 감지 → 하단 CTA 분기 (/updates 핸드오버 패턴 재사용)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    if (typeof document === 'undefined') return
    const c = document.cookie || ''
    const hasCookie = /(^|;\s*)(localution_user|sb-[^=]+-auth-token)=/i.test(c)
    setIsLoggedIn(hasCookie)
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch('/api/landing-stats')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled || !data) return
        let replaced = false
        if (Array.isArray(data.stats) && data.stats.length === 4) {
          setStats(data.stats)
          replaced = true
        }
        if (data.hero && typeof data.hero === 'object') {
          setHero({ ...HERO_DEMO, ...data.hero })
          replaced = true
        }
        if (Array.isArray(data.testimonials) && data.testimonials.length > 0) {
          setTestimonials(data.testimonials)
          replaced = true
        }
        if (replaced) setIsDemo(false)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen bg-white">

      {/* 23차-SEO: JSON-LD 구조화 데이터 – SoftwareApplication + Organization */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "SoftwareApplication",
                "@id": "https://www.localution.co.kr/#app",
                "name": "로컬루션",
                "url": "https://www.localution.co.kr",
                "applicationCategory": "BusinessApplication",
                "operatingSystem": "Web",
                "description": "네이버·구글·배민 리뷰 자동 답글, 블로그 포스팅, QR 리뷰 자동화, AI 매장 진단까지. 소상공인·자영업자를 위한 AI 마케팅 플랫폼.",
                "offers": {
                  "@type": "Offer",
                  "price": "990",
                  "priceCurrency": "KRW",
                  "description": "월 990원부터 시작하는 구독 플랜"
                },
                "publisher": {
                  "@type": "Organization",
                  "@id": "https://www.localution.co.kr/#org",
                  "name": "로컬루션",
                  "url": "https://www.localution.co.kr",
                  "logo": {
                    "@type": "ImageObject",
                    "url": "https://www.localution.co.kr/logo.png",
                    "width": 512,
                    "height": 512
                  }
                }
              },
              {
                "@type": "Organization",
                "@id": "https://www.localution.co.kr/#org",
                "name": "로컬루션",
                "url": "https://www.localution.co.kr",
                "description": "소상공인·자영업자 전용 AI 마케팅 플랫폼. 네이버·구글·배민 리뷰 관리, 블로그 SEO, QR 자동화, 플레이스 최적화.",
                "logo": {
                  "@type": "ImageObject",
                  "url": "https://www.localution.co.kr/logo.png"
                },
                "sameAs": [
                  "https://www.localution.co.kr"
                ]
              },
              {
                "@type": "WebSite",
                "@id": "https://www.localution.co.kr/#website",
                "url": "https://www.localution.co.kr",
                "name": "로컬루션",
                "description": "사장님 마케팅 플랫폼",
                "potentialAction": {
                  "@type": "SearchAction",
                  "target": "https://www.localution.co.kr/community?q={search_term_string}",
                  "query-input": "required name=search_term_string"
                }
              },
              {
                "@type": "FAQPage",
                "mainEntity": [
                  {
                    "@type": "Question",
                    "name": "로컬루션은 무엇인가요?",
                    "acceptedAnswer": {
                      "@type": "Answer",
                      "text": "로컬루션은 소상공인·자영업자를 위한 AI 마케팅 플랫폼입니다. 네이버·구글·배민 리뷰 자동 답글, 블로그 포스팅 자동화, QR 리뷰 수집, 플레이스 SEO 진단 등 12개 모듈을 월 990원부터 이용할 수 있습니다."
                    }
                  },
                  {
                    "@type": "Question",
                    "name": "바로 시작할 수 있나요?",
                    "acceptedAnswer": {
                      "@type": "Answer",
                      "text": "네, 구글 소셜 로그인 하나로 즉시 시작 가능합니다. 별도 설치 없이 웹 브라우저에서 모든 기능을 이용할 수 있습니다."
                    }
                  },
                  {
                    "@type": "Question",
                    "name": "네이버 플레이스 순위를 올릴 수 있나요?",
                    "acceptedAnswer": {
                      "@type": "Answer",
                      "text": "네이버 플레이스 SEO 진단 도구로 34항목 체크리스트를 점검하고, 블로그 포스팅 키워드 순위 추적까지 지원합니다."
                    }
                  }
                ]
              }
            ]
          })
        }}
      />

            <TopNav />

      {/* ── 히어로 ── */}
      <section className="pt-32 pb-20 px-4 bg-gradient-to-b from-[#EFF6FF] to-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
            필요한 것만 · 월 990원부터 · 언제든 해지
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-[#191F28] leading-tight mb-6">
            필요한 것만 골라쓰는<br />
            <span className="text-[#3182F6]">사장님 마케팅 플랫폼</span>
          </h1>
          <p className="text-lg md:text-xl text-[#4E5968] mb-10 max-w-2xl mx-auto leading-relaxed">
            리뷰·QR·블로그·플레이스·CRM — 12개 모듈 중<br className="hidden md:block" />
            내 매장에 필요한 것만 선택. 3개 묶으면 10% 할인.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/pricing"
              className="inline-flex items-center justify-center gap-2 bg-[#3182F6] text-white font-bold text-base px-8 py-4 rounded-2xl hover:bg-[#1B64DA] transition-all shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-0.5">
              내게 맞는 모듈 둘러보기
              <ArrowRight size={18} strokeWidth={2.5} />
            </Link>
            <Link href="/marketing/place"
              className="inline-flex items-center justify-center gap-2 bg-white text-[#191F28] font-semibold text-base px-8 py-4 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all hover:-translate-y-0.5">
              1분 무료 진단 체험
            </Link>
          </div>
          <p className="text-xs text-[#8B95A1] mt-4">회원가입 없이 진단 가능 · 신용카드 불필요 · 월 단위 결제</p>
        </div>
      </section>

      {/* ── 통계 ── */}
      <section className="py-12 px-4 bg-white border-y border-gray-100">
        <div className="max-w-4xl mx-auto">
          {isDemo && (
            <div className="text-center mb-6">
              <span className="inline-block text-[11px] font-semibold text-[#8B95A1] bg-[#F2F4F6] px-2.5 py-1 rounded-full">
                예시 · 실제 데이터 연동 예정
              </span>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s, i) => (
              <div key={`${s.label}-${i}`} className="text-center">
                <div className="text-3xl font-black text-[#3182F6] mb-1">{s.num}</div>
                <div className="text-sm text-[#8B95A1] font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 주요 기능 ── */}
      <section className="py-20 px-4 bg-[#F8FAFC]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black text-[#191F28] mb-4">
              필요한 기능만 골라쓰는 모듈 방식
            </h2>
            <p className="text-[#4E5968] text-base md:text-lg">
              월 990원부터 시작 · 3개 묶으면 10% · 5개 15% · 8개 20% 할인
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(f => (
              <Link key={f.title} href={f.href} className="relative bg-white rounded-2xl p-6 border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all group block">
                {f.badge && (
                  <span className={`absolute top-4 right-4 text-[10px] font-black tracking-wider px-2 py-0.5 rounded-full ${
                    f.badge === 'HOT' ? 'bg-red-100 text-red-600'
                    : f.badge === '체험가능' ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-blue-100 text-blue-600'
                  }`}>
                    {f.badge}
                  </span>
                )}
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform`}>
                  <f.Icon size={24} strokeWidth={2} className="text-white" />
                </div>
                <h3 className="text-lg font-bold text-[#191F28] mb-2 flex items-center gap-1.5">
                  {f.title}
                  <ArrowRight size={14} strokeWidth={2.5} className="text-[#8B95A1] group-hover:text-[#3182F6] group-hover:translate-x-0.5 transition-all" />
                </h3>
                <p className="text-sm text-[#4E5968] leading-relaxed mb-4">{f.desc}</p>
                <div className="flex flex-wrap gap-2">
                  {f.tags.map(tag => (
                    <span key={tag} className={`text-xs font-medium px-2.5 py-1 rounded-lg ${f.bg} text-gray-600`}>
                      {tag}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
          <p className="text-center text-xs text-[#8B95A1] mt-6">
            AI 정산·세금계산서·급여 관리는 곧 추가됩니다
          </p>
        </div>
      </section>

      {/* ── QR 리뷰 하이라이트 ── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-[#3182F6] to-[#1B64DA] rounded-3xl p-8 md:p-12 text-white">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <div className="inline-flex items-center gap-1.5 bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                  <Sparkles size={12} strokeWidth={2.5} />
                  신기능
                </div>
                <h2 className="text-2xl md:text-3xl font-black mb-4">
                  QR 코드 하나로<br />네이버 리뷰가 쌓인다
                </h2>
                <p className="text-blue-100 text-sm leading-relaxed mb-6">
                  손님이 QR을 스캔하면 AI가 맞춤 리뷰를 바로 생성해줘요.<br />
                  별점 5점 기본, 말투 6종 선택, 영수증 사진도 분석 가능해요.
                </p>
                <div className="flex flex-wrap gap-2 mb-8">
                  {QR_TONES.map(t => (
                    <span key={t.label} className="inline-flex items-center gap-1.5 text-xs bg-white/20 text-white px-3 py-1.5 rounded-full font-medium">
                      <t.Icon size={12} strokeWidth={2.5} />
                      {t.label}
                    </span>
                  ))}
                </div>
                <Link href="/review/demo"
                  className="inline-flex items-center gap-2 bg-white text-[#3182F6] font-bold text-sm px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors">
                  QR 리뷰 지금 체험하기
                  <ArrowRight size={16} strokeWidth={2.5} />
                </Link>
              </div>
              <div className="flex-shrink-0 bg-white/10 rounded-2xl p-6 text-center w-52">
                <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-3">
                  <QrCode size={36} strokeWidth={2} className="text-white" />
                </div>
                <div className="text-3xl font-black mb-1">{hero.reviewsPerMonth}</div>
                <div className="text-blue-200 text-xs">{hero.reviewsPerMonthLabel}</div>
                <div className="mt-4 pt-4 border-t border-white/20">
                  <div className="text-2xl font-black mb-1">{hero.avgRating}</div>
                  <div className="text-blue-200 text-xs">{hero.avgRatingLabel}</div>
                </div>
                {isDemo && (
                  <div className="mt-3 text-[10px] text-blue-200/80 font-medium">
                    예시 값
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 이런 분들이 씁니다 (업종 타겟) ── */}
      <section className="py-14 px-4 bg-white border-y border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-black text-[#191F28] mb-2">
              이런 사장님들이 쓰고 있어요
            </h2>
            <p className="text-[#8B95A1] text-sm">
              1인 운영부터 체인점까지 · 업종 상관없이 네이버·구글·배민이 핵심이라면 전부
            </p>
          </div>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
            {[
              { Icon: Coffee, label: '카페' },
              { Icon: UtensilsCrossed, label: '음식점' },
              { Icon: Dumbbell, label: '헬스장' },
              { Icon: Heart, label: '병원' },
              { Icon: Sparkles, label: '네일샵' },
              { Icon: Camera, label: '뷰티샵' },
              { Icon: PenLine, label: '학원' },
              { Icon: Wine, label: '술집·바' },
            ].map(({ Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-[#F8FAFC] transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] flex items-center justify-center">
                  <Icon size={22} strokeWidth={2} className="text-[#3182F6]" />
                </div>
                <span className="text-xs font-semibold text-[#4E5968]">{label}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-[11px] text-[#8B95A1] mt-6">
            이외에도 네이버 플레이스·블로그·리뷰 관리가 필요한 모든 자영업자 · 소상공인 · 마케터 · 프리랜서에게 맞춰져 있어요
          </p>
        </div>
      </section>

      {/* ── 사용자 후기 ── */}
      <section className="py-20 px-4 bg-[#F8FAFC]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-[#191F28] mb-3">
              {isDemo ? '사용 사례 예시' : '사장님들의 실제 후기'}
            </h2>
            <p className="text-[#8B95A1] text-sm">
              {isDemo
                ? '실제 사용 후기 수집 중 · 아래는 예시 콘텐츠입니다'
                : '로컬루션을 사용 중인 매장 사장님들의 이야기'}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => {
              const TIcon = ICON_MAP[t.iconKey] ?? Coffee
              return (
                <div key={`${t.name}-${i}`} className="relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  {isDemo && (
                    <span className="absolute top-4 right-4 text-[10px] font-semibold text-[#8B95A1] bg-[#F2F4F6] px-2 py-0.5 rounded-full">
                      예시
                    </span>
                  )}
                  <div className="flex text-[#F59E0B] mb-3 gap-0.5">
                    {Array.from({ length: t.rating }).map((_, idx) => (
                      <Star key={idx} size={14} strokeWidth={0} fill="currentColor" />
                    ))}
                  </div>
                  <p className="text-sm text-[#191F28] leading-relaxed mb-4">&quot;{t.text}&quot;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: t.color + '15' }}>
                      <TIcon size={18} strokeWidth={2} style={{ color: t.color }} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#191F28]">{t.name}</div>
                      <div className="text-xs text-[#8B95A1]">{t.store}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── 자주 묻는 질문 (자영업자 의구심 해소) ── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-black text-[#191F28] mb-2">
              사장님들이 많이 물어보시는 것
            </h2>
            <p className="text-[#8B95A1] text-sm">가입 전 궁금증부터 풀고 가세요</p>
          </div>
          <div className="space-y-3">
            {[
              {
                q: '진짜 무료로 쓸 수 있나요?',
                a: '네, 플레이스 진단·키워드 순위 확인 등 기본 기능은 전부 무료예요. 블로그 초안·릴스 대본 같은 AI 생성 기능은 월 무료 횟수가 있고, 그 이상 쓸 때만 요금이 붙어요. 신용카드 없이 가입 가능해요.',
              },
              {
                q: '네이버 계정 연동이 걱정돼요. 비밀번호가 저장되나요?',
                a: '네이버 공식 OAuth를 사용해서 비밀번호는 절대 저장되지 않아요. 리뷰·플레이스 정보 조회 권한만 받고, 언제든 네이버 설정에서 연동 해제 가능해요.',
              },
              {
                q: '매장이 여러 개인데 한 계정에서 관리되나요?',
                a: '네, 여러 매장을 하나의 로컬루션 계정에서 관리할 수 있어요. 1인 마케팅 대행사나 프랜차이즈 본부 사장님들이 특히 많이 쓰시고, Pro 플랜에서는 매장별 권한 분리도 됩니다.',
              },
              {
                q: '해지가 어렵거나 자동결제 무서워요',
                a: '언제든 설정에서 1클릭으로 해지 가능하고, 당월 남은 일수만큼 일할 계산해서 환불해드려요. 자동결제 알림도 결제 3일 전·당일에 카톡으로 보내드립니다.',
              },
              {
                q: '리뷰 답글을 AI가 달면 고객이 티 나게 느끼지 않을까요?',
                a: '로컬루션 AI는 매장 말투·시그니처 메뉴·사장님 이름까지 학습해서 답글을 생성해요. 게다가 최종 발행 전에 사장님이 검토·수정할 수 있어서 "기계 답글"처럼 느껴지지 않아요.',
              },
            ].map((item, i) => (
              <details key={i} className="bg-[#F8FAFC] rounded-2xl border border-gray-100 group">
                <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-3 hover:bg-[#F2F4F6] rounded-2xl transition-colors">
                  <span className="text-sm font-bold text-[#191F28]">Q. {item.q}</span>
                  <span className="text-[#3182F6] text-lg font-black group-open:rotate-45 transition-transform shrink-0">+</span>
                </summary>
                <div className="px-5 pb-4 pt-1 text-sm text-[#4E5968] leading-relaxed">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── 요금 CTA ── */}
      <section className="py-20 px-4 bg-[#F8FAFC]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black text-[#191F28] mb-4">
            필요한 기능만, 합리적인 요금으로
          </h2>
          <p className="text-[#4E5968] mb-8">
            기능별 개별 구독, 월 990원부터 시작해요.<br />
            부담 없이 체험하고 필요한 것만 추가하세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/pricing"
              className="inline-flex items-center justify-center gap-2 border-2 border-[#3182F6] text-[#3182F6] font-bold px-8 py-4 rounded-2xl hover:bg-blue-50 transition-colors">
              요금 보기
            </Link>
            <Link href={isLoggedIn ? '/dashboard' : '/login'}
              className="inline-flex items-center justify-center gap-2 bg-[#3182F6] text-white font-bold px-8 py-4 rounded-2xl hover:bg-[#1B64DA] transition-colors shadow-lg shadow-blue-200">
              {isLoggedIn ? '내 대시보드로 이동' : '지금 무료로 시작하기'}
              <ArrowRight size={18} strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── 푸터 ── */}
      <Footer />

    </div>
  )
}

