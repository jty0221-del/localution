import Link from 'next/link'

const features = [
  { icon: '⭐', title: 'AI 리뷰 자동 답글', desc: '네이버·배민·쿠팡이츠 리뷰를 AI가 24시간 분석하고 맞춤 답글을 달아줍니다.' },
  { icon: '👥', title: 'CRM 고객관리', desc: '단골 고객 데이터를 자동 수집·분석해 재방문율을 높이는 맞춤 마케팅을 실행합니다.' },
  { icon: '💬', title: '알림톡 마케팅', desc: '카카오 알림톡으로 이벤트, 쿠폰, 단골 감사 메시지를 클릭 몇 번으로 발송합니다.' },
  { icon: '📋', title: 'AI 정산·행정', desc: '매출 분석, 세금계산서 발행, 경비 관리까지 자동화. 행정 시간을 90% 줄여줍니다.' },
  { icon: '🔍', title: '키워드 분석', desc: '네이버 검색량과 경쟁도를 분석해 블로그·플레이스 상위 노출 전략을 세웁니다.' },
  { icon: '🤖', title: 'AI 비서 통합', desc: '모든 기능이 하나의 대시보드에. 사장님은 장사에만 집중하세요.' },
]

const stats = [
  { value: '2,400+', label: '이용 중인 사장님' },
  { value: '94%', label: '리뷰 응답률 향상' },
  { value: '31%', label: '평균 매출 증가' },
  { value: '5분', label: '하루 평균 관리 시간' },
]

const testimonials = [
  { name: '김○○ 사장님', biz: '부천 카페', stars: 5, text: '리뷰 답글 달 시간도 없었는데 AI가 다 해줘서 별점이 4.2에서 4.8로 올랐어요. 대박입니다.' },
  { name: '이○○ 사장님', biz: '인천 치킨집', stars: 5, text: '알림톡 쿠폰 보내고 나서 단골 재방문이 확 늘었어요. 이런 게 있는 줄 몰랐네요.' },
  { name: '박○○ 사장님', biz: '서울 미용실', stars: 5, text: '세금계산서 발행이랑 매출 정리를 혼자 다 했는데 이제 10분이면 끝나요. 진짜 편해요.' },
]

