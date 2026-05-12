'use client'

import { useEffect, useState } from 'react'
import PageHeader from '@/app/components/PageHeader'
import {
  Sparkles, RefreshCw, TrendingUp, AlertTriangle, BarChart3, MessageSquare,
} from 'lucide-react'

type Stats = {
  period_days: number
  summary: {
    total_attempts: number
    submitted: number
    failed: number
    queued: number
    success_rate_pct: number
    avg_reply_length: number
  }
  by_tone: Array<{ tone: string; total: number; submitted: number; failed: number; success_rate_pct: number; avg_length: number; samples: string[] }>
  by_platform: Array<{ platform: string; total: number; submitted: number; failed: number; success_rate: number }>
  error_patterns: Array<{ pattern: string; count: number }>
  length_distribution: Record<string, number>
  silent_reject_avg_length: number | null
}

const TONE_LABELS: Record<string, string> = {
  friendly: '친근한', expert: '전문적', witty: '유쾌한', simple: '심플',
  emo: '감성', mz: 'MZ', formal: '정중', warm: '따뜻', precise: '단정', cute: '귀여운', unknown: '미설정',
}

const TONE_COLORS: Record<string, string> = {
  friendly: 'from-amber-500 to-orange-600',
  expert: 'from-slate-500 to-gray-700',
  witty: 'from-pink-500 to-rose-600',
  simple: 'from-blue-500 to-indigo-600',
  emo: 'from-purple-500 to-violet-600',
  mz: 'from-emerald-500 to-green-600',
}

