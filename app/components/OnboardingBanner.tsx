'use client'

// ============================================================
// 2-D: 매장 미등록 사용자 글로벌 온보딩 배너
// · 모든 사장님 워크스페이스 페이지 상단에 노출
// · /api/stores/me 응답 기반으로 매장 등록 여부 확인
// · 매장 등록 완료 시 자동으로 사라짐 (state 변경 시 다시 fetch)
// · 공개 랜딩 페이지에서는 숨김
// ============================================================
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Rocket } from 'lucide-react'

const HIDE_PATHS = ['/', '/pricing', '/about', '/customers', '/login', '/signup',
 '/service-intro', '/privacy', '/terms', '/my/platforms/naver_place/connect']

export default function OnboardingBanner() {
 const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null)
 const [hasNaver, setHasNaver] = useState<boolean>(false)
 const [dismissed, setDismissed] = useState(false)
 const pathname = usePathname()

 useEffect(() => {
 // 공개 랜딩 / 매장 연결 페이지에서는 fetch 자체 skip
 if (pathname && HIDE_PATHS.includes(pathname)) return
 if (typeof window !== 'undefined') {
 // 사용자가 이번 세션에서 닫았으면 노출 안 함
 if (sessionStorage.getItem('localution.onboarding_dismissed') === '1') {
 setDismissed(true)
 return
 }
 }

 let cancelled = false
 fetch('/api/stores/me', { credentials: 'include', cache: 'no-store' })
 .then(r => r.ok ? r.json() : null)
 .then(j => {
 if (cancelled || !j?.ok) return
 const hasStore = !!(j.store && j.store.name)
 const naverConnected = (j.platforms || []).some((p: any) => p.platform === 'naver_place' && p.connected)
 setNeedsOnboarding(!hasStore)
 setHasNaver(naverConnected)
 })
 .catch(() => null)
 return () => { cancelled = true }
 }, [pathname])

 // 공개 페이지면 숨김
 if (pathname && HIDE_PATHS.includes(pathname)) return null
 if (dismissed) return null
 if (needsOnboarding !== true) return null

 return (
 <div className="fixed left-0 right-0 z-[40] top-0 px-4 py-2 bg-gradient-to-r from-[#3182F6] to-[#7C3AED] text-white shadow-lg">
 <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
 <div className="flex items-center gap-3 min-w-0 flex-1">
 <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
 <Rocket size={18} className="text-white" strokeWidth={2.5} />
 </div>
 <div className="min-w-0">
 <p className="text-sm font-bold truncate">시작 전 매장 정보 등록 — 1번이면 모든 기능 이용 가능</p>
 <p className="text-[11px] opacity-90 truncate hidden sm:block">
 네이버 플레이스 연결하면 매장 정보 자동 채움 + 답글 자동등록 + QR 리뷰 + 알림 모두 작동
 </p>
 </div>
 </div>
 <div className="flex items-center gap-2 flex-shrink-0">
 <Link
 href="/my/platforms/naver_place/connect"
 className="px-3 py-1.5 rounded-lg bg-white text-[#3182F6] text-xs font-bold hover:bg-[#F0F9FF] active:scale-95 transition-all whitespace-nowrap"
 >
 매장 연결하기 →
 </Link>
 <button
 type="button"
 onClick={() => {
 setDismissed(true)
 try { sessionStorage.setItem('localution.onboarding_dismissed', '1') } catch {}
 }}
 aria-label="닫기"
 className="w-7 h-7 flex items-center justify-center text-white/70 hover:text-white text-lg leading-none"
 >×</button>
 </div>
 </div>
 </div>
 )
}
