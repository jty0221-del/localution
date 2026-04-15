'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import TopNav from '../components/TopNav'

type Feature = {
  id: string
  name: string
  desc: string
  price: number
  icon: string
  category: '사장님' | '마케터' | '공통'
  popular?: boolean
}

const features: Feature[] = [
  { id: 'ai-review',    name: 'AI 리뷰 자동 답글',  desc: '네이버·배민·쿠팡이츠 리뷰를 AI가 분석하고 맞춤 답글 자동 생성. 하루 5분으로 100% 응답률 달성.',         price:  990, icon: '⭐', category: '사장님', popular: true },
  { id: 'alimtalk',     name: '알림톡 마케팅',       desc: '카카오 알림톡으로 단골 고객에게 쿠폰·이벤트 소식 발송. 월 100건 포함.',                                  price:  990, icon: '💬', category: '사장님' },
  { id: 'accounting',   name: 'AI 정산·행정',        desc: '매출 자동 정리, 세금계산서 발행, 경비 관리를 AI가 도와줍니다.',                                           price:  990, icon: '📋', category: '사장님' },
  { id: 'local-synergy',name: '로컬 시너지',         desc: '주변 가게와 QR 공동이벤트, 상권 분석으로 손님을 함께 끌어모읍니다.',                                       price:  990, icon: '📍', category: '사장님' },
  { id: 'qr-stamp',     name: 'QR 스탬프 적립',      desc: '디지털 스탬프 카드로 재방문율을 높이세요. QR 코드 하나로 시작.',                                           price:  990, icon: '🎫', category: '사장님' },
  { id: 'keyword',      name: '키워드 분석',         desc: '네이버 검색량, 경쟁도, 연관 키워드를 실시간 분석. 블로그·플레이스 상위 노출 전략 수립.',                    price: 1990, icon: '🔍', category: '마케터', popular: true },
  { id: 'blog-ai',      name: 'AI 블로그 포스팅',    desc: 'SEO 최적화된 블로그 글을 AI가 초안 작성. 키워드 자동 삽입, 이미지 배치 제안.',                             price: 1490, icon: '✍️', category: '마케터' },
  { id: 'competitor',   name: '경쟁사 분석',         desc: '주변 경쟁 업체의 리뷰 동향, 키워드, 마케팅 전략을 자동 모니터링.',                                         price: 1990, icon: '🎯', category: '마케터' },
  { id: 'report',       name: '마케팅 성과 리포트',  desc: '유입, 전환, 매출 연동 마케팅 효과를 주간·월간 리포트로 자동 발송.',                                         price:  990, icon: '📊', category: '마케터' },
  { id: 'crm',          name: 'CRM 고객관리',        desc: '고객 방문 이력, 결제 금액, 등급을 자동 분류. 단골·VIP 맞춤 관리.',                                          price: 1290, icon: '👥', category: '공통', popular: true },
  { id: 'ai-chat',      name: 'AI 비서 채팅',        desc: '사장님 전용 AI 상담사. 매출 질문, 마케팅 조언, 운영 팁을 24시간 답변.',                                      price:  990, icon: '🤖', category: '공통' },
  { id: 'sns-manage',   name: 'SNS 자동 포스팅',     desc: '인스타그램·네이버 블로그에 AI가 만든 콘텐츠를 예약 자동 발행.',                                             price: 1490, icon: '📱', category: '공통' },
]

const categoryColor: Record<string, string> = {
  '사장님': 'bg-blue-100 text-blue-600',
  '마케터': 'bg-purple-100 text-purple-600',
  '공통':   'bg-green-100 text-green-600',
}

