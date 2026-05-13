'use client'

import { useState, useEffect, useCallback } from 'react'
import Sidebar from '@/app/components/Sidebar'
import PageHeader from '@/app/components/PageHeader'
import {
  History, Search, Filter, ChevronLeft, ChevronRight, Star,
  CheckCircle2, AlertTriangle, Clock, MessageSquare,
} from 'lucide-react'

const PLATFORMS = [
  { value: '', label: '전체' },
  { value: 'naver_place', label: '네이버' },
  { value: 'kakao_map', label: '카카오' },
  { value: 'baemin', label: '배민' },
  { value: 'yogiyo', label: '요기요' },
  { value: 'coupangeats', label: '쿠팡' },
]

const STATUSES = [
  { value: 'submitted', label: '발행 완료', color: 'emerald' },
  { value: 'failed', label: '실패', color: 'red' },
  { value: 'queued', label: '대기 중', color: 'blue' },
  { value: 'all', label: '전체', color: 'gray' },
]

export default function ReplyHistoryPage() {
  const [platform, setPlatform] = useState('')
  const [status, setStatus] = useState('submitted')
  const [q, setQ] = useState('')
  const [days, setDays] = useState(30)
  const [offset, setOffset] = useState(0)
  const [limit] = useState(20)
  const [items, setItems] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        days: String(days),
        offset: String(offset),
        limit: String(limit),
        status,
      })
      if (platform) params.set('platform', platform)
      if (q.trim()) params.set('q', q.trim())
      const r = await fetch(`/api/user/reply-history?${params}`, { cache: 'no-store' })
      const j = await r.json()
      if (j.ok) {
        setItems(j.items)
        setTotal(j.total)
      }
    } catch (_) {}
    finally { setLoading(false) }
  }, [platform, status, q, days, offset, limit])

  useEffect(() => { load() }, [load])

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Sidebar />
      <div className="md:ml-[220px] flex flex-col min-h-screen">
        <PageHeader
          icon={<History size={24} className="text-white" strokeWidth={2.5} />}
          title="답글 발행 내역"
          subtitle="내가 발행한 답글 검색 + 실패 원인 추적"
        />

        <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 space-y-4">
          {/* 필터 */}
          <div className="bg-white rounded-2xl border border-[#E5E8EB] shadow-sm p-3 md:p-4 space-y-3">
            {/* 검색 + 기간 */}
            <div className="flex flex-col md:flex-row gap-2">
              <div className="flex-1 relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B95A1]" />
                <input
                  type="text"
                  value={q}
                  onChange={e => { setQ(e.target.value); setOffset(0) }}
                  placeholder="답글 내용 또는 리뷰 내용 검색..."
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-[#E5E8EB] focus:outline-none focus:ring-2 focus:ring-[#3182F6]/30 focus:border-[#3182F6]"
                />
              </div>
              <div className="flex gap-1">
                {[7, 30, 90, 365].map(d => (
                  <button
                    key={d}
                    onClick={() => { setDays(d); setOffset(0) }}
                    className={`px-3 py-2 rounded-lg text-xs md:text-sm font-bold transition ${
                      days === d ? 'bg-[#3182F6] text-white' : 'bg-[#F2F4F6] text-[#4E5968]'
                    }`}
                  >
                    {d}일
                  </button>
                ))}
              </div>
            </div>

            {/* 플랫폼 + 상태 */}
            <div className="flex flex-wrap gap-1.5">
              <div className="flex items-center gap-1 mr-2">
                <Filter size={12} className="text-[#8B95A1]" />
                <span className="text-[11px] text-[#8B95A1]">플랫폼:</span>
              </div>
              {PLATFORMS.map(p => (
                <button
                  key={p.value}
                  onClick={() => { setPlatform(p.value); setOffset(0) }}
                  className={`px-2.5 py-1 rounded-md text-[11px] md:text-xs font-bold transition ${
                    platform === p.value ? 'bg-[#3182F6] text-white' : 'bg-[#F2F4F6] text-[#4E5968]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5">
              <div className="flex items-center gap-1 mr-2">
                <span className="text-[11px] text-[#8B95A1]">상태:</span>
              </div>
              {STATUSES.map(s => (
                <button
                  key={s.value}
                  onClick={() => { setStatus(s.value); setOffset(0) }}
                  className={`px-2.5 py-1 rounded-md text-[11px] md:text-xs font-bold transition ${
                    status === s.value ? 'bg-[#3182F6] text-white' : 'bg-[#F2F4F6] text-[#4E5968]'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* 결과 */}
          <div className="text-xs md:text-sm text-[#8B95A1] px-1">
            {loading ? '검색 중…' : `총 ${total}건 · ${offset + 1}~${Math.min(offset + limit, total)} 표시`}
          </div>

          <div className="space-y-2">
            {items.length === 0 && !loading && (
              <div className="bg-white rounded-2xl border border-[#E5E8EB] p-8 text-center text-[#8B95A1] text-sm">
                해당하는 답글이 없어요. 필터를 변경해보세요.
              </div>
            )}
            {items.map(it => (
              <div key={it.id} className="bg-white rounded-2xl border border-[#E5E8EB] p-3 md:p-4">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="text-[10px] md:text-xs font-bold text-[#3182F6] px-1.5 py-0.5 bg-[#EFF6FF] rounded">
                    {it.platform_label}
                  </span>
                  <StatusBadge status={it.reply_status} />
                  {it.rating && (
                    <span className="flex items-center text-amber-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={11} className={i < it.rating ? 'fill-amber-500' : 'text-gray-300'} />
                      ))}
                    </span>
                  )}
                  <span className="text-[10px] md:text-xs text-[#8B95A1]">{it.author}</span>
                  <span className="text-[10px] md:text-xs text-[#8B95A1] ml-auto">
                    {it.reply_at ? new Date(it.reply_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
                <div className="text-xs md:text-sm text-[#4E5968] bg-[#F8F9FA] rounded-lg p-2 mb-1.5 line-clamp-2">
                  <span className="font-bold mr-1">리뷰:</span>{it.review_content}
                </div>
                {it.reply_content && (
                  <div className="text-xs md:text-sm text-[#191F28] bg-[#EFF6FF] rounded-lg p-2 line-clamp-3">
                    <span className="font-bold mr-1 text-[#3182F6]">답글:</span>{it.reply_content}
                  </div>
                )}
                {it.reply_status === 'failed' && it.reply_error && (
                  <div className="text-[11px] md:text-xs text-red-700 bg-red-50 rounded-lg p-2 mt-1.5">
                    <span className="font-bold mr-1">실패 사유:</span>{String(it.reply_error).slice(0, 200)}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 페이지네이션 */}
          {total > limit && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="inline-flex items-center gap-1 px-3 py-2 bg-white border border-[#E5E8EB] rounded-lg text-xs md:text-sm font-medium text-[#4E5968] disabled:opacity-30"
              >
                <ChevronLeft size={14} /> 이전
              </button>
              <span className="text-xs md:text-sm text-[#8B95A1] px-2">
                {Math.floor(offset / limit) + 1} / {Math.ceil(total / limit)}
              </span>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total}
                className="inline-flex items-center gap-1 px-3 py-2 bg-white border border-[#E5E8EB] rounded-lg text-xs md:text-sm font-medium text-[#4E5968] disabled:opacity-30"
              >
                다음 <ChevronRight size={14} />
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { Icon: any; label: string; bg: string; color: string }> = {
    submitted: { Icon: CheckCircle2, label: '발행', bg: 'bg-emerald-100', color: 'text-emerald-700' },
    failed: { Icon: AlertTriangle, label: '실패', bg: 'bg-red-100', color: 'text-red-700' },
    queued: { Icon: Clock, label: '대기', bg: 'bg-blue-100', color: 'text-blue-700' },
    submitting: { Icon: Clock, label: '발행중', bg: 'bg-amber-100', color: 'text-amber-700' },
  }
  const c = cfg[status] || { Icon: MessageSquare, label: status, bg: 'bg-gray-100', color: 'text-gray-600' }
  const { Icon } = c
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] md:text-xs font-bold ${c.bg} ${c.color}`}>
      <Icon size={10} />{c.label}
    </span>
  )
}
