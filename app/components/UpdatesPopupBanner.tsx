'use client'

/**
 * UpdatesPopupBanner — 새 업데이트 내역 팝업 (19차-2)
 *
 * 동작 규칙 (대표님 지시):
 * 1. 새 업데이트가 있을 때만 노출.
 * 2. "오늘 그만보기"(24h) 누르면 오늘 안 보여줌.
 * 3. "확인했어요"/"다시 안보기"(해당 id) 누르면 같은 업데이트는 다시 안 띄움.
 * 4. 보여줄 영역: 로그인 후 주요 동선(대시보드·마케팅·리뷰·QR·고객·커뮤니티·설정·문의·내구독·updates).
 * 루트("/"), 로그인/회원가입, /onboarding, /locked 같은 공개 랜딩 계열은 제외.
 *
 * 저장 키 (모두 localStorage):
 * localution.updates.lastSeenId — 마지막으로 확인(또는 다시 안보기 선택)한 id
 * localution.updates.dismissTodayUntil — 오늘 그만보기 해제되는 timestamp (ms, Date.now 기준)
 *
 * 데이터 소스: GET /api/updates (active=true, released_at DESC, revalidate 60)
 *
 * SSR 회피: 'use client' + 첫 렌더는 null, mount 이후에만 fetch.
 */

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, X, ArrowRight, EyeOff } from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// 타입 / 상수
// ─────────────────────────────────────────────────────────────
type UpdateItem = {
 id: string
 title: string
 summary: string | null
 highlight: string | null
 category: 'feature' | 'fix' | 'notice' | 'beta' | string
 released_at: string
 cover_url?: string | null
 link_url?: string | null
}

const LS_LAST_SEEN = 'localution.updates.lastSeenId'
const LS_DISMISS_TIL = 'localution.updates.dismissTodayUntil'

// 공개 랜딩/OAuth 구간에서는 팝업 금지
const EXCLUDE_PREFIXES = [
 '/login', '/signup', '/auth', '/onboarding', '/locked',
 '/updates', // 업데이트 내역 본인 페이지에선 이중 노출 금지
]
const EXCLUDE_EXACT = new Set<string>(['/', '/privacy', '/terms'])

function isEligiblePath(pathname: string | null): boolean {
 if (!pathname) return false
 if (EXCLUDE_EXACT.has(pathname)) return false
 if (EXCLUDE_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))) return false
 return true
}

function formatDate(ymd: string): string {
 // 'YYYY-MM-DD' → 'YYYY.MM.DD'
 if (!ymd || typeof ymd !== 'string' || ymd.length < 10) return ymd
 return ymd.slice(0, 10).replace(/-/g, '.')
}

const CATEGORY_META: Record<string, { label: string; bg: string; text: string }> = {
 feature: { label: 'NEW', bg: '#EFF6FF', text: '#3182F6' },
 fix: { label: 'FIX', bg: '#FEF3F2', text: '#DC2626' },
 notice: { label: '공지', bg: '#F5F3FF', text: '#7C3AED' },
 beta: { label: 'BETA', bg: '#ECFDF5', text: '#059669' },
}

