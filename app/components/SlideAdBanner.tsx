'use client'

// ══════════════════════════���════════════════════════════════
//  SlideAdBanner — 공통 롤링 광고 배너 (dashboard + community 공용)
//  · 4초 자동 전환 · 도트 인디케이터 · 좌우 화살표 · 터치 스와이프
//  · link 가 http 로 시작하면 새 창, 아니면 현재 창 이동
// ═══════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react'
import {
  Bot,
  Smartphone,
  BarChart3,
  Wallet,
  Rocket,
  Layers,
  Zap,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'

export interface BannerSlide {
  title: string
  sub: string
  desc: string
  bg: string
  Icon: LucideIcon
  link: string
}

// 기본 슬라이드 (dashboard·community 공용)
export const DEFAULT_BANNER_SLIDES: BannerSlide[] = [
  {
    title: 'AI가 대신 답변하는 시대',
    sub: '리뷰 답글, 이제 AI에게 맡기세요',
    desc: '네이버 · 구글 · 배민 · 요기요 통합 AI 리뷰 자동 답글',
    bg: 'linear-gradient(135deg, #1e3a5f 0%, #3182F6 100%)',
    Icon: Bot,
    link: '/review-admin',
  },
  {
    title: 'QR 스캔 한 번으로',
    sub: '고객이 직접 리뷰를 쓰는 시대',
    desc: 'QR 코드 스캔 → AI 리뷰 생성 → 플랫폼 자동 등록',
    bg: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
    Icon: Smartphone,
    link: '/qr-admin',
  },
  {
    title: '매출과 고객을 한 눈에',
    sub: '대시보드 하나로 끝',
    desc: '매출 캘린더 · 고객 CRM · 정산 자동화 모두 통합',
    bg: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)',
    Icon: BarChart3,
    link: '/dashboard',
  },
  {
    title: '소상공인 경영안정자금',
    sub: '최대 2천만원 · 연 1.5%',
    desc: '지금 사장님 매출이면 신청 가능합니다',
    bg: 'linear-gradient(135deg, #92400e 0%, #f59e0b 100%)',
    Icon: Wallet,
    link: 'https://ols.semas.or.kr',
  },
  {
    title: '플레이스 상위 노출 비법',
    sub: '키워드 + 리뷰 + 답글률 = 상위 노출',
    desc: '로컬루션 AI가 키워드 분석부터 리뷰 답글까지 자동화',
    bg: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
    Icon: Rocket,
    link: '/marketing',
  },
  {
    title: '인스타 카드뉴스 AI 자동 생성',
    sub: '주제만 던지면 캐러셀 10장 완성',
    desc: '6테마 × 30주제 · 1080px PNG 저장 · 바로 업로드',
    bg: 'linear-gradient(135deg, #EC4899 0%, #F43F5E 50%, #F97316 100%)',
    Icon: Layers,
    link: '/marketing/card-news',
  },
  {
    title: '플랫폼 연동 허브 한 곳에서',
    sub: '네이버 · 인스타 · 카카오톡 통합',
    desc: '계정 한 번 연동 → 모든 채널 통합 관리 · 자동 게시',
    bg: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #A855F7 100%)',
    Icon: Zap,
    link: '/my/platforms',
  },
  {
    title: '블로그 순위 자동 추적',
    sub: '키워드별 노출 변동 매일 모니터링',
    desc: '네이버 검색 상위 노출 · 스마트블록 · 인플루언서 포함',
    bg: 'linear-gradient(135deg, #B45309 0%, #D97706 50%, #F59E0B 100%)',
    Icon: TrendingUp,
    link: '/marketing/blog-tracking',
  },
]

interface SlideAdBannerProps {
  slides?: BannerSlide[]
  intervalMs?: number
  className?: string
  minHeight?: number
}

export default function SlideAdBanner({
  slides = DEFAULT_BANNER_SLIDES,
  intervalMs = 4000,
  className = 'mb-5',
  minHeight = 160,
}: SlideAdBannerProps) {
  const [idx, setIdx] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [slideDir, setSlideDir] = useState(1)
  const touchStart = useRef(0)

  useEffect(() => {
    if (slides.length <= 1) return
    const timer = setInterval(() => {
      setSlideDir(1)
      setIsAnimating(true)
      setTimeout(() => {
        setIdx(prev => (prev + 1) % slides.length)
        setIsAnimating(false)
      }, 400)
    }, intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs, slides.length])

  const goTo = (i: number) => {
    if (i === idx) return
    setSlideDir(i > idx ? 1 : -1)
    setIsAnimating(true)
    setTimeout(() => {
      setIdx(i)
      setIsAnimating(false)
    }, 400)
  }

  if (!slides || slides.length === 0) return null

  const s = slides[idx]
  const SlideIcon = s.Icon
  const isExternal = s.link.startsWith('http')

  return (
    <div className={`relative ${className}`}>
      <div
        className="rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-lg relative focus:outline-none focus:ring-2 focus:ring-[#3182F6]/40"
        style={{ background: s.bg, minHeight }}
        role="link"
        tabIndex={0}
        aria-label={`${s.title} 배너 — 클릭 시 ${isExternal ? '새 창' : '이동'}`}
        onClick={() => (isExternal ? window.open(s.link, '_blank') : (window.location.href = s.link))}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            isExternal ? window.open(s.link, '_blank') : (window.location.href = s.link)
          }
        }}
        onTouchStart={(e) => {
          touchStart.current = e.touches[0].clientX
        }}
        onTouchEnd={(e) => {
          const diff = e.changedTouches[0].clientX - touchStart.current
          if (Math.abs(diff) > 50) {
            goTo(
              diff > 0
                ? (idx - 1 + slides.length) % slides.length
                : (idx + 1) % slides.length
            )
          }
        }}
      >
        <div
          className="px-8 py-7 flex items-center justify-between"
          style={{
            opacity: isAnimating ? 0 : 1,
            transform: isAnimating ? `translateX(${slideDir * 30}px)` : 'translateX(0)',
            transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-white/60 text-xs font-semibold mb-1 tracking-wide uppercase">
              {s.sub}
            </p>
            <h2 className="text-2xl font-black text-white mb-2 leading-tight">
              {s.title}
            </h2>
            <p className="text-sm text-white/80">{s.desc}</p>
          </div>
          <div className="ml-6 flex-shrink-0 w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-lg">
            <SlideIcon size={42} strokeWidth={1.75} className="text-white" />
          </div>
        </div>

        {/* 도트 인디케이터 */}
        {slides.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation()
                  goTo(i)
                }}
                className="transition-all duration-300"
                style={{
                  width: i === idx ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: i === idx ? 'white' : 'rgba(255,255,255,0.4)',
                }}
                aria-label={`슬라이드 ${i + 1}로 이동`}
              />
            ))}
          </div>
        )}

        {/* 좌우 화살표 */}
        {slides.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation()
                goTo((idx - 1 + slides.length) % slides.length)
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white transition-colors"
              aria-label="이전 슬라이드"
            >
              <ChevronLeft size={16} strokeWidth={2.5} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                goTo((idx + 1) % slides.length)
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white transition-colors"
              aria-label="다음 슬라이드"
            >
              <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          </>
        )}

        {/* 슬라이드 카운터 */}
        {slides.length > 1 && (
          <div className="absolute top-4 right-4 bg-black/30 text-white text-[10px] px-2.5 py-1 rounded-full font-semibold">
            {idx + 1} / {slides.length}
          </div>
        )}
      </div>
    </div>
  )
}
