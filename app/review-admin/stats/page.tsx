'use client'

// ============================================================
// /review-admin/stats — 답글 발행 통계
//   · 플랫폼별 답변률 + 성공률
//   · 실패 원인 분석
//   · 평균 답글 시간
// ============================================================

import { useState, useEffect } from 'react'
import Sidebar from '../../components/Sidebar'
import PageHeader from '../../components/PageHeader'
import Footer from '../../components/Footer'
import { BarChart3, CheckCircle2, AlertTriangle, Clock, TrendingUp, MessageSquare } from 'lucide-react'

export const dynamic = 'force-dynamic'

type PlatformStat = {
  total: number
  replied: number
  submittedByUs: number
  pending: number
  failed: number
  successRate: number
  negativeUnreplied: number
  avgDaysToReply: number | null
}

type StatsData = {
  ok: boolean
  days: number
  total: number
  summary: {
    totalReplied: number
    totalUnreplied: number
    totalSubmittedByUs: number
    totalFailed: number
    totalNegativeUnreplied: number
    overallReplyRate: number
    overallSuccessRate: number
  }
  byPlatform: Record<string, PlatformStat>
  failureReasons: Record<string, number>
}

const PLATFORM_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  naver_place: { label: '네이버 플레이스', color: '#03C75A', bg: '#E8FFF0' },
  baemin:      { label: '배달의민족',     color: '#2DDDC8', bg: '#E0FAF8' },
  yogiyo:      { label: '요기요',         color: '#E5007F', bg: '#FFE5ED' },
  coupangeats: { label: '쿠팡이츠',       color: '#FF5A00', bg: '#FFEFE0' },
  kakao_map:   { label: '카카오맵',       color: '#FEE500', bg: '#FFFBE5' },
  google:      { label: '구글',           color: '#4285F4', bg: '#E8F4FD' },
}

