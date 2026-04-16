'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import TopNav from './components/TopNav'

const FEATURES = [
  {
    icon: '⭐',
    title: 'AI 리뷰 자동 답글',
    desc: '네이버·구글·배민 리뷰를 AI가 분석하고 맞춤 답글을 자동 생성해요. 하루 5분으로 100% 응답률 달성.',
    color: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50',
    tags: ['네이버', '구글', '배민', '카카오'],
  },
  {
    icon: '📱',
    title: 'QR 리뷰 자동화',
    desc: 'QR 코드 하나로 고객이 직접 AI 리뷰를 작성해요. 별점 5점 기본, 말투 6종, 사진 10장까지.',
    color: 'from-green-500 to-emerald-600',
    bg: 'bg-green-50',
    tags: ['QR 스캔', 'AI 생성', '네이버 연동'],
  },
  {
    icon: '👥',
    title: 'CRM 고객관리',
    desc: '방문 고객을 VIP·단골·신규로 자동 분류하고, 맞춤 메시지로 재방문을 유도해요.',
    color: 'from-purple-500 to-violet-600',
    bg: 'bg-purple-50',
    tags: ['자동 분류', '알림톡', '재방문 유도'],
  },
  {
    icon: '📋',
    title: 'AI 정산·행정',
    desc: '매출 자동 정리, 세금계산서 원클릭 발행, 근태·급여 계산까지. 행정 업무 90% 절감.',
    color: 'from-orange-500 to-amber-600',
    bg: 'bg-orange-50',
    tags: ['매출 캘린더', '세금계산서', '급여 계산'],
  },
]

const STATS = [
  { num: '2,400+', label: '등록 매장' },
  { num: '98만+', label: 'AI 답글 생성' },
  { num: '4.8점', label: '평균 별점 향상' },
  { num: '92%', label: '재방문율 개선' },
]

const TESTIMONIALS = [
  {
    name: '김○○ 사장님',
    store: '부천 카페 운영',
    text: '매일 리뷰 답글 다는 게 너무 힘들었는데, 로컬루션 쓰고 나서 5분도 안 걸려요. 별점도 4.2에서 4.8로 올라갔어요!',
    rating: 5,
    avatar: '☕',
  },
  {
    name: '이○○ 대표님',
    store: '서울 맛집 운영',
    label: '마케터',
    text: '클라이언트 10곳 동시 관리하는데 로컬루션 없으면 못 살아요. 키워드 분석이랑 리뷰 관리가 한 곳에 있어서 너무 편해요.',
    rating: 5,
    avatar: '🍽️',
  },
  {
    name: '박○○ 원장님',
    store: '일산 헬스장 운영',
    text: 'QR 리뷰 붙여놨더니 손님들이 알아서 리뷰 써줘요. 한 달에 리뷰 50개 이상 늘었어요.',
    rating: 5,
    avatar: '💪',
  },
]

const NAV_LINKS = [
  { href: '/service-intro', label: '서비스 소개' },
  { href: '/pricing', label: '요금' },
  { href: '/community', label: '커뮤니티' },
  { href: '/inquiry', label: '문의' },
]

