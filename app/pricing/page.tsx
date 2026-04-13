'use client'
import { useState } from 'react'
import Link from 'next/link'

const FEATURES = [
  { id: 'ai-review', name: 'AI 리뷰 자동 답글', desc: '네이버·배민·쿠팡이츠 리뷰를 AI가 분석하고 맞춤 답글을 자동으로 생성합니다. 하루 5분으로 응답률 100% 달성.', price: 990, icon: '⭐', category: '사장님', popular: true },
  { id: 'alimtalk', name: '알림톡 마케팅', desc: '카카오 알림톡으로 단골 고객에게 쿠폰·이벤트를 발송. 월 100건 포함.', price: 990, icon: '💬', category: '사장님', popular: false },
  { id: 'accounting', name: 'AI 정산·행정', desc: '매출 자동 정리, 세금계산서 발행, 경비 관리를 AI가 도와줍니다.', price: 990, icon: '📋', category: '사장님', popular: false },
  { id: 'local-synergy', name: '로컬 시너지', desc: '주변 가게와 QR 공동이벤트, 상권 분석으로 손님을 함께 끌어모읍니다.', price: 990, icon: '📍', category: '사장님', popular: false },
  { id: 'qr-stamp', name: 'QR 스탬프 적립', desc: '디지털 스탬프 카드로 재방문율을 높이세요. QR 코드 하나로 시작.', price: 990, icon: '🎫', category: '사장님', popular: false },
  { id: 'keyword', name: '키워드 분석', desc: '네이버 검색량, 경쟁도, 연관 키워드를 실시간 분석해 상위 노출 전략을 세웁니다.', price: 1990, icon: '🔍', category: '마케터', popular: true },
  { id: 'blog-ai', name: 'AI 블로그 포스팅', desc: 'SEO 최적화된 블로그 글을 AI가 초안 작성. 키워드 자동 삽입, 이미지 배치 제안.', price: 1490, icon: '✍️', category: '마케터', popular: false },
  { id: 'competitor', name: '경쟁사 분석', desc: '주변 경쟁 업체의 리뷰 동향, 키워드, 마케팅 전략을 자동 모니터링합니다.', price: 1990, icon: '🎯', category: '마케터', popular: false },
  { id: 'report', name: '마케팅 성과 리포트', desc: '유입, 전환, 매출 연동 마케팅 효과를 주간·월간 리포트로 자동 발송합니다.', price: 990, icon: '📊', category: '마케터', popular: false },
  { id: 'crm', name: 'CRM 고객관리', desc: '고객 방문 이력, 결제 금액, 등급을 자동 분류. 단골·VIP 맞춤 관리.', price: 1290, icon: '👥', category: '공통', popular: true },
  { id: 'ai-chat', name: 'AI 비서 채팅', desc: '사장님 전용 AI 상담사. 매출 질문, 마케팅 조언, 운영 팁을 24시간 답변.', price: 990, icon: '🤖', category: '공통', popular: false },
  { id: 'sns-manage', name: 'SNS 자동 포스팅', desc: '인스타그램·네이버 블로그에 AI가 만든 콘텐츠를 예약 자동 발행합니다.', price: 1490, icon: '📱', category: '공통', popular: false },
]

const CATEGORY_STYLE: Record<string, string> = {
  '사장님': 'bg-blue-100 text-blue-600',
  '마케터': 'bg-purple-100 text-purple-600',
  '공통': 'bg-green-100 text-green-600',
}

const FILTERS = ['전체', '사장님', '마케터', '공통'] as const
type FilterType = typeof FILTERS[number]

