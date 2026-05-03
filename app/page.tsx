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
  Inbox, Bell, CreditCard, Frown, Smartphone, Clock,
  CheckCircle2, Target, Lightbulb, Trophy, AlertTriangle,
  type LucideIcon,
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
    title: '멀티플랫폼 리뷰 관리',
    desc: '네이버 · 구글 · 카카오맵 · 배민 · 요기요 · 쿠팡이츠 — 6개 플랫폼 리뷰를 한 화면에서 AI 답글로 자동 처리해요.',
    color: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50',
    tags: ['네이버', '구글', '카카오', '배민', '요기요', '쿠팡이츠'],
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
    href: '/pricing',
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
    href: '/pricing',
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
// 베타 운영 중 — 실제 통계는 /api/landing-stats 로 연동 예정
// 정직한 메시지로 표기 (가짜 숫자 노출 금지)
// ─────────────────────────────────────────────────────────────
const STATS_DEMO = [
  { num: 'BETA', label: '베타 운영 중' },
  { num: '6개', label: '연동 플랫폼 (네이버·구글·배민·요기요·쿠팡·카카오)' },
  { num: '4종', label: 'AI 답글 톤 (친근/전문/유쾌/심플)' },
  { num: '12+', label: '제공 모듈' },
]

const HERO_DEMO = {
  reviewsPerMonth: '24/7',
  reviewsPerMonthLabel: '자동 답글 운영',
  avgRating: '4가지',
  avgRatingLabel: 'AI 답글 톤 선택',
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

// 베타 운영 중 — 실제 후기는 베타 종료 후 게재 예정
// 빈 배열로 두면 컴포넌트에서 "베타 사용자 모집 중" 카드로 자동 전환됨
const TESTIMONIALS_DEMO: Testimonial[] = []

// QR 톤 뱃지 (브랜드 아이콘으로 교체)
const QR_TONES = [
  { Icon: Flame,     label: 'Z세대' },
  { Icon: Heart,     label: '맘카페' },
  { Icon: PenLine,   label: '솔직담백' },
  { Icon: Wine,      label: '미식가' },
  { Icon: UserPlus,  label: '친구추천' },
  { Icon: Camera,    label: '인스타감성' },
]

function FaqSlider({ faqs }: { faqs: { q: string; a: string }[] }) {
  const [cur, setCur] = useState(0)
  const prev = () => setCur(c => (c - 1 + faqs.length) % faqs.length)
  const next = () => setCur(c => (c + 1) % faqs.length)

  useEffect(() => {
    const t = setInterval(next, 5000)
    return () => clearInterval(t)
  }, [])

  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-black text-[#191F28] mb-2">
            사장님들이 많이 물어보시는 것
          </h2>
          <p className="text-[#8B95A1] text-sm text-left sm:text-center">가입 전 궁금증부터 풀고 가세요</p>
        </div>

        {/* 슬라이드 영역 */}
        <div className="relative">
          {/* 카드 */}
          <div className="overflow-hidden rounded-2xl">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${cur * 100}%)` }}
            >
              {faqs.map((item, i) => (
                <div key={i} className="w-full shrink-0 bg-[#F8FAFC] border border-gray-100 rounded-2xl p-8 md:p-10">
                  <div className="text-xs font-bold text-[#3182F6] mb-4 tracking-widest uppercase">
                    Q&A {i + 1} / {faqs.length}
                  </div>
                  <p className="text-lg md:text-xl font-black text-[#191F28] mb-5 leading-snug">
                    {item.q}
                  </p>
                  <div className="w-8 h-0.5 bg-[#3182F6] mb-5 rounded-full" />
                  <p className="text-sm md:text-base text-[#4E5968] leading-relaxed">
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 좌우 버튼 */}
          <button
            onClick={prev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-6 w-10 h-10 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center hover:border-[#3182F6] hover:text-[#3182F6] transition-all text-[#4E5968]"
            aria-label="이전"
          >
            <ArrowRight size={16} strokeWidth={2.5} className="rotate-180" />
          </button>
          <button
            onClick={next}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-6 w-10 h-10 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center hover:border-[#3182F6] hover:text-[#3182F6] transition-all text-[#4E5968]"
            aria-label="다음"
          >
            <ArrowRight size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* 진행 점 */}
        <div className="flex justify-center gap-2 mt-6">
          {faqs.map((_, i) => (
            <button
              key={i}
              onClick={() => setCur(i)}
              className={`rounded-full transition-all duration-300 ${
                i === cur ? 'w-6 h-2 bg-[#3182F6]' : 'w-2 h-2 bg-gray-200 hover:bg-gray-300'
              }`}
              aria-label={`${i + 1}번 질문`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

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
  const [dayStep, setDayStep] = useState(0)

  const DAY_SCENES: { time: string; badge: string; Icon: LucideIcon; platform: string; msg: string; stress: boolean }[] = [
    { time: '08:00', badge: '오픈',   Icon: Coffee,           platform: '',        msg: '청소·준비·재고 체크…',            stress: false },
    { time: '09:20', badge: '알림',   Icon: Inbox,            platform: '네이버',  msg: '리뷰 3개가 새로 달렸어요',         stress: true  },
    { time: '11:50', badge: '피크',   Icon: UtensilsCrossed,  platform: '',        msg: '점심 피크, 주방 정신없음',         stress: false },
    { time: '13:10', badge: '알림',   Icon: Bell,             platform: '배민',    msg: '리뷰 2개 · 구글 1개 추가 도착',    stress: true  },
    { time: '15:30', badge: '알림',   Icon: Star,             platform: '요기요',  msg: '별점 2점 리뷰 — 어떻게 답글?',     stress: true  },
    { time: '18:00', badge: '마감',   Icon: CreditCard,       platform: '',        msg: '카드·현금 매출 정산 시작…',        stress: false },
    { time: '22:40', badge: '야근',   Icon: Frown,            platform: '',        msg: '답글 아직 8개 남음. 내일 또 반복', stress: true  },
  ]

  useEffect(() => {
    const t = setInterval(() => setDayStep(s => (s + 1) % DAY_SCENES.length), 1800)
    return () => clearInterval(t)
  }, [DAY_SCENES.length])

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
                  "price": "6900",
                  "priceCurrency": "KRW",
                  "description": "커피 한 잔 값 월 6,900원으로 모든 플랫폼 리뷰답글 자동화"
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
                      "text": "로컬루션은 소상공인·자영업자를 위한 AI 마케팅 플랫폼입니다. 네이버·구글·배민·요기요·쿠팡이츠 리뷰 자동 답글, 블로그 포스팅 자동화, QR 리뷰 수집, 플레이스 SEO 진단 등 12개 모듈을 제공합니다. 커피 한 잔 값 월 6,900원으로 모든 플랫폼 리뷰답글을 자동으로 등록할 수 있습니다."
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
      <section className="pt-24 md:pt-32 pb-16 md:pb-20 px-4 bg-gradient-to-b from-[#EFF6FF] to-white relative overflow-hidden">
        {/* SVG 배경 dot grid */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.35]" aria-hidden="true">
          <defs>
            <pattern id="dot-grid" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="#3182F6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dot-grid)" />
        </svg>
        {/* SVG 오른쪽 상단 블러 원 */}
        <svg className="absolute -top-32 -right-32 opacity-20 pointer-events-none" width="420" height="420" aria-hidden="true">
          <circle cx="210" cy="210" r="210" fill="#3182F6" />
        </svg>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
            <Coffee size={12} strokeWidth={2.5} /> 커피 한 잔 값 6,900원 · 모든 플랫폼 리뷰 답글 자동
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-[#191F28] leading-tight mb-6">
            필요한 것만 골라쓰는<br />
            <span className="text-[#3182F6]">사장님 마케팅 플랫폼</span>
          </h1>
          <p className="text-base md:text-xl text-[#4E5968] mb-8 max-w-2xl mx-auto leading-relaxed text-left sm:text-center">
            리뷰·QR·블로그·플레이스·CRM — 12개 모듈 중<br className="hidden md:block" />
            내 매장에 필요한 것만 선택. 3개 묶으면 10% 할인.
          </p>

          {/* ── 히어로 공감 카드 (Before / After) ── */}
          <div className="flex flex-col sm:flex-row items-stretch gap-3 max-w-2xl mx-auto mb-10">
            <div className="flex-1 bg-white border border-red-100 rounded-2xl p-5 text-left shadow-sm">
              <p className="text-xs font-bold text-red-400 mb-3 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                지금 사장님 상황
              </p>
              <ul className="space-y-2">
                {([
                  [Frown,          '리뷰 답글 10개 쌓였어요'],
                  [Smartphone,     '플랫폼 탭 5개 열어놓음'],
                  [Clock,          '새벽에 혼자 정산 중…'],
                  [AlertTriangle,  '나쁜 리뷰 답글 뭐라 해야 하지?'],
                ] as [LucideIcon, string][]).map(([Icon, text]) => (
                  <li key={text} className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-5 h-5 rounded-md bg-red-100 text-red-500 flex items-center justify-center flex-shrink-0">
                      <Icon size={11} strokeWidth={2.5} />
                    </div>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex sm:flex-col items-center justify-center gap-1 py-1">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <ArrowRight size={15} className="text-blue-500 rotate-90 sm:rotate-0" />
              </div>
              <span className="text-[10px] font-bold text-blue-400">AI 자동화</span>
            </div>

            <div className="flex-1 bg-blue-50 border border-blue-100 rounded-2xl p-5 text-left shadow-sm">
              <p className="text-xs font-bold text-blue-500 mb-3 flex items-center gap-1.5">
                <Sparkles size={11} strokeWidth={2.5} />
                로컬루션 도입 후
              </p>
              <ul className="space-y-2">
                {([
                  [CheckCircle2,  'AI가 30초 만에 답글 완성'],
                  [Target,        '6개 플랫폼 한 화면에서'],
                  [Lightbulb,     '매출 자동 정산, 일찍 퇴근'],
                  [Trophy,        '맞춤 AI 답글로 별점 UP'],
                ] as [LucideIcon, string][]).map(([Icon, text]) => (
                  <li key={text} className="flex items-center gap-2 text-sm text-gray-700">
                    <div className="w-5 h-5 rounded-md bg-blue-100 text-blue-500 flex items-center justify-center flex-shrink-0">
                      <Icon size={11} strokeWidth={2.5} />
                    </div>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

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

      {/* wave divider */}
      <div className="relative -mt-1 overflow-hidden leading-[0]" aria-hidden="true">
        <svg viewBox="0 0 1440 48" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-10 md:h-12 block" fill="#ffffff">
          <path d="M0,32 C240,0 480,48 720,24 C960,0 1200,48 1440,32 L1440,48 L0,48 Z" />
        </svg>
      </div>

      {/* ── 통계 ── */}
      <section className="py-12 px-4 bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto">
          {isDemo && (
            <div className="text-center mb-6">
              <span className="inline-block text-[11px] font-semibold text-[#8B95A1] bg-[#F2F4F6] px-2.5 py-1 rounded-full">
                예시 · 실제 데이터 연동 예정
              </span>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {stats.map((s, i) => (
              <div key={`${s.label}-${i}`} className="text-center group">
                {/* SVG 배경 링 */}
                <div className="relative inline-flex items-center justify-center mb-3">
                  <svg width="64" height="64" viewBox="0 0 64 64" className="absolute opacity-10 group-hover:opacity-20 transition-opacity" aria-hidden="true">
                    <circle cx="32" cy="32" r="30" stroke="#3182F6" strokeWidth="3" fill="none" strokeDasharray="8 4" />
                  </svg>
                  <div className="text-2xl md:text-3xl font-black text-[#3182F6]">{s.num}</div>
                </div>
                <div className="text-xs md:text-sm text-[#8B95A1] font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Before → After 비교 섹션 ── */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-black text-[#191F28] mb-2">
              혼자 다 하려면 하루가 모자라요
            </h2>
            <p className="text-[#8B95A1] text-sm">로컬루션 하나로 마케팅·정산·고객관리 전부 해결</p>
          </div>
          {/* ── 바쁜 사장님 일과 애니메이션 ── */}
          <div className="flex justify-center mb-8">
            <div className="w-full max-w-sm bg-[#1C1C1E] rounded-[2rem] p-3 shadow-2xl shadow-gray-300">
              {/* 상단 상태바 */}
              <div className="flex justify-between items-center px-3 py-1 mb-2">
                <span className="text-white text-xs font-bold">{DAY_SCENES[dayStep].time}</span>
                <div className="flex gap-1 items-center">
                  <span className="text-white text-[10px]">●●●</span>
                  <span className="text-white text-[10px]">WiFi</span>
                  <span className="text-white text-[9px]">100%</span>
                </div>
              </div>
              {/* 화면 */}
              <div className="bg-[#F2F2F7] rounded-[1.5rem] overflow-hidden min-h-[220px] p-4">
                {/* 날짜 헤더 */}
                <div className="text-center mb-4">
                  <div className="text-xs text-gray-400 font-medium">오늘 · 사장님 일과</div>
                </div>
                {/* 알림 카드들 — 최근 3개까지 표시 */}
                <div className="space-y-2">
                  {DAY_SCENES.slice(0, dayStep + 1).slice(-3).map((scene, idx, arr) => {
                    const isLatest = idx === arr.length - 1
                    return (
                      <div
                        key={scene.time}
                        style={{ animation: isLatest ? 'slideIn 0.35s ease-out' : undefined }}
                        className={`flex items-start gap-2.5 rounded-xl p-3 ${
                          scene.stress
                            ? 'bg-red-50 border border-red-100'
                            : 'bg-white border border-gray-100'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${scene.stress ? 'bg-red-100 text-red-500' : 'bg-blue-100 text-blue-500'}`}>
                          <scene.Icon size={14} strokeWidth={2.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            {scene.platform && (
                              <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">
                                {scene.platform}
                              </span>
                            )}
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              scene.stress ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {scene.badge}
                            </span>
                            <span className="text-[10px] text-gray-400 ml-auto">{scene.time}</span>
                          </div>
                          <p className="text-xs text-gray-700 font-medium leading-snug">{scene.msg}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {/* 진행 점 */}
                <div className="flex justify-center gap-1.5 mt-4">
                  {DAY_SCENES.map((_, i) => (
                    <span
                      key={i}
                      className={`inline-block rounded-full transition-all duration-300 ${
                        i === dayStep ? 'w-4 h-1.5 bg-blue-500' : 'w-1.5 h-1.5 bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <style>{`
            @keyframes slideIn {
              from { opacity: 0; transform: translateY(-8px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Before */}
            <div className="bg-[#FFF5F5] border border-red-100 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-red-500"><Frown size={18} strokeWidth={2.5} /></div>
                <span className="font-black text-[#191F28] text-base">로컬루션 전</span>
              </div>
              <ul className="space-y-3.5">
                {([
                  ['리뷰 답글 1개', '10분 소요, 말투 고민'],
                  ['플랫폼 관리', '탭 5개 열어두고 왔다갔다'],
                  ['키워드 순위', '눈으로 직접 검색해서 확인'],
                  ['정산·급여', '엑셀에 하나씩 손으로 입력'],
                  ['고객 재방문 유도', '기억으로 연락, 자주 놓침'],
                ] as [string, string][]).map(([title, desc]) => (
                  <li key={title} className="flex items-start gap-3">
                    <svg width="16" height="16" viewBox="0 0 16 16" className="shrink-0 mt-0.5" aria-hidden="true">
                      <circle cx="8" cy="8" r="7.5" fill="#FEE2E2" />
                      <path d="M5 5l6 6M11 5l-6 6" stroke="#F87171" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    <div>
                      <span className="text-sm font-bold text-[#191F28]">{title}</span>
                      <span className="text-xs text-[#8B95A1] ml-1.5">{desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            {/* After */}
            <div className="bg-[#EFF6FF] border border-blue-100 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-lg">🤖</div>
                <span className="font-black text-[#191F28] text-base">로컬루션 후</span>
              </div>
              <ul className="space-y-3.5">
                {([
                  ['AI 답글 자동 생성', '30초, 말투 6종 선택'],
                  ['6개 플랫폼 통합', '한 화면에서 전부 처리'],
                  ['키워드 순위 자동 추적', '매일 카카오톡으로 리포트'],
                  ['정산 자동화', '매출·급여 한 번에 계산'],
                  ['CRM 재방문 유도', '방문 2주 후 자동 알림톡'],
                ] as [string, string][]).map(([title, desc]) => (
                  <li key={title} className="flex items-start gap-3">
                    <svg width="16" height="16" viewBox="0 0 16 16" className="shrink-0 mt-0.5" aria-hidden="true">
                      <circle cx="8" cy="8" r="7.5" fill="#DBEAFE" />
                      <path d="M4.5 8.5l2.5 2.5 4.5-5" stroke="#3182F6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                    <div>
                      <span className="text-sm font-bold text-[#191F28]">{title}</span>
                      <span className="text-xs text-[#8B95A1] ml-1.5">{desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* wave divider — white to #F8FAFC */}
      <div className="relative overflow-hidden leading-[0] bg-white" aria-hidden="true">
        <svg viewBox="0 0 1440 40" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-8 block" fill="#F8FAFC">
          <path d="M0,20 C360,40 1080,0 1440,20 L1440,40 L0,40 Z" />
        </svg>
      </div>

      {/* ── 주요 기능 ── */}
      <section className="py-20 px-4 bg-[#F8FAFC]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black text-[#191F28] mb-4">
              필요한 기능만!!<br />
              <span className="text-[#3182F6]">골라쓰는 모듈방식</span>
            </h2>
            <p className="text-[#4E5968] text-sm md:text-base text-left sm:text-center">
              커피 한 잔 값 월 6,900원 · 3개 묶으면 10% · 5개 15% · 8개 20% 추가 할인
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
            <p className="text-[#8B95A1] text-sm text-left sm:text-center">
              1인 운영부터 체인점까지 · 업종 상관없이 네이버·구글·배민이 핵심이라면 전부
            </p>
          </div>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2 md:gap-4">
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
              <div key={label} className="flex flex-col items-center gap-1.5 p-2 md:p-3 rounded-xl hover:bg-[#F8FAFC] transition-colors">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-[#EFF6FF] flex items-center justify-center">
                  <Icon size={18} strokeWidth={2} className="text-[#3182F6] md:hidden" />
                  <Icon size={22} strokeWidth={2} className="text-[#3182F6] hidden md:block" />
                </div>
                <span className="text-[10px] md:text-xs font-semibold text-[#4E5968] text-center leading-tight">{label}</span>
              </div>
            ))}
          </div>
          <p className="text-left sm:text-center text-[11px] text-[#8B95A1] mt-6">
            이외에도 네이버 플레이스·블로그·리뷰 관리가 필요한 모든 자영업자 · 소상공인 · 마케터 · 프리랜서에게 맞춰져 있어요
          </p>
        </div>
      </section>

      {/* wave divider — white to #F8FAFC */}
      <div className="relative overflow-hidden leading-[0] bg-white" aria-hidden="true">
        <svg viewBox="0 0 1440 40" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-8 block" fill="#F8FAFC">
          <path d="M0,10 C480,40 960,0 1440,25 L1440,40 L0,40 Z" />
        </svg>
      </div>

      {/* ── 사용자 후기 ── */}
      <section className="py-20 px-4 bg-[#F8FAFC]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-[#191F28] mb-3">
              {testimonials.length > 0 ? '사장님들의 실제 후기' : '베타 사용자 모집 중'}
            </h2>
            <p className="text-[#8B95A1] text-sm text-left sm:text-center">
              {testimonials.length > 0
                ? '로컬루션을 사용 중인 매장 사장님들의 이야기'
                : '실제 사용 후기는 베타 운영 종료 후 게재됩니다 · 지금 가입하면 베타 우선 사용권 제공'}
            </p>
          </div>
          {testimonials.length === 0 ? (
            <div className="max-w-2xl mx-auto bg-white rounded-2xl p-8 md:p-12 text-center shadow-sm border border-gray-100">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#3182F6] to-[#7C3AED] flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Sparkles size={24} className="text-white" strokeWidth={2.5} />
              </div>
              <p className="text-base font-black text-[#191F28] mb-2">베타 사용자 우선 모집 중</p>
              <p className="text-sm text-[#4E5968] leading-relaxed mb-5">
                로컬루션은 현재 베타 운영 중이에요. 가짜 후기로 사장님을 속이지 않습니다.<br />
                지금 가입하시면 정식 출시 후에도 <strong className="text-[#3182F6]">베타 우선 사용권</strong>과 할인 혜택을 받으실 수 있어요.
              </p>
              <Link href="/signup" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#3182F6] text-white text-sm font-bold hover:bg-[#1B64DA]">
                베타 신청하기 <ArrowRight size={14} strokeWidth={2.5} />
              </Link>
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => {
              const TIcon = ICON_MAP[t.iconKey] ?? Coffee
              return (
                <div key={`${t.name}-${i}`} className="relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                  {/* SVG 큰따옴표 장식 */}
                  <svg className="absolute top-4 right-5 opacity-[0.07]" width="36" height="28" viewBox="0 0 36 28" aria-hidden="true">
                    <path d="M0 28V17.5C0 7.833 4.5 2.5 13.5 0L15 3C10.5 4.667 8.167 7.833 8 12H14V28H0ZM22 28V17.5C22 7.833 26.5 2.5 35.5 0L37 3C32.5 4.667 30.167 7.833 30 12H36V28H22Z" fill="#3182F6" />
                  </svg>
                  {isDemo && (
                    <span className="absolute top-4 left-4 text-[10px] font-semibold text-[#8B95A1] bg-[#F2F4F6] px-2 py-0.5 rounded-full">
                      예시
                    </span>
                  )}
                  <div className="flex text-[#F59E0B] mb-3 gap-0.5">
                    {Array.from({ length: t.rating }).map((_, idx) => (
                      <Star key={idx} size={14} strokeWidth={0} fill="currentColor" />
                    ))}
                  </div>
                  <p className="text-sm text-[#191F28] leading-relaxed mb-4 break-keep">&quot;{t.text}&quot;</p>
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
          )}
        </div>
      </section>

      {/* ── 자주 묻는 질문 — 좌우 슬라이드 카드 ── */}
      {(() => {
        const FAQS = [
          {
            q: '진짜 무료로 쓸 수 있나요?',
            a: '플레이스 진단·키워드 순위 확인 등 기본 기능은 전부 무료예요. 블로그 초안·릴스 대본 같은 AI 생성 기능은 월 무료 횟수가 있고, 그 이상 쓸 때만 요금이 붙어요. 신용카드 없이 가입 가능해요.',
          },
          {
            q: '네이버 계정 연동이 걱정돼요. 비밀번호가 저장되나요?',
            a: '네이버 공식 OAuth를 사용해서 비밀번호는 절대 저장되지 않아요. 리뷰·플레이스 정보 조회 권한만 받고, 언제든 네이버 설정에서 연동 해제 가능해요.',
          },
          {
            q: '매장이 여러 개인데 한 계정에서 관리되나요?',
            a: '여러 매장을 하나의 로컬루션 계정에서 관리할 수 있어요. 1인 마케팅 대행사나 프랜차이즈 본부 사장님들이 특히 많이 쓰시고, Pro 플랜에서는 매장별 권한 분리도 됩니다.',
          },
          {
            q: '해지가 어렵거나 자동결제가 무서워요',
            a: '언제든 설정에서 원클릭으로 해지 가능하고, 당월 남은 일수만큼 일할 계산 후 환불해드려요. 자동결제 알림도 결제 3일 전·당일에 카카오톡으로 보내드립니다.',
          },
          {
            q: '리뷰 답글을 AI가 달면 고객이 티 나게 느끼지 않을까요?',
            a: '로컬루션 AI는 매장 말투·시그니처 메뉴·사장님 이름까지 학습해서 답글을 생성해요. 최종 발행 전에 사장님이 검토·수정할 수 있어서 기계 답글처럼 느껴지지 않아요.',
          },
        ]
        return (
          <FaqSlider faqs={FAQS} />
        )
      })()}

      {/* ── 요금 CTA ── */}
      <section className="py-20 px-4 bg-[#F8FAFC]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black text-[#191F28] mb-4">
            필요한 기능만!<br />
            <span className="text-[#3182F6]">합리적인 요금으로</span>
          </h2>
          <p className="text-[#4E5968] mb-8 text-left sm:text-center">
            커피 한 잔 값 월 6,900원으로 모든 플랫폼 리뷰 답글 자동화.<br />
            부담 없이 체험하고 필요한 모듈만 추가하세요.
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

