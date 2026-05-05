'use client'

// ============================================================
// /review-admin/stats — 답글 발행 통계
//   · 플랫폼별 답변률 + 성공률
//   · 실패 원인 분석
//   · 평균 답글 시간
// ============================================================

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '../../components/Sidebar'
import PageHeader from '../../components/PageHeader'
import Footer from '../../components/Footer'
import { BarChart3, CheckCircle2, AlertTriangle, Clock, TrendingUp, MessageSquare, Headphones, ArrowRight } from 'lucide-react'

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

type FailureSample = {
  platform: string
  message: string
  postedAt: string | null
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
  failureSamples?: Record<string, FailureSample[]>
}

// v1.6z+: 사장님은 사용자 행동 가능한 항목만 본다 (30일 만료) — 그 외 기술 에러는 노출 X

const PLATFORM_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  naver_place: { label: '네이버 플레이스', color: '#03C75A', bg: '#E8FFF0' },
  baemin:      { label: '배달의민족',     color: '#2DDDC8', bg: '#E0FAF8' },
  yogiyo:      { label: '요기요',         color: '#E5007F', bg: '#FFE5ED' },
  coupangeats: { label: '쿠팡이츠',       color: '#FF5A00', bg: '#FFEFE0' },
  kakao_map:   { label: '카카오맵',       color: '#FEE500', bg: '#FFFBE5' },
  google:      { label: '구글',           color: '#4285F4', bg: '#E8F4FD' },
}

export default function ReplyStatsPage() {
  const router = useRouter()
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  // 사장님이 직접 처리할 수 있는 항목만 분리 (30일 만료) — 나머지는 시스템이 알아서 처리
  const expiredCount = data?.failureReasons?.['30일 정책 만료'] || 0
  // 그 외 기술 실패는 합쳐서 "발행 문제" 로 표기 (세분화 노출 X)
  const technicalFailureCount = Object.entries(data?.failureReasons || {})
    .filter(([reason]) => reason !== '30일 정책 만료' && reason !== '이미 답글 등록됨')
    .reduce((sum, [, count]) => sum + count, 0)

  // 문의 이동 — 통계 컨텍스트 자동 전달
  function goToInquiry() {
    if (!data) return
    const summary = `[답글 발행 문제 문의]
최근 ${data.days}일 통계:
- 총 리뷰: ${data.total}건
- 자동 발행 성공: ${data.summary.totalSubmittedByUs}건
- 발행 실패: ${data.summary.totalFailed}건
- 답변률: ${data.summary.overallReplyRate}%

플랫폼별 실패 건수:
${Object.entries(data.byPlatform)
  .filter(([, s]) => s.failed > 0)
  .map(([p, s]) => `- ${p}: 실패 ${s.failed}건 / 성공률 ${s.successRate}%`).join('\n') || '- (없음)'}

위 통계처럼 답글 발행에 문제가 반복되고 있습니다. 확인 부탁드립니다.`
    try {
      localStorage.setItem('localution.inquiry_prefill', JSON.stringify({
        category: '기술문의',
        message: summary,
        source: 'review-admin/stats',
      }))
    } catch {}
    router.push('/inquiry')
  }

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
      <div className="md:ml-[220px] flex flex-col min-h-screen">
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

              {/* 사장님이 직접 해결 가능한 항목 — 30일 만료만 노출 */}
              {expiredCount > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-[#FDE68A] overflow-hidden">
                  <div className="bg-[#FFFBEB] px-4 py-3 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center flex-shrink-0">
                      <Clock size={14} className="text-white" strokeWidth={2.5} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-[#191F28]">30일이 지나 답글이 막힌 리뷰 {expiredCount}건</h2>
                      <p className="text-[11px] text-[#92400E] mt-0.5">배민·요기요는 리뷰 등록 후 30일이 지나면 사장님 답글을 등록할 수 없어요.</p>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-[#4E5968] leading-relaxed">
                      앞으로는 새 리뷰가 올라오면 알림 받자마자 답글을 다는 게 좋아요.
                      <br />
                      <span className="text-[#8B95A1]">실시간 알림은 매 15분마다 자동으로 발송됩니다.</span>
                    </p>
                  </div>
                </div>
              )}

              {/* 발행 문제가 있는 경우 — 사장님께 친절한 문의 안내 (기술 세부사항 X) */}
              {technicalFailureCount > 0 && (
                <div className="rounded-2xl shadow-sm bg-gradient-to-br from-[#EFF6FF] to-[#F5F3FF] border border-[#DBEAFE] overflow-hidden">
                  <div className="p-5 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#3182F6] to-[#7C3AED] flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Headphones size={20} className="text-white" strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-sm md:text-base font-bold text-[#191F28] mb-1">
                        답글 발행에 문제가 있어요. 저희가 도와드릴게요.
                      </h2>
                      <p className="text-xs md:text-[13px] text-[#4E5968] leading-relaxed mb-3">
                        최근 {data.days}일 동안 답글 발행이 잘 되지 않은 리뷰가 <strong className="text-[#3182F6]">{technicalFailureCount}건</strong> 있어요.
                        대부분은 시스템이 다음 자동 주기에 알아서 다시 시도하지만, 반복되면 저희에게 알려주세요.
                        <br className="hidden md:block" />
                        <span className="text-[#8B95A1]">통계 정보를 자동으로 첨부해 빠르게 확인해 드립니다.</span>
                      </p>
                      <button
                        onClick={goToInquiry}
                        className="inline-flex items-center gap-1.5 bg-[#3182F6] text-white text-xs md:text-sm font-bold px-4 py-2 rounded-xl hover:bg-[#1B64DA] transition-colors shadow-sm"
                      >
                        문의 보내기
                        <ArrowRight size={14} strokeWidth={2.5} />
                      </button>
                    </div>
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
