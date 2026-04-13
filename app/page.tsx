import Link from 'next/link'

const features = [
  { icon: '⭐', title: 'AI 리뷰 자동 답글', desc: '네이버·배민·쿠팡이츠 리뷰를 AI가 24시간 분석하고 맞춤 답글을 달아줍니다. 응답률 100% 달성.' },
  { icon: '👥', title: 'CRM 고객관리', desc: '단골 고객 데이터를 자동 수집·분석해 재방문율을 높이는 맞춤 마케팅을 실행합니다.' },
  { icon: '💬', title: '알림톡 마케팅', desc: '카카오 알림톡으로 이벤트, 쿠폰, 단골 감사 메시지를 클릭 몇 번으로 발송합니다.' },
  { icon: '📋', title: 'AI 정산·행정', desc: '매출 분석, 세금계산서 발행, 경비 관리까지 자동화. 행정 시간을 90% 줄여줍니다.' },
  { icon: '📍', title: '로컬 시너지', desc: '주변 상권 분석과 QR 공동 이벤트로 인근 가게와 함께 매출을 올립니다.' },
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

const plans = [
  { name: 'BASIC', price: '29,000', unit: '월', color: 'border-gray-200', badge: '', features: ['AI 리뷰 답글 100건/월', 'CRM 고객 50명', '알림톡 50건/월', '기본 매출 분석'] },
  { name: 'PRO', price: '59,000', unit: '월', color: 'border-blue-500', badge: '인기', features: ['AI 리뷰 답글 무제한', 'CRM 고객 무제한', '알림톡 500건/월', '상세 매출·정산 분석', '로컬 시너지 기능', '우선 고객 지원'] },
  { name: 'BUSINESS', price: '99,000', unit: '월', color: 'border-gray-200', badge: '', features: ['PRO 모든 기능', '알림톡 2,000건/월', '다점포 관리', '전담 매니저', 'API 연동'] },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* 네비게이션 */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <img src="/logo.png" alt="로컬루션" className="h-8 w-auto object-contain" />
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 font-medium px-3 py-1.5">로그인</Link>
            <Link href="/login" className="text-sm bg-blue-500 text-white font-semibold px-4 py-2 rounded-xl hover:bg-blue-600 transition-colors shadow-sm shadow-blue-200">
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
            복잡한 가게 운영을 로컬루션 하나로 해결하세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login"
              className="bg-blue-500 text-white font-bold text-base px-8 py-4 rounded-2xl hover:bg-blue-600 transition-all shadow-md shadow-blue-200 active:scale-[0.98]">
              14일 무료 체험 →
            </Link>
            <Link href="/dashboard"
              className="bg-white text-gray-700 font-bold text-base px-8 py-4 rounded-2xl hover:bg-gray-50 transition-all border border-gray-200">
              데모 대시보드 보기
            </Link>
          </div>
          <p className="text-xs text-gray-400 mt-4">신용카드 불필요 · 언제든 해지 가능</p>
        </div>
      </section>

      {/* 숫자 통계 */}
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
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
              가게 운영의 모든 것, 하나로
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              흩어진 업무를 하나의 플랫폼에서. 사장님은 손님 맞이에만 집중하세요.
            </p>
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

      {/* 사용 흐름 */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-black text-gray-900 mb-14">시작이 쉬워요</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: '가입하기', desc: '네이버 또는 이메일로 30초 만에 가입. 가게 정보를 입력하면 바로 시작됩니다.' },
              { step: '02', title: '연동하기', desc: '네이버 플레이스, 배달 앱을 연결하면 리뷰와 데이터가 자동으로 모입니다.' },
              { step: '03', title: '자동화하기', desc: 'AI가 리뷰 답글을 달고, 알림톡을 보내고, 정산을 정리합니다.' },
            ].map(item => (
              <div key={item.step} className="text-center">
                <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center text-white font-black text-lg mx-auto mb-4 shadow-sm shadow-blue-200">{item.step}</div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
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

      {/* 요금제 */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-gray-900 mb-3">합리적인 요금제</h2>
            <p className="text-gray-500">14일 무료 체험 후 결정하세요. 언제든 해지 가능.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {plans.map(plan => (
              <div key={plan.name} className={`rounded-2xl border-2 ${plan.color} p-6 relative ${plan.badge ? 'shadow-lg shadow-blue-100' : ''}`}>
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">{plan.badge}</div>
                )}
                <div className="font-black text-gray-900 text-lg mb-1">{plan.name}</div>
                <div className="flex items-end gap-1 mb-5">
                  <span className="text-3xl font-black text-gray-900">{plan.price}</span>
                  <span className="text-gray-400 text-sm pb-1">원/{plan.unit}</span>
                </div>
                <ul className="space-y-2.5 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-blue-500 font-bold">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/login"
                  className={`block text-center py-3 rounded-xl font-bold text-sm transition-all ${plan.badge ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm shadow-blue-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  무료로 시작하기
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 최종 CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-blue-500 to-blue-600">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
            지금 바로 시작하세요
          </h2>
          <p className="text-blue-100 text-lg mb-8">
            14일 무료 체험. 신용카드 없이. 언제든 해지.
          </p>
          <Link href="/login"
            className="inline-block bg-white text-blue-600 font-black text-lg px-10 py-4 rounded-2xl hover:bg-blue-50 transition-all shadow-lg active:scale-[0.98]">
            무료 체험 시작하기 →
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
