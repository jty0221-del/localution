'use client'

// ============================================================
// HarangMarketingPopup — 하랑마케팅 홍보 팝업 (우측 하단)
//   · 일반 자영업자가 로컬루션 사용 중 마케팅 대행을 검토할 수 있도록 안내
//   · 첫 방문 후 5초 뒤 슬라이드 업, 닫으면 24시간 안 보임 (localStorage)
//   · 모바일/PC 모두 우측 하단 고정 (z-40, 작고 비방해)
//
//   ⚠️ DO_NOT_TOUCH: 사장님 (하랑마케팅) 자체 홍보 — 함부로 텍스트/색상 변경 금지
// ============================================================
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X, Sparkles, ArrowRight, Megaphone } from 'lucide-react'

const STORAGE_KEY = 'localution.harang_popup_dismissed_at'
const DISMISS_HOURS = 24

export default function HarangMarketingPopup() {
  const [show, setShow] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    // 24시간 이내 닫은 적 있으면 안 보임
    try {
      const dismissedAt = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10)
      if (dismissedAt && Date.now() - dismissedAt < DISMISS_HOURS * 3600 * 1000) {
        return
      }
    } catch {}
    // 5초 후 슬라이드 업
    const t = setTimeout(() => setShow(true), 5000)
    return () => clearTimeout(t)
  }, [])

  function dismiss() {
    setShow(false)
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())) } catch {}
  }

  if (!show) return null

  // 축소 상태 (둥근 버튼) — 클릭 시 확장
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 px-4 py-3 rounded-full shadow-lg shadow-purple-300/40 bg-gradient-to-r from-[#7C3AED] via-[#A855F7] to-[#EC4899] text-white text-sm font-bold hover:scale-105 transition-transform"
        style={{ animation: 'harangSlideUp 0.4s ease-out' }}
        aria-label="하랑마케팅 문의"
      >
        <Megaphone size={16} strokeWidth={2.5} className="animate-pulse" />
        <span className="hidden sm:inline">마케팅 도움 받기</span>
        <span className="sm:hidden">상담</span>
        <style>{`
          @keyframes harangSlideUp {
            0% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </button>
    )
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-40 w-[calc(100vw-2rem)] max-w-[340px] rounded-2xl shadow-2xl shadow-purple-300/30 overflow-hidden bg-white border border-[#E9D5FF]"
      style={{ animation: 'harangPopIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      {/* 헤더 */}
      <div className="relative px-4 py-3 bg-gradient-to-br from-[#7C3AED] via-[#A855F7] to-[#EC4899] text-white">
        <button
          onClick={dismiss}
          className="absolute top-2 right-2 w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
          aria-label="닫기"
        >
          <X size={14} strokeWidth={2.5} />
        </button>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
            <Sparkles size={13} strokeWidth={2.5} />
          </div>
          <span className="text-xs font-bold uppercase tracking-wide">하랑마케팅 ✕ 로컬루션</span>
        </div>
        <p className="text-[15px] font-black leading-tight">
          시간이 부족하신가요?<br />
          마케팅, 저희가 대신 해드릴게요
        </p>
      </div>

      {/* 본문 */}
      <div className="px-4 py-3 space-y-2.5">
        <div className="space-y-1.5">
          <FeatureLine text="네이버 플레이스 상위노출 SEO" />
          <FeatureLine text="블로그 / 인스타 / 유튜브 통합 운영" />
          <FeatureLine text="리뷰 관리 + 광고 ROI 최적화" />
          <FeatureLine text="월 단위 / 캠페인 단위 유연한 계약" />
        </div>

        <div className="rounded-xl bg-gradient-to-br from-[#FAF5FF] to-[#FCE7F3] border border-[#E9D5FF] p-2.5">
          <p className="text-[11px] font-bold text-[#7C3AED] mb-0.5">10년차 마케터 직접 운영</p>
          <p className="text-[10px] text-[#6B21A8] leading-relaxed">
            하랑마케팅 대표가 직접 진단 / 전략 수립 / 실행까지 책임집니다.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 pb-4 flex gap-2">
        <Link
          href="/inquiry?category=마케팅"
          onClick={dismiss}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white text-xs font-bold hover:opacity-90 shadow-sm"
        >
          <Megaphone size={12} strokeWidth={2.5} />
          무료 상담 신청
          <ArrowRight size={11} strokeWidth={2.5} />
        </Link>
        <button
          onClick={dismiss}
          className="px-3 py-2 rounded-xl border border-[#E5E8EB] text-[11px] font-bold text-[#8B95A1] hover:bg-[#F8F9FA]"
        >
          나중에
        </button>
      </div>

      <style>{`
        @keyframes harangPopIn {
          0% { opacity: 0; transform: translateY(40px) scale(0.92); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}

function FeatureLine({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-1 h-1 rounded-full bg-[#7C3AED] flex-shrink-0" />
      <span className="text-[11px] text-[#4E5968] leading-relaxed">{text}</span>
    </div>
  )
}