export default function PricingPage() {
  const [cart,   setCart]   = useState<string[]>([])
  const [filter, setFilter] = useState<'전체' | '사장님' | '마케터' | '공통'>('전체')

  const toggle = (id: string) =>
    setCart(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const cartItems = features.filter(f => cart.includes(f.id))
  const total     = cartItems.reduce((sum, f) => sum + f.price, 0)
  const filtered  = filter === '전체' ? features : features.filter(f => f.category === filter)

  return (
    <div className="min-h-screen bg-[#F2F4F6]">

            <TopNav />

      <div className="pt-24 pb-20 px-4 max-w-6xl mx-auto">

        {/* 헤더 */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-[#3182F6] text-xs font-bold px-3 py-1.5 rounded-full mb-4">
            🛒 내가 쓸 기능만 골라 담기
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-[#191F28] mb-3">
            필요한 기능만, 딱 그만큼만
          </h1>
          <p className="text-[#4E5968] text-lg max-w-xl mx-auto">
            정해진 요금제 없이 원하는 기능을 골라 담으세요.<br/>
            평균 <span className="font-bold text-[#3182F6]">월 3,000원대</span>로 시작할 수 있어요.
          </p>
        </div>

        <div className="flex gap-6 items-start">

          {/* 왼쪽: 기능 목록 */}
          <div className="flex-1">
            {/* 필터 */}
            <div className="flex gap-2 mb-5 flex-wrap">
              {(['전체', '사장님', '마케터', '공통'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    filter === f
                      ? 'bg-[#3182F6] text-white shadow-sm'
                      : 'bg-white text-[#4E5968] hover:bg-gray-50 border border-[#E5E8EB]'
                  }`}>
                  {f === '전체' ? '🔎 전체' : f === '사장님' ? '🏪 사장님용' : f === '마케터' ? '📣 마케터용' : '🤝 공통'}
                </button>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              {filtered.map(feature => {
                const inCart = cart.includes(feature.id)
                return (
                  <div key={feature.id}
                    onClick={() => toggle(feature.id)}
                    className={`relative bg-white rounded-2xl p-5 shadow-sm cursor-pointer transition-all border-2 ${
                      inCart ? 'border-[#3182F6] shadow-blue-100' : 'border-transparent hover:border-[#E5E8EB]'
                    }`}>
                    {feature.popular && (
                      <div className="absolute -top-2.5 left-4 bg-[#3182F6] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">인기</div>
                    )}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 bg-[#F2F4F6] rounded-xl flex items-center justify-center text-xl">{feature.icon}</div>
                        <div>
                          <div className="font-bold text-[#191F28] text-sm">{feature.name}</div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${categoryColor[feature.category]}`}>{feature.category}용</span>
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 transition-all ${
                        inCart ? 'bg-[#3182F6] border-[#3182F6]' : 'border-[#E5E8EB]'
                      }`}>
                        {inCart && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                    </div>
                    <p className="text-xs text-[#8B95A1] leading-relaxed mb-3">{feature.desc}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-black text-[#191F28]">{feature.price.toLocaleString()}원<span className="text-xs font-normal text-[#8B95A1]">/월</span></span>
                      <span className={`text-xs font-bold px-3 py-1 rounded-lg transition-all ${
                        inCart ? 'bg-[#3182F6] text-white' : 'bg-[#F2F4F6] text-[#4E5968]'
                      }`}>
                        {inCart ? '✓ 담김' : '+ 담기'}
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
                <h3 className="font-bold text-[#191F28]">내 플랜 🛒</h3>
                <span className="text-xs bg-blue-100 text-[#3182F6] px-2 py-0.5 rounded-full font-bold">{cart.length}개 선택</span>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🧺</div>
                  <div className="text-sm text-[#8B95A1]">기능을 골라 담아보세요</div>
                </div>
              ) : (
                <>
                  <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                    {cartItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between py-2 border-b border-[#F2F4F6]">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{item.icon}</span>
                          <span className="text-xs text-[#4E5968] font-medium">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#191F28]">{item.price.toLocaleString()}원</span>
                          <button onClick={(e) => { e.stopPropagation(); toggle(item.id) }} className="text-[#E5E8EB] hover:text-[#F04452] text-sm">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-[#F2F4F6] pt-4 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#8B95A1]">월 합계</span>
                      <span className="text-xl font-black text-[#3182F6]">{total.toLocaleString()}원</span>
                    </div>
                    <div className="text-xs text-[#B0B8C1] text-right mt-0.5">VAT 포함 · 언제든 변경 가능</div>
                  </div>

                  <Link href="/login"
                    className="block w-full py-3 bg-[#3182F6] text-white font-bold text-sm rounded-xl hover:bg-[#1B64DA] transition-all shadow-sm shadow-blue-200 text-center">
                    14일 무료로 시작하기 →
                  </Link>
                  <p className="text-[11px] text-[#B0B8C1] text-center mt-2">신용카드 불필요 · 무료 체험 후 결제</p>
                </>
              )}
            </div>

            <div className="bg-blue-50 rounded-2xl p-4 mt-3">
              <div className="text-xs font-bold text-[#3182F6] mb-2">💡 이런 분들께 추천해요</div>
              <div className="space-y-1.5 text-xs text-[#4E5968]">
                <div>🏪 사장님 → 리뷰+알림톡+정산 = <b className="text-[#3182F6]">2,970원/월</b></div>
                <div>📣 마케터 → 키워드+블로그+경쟁사 = <b className="text-[#3182F6]">5,470원/월</b></div>
                <div>🤝 모두 담기 → 전체 기능 = <b className="text-[#3182F6]">{features.reduce((s, f) => s + f.price, 0).toLocaleString()}원/월</b></div>
              </div>
            </div>
          </div>
        </div>

        {/* 모바일 장바구니 하단 고정 */}
        {cart.length > 0 && (
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E8EB] p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs text-[#8B95A1]">{cart.length}개 기능 선택</div>
                <div className="text-lg font-black text-[#3182F6]">월 {total.toLocaleString()}원</div>
              </div>
              <Link href="/login" className="bg-[#3182F6] text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-[#1B64DA] transition-colors shadow-sm">
                무료로 시작하기 →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
