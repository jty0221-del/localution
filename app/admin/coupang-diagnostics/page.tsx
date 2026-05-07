'use client'
// ============================================================
// 어드민 — 쿠팡이츠 연동 진단 페이지 (PC + 모바일 최적화)
// /admin/coupang-diagnostics
//   · PC: 표 레이아웃 + 우측 액션 버튼
//   · 모바일: 카드 레이아웃 (한 사용자 = 한 카드, 가로 스크롤 X)
//   · CLAUDE.md 규칙: max-w-7xl / 반응형 padding / 폰트 단계별
// ============================================================

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import {
  RefreshCw, CheckCircle2, XCircle,
  Server, Activity, Clock, Zap, PlayCircle,
  Cookie, MessageSquare, User as UserIcon, Store,
} from 'lucide-react'

type StoreMeta = { id: string; name: string | null }

type User = {
  user_id: string
  account_id_mask: string | null
  store_name: string | null
  store_id: string | null
  all_store_ids?: string[]
  store_meta?: StoreMeta[]
  connected_at: string
  last_login_status: string | null
  last_login_at: string | null
  has_session_cookies: boolean
  session_cookie_count: number
  has_unify_token: boolean
  cookies_age_hours: number | null
  review_count: number
  last_review_posted_at: string | null
  last_collected_at: string | null
  collected_age_hours: number | null
  likely_issue: string
}

type Diag = {
  ok: boolean
  generated_at: string
  env: Record<string, boolean>
  queue: any
  summary: { total_users: number; ok_users: number; issues: Record<string, number> }
  users: User[]
  legend: Record<string, string>
}

const ISSUE_COLOR: Record<string, string> = {
  ok: '#059669',
  no_cookies: '#DC2626',
  login_failed: '#DC2626',
  account_locked: '#D97706',
  cookies_stale: '#D97706',
  no_reviews_in_window: '#3182F6',
  never_fetched: '#7C3AED',
  fetch_stale: '#D97706',
}

const ISSUE_LABEL: Record<string, string> = {
  ok: '정상',
  no_cookies: '쿠키 없음',
  login_failed: '로그인 실패',
  account_locked: '계정 잠김',
  cookies_stale: '쿠키 만료',
  no_reviews_in_window: '리뷰 없음',
  never_fetched: '미수집',
  fetch_stale: '수집 지연',
}

function fmtDate(iso: string | null): string {
  if (!iso) return '-'
  try {
    const d = new Date(iso)
    return d.toLocaleString('ko-KR', { hour12: false }).replace(/\. /g, '-').replace('. ', ' ')
  } catch { return '-' }
}

function ageBadge(hours: number | null): string {
  if (hours === null) return '-'
  if (hours < 1) return '<1h'
  if (hours < 24) return hours + 'h'
  return Math.round(hours / 24) + 'd'
}

type ProbeStep = { name: string; ok: boolean; latency_ms: number; error?: string; result?: any }
type ProbeResult = { ok: boolean; generated_at: string; steps: ProbeStep[]; failed_steps: string[]; summary: string }

