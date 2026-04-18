'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Footer from './components/Footer'
import TopNav from './components/TopNav'
import {
  MessageCircle, QrCode, Users, FileText, Sparkles,
  Coffee, UtensilsCrossed, Dumbbell,
  Flame, Heart, PenLine, Wine, UserPlus, Camera, Star,
  ArrowRight, MapPin, Video,
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
    href: '/review/demo-restaurant-001',
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
]

// ─────────────────────────────────────────────────────────────
// 데모 데이터 (실제 데이터 연결 전 예시용)
// /api/landing-stats 가 실제 값을 반환하면 자동 교체됨
// ─────────────────────────────────────────────────────────────
const STATS_DEMO = [
  { num: '2,400+', label: '등록 매장' },
  { num: '98만+', label: 'AI 답글 생성' },
  { num: '4.8점', label: '평균 별점 향상' },
  { num: '92%', label: '재방문율 개선' },
]

const HERO_DEMO = {
  reviewsPerMonth: '+50개',
  reviewsPerMonthLabel: '월 평균 리뷰 증가',
  avgRating: '4.9점',
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

            <TopNav />

      {/* ── 히어로 ── */}
      <section className="pt-32 pb-20 px-4 bg-gradient-to-b from-[#EFF6FF] to-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
            소상공인 AI 자동화 플랫폼
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-[#191F28] leading-tight mb-6">
            사장님 마케팅,<br />
            <span className="text-[#3182F6]">AI가 다 해드려요</span>
          </h1>
          <p className="text-lg md:text-xl text-[#4E5968] mb-10 max-w-2xl mx-auto leading-relaxed">
            네이버 플레이스 SEO·블로그·릴스·리뷰·QR·CRM<br className="hidden md:block" />
            한 플랫폼에서, 1인 사장님도 마케팅 대행사처럼
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/marketing/place"
              className="inline-flex items-center justify-center gap-2 bg-[#3182F6] text-white font-bold text-base px-8 py-4 rounded-2xl hover:bg-[#1B64DA] transition-all shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-0.5">
              내 가게 1분 무료 진단
              <ArrowRight size={18} strokeWidth={2.5} />
            </Link>
            <Link href="/login"
              className="inline-flex items-center justify-center gap-2 bg-white text-[#191F28] font-semibold text-base px-8 py-4 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all hover:-translate-y-0.5">
              무료로 시작하기
            </Link>
          </div>
          <p className="text-xs text-[#8B95A1] mt-4">회원가입 없이 진단 가능 · 신용카드 불필요</p>
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
              소상공인에게 꼭 필요한 기능만
            </h2>
            <p className="text-[#4E5968] text-base md:text-lg">
              네이버 플레이스 상위 노출부터 고객 재방문 유도까지, 한 플랫폼에서
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
                <Link href="/review/demo-restaurant-001"
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

      {/* ── 요금 CTA ── */}
      <section className="py-20 px-4 bg-white">
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
            <Link href="/login"
              className="inline-flex items-center justify-center gap-2 bg-[#3182F6] text-white font-bold px-8 py-4 rounded-2xl hover:bg-[#1B64DA] transition-colors shadow-lg shadow-blue-200">
              지금 무료로 시작하기
            </Link>
          </div>
        </div>
      </section>

      {/* ── 푸터 ── */}
      <Footer />

    </div>
  )
}

