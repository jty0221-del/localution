'use client'

import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'
import Link from 'next/link'
import {
  MessageCircle, Search, PenLine, BarChart3, Users, Smartphone,
  ChefHat, Store, Megaphone,
  ShoppingCart, ShoppingBasket, X,
  Gift, Plus, ArrowRight, ChevronDown, LucideIcon, TrendingUp,
  Layers, Zap, QrCode, Check, Target, UserPlus,
} from 'lucide-react'
import { MODULES, calculateBundleDiscount, type ModuleId } from '../lib/modules'

// ── 전역 keyframe 스타일 ─────────────────────────────────────
const GLOBAL_STYLES = `
  @keyframes pulse-dot {
    0%, 100% { transform: scale(1); opacity: 1; }
    50%       { transform: scale(1.4); opacity: 0.7; }
  }
  @keyframes count-up {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes badge-pop {
    0%   { transform: scale(0.8); opacity: 0; }
    60%  { transform: scale(1.08); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes float-card {
    0%,100% { transform: translateY(0px); }
    50%     { transform: translateY(-4px); }
  }
  @keyframes check-draw {
    from { stroke-dashoffset: 28; }
    to   { stroke-dashoffset: 0; }
  }
`

// ── 모듈 → 아이콘 매핑 ──────────────────────────────────────
const ICON_MAP: Record<string, LucideIcon> = {
  MessageSquare: MessageCircle,
  Bell: MessageCircle,
  Calculator: BarChart3,
  Users,
  QrCode,
  Search,
  PenLine,
  TrendingUp,
  BarChart3,
  UserCheck: Users,
  Bot: MessageCircle,
  Share2: Smartphone,
  Layers,
  Zap,
}

const CATEGORY_COLOR: Record<string, string> = {
  '사장님': '#3182F6',
  '마케터': '#8B5CF6',
  '공통':   '#059669',
}

type Feature = {
  id: ModuleId
  name: string
  desc: string
  price: number
  Icon: LucideIcon
  iconColor: string
  category: '사장님' | '마케터' | '공통'
  popular?: boolean
  badge?: string
}

const features: Feature[] = MODULES
  .filter(m => m.status === 'live' || m.status === 'beta')
  .map(m => ({
    id: m.id,
    name: m.name,
    desc: m.desc,
    price: m.price,
    Icon: ICON_MAP[m.icon] || Search,
    iconColor: CATEGORY_COLOR[m.category],
    category: m.category,
    popular: m.popular,
    badge: m.badge,
  }))

const categoryColor: Record<string, string> = {
  '사장님': 'bg-blue-100 text-blue-600',
  '마케터': 'bg-purple-100 text-purple-600',
  '공통':   'bg-green-100 text-green-600',
}

function getDiscountRate(count: number): number {
  return calculateBundleDiscount(count)
}
function getNextTier(count: number): { need: number; rate: number } | null {
  if (count < 3) return { need: 3 - count, rate: 10 }
  if (count < 5) return { need: 5 - count, rate: 15 }
  if (count < 8) return { need: 8 - count, rate: 20 }
  return null
}

// ── 역할별 추천 번들 (재설계) ───────────────────────────────
const PERSONAS = [
  {
    key: 'cafe-owner',
    title: '음식점·카페 사장님',
    emoji: '🍜',
    desc: '리뷰 답글 자동화 + QR 손님 유도 + 고객 DB',
    Icon: ChefHat,
    color: '#FF6B35',
    features: ['ai-review', 'qr-stamp', 'crm', 'platform-hub'] as ModuleId[],
  },
  {
    key: 'small-biz',
    title: '소상공인',
    emoji: '🏪',
    desc: '동네 검색 노출 + 리뷰 관리 + 월 성과 확인',
    Icon: Store,
    color: '#3182F6',
    features: ['ai-review', 'qr-stamp', 'keyword', 'crm', 'report'] as ModuleId[],
  },
  {
    key: 'marketer',
    title: '마케터·마케팅 대행사',
    emoji: '📊',
    desc: '키워드·블로그·SNS·카드뉴스 클라이언트 풀세트',
    Icon: Megaphone,
    color: '#8B5CF6',
    features: ['keyword', 'blog-ai', 'blog-tracking', 'sns-manage', 'card-news', 'report'] as ModuleId[],
  },
  {
    key: 'blogger-freelancer',
    title: '블로거·프리랜서',
    emoji: '✍️',
    desc: '내 글 순위 추적 + AI 콘텐츠 생성 + SNS 자동화',
    Icon: PenLine,
    color: '#059669',
    features: ['keyword', 'blog-ai', 'blog-tracking', 'sns-manage', 'card-news'] as ModuleId[],
  },
] as const