export default function LandingPage() {
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const check = async () => {
      try {
        const cached = sessionStorage.getItem('localution_user')
        if (cached) { router.replace('/dashboard'); return }
        // sessionStorage 없으면 서버 세션 쿠키 확인
        const res = await fetch('/api/me', { credentials: 'include' })
        const data = await res.json()
        if (data?.user) {
          sessionStorage.setItem('localution_user', JSON.stringify(data.user))
          router.replace('/dashboard')
          return
        }
      } catch {}
      setChecked(true)
    }
    check()
  }, [router])

  if (!checked) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#3182F6] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

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
            리뷰 답글·QR 자동화·고객관리·정산까지<br className="hidden md:block" />
            복잡한 건 AI가, 사장님은 장사에만 집중하세요
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            
            <Link href="/service-intro"
              className="inline-flex items-center justify-center gap-2 bg-white text-[#191F28] font-semibold text-base px-8 py-4 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all hover:-translate-y-0.5">
              서비스 소개 보기
            </Link>
          </div>
          <p className="text-xs text-[#8B95A1] mt-4">신용카드 불필요 · 무료 체험 가능</p>
        </div>
      </section>

      {/* ── 통계 ── */}
      <section className="py-12 px-4 bg-white border-y border-gray-100">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map(s => (
            <div key={s.num} className="text-center">
              <div className="text-3xl font-black text-[#3182F6] mb-1">{s.num}</div>
              <div className="text-sm text-[#8B95A1] font-medium">{s.label}</div>
            </div>
          ))}
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
            <a href="/login" className="inline-block mt-6 px-8 py-4 bg-[#3182F6] text-white text-base font-bold rounded-2xl hover:bg-[#1a6fd6] transition-all shadow-lg">무료 시작하기</a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all group">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center text-2xl mb-4 shadow-sm group-hover:scale-110 transition-transform`}>
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold text-[#191F28] mb-2">{f.title}</h3>
                <p className="text-sm text-[#4E5968] leading-relaxed mb-4">{f.desc}</p>
                <div className="flex flex-wrap gap-2">
                  {f.tags.map(tag => (
                    <span key={tag} className={`text-xs font-medium px-2.5 py-1 rounded-lg ${f.bg} text-gray-600`}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── QR 리뷰 하이라이트 ── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-[#3182F6] to-[#1B64DA] rounded-3xl p-8 md:p-12 text-white">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                  🆕 신기능
                </div>
                <h2 className="text-2xl md:text-3xl font-black mb-4">
                  QR 코드 하나로<br />네이버 리뷰가 쌓인다
                </h2>
                <p className="text-blue-100 text-sm leading-relaxed mb-6">
                  손님이 QR을 스캔하면 AI가 맞춤 리뷰를 바로 생성해줘요.<br />
                  별점 5점 기본, 말투 6종 선택, 영수증 사진도 분석 가능해요.
                </p>
                <div className="flex flex-wrap gap-3 mb-8">
                  {['🔥 Z세대', '💛 맘카페', '📝 솔직담백', '🍷 미식가', '🤝 친구추천', '📸 인스타감성'].map(t => (
                    <span key={t} className="text-xs bg-white/20 text-white px-3 py-1.5 rounded-full font-medium">{t}</span>
                  ))}
                </div>
              </div>
              <div className="flex-shrink-0 bg-white/10 rounded-2xl p-6 text-center w-52">
                <div className="text-5xl mb-3">📱</div>
                <div className="text-3xl font-black mb-1">+50개</div>
                <div className="text-blue-200 text-xs">월 평균 리뷰 증가</div>
                <div className="mt-4 pt-4 border-t border-white/20">
                  <div className="text-2xl font-black mb-1">4.9점</div>
                  <div className="text-blue-200 text-xs">평균 별점</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 사용자 후기 ── */}
      <section className="py-20 px-4 bg-[#F8FAFC]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-[#191F28] mb-3">사장님들의 실제 후기</h2>
            <p className="text-[#8B95A1] text-sm">로컬루션을 사용 중인 매장 사장님들의 이야기</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex text-yellow-400 text-sm mb-3">
                  {'★'.repeat(t.rating)}
                </div>
                <p className="text-sm text-[#191F28] leading-relaxed mb-4">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#191F28]">{t.name}</div>
                    <div className="text-xs text-[#8B95A1]">{t.store}</div>
                  </div>
                </div>
              </div>
            ))}
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
            
          </div>
        </div>
      </section>

      {/* ── 푸터 ── */}
      <footer className="bg-[#191F28] text-white py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between gap-8 mb-8">
            {/* 브랜드 */}
            <div className="flex-shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3182F6] to-[#1B64DA] flex items-center justify-center">
                  <span className="text-white font-black text-sm">L</span>
                </div>
                <span className="text-lg font-black">로컬루션</span>
              </div>
              <p className="text-[#8B95A1] text-xs leading-relaxed max-w-xs">
                소상공인과 마케터를 위한<br />AI 기반 올인원 비즈니스 자동화 플랫폼
              </p>
            </div>

            {/* 링크 */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
              <div>
                <div className="font-semibold text-gray-300 mb-3">서비스</div>
                <div className="space-y-2">
                  <Link href="/service-intro" className="block text-[#8B95A1] hover:text-white transition-colors">서비스 소개</Link>
                  <Link href="/pricing" className="block text-[#8B95A1] hover:text-white transition-colors">요금</Link>
                  <Link href="/community" className="block text-[#8B95A1] hover:text-white transition-colors">커뮤니티</Link>
                </div>
              </div>
              <div>
                <div className="font-semibold text-gray-300 mb-3">고객지원</div>
                <div className="space-y-2">
                  <Link href="/inquiry" className="block text-[#8B95A1] hover:text-white transition-colors">문의하기</Link>
                  <a href="https://open.kakao.com/o/gXyJ6xrg" target="_blank" rel="noopener" className="block text-[#8B95A1] hover:text-white transition-colors">카카오 상담</a>
                </div>
              </div>
              <div>
                <div className="font-semibold text-gray-300 mb-3">법적 고지</div>
                <div className="space-y-2">
                  <Link href="/terms" className="block text-[#8B95A1] hover:text-white transition-colors">이용약관</Link>
                  <Link href="/privacy" className="block text-[#8B95A1] hover:text-white transition-colors">개인정보처리방침</Link>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-6 flex flex-col md:flex-row justify-between gap-3 text-xs text-[#8B95A1]">
            <div className="space-y-1">
              <div>하랑 | 대표: 전태영 | 사업자등록번호: 706-68-00281</div>
              <div>통신판매업신고번호: 2020-서울강서-1482</div>
              <div>주소: 경기 고양시 일산동구 장백로19 더루벤투스카운티 501호</div>
              <div>전화: 010-7510-9054 | 이메일: harangmarketing@naver.com</div>
            </div>
            <div className="self-end">© 2024 하랑. All rights reserved.</div>
          </div>
        </div>
      </footer>

    </div>
  )
}
