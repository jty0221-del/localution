'use client'
// ============================================================
// 어드민 전용 — 네이버 연동 종합 진단
//   /admin/naver-check
//   · AdminLayout 이 isAdminEmail 인증 보호 처리
//   · API: /api/admin/naver-health
//   · 60초 자동 갱신 + 수동 재체크
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  RefreshCw, CheckCircle2, AlertTriangle, XCircle,
  MinusCircle, ExternalLink, Clock, Wifi, Database,
  Key, Activity, Zap,
} from 'lucide-react'

type CheckStatus = 'ok' | 'warn' | 'error' | 'skip'

interface CheckItem {
  id: string
  label: string
  category: string
  status: CheckStatus
  message: string
  detail?: string | null
  value?: string | number | null
  action_url?: string | null
}

interface HealthReport {
  ok: boolean
  overall: CheckStatus
  checked_at: string
  checks: CheckItem[]
  summary: { ok: number; warn: number; error: number; skip: number }
}

const STATUS_STYLE: Record<CheckStatus, {
  bg: string; border: string; badge: string
  icon: React.ReactNode; label: string
}> = {
  ok: {
    bg: '#F0FDF420', border: '#BBF7D0',
    badge: 'bg-[#DCFCE7] text-[#166534]',
    icon: <CheckCircle2 size={17} className="text-[#22C55E]" />,
    label: '정상',
  },
  warn: {
    bg: '#FFFBEB20', border: '#FDE68A',
    badge: 'bg-[#FEF3C7] text-[#92400E]',
    icon: <AlertTriangle size={17} className="text-[#F59E0B]" />,
    label: '주의',
  },
  error: {
    bg: '#FFF1F220', border: '#FECDD3',
    badge: 'bg-[#FFE4E6] text-[#9F1239]',
    icon: <XCircle size={17} className="text-[#F43F5E]" />,
    label: '오류',
  },
  skip: {
    bg: '#F8FAFC', border: '#E2E8F0',
    badge: 'bg-[#F1F5F9] text-[#64748B]',
    icon: <MinusCircle size={17} className="text-[#94A3B8]" />,
    label: '건너뜀',
  },
}

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  '환경변수':   <Key size={13} />,
  '연동 상태':  <Database size={13} />,
  '리뷰 수집':  <Activity size={13} />,
  '크론 상태':  <Clock size={13} />,
  'API 테스트': <Wifi size={13} />,
}

const CATEGORY_ORDER = ['환경변수', '연동 상태', '리뷰 수집', '크론 상태', 'API 테스트']

const OVERALL_BG: Record<CheckStatus, string> = {
  ok:    'from-[#DCFCE7] to-[#F0FDF4] border-[#86EFAC]',
  warn:  'from-[#FEF3C7] to-[#FFFBEB] border-[#FCD34D]',
  error: 'from-[#FFE4E6] to-[#FFF1F2] border-[#FDA4AF]',
  skip:  'from-[#F1F5F9] to-[#F8FAFC] border-[#CBD5E1]',
}
const OVERALL_ICON: Record<CheckStatus, React.ReactNode> = {
  ok:    <CheckCircle2 size={36} className="text-[#22C55E]" />,
  warn:  <AlertTriangle size={36} className="text-[#F59E0B]" />,
  error: <XCircle size={36} className="text-[#F43F5E]" />,
  skip:  <MinusCircle size={36} className="text-[#94A3B8]" />,
}
const OVERALL_TITLE: Record<CheckStatus, string> = {
  ok:    '✅ 네이버 연동 전체 정상',
  warn:  '⚠️ 일부 항목 주의 필요',
  error: '🚨 오류 발견 — 즉시 확인 필요',
  skip:  '진단 대기 중',
}

