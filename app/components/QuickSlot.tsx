'use client'



import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/dashboard',           label: '대시보드',   short: 'DB',   bg: '#EFF6FF', color: '#3182F6' },
  { href: '/review-admin',        label: '리뷰 관리',  short: '리뷰', bg: '#FFFBEB', color: '#F59E0B' },
  { href: '/marketing/keyword-rank', label: '마케팅 관리', short: '마케팅', bg: '#F0FDF4', color: '#03C75A' },
  { href: '/qr-admin',            label: 'QR 관리',   short: 'QR',   bg: '#F5F3FF', color: '#8B5CF6' },
  { href: '/customers',           label: '고객 관리',  short: '고객', bg: '#ECFDF5', color: '#059669' },
  { href: '/community',           label: '커뮤니티',   short: '커뮤', bg: '#FDF2F8', color: '#EC4899' },
  { href: '/settings/profile',    label: '매장 관리',  short: '매장', bg: '#FFF7ED', color: '#EA580C' },
  { href: '/inquiry',             label: '1:1 문의',  short: '문의', bg: '#FEF3C7', color: '#D97706' },
  { href: '/settings',            label: '설정',       short: '설정', bg: '#F2F4F6', color: '#4E5968' },
]

export default function QuickSlot() {
  const pathname = usePathname()
  if (pathname === '/login') return null


  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null
      if (ref.current && target && !ref.current.contains(target)) {
        setOpen(false)
      }
    }
    // 🔧 mousedown + touchstart 둘 다 구독 (모바일 외부 탭 닫힘 보장)
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler, { passive: true })
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler as any)
    }
  }, [])

  return (
    // 🔧 2026-04-19 모바일 우측 터치 불가 수정
    // 부모 컨테이너는 pointer-events:none → 패널/버튼만 auto 로 이벤트 수신
    // (닫혀있을 때 152px × ~230px 투명 영역이 터치를 흡수하던 버그 차단)
    <div
      ref={ref}
      className="fixed right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-end gap-2.5"
      style={{ pointerEvents: 'none' }}
    >

      {/* 링크 패널 — 토글 버튼 위에 배치 */}
      <div
        style={{
          opacity: open ? 1 : 0,
          transform: open ? 'translateX(0) scale(1)' : 'translateX(16px) scale(0.92)',
          transition: 'opacity 0.22s ease, transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
          pointerEvents: open ? 'auto' : 'none',
          transformOrigin: 'right bottom',
        }}
        className="bg-white rounded-2xl shadow-2xl border border-[#E5E8EB] p-2 w-[162px]"
      >
        <p className="text-[10px] font-bold text-[#B0B8C1] px-3 pt-1.5 pb-1 tracking-widest uppercase">빠른 이동</p>
        {LINKS.map(link => {
          const active = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-colors ${active ? 'bg-[#EFF6FF]' : 'hover:bg-[#F2F4F6]'}`}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{ background: active ? link.color : link.bg, color: active ? '#fff' : link.color }}
              >
                {link.short}
              </div>
              <span
                className="text-sm font-medium flex-1"
                style={{ color: active ? link.color : '#191F28' }}
              >
                {link.label}
              </span>
              {active && (
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: link.color }} />
              )}
            </Link>
          )
        })}
        {/* 패널 꼬리 (오른쪽 아래) */}
        <div className="absolute -bottom-1.5 right-4 w-3 h-3 bg-white border-b border-r border-[#E5E8EB] rotate-45" />
      </div>

      {/* 토글 버튼 — pointer-events:auto 로 명시 (부모 none 이므로) */}
      <button
        onClick={() => setOpen(v => !v)}
        title="빠른 이동"
        aria-label={open ? '빠른 이동 닫기' : '빠른 이동 열기'}
        style={{
          transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          pointerEvents: 'auto',
          touchAction: 'manipulation',
        }}
        className="w-12 h-12 bg-[#3182F6] text-white rounded-full shadow-xl hover:bg-[#1B64DA] hover:shadow-2xl active:scale-95 flex items-center justify-center"
      >
        {/* 십자 → 닫힘 / 격자 → 열림 표시 */}
        {open ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <line x1="2" y1="2" x2="16" y2="16" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
            <line x1="16" y1="2" x2="2" y2="16" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="1" y="1" width="6" height="6" rx="1.5" fill="white"/>
            <rect x="11" y="1" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.7"/>
            <rect x="1" y="11" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.7"/>
            <rect x="11" y="11" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.5"/>
          </svg>
        )}
      </button>
    </div>
  )
}