const samplePlans = [
  { label: '🏪 사장님 기본', features: ['AI 리뷰 답글', '알림톡 마케팅', 'AI 정산'], total: 2970 },
  { label: '📣 마케터 기본', features: ['키워드 분석', 'AI 블로그 포스팅', '경쟁사 분석'], total: 5470 },
  { label: '🚀 올인원', features: ['전체 기능 12개'], total: 15890 },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* 네비게이션 */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <img src="/logo.png" alt="로컬루션" className="h-8 w-auto object-contain" />
          <div className="flex items-center gap-3">
            <Link href="/pricing" className="text-sm text-gray-600 font-medium hover:text-gray-900">요금제</Link>
            <Link href="/login" className="text-sm text-gray-600 font-medium">로그인</Link>
            <Link href="/pricing" className="text-sm bg-blue-500 text-white font-semibold px-4 py-2 rounded-xl hover:bg-blue-600 transition-colors shadow-sm shadow-blue-200">
              무료로 시작하기
            </Link>
          </div>
        </div>
      </nav>

      {/* 히어로 */}
      <section className="pt-32 pb-20 px-4 text-center bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            🚀 소상공인 AI 혁명 — 지금 시작하세요
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-gray-900 leading-tight mb-6">
            사장님의 매출을 올리는<br/>
            <span className="text-blue-500">AI 만능 비서</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            리뷰 관리, 고객 CRM, 알림톡 마케팅, 정산까지.<br/>
            필요한 기능만 골라 <span className="font-bold text-gray-700">월 990원</span>부터 시작하세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/pricing"
              className="bg-blue-500 text-white font-bold text-base px-8 py-4 rounded-2xl hover:bg-blue-600 transition-all shadow-md shadow-blue-200">
              🛒 기능 골라 담기 →
            </Link>
            <Link href="/dashboard"
              className="bg-white text-gray-700 font-bold text-base px-8 py-4 rounded-2xl hover:bg-gray-50 transition-all border border-gray-200">
              데모 대시보드 보기
            </Link>
          </div>
          <p className="text-xs text-gray-400 mt-4">신용카드 불필요 · 14일 무료 체험 · 언제든 해지</p>
        </div>
      </section>

      {/* 통계 */}
      <section className="py-16 bg-blue-500">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map(stat => (
              <div key={stat.label}>
                <div className="text-3xl md:text-4xl font-black text-white mb-1">{stat.value}</div>
                <div className="text-blue-100 text-sm font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 기능 소개 */}
      <section className="py-20 px-4 bg-[#F2F4F6]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">가게 운영의 모든 것, 하나로</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">필요한 기능만 골라 사용하세요. 쓰지 않는 기능에는 한 푼도 내지 않아요.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {features.map(f => (
              <div key={f.title} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-2xl mb-4">{f.icon}</div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 커스텀 요금제 섹션 */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-gray-900 mb-3">내가 만드는 요금제</h2>
            <p className="text-gray-500 text-lg">정해진 플랜 없이, 쓸 기능만 골라 담으면 끝.</p>
          </div>

          {/* 샘플 플랜 예시 */}
          <div className="grid md:grid-cols-3 gap-4 mb-10">
            {samplePlans.map(plan => (
              <div key={plan.label} className="bg-[#F2F4F6] rounded-2xl p-5">
                <div className="font-bold text-gray-900 mb-3">{plan.label}</div>
                <ul className="space-y-1.5 mb-4">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-blue-500">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <div className="flex items-end gap-1">
                  <span className="text-2xl font-black text-blue-500">{plan.total.toLocaleString()}</span>
                  <span className="text-gray-400 text-sm pb-1">원/월</span>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-black text-white mb-2">나만의 플랜 만들기</h3>
            <p className="text-blue-100 mb-6">기능 하나하나를 장바구니에 담고, 합계를 확인해보세요.</p>
            <Link href="/pricing"
              className="inline-block bg-white text-blue-600 font-black px-8 py-3 rounded-xl hover:bg-blue-50 transition-all shadow-md">
              🛒 지금 기능 고르러 가기 →
            </Link>
          </div>
        </div>
      </section>

      {/* 후기 */}
      <section className="py-20 px-4 bg-[#F2F4F6]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-black text-gray-900 text-center mb-12">사장님들의 이야기</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {testimonials.map(t => (
              <div key={t.name} className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="text-yellow-400 text-lg mb-3">{'★'.repeat(t.stars)}</div>
                <p className="text-gray-700 text-sm leading-relaxed mb-4">"{t.text}"</p>
                <div>
                  <div className="font-bold text-gray-900 text-sm">{t.name}</div>
                  <div className="text-gray-400 text-xs">{t.biz}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 최종 CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-blue-500 to-blue-600">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">월 990원으로 시작하세요</h2>
          <p className="text-blue-100 text-lg mb-8">필요한 기능만, 딱 그만큼만. 14일 무료 체험.</p>
          <Link href="/pricing"
            className="inline-block bg-white text-blue-600 font-black text-lg px-10 py-4 rounded-2xl hover:bg-blue-50 transition-all shadow-lg">
            🛒 기능 골라 담기 →
          </Link>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="py-10 px-4 bg-gray-900 text-center">
        <img src="/logo.png" alt="로컬루션" className="h-7 w-auto mx-auto mb-4 opacity-70 object-contain" />
        <p className="text-gray-500 text-xs">© 2026 로컬루션 (Localution). All rights reserved.</p>
        <p className="text-gray-600 text-xs mt-1">하랑마케팅 · 사업자등록번호: 000-00-00000</p>
      </footer>
    </div>
  )
}
