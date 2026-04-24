'use client'
// 🔧 force-dynamic 제거 (2026-04-19) — 공개 요금제 페이지라 정적 shell 허용
// 🔧 11차→12차 (2026-04-20) — features 배열 제거, app/lib/modules.ts SSOT 로 통합

import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'
import Link from 'next/link'
import {
  MessageCircle, FileText, MapPin, Ticket, QrCode,
  Search, PenLine, Target, BarChart3, Users, Bot, Smartphone, Share2,
  ChefHat, Store, Megaphone, Briefcase, Calculator, Bell, UserCheck,
  ShoppingCart, Percent, UserPlus, Check, ShoppingBasket, X,
  Gift, Plus, ArrowRight, ChevronDown, LucideIcon, TrendingUp,
  Layers, Zap,
} from 'lucide-react'
import { MODULES, calculateBundleDiscount, type ModuleId } from '../lib/modules'

// 모듈 ID → lucide 아이콘 매핑 (modules.ts 의 icon 문자열에 대응)
const ICON_MAP: Record<string, LucideIcon> = {
  MessageSquare: MessageCircle,
  Bell,
  Calculator,
  Users,
  QrCode,
  Search,
  PenLine,
  TrendingUp,
  BarChart3,
  UserCheck: Users,
  Bot,
  Share2: Smartphone,
  Layers,
  Zap,
}

// 카테고리별 아이콘 색상 (UI 유지용)
const CATEGORY_ICON_COLOR: Record<string, string> = {
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
}

// 중앙 SSOT 에서 자동 생성 — 37차-6: 로컬루션에 실제로 구현된 모듈만 노출 (coming-soon 제외)
const features: Feature[] = MODULES
  .filter(m => m.status === 'live' || m.status === 'beta')
  .map(m => ({
    id: m.id,
    name: m.name,
    desc: m.desc,
    price: m.price,
    Icon: ICON_MAP[m.icon] || Search,
    iconColor: CATEGORY_ICON_COLOR[m.category],
    category: m.category,
    popular: m.popular,
  }))

const categoryColor: Record<string, string> = {
  '사장님': 'bg-blue-100 text-blue-600',
  '마케터': 'bg-purple-100 text-purple-600',
  '공통':   'bg-green-100 text-green-600',
}

// 번들 할인율 — modules.ts 의 calculateBundleDiscount 재사용
function getDiscountRate(count: number): number {
  return calculateBundleDiscount(count)
}

function getNextTier(count: number): { need: number; rate: number } | null {
  if (count < 3) return { need: 3 - count, rate: 10 }
  if (count < 5) return { need: 5 - count, rate: 15 }
  if (count < 8) return { need: 8 - count, rate: 20 }
  return null
}


// 역할별 추천 번들 — 옵션 부담 없이 한 번에 시작
const PERSONAS = [
  {
    key: 'owner-solo',
    title: '1인 소상공인',
    desc: '혼자 매장 운영 · 리뷰/AI 답글 + 플랫폼 통합',
    Icon: ChefHat,
    color: '#FF6B35',
    features: ['ai-review', 'qr-stamp', 'alimtalk', 'crm', 'platform-hub'],
  },
  {
    key: 'owner-team',
    title: '자영업자',
    desc: '직원·가족 함께 운영 · 리뷰+성과+CRM+플랫폼',
    Icon: Store,
    color: '#3182F6',
    features: ['ai-review', 'qr-stamp', 'alimtalk', 'crm', 'report', 'ai-chat', 'platform-hub'],
  },
  {
    key: 'marketer',
    title: '마케터 · 대행사',
    desc: '키워드·블로그 순위·카드뉴스·경쟁사 All-in',
    Icon: Megaphone,
    color: '#8B5CF6',
    features: ['keyword', 'competitor', 'blog-ai', 'sns-manage', 'report', 'card-news', 'blog-tracking'],
  },
  {
    key: 'sales',
    title: '영업·다매장 관리',
    desc: 'CRM·성과 리포트·AI 비서·플랫폼 통합',
    Icon: Briefcase,
    color: '#059669',
    features: ['crm', 'report', 'ai-chat', 'ai-review', 'competitor', 'platform-hub'],
  },
] as const