export default function AdminNaverCheckPage() {
  const [report, setReport]       = useState<HealthReport | null>(null)
  const [loading, setLoading]     = useState(false)
  const [err, setErr]             = useState<string | null>(null)
  const [lastAt, setLastAt]       = useState<Date | null>(null)
  const [autoRefresh, setAuto]    = useState(true)
  const [countdown, setCountdown] = useState(60)
  const timer  = useRef<ReturnType<typeof setInterval> | null>(null)
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchHealth = useCallback(async () => {
    setLoading(true); setErr(null)
    try {
      const r = await fetch('/api/admin/naver-health', { cache: 'no-store' })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`)
      setReport(j); setLastAt(new Date()); setCountdown(60)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '진단 실패')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchHealth() }, [fetchHealth])

  useEffect(() => {
    if (!autoRefresh) {
      timer.current  && clearInterval(timer.current)
      ticker.current && clearInterval(ticker.current)
      return
    }
    timer.current  = setInterval(fetchHealth, 60000)
    ticker.current = setInterval(() => setCountdown(p => p <= 1 ? 60 : p - 1), 1000)
    return () => {
      timer.current  && clearInterval(timer.current)
      ticker.current && clearInterval(ticker.current)
    }
  }, [autoRefresh, fetchHealth])

  const grouped = CATEGORY_ORDER.map(cat => ({
    cat,
    items: (report?.checks ?? []).filter(c => c.category === cat),
  })).filter(g => g.items.length > 0)

  const overall = report?.overall ?? 'skip'
  const summary = report?.summary

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">

      {/* ── 페이지 타이틀 ── */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-[#0F172A]">네이버 연동 진단</h1>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] px-2 py-0.5 rounded-full">
              🔒 ADMIN ONLY
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-[#EFF6FF] text-[#3182F6] border border-[#BFDBFE] px-2 py-0.5 rounded-full">
              <Zap size={9} />실시간
            </span>
          </div>
          <p className="text-sm text-[#64748B] mt-0.5">
            API 키 · 플레이스 연결 · 리뷰 수집 · 크론 · 실시간 API 응답을 종합 점검합니다.
          </p>
        </div>

        {/* 컨트롤 */}
        <div className="ml-auto flex items-center gap-3 flex-wrap">
          {lastAt && (
            <span className="text-[11px] text-[#94A3B8] flex items-center gap-1">
              <Clock size={11} />
              {lastAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => setAuto(p => !p)}
              className={`relative w-9 h-5 rounded-full transition-colors ${autoRefresh ? 'bg-[#22C55E]' : 'bg-[#CBD5E1]'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${autoRefresh ? 'left-4' : 'left-0.5'}`} />
            </div>
            <span className="text-[12px] text-[#4E5968]">
              {autoRefresh ? `자동갱신 ${countdown}s` : '자동갱신 꺼짐'}
            </span>
          </label>
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0F172A] text-white text-[12px] font-bold hover:bg-[#1E293B] disabled:opacity-50 transition"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            {loading ? '체크 중...' : '다시 체크'}
          </button>
        </div>
      </div>

      {/* ── 에러 ── */}
      {err && (
        <div className="mb-5 p-4 rounded-xl bg-[#FFF1F2] border border-[#FECDD3] text-[#9F1239] text-sm flex items-start gap-2">
          <XCircle size={15} className="mt-0.5 flex-shrink-0" />
          진단 실패: {err}
        </div>
      )}

      {/* ── 로딩 ── */}
      {loading && !report && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-[#F1F5F9] rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {report && (
        <>
          {/* ── Overall 배너 ── */}
          <div className={`mb-6 p-5 rounded-2xl bg-gradient-to-r border ${OVERALL_BG[overall]}`}>
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">{OVERALL_ICON[overall]}</div>
              <div className="flex-1">
                <div className="text-base font-bold text-[#0F172A]">{OVERALL_TITLE[overall]}</div>
                {summary && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {[
                      { label: '정상',   count: summary.ok,    cls: 'bg-[#DCFCE7] text-[#166534]' },
                      { label: '주의',   count: summary.warn,  cls: 'bg-[#FEF3C7] text-[#92400E]' },
                      { label: '오류',   count: summary.error, cls: 'bg-[#FFE4E6] text-[#9F1239]' },
                      { label: '건너뜀', count: summary.skip,  cls: 'bg-[#F1F5F9] text-[#64748B]' },
                    ].map(s => (
                      <span key={s.label} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${s.cls}`}>
                        {s.label} {s.count}
                      </span>
                    ))}
                    <span className="text-[11px] text-[#8B95A1] self-center">
                      · 총 {Object.values(summary).reduce((a, b) => a + b, 0)}항목
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── 카테고리별 체크 카드 ── */}
          <div className="space-y-4">
            {grouped.map(({ cat, items }) => (
              <div key={cat} className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden">
                {/* 카테고리 헤더 */}
                <div className="flex items-center gap-2 px-5 py-2.5 bg-[#F8FAFC] border-b border-[#F1F5F9]">
                  <span className="text-[#64748B]">{CATEGORY_ICON[cat]}</span>
                  <span className="text-[12px] font-bold text-[#334155]">{cat}</span>
                  <span className="ml-auto text-[10px] text-[#94A3B8]">{items.length}개 항목</span>
                </div>

                {/* 항목 리스트 */}
                <div className="divide-y divide-[#F1F5F9]">
                  {items.map(item => {
                    const sc = STATUS_STYLE[item.status]
                    return (
                      <div key={item.id} className="px-5 py-3.5 flex items-start gap-3.5">
                        <div className="flex-shrink-0 mt-0.5">{sc.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-0.5">
                            <span className="text-[13px] font-semibold text-[#1E293B]">{item.label}</span>
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border border-transparent ${sc.badge}`}>
                              {sc.label}
                            </span>
                          </div>
                          <p className="text-[12px] text-[#475569]">{item.message}</p>
                          {item.detail && (
                            <p className="text-[11px] text-[#94A3B8] mt-0.5">{item.detail}</p>
                          )}
                        </div>
                        {item.value !== null && item.value !== undefined && (
                          <div className="flex-shrink-0 text-right">
                            <span className="text-[18px] font-black text-[#1E293B]">{item.value}</span>
                            <p className="text-[10px] text-[#94A3B8]">건</p>
                          </div>
                        )}
                        {item.action_url && (
                          <a
                            href={item.action_url}
                            target={item.action_url.startsWith('http') ? '_blank' : '_self'}
                            rel="noopener noreferrer"
                            className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] text-[11px] font-semibold text-[#475569] hover:text-[#3182F6] hover:border-[#3182F6] bg-white transition"
                          >
                            {item.action_url.startsWith('http') ? '설정' : '이동'}
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* ── 가이드 ── */}
          <div className="mt-5 p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <p className="text-[11px] font-bold text-[#475569] mb-1.5">📌 진단 가이드 (관리자용)</p>
            <div className="space-y-1 text-[11px] text-[#64748B]">
              <p>• <b>환경변수 오류</b>: Vercel 대시보드 → Settings → Environment Variables 에서 키 추가</p>
              <p>• <b>리뷰 수집 지연</b>: 크론이 KST 4시간 주기 실행. Vercel Pro 미사용 시 크론 중단 가능.</p>
              <p>• <b>광고 API 오류</b>: 네이버 광고 계정의 일일 API 호출 한도 초과 여부 확인.</p>
              <p>• <b>오픈 API 오류</b>: 네이버 개발자센터 앱에서 사용 가능한 서비스(로컬검색·블로그검색·데이터랩) 권한 확인.</p>
            </div>
          </div>

          <div className="mt-3 text-center text-[10px] text-[#CBD5E1]">
            진단 시각: {new Date(report.checked_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
          </div>
        </>
      )}
    </div>
  )
}
