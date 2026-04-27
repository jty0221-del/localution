'use client'

/**
 * /about — 로컬루션 소개 (Product Landing)
 * ────────────────────────────────────────────────────────────
 * 로컬루션을 독립 SaaS 브랜드로 포지셔닝.
 * 하랑 표기 일체 제거. 법적 사업자 표시는 Footer에만.
 *
 * 섹션:
 *   1. Hero               — 제품 한 줄 + CTA
 *   2. 왜 로컬루션인가     — 3-col 차별점
 *   3. 창업자 노트         — 왜 만들었나 (제품 중심)
 *   4. 5가지 원칙          — 제품 운영 원칙
 *   5. 로컬루션이 대신 함  — 기능 6개
 *   6. FAQ                — SaaS 제품 FAQ
 *   7. 최종 CTA           — 무료 시작 + 카톡
 */

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'

/* ─────────── 5가지 제품 원칙 ─────────── */
const PRINCIPLES = [
  {
    icon: '📊',
    title: '결과는 대시보드로',
    desc: 'AI가 무엇을 실행했는지 로그·지표 전부 실시간 공개. 숨기는 값 없습니다.',
  },
  {
    icon: '🎯',
    title: '내 매장만의 세팅',
    desc: '업종·지역·경쟁 구도를 분석해 공식대로 찍지 않습니다. 매장별 자동 튜닝.',
  },
  {
    icon: '📈',
    title: '장기 매출 관점',
    desc: '단기 순위가 아니라 6개월·12개월 리텐션 지표까지 추적합니다.',
  },
  {
    icon: '⚡',
    title: '10분 세팅, 24시간 작동',
    desc: '매장 정보만 입력하면 AI가 알아서. 사장님은 결과만 확인.',
  },
  {
    icon: '💬',
    title: '초기 고객은 창업자 직접 응대',
    desc: '세팅·운영·개선 요청 모두 창업자가 카톡으로 24시간 내 회신.',
  },
]

/* ─────────── 기능 6개 ─────────── */
const FEATURES = [
  { icon: '📍', title: '네이버 플레이스',  desc: 'AI 상위노출·리뷰 자동 답글' },
  { icon: '✍️', title: '블로그·상세페이지', desc: '키워드 분석 기반 자동 생성' },
  { icon: '📱', title: '인스타·쇼츠',       desc: '매장 사진 1장 → 릴스 자동 제작' },
  { icon: '💬', title: '리뷰 관리',         desc: '배민·요기요·쿠팡이츠 통합' },
  { icon: '🗺️', title: '지도 최적화',        desc: '카카오맵·구글맵 노출 자동화' },
  { icon: '📊', title: '성과 리포트',        desc: '매주 월요일 카톡으로 자동 발송' },
]

/* ─────────── FAQ (SaaS 제품 기준) ─────────── */
const FAQ = [
  {
    q: '혼자 쓰는 도구인가요, 대행까지 해주나요?',
    a: '로컬루션은 사장님이 직접 쓰는 AI 도구입니다. 세팅은 10분이면 끝나고, 이후는 AI가 자동으로 돌립니다. 세팅·튜닝이 부담스러우면 온보딩은 창업자가 직접 도와드립니다.',
  },
  {
    q: '왜 로컬루션인가요?',
    a: '창업자가 10년간 자영업자 마케팅을 맡아왔고, 500곳 넘는 매장 데이터를 AI 학습에 썼습니다. 매장을 직접 운영하다 망해본 경험 때문에, 사장님 자리에서 진짜 필요한 것만 기능으로 만들었습니다.',
  },
  {
    q: '비용이 많이 드나요?',
    a: '커피 한 잔 값 월 6,900원으로 모든 플랫폼 리뷰답글 자동화부터 시작할 수 있어요. 필요 없는 기능은 끄고, 쓰는 기능만 과금되는 선택형 요금제입니다. 첫 14일은 무료로 전체 기능 체험 가능합니다.',
  },
  {
    q: '지금 쓰는 마케팅 대행사를 끊어야 하나요?',
    a: '아닙니다. 로컬루션은 AI 자동화 도구이기 때문에 기존 대행사와 병행하거나, 일부만 대체하는 것도 가능합니다. 대시보드에서 어느 채널을 로컬루션으로 돌리고 어느 채널은 대행사에 맡길지 직접 선택할 수 있습니다.',
  },
  {
    q: '계약 기간이 있나요?',
    a: '없습니다. 월 단위로 언제든 해지 가능합니다. 장기 락인 없이 만족도만으로 승부합니다.',
  },
]

