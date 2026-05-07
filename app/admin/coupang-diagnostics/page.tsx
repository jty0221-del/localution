'use client'
// ============================================================
// 어드민 — 쿠팡이츠 연동 진단 페이지
// /admin/coupang-diagnostics
//   · 모든 사장님의 쿠팡이츠 연결 상태 한눈에
//   · ENV / 큐 / 쿠키 / 리뷰 수집 결과 종합 진단
//   · 문제별 원인 추론 (legend 참조)
// ============================================================

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import {
  RefreshCw, AlertTriangle, CheckCircle2, XCircle,
  Server, Cookie, MessageSquare, Activity, Clock,
} from 'lucide-react'

type User = {
  user_id: string
  account_id_mask: string | null
  store_name: string | null
  store_id: string | null
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
  summary: {
    total_users: number
    ok_users: number
    issues: Record<string, number>
  }
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

export default function CoupangDiagnosticsPage() {
  const [data, setData] = useState<Diag | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const r = await fetch('/api/admin/coupang-diagnostics', { cache: 'no-store' })
      const j = await r.json()
      if (!j.ok) { setError(j.error || 'failed'); return }
      setData(j)
    } catch (e: any) {
      setError(e?.message || 'fetch error')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filteredUsers = data?.users.filter(u => filter === 'all' || u.likely_issue === filter) || []

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-[#191F28] flex items-center gap-2">
            <Activity size={24} className="text-[#FF4B30]" strokeWidth={2.5} />
            쿠팡이츠 연동 진단
          </h1>
          <p className="text-sm text-[#4E5968] mt-1">전체 사장님 연결 상태 + 환경변수 + 큐 점검</p>
        </div>
        <button onClick={load} disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3182F6] text-white text-sm font-bold hover:bg-[#1B64DA] disabled:opacity-50">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} strokeWidth={2.5} />
          새로고침
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800">
          <strong>오류:</strong> {error}
        </div>
      )}

      {data && (
        <>
          {/* 환경변수 점검 */}
          <div className="mb-4 p-4 rounded-2xl bg-white shadow-sm">
            <h2 className="text-sm font-bold text-[#191F28] mb-3 flex items-center gap-2">
              <Server size={16} className="text-[#3182F6]" strokeWidth={2.5} />
              환경변수
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {Object.entries(data.env).map(([k, v]) => (
                <div key={k} className={'flex items-center gap-2 p-2 rounded-lg text-xs font-bold ' + (v ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
                  {v ? <CheckCircle2 size={14} strokeWidth={2.5} /> : <XCircle size={14} strokeWidth={2.5} />}
                  {k}
                </div>
              ))}
            </div>
            {!data.env.PROXY_HOST && (
              <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                <strong>PROXY_HOST 없음</strong> — Akamai 통과 불가. iproyal residential proxy 환경변수 설정 필수.
              </div>
            )}
            {!data.env.ENCRYPTION_KEK_HEX && (
              <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900">
                <strong>ENCRYPTION_KEK_HEX 잘못됨</strong> — 64 hex 필요. 비밀번호/쿠키 저장 불가.
              </div>
            )}
          </div>

          {/* 큐 상태 */}
          <div className="mb-4 p-4 rounded-2xl bg-white shadow-sm">
            <h2 className="text-sm font-bold text-[#191F28] mb-3 flex items-center gap-2">
              <Clock size={16} className="text-[#7C3AED]" strokeWidth={2.5} />
              BullMQ 큐
            </h2>
            {data.queue.error ? (
              <div className="text-xs text-red-700">큐 조회 실패: {data.queue.error}</div>
            ) : (
              <>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2 text-xs">
                  {Object.entries(data.queue.counts || {}).map(([k, v]: any) => (
                    <div key={k} className="p-2 rounded-lg bg-[#F2F4F6]">
                      <div className="text-[#8B95A1] font-bold">{k}</div>
                      <div className="text-lg font-black text-[#191F28]">{v}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-[#FFE7E3] text-[#8B0F00]">
                    <span className="font-bold">쿠팡 waiting:</span> {data.queue.coupang_waiting || 0}
                  </div>
                  <div className="p-2 rounded-lg bg-[#FFE7E3] text-[#8B0F00]">
                    <span className="font-bold">쿠팡 active:</span> {data.queue.coupang_active || 0}
                  </div>
                </div>
                {Array.isArray(data.queue.coupang_failed_recent) && data.queue.coupang_failed_recent.length > 0 && (
                  <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200">
                    <div className="text-xs font-bold text-red-800 mb-2">최근 실패 잡 ({data.queue.coupang_failed_recent.length})</div>
                    <div className="space-y-1">
                      {data.queue.coupang_failed_recent.map((f: any, i: number) => (
                        <div key={i} className="text-[11px] text-red-700 leading-relaxed">
                          <code className="font-mono bg-white px-1 rounded">{f.user_id?.slice(0, 8)}</code> · {f.action} · {f.attempts}회 · {f.reason}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 요약 */}
          <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white shadow-sm">
              <div className="text-xs font-bold text-[#8B95A1]">전체 사용자</div>
              <div className="text-2xl font-black text-[#191F28]">{data.summary.total_users}</div>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 shadow-sm">
              <div className="text-xs font-bold text-emerald-700">정상</div>
              <div className="text-2xl font-black text-emerald-700">{data.summary.ok_users}</div>
            </div>
            <div className="p-4 rounded-2xl bg-red-50 shadow-sm col-span-2">
              <div className="text-xs font-bold text-red-700 mb-1">문제 분포</div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(data.summary.issues).filter(([k]) => k !== 'ok').map(([k, v]) => (
                  <button key={k} onClick={() => setFilter(k)}
                    className="text-[11px] font-bold px-2 py-1 rounded text-white"
                    style={{ background: ISSUE_COLOR[k] || '#6B7280' }}>
                    {k}: {v}
                  </button>
                ))}
                {Object.entries(data.summary.issues).filter(([k]) => k !== 'ok').length === 0 && (
                  <span className="text-xs text-[#8B95A1]">문제 없음</span>
                )}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="mb-4 p-3 rounded-2xl bg-[#FAFBFF] border border-[#E5E8EB] text-xs text-[#4E5968] space-y-1">
            <div className="font-bold mb-1">진단 코드</div>
            {Object.entries(data.legend).map(([k, v]) => (
              <div key={k}><span className="font-bold" style={{ color: ISSUE_COLOR[k] || '#6B7280' }}>{k}</span>: {v}</div>
            ))}
          </div>

          {/* 사용자 목록 */}
          <div className="mb-2 flex items-center gap-2 flex-wrap">
            <button onClick={() => setFilter('all')}
              className={'px-3 py-1.5 rounded-lg text-xs font-bold ' + (filter === 'all' ? 'bg-[#191F28] text-white' : 'bg-white border border-[#E5E8EB] text-[#4E5968]')}>
              전체 ({data.users.length})
            </button>
            {Object.entries(data.summary.issues).map(([k, v]) => (
              <button key={k} onClick={() => setFilter(k)}
                className={'px-3 py-1.5 rounded-lg text-xs font-bold ' + (filter === k ? 'text-white' : 'bg-white border')}
                style={filter === k ? { background: ISSUE_COLOR[k] } : { borderColor: ISSUE_COLOR[k] + '40', color: ISSUE_COLOR[k] }}>
                {k} ({v})
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
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
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.user_id} className="border-b border-[#F2F4F6] hover:bg-[#FAFBFF]">
                      <td className="px-3 py-2">
                        <span className="text-[10px] font-black text-white px-1.5 py-0.5 rounded"
                          style={{ background: ISSUE_COLOR[u.likely_issue] || '#6B7280' }}>
                          {u.likely_issue}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-[#3182F6]">{u.user_id.slice(0, 8)}</td>
                      <td className="px-3 py-2 text-[#191F28] font-bold max-w-[180px] truncate" title={u.store_name || ''}>
                        {u.store_name || '-'}
                        {u.store_id && <div className="text-[10px] text-[#8B95A1] font-mono">{u.store_id}</div>}
                      </td>
                      <td className="px-3 py-2 font-mono text-[#4E5968]">{u.account_id_mask || '-'}</td>
                      <td className="px-3 py-2">
                        {u.has_session_cookies ? (
                          <span className="text-emerald-700 font-bold">
                            {u.session_cookie_count}개 ({ageBadge(u.cookies_age_hours)})
                            {!u.has_unify_token && <span className="text-amber-600 ml-1">unify-token X</span>}
                          </span>
                        ) : (
                          <span className="text-red-700 font-bold">없음</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-[#4E5968] max-w-[180px]">
                        <div className="font-mono text-[11px] truncate" title={u.last_login_status || ''}>
                          {u.last_login_status || '-'}
                        </div>
                        <div className="text-[10px] text-[#8B95A1]">{fmtDate(u.last_login_at)}</div>
                      </td>
                      <td className="px-3 py-2 text-right font-black text-lg" style={{ color: u.review_count > 0 ? '#191F28' : '#DC2626' }}>
                        {u.review_count}
                      </td>
                      <td className="px-3 py-2 text-[10px] text-[#4E5968]">
                        {fmtDate(u.last_collected_at)}
                        {u.collected_age_hours !== null && (
                          <div className="text-[#8B95A1]">{ageBadge(u.collected_age_hours)} 전</div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr><td colSpan={8} className="px-3 py-6 text-center text-[#8B95A1]">조건에 맞는 사용자 없음</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 text-[10px] text-[#8B95A1] text-right">
            생성 시각: {fmtDate(data.generated_at)}
          </div>
        </>
      )}
    </div>
  )
}
