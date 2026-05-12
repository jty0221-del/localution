'use client'

// ============================================================
// 신규 사용자 onboarding checklist (4 step)
// · 대시보드/홈 진입 시 가장 위에 큰 카드로 노출
// · 각 step 완료 여부에 따라 체크 표시
// · 모든 step 완료 → 컴포넌트 자체가 숨김
// · 이모티콘 전면 제거 → lucide 아이콘 + 그라데이션
// ============================================================
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Rocket, Store, Link2, Bell, QrCode, Check, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Status = {
 store_registered: boolean
 naver_connected: boolean
 notify_configured: boolean
 qr_first_scan: boolean
 autoreply_enabled: boolean
}

type StepDef = {
 key: keyof Status
 done: boolean
 Icon: LucideIcon
 iconBg: string
 title: string
 desc: string
 cta: string
 href: string
}

export default function OnboardingChecklist() {
 const [status, setStatus] = useState<Status | null>(null)
 const [loading, setLoading] = useState(true)
 const [collapsed, setCollapsed] = useState(false)

 useEffect(() => {
 let cancelled = false
 ;(async () => {
 try {
 const [storesRes, prefsRes, kakaoRes, statsRes, autoreplyRes] = await Promise.all([
 fetch('/api/stores/me', { credentials: 'include', cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null),
 fetch('/api/notify/prefs', { credentials: 'include', cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null),
 fetch('/api/notify/kakao-status', { credentials: 'include', cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null),
 fetch('/api/qr/stats?days=30', { credentials: 'include', cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null),
 fetch('/api/autoreply/settings?platform=naver_place', { credentials: 'include', cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null),
 ])
 if (cancelled) return

 const store = storesRes?.store
 const platforms = storesRes?.platforms || []
 const naverConnected = platforms.some((p: any) => p.platform === 'naver_place' && p.connected)
 const prefs = prefsRes?.prefs
 const hasWebPush = !!(prefs?.has_web_push_sub && prefs?.channel_web_push)
 const hasKakao = !!(kakaoRes?.connected && prefs?.channel_kakao_talk)
 const firstScan = (statsRes?.funnel?.scan ?? 0) > 0
 const autoreplyOn = !!(autoreplyRes?.settings?.enabled)

 setStatus({
 store_registered: !!(store && store.name),
 naver_connected: naverConnected,
 notify_configured: hasWebPush || hasKakao,
 qr_first_scan: firstScan,
 autoreply_enabled: autoreplyOn,
 })

 if (typeof window !== 'undefined' && sessionStorage.getItem('localution.onboarding_collapsed') === '1') {
 setCollapsed(true)
 }
 } catch (_) {}
 finally { if (!cancelled) setLoading(false) }
 })()
 return () => { cancelled = true }
 }, [])

 if (loading || !status) return null

 const allDone = status.store_registered && status.naver_connected && status.notify_configured && status.qr_first_scan && status.autoreply_enabled
 if (allDone) return null

 const doneCount = [status.store_registered, status.naver_connected, status.notify_configured, status.qr_first_scan, status.autoreply_enabled]
 .filter(Boolean).length
 const pct = Math.round((doneCount / 5) * 100)

 if (collapsed) {
 return (
 <button
 onClick={() => {
 setCollapsed(false)
 try { sessionStorage.removeItem('localution.onboarding_collapsed') } catch {}
 }}
 className="fixed bottom-20 right-4 z-[45] px-4 py-2 rounded-full bg-[#3182F6] text-white text-xs font-bold shadow-lg hover:bg-[#1E40AF] flex items-center gap-2"
 >
 <Rocket size={12} strokeWidth={2.5} />
 <span>설정 {doneCount}/5 완료</span>
 </button>
 )
 }

 const STEPS: StepDef[] = [
 {
 key: 'store_registered',
 done: status.store_registered,
 Icon: Store,
 iconBg: 'from-[#3182F6] to-[#1B64DA]',
 title: '매장 정보 등록',
 desc: '매장명, 주소, 카테고리 — 모든 페이지에 자동 반영',
 cta: '매장 등록하기',
 href: '/my/platforms/naver_place/connect',
 },
 {
 key: 'naver_connected',
 done: status.naver_connected,
 Icon: Link2,
 iconBg: 'from-[#03C75A] to-[#059669]',
 title: '네이버 플레이스 연결',
 desc: '답글 자동등록 + 매장 정보 자동 동기화',
 cta: '네이버 연결하기',
 href: '/my/platforms/naver_place/connect',
 },
 {
 key: 'notify_configured',
 done: status.notify_configured,
 Icon: Bell,
 iconBg: 'from-[#F59E0B] to-[#DC2626]',
 title: '알림 받기 설정',
 desc: '새 리뷰가 오면 즉시 카카오톡 / 브라우저 알림',
 cta: '알림 켜기',
 href: '/settings?tab=notify',
 },
 {
 key: 'qr_first_scan',
 done: status.qr_first_scan,
 Icon: QrCode,
 iconBg: 'from-[#7C3AED] to-[#3182F6]',
 title: 'QR 코드 만들기',
 desc: '손님이 영수증 + 사진 1장으로 리뷰 자동 작성',
 cta: 'QR 만들러 가기',
 href: '/qr-admin',
 },
 {
 key: 'autoreply_enabled',
 done: status.autoreply_enabled,
 Icon: Sparkles,
 iconBg: 'from-[#EC4899] to-[#8B5CF6]',
 title: 'AI 자동답글 켜기',
 desc: '4시간마다 미답변 리뷰에 AI 초안 자동 작성 — 답글 직접 안 달아도 됨',
 cta: '자동답글 켜기',
 href: '/settings?tab=ai',
 },
 ]

 return (
 <div className="bg-gradient-to-br from-[#EFF6FF] via-[#F8FAFF] to-[#F3E8FF] rounded-2xl p-5 border border-[#BFDBFE] shadow-sm mb-6">
 <div className="flex items-start justify-between gap-3 mb-4">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3182F6] to-[#7C3AED] flex items-center justify-center shadow-sm flex-shrink-0">
 <Rocket size={22} className="text-white" strokeWidth={2.5} />
 </div>
 <div>
 <h3 className="font-black text-[#191F28] text-base">시작하기</h3>
 <p className="text-xs text-[#4E5968] mt-0.5">
 {doneCount}개 완료 · {5 - doneCount}개 남음 — 모두 끝나면 모든 기능 자동 작동
 </p>
 </div>
 </div>
 <button
 onClick={() => {
 setCollapsed(true)
 try { sessionStorage.setItem('localution.onboarding_collapsed', '1') } catch {}
 }}
 className="text-xs text-[#8B95A1] hover:text-[#191F28] px-2"
 >숨기기</button>
 </div>

 <div className="h-2 bg-white rounded-full overflow-hidden mb-5">
 <div
 className="h-full bg-gradient-to-r from-[#3182F6] to-[#7C3AED] transition-all"
 style={{ width: pct + '%' }}
 />
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 {STEPS.map((s, i) => {
 const Ic = s.Icon
 return (
 <Link
 key={s.key}
 href={s.done ? '#' : s.href}
 onClick={s.done ? (e) => e.preventDefault() : undefined}
 className={`flex items-center gap-3 p-3.5 rounded-xl transition-colors ${
 s.done
 ? 'bg-[#F0FDF4] border-2 border-[#BBF7D0] cursor-default'
 : 'bg-white border-2 border-[#E5E8EB] hover:border-[#3182F6] hover:shadow-md cursor-pointer'
 }`}>
 <div className="flex-shrink-0 relative">
 <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
 s.done ? 'bg-[#059669]' : `bg-gradient-to-br ${s.iconBg}`
 }`}>
 <Ic size={18} className="text-white" strokeWidth={2.5} />
 </div>
 <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white ${
 s.done ? 'bg-[#059669] text-white' : 'bg-[#E5E8EB] text-[#8B95A1]'
 }`}>
 {s.done ? <Check size={10} strokeWidth={3} /> : i + 1}
 </span>
 </div>
 <div className="flex-1 min-w-0">
 <p className={`text-sm font-bold truncate ${s.done ? 'text-[#059669]' : 'text-[#191F28]'}`}>
 {s.title}
 {s.done && <span className="text-[10px] ml-1.5 font-medium">완료</span>}
 </p>
 <p className="text-[11px] text-[#8B95A1] truncate">
 {s.done ? '잘 되고 있어요' : s.desc}
 </p>
 </div>
 {!s.done && (
 <span className="text-xs text-[#3182F6] font-bold whitespace-nowrap">
 {s.cta} →
 </span>
 )}
 </Link>
 )
 })}
 </div>
 </div>
 )
}
