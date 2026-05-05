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
import { BarChart3, CheckCircle2, AlertTriangle, Clock, TrendingUp, MessageSquare, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react'

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

// v1.6z: 카테고리별 사장님 친화 안내
const REASON_GUIDE: Record<string, { what: string; how: string; color: string }> = {
  '30일 정책 만료': {
    what: '리뷰가 등록된 지 30일이 넘어 답글 발행 기간이 만료되었습니다.',
    how: '배민·요기요는 30일 후 답글이 막힙니다. 새 리뷰는 자동 알림 받자마자 답글을 다는 게 좋아요.',
    color: '#F59E0B',
  },
  '쿠키·세션 만료': {
    what: '플랫폼 로그인 세션이 만료되어 자동 발행이 차단되었습니다.',
    how: '"플랫폼 연결" 메뉴에서 해당 플랫폼을 다시 연결해 주세요.',
    color: '#3182F6',
  },
  '로그인 실패': {
    what: 'ID/PW 로 자동 로그인 시도했으나 실패했습니다.',
    how: '플랫폼 연결 메뉴에서 ID/PW를 다시 입력하거나 2단계 인증을 해제해 주세요.',
    color: '#DC2626',
  },
  'Akamai / 봇 차단': {
    what: '플랫폼이 자동화 트래픽으로 의심해 차단했습니다.',
    how: '한국 IP 거주형 프록시로 다음 cron 주기에 자동 재시도됩니다. 반복되면 문의 주세요.',
    color: '#DC2626',
  },
  'CAPTCHA / 차단': {
    what: '캡챠 또는 봇 차단 페이지가 표시되었습니다.',
    how: '워커가 다음 주기에 자동 우회 시도. 반복되면 ID/PW 확인 또는 매장관리에서 직접 1회 발행 후 재시도.',
    color: '#DC2626',
  },
  '사장님 권한 부족': {
    what: '해당 매장에 사장님 답글 권한이 없습니다.',
    how: '카카오맵은 카카오 비즈니스 (place-mall.kakao.com), 배민/요기요는 사장님 페이지 가입 후 매장 연결이 필요해요.',
    color: '#F59E0B',
  },
  'DOM 구조 변경': {
    what: '플랫폼 페이지 구조가 바뀌어 답글 버튼/입력창을 찾지 못했습니다.',
    how: '저희가 자동 감지해서 워커를 업데이트합니다. 24시간 내 자동 복구되며, 빠른 처리가 필요하면 문의 주세요.',
    color: '#7C3AED',
  },
  '리뷰 카드 매칭 실패': {
    what: '플랫폼 페이지에서 해당 리뷰 카드를 찾지 못했습니다.',
    how: '리뷰가 삭제됐거나 페이지 이동 시 위치가 바뀐 경우입니다. 다음 cron에서 재시도됩니다.',
    color: '#7C3AED',
  },
  'Timeout (응답 지연)': {
    what: '플랫폼 응답이 느려 시간 초과되었습니다.',
    how: '다음 cron 주기에 자동 재시도됩니다. 반복되면 플랫폼 점검 시간일 수 있어요.',
    color: '#8B95A1',
  },
  '네트워크 오류': {
    what: '워커-플랫폼 사이 네트워크 연결이 끊겼습니다.',
    how: '다음 cron 주기에 자동 재시도됩니다.',
    color: '#8B95A1',
  },
  '이미 답글 등록됨': {
    what: '플랫폼에는 이미 답글이 등록되어 있어 재등록이 차단됐습니다.',
    how: '실제로는 성공한 케이스입니다. 다음 동기화에서 has_reply=true 로 업데이트됩니다.',
    color: '#059669',
  },
  '매장 ID 누락': {
    what: '플랫폼에서 매장 ID 를 자동 감지하지 못했습니다.',
    how: '플랫폼 연결 메뉴에서 매장 URL 또는 ID를 직접 입력해 주세요.',
    color: '#F59E0B',
  },
  '응답 형식 오류': {
    what: '플랫폼 응답을 파싱하지 못했습니다.',
    how: '플랫폼 API 변경 가능성. 24시간 내 자동 복구.',
    color: '#7C3AED',
  },
  '프록시 오류': {
    what: '한국 IP 프록시 연결에 문제가 있습니다.',
    how: '다음 cron 주기에 자동 복구됩니다.',
    color: '#8B95A1',
  },
  '기타 (분류 불가)': {
    what: '아래 펼쳐서 실제 에러 메시지를 확인하세요. 새 패턴이면 카테고리에 추가하겠습니다.',
    how: '실제 메시지를 캡쳐해서 문의해 주시면 자동 분류 카테고리에 추가합니다.',
    color: '#8B95A1',
  },
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
  const [expandedReason, setExpandedReason] = useState<string | null>(null)

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
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center">
                      <AlertTriangle size={14} className="text-white" strokeWidth={2.5} />
                    </div>
                    <h2 className="text-sm font-bold text-[#191F28]">실패 원인 분석</h2>
                  </div>
                  <p className="text-[11px] text-[#8B95A1] mb-3 ml-9">카드를 누르면 무엇 때문인지 + 어떻게 해결할지가 펼쳐져요.</p>
                  <div className="space-y-2">
                    {Object.entries(data.failureReasons)
                      .sort((a, b) => b[1] - a[1])
                      .map(([reason, count]) => {
                        const isOpen = expandedReason === reason
                        const guide = REASON_GUIDE[reason] || REASON_GUIDE['기타 (분류 불가)']
                        const samples = data.failureSamples?.[reason] || []
                        const accent = guide.color
                        return (
                          <div key={reason} className="rounded-xl overflow-hidden border border-[#F2F4F6]">
                            <button
                              onClick={() => setExpandedReason(isOpen ? null : reason)}
                              className="w-full flex items-center justify-between p-3 bg-[#FFFBEB] hover:bg-[#FEF3C7] transition-colors text-left"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: accent }} />
                                <span className="text-xs font-bold text-[#92400E] truncate">{reason}</span>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-xs font-bold text-[#92400E] bg-[#FEF3C7] px-2 py-0.5 rounded-full">
                                  {count}건
                                </span>
                                {isOpen ? <ChevronUp size={14} className="text-[#92400E]" strokeWidth={2.5} /> : <ChevronDown size={14} className="text-[#92400E]" strokeWidth={2.5} />}
                              </div>
                            </button>
                            {isOpen && (
                              <div className="bg-white p-3 border-t border-[#F2F4F6] space-y-3">
                                {/* 무엇 / 어떻게 안내 */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  <div className="rounded-lg p-2.5" style={{ background: accent + '12' }}>
                                    <p className="text-[10px] font-bold mb-1 flex items-center gap-1" style={{ color: accent }}>
                                      <AlertTriangle size={10} strokeWidth={2.5} /> 무엇 때문인지
                                    </p>
                                    <p className="text-xs text-[#4E5968] leading-relaxed">{guide.what}</p>
                                  </div>
                                  <div className="rounded-lg p-2.5 bg-[#EFF6FF]">
                                    <p className="text-[10px] font-bold text-[#3182F6] mb-1 flex items-center gap-1">
                                      <Lightbulb size={10} strokeWidth={2.5} /> 어떻게 해결하나요
                                    </p>
                                    <p className="text-xs text-[#4E5968] leading-relaxed">{guide.how}</p>
                                  </div>
                                </div>

                                {/* 실제 에러 메시지 샘플 */}
                                {samples.length > 0 && (
                                  <div>
                                    <p className="text-[10px] font-bold text-[#8B95A1] mb-1.5">실제 에러 메시지 (최대 5건)</p>
                                    <div className="space-y-1.5">
                                      {samples.map((s, i) => (
                                        <div key={i} className="rounded-lg bg-[#F8F9FA] p-2 border border-[#F2F4F6]">
                                          <div className="flex items-center gap-1.5 mb-1">
                                            <span className="text-[10px] font-bold uppercase text-[#8B95A1]">{s.platform}</span>
                                            {s.postedAt && (
                                              <span className="text-[10px] text-[#8B95A1]">· {new Date(s.postedAt).toLocaleDateString('ko-KR')}</span>
                                            )}
                                          </div>
                                          <p className="text-[11px] text-[#4E5968] font-mono break-all leading-relaxed">{s.message}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
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
