'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { adminFetch } from '../../lib/adminFetch'

type SubRow = {
  id: string
  user_id: string
  user_email: string | null
  module_id: string
  status: string
  current_period_end: string
  price_krw: number
  created_at: string
}

const STATUS_COLOR: Record<string, { bg: string; text: string; label: string }> = {
  active:    { bg: '#F0FDF4', text: '#16A34A', label: '활성' },
  past_due:  { bg: '#FEF3C7', text: '#92400E', label: '연체' },
  paused:    { bg: '#F3F4F6', text: '#4E5968', label: '일시정지' },
  cancelled: { bg: '#FFE4E6', text: '#9F1239', label: '해지' },
  expired:   { bg: '#F2F4F6', text: '#8B95A1', label: '만료' },
}

export default function AdminSubscriptionsPage() {
  const [rows, setRows] = useState<SubRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'past_due' | 'cancelled'>('all')

  useEffect(() => {
    (async () => {
      try {
        const res = await adminFetch('/api/admin/subscriptions')
        if (!res.ok) { setErr(`로드 실패 (${res.status})`); return }
        const json = await res.json()
        setRows(json.rows ?? [])
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'fetch error')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const filtered = filter === 'all' ? rows : rows.filter(r => r.status === filter)
  const totalMrr = rows.filter(r => r.status === 'active').reduce((sum, r) => sum + r.price_krw, 0)

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-black text-[#191F28] tracking-tight">구독 현황</h1>
        <p className="text-sm text-[#8B95A1] mt-1">
          총 {rows.length}건 · 활성 MRR ₩{totalMrr.toLocaleString()}
        </p>
      </header>

      {err && (
        <div className="bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-sm rounded-xl p-4 mb-5">
          {err}
        </div>
      )}

      <div className="flex gap-2 mb-4 flex-wrap">
        {(['all', 'active', 'past_due', 'cancelled'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === f ? 'bg-[#3182F6] text-white' : 'bg-white text-[#4E5968] border border-[#E5E8EB]'
            }`}>
            {f === 'all' ? '전체' : STATUS_COLOR[f]?.label ?? f}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F8FAFC] text-[#8B95A1] text-xs">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">사용자</th>
                <th className="px-4 py-3 text-left font-semibold">모듈</th>
                <th className="px-4 py-3 text-left font-semibold">상태</th>
                <th className="px-4 py-3 text-right font-semibold">가격</th>
                <th className="px-4 py-3 text-left font-semibold">다음 결제</th>
                <th className="px-4 py-3 text-left font-semibold">가입일</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center text-[#8B95A1] py-10">불러오는 중…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-[#8B95A1] py-10">표시할 구독이 없습니다</td></tr>
              ) : filtered.map(r => {
                const st = STATUS_COLOR[r.status] ?? { bg: '#F2F4F6', text: '#4E5968', label: r.status }
                return (
                  <tr key={r.id} className="border-t border-[#F2F4F6]">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[#191F28] text-xs">{r.user_email ?? '—'}</div>
                      <div className="text-[10px] text-[#B0B8C1] font-mono">{r.user_id.slice(0, 8)}…</div>
                    </td>
                    <td className="px-4 py-3 text-[#4E5968] font-mono text-xs">{r.module_id}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                        style={{ background: st.bg, color: st.text }}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-[#191F28]">₩{r.price_krw.toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-[#4E5968]">{r.current_period_end?.slice(0, 10) ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-[#8B95A1]">{r.created_at?.slice(0, 10) ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