export default function ReplyStatsPage() {
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  useEffect(() => {
    setLoading(true)
    fetch('/api/reply-stats?days=' + days, { credentials: 'include', cache: 'no-store' })
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [days])

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Sidebar />
      <div className="md:ml-[220px] flex flex-col min-h-screen max-w-[1400px]">
        <PageHeader
          icon={<BarChart3 size={28} className="text-white" strokeWidth={2.5} />}
          title="답글 발행 통계"
          subtitle="플랫폼별 답변률 · 성공률 · 실패 원인 한눈에 보기"
        />

        <main className="flex-1 px-4 md:px-6 py-6 max-w-5xl mx-auto w-full space-y-6">
          {/* 기간 선택 */}
          <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 flex-wrap">
            <span className="text-sm font-bold text-[#191F28]">기간</span>
            {[7, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ' +
                  (days === d
                    ? 'bg-[#3182F6] text-white'
                    : 'bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB]')}
              >
                최근 {d}일
              </button>
            ))}
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-[#8B95A1]">
              통계 불러오는 중...
            </div>
          ) : !data?.ok ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-[#DC2626]">
              통계 조회 실패
            </div>
          ) : data.total === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-[#8B95A1]">
              <MessageSquare size={32} className="mx-auto mb-3 text-[#D1D5DB]" strokeWidth={2} />
              <p className="text-sm">최근 {days}일간 수집된 리뷰가 없어요.</p>
            </div>
          ) : (
            <>
              {/* 핵심 지표 4카드 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                  icon={<MessageSquare size={16} className="text-white" strokeWidth={2.5} />}
                  iconBg="from-[#3182F6] to-[#1B64DA]"
                  label="총 리뷰"
                  value={data.total + '건'}
                  sub={'최근 ' + days + '일'}
                />
                <StatCard
                  icon={<CheckCircle2 size={16} className="text-white" strokeWidth={2.5} />}
                  iconBg="from-[#10B981] to-[#059669]"
                  label="답변률"
                  value={data.summary.overallReplyRate + '%'}
                  sub={data.summary.totalReplied + '/' + data.total + '건'}
                  highlight={data.summary.overallReplyRate >= 80 ? 'good' : data.summary.overallReplyRate >= 50 ? 'warn' : 'bad'}
                />
                <StatCard
                  icon={<TrendingUp size={16} className="text-white" strokeWidth={2.5} />}
                  iconBg="from-[#8B5CF6] to-[#7C3AED]"
                  label="자동 발행 성공률"
                  value={data.summary.overallSuccessRate + '%'}
                  sub={data.summary.totalSubmittedByUs + '성공 / ' + data.summary.totalFailed + '실패'}
                  highlight={data.summary.overallSuccessRate >= 90 ? 'good' : data.summary.overallSuccessRate >= 70 ? 'warn' : 'bad'}
                />
                <StatCard
                  icon={<AlertTriangle size={16} className="text-white" strokeWidth={2.5} />}
                  iconBg="from-[#F59E0B] to-[#D97706]"
                  label="부정·미답변"
                  value={data.summary.totalNegativeUnreplied + '건'}
                  sub="별점 1-2점 미답변"
                  highlight={data.summary.totalNegativeUnreplied > 0 ? 'bad' : 'good'}
                />
              </div>

              {/* 플랫폼별 표 */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-[#F2F4F6]">
                  <h2 className="text-sm font-bold text-[#191F28]">플랫폼별 통계</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#F8F9FA] text-[11px] text-[#8B95A1] uppercase">
                      <tr>
                        <th className="px-4 py-2 text-left font-bold">플랫폼</th>
                        <th className="px-3 py-2 text-right font-bold">총리뷰</th>
                        <th className="px-3 py-2 text-right font-bold">답변</th>
                        <th className="px-3 py-2 text-right font-bold">자동성공</th>
                        <th className="px-3 py-2 text-right font-bold">실패</th>
                        <th className="px-3 py-2 text-right font-bold">대기</th>
                        <th className="px-3 py-2 text-right font-bold">성공률</th>
                        <th className="px-3 py-2 text-right font-bold">평균소요</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F2F4F6]">
                      {Object.entries(data.byPlatform).map(([pid, s]) => {
                        const meta = PLATFORM_LABEL[pid] || { label: pid, color: '#8B95A1', bg: '#F2F4F6' }
                        return (
                          <tr key={pid} className="hover:bg-[#FAFBFF]">
                            <td className="px-4 py-2.5">
                              <span className="inline-flex items-center gap-2 text-xs font-bold"
                                style={{ color: meta.color }}>
                                <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
                                {meta.label}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right text-xs text-[#191F28]">{s.total}</td>
                            <td className="px-3 py-2.5 text-right text-xs text-[#191F28]">{s.replied}</td>
                            <td className="px-3 py-2.5 text-right text-xs text-[#059669] font-bold">{s.submittedByUs}</td>
                            <td className="px-3 py-2.5 text-right text-xs text-[#DC2626] font-bold">{s.failed}</td>
                            <td className="px-3 py-2.5 text-right text-xs text-[#3182F6]">{s.pending}</td>
                            <td className="px-3 py-2.5 text-right text-xs font-bold"
                              style={{ color: s.successRate >= 90 ? '#059669' : s.successRate >= 70 ? '#D97706' : '#DC2626' }}>
                              {s.successRate}%
                            </td>
                            <td className="px-3 py-2.5 text-right text-xs text-[#8B95A1]">
                              {s.avgDaysToReply != null ? s.avgDaysToReply + '일' : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 실패 원인 */}
              {Object.keys(data.failureReasons).length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center">
                      <AlertTriangle size={14} className="text-white" strokeWidth={2.5} />
                    </div>
                    <h2 className="text-sm font-bold text-[#191F28]">실패 원인 분석</h2>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(data.failureReasons)
                      .sort((a, b) => b[1] - a[1])
                      .map(([reason, count]) => (
                        <div key={reason} className="flex items-center justify-between p-3 bg-[#FFFBEB] rounded-xl">
                          <span className="text-xs font-semibold text-[#92400E]">{reason}</span>
                          <span className="text-xs font-bold text-[#92400E] bg-[#FEF3C7] px-2 py-0.5 rounded-full">
                            {count}건
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
        <Footer />
      </div>
    </div>
  )
}

function StatCard({ icon, iconBg, label, value, sub, highlight }: {
  icon: React.ReactNode
  iconBg: string
  label: string
  value: string
  sub: string
  highlight?: 'good' | 'warn' | 'bad'
}) {
  const valueColor = highlight === 'good' ? '#059669' : highlight === 'warn' ? '#D97706' : highlight === 'bad' ? '#DC2626' : '#191F28'
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={'w-7 h-7 rounded-xl bg-gradient-to-br ' + iconBg + ' flex items-center justify-center shadow-sm'}>
          {icon}
        </div>
        <span className="text-[11px] font-semibold text-[#8B95A1]">{label}</span>
      </div>
      <p className="text-xl font-black" style={{ color: valueColor }}>{value}</p>
      <p className="text-[10px] text-[#8B95A1] mt-0.5">{sub}</p>
    </div>
  )
}