export default function AboutPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  return (
    <main className="min-h-screen bg-white text-[#191F28]">

      {/* ═══════════════════════════════════════════════════════
          1. Hero
         ═══════════════════════════════════════════════════════ */}
      <section className="relative px-5 pt-24 pb-16 md:pt-32 md:pb-24 bg-gradient-to-b from-[#F5F9FF] to-white overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none select-none"
             style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, #3182F6 0%, transparent 40%), radial-gradient(circle at 80% 70%, #1B64DA 0%, transparent 40%)' }}
             aria-hidden="true" />
        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-[#D1E5FF] rounded-full text-xs font-semibold text-[#3182F6] mb-6 shadow-sm">
            <span>LOCALUTION · AI Marketing OS</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black leading-tight tracking-tight mb-5">
            사장님의 마케팅을<br className="md:hidden" />
            {' '}AI가 대신합니다.
          </h1>
          <p className="text-sm md:text-lg text-[#4E5968] leading-relaxed text-left sm:text-center">
            리뷰 답글, SNS 운영, 광고 집행 — <strong className="text-[#191F28]">하루 10분</strong>이면 충분합니다.
            <br className="hidden md:block" />
            {' '}500곳 매장 데이터를 학습한 로컬루션이, <strong className="text-[#191F28]">24시간 자동</strong>으로 돌립니다.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#3182F6] text-white font-semibold rounded-2xl shadow-[0_4px_14px_rgba(49,130,246,0.35)] hover:bg-[#1B64DA] transition-colors">
              14일 무료로 시작하기
              <span aria-hidden="true">→</span>
            </Link>
            <a href="https://open.kakao.com/o/gSC9jrqi" target="_blank" rel="noopener" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#FEE500] text-[#191F28] font-semibold rounded-2xl hover:brightness-95 transition-all">
              로컬루션 오픈채팅방
            </a>
          </div>
          <p className="mt-5 text-xs text-[#8B95A1]">
            ☕ 월 6,900원 · 신용카드 등록 없이 시작 · 언제든 해지
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          2. 왜 로컬루션인가
         ═══════════════════════════════════════════════════════ */}
      <section className="px-5 py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs font-bold text-[#3182F6] tracking-widest mb-3">WHY LOCALUTION</div>
            <h2 className="text-2xl md:text-4xl font-black tracking-tight mb-4">
              대행사처럼 맡기고,<br className="md:hidden" />
              {' '}도구처럼 쓰세요.
            </h2>
            <p className="text-[#4E5968] text-sm md:text-base text-left sm:text-center">
              로컬루션이 기존 마케팅 대행·툴과 다른 3가지.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              { num: '500+', label: '매장 데이터 학습', desc: '자영업 특화 AI 모델' },
              { num: '10분', label: '세팅 완료',        desc: '매장 정보만 입력' },
              { num: '24h', label: '자동 운영',         desc: '리뷰·SNS·광고 동시' },
            ].map((s, i) => (
              <div key={i} className="bg-[#F9FAFB] rounded-3xl p-6 md:p-8 text-center hover:bg-[#F5F9FF] transition-colors">
                <div className="text-4xl md:text-5xl font-black text-[#3182F6] mb-2">{s.num}</div>
                <div className="text-sm font-bold text-[#191F28] mb-1">{s.label}</div>
                <div className="text-xs text-[#4E5968] leading-relaxed">{s.desc}</div>
              </div>
            ))}
          </div>

          {/* 비교 테이블 */}
          <div className="mt-10 overflow-x-auto rounded-3xl shadow-sm border border-gray-100">
            <div className="bg-white min-w-[320px]">
              <div className="grid grid-cols-3 text-[11px] sm:text-xs md:text-sm">
                <div className="p-3 sm:p-4 md:p-6 bg-[#FAFBFC] border-r border-gray-100">
                  <div className="font-bold text-[#8B95A1] mb-3">&nbsp;</div>
                  <div className="space-y-3 text-[#4E5968]">
                    <div>월 비용</div>
                    <div>세팅 기간</div>
                    <div>실행 속도</div>
                    <div>결과 투명성</div>
                  </div>
                </div>
                <div className="p-3 sm:p-4 md:p-6 border-r border-gray-100">
                  <div className="font-bold text-[#8B95A1] mb-3">기존 대행사</div>
                  <div className="space-y-3 text-[#4E5968]">
                    <div>30~300만원</div>
                    <div>1~2주</div>
                    <div>사람 리드타임</div>
                    <div>월1회 리포트</div>
                  </div>
                </div>
                <div className="p-3 sm:p-4 md:p-6 bg-[#F5F9FF]">
                  <div className="font-bold text-[#3182F6] mb-3">로컬루션</div>
                  <div className="space-y-3 text-[#191F28] font-semibold">
                    <div>월 6,900원~</div>
                    <div>10분</div>
                    <div>AI 24시간</div>
                    <div>실시간 대시보드</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          3. 창업자 노트 (짧게)
         ═══════════════════════════════════════════════════════ */}
      <section className="px-5 py-16 md:py-24 bg-[#FAFBFC]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-xs font-bold text-[#3182F6] tracking-widest mb-3">FOUNDER'S NOTE</div>
            <h2 className="text-2xl md:text-4xl font-black tracking-tight">
              왜 만들었나
            </h2>
          </div>

          <article className="bg-white rounded-3xl p-5 sm:p-7 md:p-12 shadow-[0_4px_30px_rgba(0,0,0,0.04)] border border-gray-100">
            <div className="space-y-5 text-[#191F28] text-sm md:text-base leading-[1.75] md:leading-[1.9]">
              <p className="font-semibold text-base md:text-xl text-[#191F28]">
                자영업자 편에서 10년을 일했습니다.
              </p>
              <p className="text-[#4E5968]">
                군대 전역하고 카페를 직접 열었다가 코로나 때 망해봤습니다.
                너무 힘든 시기였습니다. 새벽 쪽잠, 3잡…
              </p>
              <p className="font-semibold text-[#191F28]">
                그때 깨달았습니다.
              </p>
              <p className="text-[#4E5968]">
                사장님들에게 필요한 건 <strong className="text-[#191F28]">비싼 대행</strong>이 아니라,
                {' '}<strong className="text-[#191F28]">언제든 옆에서 도움 줄 수 있는 사람과 도구</strong>라는 것을요.
              </p>
              <p className="text-[#4E5968]">
                로컬루션은 그 경험을 제품으로 옮긴 결과입니다.
                자영업자+마케팅 대행사 등 10년 이상의 경험과 판단으로
                500곳 이상의 데이터, 수백 번의 실패를{' '}
                <strong className="text-[#191F28]">AI가 대표님, 사장님 대신 24시간 일합니다.</strong>{' '}
                사장님은 결과만 확인하면 됩니다.
              </p>
              <p className="text-[#191F28] font-semibold">
                "사장님이 원하는 마케팅"을 사장님이 직접 돌릴 수 있게,<br className="hidden sm:block" />
                그게 로컬루션이 존재하는 이유입니다.
              </p>
            </div>
            <div className="mt-8 pt-6 border-t border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3182F6] to-[#1B64DA] flex items-center justify-center text-white font-black text-sm">전</div>
              <div>
                <div className="text-sm font-bold text-[#191F28]">전태영</div>
                <div className="text-xs text-[#8B95A1]">Founder · 10년차 자영업자 마케팅</div>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          4. 5가지 원칙
         ═══════════════════════════════════════════════════════ */}
      <section className="px-5 py-16 md:py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs font-bold text-[#3182F6] tracking-widest mb-3">OUR PRINCIPLES</div>
            <h2 className="text-2xl md:text-4xl font-black tracking-tight mb-4">
              로컬루션이 지키는 5가지 원칙
            </h2>
            <p className="text-[#4E5968] text-sm md:text-base text-left sm:text-center">
              제품은 말이 아니라 운영 원칙으로 증명합니다.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PRINCIPLES.map((p, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-3xl p-6 md:p-7 hover:shadow-[0_6px_24px_rgba(49,130,246,0.1)] hover:border-[#D1E5FF] transition-all">
                <div className="text-3xl mb-3" aria-hidden="true">{p.icon}</div>
                <h3 className="text-base md:text-lg font-black text-[#191F28] mb-2">{p.title}</h3>
                <p className="text-sm text-[#4E5968] leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          5. 로컬루션이 대신 하는 일
         ═══════════════════════════════════════════════════════ */}
      <section className="px-5 py-16 md:py-24 bg-[#FAFBFC]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs font-bold text-[#3182F6] tracking-widest mb-3">WHAT WE AUTOMATE</div>
            <h2 className="text-2xl md:text-4xl font-black tracking-tight mb-4">
              로컬루션이 대신 처리하는 것
            </h2>
            <p className="text-[#4E5968] text-sm md:text-base text-left sm:text-center">
              사장님이 손댈 필요 없습니다. 결과만 확인하세요.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {FEATURES.map((s, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 md:p-6 border border-gray-100 hover:border-[#D1E5FF] hover:shadow-sm transition-all">
                <div className="text-2xl md:text-3xl mb-2" aria-hidden="true">{s.icon}</div>
                <div className="text-sm md:text-base font-black text-[#191F28] mb-1">{s.title}</div>
                <div className="text-xs md:text-sm text-[#4E5968] leading-relaxed">{s.desc}</div>
                <div className="mt-3 text-[11px] font-bold text-[#3182F6] tracking-wider">AI 자동</div>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link href="/service-intro" className="inline-flex items-center gap-2 text-sm font-semibold text-[#3182F6] hover:text-[#1B64DA] transition-colors">
              기능 전체 보기 <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          6. FAQ
         ═══════════════════════════════════════════════════════ */}
      <section className="px-5 py-16 md:py-24">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-xs font-bold text-[#3182F6] tracking-widest mb-3">FAQ</div>
            <h2 className="text-2xl md:text-4xl font-black tracking-tight">
              자주 묻는 질문
            </h2>
          </div>

          <div className="space-y-3">
            {FAQ.map((item, i) => {
              const isOpen = openFaq === i
              return (
                <div key={i} className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="w-full px-5 md:px-6 py-4 md:py-5 flex items-start justify-between gap-3 text-left hover:bg-[#F9FAFB] transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <span className="text-[#3182F6] font-black text-sm md:text-base flex-shrink-0 mt-0.5">Q.</span>
                      <span className="text-sm md:text-base font-bold text-[#191F28]">{item.q}</span>
                    </div>
                    <span
                      className={`text-[#8B95A1] text-xl flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      aria-hidden="true"
                    >
                      ⌄
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 md:px-6 pb-5 md:pb-6 pt-0 flex items-start gap-3">
                      <span className="text-[#3182F6] font-black text-sm md:text-base flex-shrink-0 mt-0.5">A.</span>
                      <p className="text-sm md:text-[15px] text-[#4E5968] leading-[1.8]">{item.a}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          7. 최종 CTA
         ═══════════════════════════════════════════════════════ */}
      <section className="px-5 py-16 md:py-24 bg-gradient-to-br from-[#3182F6] to-[#1B64DA] text-white">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/15 backdrop-blur-sm rounded-full text-xs font-semibold mb-6 border border-white/20">
            <span>14일 무료 체험 진행 중</span>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-4xl font-black tracking-tight mb-4 break-keep">
            지금 쓰는 마케팅,<br className="hidden sm:block" />
            {' '}로컬루션이 더 싸고 빠르게 대신합니다.
          </h2>
          <p className="text-white/85 text-sm md:text-base mb-10 text-left sm:text-center">
            신용카드 등록 없이 14일 무료 체험. 언제든 해지.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-[#3182F6] font-bold rounded-2xl hover:bg-[#F5F9FF] transition-colors shadow-[0_4px_14px_rgba(0,0,0,0.15)]">
              무료로 시작하기 <span aria-hidden="true">→</span>
            </Link>
            <a href="https://open.kakao.com/o/gSC9jrqi" target="_blank" rel="noopener" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#FEE500] text-[#191F28] font-bold rounded-2xl hover:brightness-95 transition-all shadow-[0_4px_14px_rgba(0,0,0,0.15)]">
              💬 로컬루션 오픈채팅방
            </a>
          </div>

          {/* 4단계 온보딩 */}
          <div className="mt-12 pt-10 border-t border-white/15">
            <div className="text-xs font-bold text-white/75 tracking-widest mb-5">온보딩 4단계 · 10분 소요</div>
            <div className="grid grid-cols-4 gap-1.5 sm:gap-3 md:gap-3 max-w-2xl mx-auto">
              {[
                { step: '가입', desc: '카카오 1초' },
                { step: '매장연결', desc: '플레이스·배민' },
                { step: 'AI세팅', desc: '자동 튜닝' },
                { step: '완료', desc: '24h 자동' },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-11 md:h-11 rounded-full bg-white/15 backdrop-blur-sm border border-white/30 flex items-center justify-center text-xs md:text-sm font-black">
                    {i + 1}
                  </div>
                  <div className="mt-1.5 text-[10px] sm:text-[11px] md:text-xs font-semibold text-white/90 whitespace-nowrap">{item.step}</div>
                  <div className="text-[9px] sm:text-[10px] text-white/60 whitespace-nowrap">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 소형 브랜드 푸터 영역 (중복 회피 — 전역 Footer가 법적 정보 담당) */}
      <section className="px-5 py-10 md:py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs md:text-sm text-[#8B95A1]">
          <div className="flex items-center gap-3">
            <Image src="/logo.svg" alt="로컬루션 로고" width={28} height={28} className="select-none" />
            <div className="text-[#191F28] font-bold">LOCALUTION</div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="hover:text-[#3182F6] transition-colors">요금제</Link>
            <Link href="/inquiry" className="hover:text-[#3182F6] transition-colors">문의하기</Link>
            <Link href="/community" className="hover:text-[#3182F6] transition-colors">커뮤니티</Link>
          </div>
        </div>
      </section>
    </main>
  )
}
