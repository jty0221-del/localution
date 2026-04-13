'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const slots = [
  { id: 'dashboard', label: '대시보드', href: '/',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
  { id: 'marketing', label: '마케팅', href: '/marketing',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg> },
  { id: 'reviews', label: '리뷰', href: '/review-admin',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
  { id: 'qr', label: 'QR', href: '/qr-admin',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
  { id: 'crm', label: 'CRM', href: '/crm',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> },
  { id: 'settings', label: '설정', href: '/settings/connect',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M21 12h-2M5 12H3M19.07 19.07l-1.41-1.41M5.34 5.34L3.93 3.93M12 21v-2M12 5V3"/></svg> },
]

export default function QuickSlot() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="fixed right-5 bottom-5 z-50">
      {open && (
        <div className="absolute bottom-14 right-0 bg-white rounded-2xl shadow-xl border border-[#E5E8EB] p-2 w-[140px]">
          {slots.map(s => (
            <button key={s.id} onClick={() => { router.push(s.href); setOpen(false) }}
              className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-left text-xs font-medium text-[#4E5968] hover:bg-[#E8F1FE] hover:text-[#3182F6] transition-colors">
              <span className="text-[#8B95A1]">{s.icon}</span>{s.label}
            </button>
          ))}
        </div>
      )}
      <button onClick={() => setOpen(v => !v)}
        className="w-12 h-12 bg-[#3182F6] text-white rounded-full shadow-lg hover:bg-[#1B64DA] transition-all flex items-center justify-center"
        style={{ boxShadow: '0 4px 20px rgba(49,130,246,0.4)' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
        </svg>
      </button>
    </div>
  )
}
