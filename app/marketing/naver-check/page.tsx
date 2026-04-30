'use client'
// ============================================================
// 네이버 연동 진단 페이지 — /marketing/naver-check
//   · API 키 · 플랫폼 연결 · 리뷰 수집 · 크론 · 실시간 API 테스트
//   · 60초 자동 갱신 + 수동 재체크 버튼
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import Sidebar from '@/app/components/Sidebar'
import Footer from '@/app/components/Footer'
import PageHeader from '@/app/components/PageHeader'
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

// ─── 상태별 스타일 ─────────────────────────────────────────
const STATUS_STYLE: Record<CheckStatus, {
  bg: string; border: string; text: string; badge: string
  icon: React.ReactNode; label: string
}> = {
  ok: {
    bg: '#F0FDF4', border: '#BBF7D0', text: '#166534',
    badge: 'bg-[#DCFCE7] text-[#166534]',
    icon: <CheckCircle2 size={18} className="text-[#22C55E]" />,
    label: '정상',
  },
  warn: {
    bg: '#FFFBEB', border: '#FDE68A', text: '#92400E',
    badge: 'bg-[#FEF3C7] text-[#92400E]',
    icon: <AlertTriangle size={18} className="text-[#F59E0B]" />,
    label: '주의',
  },
  error: {
    bg: '#FFF1F2', border: '#FECDD3', text: '#9F1239',
    badge: 'bg-[#FFE4E6] text-[#9F1239]',
    icon: <XCircle size={18} className="text-[#F43F5E]" />,
    label: '오류',
  },
  skip: {
    bg: '#F8FAFC', border: '#E2E8F0', text: '#64748B',
    badge: 'bg-[#F1F5F9] text-[#64748B]',
    icon: <MinusCircle size={18} className="text-[#94A3B8]" />,
    label: '건너뜀',
  },
}

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  '환경변수':  <Key size={14} />,
  '연동 상태': <Database size={14} />,
  '리뷰 수집': <Activity size={14} />,
  '크론 상태': <Clock size={14} />,
  'API 테스트': <Wifi size={14} />,
}

const OVERALL_CONFIG: Record<CheckStatus, { bg: string; border: string; title: string; desc: string; icon: React.ReactNode }> = {
  ok: {
    bg: 'from-[#DCFCE7] to-[#F0FDF4]', border: '#86EFAC',
    title: '✅ 네이버 연동 정상',
    desc: '모든 항목이 정상적으로 작동하고 있습니다.',
    icon: <CheckCircle2 size={40} className="text-[#22C55E]" />,
  },
  warn: {
    bg: 'from-[#FEF3C7] to-[#FFFBEB]', border: '#FCD34D',
    title: '⚠️ 주의 필요',
    desc: '일부 항목에서 개선이 필요합니다. 아래 항목을 확인해주세요.',
    icon: <AlertTriangle size={40} className="text-[#F59E0B]" />,
  },
  error: {
    bg: 'from-[#FFE4E6] to-[#FFF1F2]', border: '#FDA4AF',
    title: '🚨 오류 발견',
    desc: '연동에 문제가 있습니다. 빨간 항목을 즉시 확인해주세요.',
    icon: <XCircle size={40} className="text-[#F43F5E]" />,
  },
  skip: {
    bg: 'from-[#F1F5F9] to-[#F8FAFC]', border: '#CBD5E1',
    title: '진단 대기 중',
    desc: '체크 중입니다...',
    icon: <MinusCircle size={40} className="text-[#94A3B8]" />,
  },
}

// ─── 카테고리 순서 ─────────────────────────────────────────
const CATEGORY_ORDER = ['환경변수', '연동 상태', '리뷰 수집', '크론 상태', 'API 테스트']