const faqs = [
  {
    q: '정말 무료인가요? 나중에 돈 뜯기진 않나요?',
    a: '네, 베타 테스트 기간 동안은 모든 기능이 100% 무료예요. 회원가입 시 카드 등록을 받지 않기 때문에 자동결제가 발생할 수 없어요. 정식 출시 시점은 베타 사장님들께 최소 30일 전 카톡·이메일로 미리 안내드립니다.',
  },
  {
    q: '정식 출시 후엔 얼마인가요?',
    a: '기능별로 990원~1,990원 예정이고, 3개 이상 묶어 담으면 최대 20% 할인이 적용됩니다. 베타 기간에 써보신 사장님께는 별도 얼리버드 혜택도 드릴 예정이에요.',
  },
  {
    q: '중간에 기능을 추가하거나 빼도 되나요?',
    a: '네, 언제든 가능해요. 베타 기간에도 내 플랜에서 기능을 자유롭게 담고 빼보세요. 결제가 없으니 부담 없이 실험하시면 됩니다.',
  },
  {
    q: '해지는 쉽게 되나요?',
    a: '설정에서 1클릭 해지 가능합니다. 베타 기간은 결제 자체가 없어 해지 시 환불 이슈도 없어요. 정식 출시 후에도 당월 남은 일수만큼 일할 계산 환불됩니다.',
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

export default function PricingPage() {
  const [cart,   setCart]   = useState<string[]>([])
  const [filter, setFilter] = useState<'전체' | '사장님' | '마케터' | '공통'>('전체')
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const applyPersona = (features: readonly string[]) => {
    setCart(Array.from(new Set(features)))
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        const target = document.getElementById('pricing-feature-list')
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }
  const toggle = (id: string) =>
    setCart(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const cartItems = features.filter(f => cart.includes(f.id))
  const subtotal  = cartItems.reduce((sum, f) => sum + f.price, 0)
  const discountRate = getDiscountRate(cart.length)
  const discountAmount = Math.round(subtotal * discountRate)
  const total = subtotal - discountAmount
  const nextTier = getNextTier(cart.length)
  const filtered  = filter === '전체' ? features : features.filter(f => f.category === filter)

  // 장바구니를 1:1 문의로 연결 — 결제 PG 대신 견적 문의로 수주
  const requestQuote = () => {
    if (typeof window === 'undefined') return
    const items = features.filter(f => cart.includes(f.id)).map(f => ({ id: f.id, name: f.name, price: f.price }))
    const payload = {
      items,
      subtotal,
      discountRate,
      discountAmount,
      total,
      createdAt: new Date().toISOString(),
    }
    try { localStorage.setItem('localution.pricing_quote', JSON.stringify(payload)) } catch {}
    window.location.href = '/inquiry?source=pricing'
  }

  const FILTER_META: Record<string, { label: string; Icon: LucideIcon }> = {
    '전체':   { label: '전체',      Icon: Search },
    '사장님': { label: '사장님용',  Icon: Store },
    '마케터': { label: '마케터용',  Icon: Megaphone },
    '공통':   { label: '공통',      Icon: UserPlus },
  }

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex">
      <Sidebar />
      <main className="flex-1 md:ml-[220px] p-4 md:p-8 pt-8">

      <div className="max-w-6xl mx-auto pb-10">

        {/* 신뢰 배너 */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 bg-white border border-[#10B981]/30 rounded-full px-4 py-2 shadow-sm">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-xs font-bold text-[#059669]">베타 테스트 진행 중</span>
            <span className="text-xs text-[#8B95A1]">· 전국 400+ 사장님 · 전 기능 무료</span>
          </div>
        </div>

        {/* 헤더 */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 bg-[#ECFDF5] text-[#059669] text-xs font-bold px-3 py-1.5 rounded-full mb-4">
            <Gift size={12} strokeWidth={2.5} />
            베타 테스트 기간 · 전 기능 100% 무료
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-[#191F28] mb-3">
            지금은 모든 기능, 테스트 기간 무료
          </h1>
          <p className="text-[#4E5968] text-lg max-w-xl mx-auto">
            신용카드 등록 없음 · 자동결제 없음 · 언제든 1클릭 해지.<br/>
            <span className="font-bold text-[#059669]">필요한 기능을 담고 지금 바로 써보세요.</span>
          </p>
        </div>

        {/* 역할별 추천 번들 — 옵션 고민 없이 원클릭 시작 */}
        <div className="max-w-5xl mx-auto mb-8">
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#3182F6] mb-1">
              <Target size={12} strokeWidth={2.5} />
              어떤 분이세요?
            </div>
            <div className="text-sm text-[#4E5968]">역할에 맞는 기능을 한 번에 담아드려요. 언제든 수정 가능합니다.</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PERSONAS.map(p => (
              <button key={p.key} onClick={() => applyPersona(p.features)}
                className="bg-white rounded-2xl p-4 border border-[#E5E8EB] hover:border-[#3182F6] hover:shadow-md transition-all text-left group">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-2.5"
                  style={{ background: p.color + '18' }}>
                  <p.Icon size={22} strokeWidth={2} style={{ color: p.color }} />
                </div>
                <div className="font-black text-[#191F28] text-sm mb-1 group-hover:text-[#3182F6] transition-colors">{p.title}</div>
                <div className="text-[11px] text-[#8B95A1] leading-relaxed mb-2">{p.desc}</div>
                <div className="inline-flex items-center gap-1 text-[10px] font-bold text-[#3182F6]">
                  {p.features.length}개 기능 담기
                  <ArrowRight size={10} strokeWidth={2.5} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 베타 안내 박스 — 사기 우려 해소 */}
        <div className="max-w-3xl mx-auto mb-10 bg-gradient-to-br from-[#ECFDF5] to-[#F0FDF4] rounded-2xl p-5 border border-[#A7F3D0]">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="shrink-0 w-12 h-12 rounded-2xl bg-[#10B981] flex items-center justify-center">
              <Gift size={22} strokeWidth={2.25} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-black text-[#065F46] mb-1">
                베타 테스트 기간 — 모든 기능 무료로 써보세요
              </div>
              <p className="text-xs text-[#065F46]/80 leading-relaxed">
                신용카드 등록 안 받습니다. 자동결제 불가능합니다. 정식 출시는 <b>최소 30일 전</b> 카톡·이메일로 미리 안내드리고, 원치 않으면 해지만 하면 끝입니다.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-6 items-start">

          {/* 왼쪽: 기능 목록 */}
          <div id="pricing-feature-list" className="scroll-mt-6" />
          <div className="flex-1">
            {/* 필터 */}
            <div className="flex gap-2 mb-5 flex-wrap">
              {(['전체', '사장님', '마케터', '공통'] as const).map(f => {
                const meta = FILTER_META[f]
                const active = filter === f
                return (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      active
                        ? 'bg-[#3182F6] text-white shadow-sm'
                        : 'bg-white text-[#4E5968] hover:bg-gray-50 border border-[#E5E8EB]'
                    }`}>
                    <meta.Icon size={14} strokeWidth={2.25} />
                    {meta.label}
                  </button>
                )
              })}
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              {filtered.map(feature => {
                const inCart = cart.includes(feature.id)
                return (
                  <div key={feature.id}
                    onClick={() => toggle(feature.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(feature.id) } }}
                    role="button"
                    tabIndex={0}
                    aria-pressed={inCart}
                    aria-label={`${feature.name} ${inCart ? '선택 해제' : '장바구니에 추가'}`}
                    className={`relative bg-white rounded-2xl p-5 shadow-sm cursor-pointer transition-all border-2 focus:outline-none focus:ring-2 focus:ring-[#3182F6]/40 ${
                      inCart ? 'border-[#3182F6] shadow-blue-100' : 'border-transparent hover:border-[#E5E8EB]'
                    }`}>
                    {feature.popular && (
                      <div className="absolute -top-2.5 left-4 bg-[#3182F6] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">인기</div>
                    )}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: feature.iconColor + '15' }}>
                          <feature.Icon size={20} strokeWidth={2} style={{ color: feature.iconColor }} />
                        </div>
                        <div>
                          <div className="font-bold text-[#191F28] text-sm">{feature.name}</div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${categoryColor[feature.category]}`}>{feature.category}용</span>
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 transition-all ${
                        inCart ? 'bg-[#3182F6] border-[#3182F6]' : 'border-[#E5E8EB]'
                      }`}>
                        {inCart && <Check size={14} strokeWidth={3} className="text-white" />}
                      </div>
                    </div>
                    <p className="text-xs text-[#8B95A1] leading-relaxed mb-3">{feature.desc}</p>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-baseline gap-1.5">
                        <span className="text-base font-black text-[#10B981]">테스트 기간 무료</span>
                        <span className="text-[11px] text-[#B0B8C1] line-through">{feature.price.toLocaleString()}원/월</span>
                      </span>
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-lg transition-all ${
                        inCart ? 'bg-[#3182F6] text-white' : 'bg-[#F2F4F6] text-[#4E5968]'
                      }`}>
                        {inCart
                          ? <><Check size={12} strokeWidth={3} /> 담김</>
                          : <><Plus  size={12} strokeWidth={3} /> 담기</>}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 오른쪽: 장바구니 (데스크탑) */}
          <div className="hidden md:block w-72 sticky top-24">
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="inline-flex items-center gap-1.5 font-bold text-[#191F28]">
                  내 플랜
                  <ShoppingCart size={16} strokeWidth={2.25} className="text-[#3182F6]" />
                </h3>
                <span className="text-xs bg-blue-100 text-[#3182F6] px-2 py-0.5 rounded-full font-bold">{cart.length}개 선택</span>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-14 h-14 rounded-2xl bg-[#F2F4F6] mx-auto mb-3 flex items-center justify-center">
                    <ShoppingBasket size={26} strokeWidth={1.75} className="text-[#8B95A1]" />
                  </div>
                  <div className="text-sm text-[#8B95A1]">기능을 골라 담아보세요</div>
                </div>
              ) : (
                <>
                  <div className="space-y-2 mb-4 max-h-56 overflow-y-auto">
                    {cartItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between py-2 border-b border-[#F2F4F6]">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: item.iconColor + '15' }}>
                            <item.Icon size={12} strokeWidth={2.25} style={{ color: item.iconColor }} />
                          </span>
                          <span className="text-xs text-[#4E5968] font-medium truncate">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[11px] font-bold text-[#10B981]">무료</span>
                          <button onClick={(e) => { e.stopPropagation(); toggle(item.id) }} className="text-[#B0B8C1] hover:text-[#F04452] transition-colors">
                            <X size={14} strokeWidth={2.25} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-[#F2F4F6] pt-4 mb-4 space-y-1.5">
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-sm text-[#191F28] font-bold">월 합계</span>
                      <span className="inline-flex items-baseline gap-1.5">
                        <span className="text-xl font-black text-[#10B981]">0원</span>
                        <span className="text-[10px] text-[#B0B8C1] line-through">{total.toLocaleString()}원</span>
                      </span>
                    </div>
                    <div className="text-[11px] text-[#059669] text-right font-semibold">베타 테스트 기간 · 전 기능 무료</div>
                  </div>

                  <Link href="/login"
                    className="flex items-center justify-center gap-1.5 w-full py-3 bg-[#10B981] text-white font-bold text-sm rounded-xl hover:bg-[#059669] transition-all shadow-sm shadow-green-200 text-center">
                    무료로 시작하기
                    <ArrowRight size={14} strokeWidth={2.5} />
                  </Link>
                  <button onClick={requestQuote}
                    className="flex items-center justify-center gap-1.5 w-full mt-2 py-3 bg-white border-2 border-[#3182F6] text-[#3182F6] font-bold text-sm rounded-xl hover:bg-[#EFF6FF] transition-all">
                    <MessageCircle size={14} strokeWidth={2.5} />
                    이 구성 그대로 문의하기
                  </button>
                  <p className="text-[11px] text-[#B0B8C1] text-center mt-2">신용카드 등록 없음 · 자동결제 없음</p>
                </>
              )}
            </div>

            <div className="bg-[#ECFDF5] rounded-2xl p-4 mt-3 border border-[#A7F3D0]">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#059669] mb-2">
                <Gift size={12} strokeWidth={2.5} />
                이런 조합 인기예요 · 전부 무료
              </div>
              <div className="space-y-1.5 text-xs text-[#065F46]">
                <div className="inline-flex items-center gap-1.5 w-full">
                  <Store size={12} strokeWidth={2.25} className="text-[#3182F6] flex-shrink-0" />
                  <span>사장님 기본 3종 <b className="text-[#10B981]">베타 무료</b></span>
                </div>
                <div className="inline-flex items-center gap-1.5 w-full">
                  <Megaphone size={12} strokeWidth={2.25} className="text-[#8B5CF6] flex-shrink-0" />
                  <span>마케터 5종 <b className="text-[#10B981]">베타 무료</b></span>
                </div>
                <div className="inline-flex items-center gap-1.5 w-full">
                  <UserPlus size={12} strokeWidth={2.25} className="text-[#059669] flex-shrink-0" />
                  <span>전체 12종 <b className="text-[#10B981]">베타 무료</b></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ 섹션 */}
        <div className="max-w-3xl mx-auto mt-20">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-black text-[#191F28] mb-2">자주 묻는 질문</h2>
            <p className="text-sm text-[#8B95A1]">결제 전에 궁금한 점을 확인해보세요</p>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors">
                  <span className="font-bold text-[#191F28] text-sm md:text-base">Q. {faq.q}</span>
                  <ChevronDown size={18} strokeWidth={2.25}
                    className={`text-[#8B95A1] transition-transform ${openFaq === idx ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 text-sm text-[#4E5968] leading-relaxed border-t border-[#F2F4F6] pt-4">
                    A. {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 하단 CTA */}
        <div className="max-w-3xl mx-auto mt-16 text-center">
          <div className="bg-gradient-to-br from-[#10B981] to-[#059669] rounded-3xl p-8 md:p-12 text-white shadow-xl shadow-green-200">
            <h3 className="text-2xl md:text-3xl font-black mb-3">아직 고민되신다면?</h3>
            <p className="text-green-50 mb-6 text-sm md:text-base">지금은 <b className="underline">베타 테스트 기간 · 전 기능 무료</b>예요.<br/>신용카드 등록도, 자동결제도 없으니 부담 없이 써보세요.</p>
            <Link href="/login" className="inline-flex items-center gap-2 bg-white text-[#059669] font-black px-8 py-4 rounded-2xl hover:bg-gray-50 transition-all shadow-lg">
              지금 바로 무료 시작하기
              <ArrowRight size={18} strokeWidth={2.5} />
            </Link>
          </div>
        </div>


        {/* 모바일 장바구니 하단 고정 */}
        {cart.length > 0 && (
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E8EB] p-3 shadow-lg z-50">
            <div className="flex items-end justify-between mb-2">
              <div>
                <div className="text-xs text-[#8B95A1]">{cart.length}개 선택 · 베타 테스트 기간</div>
                <div className="inline-flex items-baseline gap-1.5">
                  <span className="text-lg font-black text-[#10B981]">무료</span>
                  <span className="text-[10px] text-[#B0B8C1] line-through">월 {total.toLocaleString()}원</span>
                </div>
              </div>
              <Link href="/login" className="inline-flex items-center gap-1 bg-[#10B981] text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-[#059669] transition-colors shadow-sm">
                무료로 시작
                <ArrowRight size={12} strokeWidth={2.5} />
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
      {/* 푸터 — 랜딩 페이지와 동일 */}
      <div className="-mx-4 md:-mx-8 mt-20">
        <Footer />
      </div>
    </main>
    </div>
  )
}

