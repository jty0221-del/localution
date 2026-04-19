'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { adminFetch } from '../../lib/adminFetch'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Legend,
} from 'recharts'

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

// 지난 6개월 mock 추이 (실제 데이터 누적 전 시뮬레이션)
function buildMrrTrend(currentMrr: number) {
  // 현재 MRR을 최신 포인트로 두고 과거 5개월은 감소 곡선
  const curve = [0.42, 0.58, 0.67, 0.79, 0.9, 1]
  const now = new Date()
  return curve.map((r, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const label = `${String(d.getMonth() + 1).padStart(2, '0')}월`
    const base = currentMrr > 0 ? currentMrr : 1_200_000 // mock fallback
    return { month: label, mrr: Math.round(base * r) }
  })
}

// 모듈별 활성 구독 mock 분포 (Phase 0 카탈로그 기준)
function buildModuleDist(totalActive: number) {
  const weights = [
    { module: '리뷰관리',  w: 0.28, color: '#3182F6' },
    { module: '키워드',    w: 0.22, color: '#10B981' },
    { module: '블로그',    w: 0.15, color: '#F59E0B' },
    { module: '릴스',      w: 0.12, color: '#EC4899' },
    { module: 'QR체험단',  w: 0.10, color: '#8B5CF6' },
    { module: '고객관리',  w: 0.08, color: '#F97316' },
    { module: '커뮤니티',  w: 0.05, color: '#14B8A6' },
  ]
  const base = totalActive > 0 ? totalActive : 100 // mock fallback
  return weights.map(w => ({
    module: w.module,
    count: Math.max(1, Math.round(base * w.w)),
    color: w.color,
  }))
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<Overview>(EMPTY)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const res = await adminFetch('/api/admin/overview')
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

  const mrrTrend   = useMemo(() => buildMrrTrend(data.mrr_krw), [data.mrr_krw])
  const moduleDist = useMemo(() => buildModuleDist(data.subscriptions.active), [data.subscriptions.active])

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

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6">
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

      {/* MRR 6개월 추이 + 모듈별 분포 (2-col on md) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-black text-[#191F28]">월 예상 매출 추이</h2>
              <p className="text-[11px] text-[#8B95A1] mt-0.5">최근 6개월 · 실데이터 누적 전 mock 곡선</p>
            </div>
            <span className="text-[10px] font-bold text-[#3182F6] bg-[#EFF6FF] px-2 py-0.5 rounded-full">DEMO</span>
          </div>
          <div className="w-full h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mrrTrend} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="mrrStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3182F6" />
                    <stop offset="100%" stopColor="#10B981" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F2F4F6" />
                <XAxis dataKey="month" stroke="#8B95A1" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#8B95A1"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : `${Math.round(v/1000)}K`}
                />
                <Tooltip
                  formatter={(v: number) => [`₩${v.toLocaleString()}`, 'MRR']}
                  contentStyle={{ border: '1px solid #E5E8EB', borderRadius: 12, fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="mrr"
                  stroke="url(#mrrStroke)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#3182F6', stroke: '#fff', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-black text-[#191F28]">모듈별 활성 구독</h2>
              <p className="text-[11px] text-[#8B95A1] mt-0.5">Phase 0 카탈로그 기준 · mock 가중치</p>
            </div>
            <span className="text-[10px] font-bold text-[#7C3AED] bg-[#F5F3FF] px-2 py-0.5 rounded-full">DEMO</span>
          </div>
          <div className="w-full h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={moduleDist} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F2F4F6" />
                <XAxis dataKey="module" stroke="#8B95A1" fontSize={10} tickLine={false} axisLine={false} interval={0} />
                <YAxis stroke="#8B95A1" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  formatter={(v: number) => [`${v}건`, '활성']}
                  contentStyle={{ border: '1px solid #E5E8EB', borderRadius: 12, fontSize: 12 }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {moduleDist.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
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

      <p className="text-[10px] text-[#8B95A1] mt-4 text-center">
        * 차트의 <span className="font-bold">DEMO</span> 배지 표시 영역은 실 구독 데이터 누적 전까지 mock 곡선/가중치로 표시됩니다.
      </p>
    </div>
  )
}