export default function NaverCheckPage() {
  const [report, setReport] = useState<HealthReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [countdown, setCountdown] = useState(60)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchHealth = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/admin/naver-health', { cache: 'no-store' })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`)
      setReport(j)
      setLastChecked(new Date())
      setCountdown(60)
    } catch (e) {
      setError(e instanceof Error ? e.message : '진단 실패')
    } finally {
      setLoading(false)
    }
  }, [])

  // 최초 로드
  useEffect(() => { fetchHealth() }, [fetchHealth])

  // 자동 갱신 타이머
  useEffect(() => {
    if (!autoRefresh) {
      if (timerRef.current) clearInterval(timerRef.current)
      if (countRef.current) clearInterval(countRef.current)
      return
    }
    timerRef.current = setInterval(() => { fetchHealth() }, 60000)
    countRef.current = setInterval(() => {
      setCountdown(p => (p <= 1 ? 60 : p - 1))
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (countRef.current) clearInterval(countRef.current)
    }
  }, [autoRefresh, fetchHealth])

  // 카테고리별 그룹핑
  const grouped = CATEGORY_ORDER.map(cat => ({
    cat,
    items: (report?.checks ?? []).filter(c => c.category === cat),
  })).filter(g => g.items.length > 0)

  const overall = report?.overall ?? 'skip'
  const oc = OVERALL_CONFIG[overall]
  const summary = report?.summary

  return (
    <div className="flex min-h-screen bg-[#F8FAFB]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen ml-0 md:ml-60">
        <PageHeader title="네이버 연동 진단" />
        <main className="flex-1 px-4 md:px-8 py-6 max-w-4xl w-full mx-auto">

          {/* ── 헤더 타이틀 ── */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl font-bold text-[#191F28]">🔍 네이버 연동 상태 진단</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-[#EFF6FF] text-[#3182F6] border border-[#BFDBFE] px-2 py-0.5 rounded-full">
                <Zap size={10} />실시간 체크
              </span>
            </div>
            <p className="text-sm text-[#64748B]">
              API 키 설정 · 플레이스 연결 · 리뷰 수집 · 크론 동작까지 한눈에 진단합니다.
            </p>
          </div>

          {/* ── 컨트롤 바 ── */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <button
              onClick={fetchHealth}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3182F6] text-white text-sm font-semibold shadow-sm hover:bg-[#2563EB] disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              {loading ? '체크 중...' : '다시 체크'}
            </button>

            {/* 자동 갱신 토글 */}
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <div
                onClick={() => setAutoRefresh(p => !p)}
                className={`relative w-10 h-5 rounded-full transition-colors ${autoRefresh ? 'bg-[#22C55E]' : 'bg-[#CBD5E1]'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${autoRefresh ? 'left-5' : 'left-0.5'}`} />
              </div>
              <span className="text-sm text-[#4E5968]">
                {autoRefresh ? `자동 갱신 (${countdown}s)` : '자동 갱신 꺼짐'}
              </span>
            </label>

            {lastChecked && (
              <span className="ml-auto text-[12px] text-[#8B95A1] flex items-center gap-1">
                <Clock size={12} />
                마지막 체크: {lastChecked.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </div>

          {/* ── 에러 ── */}
          {error && (
            <div className="mb-5 p-4 rounded-xl bg-[#FFF1F2] border border-[#FECDD3] text-[#9F1239] text-sm flex items-start gap-2">
              <XCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>진단 실패: {error}</span>
            </div>
          )}

          {/* ── 로딩 스켈레톤 ── */}
          {loading && !report && (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-[#F1F5F9] rounded-2xl animate-pulse" />
              ))}
            </div>
          )}

          {/* ── Overall 배너 ── */}
          {report && (
            <>
              <div className={`mb-6 p-5 rounded-2xl bg-gradient-to-r ${oc.bg} border`}
                style={{ borderColor: oc.border }}>
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">{oc.icon}</div>
                  <div className="flex-1">
                    <div className="text-lg font-bold text-[#191F28]">{oc.title}</div>
                    <div className="text-sm text-[#4E5968] mt-0.5">{oc.desc}</div>
                    {summary && (
                      <div className="flex flex-wrap gap-3 mt-3">
                        {[
                          { label: '정상', count: summary.ok,    cls: 'bg-[#DCFCE7] text-[#166534]' },
                          { label: '주의', count: summary.warn,  cls: 'bg-[#FEF3C7] text-[#92400E]' },
                          { label: '오류', count: summary.error, cls: 'bg-[#FFE4E6] text-[#9F1239]' },
                          { label: '건너뜀', count: summary.skip, cls: 'bg-[#F1F5F9] text-[#64748B]' },
                        ].map(s => (
                          <span key={s.label} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-bold ${s.cls}`}>
                            {s.label} {s.count}
                          </span>
                        ))}
                        <span className="text-[12px] text-[#8B95A1] self-center">
                          총 {Object.values(summary).reduce((a, b) => a + b, 0)}개 항목
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── 카테고리별 체크 카드 ── */}
              <div className="space-y-5">
                {grouped.map(({ cat, items }) => (
                  <div key={cat} className="bg-white border border-[#E5E8EB] rounded-2xl shadow-sm overflow-hidden">
                    {/* 카테고리 헤더 */}
                    <div className="flex items-center gap-2 px-5 py-3 bg-[#FAFBFC] border-b border-[#F2F4F6]">
                      <span className="text-[#64748B]">{CATEGORY_ICON[cat] ?? <Activity size={14} />}</span>
                      <span className="text-[13px] font-bold text-[#191F28]">{cat}</span>
                      <span className="ml-auto text-[11px] text-[#8B95A1]">{items.length}개 항목</span>
                    </div>

                    {/* 항목 리스트 */}
                    <div className="divide-y divide-[#F2F4F6]">
                      {items.map(item => {
                        const sc = STATUS_STYLE[item.status]
                        return (
                          <div
                            key={item.id}
                            className="px-5 py-4 flex items-start gap-4"
                            style={{ backgroundColor: sc.bg + '44' }}
                          >
                            {/* 상태 아이콘 */}
                            <div className="flex-shrink-0 mt-0.5">{sc.icon}</div>

                            {/* 내용 */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="text-[14px] font-semibold text-[#191F28]">{item.label}</span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${sc.badge}`}
                                  style={{ borderColor: sc.border }}>
                                  {sc.label}
                                </span>
                              </div>
                              <p className="text-[13px] text-[#4E5968]">{item.message}</p>
                              {item.detail && (
                                <p className="text-[12px] text-[#8B95A1] mt-0.5">{item.detail}</p>
                              )}
                            </div>

                            {/* value 뱃지 */}
                            {item.value !== null && item.value !== undefined && (
                              <div className="flex-shrink-0 text-right">
                                <span className="text-[20px] font-black text-[#191F28]">{item.value}</span>
                                <p className="text-[10px] text-[#8B95A1]">건</p>
                              </div>
                            )}

                            {/* 바로가기 버튼 */}
                            {item.action_url && (
                              <a
                                href={item.action_url}
                                target={item.action_url.startsWith('http') ? '_blank' : '_self'}
                                rel="noopener noreferrer"
                                className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border text-[12px] font-semibold text-[#4E5968] hover:text-[#3182F6] hover:border-[#3182F6] transition"
                                style={{ borderColor: sc.border }}
                              >
                                {item.action_url.startsWith('http') ? '설정하기' : '바로가기'}
                                <ExternalLink size={11} />
                              </a>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── 하단 정보 ── */}
              <div className="mt-6 p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <div className="text-[12px] text-[#64748B] space-y-1">
                  <p className="font-semibold text-[#4E5968] mb-2">📌 진단 가이드</p>
                  <p>• <b>환경변수 오류</b>: Vercel 대시보드 → Settings → Environment Variables 에서 키 추가</p>
                  <p>• <b>리뷰 수집 지연</b>: 크론이 4시간 주기로 실행됩니다. Vercel Pro 미사용 시 크론이 동작하지 않을 수 있습니다.</p>
                  <p>• <b>API 오류</b>: 네이버 개발자센터에서 앱 사용량 한도 및 IP 허용 설정을 확인하세요.</p>
                  <p>• <b>플랫폼 미연결</b>: 설정 → 플랫폼 연결 메뉴에서 네이버 플레이스 계정을 연결하면 리뷰 자동 수집이 시작됩니다.</p>
                </div>
              </div>

              {/* 체크 시간 */}
              <div className="mt-3 text-center text-[11px] text-[#94A3B8]">
                진단 시각: {new Date(report.checked_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
              </div>
            </>
          )}
        </main>
        <Footer />
      </div>
    </div>
  )
}