// ── 무료 제공 기능 ─────────────────────────────────────────
const FREE_FEATURES = [
  { emoji: '💬', label: '사장님 커뮤니티', desc: '지역·업종별 사장님들과 정보 공유 · 공동구매' },
  { emoji: '🎁', label: '파트너 포인트', desc: '지인 추천 시 포인트 적립 · 구독료 할인 전환' },
  { emoji: '📊', label: '기본 대시보드', desc: '리뷰 현황·방문 추이 · 실시간 알림 기본 제공' },
  { emoji: '🔗', label: '매장 프로필 관리', desc: '매장 정보·플랫폼 연동 설정 · 무제한 무료' },
]

// ── FAQ ────────────────────────────────────────────────────
const faqs = [
  {
    q: '정말 무료인가요? 나중에 돈 뜯기진 않나요?',
    a: '네, 베타 테스트 기간 동안은 모든 기능이 100% 무료예요. 카드 등록을 받지 않기 때문에 자동결제가 발생할 수 없어요. 정식 출시 시점은 최소 30일 전 카톡·이메일로 미리 안내드립니다.',
  },
  {
    q: '정식 출시 후엔 얼마인가요?',
    a: '기능별 6,900원~12,900원 예정이고, 3개 이상 묶으면 최대 20% 할인이 적용됩니다. 베타 기간에 써보신 분께는 별도 얼리버드 혜택도 드릴 예정이에요.',
  },
  {
    q: '기능을 중간에 추가하거나 빼도 되나요?',
    a: '언제든 가능해요. 베타 기간에도 기능을 자유롭게 담고 빼보세요. 결제가 없으니 부담 없이 실험하셔도 됩니다.',
  },
  {
    q: '해지는 쉽게 되나요?',
    a: '설정에서 원클릭 해지 가능합니다. 정식 출시 후에도 당월 남은 일수만큼 일할 계산 후 환불됩니다.',
  },
  {
    q: '여러 매장을 운영 중인데 한 계정으로 쓸 수 있나요?',
    a: '사장님 플랜은 1개 매장 기준이에요. 2개 이상 매장은 매장별로 따로 결제하거나, 마케터·대행사용 멀티 매장 플랜(준비 중)을 이용하시면 됩니다.',
  },
  {
    q: '세금계산서 발행이 가능한가요?',
    a: '네, 사업자 등록증을 제출해주시면 월 단위로 세금계산서를 자동 발행해드려요. 홈택스 연동도 지원합니다.',
  },
]

// ── 완료 체크 SVG ──────────────────────────────────────────
function AnimatedCheckSmall({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7.5"
        fill={active ? '#3182F6' : 'none'}
        stroke={active ? '#3182F6' : '#D1D5DB'}
        strokeWidth="1.5" />
      {active && (
        <polyline points="4.5,8.5 7,11 11.5,5.5"
          fill="none" stroke="white" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray="28" strokeDashoffset="28"
          style={{ animation: 'check-draw 0.25s ease-out forwards' }} />
      )}
    </svg>
  )
}

