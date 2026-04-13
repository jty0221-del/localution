'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const PAGE_TITLES: Record<string, string> = {
  '/':            '대시보드',
  '/review-admin':'리뷰 관리',
  '/qr-admin':    'QR 관리',
  '/crm':         '고객 관리',
  '/admin-biz':   '매장 관리',
  '/community':   '커뮤니티',
  '/pricing':     '기능 추가',
  '/settings':    '설정',
}

const NOTIFICATIONS = [
  { id: 1, type: 'review',   icon: '⭐', title: '새 리뷰가 도착했어요', desc: '김**님이 네이버에 별점 5점을 남겼어요', time: '5분 전',   read: false, href: '/review-admin' },
  { id: 2, type: 'alert',    icon: '🚨', title: '부정 리뷰 알림',       desc: '이**님의 별점 2점 리뷰를 확인해주세요', time: '1시간 전', read: false, href: '/review-admin' },
  { id: 3, type: 'customer', icon: '👤', title: '신규 고객 등록',       desc: '박**님이 처음 방문했어요',              time: '2시간 전', read: true,  href: '/crm' },
  { id: 4, type: 'report',   icon: '📊', title: '주간 리포트 준비됐어요', desc: '이번 주 리뷰 +12개, 별점 유지 4.6',   time: '어제',    read: true,  href: '/' },
  { id: 5, type: 'review',   icon: '⭐', title: '미답변 리뷰 리마인더', desc: '3개의 리뷰가 아직 답변을 기다려요',     time: '어제',    read: true,  href: '/review-admin' },
]

export default function TopBar() {
  const pathname = usePathname()
  const [notifOpen, setNotifOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [notifs, setNotifs] = useState(NOTIFICATIONS)

  const unread = notifs.filter(n => !n.read).length
  const title = PAGE_TITLES[pathname] || '로컬루션'

  const markAll = () => setNotifs(n => n.map(x => ({ ...x, read: true })))
  const markOne = (id: number) => setNotifs(n => n.map(x => x.id === id ? { ...x, read: true } : x))

  return (
    <div className="sticky top-0 z-20 bg-[#F2F4F6] pt-4 pb-2 px-4 md:px-8 -mx-4 md:-mx-8 -mt-4 md:-mt-8 mb-6">
      <div className="flex items-center justify-between">
        {/* 페이지 타이틀 */}
        <h1 className="text-xl font-bold text-[#191F28] pl-12 md:pl-0">{title}</h1>

        {/* 우측 액션 */}
        <div className="flex items-center gap-2 relative">

          {/* 알림 벨 */}
          <div className="relative">
            <button
              onClick={() => { setNotifOpen(v => !v); setUserOpen(false); }}
              className="relative w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm hover:shadow-md transition-all"
            >
              <span className="text-lg">🔔</span>
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF3B30] text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unread}
                </span>
              )}
            </button>

            {notifOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl z-20 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-[#F2F4F6]">
                    <span className="font-bold text-[#191F28]">알림</span>
                    {unread > 0 && (
                      <button onClick={markAll} className="text-xs text-[#3182F6] font-medium">전체 읽음</button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto divide-y divide-[#F2F4F6]">
                    {notifs.map(n => (
                      <Link key={n.id} href={n.href}
                        onClick={() => { markOne(n.id); setNotifOpen(false); }}
                        className={`flex items-start gap-3 px-5 py-4 hover:bg-[#F8F9FA] transition-colors ${!n.read ? 'bg-[#EFF6FF]' : ''}`}>
                        <span className="text-xl flex-shrink-0 mt-0.5">{n.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-semibold text-[#191F28] leading-tight">{n.title}</span>
                            {!n.read && <span className="w-2 h-2 rounded-full bg-[#3182F6] flex-shrink-0 mt-1.5" />}
                          </div>
                          <p className="text-xs text-[#4E5968] mt-0.5 leading-relaxed">{n.desc}</p>
                          <span className="text-xs text-[#8B95A1] mt-1 block">{n.time}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                  {unread === 0 && (
                    <div className="text-center text-[#8B95A1] text-sm py-8">모든 알림을 읽었어요 ✅</div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* 사용자 메뉴 */}
          <div className="relative">
            <button
              onClick={() => { setUserOpen(v => !v); setNotifOpen(false); }}
              className="w-10 h-10 bg-[#3182F6] rounded-xl flex items-center justify-center shadow-sm hover:shadow-md transition-all text-white font-bold text-sm"
            >
              전
            </button>

            {userOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setUserOpen(false)} />
                <div className="absolute right-0 top-12 w-56 bg-white rounded-2xl shadow-2xl z-20 overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#F2F4F6]">
                    <div className="font-bold text-[#191F28] text-sm">전태영 사장님</div>
                    <div className="text-xs text-[#8B95A1] mt-0.5">jty0221@gmail.com</div>
                  </div>
                  <div className="py-2">
                    {[
                      { label: '⚙️ 설정', href: '/settings' },
                      { label: '💳 플랜 관리', href: '/settings' },
                      { label: '✨ 기능 추가', href: '/pricing' },
                    ].map(item => (
                      <Link key={item.label} href={item.href} onClick={() => setUserOpen(false)}
                        className="flex items-center px-5 py-3 text-sm text-[#4E5968] hover:bg-[#F2F4F6] transition-colors">
                        {item.label}
                      </Link>
                    ))}
                  </div>
                  <div className="border-t border-[#F2F4F6] py-2">
                    <Link href="/login" className="flex items-center px-5 py-3 text-sm text-[#FF3B30] hover:bg-[#FFF0F0] transition-colors">
                      🚪 로그아웃
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
