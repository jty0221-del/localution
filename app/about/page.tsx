'use client'

/**
 * /about — 회사 소개 & 대표의 편지
 * ─────────────────────────────────────────────────────────
 * 하랑마케팅 전태영 대표의 경영 철학과 로컬루션의 존재 이유를
 * 한 페이지에 담은 브랜드 스토리 페이지.
 *
 * 원문: https://blog.naver.com/harangmarketing/223769844125
 * (네이버 블로그 원문을 웹용으로 압축·재구성)
 *
 * 섹션 구성:
 *   1. Hero              — "당신이 원하는 마케팅을 하고 계십니까?"
 *   2. 무엇이 다른가      — 해병대·카페 실패·500+ 고객사
 *   3. 대표의 편지        — 본질 메시지 (압축본)
 *   4. 5가지 약속         — 카드 그리드
 *   5. All-in-One 서비스  — 아이콘 + 한 줄 요약
 *   6. FAQ               — 핵심 질문 4개
 *   7. CTA               — 무료 컨설팅 (카톡/전화)
 */

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'

/* ─────────── 5가지 약속 ─────────── */
const PROMISES = [
  {
    icon: '🛡️',
    title: '투명한 운영, 10배 보상',
    desc: '모든 과정을 공개하고 증거로 말합니다. 잘못된 마케팅으로 손해가 생기면 그 피해의 10배를 보상합니다.',
  },
  {
    icon: '🎯',
    title: '맞춤형 전략 설계',
    desc: '업종·지역·경쟁 구도를 직접 분석해 같은 공식을 찍지 않습니다. 내 매장만의 전략이 나옵니다.',
  },
  {
    icon: '📈',
    title: '지속 가능한 성장',
    desc: '단기 순위가 아닌 장기 매출에 집중합니다. 바이럴·상위노출을 쫓기 전에 본질부터 세웁니다.',
  },
  {
    icon: '🤝',
    title: '귀찮게 하는 파트너',
    desc: '일회성 납품이 끝이 아닙니다. 매장 현황·고객 반응·데이터를 꾸준히 체크하며 개선점을 먼저 제안합니다.',
  },
  {
    icon: '💎',
    title: '대표가 직접 챙깁니다',
    desc: '영업사원이 아닌 10년차 마케터 전태영이 상담부터 실행까지 직접 책임집니다.',
  },
]

/* ─────────── All-in-One 서비스 ─────────── */
const SERVICES = [
  { icon: '📍', title: '네이버 플레이스',  desc: '노출·상위노출·리뷰 관리 원스톱' },
  { icon: '✍️', title: '블로그 마케팅',    desc: '체험단·상위노출·상세 페이지' },
  { icon: '💥', title: '바이럴·상세페이지', desc: '카페·지식인·카톡채널 확산' },
  { icon: '📱', title: '인스타·유튜브',     desc: '릴스·쇼츠 자동화 & 광고' },
  { icon: '🗺️', title: '지도·리뷰',         desc: '카카오맵·구글맵·쿠팡이츠' },
  { icon: '🏗️', title: '창업 지원',          desc: '상권 분석·브랜딩·디자인' },
]

/* ─────────── FAQ (핵심 4개) ─────────── */
const FAQ = [
  {
    q: '마케팅 대행사와 실행사 중 어디를 선택해야 하나요?',
    a: '마케팅을 직접 운영할 시간이 있다면 실행사, 본업에 집중하면서 전반적인 전략·실행까지 맡기고 싶다면 대행사가 맞습니다. 하랑은 "방향을 잡아주는 대행" + "손을 움직이는 실행"을 한 팀 안에서 제공합니다.',
  },
  {
    q: '왜 꼭 하랑마케팅이어야 하나요?',
    a: '10년 실무 경험과 500곳 이상의 자영업자와 일해본 데이터가 쌓여 있습니다. 대표가 직접 카페를 운영하면서 실패도 겪어봤기 때문에, 사장님 자리에서의 고민을 머리가 아닌 몸으로 이해합니다.',
  },
  {
    q: '비용이 많이 드는 건 아닌가요?',
    a: '필요 없는 서비스는 먼저 빼드립니다. 월 990원부터 시작 가능한 플랜도 있고, 매장 상황을 진단한 뒤 꼭 필요한 채널에만 예산을 집중하도록 설계합니다.',
  },
  {
    q: '계약 기간이나 해지 조건이 까다롭나요?',
    a: '장기 락인 없이 운영합니다. 효과가 없다면 언제든 중단 가능하고, 명백한 하랑의 귀책으로 손해가 발생한 경우에는 10배 보상 원칙을 적용합니다.',
  },
]

