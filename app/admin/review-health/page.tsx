'use client'
// ============================================================
// 어드민 전용 — 네이버 리뷰 수집 파이프라인 종합 점검
//   /admin/review-health
//   · GraphQL · DB 통계 · 크론 · 유저별 현황 · 미답변 샘플
//   · 60초 자동갱신 + 수동 재체크
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  RefreshCw, CheckCircle2, AlertTriangle, XCircle,
  Clock, Users, MessageSquare, Zap, Database,
  Activity, Wifi, ChevronDown, ChevronUp, Lock,
} from 'lucide-react'

type PipelineStatus = 'ok' | 'warn' | 'error'

interface UserStat {
  user_id: string
  place_id: string | null
  last_collected_at: string | null
  review_count_7d: number
  review_count_total: number
  unreplied: number
  status: PipelineStatus
  status_reason: string
}

interface GraphQLTestResult {
  ok: boolean
  place_id: string
  latency_ms: number
  review_count: number | null
  error: string | null
}

interface Report {
  ok: boolean
  overall: PipelineStatus
  issues: string[]
  checked_at: string
  stats: {
    total_reviews: number
    today_reviews: number
    week7_reviews: number
    unreplied_total: number
    unreplied_pct: number
    connected_users: number
    stale_users: number
    last_collected_at: string | null
    last_collected_fmt: string
    last_collected_hours_ago: number | null
  }
  cron: {
    ok_6h: boolean
    ok_24h: boolean
    count_6h: number
    count_24h: number
    schedule_kst: string
  }
  graphql_test: GraphQLTestResult
  user_stats: UserStat[]
  unreplied_sample: Array<{
    id: string
    author: string | null
    content: string
    posted_at: string
    collected_at: string
  }>
}

// ── 스타일 헬퍼 ────────────────────────────────────────────
const ST: Record<PipelineStatus, { bg: string; border: string; text: string; badge: string; icon: React.ReactNode }> = {
  ok:    { bg: '#F0FDF4', border: '#86EFAC', text: '#166534', badge: 'bg-[#DCFCE7] text-[#166534]', icon: <CheckCircle2 size={15} className="text-[#22C55E]" /> },
  warn:  { bg: '#FFFBEB', border: '#FCD34D', text: '#92400E', badge: 'bg-[#FEF3C7] text-[#92400E]', icon: <AlertTriangle size={15} className="text-[#F59E0B]" /> },
  error: { bg: '#FFF1F2', border: '#FDA4AF', text: '#9F1239', badge: 'bg-[#FFE4E6] text-[#9F1239]', icon: <XCircle size={15} className="text-[#F43F5E]" /> },
}

const OVERALL_TITLE: Record<PipelineStatus, string> = {
  ok:    '리뷰 수집 파이프라인 전체 정상',
  warn:  '일부 항목 주의 필요',
  error: '수집 오류 발견 — 즉시 확인 필요',
}

function StatCard({ icon, label, value, sub, status }: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  status?: PipelineStatus
}) {
  const s = status ? ST[status] : null
  return (
    <div className={`rounded-2xl border p-4 flex items-center gap-4 ${s ? '' : 'bg-white border-[#E2E8F0]'}`}
      style={s ? { backgroundColor: s.bg, borderColor: s.border } : {}}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s ? 'bg-white/60' : 'bg-[#EFF6FF]'}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-[#64748B] font-semibold">{label}</div>
        <div className="text-[22px] font-black text-[#0F172A] leading-tight">{value}</div>
        {sub && <div className="text-[11px] text-[#94A3B8] mt-0.5">{sub}</div>}
      </div>
      {s && <div className="ml-auto">{s.icon}</div>}
    </div>
  )
}