export default function CoupangDiagnosticsPage() {
  const [data, setData] = useState<Diag | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [probe, setProbe] = useState<ProbeResult | null>(null)
  const [probing, setProbing] = useState(false)
  const [fetchingUser, setFetchingUser] = useState<string | null>(null)
  const [fetchResult, setFetchResult] = useState<string | null>(null)
  const [showLegend, setShowLegend] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const r = await fetch('/api/admin/coupang-diagnostics', { cache: 'no-store' })
      const j = await r.json()
      if (!j.ok) { setError(j.error || 'failed'); return }
      setData(j)
    } catch (e: any) { setError(e?.message || 'fetch error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const runProbe = useCallback(async () => {
    setProbing(true); setProbe(null)
    try {
      const r = await fetch('/api/admin/coupang-system-probe', { cache: 'no-store' })
      setProbe(await r.json())
    } catch (e: any) {
      setProbe({ ok: false, generated_at: new Date().toISOString(), steps: [], failed_steps: [], summary: e?.message || 'probe failed' })
    } finally { setProbing(false) }
  }, [])

  const clearFailed = useCallback(async (force: boolean) => {
    const msg = force
      ? '전체 failed + delayed + active(stalled) 잡을 모두 정리하시겠어요? 진행 중인 active job 도 끊어집니다.'
      : '전체 failed + delayed 잡을 정리하시겠어요? (active 진행 중 job 은 유지)'
    if (!confirm(msg)) return
    setProbing(true); setFetchResult(null)
    try {
      const url = '/api/admin/queue-clear-failed' + (force ? '?force=1' : '')
      const r = await fetch(url, { cache: 'no-store' })
      const j = await r.json()
      setFetchResult(j.ok ? j.message : '실패: ' + (j.error || ''))
      setTimeout(() => load(), 2000)
    } catch (e: any) { setFetchResult('오류: ' + (e?.message || 'unknown')) }
    finally { setProbing(false) }
  }, [load])

  const triggerCron = useCallback(async () => {
    if (!confirm('전체 배달 플랫폼(쿠팡/배민/요기요) cron 을 지금 수동 실행하시겠어요?')) return
    setProbing(true); setFetchResult(null)
    try {
      const r = await fetch('/api/admin/trigger-delivery-cron', { cache: 'no-store' })
      const j = await r.json()
      setFetchResult(j.ok ? `Cron 실행: ${j.message}` : '실패: ' + (j.error || ''))
      setTimeout(() => load(), 5000)
    } catch (e: any) { setFetchResult('오류: ' + (e?.message || 'unknown')) }
    finally { setProbing(false) }
  }, [load])

  const triggerManualFetch = useCallback(async (userId: string, days: number) => {
    if (!confirm(`${userId.slice(0, 8)} 사용자의 쿠팡 리뷰 ${days}일치를 지금 fetch 하시겠어요?`)) return
    setFetchingUser(userId); setFetchResult(null)
    try {
      const r = await fetch('/api/admin/trigger-fetch?platform=coupangeats&user_id=' + userId + '&days=' + days, { cache: 'no-store' })
      const j = await r.json()
      setFetchResult(j.ok ? '큐 등록 완료 — ' + (j.jobId || '') : '실패: ' + (j.error || ''))
      setTimeout(() => load(), 3000)
    } catch (e: any) { setFetchResult('오류: ' + (e?.message || 'unknown')) }
    finally { setFetchingUser(null) }
  }, [load])

  const testFetch = useCallback(async (userId: string) => {
    const sid = prompt('테스트할 storeId 입력 (예: 779523)\n\n저장된 쿠키로 즉시 fetch — interpretation 결과로 storeId 유효성 확인')
    if (!sid || !/^\d+$/.test(sid.trim())) return
    setFetchingUser(userId); setFetchResult(null)
    try {
      const r = await fetch(`/api/admin/coupang-test-fetch?user_id=${userId}&store_id=${sid.trim()}&days=30`, { cache: 'no-store' })
      const j = await r.json()
      if (j.review_count > 0) {
        const nameInput = prompt(
          `${j.interpretation}\n\n샘플:\n별점 ${j.sample?.rating}\n"${j.sample?.comment}"\n\n` +
          `매장명도 함께 등록하시겠어요? (선택)\n예: 김치찜 참 잘하는집 옥련점\n\n` +
          `비워두면 매장명 없이 등록됩니다. 취소하면 등록 안 함.`,
          ''
        )
        if (nameInput === null) {
          setFetchResult(j.interpretation)
          return
        }
        await fetch('/api/admin/set-coupang-stores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            store_ids: [sid.trim()],
            primary_store_id: sid.trim(),
            store_name: nameInput.trim() || undefined,
          }),
        })
        await fetch('/api/admin/trigger-fetch?platform=coupangeats&user_id=' + userId + '&days=180', { cache: 'no-store' })
        setFetchResult(`매장 ${sid}${nameInput.trim() ? ' (' + nameInput.trim() + ')' : ''} 등록 + 180일치 fetch 시작`)
        setTimeout(() => load(), 5000)
      } else {
        setFetchResult(j.interpretation + ` (HTTP ${j.status})`)
      }
    } catch (e: any) { setFetchResult('오류: ' + (e?.message || 'unknown')) }
    finally { setFetchingUser(null) }
  }, [load])

  const discoverStores = useCallback(async (userId: string) => {
    setFetchingUser(userId); setFetchResult(null)
    try {
      const r = await fetch('/api/admin/coupang-discover-stores?user_id=' + userId, { cache: 'no-store' })
      const j = await r.json()
      if (!j.ok) {
        setFetchResult(`발견 실패 [${j.step}]: ${j.error}` + (j.hint ? ` · ${j.hint}` : ''))
        return
      }
      const stores = j.discovered_stores || []
      if (stores.length === 0) {
        setFetchResult('매장 0개 — 권한 없는 계정일 가능성. 사장님 직접 확인 필요')
        return
      }
      // 매장 목록 alert + 자동 등록 제안
      const list = stores.map((s: any, i: number) =>
        `${i + 1}) ${s.storeId}${s.name ? ' (' + s.name + ')' : ''}`
      ).join('\n')
      const ok = confirm(
        `발견된 매장 (${stores.length}개):\n\n${list}\n\n` +
        `현재 primary: ${j.current_primary_store_id || '(없음)'}\n\n` +
        `이 모든 매장을 자동 등록하시겠어요?\n(첫 번째가 primary 가 됩니다)`
      )
      if (!ok) return
      const ids = stores.map((s: any) => s.storeId)
      const setRes = await fetch('/api/admin/set-coupang-stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, store_ids: ids, primary_store_id: ids[0] }),
      })
      const setJson = await setRes.json()
      if (setJson.ok) {
        setFetchResult(`매장 ${ids.length}개 자동 등록 + 180일치 fetch 시작`)
        await fetch('/api/admin/trigger-fetch?platform=coupangeats&user_id=' + userId + '&days=180', { cache: 'no-store' })
        setTimeout(() => load(), 5000)
      } else {
        setFetchResult('등록 실패: ' + (setJson.error || ''))
      }
    } catch (e: any) { setFetchResult('오류: ' + (e?.message || 'unknown')) }
    finally { setFetchingUser(null) }
  }, [load])

  const setStoreIds = useCallback(async (userId: string, currentMeta: StoreMeta[]) => {
    // 1) ID 입력 (쉼표 구분)
    const currentStr = currentMeta.length > 0 ? currentMeta.map(m => m.id).join(', ') : ''
    const idsInput = prompt(
      `${userId.slice(0, 8)} 사용자의 쿠팡이츠 매장 ID 설정\n\n` +
      `여러 매장은 쉼표로 구분 (예: 779523, 824040)\n` +
      `첫 번째가 primary 가 됩니다.`,
      currentStr
    )
    if (idsInput === null) return
    const ids = idsInput.split(',').map(s => s.trim()).filter(s => /^\d+$/.test(s))
    if (ids.length === 0) { alert('숫자 ID 최소 1개 입력 필요'); return }

    // 2) 각 매장 이름 순차 입력
    const meta: { id: string; name: string }[] = []
    for (let i = 0; i < ids.length; i++) {
      const sid = ids[i]
      const existingName = currentMeta.find(m => m.id === sid)?.name || ''
      const nameInput = prompt(
        `${i + 1}/${ids.length}. 매장 ${sid} 의 이름?\n\n예: 김치찜 참 잘하는집 옥련점, 별5제육&두루치기\n\n비워두면 이름 미저장`,
        existingName
      )
      if (nameInput === null) return  // 취소
      meta.push({ id: sid, name: nameInput.trim() })
    }

    setFetchingUser(userId); setFetchResult(null)
    try {
      const r = await fetch('/api/admin/set-coupang-stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          store_meta: meta,
          primary_store_id: meta[0].id,
        }),
      })
      const j = await r.json()
      setFetchResult(j.ok ? j.message : '실패: ' + (j.error || ''))
      if (j.ok && confirm(`매장 ${ids.length}개 모두 즉시 fetch 하시겠어요?`)) {
        await fetch('/api/admin/trigger-fetch?platform=coupangeats&user_id=' + userId + '&days=180', { cache: 'no-store' })
        setFetchResult((j.message || '') + ' · 180일치 fetch 큐 등록됨')
      }
      setTimeout(() => load(), 3000)
    } catch (e: any) { setFetchResult('오류: ' + (e?.message || 'unknown')) }
    finally { setFetchingUser(null) }
  }, [load])

  const retryLogin = useCallback(async (userId: string) => {
    if (!confirm(`${userId.slice(0, 8)} 사용자의 쿠팡 save-login 을 지금 재시도하시겠어요?\n\n저장된 비밀번호로 한국 proxy 통해 다시 로그인해 새 쿠키를 저장합니다.`)) return
    setFetchingUser(userId); setFetchResult(null)
    try {
      const r = await fetch('/api/admin/retry-coupang-login?user_id=' + userId, { cache: 'no-store' })
      const j = await r.json()
      if (j.ok) {
        setFetchResult(`재로그인 성공 (${j.elapsed_ms}ms · ${j.method} · 쿠키 ${j.cookie_count}개) — 자동 fetch 트리거 중`)
        // 즉시 14일 fetch 트리거
        await fetch('/api/admin/trigger-fetch?platform=coupangeats&user_id=' + userId + '&days=14', { cache: 'no-store' })
      } else {
        setFetchResult(`재로그인 실패 [${j.step}]: ${j.error}` + (j.hint ? ` · ${j.hint}` : ''))
      }
      setTimeout(() => load(), 3000)
    } catch (e: any) { setFetchResult('오류: ' + (e?.message || 'unknown')) }
    finally { setFetchingUser(null) }
  }, [load])

  const filteredUsers = data?.users.filter(u => filter === 'all' || u.likely_issue === filter) || []

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6">
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-3 mb-4 md:mb-6 flex-wrap">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl md:text-2xl font-black text-[#191F28] flex items-center gap-2">
              <Activity size={22} className="text-[#FF4B30] flex-shrink-0" strokeWidth={2.5} />
              쿠팡이츠 연동 진단
            </h1>
            <p className="text-xs md:text-sm text-[#4E5968] mt-1">
              전체 사장님 연결 상태 + 환경변수 + 큐 점검
            </p>
          </div>
          <button onClick={load} disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 md:px-4 md:py-2.5 rounded-xl bg-[#3182F6] text-white text-xs md:text-sm font-bold hover:bg-[#1B64DA] disabled:opacity-50 flex-shrink-0">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} strokeWidth={2.5} />
            새로고침
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 md:p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm">
            <strong>오류:</strong> {error}
          </div>
        )}

        {data && (
          <>
            {/* 환경변수 */}
            <section className="mb-4 p-3 md:p-4 rounded-2xl bg-white shadow-sm">
              <h2 className="text-sm md:text-base font-bold text-[#191F28] mb-2 md:mb-3 flex items-center gap-2">
                <Server size={16} className="text-[#3182F6]" strokeWidth={2.5} />
                환경변수
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5 md:gap-2">
                {Object.entries(data.env).map(([k, v]) => (
                  <div key={k} className={'flex items-center gap-1.5 p-2 rounded-lg text-[11px] md:text-xs font-bold ' + (v ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
                    {v ? <CheckCircle2 size={13} strokeWidth={2.5} className="flex-shrink-0" /> : <XCircle size={13} strokeWidth={2.5} className="flex-shrink-0" />}
                    <span className="truncate">{k}</span>
                  </div>
                ))}
              </div>
              {!data.env.PROXY_HOST && (
                <div className="mt-3 p-2.5 md:p-3 rounded-lg bg-amber-50 border border-amber-200 text-[11px] md:text-xs text-amber-900 leading-relaxed">
                  <strong>PROXY_HOST 없음</strong> — Akamai 통과 불가. iproyal residential proxy 환경변수 설정 필수.
                </div>
              )}
              {!data.env.ENCRYPTION_KEK_HEX && (
                <div className="mt-3 p-2.5 md:p-3 rounded-lg bg-red-50 border border-red-200 text-[11px] md:text-xs text-red-900 leading-relaxed">
                  <strong>ENCRYPTION_KEK_HEX 잘못됨</strong> — 64 hex 필요. 비밀번호/쿠키 저장 불가.
                </div>
              )}
            </section>

            {/* 시스템 활성 테스트 */}
            <section className="mb-4 p-3 md:p-4 rounded-2xl bg-white shadow-sm">
              <div className="flex items-start justify-between gap-2 mb-2 md:mb-3 flex-wrap">
                <h2 className="text-sm md:text-base font-bold text-[#191F28] flex items-center gap-2">
                  <Zap size={16} className="text-[#F59E0B]" strokeWidth={2.5} />
                  시스템 활성 테스트
                </h2>
                <div className="flex gap-1.5 flex-wrap">
                  <button onClick={runProbe} disabled={probing}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-2 rounded-lg bg-[#F59E0B] text-white text-[11px] md:text-xs font-bold hover:bg-[#D97706] disabled:opacity-50">
                    <PlayCircle size={13} className={probing ? 'animate-pulse' : ''} strokeWidth={2.5} />
                    {probing ? '실행 중...' : '지금 테스트'}
                  </button>
                  <button onClick={triggerCron} disabled={probing}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-2 rounded-lg bg-[#7C3AED] text-white text-[11px] md:text-xs font-bold hover:bg-[#6D28D9] disabled:opacity-50">
                    <Zap size={13} strokeWidth={2.5} />
                    Cron 수동
                  </button>
                </div>
              </div>
              <p className="text-[11px] md:text-xs text-[#8B95A1] mb-2 md:mb-3">
                proxy / Redis / 암호화 / Supabase / 쿠팡 endpoint 7단계 능동 검증 (5~15초)
              </p>

              {probe && (
                <div className="space-y-2">
                  <div className={'p-2.5 md:p-3 rounded-lg text-[11px] md:text-xs font-bold ' + (probe.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800')}>
                    {probe.summary}
                  </div>
                  <div className="space-y-1">
                    {probe.steps.map((s, i) => (
                      <div key={i} className={'p-2 rounded-lg flex items-start gap-2 text-[11px] md:text-xs ' + (s.ok ? 'bg-emerald-50' : 'bg-red-50')}>
                        {s.ok
                          ? <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                          : <XCircle size={14} className="text-red-600 flex-shrink-0 mt-0.5" strokeWidth={2.5} />}
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-[#191F28] flex items-center gap-1.5 flex-wrap">
                            <span>{s.name}</span>
                            <span className="text-[#8B95A1] font-normal text-[10px]">({s.latency_ms}ms)</span>
                          </div>
                          {s.error && <div className="text-red-700 mt-0.5 break-all">{s.error}</div>}
                          {s.result && <div className="text-[#4E5968] mt-0.5 font-mono text-[10px] break-all">{JSON.stringify(s.result)}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {fetchResult && (
              <div className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs md:text-sm text-blue-900">
                <strong>실행 결과:</strong> {fetchResult}
              </div>
            )}

            {/* BullMQ 큐 */}
            <section className="mb-4 p-3 md:p-4 rounded-2xl bg-white shadow-sm">
              <div className="flex items-start justify-between gap-2 mb-2 md:mb-3 flex-wrap">
                <h2 className="text-sm md:text-base font-bold text-[#191F28] flex items-center gap-2">
                  <Clock size={16} className="text-[#7C3AED]" strokeWidth={2.5} />
                  BullMQ 큐
                </h2>
                <div className="flex gap-1.5 flex-wrap">
                  <button onClick={() => clearFailed(false)} disabled={probing}
                    className="text-[11px] md:text-xs font-bold px-2.5 py-1.5 rounded-lg bg-[#F59E0B] text-white hover:bg-[#D97706] disabled:opacity-50">
                    Failed 정리
                  </button>
                  <button onClick={() => clearFailed(true)} disabled={probing}
                    className="text-[11px] md:text-xs font-bold px-2.5 py-1.5 rounded-lg bg-[#DC2626] text-white hover:bg-[#B91C1C] disabled:opacity-50"
                    title="active stalled 까지 강제 제거 — 워커 처리 중 job 도 끊어짐">
                    강제 정리
                  </button>
                </div>
              </div>
              {data.queue.error ? (
                <div className="text-xs text-red-700">큐 조회 실패: {data.queue.error}</div>
              ) : (
                <>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 md:gap-2 text-[11px] md:text-xs">
                    {Object.entries(data.queue.counts || {}).map(([k, v]: any) => (
                      <div key={k} className="p-2 rounded-lg bg-[#F2F4F6] min-w-0">
                        <div className="text-[#8B95A1] font-bold truncate">{k}</div>
                        <div className="text-base md:text-lg font-black text-[#191F28] tabular-nums">{v}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 md:mt-3 grid grid-cols-2 gap-1.5 md:gap-2 text-[11px] md:text-xs">
                    <div className="p-2 rounded-lg bg-[#FFE7E3] text-[#8B0F00]">
                      <span className="font-bold">쿠팡 waiting</span>
                      <span className="float-right tabular-nums">{data.queue.coupang_waiting || 0}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-[#FFE7E3] text-[#8B0F00]">
                      <span className="font-bold">쿠팡 active</span>
                      <span className="float-right tabular-nums">{data.queue.coupang_active || 0}</span>
                    </div>
                  </div>
                  {Array.isArray(data.queue.coupang_failed_recent) && data.queue.coupang_failed_recent.length > 0 && (
                    <div className="mt-3 p-2.5 md:p-3 rounded-lg bg-red-50 border border-red-200">
                      <div className="text-[11px] md:text-xs font-bold text-red-800 mb-2">
                        최근 실패 잡 ({data.queue.coupang_failed_recent.length})
                      </div>
                      <div className="space-y-1">
                        {data.queue.coupang_failed_recent.map((f: any, i: number) => (
                          <div key={i} className="text-[10px] md:text-[11px] text-red-700 leading-relaxed break-words">
                            <code className="font-mono bg-white px-1 rounded">{f.user_id?.slice(0, 8)}</code>
                            <span className="mx-1">·</span>
                            {f.action}
                            <span className="mx-1">·</span>
                            {f.attempts}회
                            <div className="text-[10px] text-red-600 mt-0.5 break-all">{f.reason}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* 요약 */}
            <section className="mb-4 grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
              <div className="p-3 md:p-4 rounded-2xl bg-white shadow-sm">
                <div className="text-[11px] md:text-xs font-bold text-[#8B95A1]">전체 사용자</div>
                <div className="text-xl md:text-2xl font-black text-[#191F28] tabular-nums">{data.summary.total_users}</div>
              </div>
              <div className="p-3 md:p-4 rounded-2xl bg-emerald-50 shadow-sm">
                <div className="text-[11px] md:text-xs font-bold text-emerald-700">정상</div>
                <div className="text-xl md:text-2xl font-black text-emerald-700 tabular-nums">{data.summary.ok_users}</div>
              </div>
              <div className="col-span-2 md:col-span-1 p-3 md:p-4 rounded-2xl bg-red-50 shadow-sm">
                <div className="text-[11px] md:text-xs font-bold text-red-700 mb-1.5">문제 분포</div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(data.summary.issues).filter(([k]) => k !== 'ok').map(([k, v]) => (
                    <button key={k} onClick={() => setFilter(k)}
                      className="text-[10px] md:text-[11px] font-bold px-1.5 py-0.5 rounded text-white"
                      style={{ background: ISSUE_COLOR[k] || '#6B7280' }}>
                      {ISSUE_LABEL[k] || k}: {v}
                    </button>
                  ))}
                  {Object.entries(data.summary.issues).filter(([k]) => k !== 'ok').length === 0 && (
                    <span className="text-[11px] text-[#8B95A1]">문제 없음</span>
                  )}
                </div>
              </div>
            </section>

            {/* Legend (접기/펼치기) */}
            <details className="mb-4 p-3 md:p-4 rounded-2xl bg-[#FAFBFF] border border-[#E5E8EB]" open={showLegend} onToggle={(e) => setShowLegend((e.target as HTMLDetailsElement).open)}>
              <summary className="text-xs md:text-sm font-bold cursor-pointer text-[#191F28]">진단 코드 설명</summary>
              <div className="mt-2 space-y-1 text-[11px] md:text-xs text-[#4E5968]">
                {Object.entries(data.legend).map(([k, v]) => (
                  <div key={k} className="leading-relaxed break-words">
                    <span className="font-bold inline-block w-20 md:w-24" style={{ color: ISSUE_COLOR[k] || '#6B7280' }}>
                      {ISSUE_LABEL[k] || k}
                    </span>
                    {v}
                  </div>
                ))}
              </div>
            </details>

            {/* 필터 칩 (가로 스크롤) */}
            <div className="mb-3 -mx-1 px-1 overflow-x-auto scrollbar-hide">
              <div className="flex items-center gap-1.5 flex-nowrap">
                <button onClick={() => setFilter('all')}
                  className={'flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] md:text-xs font-bold whitespace-nowrap ' +
                    (filter === 'all' ? 'bg-[#191F28] text-white' : 'bg-white border border-[#E5E8EB] text-[#4E5968]')}>
                  전체 ({data.users.length})
                </button>
                {Object.entries(data.summary.issues).map(([k, v]) => (
                  <button key={k} onClick={() => setFilter(k)}
                    className={'flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] md:text-xs font-bold whitespace-nowrap border ' +
                      (filter === k ? 'text-white' : 'bg-white')}
                    style={filter === k
                      ? { background: ISSUE_COLOR[k], borderColor: ISSUE_COLOR[k] }
                      : { borderColor: ISSUE_COLOR[k] + '40', color: ISSUE_COLOR[k] }}>
                    {ISSUE_LABEL[k] || k} ({v})
                  </button>
                ))}
              </div>
            </div>

            {/* 사용자 목록 — 모바일: 카드 / PC: 표 */}
            <div className="md:hidden space-y-2">
              {filteredUsers.map(u => {
                const meta: StoreMeta[] = u.store_meta && u.store_meta.length > 0
                  ? u.store_meta
                  : (u.all_store_ids || []).map(id => ({ id, name: id === u.store_id ? u.store_name : null }))
                return <UserCard key={u.user_id} u={u} fetchingUser={fetchingUser} onFetch={triggerManualFetch} onRetryLogin={retryLogin} onSetStores={() => setStoreIds(u.user_id, meta)} onDiscover={discoverStores} onTestFetch={testFetch} />
              })}
              {filteredUsers.length === 0 && (
                <div className="p-6 text-center text-sm text-[#8B95A1] bg-white rounded-2xl">조건에 맞는 사용자 없음</div>
              )}
            </div>

            <div className="hidden md:block bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[#F2F4F6] text-[#191F28] font-bold">
                    <tr>
                      <th className="px-3 py-2 text-left">상태</th>
                      <th className="px-3 py-2 text-left">User</th>
                      <th className="px-3 py-2 text-left">매장</th>
                      <th className="px-3 py-2 text-left">계정</th>
                      <th className="px-3 py-2 text-left">쿠키</th>
                      <th className="px-3 py-2 text-left">로그인</th>
                      <th className="px-3 py-2 text-right">리뷰</th>
                      <th className="px-3 py-2 text-left">최근 수집</th>
                      <th className="px-3 py-2 text-center">조치</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.user_id} className="border-b border-[#F2F4F6] hover:bg-[#FAFBFF]">
                        <td className="px-3 py-2.5">
                          <span className="text-[10px] font-black text-white px-1.5 py-0.5 rounded whitespace-nowrap"
                            style={{ background: ISSUE_COLOR[u.likely_issue] || '#6B7280' }}>
                            {ISSUE_LABEL[u.likely_issue] || u.likely_issue}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[#3182F6]">{u.user_id.slice(0, 8)}</td>
                        <td className="px-3 py-2.5 text-[#191F28] font-bold max-w-[260px]" title={u.store_name || ''}>
                          {u.store_meta && u.store_meta.length > 0 ? (
                            <div className="space-y-0.5">
                              {u.store_meta.map((m, i) => (
                                <div key={m.id} className="leading-tight">
                                  <div className="text-[12px] truncate" title={m.name || ''}>
                                    {i === 0 && <span className="text-[9px] text-[#F97316] mr-1">[main]</span>}
                                    {m.name || <span className="italic text-[#8B95A1]">매장명 미등록</span>}
                                  </div>
                                  <div className="text-[10px] text-[#7C3AED] font-mono">{m.id}</div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <>
                              <div className="truncate">{u.store_name || '-'}</div>
                              {u.store_id && <div className="text-[10px] text-[#8B95A1] font-mono">{u.store_id}</div>}
                            </>
                          )}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[#4E5968]">{u.account_id_mask || '-'}</td>
                        <td className="px-3 py-2.5">
                          {u.has_session_cookies ? (
                            <span className="text-emerald-700 font-bold">
                              {u.session_cookie_count}개 ({ageBadge(u.cookies_age_hours)})
                              {!u.has_unify_token && <span className="text-amber-600 ml-1">unify-token X</span>}
                            </span>
                          ) : <span className="text-red-700 font-bold">없음</span>}
                        </td>
                        <td className="px-3 py-2.5 text-[#4E5968] max-w-[180px]">
                          <div className="font-mono text-[11px] truncate" title={u.last_login_status || ''}>
                            {u.last_login_status || '-'}
                          </div>
                          <div className="text-[10px] text-[#8B95A1]">{fmtDate(u.last_login_at)}</div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-black text-base tabular-nums" style={{ color: u.review_count > 0 ? '#191F28' : '#DC2626' }}>
                          {u.review_count}
                        </td>
                        <td className="px-3 py-2.5 text-[10px] text-[#4E5968]">
                          {fmtDate(u.last_collected_at)}
                          {u.collected_age_hours !== null && (
                            <div className="text-[#8B95A1]">{ageBadge(u.collected_age_hours)} 전</div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          <button onClick={() => discoverStores(u.user_id)}
                            disabled={fetchingUser === u.user_id}
                            className="text-[10px] font-bold px-2 py-1.5 rounded bg-[#0891B2] text-white hover:bg-[#0E7490] disabled:opacity-50 mr-1"
                            title="저장된 쿠키로 whoami 호출 → 모든 매장 발견 + 자동 등록">
                            매장발견
                          </button>
                          <button onClick={() => testFetch(u.user_id)}
                            disabled={fetchingUser === u.user_id}
                            className="text-[10px] font-bold px-2 py-1.5 rounded bg-[#F59E0B] text-white hover:bg-[#D97706] disabled:opacity-50 mr-1"
                            title="특정 storeId 직접 입력 → 즉시 fetch 테스트 (워커 거치지 X)">
                            테스트
                          </button>
                          <button onClick={() => setStoreIds(u.user_id, u.store_meta && u.store_meta.length > 0 ? u.store_meta : (u.all_store_ids || []).map(id => ({ id, name: id === u.store_id ? u.store_name : null })))}
                            disabled={fetchingUser === u.user_id}
                            className="text-[10px] font-bold px-2 py-1.5 rounded bg-[#059669] text-white hover:bg-[#047857] disabled:opacity-50 mr-1"
                            title="매장 ID + 매장명 직접 입력 (다중 매장)">
                            매장ID
                          </button>
                          <button onClick={() => retryLogin(u.user_id)}
                            disabled={fetchingUser === u.user_id}
                            className="text-[10px] font-bold px-2 py-1.5 rounded bg-[#F04452] text-white hover:bg-[#DC2626] disabled:opacity-50 mr-1"
                            title="저장된 비밀번호로 save-login 재시도">
                            재로그인
                          </button>
                          <button onClick={() => triggerManualFetch(u.user_id, 14)}
                            disabled={fetchingUser === u.user_id}
                            className="text-[10px] font-bold px-2 py-1.5 rounded bg-[#3182F6] text-white hover:bg-[#1B64DA] disabled:opacity-50 mr-1">
                            14d
                          </button>
                          <button onClick={() => triggerManualFetch(u.user_id, 180)}
                            disabled={fetchingUser === u.user_id}
                            className="text-[10px] font-bold px-2 py-1.5 rounded bg-[#7C3AED] text-white hover:bg-[#6D28D9] disabled:opacity-50">
                            180d
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr><td colSpan={9} className="px-3 py-6 text-center text-[#8B95A1]">조건에 맞는 사용자 없음</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 text-[10px] md:text-[11px] text-[#8B95A1] text-right">
              생성 시각: {fmtDate(data.generated_at)}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── 모바일 카드 ──
function UserCard({ u, fetchingUser, onFetch, onRetryLogin, onSetStores, onDiscover, onTestFetch }: {
  u: User
  fetchingUser: string | null
  onFetch: (uid: string, days: number) => void
  onRetryLogin: (uid: string) => void
  onSetStores: () => void
  onDiscover: (uid: string) => void
  onTestFetch: (uid: string) => void
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-3.5 border-l-4" style={{ borderLeftColor: ISSUE_COLOR[u.likely_issue] || '#6B7280' }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-black text-white px-1.5 py-0.5 rounded inline-block mb-1.5"
            style={{ background: ISSUE_COLOR[u.likely_issue] || '#6B7280' }}>
            {ISSUE_LABEL[u.likely_issue] || u.likely_issue}
          </span>
          {u.store_meta && u.store_meta.length > 0 ? (
            <div className="space-y-1">
              {u.store_meta.map((m, i) => (
                <div key={m.id} className="text-sm">
                  <div className="font-black text-[#191F28] truncate" title={m.name || ''}>
                    <Store size={12} className="inline mr-1 -mt-0.5 text-[#8B95A1]" strokeWidth={2.5} />
                    {i === 0 && <span className="text-[10px] text-[#F97316] mr-1">[main]</span>}
                    {m.name || <span className="italic text-[#8B95A1] font-normal">매장명 미등록</span>}
                  </div>
                  <div className="text-[11px] text-[#7C3AED] font-mono ml-4">매장 ID: {m.id}</div>
                </div>
              ))}
              <div className="text-[10px] text-[#8B95A1] font-mono mt-1">user: {u.user_id.slice(0, 8)}</div>
            </div>
          ) : (
            <>
              <div className="text-sm font-black text-[#191F28] truncate" title={u.store_name || ''}>
                <Store size={12} className="inline mr-1 -mt-0.5 text-[#8B95A1]" strokeWidth={2.5} />
                {u.store_name || '매장명 미등록'}
              </div>
              <div className="text-[11px] text-[#8B95A1] font-mono mt-0.5 truncate">
                {u.user_id.slice(0, 8)}
                {u.store_id && <span> · {u.store_id}</span>}
              </div>
            </>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-[10px] text-[#8B95A1] font-bold">리뷰</div>
          <div className="text-2xl font-black tabular-nums" style={{ color: u.review_count > 0 ? '#191F28' : '#DC2626' }}>
            {u.review_count}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px] mb-2">
        <div className="p-2 rounded-lg bg-[#FAFBFF]">
          <div className="text-[#8B95A1] font-bold flex items-center gap-1">
            <UserIcon size={11} strokeWidth={2.5} />계정
          </div>
          <div className="font-mono text-[#4E5968] truncate">{u.account_id_mask || '-'}</div>
        </div>
        <div className="p-2 rounded-lg bg-[#FAFBFF]">
          <div className="text-[#8B95A1] font-bold flex items-center gap-1">
            <Cookie size={11} strokeWidth={2.5} />쿠키
          </div>
          {u.has_session_cookies ? (
            <div className="text-emerald-700 font-bold truncate">
              {u.session_cookie_count}개 ({ageBadge(u.cookies_age_hours)})
            </div>
          ) : <div className="text-red-700 font-bold">없음</div>}
        </div>
      </div>

      <div className="text-[11px] text-[#4E5968] mb-2 break-words">
        <span className="font-bold text-[#8B95A1]">로그인 상태: </span>
        <span className="font-mono">{u.last_login_status || '-'}</span>
        {u.last_login_at && <span className="text-[#8B95A1] ml-1">({fmtDate(u.last_login_at)})</span>}
      </div>

      {u.last_collected_at && (
        <div className="text-[11px] text-[#4E5968] mb-3">
          <span className="font-bold text-[#8B95A1]">최근 수집: </span>
          {fmtDate(u.last_collected_at)}
          {u.collected_age_hours !== null && (
            <span className="text-[#8B95A1] ml-1">({ageBadge(u.collected_age_hours)} 전)</span>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mb-2">
        <button onClick={() => onDiscover(u.user_id)}
          disabled={fetchingUser === u.user_id}
          className="text-xs font-bold py-2.5 rounded-lg bg-[#0891B2] text-white hover:bg-[#0E7490] disabled:opacity-50">
          {fetchingUser === u.user_id ? '...' : '매장 자동 발견'}
        </button>
        <button onClick={() => onTestFetch(u.user_id)}
          disabled={fetchingUser === u.user_id}
          className="text-xs font-bold py-2.5 rounded-lg bg-[#F59E0B] text-white hover:bg-[#D97706] disabled:opacity-50">
          storeID 직접 테스트
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <button onClick={onSetStores}
          disabled={fetchingUser === u.user_id}
          className="text-xs font-bold py-2.5 rounded-lg bg-[#059669] text-white hover:bg-[#047857] disabled:opacity-50">
          매장 ID + 이름 입력
        </button>
        <button onClick={() => onRetryLogin(u.user_id)}
          disabled={fetchingUser === u.user_id}
          className="text-xs font-bold py-2.5 rounded-lg bg-[#F04452] text-white hover:bg-[#DC2626] disabled:opacity-50">
          재로그인
        </button>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onFetch(u.user_id, 14)}
          disabled={fetchingUser === u.user_id}
          className="flex-1 text-xs font-bold py-2.5 rounded-lg bg-[#3182F6] text-white hover:bg-[#1B64DA] disabled:opacity-50">
          14일치 fetch
        </button>
        <button onClick={() => onFetch(u.user_id, 180)}
          disabled={fetchingUser === u.user_id}
          className="flex-1 text-xs font-bold py-2.5 rounded-lg bg-[#7C3AED] text-white hover:bg-[#6D28D9] disabled:opacity-50">
          180일치 fetch
        </button>
      </div>
    </div>
  )
}