export default function AboutPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  return (
    <main className="min-h-screen bg-white text-[#191F28]">

      {/* ═══════════════════════════════════════════════════════
          1. Hero — 본질 질문
         ═══════════════════════════════════════════════════════ */}
      <section className="relative px-5 pt-24 pb-16 md:pt-32 md:pb-24 bg-gradient-to-b from-[#F5F9FF] to-white overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none select-none"
             style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, #3182F6 0%, transparent 40%), radial-gradient(circle at 80% 70%, #1B64DA 0%, transparent 40%)' }}
             aria-hidden="true" />
        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-[#D1E5FF] rounded-full text-xs font-semibold text-[#3182F6] mb-6 shadow-sm">
            <span>하랑마케팅 × 로컬루션</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black leading-tight tracking-tight mb-5">
            당신이 원하는 마케팅을<br className="md:hidden" /> 하고 계십니까?
          </h1>
          <p className="text-base md:text-lg text-[#4E5968] leading-relaxed">
            10년차 마케터 전태영이 직접 운영.<br className="md:hidden" />
            {' '}500곳 넘는 자영업자와 함께하며 배운 것은 하나 — <strong className="text-[#191F28]">마케팅의 본질은 "본질"에 있다</strong>는 것.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/inquiry" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#3182F6] text-white font-semibold rounded-2xl shadow-[0_4px_14px_rgba(49,130,246,0.35)] hover:bg-[#1B64DA] transition-colors">
              무료 컨설팅 받기
              <span aria-hidden="true">→</span>
            </Link>
            <a href="https://open.kakao.com/o/gXyJ6xrg" target="_blank" rel="noopener" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#FEE500] text-[#191F28] font-semibold rounded-2xl hover:brightness-95 transition-all">
              카카오 1:1 상담
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          2. 무엇이 다른가
         ═══════════════════════════════════════════════════════ */}
      <section className="px-5 py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs font-bold text-[#3182F6] tracking-widest mb-3">WHY HARANG</div>
            <h2 className="text-2xl md:text-4xl font-black tracking-tight mb-4">
              하랑이 다른 이유
            </h2>
            <p className="text-[#4E5968] text-sm md:text-base">
              유행만 쫓는 마케팅이 지겨우시다면, 본질부터 잡는 파트너가 필요합니다.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              { num: '10+', label: '년 실무 경력',    desc: '대기업·중소 브랜드·자영업자 전 영역' },
              { num: '500+', label: '고객사',          desc: '플레이스·블로그·인스타 마케팅 운영' },
              { num: '#1', label: '대표 직접 운영', desc: '영업사원 없이 대표가 직접 상담' },
            ].map((s, i) => (
              <div key={i} className="bg-[#F9FAFB] rounded-3xl p-6 md:p-8 text-center hover:bg-[#F5F9FF] transition-colors">
                <div className="text-4xl md:text-5xl font-black text-[#3182F6] mb-2">{s.num}</div>
                <div className="text-sm font-bold text-[#191F28] mb-1">{s.label}</div>
                <div className="text-xs text-[#4E5968] leading-relaxed">{s.desc}</div>
              </div>
            ))}
          </div>

          {/* 대표 약력 요약 */}
          <div className="mt-10 bg-white border border-gray-100 rounded-3xl p-6 md:p-8 shadow-sm">
            <div className="flex items-start gap-4 md:gap-6">
              <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-[#3182F6] to-[#1B64DA] flex-shrink-0 flex items-center justify-center text-white text-2xl md:text-3xl font-black shadow-[0_4px_14px_rgba(49,130,246,0.3)]">
                전
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-[#3182F6] mb-1">대표 프로필</div>
                <div className="text-lg md:text-xl font-black text-[#191F28] mb-2">전태영 | 하랑마케팅 대표</div>
                <p className="text-sm text-[#4E5968] leading-relaxed">
                  태권도 선수 출신 · 해병대 장교 전역 · 마케팅 회사 실무 · 카페 창업·폐업 경험 · 영업사원 · 블로그 컨설팅 강사.
                  <br className="hidden md:block" />
                  {' '}<strong className="text-[#191F28]">성공보다 실패에서 더 많이 배웠고, 그 경험이 자영업자 편에 서는 이유입니다.</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          3. 대표의 편지 (압축본)
         ═══════════════════════════════════════════════════════ */}
      <section className="px-5 py-16 md:py-24 bg-[#FAFBFC]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-xs font-bold text-[#3182F6] tracking-widest mb-3">A LETTER FROM CEO</div>
            <h2 className="text-2xl md:text-4xl font-black tracking-tight">
              대표의 편지
            </h2>
          </div>

          <article className="bg-white rounded-3xl p-7 md:p-12 shadow-[0_4px_30px_rgba(0,0,0,0.04)] border border-gray-100">
            <div className="text-5xl text-[#3182F6] font-serif leading-none mb-4 select-none" aria-hidden="true">&ldquo;</div>
            <div className="space-y-5 text-[#191F28] text-[15px] md:text-base leading-[1.9]">
              <p className="font-semibold text-lg md:text-xl">
                당신이 원하는 마케팅을 하고 계십니까?
              </p>
              <p className="text-[#4E5968]">
                지난 10년간 500곳이 넘는 자영업자를 만났습니다. 공통된 고민은 세 가지였습니다.
                <br />
                <span className="inline-block mt-2 pl-4 border-l-2 border-[#D1E5FF] text-[#4E5968]">
                  <span className="block">① &ldquo;왜 저 집만 잘 될까.&rdquo;</span>
                  <span className="block">② &ldquo;마케팅 맡겨도 효과가 없다.&rdquo;</span>
                  <span className="block">③ &ldquo;대행사 믿어도 될지 모르겠다.&rdquo;</span>
                </span>
              </p>
              <p className="text-[#4E5968]">
                저도 카페를 직접 운영하다가 망해봤습니다. 그때 알았습니다.
                마케팅은 <strong className="text-[#191F28]">상위노출 기술</strong>이 아니라, <strong className="text-[#191F28]">사장님의 본질 — 매장의 가치, 고객의 경험, 지속 가능한 운영</strong>을 세우는 일이라는 것을.
              </p>
              <p className="text-[#4E5968]">
                유행만 쫓는 마케팅은 오래가지 않습니다. 당장 순위는 오를 수 있지만, 매장의 뼈대가 약하면 결국 무너집니다.
                하랑은 <strong className="text-[#191F28]">본질부터 잡아드리는 파트너</strong>가 되고자 합니다.
                공식대로 찍어내는 대행이 아니라, 사장님 한 분 한 분의 자리에서 고민하는 팀이 되겠습니다.
              </p>
              <p className="text-[#191F28] font-semibold">
                "사장님이 원하는 마케팅"을 함께 설계하겠습니다.<br />
                그게 하랑이 존재하는 이유입니다.
              </p>
            </div>
            <div className="mt-8 pt-6 border-t border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3182F6] to-[#1B64DA] flex items-center justify-center text-white font-black text-sm">전</div>
              <div>
                <div className="text-sm font-bold text-[#191F28]">전태영</div>
                <div className="text-xs text-[#8B95A1]">하랑마케팅 대표 · 로컬루션 Founder</div>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          4. 5가지 약속
         ═══════════════════════════════════════════════════════ */}
      <section className="px-5 py-16 md:py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs font-bold text-[#3182F6] tracking-widest mb-3">OUR PROMISE</div>
            <h2 className="text-2xl md:text-4xl font-black tracking-tight mb-4">
              하랑이 사장님께 드리는 5가지 약속
            </h2>
            <p className="text-[#4E5968] text-sm md:text-base">
              말이 아닌 운영 원칙으로 증명합니다.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PROMISES.map((p, i) => (
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
          5. All-in-One 서비스
         ═══════════════════════════════════════════════════════ */}
      <section className="px-5 py-16 md:py-24 bg-[#FAFBFC]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs font-bold text-[#3182F6] tracking-widest mb-3">ALL-IN-ONE</div>
            <h2 className="text-2xl md:text-4xl font-black tracking-tight mb-4">
              한 곳에서 끝내는 올인원 마케팅
            </h2>
            <p className="text-[#4E5968] text-sm md:text-base">
              여기저기 업체 찾아다닐 필요 없습니다.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {SERVICES.map((s, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 md:p-6 border border-gray-100 hover:border-[#D1E5FF] hover:shadow-sm transition-all">
                <div className="text-2xl md:text-3xl mb-2" aria-hidden="true">{s.icon}</div>
                <div className="text-sm md:text-base font-black text-[#191F28] mb-1">{s.title}</div>
                <div className="text-xs md:text-sm text-[#4E5968] leading-relaxed">{s.desc}</div>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link href="/service-intro" className="inline-flex items-center gap-2 text-sm font-semibold text-[#3182F6] hover:text-[#1B64DA] transition-colors">
              서비스 상세 보기 <span aria-hidden="true">→</span>
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
            <span>무료 컨설팅 진행 중</span>
          </div>
          <h2 className="text-2xl md:text-4xl font-black tracking-tight mb-4">
            사장님 매장의 본질,<br />
            하랑이 함께 찾아드립니다.
          </h2>
          <p className="text-white/85 text-sm md:text-base mb-10">
            상담 · 진단 · 제안까지 무료. 부담 없이 현재 상태부터 체크해보세요.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="https://open.kakao.com/o/gXyJ6xrg" target="_blank" rel="noopener" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#FEE500] text-[#191F28] font-bold rounded-2xl hover:brightness-95 transition-all shadow-[0_4px_14px_rgba(0,0,0,0.15)]">
              💬 카카오 1:1 상담
            </a>
            <a href="tel:010-7510-9054" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-[#3182F6] font-bold rounded-2xl hover:bg-[#F5F9FF] transition-colors shadow-[0_4px_14px_rgba(0,0,0,0.15)]">
              📞 010-7510-9054
            </a>
          </div>

          {/* 진행 프로세스 */}
          <div className="mt-12 pt-10 border-t border-white/15">
            <div className="text-xs font-bold text-white/75 tracking-widest mb-5">상담 프로세스</div>
            <div className="grid grid-cols-5 gap-2 md:gap-3 max-w-2xl mx-auto">
              {['문의', '진단', '제안', '계약', '실행'].map((step, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-white/15 backdrop-blur-sm border border-white/30 flex items-center justify-center text-xs md:text-sm font-black">
                    {i + 1}
                  </div>
                  <div className="mt-2 text-[11px] md:text-xs font-semibold text-white/90">{step}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 작은 푸터 정보 (선택) */}
      <section className="px-5 py-10 md:py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs md:text-sm text-[#8B95A1]">
          <div className="flex items-center gap-3">
            <Image src="/logo.svg" alt="로컬루션 로고" width={28} height={28} className="select-none" />
            <div>
              <div className="text-[#191F28] font-bold">하랑마케팅 · 로컬루션</div>
              <div>대표 전태영 · 사업자 706-68-00281</div>
            </div>
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