// ─────────────────────────────────────────────────────────────
// 컴포넌트
// ─────────────────────────────────────────────────────────────
export default function UpdatesPopupBanner() {
 const pathname = usePathname()
 const router = useRouter()
 const [item, setItem] = useState<UpdateItem | null>(null)
 const [open, setOpen] = useState(false)
 const [loading, setLoading] = useState(false)

 useEffect(() => {
 // 경로가 대상 아니면 즉시 종료
 if (!isEligiblePath(pathname)) { setOpen(false); return }

 // 오늘 그만보기 체크
 try {
 const until = parseInt(localStorage.getItem(LS_DISMISS_TIL) || '0', 10)
 if (Number.isFinite(until) && until > Date.now()) { setOpen(false); return }
 } catch {}

 let cancelled = false
 ;(async () => {
 setLoading(true)
 try {
 const res = await fetch('/api/updates', { cache: 'no-store' })
 if (!res.ok) return
 const data = await res.json() as { updates?: UpdateItem[] }
 const latest = Array.isArray(data?.updates) && data.updates.length > 0 ? data.updates[0] : null
 if (cancelled || !latest) return

 // 이미 본 업데이트면 스킵
 const seen = localStorage.getItem(LS_LAST_SEEN)
 if (seen === latest.id) return

 setItem(latest)
 setOpen(true)
 } catch {
 // 네트워크 오류시 조용히 무시 (중요 UI 아님)
 } finally {
 if (!cancelled) setLoading(false)
 }
 })()

 return () => { cancelled = true }
 }, [pathname])

 if (!open || !item) return null

 const meta = CATEGORY_META[item.category] || { label: item.category.toUpperCase(), bg: '#F2F4F6', text: '#4E5968' }

 const markSeen = () => {
 try { localStorage.setItem(LS_LAST_SEEN, item.id) } catch {}
 }

 const handleDismissToday = () => {
 try { localStorage.setItem(LS_DISMISS_TIL, String(Date.now() + 24 * 60 * 60 * 1000)) } catch {}
 setOpen(false)
 }

 const handleHideThis = () => {
 markSeen()
 setOpen(false)
 }

 const handleGoDetail = () => {
 markSeen()
 setOpen(false)
 if (item.link_url) {
 // 외부 링크 또는 내부 경로 모두 대응
 if (/^https?:\/\//i.test(item.link_url)) {
 window.open(item.link_url, '_blank', 'noopener,noreferrer')
 } else {
 router.push(item.link_url)
 }
 } else {
 router.push('/updates')
 }
 }

 return (
 <div
 className="fixed inset-0 z-[70] flex items-end justify-end p-3 sm:p-6 pointer-events-none"
 aria-live="polite"
 >
 <div
 className="pointer-events-auto w-full sm:max-w-[380px] rounded-2xl bg-white shadow-[0_12px_40px_rgba(0,0,0,0.14)] ring-1 ring-[#E5E8EB] overflow-hidden"
 role="dialog"
 aria-labelledby="updates-popup-title"
 >
 {/* 상단 컬러 바 */}
 <div className="h-1 bg-gradient-to-r from-[#3182F6] via-[#5B8DEF] to-[#1B64DA]" />

 <div className="p-4 sm:p-5">
 <div className="flex items-start gap-3">
 <div
 className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
 style={{ background: meta.bg }}
 >
 <Bell size={18} strokeWidth={2.5} style={{ color: meta.text }} />
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-1">
 <span
 className="text-[10px] font-black tracking-wider px-1.5 py-0.5 rounded-md"
 style={{ background: meta.bg, color: meta.text }}
 >
 {meta.label}
 </span>
 <span className="text-[10px] text-[#8B95A1] font-semibold">{formatDate(item.released_at)}</span>
 </div>
 <h3 id="updates-popup-title" className="text-[15px] font-black text-[#191F28] leading-snug truncate">
 {item.title}
 </h3>
 </div>
 <button
 onClick={handleHideThis}
 aria-label="닫기"
 className="flex-shrink-0 w-7 h-7 rounded-lg hover:bg-[#F2F4F6] flex items-center justify-center text-[#8B95A1] hover:text-[#191F28] transition"
 >
 <X size={15} strokeWidth={2.5} />
 </button>
 </div>

 {item.summary && (
 <p className="mt-3 text-[13px] text-[#4E5968] leading-relaxed line-clamp-3">
 {item.summary}
 </p>
 )}
 {item.highlight && (
 <p className="mt-2 text-[12.5px] font-semibold text-[#3182F6] leading-relaxed line-clamp-2">
 {item.highlight}
 </p>
 )}

 {/* 액션 */}
 <div className="mt-4 flex items-center gap-2">
 <button
 onClick={handleGoDetail}
 className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#3182F6] hover:bg-[#1B64DA] text-white text-[13px] font-bold transition"
 >
 자세히 보기
 <ArrowRight size={13} strokeWidth={2.5} />
 </button>
 <button
 onClick={handleDismissToday}
 className="inline-flex items-center gap-1 px-3 py-2.5 rounded-xl bg-[#F2F4F6] hover:bg-[#E5E8EB] text-[#4E5968] text-[12px] font-semibold transition whitespace-nowrap"
 title="24시간 동안 이 배너를 띄우지 않아요"
 >
 <EyeOff size={12} strokeWidth={2.5} />
 오늘 그만보기
 </button>
 </div>

 <button
 onClick={handleHideThis}
 className="mt-2 w-full text-[11px] text-[#8B95A1] hover:text-[#4E5968] font-medium underline-offset-2 hover:underline transition"
 >
 이 업데이트 다시 안보기
 </button>
 </div>
 </div>
 {/* loading은 시각 UI 노출 안 함 (불필요한 깜빡임 방지) */}
 {loading ? null : null}
 </div>
 )
}
