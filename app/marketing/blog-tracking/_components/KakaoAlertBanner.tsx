// app/marketing/blog-tracking/_components/KakaoAlertBanner.tsx
// ============================================================
// 카카오톡 알림 연결 배너 + 설정 모달 — 18차-5 (Hotfix 2026-04-21)
// · 미로그인: 회색 카드 + "로그인하고 연결하기" 버튼 → /login?redirect=...
// · 미연결: 노란색 카드 + "연결하기" 버튼 → /api/auth/kakao/start
// · 연결됨: 초록색 카드 + "설정" 버튼 → 모달
// · URL ?connected=kakao / ?connected=error&reason=... 쿼리 감지해서 토스트 표시
//
// Hotfix 2026-04-21:
// · /api/marketing/kakao 가 401 을 반환하면 "미로그인" 상태로 분기
// · 비로그인 상태에선 연결 버튼 대신 로그인 버튼 표시
// · 이렇게 하면 비로그인 사용자가 연결 버튼 누르고 /dashboard 로 튕기는 경로 차단
// ============================================================
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

type AlertPrefs = {
 band_change?: boolean
 entered?: boolean
 dropped?: boolean
 daily_digest?: boolean
}

type ConnectionInfo = {
 connected: boolean
 token: {
 nickname: string | null
 kakao_user_id: string | null
 expires_at: string | null
 alert_prefs: AlertPrefs | null
 updated_at: string | null
 } | null
 recent: Array<{
 id: string
 event_type: string
 message: string
 sent_status: string | null
 sent_error: string | null
 sent_at: string | null
 created_at: string
 }>
}

type LoadState =
 | { kind: 'loading' }
 | { kind: 'unauthenticated' } // 401
 | { kind: 'ready'; info: ConnectionInfo }
 | { kind: 'error'; message: string }

const DEFAULT_PREFS: Required<AlertPrefs> = {
 band_change: true,
 entered: true,
 dropped: true,
 daily_digest: true,
}

const LABELS: Record<keyof AlertPrefs, { title: string; desc: string }> = {
 band_change: { title: '구간 변동', desc: 'TOP3 ↔ TOP10 ↔ TOP30 ↔ TOP50 사이를 이동하면 알림' },
 entered: { title: '새로 진입', desc: '순위권 밖 → TOP50 안으로 들어오면 알림' },
 dropped: { title: '순위권 이탈', desc: 'TOP50 안 → 밖으로 떨어지면 알림' },
 daily_digest: { title: '아침 요약', desc: '매일 오전 8시 전체 타겟 현황 요약 (카톡 나에게 보내기)' },
}

