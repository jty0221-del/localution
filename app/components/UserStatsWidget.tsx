// app/components/UserStatsWidget.tsx
// ============================================================
// v38: 사장님 dashboard 답글 통계 위젯 (모바일 최적화)
// ============================================================
'use client'

import { useEffect, useState } from 'react'
import {
  Sparkles, Calendar, TrendingUp, Award, AlertCircle,
  MessageSquare, Star, ArrowRight, Loader2,
} from 'lucide-react'

type Stats = {
  replies?: { today: number; this_week: number; this_month: number; all_time: number }
  unreplied?: { total: number; negative: number }
  ratings_30d?: {
    total_reviews: number
    avg_rating: number | null
    by_platform: Array<{ platform: string; count: number; avg_rating: number | null }>
  }
  threads?: { this_month: number; all_time: number } | null
}

const PLATFORM_LABELS: Record<string, string> = {
  naver_place: '네이버',
  kakao_map: '카카오',
  baemin: '배민',
  yogiyo: '요기요',
  coupangeats: '쿠팡',
  google: '구글',
}

const PLATFORM_COLORS: Record<string, string> = {
  naver_place: 'from-emerald-500 to-green-600',
  kakao_map: 'from-amber-400 to-yellow-500',
  baemin: 'from-teal-500 to-cyan-600',
  yogiyo: 'from-rose-500 to-red-600',
  coupangeats: 'from-orange-500 to-red-700',
  google: 'from-blue-500 to-indigo-600',
}