function PipelineStep({ step, label, desc, status, detail }: {
  step: number; label: string; desc: string; status: PipelineStatus; detail?: string
}) {
  const s = ST[status]
  return (
    <div className="flex items-start gap-3">
      {/* 스텝 번호 + 연결선 */}
      <div className="flex flex-col items-center gap-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-black border-2 flex-shrink-0`}
          style={{ backgroundColor: s.bg, borderColor: s.border, color: s.text }}>
          {step}
        </div>
      </div>
      {/* 내용 */}
      <div className={`flex-1 rounded-xl border px-4 py-3 mb-3`}
        style={{ backgroundColor: s.bg + '88', borderColor: s.border }}>
        <div className="flex items-center gap-2 mb-0.5">
          {s.icon}
          <span className="text-[13px] font-bold text-[#1E293B]">{label}</span>
          <span className={`ml-auto inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${s.badge}`}>
            {status === 'ok' ? '정상' : status === 'warn' ? '주의' : '오류'}
          </span>
        </div>
        <p className="text-[12px] text-[#475569]">{desc}</p>
        {detail && <p className="text-[11px] text-[#94A3B8] mt-0.5">{detail}</p>}
      </div>
    </div>
  )
}

export default function AdminReviewHealthPage() {
  const [report, setReport]       = useState<Report | null>(null)
  const [loading, setLoading]     = useState(false)
  const [err, setErr]             = useState<string | null>(null)
  const [lastAt, setLastAt]       = useState<Date | null>(null)
  const [autoRefresh, setAuto]    = useState(true)
  const [countdown, setCountdown] = useState(60)
  const [showUsers, setShowUsers] = useState(false)
  const [showUnreplied, setShowUnreplied] = useState(true)
  const timer  = useRef<ReturnType<typeof setInterval> | null>(null)
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetch_ = useCallback(async () => {
    setLoading(true); setErr(null)
    try {
      const r = await fetch('/api/admin/review-health', { cache: 'no-store' })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`)
      setReport(j); setLastAt(new Date()); setCountdown(60)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '진단 실패')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch_() }, [fetch_])

  useEffect(() => {
    if (!autoRefresh) {
      timer.current  && clearInterval(timer.current)
      ticker.current && clearInterval(ticker.current)
      return
    }
    timer.current  = setInterval(fetch_, 60000)
    ticker.current = setInterval(() => setCountdown(p => p <= 1 ? 60 : p - 1), 1000)
    return () => {
      timer.current  && clearInterval(timer.current)
      ticker.current && clearInterval(ticker.current)
    }
  }, [autoRefresh, fetch_])

  const r = report
  const overall = r?.overall ?? 'ok'
  const s = ST[overall]

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">

      {/* ── 헤더 ── */}
      <div className="mb-6 flex flex-wrap items-start gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-[#0F172A]">리뷰 수집 파이프라인 진단</h1>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-[#FFE4E6] text-[#9F1239] border border-[#FECDD3] px-2 py-0.5 rounded-full">
              <Lock size={9} strokeWidth={2.5} /> ADMIN
            </span>
          </div>
          <p className="text-[13px] text-[#64748B] mt-0.5">
            GraphQL 엔드포인트 · DB 수집 통계 · 크론 동작 · 유저별 현황 · 미답변 샘플을 종합 점검합니다.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3 flex-wrap">
          {lastAt && (
            <span className="text-[11px] text-[#94A3B8] flex items-center gap-1">
              <Clock size={10} />
              {lastAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <div onClick={() => setAuto(p => !p)}
              className={`relative w-9 h-5 rounded-full transition-colors ${autoRefresh ? 'bg-[#22C55E]' : 'bg-[#CBD5E1]'}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${autoRefresh ? 'left-4' : 'left-0.5'}`} />
            </div>
            <span className="text-[12px] text-[#4E5968]">
              {autoRefresh ? `자동갱신 ${countdown}s` : '꺼짐'}
            </span>
          </label>
          <button onClick={fetch_} disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0F172A] text-white text-[12px] font-bold hover:bg-[#1E293B] disabled:opacity-50 transition">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            {loading ? '점검 중...' : '다시 점검'}
          </button>
        </div>
      </div>

      {err && (
        <div className="mb-5 p-4 rounded-xl bg-[#FFF1F2] border border-[#FECDD3] text-[#9F1239] text-sm">
          진단 실패: {err}
        </div>
      )}

      {loading && !r && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-[#F1F5F9] rounded-2xl animate-pulse" />)}
        </div>
      )}

      {r && (
        <>
          {/* ── Overall 배너 ── */}
          <div className={`mb-6 p-5 rounded-2xl border bg-gradient-to-r`}
            style={{ borderColor: s.border, background: `linear-gradient(to right, ${s.bg}, #f8fafc)` }}>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 mt-0.5">
                {overall === 'ok' ? <CheckCircle2 size={36} className="text-[#22C55E]" />
                  : overall === 'warn' ? <AlertTriangle size={36} className="text-[#F59E0B]" />
                  : <XCircle size={36} className="text-[#F43F5E]" />}
              </div>
              <div className="flex-1">
                <div className="text-[15px] font-black text-[#0F172A]">{OVERALL_TITLE[overall]}</div>
                {r.issues.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {r.issues.map((iss, i) => (
                      <li key={i} className="text-[12px] text-[#475569] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] flex-shrink-0" />
                        {iss}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[13px] text-[#475569] mt-1">모든 수집 파이프라인이 정상 동작 중입니다.</p>
                )}
              </div>
            </div>
          </div>

          {/* ── 핵심 지표 그리드 ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard icon={<Database size={18} className="text-[#3182F6]" />}
              label="총 수집 리뷰" value={r.stats.total_reviews.toLocaleString()} sub="naver_place 전체" />
            <StatCard icon={<Zap size={18} className="text-[#F59E0B]" />}
              label="오늘 수집" value={r.stats.today_reviews.toLocaleString()} sub="KST 00:00 이후" />
            <StatCard icon={<Activity size={18} className="text-[#22C55E]" />}
              label="최근 7일 수집" value={r.stats.week7_reviews.toLocaleString()} sub="7일간 누적" />
            <StatCard icon={<MessageSquare size={18} className="text-[#F43F5E]" />}
              label="미답변 리뷰" value={`${r.stats.unreplied_total.toLocaleString()}`}
              sub={`전체의 ${r.stats.unreplied_pct}%`}
              status={r.stats.unreplied_pct > 50 ? 'error' : r.stats.unreplied_pct > 20 ? 'warn' : 'ok'} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            <StatCard icon={<Users size={18} className="text-[#8B5CF6]" />}
              label="연결된 유저" value={r.stats.connected_users} sub="naver_place 계정 연결" />
            <StatCard icon={<Users size={18} className="text-[#F43F5E]" />}
              label="수집 이상 유저" value={r.stats.stale_users}
              sub="24h 초과 또는 미수집"
              status={r.stats.stale_users === 0 ? 'ok' : r.stats.stale_users <= 2 ? 'warn' : 'error'} />
            <StatCard icon={<Clock size={18} className="text-[#64748B]" />}
              label="마지막 수집"
              value={r.stats.last_collected_hours_ago !== null ? `${r.stats.last_collected_hours_ago}h 전` : '없음'}
              sub={r.stats.last_collected_fmt}
              status={r.stats.last_collected_hours_ago === null ? 'error'
                : r.stats.last_collected_hours_ago > 24 ? 'error'
                : r.stats.last_collected_hours_ago > 6  ? 'warn' : 'ok'} />
          </div>

          {/* ── 파이프라인 단계별 점검 ── */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden mb-5">
            <div className="px-5 py-3 bg-[#F8FAFC] border-b border-[#F1F5F9] flex items-center gap-2">
              <Activity size={14} className="text-[#64748B]" />
              <span className="text-[13px] font-bold text-[#334155]">수집 파이프라인 단계별 점검</span>
            </div>
            <div className="p-5">
              <PipelineStep step={1} label="네이버 GraphQL 엔드포인트"
                desc={r.graphql_test.ok
                  ? `응답 정상 · 응답시간 ${r.graphql_test.latency_ms}ms · 리뷰 ${r.graphql_test.review_count ?? 0}건 확인`
                  : `연결 실패: ${r.graphql_test.error}`}
                detail={`테스트 Place ID: ${r.graphql_test.place_id}`}
                status={r.graphql_test.ok ? 'ok' : 'error'} />

              <PipelineStep step={2} label="크론 자동 수집 (4시간 주기)"
                desc={r.cron.ok_6h
                  ? `최근 6시간 내 ${r.cron.count_6h}건 수집 확인`
                  : r.cron.ok_24h
                    ? `6시간 내 수집 없음 (24시간 내 ${r.cron.count_24h}건 — 지연 가능성)`
                    : '24시간 내 수집 기록 없음 — 크론 중단 의심'}
                detail={r.cron.schedule_kst}
                status={r.cron.ok_6h ? 'ok' : r.cron.ok_24h ? 'warn' : 'error'} />

              <PipelineStep step={3} label="DB 저장 (platform_reviews)"
                desc={`총 ${r.stats.total_reviews.toLocaleString()}건 저장 · 오늘 ${r.stats.today_reviews}건 신규`}
                detail="platform=naver_place 기준 upsert 집계"
                status={r.stats.total_reviews > 0 ? 'ok' : 'warn'} />

              <PipelineStep step={4} label="유저 연결 및 수집 상태"
                desc={`${r.stats.connected_users}명 연결 · 정상 수집 ${r.stats.connected_users - r.stats.stale_users}명 · 이상 ${r.stats.stale_users}명`}
                status={r.stats.stale_users === 0 ? 'ok' : r.stats.stale_users <= 2 ? 'warn' : 'error'} />

              <PipelineStep step={5} label="미답변 리뷰 현황"
                desc={`미답변 ${r.stats.unreplied_total.toLocaleString()}건 (${r.stats.unreplied_pct}%)`}
                detail="has_reply = false 기준 집계"
                status={r.stats.unreplied_pct > 50 ? 'error' : r.stats.unreplied_pct > 20 ? 'warn' : 'ok'} />
            </div>
          </div>

          {/* ── 유저별 수집 현황 ── */}
          {r.user_stats.length > 0 && (
            <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden mb-5">
              <button
                onClick={() => setShowUsers(p => !p)}
                className="w-full px-5 py-3 bg-[#F8FAFC] border-b border-[#F1F5F9] flex items-center gap-2 hover:bg-[#F1F5F9] transition"
              >
                <Users size={14} className="text-[#64748B]" />
                <span className="text-[13px] font-bold text-[#334155]">유저별 수집 현황</span>
                <span className="text-[11px] text-[#94A3B8] ml-1">({r.user_stats.length}명)</span>
                <div className="ml-auto text-[#94A3B8]">
                  {showUsers ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>
              {showUsers && (
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="bg-[#FAFBFC] text-[10px] uppercase text-[#94A3B8]">
                        <th className="text-left px-4 py-2.5 font-semibold">유저 ID</th>
                        <th className="text-left px-3 py-2.5 font-semibold">Place ID</th>
                        <th className="text-center px-3 py-2.5 font-semibold">마지막 수집</th>
                        <th className="text-center px-3 py-2.5 font-semibold">7일 수집</th>
                        <th className="text-center px-3 py-2.5 font-semibold">전체</th>
                        <th className="text-center px-3 py-2.5 font-semibold">미답변</th>
                        <th className="text-center px-3 py-2.5 font-semibold">상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.user_stats.map((u, i) => {
                        const us = ST[u.status]
                        return (
                          <tr key={i} className="border-t border-[#F1F5F9] hover:bg-[#FAFBFC]">
                            <td className="px-4 py-3 font-mono text-[11px] text-[#475569]">{u.user_id}</td>
                            <td className="px-3 py-3 font-mono text-[11px] text-[#94A3B8]">{u.place_id ?? '—'}</td>
                            <td className="px-3 py-3 text-center text-[11px] text-[#475569]">
                              {u.last_collected_at
                                ? new Date(u.last_collected_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                                : <span className="text-[#F43F5E]">없음</span>}
                            </td>
                            <td className="px-3 py-3 text-center font-bold text-[#1E293B]">{u.review_count_7d}</td>
                            <td className="px-3 py-3 text-center text-[#475569]">{u.review_count_total.toLocaleString()}</td>
                            <td className="px-3 py-3 text-center">
                              <span className={`font-bold ${u.unreplied > 0 ? 'text-[#F43F5E]' : 'text-[#22C55E]'}`}>
                                {u.unreplied}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${us.badge}`}>
                                {us.icon}
                                {u.status === 'ok' ? '정상' : u.status === 'warn' ? '주의' : '오류'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── 미답변 리뷰 샘플 ── */}
          {r.unreplied_sample.length > 0 && (
            <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden mb-5">
              <button
                onClick={() => setShowUnreplied(p => !p)}
                className="w-full px-5 py-3 bg-[#FFF7ED] border-b border-[#FED7AA] flex items-center gap-2 hover:bg-[#FEF3C7] transition"
              >
                <MessageSquare size={14} className="text-[#F59E0B]" />
                <span className="text-[13px] font-bold text-[#92400E]">
                  미답변 리뷰 최신 5건
                </span>
                <span className="text-[11px] text-[#B45309] ml-1">
                  (전체 {r.stats.unreplied_total.toLocaleString()}건)
                </span>
                <div className="ml-auto text-[#B45309]">
                  {showUnreplied ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>
              {showUnreplied && (
                <div className="divide-y divide-[#F1F5F9]">
                  {r.unreplied_sample.map((rev) => (
                    <div key={rev.id} className="px-5 py-3.5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[12px] font-bold text-[#1E293B]">{rev.author ?? '익명'}</span>
                        <span className="text-[10px] text-[#94A3B8]">게시 {rev.posted_at}</span>
                        <span className="text-[10px] text-[#CBD5E1] ml-auto">수집 {rev.collected_at}</span>
                      </div>
                      <p className="text-[12px] text-[#475569] leading-relaxed">
                        {rev.content || <span className="italic text-[#CBD5E1]">(내용 없음)</span>}
                      </p>
                    </div>
                  ))}
                  <div className="px-5 py-3 bg-[#F8FAFC]">
                    <a href="/review-admin/naver" className="text-[12px] text-[#3182F6] font-semibold hover:underline">
                      → 네이버 리뷰 관리 페이지에서 답글 달기
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── GraphQL 상세 ── */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden mb-5">
            <div className="px-5 py-3 bg-[#F8FAFC] border-b border-[#F1F5F9] flex items-center gap-2">
              <Wifi size={14} className="text-[#64748B]" />
              <span className="text-[13px] font-bold text-[#334155]">GraphQL 실시간 테스트 상세</span>
            </div>
            <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              {[
                { label: '엔드포인트', value: r.graphql_test.ok ? '정상' : '오류', sub: 'pcmap-api.place.naver.com' },
                { label: '응답 시간', value: `${r.graphql_test.latency_ms}ms`, sub: r.graphql_test.latency_ms < 1000 ? '빠름' : r.graphql_test.latency_ms < 3000 ? '보통' : '느림' },
                { label: '리뷰 수 확인', value: r.graphql_test.review_count !== null ? `${r.graphql_test.review_count}건` : '—', sub: `Place ID: ${r.graphql_test.place_id.slice(0, 8)}…` },
                { label: '오류', value: r.graphql_test.error ?? '없음', sub: r.graphql_test.ok ? '정상 응답' : '수집 불가' },
              ].map(it => (
                <div key={it.label} className="bg-[#F8FAFC] rounded-xl px-3 py-3">
                  <div className="text-[10px] text-[#94A3B8] font-semibold mb-1">{it.label}</div>
                  <div className="text-[14px] font-black text-[#1E293B] truncate">{it.value}</div>
                  <div className="text-[10px] text-[#CBD5E1] truncate">{it.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 진단 시각 ── */}
          <div className="text-center text-[10px] text-[#CBD5E1]">
            진단 시각: {new Date(r.checked_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
          </div>
        </>
      )}
    </div>
  )
}