export default function KakaoAlertBanner() {
 const [state, setState] = useState<LoadState>({ kind: 'loading' })
 const [modalOpen, setModalOpen] = useState(false)
 const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

 // ---- 초기 로드 + URL 쿼리 토스트 ----
 const load = useCallback(async () => {
 setState({ kind: 'loading' })
 try {
 const r = await fetch('/api/marketing/kakao', { cache: 'no-store' })
 if (r.status === 401) {
 setState({ kind: 'unauthenticated' })
 return
 }
 if (!r.ok) {
 const j = await r.json().catch(() => ({}))
 setState({ kind: 'error', message: j.error || `서버 응답 ${r.status}` })
 return
 }
 const info = await r.json() as ConnectionInfo
 setState({ kind: 'ready', info })
 } catch (e) {
 setState({ kind: 'error', message: e instanceof Error ? e.message : 'load failed' })
 }
 }, [])

 useEffect(() => {
 load()
 if (typeof window === 'undefined') return
 const sp = new URLSearchParams(window.location.search)
 const c = sp.get('connected')
 if (c === 'kakao') {
 setToast({ kind: 'ok', text: '카카오톡 알림 연결이 완료됐어요.' })
 const url = new URL(window.location.href)
 url.searchParams.delete('connected')
 window.history.replaceState({}, '', url.toString())
 } else if (c === 'error') {
 const reason = sp.get('reason') || 'unknown'
 setToast({ kind: 'err', text: `연결 실패: ${decodeURIComponent(reason)}` })
 const url = new URL(window.location.href)
 url.searchParams.delete('connected')
 url.searchParams.delete('reason')
 window.history.replaceState({}, '', url.toString())
 }
 }, [load])

 useEffect(() => {
 if (!toast) return
 const t = setTimeout(() => setToast(null), 4000)
 return () => clearTimeout(t)
 }, [toast])

 const info = state.kind === 'ready' ? state.info : null
 const connected = !!info?.connected
 const nickname = info?.token?.nickname || '내 카카오톡'
 const prefs: Required<AlertPrefs> = useMemo(() => ({
 ...DEFAULT_PREFS,
 ...(info?.token?.alert_prefs ?? {}),
 }), [info])

 // ---- 액션 ----
 const onConnect = () => {
 const redirect = encodeURIComponent('/marketing/blog-tracking')
 window.location.href = `/api/auth/kakao/start?redirect=${redirect}`
 }

 const onLogin = () => {
 const redirect = encodeURIComponent('/marketing/blog-tracking')
 window.location.href = `/login?redirect=${redirect}&connect_hint=kakao`
 }

 const onPrefChange = async (key: keyof AlertPrefs, val: boolean) => {
 if (state.kind !== 'ready' || !state.info.token) return
 const nextPrefs = { ...prefs, [key]: val }
 setState({ kind: 'ready', info: {
 ...state.info,
 token: { ...state.info.token, alert_prefs: nextPrefs },
 }})
 try {
 const r = await fetch('/api/marketing/kakao/prefs', {
 method: 'PATCH',
 headers: { 'content-type': 'application/json' },
 body: JSON.stringify({ alert_prefs: { [key]: val } }),
 })
 if (!r.ok) throw new Error((await r.json()).error || 'prefs update failed')
 } catch (e) {
 setToast({ kind: 'err', text: e instanceof Error ? e.message : '설정 저장 실패' })
 load()
 }
 }

 const onTestSend = async () => {
 setToast({ kind: 'ok', text: '테스트 메시지 발송 중...' })
 try {
 const r = await fetch('/api/marketing/kakao/test', { method: 'POST' })
 const j = await r.json()
 if (!r.ok) throw new Error(j.error || 'test send failed')
 setToast({ kind: 'ok', text: '테스트 메시지 발송 완료. 카톡을 확인하세요.' })
 } catch (e) {
 setToast({ kind: 'err', text: e instanceof Error ? e.message : '테스트 발송 실패' })
 }
 }

 const onDisconnect = async () => {
 if (!confirm('카카오톡 알림 연결을 해제할까요? 저장된 토큰이 삭제됩니다.')) return
 try {
 const r = await fetch('/api/marketing/kakao', { method: 'DELETE' })
 if (!r.ok) throw new Error((await r.json()).error || 'disconnect failed')
 setToast({ kind: 'ok', text: '연결이 해제되었습니다.' })
 setModalOpen(false)
 load()
 } catch (e) {
 setToast({ kind: 'err', text: e instanceof Error ? e.message : '연결 해제 실패' })
 }
 }

 // ---- 렌더 ----
 if (state.kind === 'loading') {
 return (
 <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
 카카오톡 알림 상태 확인 중...
 </div>
 )
 }

 if (state.kind === 'unauthenticated') {
 return (
 <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-300 bg-slate-50 px-4 py-3">
 <div className="flex items-center gap-3">
 <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-400 text-white">
 ?
 </span>
 <div>
 <div className="text-sm font-semibold text-slate-800">
 로그인 후 카카오톡 알림을 연결할 수 있어요.
 </div>
 <div className="text-xs text-slate-600">
 로그인하면 내 글 순위 변동을 카톡으로 받아볼 수 있습니다.
 </div>
 </div>
 </div>
 <button
 type="button"
 onClick={onLogin}
 className="rounded-lg bg-slate-800 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-700"
 >
 로그인하기
 </button>
 </div>
 )
 }

 if (state.kind === 'error') {
 return (
 <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
 카카오 알림 상태 확인 실패: {state.message}
 </div>
 )
 }

 return (
 <>
 {/* 배너 */}
 {connected ? (
 <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
 <div className="flex items-center gap-3">
 <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white">
 ✓
 </span>
 <div>
 <div className="text-sm font-semibold text-emerald-900">
 카카오톡 알림 연결됨 · {nickname}
 </div>
 <div className="text-xs text-emerald-700">
 순위 변동이 감지되면 카톡 "나에게 보내기"로 알림이 전송됩니다.
 </div>
 </div>
 </div>
 <button
 type="button"
 onClick={() => setModalOpen(true)}
 className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
 >
 설정
 </button>
 </div>
 ) : (
 <div className="mb-4 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
 <div className="flex items-center gap-3">
 <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-white">
 !
 </span>
 <div>
 <div className="text-sm font-semibold text-amber-900">
 카카오톡 알림이 아직 연결되지 않았습니다.
 </div>
 <div className="text-xs text-amber-700">
 연결하면 순위 변동·이탈·진입·아침 요약을 카톡으로 받을 수 있어요.
 </div>
 </div>
 </div>
 <button
 type="button"
 onClick={onConnect}
 className="rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-600"
 >
 연결하기
 </button>
 </div>
 )}

 {/* 토스트 */}
 {toast && (
 <div
 className={`fixed bottom-6 right-6 z-50 rounded-lg px-4 py-3 shadow-lg text-sm font-medium ${
 toast.kind === 'ok'
 ? 'bg-emerald-600 text-white'
 : 'bg-rose-600 text-white'
 }`}
 >
 {toast.text}
 </div>
 )}

 {/* 설정 모달 */}
 {modalOpen && connected && info && (
 <div
 className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
 onClick={() => setModalOpen(false)}
 >
 <div
 className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
 onClick={e => e.stopPropagation()}
 >
 <div className="flex items-center justify-between border-b px-5 py-3">
 <h2 className="text-base font-bold">카카오톡 알림 설정</h2>
 <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700">
 ✕
 </button>
 </div>

 <div className="space-y-3 p-5">
 {(Object.keys(LABELS) as (keyof AlertPrefs)[]).map(key => (
 <label
 key={key}
 className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 p-3 hover:bg-slate-50"
 >
 <div>
 <div className="text-sm font-semibold text-slate-900">{LABELS[key].title}</div>
 <div className="text-xs text-slate-500">{LABELS[key].desc}</div>
 </div>
 <input
 type="checkbox"
 checked={!!prefs[key]}
 onChange={e => onPrefChange(key, e.target.checked)}
 className="mt-1 h-5 w-5 accent-emerald-600"
 />
 </label>
 ))}

 {info.recent && info.recent.length > 0 && (
 <div className="mt-2 rounded-lg bg-slate-50 p-3">
 <div className="mb-1 text-xs font-semibold text-slate-600">최근 발송 5건</div>
 <ul className="space-y-1 text-xs">
 {info.recent.map(r => (
 <li key={r.id} className="flex items-center gap-2">
 <span className={`inline-block h-1.5 w-1.5 rounded-full ${
 r.sent_status === 'sent' ? 'bg-emerald-500' : 'bg-rose-500'
 }`} />
 <span className="text-slate-500">
 {new Date(r.created_at).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })}
 </span>
 <span className="text-slate-400">·</span>
 <span className="font-medium text-slate-700">{r.event_type}</span>
 {r.sent_error && <span className="text-rose-600">({r.sent_error})</span>}
 </li>
 ))}
 </ul>
 </div>
 )}
 </div>

 <div className="flex items-center justify-between gap-2 border-t bg-slate-50 px-5 py-3 rounded-b-2xl">
 <button
 type="button"
 onClick={onDisconnect}
 className="text-sm text-rose-600 hover:underline"
 >
 연결 해제
 </button>
 <div className="flex gap-2">
 <button
 type="button"
 onClick={onTestSend}
 className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
 >
 테스트 발송
 </button>
 <button
 type="button"
 onClick={() => setModalOpen(false)}
 className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-700"
 >
 닫기
 </button>
 </div>
 </div>
 </div>
 </div>
 )}
 </>
 )
}
