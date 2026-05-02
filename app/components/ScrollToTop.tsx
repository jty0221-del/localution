'use client'

// ============================================================
// ScrollToTop — 모든 페이지 공통 floating 버튼
//   · 스크롤이 400px 이상 내려갔을 때만 표시
//   · 클릭 시 부드럽게 최상단으로 이동
//   · 모바일/PC 둘 다 작동 (BottomTabBar 위로 floating)
// ============================================================
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function ScrollToTop() {
  const [show, setShow] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handler = () => setShow(window.scrollY > 400)
    handler()
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // 공개 랜딩 (/, /pricing, /about, /customers 등) 에서는 숨김 — 사장님 워크스페이스에서만
  const hidePaths = ['/', '/pricing', '/about', '/customers', '/login', '/signup', '/service-intro', '/privacy', '/terms']
  if (pathname && hidePaths.includes(pathname)) return null
  if (!show) return null

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="맨 위로 이동"
      className="fixed right-4 z-[55] w-12 h-12 rounded-full bg-[#191F28] text-white shadow-xl border border-[#374151] flex items-center justify-center hover:bg-[#0F172A] active:scale-95 transition-all"
      style={{
        // BottomTabBar (모바일 하단 60px) 위로 약간 띄움 + safe-area 고려
        bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="19" x2="12" y2="5"/>
        <polyline points="5 12 12 5 19 12"/>
      </svg>
    </button>
  )
}