export default function ReplyQualityPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/admin/reply-quality-stats?days=${days}&_t=${Date.now()}`, { cache: 'no-store' })
      const j = await r.json()
      if (j.ok) setStats(j)
    } catch (_) {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [days])

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <PageHeader
        title="AI 답글 품질 모니터"
        subtitle="톤별 성공률 · silent reject 분석 · 길이 분포"
        icon={<Sparkles size={24} className="text-white" strokeWidth={2.5} />}
        variant="promo"
        badge="ADMIN"
      />

      <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 space-y-4 md:space-y-6">
        {/* 기간 선택 + 새로고침 */}
        <div className="flex items-center gap-2 flex-wrap">
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-bold transition ${
                days === d ? 'bg-purple-500 text-white' : 'bg-white border border-gray-200 text-gray-700'
              }`}
            >
              최근 {d}일
            </button>
          ))}
          <button
            onClick={load}
            disabled={loading}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs md:text-sm font-medium text-gray-700"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> 새로고침
          </button>
        </div>

        {stats && (
          <>
            {/* 요약 카드 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
              <SumCard label="전체 시도" value={stats.summary.total_attempts} icon={MessageSquare} color="from-blue-500 to-indigo-600" />
              <SumCard label="성공률" value={`${stats.summary.success_rate_pct}%`} icon={TrendingUp} color="from-emerald-500 to-green-600" />
              <SumCard label="실패" value={stats.summary.failed} icon={AlertTriangle} color="from-red-500 to-rose-600" />
              <SumCard label="평균 길이" value={`${stats.summary.avg_reply_length}자`} icon={BarChart3} color="from-amber-500 to-orange-600" />
            </div>

            {/* 톤별 통계 */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 md:p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-sm flex items-center justify-center">
                  <Sparkles size={16} className="text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <div className="text-base md:text-lg font-bold text-gray-900">톤별 성과</div>
                  <div className="text-xs text-gray-500">어떤 톤이 가장 많이 발행 성공했는지</div>
                </div>
              </div>
              <div className="space-y-2">
                {stats.by_tone.length === 0 ? (
                  <div className="text-center py-6 text-sm text-gray-400">데이터 없음</div>
                ) : stats.by_tone.map(t => {
                  const color = TONE_COLORS[t.tone] || 'from-gray-400 to-gray-500'
                  const label = TONE_LABELS[t.tone] || t.tone
                  return (
                    <div key={t.tone} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-md bg-gradient-to-br ${color} flex items-center justify-center`}>
                            <span className="text-[10px] font-black text-white">{label.slice(0, 2)}</span>
                          </div>
                          <span className="text-sm font-bold text-gray-900">{label}</span>
                          <span className="text-xs text-gray-500">{t.total}건</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-black ${t.success_rate_pct >= 90 ? 'text-emerald-600' : t.success_rate_pct >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                            {t.success_rate_pct}%
                          </span>
                          <span className="text-xs text-gray-500">· 평균 {t.avg_length}자</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${color}`}
                          style={{ width: `${t.success_rate_pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 답글 길이 분포 + silent reject */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 md:p-6">
                <div className="text-sm md:text-base font-bold text-gray-900 mb-3">답글 길이 분포</div>
                <div className="space-y-1.5">
                  {Object.entries(stats.length_distribution).map(([range, count]) => {
                    const max = Math.max(...Object.values(stats.length_distribution))
                    const pct = max > 0 ? (count / max) * 100 : 0
                    const danger = range === '281+'
                    return (
                      <div key={range}>
                        <div className="flex items-center justify-between text-xs">
                          <span className={danger ? 'text-red-600 font-bold' : 'text-gray-700'}>
                            {range}자 {danger && '⚠️'}
                          </span>
                          <span className="font-semibold text-gray-900">{count}</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${danger ? 'bg-red-500' : 'bg-purple-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
                {stats.silent_reject_avg_length != null && (
                  <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-red-700">
                    Silent reject 답글 평균: <strong>{stats.silent_reject_avg_length}자</strong>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 md:p-6">
                <div className="text-sm md:text-base font-bold text-gray-900 mb-3">실패 원인 분석</div>
                {stats.error_patterns.length === 0 ? (
                  <div className="text-center py-6 text-sm text-gray-400">실패 없음 ✨</div>
                ) : (
                  <div className="space-y-1.5">
                    {stats.error_patterns.map(e => (
                      <div key={e.pattern} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-xs md:text-sm">
                        <span className="font-medium text-gray-900">{e.pattern}</span>
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-md font-bold text-[11px]">
                          {e.count}건
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 플랫폼별 */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 md:p-6">
              <div className="text-sm md:text-base font-bold text-gray-900 mb-3">플랫폼별 성공률</div>
              <div className="overflow-x-auto -mx-2 md:mx-0">
                <table className="w-full text-xs md:text-sm min-w-[400px]">
                  <thead className="text-left text-gray-500 border-b border-gray-200">
                    <tr>
                      <th className="px-2 py-2">플랫폼</th>
                      <th className="px-2 py-2 text-center">시도</th>
                      <th className="px-2 py-2 text-center text-emerald-600">성공</th>
                      <th className="px-2 py-2 text-center text-red-600">실패</th>
                      <th className="px-2 py-2 text-center">성공률</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.by_platform.map(p => (
                      <tr key={p.platform} className="border-b border-gray-100">
                        <td className="px-2 py-2 font-bold text-gray-900">{p.platform}</td>
                        <td className="px-2 py-2 text-center">{p.total}</td>
                        <td className="px-2 py-2 text-center text-emerald-600 font-semibold">{p.submitted}</td>
                        <td className="px-2 py-2 text-center text-red-600 font-semibold">{p.failed}</td>
                        <td className="px-2 py-2 text-center font-black"
                          style={{ color: p.success_rate >= 90 ? '#059669' : p.success_rate >= 70 ? '#D97706' : '#DC2626' }}>
                          {p.success_rate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function SumCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-xl p-3 md:p-4 text-white shadow-sm`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={12} strokeWidth={2.5} />
        <div className="text-[10px] md:text-xs font-medium opacity-90">{label}</div>
      </div>
      <div className="text-2xl md:text-3xl font-black mt-0.5">{value}</div>
    </div>
  )
}