export default function UserStatsWidget() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/user/review-stats', { cache: 'no-store' })
      .then(r => r.json())
      .then(j => { if (j.ok) setStats(j) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#E5E8EB] p-4 md:p-5 flex items-center justify-center py-8 text-[#8B95A1] text-sm">
        <Loader2 size={16} className="animate-spin mr-2" /> 통계 로드 중…
      </div>
    )
  }

  if (!stats?.replies) return null

  const allTimeReplies = stats.replies.all_time || 0
  const todayReplies = stats.replies.today || 0
  const weekReplies = stats.replies.this_week || 0
  const monthReplies = stats.replies.this_month || 0
  const unreplied = stats.unreplied?.total || 0
  const negative = stats.unreplied?.negative || 0
  const avgRating = stats.ratings_30d?.avg_rating
  const totalRecent = stats.ratings_30d?.total_reviews || 0

  return (
    <div className="space-y-3 md:space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 shadow-sm flex items-center justify-center">
            <Sparkles size={14} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="text-sm md:text-base font-bold text-[#191F28]">내 답글 성과</div>
        </div>
        <a href="/review-admin/stats" className="text-[11px] md:text-xs text-[#3182F6] font-semibold inline-flex items-center gap-0.5">
          전체 통계 <ArrowRight size={11} />
        </a>
      </div>

      {/* 통계 4개 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        <StatCard
          label="오늘"
          value={todayReplies}
          unit="건"
          icon={Calendar}
          color="from-blue-500 to-indigo-600"
        />
        <StatCard
          label="이번 주"
          value={weekReplies}
          unit="건"
          icon={TrendingUp}
          color="from-emerald-500 to-green-600"
        />
        <StatCard
          label="이번 달"
          value={monthReplies}
          unit="건"
          icon={Award}
          color="from-amber-500 to-orange-600"
        />
        <StatCard
          label="누적"
          value={allTimeReplies}
          unit="건"
          icon={MessageSquare}
          color="from-violet-500 to-purple-700"
        />
      </div>

      {/* v38: Threads 자동발행 통계 (연결된 사용자만) */}
      {stats.threads && (stats.threads.all_time > 0 || stats.threads.this_month > 0) && (
        <a
          href="/marketing/threads"
          className="flex items-center justify-between gap-3 p-3 md:p-4 bg-gradient-to-br from-gray-900 to-black text-white rounded-xl shadow-sm hover:shadow-md transition"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-black">@</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs md:text-sm font-bold">Threads 자동발행</div>
              <div className="text-[10px] md:text-xs opacity-80">
                이번 달 {stats.threads.this_month}건 · 누적 {stats.threads.all_time}건
              </div>
            </div>
          </div>
          <ArrowRight size={14} className="flex-shrink-0 opacity-80" />
        </a>
      )}

      {/* 별점 + 미답변 (2열) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* 30일 평균 별점 */}
        <div className="bg-white rounded-2xl border border-[#E5E8EB] p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs md:text-sm font-bold text-[#191F28]">최근 30일 평균</div>
            <Star size={14} className="text-amber-500 fill-amber-500" />
          </div>
          {avgRating != null ? (
            <>
              <div className="flex items-end gap-1">
                <div className="text-2xl md:text-3xl font-black text-[#191F28]">{avgRating.toFixed(1)}</div>
                <div className="text-xs md:text-sm text-[#8B95A1] mb-1">/ 5.0</div>
              </div>
              <div className="text-[11px] md:text-xs text-[#8B95A1] mt-0.5">
                리뷰 {totalRecent}건 기준
              </div>
              {stats.ratings_30d!.by_platform.length > 0 && (
                <div className="mt-2 pt-2 border-t border-[#F2F4F6] space-y-1">
                  {stats.ratings_30d!.by_platform.slice(0, 4).map(p => (
                    <div key={p.platform} className="flex items-center justify-between text-[11px] md:text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full bg-gradient-to-br ${PLATFORM_COLORS[p.platform] || 'from-gray-400 to-gray-500'}`}></div>
                        <span className="text-[#191F28] font-medium">{PLATFORM_LABELS[p.platform] || p.platform}</span>
                        <span className="text-[#8B95A1]">· {p.count}건</span>
                      </div>
                      {p.avg_rating != null && (
                        <span className="font-semibold text-[#191F28]">
                          {p.avg_rating.toFixed(1)}<Star size={9} className="inline text-amber-500 fill-amber-500 ml-0.5 mb-0.5" />
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-xs md:text-sm text-[#8B95A1] py-3">아직 리뷰 데이터가 없어요</div>
          )}
        </div>

        {/* 미답변 알림 */}
        <div className={`rounded-2xl p-4 border ${
          unreplied > 0
            ? 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200'
            : 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className={`text-xs md:text-sm font-bold ${unreplied > 0 ? 'text-red-900' : 'text-emerald-900'}`}>
              미답변 리뷰
            </div>
            <AlertCircle size={14} className={unreplied > 0 ? 'text-red-500' : 'text-emerald-500'} />
          </div>
          <div className="flex items-end gap-1 mb-1">
            <div className={`text-2xl md:text-3xl font-black ${unreplied > 0 ? 'text-red-900' : 'text-emerald-900'}`}>{unreplied}</div>
            <div className={`text-xs md:text-sm mb-1 ${unreplied > 0 ? 'text-red-700' : 'text-emerald-700'}`}>건</div>
          </div>
          {negative > 0 && (
            <div className="text-[11px] md:text-xs text-red-700 font-semibold">
              · 부정 리뷰 (1~2점) {negative}건 우선 답글 필요
            </div>
          )}
          <a
            href="/review-admin"
            className={`mt-2 inline-flex items-center gap-1 text-[11px] md:text-xs font-bold ${
              unreplied > 0 ? 'text-red-700' : 'text-emerald-700'
            } hover:underline`}
          >
            답글 관리 <ArrowRight size={11} />
          </a>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, unit, icon: Icon, color }: any) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-xl p-3 md:p-4 text-white shadow-sm`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={12} strokeWidth={2.5} />
        <div className="text-[10px] md:text-xs font-medium opacity-90">{label}</div>
      </div>
      <div className="flex items-end gap-0.5">
        <div className="text-2xl md:text-3xl font-black">{value.toLocaleString()}</div>
        <div className="text-xs md:text-sm opacity-90 mb-0.5">{unit}</div>
      </div>
    </div>
  )
}
