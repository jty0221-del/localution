'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'

type Overview = {
  subscriptions: { active: number; past_due: number; cancelled: number; total: number }
  mrr_krw: number
  users_total: number
  customers_total: number
  loaded: boolean
}

const EMPTY: Overview = {
  subscriptions: { active: 0, past_due: 0, cancelled: 0, total: 0 },
  mrr_krw: 0,
  users_total: 0,
  customers_total: 0,
  loaded: false,
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<Overview>(EMPTY)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/overview', { cache: 'no-store' })
        if (!res.ok) {
          setErr(`오버뷰 로드 실패 (${res.status})`)
          return
        }
        const json = await res.json()
        setData({ ...json, loaded: true })
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'fetch error')
      }
    })()
  }, [])

  const kpis = [
    { label: '활성 구독', value: data.subscriptions.active, icon: '🟢', color: '#16A34A' },
    { label: '연체 구독', value: data.subscriptions.past_due, icon: '🟡', color: '#CA8A04' },
    { label: '해지 구독', value: data.subscriptions.cancelled, icon: '⚪', color: '#8B95A1' },
    { label: '월 예상 매출', value: data.mrr_krw, icon: '💰', color: '#3182F6', krw: true },
    { label: '가입 사용자', value: data.users_total, icon: '👥', color: '#7C3AED' },
    { label: '등록 고객 합계', value: data.customers_total, icon: '🧑‍🤝‍🧑', color: '#F59E0B' },
  ]

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-black text-[#191F28] tracking-tight">대시보드</h1>
        <p className="text-sm text-[#8B95A1] mt-1">전체 구독 · 매출 · 사용자 · CRM 현황</p>
      </header>

      {err && (
        <div className="bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-sm rounded-xl p-4 mb-5">
          {err} — 서비스 롤 키 또는 RLS 설정을 확인해주세요.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-8">
        {kpis.map(k => (
          <div key={k.label} className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="text-2xl mb-1">{k.icon}</div>
            <div className="text-2xl md:text-3xl font-black" style={{ color: k.color }}>
              {!data.loaded ? '—' : k.krw ? `₩${k.value.toLocaleString()}` : k.value.toLocaleString()}
            </div>
            <div className="text-xs text-[#8B95A1] font-medium mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-[#191F28]">구독 상태 분포</h2>
          <span className="text-xs text-[#8B95A1]">총 {data.subscriptions.total}건</span>
        </div>
        <div className="space-y-2">
          {[
            { label: '활성', value: data.subscriptions.active, color: '#16A34A' },
            { label: '연체', value: data.subscriptions.past_due, color: '#CA8A04' },
            { label: '해지', value: data.subscriptions.cancelled, color: '#8B95A1' },
          ].map(row => {
            const pct = data.subscriptions.total > 0
              ? Math.round((row.value / data.subscriptions.total) * 100)
              : 0
            return (
              <div key={row.label}>
                <div className="flex justify-between text-xs text-[#4E5968] font-semibold mb-1">
                  <span>{row.label}</span>
                  <span>{row.value}건 · {pct}%</span>
                </div>
                <div className="w-full bg-[#F2F4F6] rounded-full h-2">
                  <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: row.color }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