// ── 메인 ──────────────────────────────────────────────────
export default function PricingPage() {
  const [cart,    setCart]    = useState<string[]>([])
  const [filter,  setFilter]  = useState<'전체' | '사장님' | '마케터' | '공통'>('전체')
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const applyPersona = (features: readonly ModuleId[]) => {
    setCart(Array.from(new Set(features)))
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        document.getElementById('pricing-feature-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }
  const toggle = (id: string) =>
    setCart(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const cartItems      = features.filter(f => cart.includes(f.id))
  const subtotal       = cartItems.reduce((sum, f) => sum + f.price, 0)
  const discountRate   = getDiscountRate(cart.length)
  const discountAmount = Math.round(subtotal * discountRate)
  const total          = subtotal - discountAmount
  const nextTier       = getNextTier(cart.length)
  const filtered       = filter === '전체' ? features : features.filter(f => f.category === filter)

  const requestQuote = () => {
    if (typeof window === 'undefined') return
    const items = features.filter(f => cart.includes(f.id)).map(f => ({ id: f.id, name: f.name, price: f.price }))
    try { localStorage.setItem('localution.pricing_quote', JSON.stringify({ items, subtotal, discountRate, discountAmount, total, createdAt: new Date().toISOString() })) } catch {}
    window.location.href = '/inquiry?source=pricing'
  }

  const FILTER_TABS = [
    { key: '전체'   as const, label: '전체',      Icon: Search },
    { key: '사장님' as const, label: '사장님용',  Icon: Store },
    { key: '마케터' as const, label: '마케터용',  Icon: Megaphone },
    { key: '공통'   as const, label: '공통',      Icon: UserPlus },
  ]

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex">
      <style>{GLOBAL_STYLES}</style>
      <Sidebar />
      <main className="flex-1 md:ml-[220px] p-4 sm:p-6 md:p-8 pt-6 sm:pt-8">
      <div className="max-w-6xl mx-auto pb-16">

        {/* ── 신뢰 배너 ─────────────────────────────── */}
        <div className="flex justify-center mb-5 sm:mb-6">
          <div className="inline-flex items-center gap-2 bg-white border border-[#10B981]/30 rounded-full px-4 py-2 shadow-sm">
            <span className="w-2 h-2 bg-green-500 rounded-full"
              style={{ animation: 'pulse-dot 1.8s ease-in-out infinite' }} />
            <span className="text-xs font-bold text-[#059669]">베타 테스트 진행 중</span>
            <span className="text-xs text-[#8B95A1] hidden sm:inline">· 전 기능 무료 사용 가능</span>
          </div>
        </div>

        {/* ── 헤더 ──────────────────────────────────── */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-1.5 bg-[#ECFDF5] text-[#059669] text-xs font-bold px-3 py-1.5 rounded-full mb-4">
            <Gift size={12} strokeWidth={2.5} />
            베타 테스트 기간 · 전 기능 100% 무료
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#191F28] mb-3 break-keep leading-tight">
            지금은 모든 기능,<br className="sm:hidden" /> 테스트 기간 무료
          </h1>
          <p className="text-[#4E5968] text-sm sm:text-base max-w-lg mx-auto break-keep leading-relaxed">
            신용카드 등록 없음 · 자동결제 없음 · 언제든 원클릭 해지
            <br/>
            <span className="font-bold text-[#059669]">필요한 기능을 담고 지금 바로 써보세요.</span>
          </p>
        </div>

        {/* ── 역할별 추천 번들 ──────────────────────── */}
        <div className="mb-8 sm:mb-10">
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#3182F6] mb-1">
              <Target size={12} strokeWidth={2.5} />
              어떤 분이세요?
            </div>
            <p className="text-sm text-[#8B95A1] break-keep">역할에 맞는 기능을 한 번에 담아드려요. 언제든 수정 가능합니다.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
            {PERSONAS.map(p => (
              <button key={p.key} onClick={() => applyPersona(p.features)}
                className="bg-white rounded-2xl p-3.5 sm:p-4 border border-[#E5E8EB] hover:border-[#3182F6] hover:shadow-md transition-all text-left group active:scale-95">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mb-2.5"
                  style={{ background: p.color + '18' }}>
                  <p.Icon size={18} strokeWidth={2} style={{ color: p.color }} />
                </div>
                <div className="font-black text-[#191F28] text-xs sm:text-sm mb-1 break-keep group-hover:text-[#3182F6] transition-colors leading-snug">{p.title}</div>
                <div className="text-[10px] sm:text-[11px] text-[#8B95A1] leading-relaxed mb-2.5 break-keep hidden sm:block">{p.desc}</div>
                <div className="inline-flex items-center gap-1 text-[10px] font-bold text-[#3182F6]">
                  {p.features.length}개 기능 한 번에 담기
                  <ArrowRight size={10} strokeWidth={2.5} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── 베타 안내 박스 ─────────────────────────── */}
        <div className="mb-8 sm:mb-10 bg-gradient-to-br from-[#ECFDF5] to-[#F0FDF4] rounded-2xl p-4 sm:p-5 border border-[#A7F3D0]">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#10B981] flex items-center justify-center shrink-0">
              <Gift size={20} strokeWidth={2.25} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-[#065F46] mb-1">베타 테스트 기간 — 모든 기능 무료로 써보세요</p>
              <p className="text-xs text-[#065F46]/80 leading-relaxed break-keep">
                신용카드 등록 안 받습니다. 자동결제 불가능합니다. 정식 출시는 <b>최소 30일 전</b> 카톡·이메일로 미리 안내드리고, 원치 않으면 해지만 하면 끝입니다.
              </p>
            </div>
          </div>
        </div>

        {/* ── 기능 목록 + 장바구니 ───────────────────── */}
        <div className="flex gap-5 items-start">

          <div id="pricing-feature-list" className="scroll-mt-6 flex-1">

            {/* 필터 탭 */}
            <div className="flex gap-1.5 sm:gap-2 mb-5 flex-wrap">
              {FILTER_TABS.map(({ key, label, Icon: FIcon }) => (
                <button key={key} onClick={() => setFilter(key)}
                  className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                    filter === key
                      ? 'bg-[#3182F6] text-white shadow-sm'
                      : 'bg-white text-[#4E5968] hover:bg-gray-50 border border-[#E5E8EB]'
                  }`}>
                  <FIcon size={13} strokeWidth={2.25} />
                  {label}
                </button>
              ))}
            </div>

            {/* 기능 카드 그리드 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 mb-8">
              {filtered.map(feature => {
                const inCart = cart.includes(feature.id)
                return (
                  <div key={feature.id}
                    onClick={() => toggle(feature.id)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(feature.id) } }}
                    role="button" tabIndex={0}
                    aria-pressed={inCart}
                    className={`relative bg-white rounded-2xl p-4 sm:p-5 cursor-pointer transition-all border-2 focus:outline-none focus:ring-2 focus:ring-[#3182F6]/40 select-none ${
                      inCart ? 'border-[#3182F6] shadow-sm shadow-blue-100' : 'border-transparent hover:border-[#E5E8EB]'
                    }`}>
                    {feature.popular && (
                      <div className="absolute -top-2.5 left-4 bg-[#3182F6] text-white text-[9px] font-black px-2 py-0.5 rounded-full"
                        style={{ animation: 'badge-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
                        인기
                      </div>
                    )}
                    {feature.badge && !feature.popular && (
                      <div className="absolute -top-2.5 left-4 bg-[#8B5CF6] text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                        {feature.badge}
                      </div>
                    )}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: feature.iconColor + '15' }}>
                          <feature.Icon size={18} strokeWidth={2} style={{ color: feature.iconColor }} />
                        </div>
                        <div>
                          <div className="font-bold text-[#191F28] text-xs sm:text-sm leading-snug">{feature.name}</div>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold mt-0.5 inline-block ${categoryColor[feature.category]}`}>
                            {feature.category}용
                          </span>
                        </div>
                      </div>
                      <AnimatedCheckSmall active={inCart} />
                    </div>
                    <p className="text-[11px] sm:text-xs text-[#8B95A1] leading-relaxed mb-3 break-keep">{feature.desc}</p>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-baseline gap-1">
                        <span className="text-xs sm:text-sm font-black text-[#10B981]">베타 무료</span>
                        <span className="text-[10px] text-[#B0B8C1] line-through ml-1">{feature.price.toLocaleString()}원/월</span>
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-lg transition-all ${
                        inCart ? 'bg-[#3182F6] text-white' : 'bg-[#F2F4F6] text-[#4E5968]'
                      }`}>
                        {inCart ? <><Check size={11} strokeWidth={3} /> 담김</> : <><Plus size={11} strokeWidth={3} /> 담기</>}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ── 무료 제공 기능 ─────────────────────── */}
            <div className="bg-white rounded-2xl border border-[#E5E8EB] p-4 sm:p-6 mb-2">
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex items-center gap-1.5 bg-[#ECFDF5] text-[#059669] text-[10px] font-black px-2.5 py-1 rounded-full">
                  <Gift size={10} strokeWidth={2.5} /> 가입만 해도 무료 제공
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {FREE_FEATURES.map(f => (
                  <div key={f.label} className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F8F9FA]">
                    <span className="text-lg leading-none mt-0.5">{f.emoji}</span>
                    <div>
                      <p className="text-xs font-black text-[#191F28] mb-0.5">{f.label}</p>
                      <p className="text-[11px] text-[#8B95A1] leading-relaxed break-keep">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ── 장바구니 (데스크탑 고정) ──────────────── */}
          <div className="hidden md:block w-[270px] lg:w-72 sticky top-24 shrink-0">
            <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-5 border border-[#E5E8EB]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="inline-flex items-center gap-1.5 font-bold text-[#191F28] text-sm">
                  내 플랜
                  <ShoppingCart size={15} strokeWidth={2.25} className="text-[#3182F6]" />
                </h3>
                <span className="text-xs bg-blue-100 text-[#3182F6] px-2 py-0.5 rounded-full font-bold">{cart.length}개</span>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-2xl bg-[#F2F4F6] mx-auto mb-3 flex items-center justify-center">
                    <ShoppingBasket size={22} strokeWidth={1.75} className="text-[#B0B8C1]" />
                  </div>
                  <p className="text-xs text-[#8B95A1] break-keep leading-relaxed">위에서 역할을 선택하거나<br/>기능을 직접 담아보세요</p>
                </div>
              ) : (
                <>
                  {/* 번들 할인 진행 바 */}
                  {nextTier && (
                    <div className="mb-4 bg-[#F8F9FA] rounded-xl p-3">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] text-[#4E5968] font-bold">할인까지</span>
                        <span className="text-[10px] font-black text-[#3182F6]">{nextTier.need}개 더 담으면 {nextTier.rate}% ↓</span>
                      </div>
                      <div className="h-1.5 bg-[#E5E8EB] rounded-full overflow-hidden">
                        <div className="h-full bg-[#3182F6] rounded-full transition-all"
                          style={{ width: `${Math.min((cart.length / (cart.length + nextTier.need)) * 100, 100)}%` }} />
                      </div>
                    </div>
                  )}
                  {discountRate > 0 && (
                    <div className="mb-3 inline-flex items-center gap-1.5 bg-[#EFF6FF] text-[#3182F6] text-[10px] font-black px-2.5 py-1 rounded-full">
                      🎉 번들 {Math.round(discountRate * 100)}% 할인 적용 중
                    </div>
                  )}

                  <div className="space-y-1.5 mb-4 max-h-52 overflow-y-auto pr-0.5">
                    {cartItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-[#F2F4F6]">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                            style={{ backgroundColor: item.iconColor + '15' }}>
                            <item.Icon size={11} strokeWidth={2.25} style={{ color: item.iconColor }} />
                          </span>
                          <span className="text-[11px] text-[#4E5968] font-medium truncate">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-bold text-[#10B981]">무료</span>
                          <button onClick={e => { e.stopPropagation(); toggle(item.id) }}
                            className="text-[#B0B8C1] hover:text-[#F04452] transition-colors">
                            <X size={13} strokeWidth={2.25} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-[#F2F4F6] pt-3.5 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[#191F28] font-bold">월 합계</span>
                      <span className="inline-flex items-baseline gap-1.5">
                        <span className="text-lg sm:text-xl font-black text-[#10B981]">0원</span>
                        <span className="text-[10px] text-[#B0B8C1] line-through">{total.toLocaleString()}원</span>
                      </span>
                    </div>
                    <p className="text-[10px] text-[#059669] font-semibold mt-1">베타 테스트 기간 · 전 기능 무료</p>
                  </div>

                  <Link href="/login"
                    className="flex items-center justify-center gap-1.5 w-full py-2.5 sm:py-3 bg-[#10B981] text-white font-bold text-sm rounded-xl hover:bg-[#059669] transition-all shadow-sm">
                    무료로 시작하기 <ArrowRight size={14} strokeWidth={2.5} />
                  </Link>
                  <button onClick={requestQuote}
                    className="flex items-center justify-center gap-1.5 w-full mt-2 py-2.5 bg-white border-2 border-[#3182F6] text-[#3182F6] font-bold text-sm rounded-xl hover:bg-[#EFF6FF] transition-all">
                    <MessageCircle size={13} strokeWidth={2.5} />
                    이 구성으로 문의하기
                  </button>
                  <p className="text-[10px] text-[#B0B8C1] text-center mt-2">신용카드 등록 없음 · 자동결제 없음</p>
                </>
              )}
            </div>

            {/* 인기 조합 */}
            <div className="bg-[#ECFDF5] rounded-2xl p-4 mt-3 border border-[#A7F3D0]">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#059669] mb-2.5">
                <Gift size={12} strokeWidth={2.5} />
                인기 조합 · 전부 무료
              </div>
              <div className="space-y-2 text-[11px] text-[#065F46]">
                <div className="flex items-center gap-1.5">
                  <span>🍜</span>
                  <span>사장님 기본 4종 <b className="text-[#10B981]">베타 무료</b></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span>📊</span>
                  <span>마케터 6종 풀세트 <b className="text-[#10B981]">베타 무료</b></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span>✍️</span>
                  <span>블로거·프리랜서 5종 <b className="text-[#10B981]">베타 무료</b></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── FAQ ───────────────────────────────────── */}
        <div className="max-w-2xl mx-auto mt-14 sm:mt-20">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-[#191F28] mb-2">자주 묻는 질문</h2>
            <p className="text-xs sm:text-sm text-[#8B95A1]">결제 전에 궁금한 점을 확인해보세요</p>
          </div>
          <div className="space-y-2.5">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-gray-50 transition-colors gap-3">
                  <span className="font-bold text-[#191F28] text-sm break-keep">Q. {faq.q}</span>
                  <ChevronDown size={16} strokeWidth={2.25}
                    className={`text-[#8B95A1] transition-transform shrink-0 ${openFaq === idx ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === idx && (
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-xs sm:text-sm text-[#4E5968] leading-relaxed break-keep border-t border-[#F2F4F6] pt-3.5">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── 하단 CTA ──────────────────────────────── */}
        <div className="max-w-2xl mx-auto mt-12 sm:mt-16 text-center">
          <div className="bg-gradient-to-br from-[#10B981] to-[#059669] rounded-2xl sm:rounded-3xl p-7 sm:p-10 md:p-12 text-white">
            <h3 className="text-xl sm:text-2xl md:text-3xl font-black mb-2.5 break-keep">아직 고민되신다면?</h3>
            <p className="text-green-50 mb-6 text-xs sm:text-sm leading-relaxed break-keep">
              지금은 <b className="underline">베타 테스트 기간 · 전 기능 무료</b>예요.<br/>
              신용카드 등록도, 자동결제도 없으니 부담 없이 써보세요.
            </p>
            <Link href="/login"
              className="inline-flex items-center gap-2 bg-white text-[#059669] font-black px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl hover:bg-gray-50 transition-all shadow-lg text-sm sm:text-base">
              지금 바로 무료 시작하기
              <ArrowRight size={16} strokeWidth={2.5} />
            </Link>
          </div>
        </div>

        {/* ── 모바일 장바구니 하단 고정 ─────────────── */}
        {cart.length > 0 && (
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E8EB] p-3 shadow-xl z-50 safe-area-pb">
            <div className="flex items-end justify-between mb-2">
              <div>
                <div className="text-[10px] text-[#8B95A1]">{cart.length}개 선택 · 베타 테스트 기간</div>
                <div className="inline-flex items-baseline gap-1.5">
                  <span className="text-base font-black text-[#10B981]">무료</span>
                  <span className="text-[10px] text-[#B0B8C1] line-through">월 {total.toLocaleString()}원</span>
                </div>
              </div>
              <Link href="/login"
                className="inline-flex items-center gap-1 bg-[#10B981] text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-[#059669] transition-colors shadow-sm">
                무료로 시작 <ArrowRight size={12} strokeWidth={2.5} />
              </Link>
            </div>
            <button onClick={requestQuote}
              className="flex items-center justify-center gap-1.5 w-full py-2.5 bg-white border-2 border-[#3182F6] text-[#3182F6] font-bold text-xs rounded-xl hover:bg-[#EFF6FF] transition-colors">
              <MessageCircle size={12} strokeWidth={2.5} />
              이 구성 그대로 문의하기
            </button>
          </div>
        )}

      </div>
      <div className="-mx-4 sm:-mx-6 md:-mx-8 mt-16">
        <Footer />
      </div>
      </main>
    </div>
  )
}