export default function PricingPage() {
  const [cart, setCart] = useState<string[]>([])
  const [filter, setFilter] = useState<FilterType>('전체')

  const toggleCart = (id: string) => {
    setCart(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const cartItems = FEATURES.filter(f => cart.includes(f.id))
  const total = cartItems.reduce((sum, f) => sum + f.price, 0)
  const displayed = filter === '전체' ? FEATURES : FEATURES.filter(f => f.category === filter)

  return (
    <div className="min-h-screen bg-[#F2F4F6]">
      {/* 네비 */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/"><img src="/logo.png" alt="로컬루션" className="h-8 w-auto object-contain" /></Link>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm text-gray-600 font-medium hover:text-gray-900">대시보드</Link>
            <Link href="/login" className="text-sm bg-blue-500 text-white font-semibold px-4 py-2 rounded-xl hover:bg-blue-600 transition-colors shadow-sm">무료 시작</Link>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-32 px-4 max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-600 text-xs font-bold px-3 py-1.5 rounded-full mb-4">🛒 내가 쓸 기능만 골라 담기</div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">필요한 기능만, 딱 그만큼만</h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">정해진 요금제 없이 원하는 기능을 직접 골라 담으세요.<br/>평균 <span className="font-bold text-blue-500">월 3,000원대</span>로 시작할 수 있어요.</p>
        </div>

        <div className="flex gap-6 items-start">
          {/* 기능 목록 */}
          <div className="flex-1 min-w-0">
            {/* 필터 탭 */}
            <div className="flex gap-2 mb-5 flex-wrap">
              {FILTERS.map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${filter === f ? 'bg-blue-500 text-white border-blue-500 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                  {f === '전체' ? '🔎 전체' : f === '사장님' ? '🏪 사장님용' : f === '마케터' ? '📣 마케터용' : '🤝 공통'}
                </button>
              ))}
            </div>

            {/* 기능 카드 */}
            <div className="grid md:grid-cols-2 gap-3">
              {displayed.map(feature => {
                const isInCart = cart.includes(feature.id)
                return (
                  <div key={feature.id} onClick={() => toggleCart(feature.id)}
                    className={`relative bg-white rounded-2xl p-5 cursor-pointer transition-all border-2 select-none ${isInCart ? 'border-blue-500 shadow-md shadow-blue-100' : 'border-transparent hover:border-gray-200 shadow-sm'}`}>
                    {feature.popular && (
                      <span className="absolute -top-2.5 left-5 bg-blue-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">인기</span>
                    )}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-11 h-11 bg-gray-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">{feature.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-gray-900 text-sm leading-tight">{feature.name}</div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold mt-1 inline-block ${CATEGORY_STYLE[feature.category]}`}>{feature.category}용</span>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${isInCart ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                            {isInCart && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed mb-3">{feature.desc}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-black text-gray-900">{feature.price.toLocaleString()}<span className="text-xs font-normal text-gray-400">원/월</span></span>
                      <span className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${isInCart ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                        {isInCart ? '✓ 담김' : '+ 담기'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 장바구니 (데스크탑) */}
          <div className="hidden md:block w-[280px] flex-shrink-0 sticky top-24">
            <div className="bg-white rounded-2xl shadow-sm p-5 mb-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 text-base">내 플랜 🛒</h3>
                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold">{cart.length}개 선택</span>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🧺</div>
                  <div className="text-sm text-gray-400">왼쪽에서 기능을<br/>골라 담아보세요</div>
                </div>
              ) : (
                <>
                  <div className="space-y-2 mb-4 max-h-60 overflow-y-auto pr-1">
                    {cartItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base flex-shrink-0">{item.icon}</span>
                          <span className="text-xs text-gray-700 font-medium truncate">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                          <span className="text-xs font-bold text-gray-900">{item.price.toLocaleString()}원</span>
                          <button onClick={(e) => { e.stopPropagation(); toggleCart(item.id) }}
                            className="text-gray-300 hover:text-red-400 text-sm font-bold w-4 h-4 flex items-center justify-center">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-100 pt-3 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 font-medium">월 합계</span>
                      <span className="text-xl font-black text-blue-500">{total.toLocaleString()}원</span>
                    </div>
                    <div className="text-[11px] text-gray-400 text-right mt-0.5">VAT 포함 · 언제든 변경 가능</div>
                  </div>
                  <Link href="/login"
                    className="block w-full py-3 bg-blue-500 text-white font-bold text-sm rounded-xl hover:bg-blue-600 transition-colors shadow-sm text-center">
                    14일 무료로 시작하기 →
                  </Link>
                  <p className="text-[11px] text-gray-400 text-center mt-2">신용카드 불필요</p>
                </>
              )}
            </div>

            <div className="bg-blue-50 rounded-2xl p-4">
              <div className="text-xs font-bold text-blue-700 mb-2">💡 추천 조합</div>
              <div className="space-y-1.5 text-xs text-blue-600">
                <div>🏪 사장님 기본 → <b>2,970원/월</b></div>
                <div>📣 마케터 기본 → <b>5,470원/월</b></div>
                <div>🚀 전체 기능 → <b>{FEATURES.reduce((s, f) => s + f.price, 0).toLocaleString()}원/월</b></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 모바일 장바구니 하단 고정 */}
      {cart.length > 0 && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">{cart.length}개 기능 선택</div>
              <div className="text-lg font-black text-blue-500">월 {total.toLocaleString()}원</div>
            </div>
            <Link href="/login" className="bg-blue-500 text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-blue-600 transition-colors shadow-sm">
              무료로 시작하기 →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
