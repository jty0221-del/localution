'use client'

import { useEffect, useState } from 'react'
import PageHeader from '@/app/components/PageHeader'
import {
  Briefcase, Users, AlertTriangle, RefreshCw, Star, MessageSquare,
  Search, ArrowRight, Filter,
} from 'lucide-react'

type User = {
  user_id: string
  user_id_short: string
  email: string | null
  display_name: string | null
  platforms: string[]
  has_login_issue: boolean
  reviews: number
  replied: number
  submitted_by_us: number
  unreplied: number
  negative_unreplied: number
  avg_rating: number | null
}

type Data = {
  total_users: number
  summary: {
    total_reviews_30d: number
    total_unreplied: number
    total_negative_unreplied: number
    users_with_login_issue: number
  }
  users: User[]
}

export default function ResellerPage() {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'login_issue' | 'has_negative' | 'has_unreplied'>('all')

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/reseller-overview?_t=' + Date.now(), { cache: 'no-store' })
      const j = await r.json()
      if (j.ok) setData(j)
    } catch (_) {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const impersonate = async (userId: string) => {
    try {
      const r = await fetch(`/api/admin/impersonate?user_id=${encodeURIComponent(userId)}`, { credentials: 'include' })
      if (r.ok) {
        window.location.href = '/dashboard'
      }
    } catch (_) {}
  }

  const filtered = data?.users.filter(u => {
    if (search) {
      const q = search.toLowerCase()
      const match = (u.email || '').toLowerCase().includes(q)
        || (u.display_name || '').toLowerCase().includes(q)
        || u.user_id.toLowerCase().includes(q)
      if (!match) return false
    }
    if (filter === 'login_issue') return u.has_login_issue
    if (filter === 'has_negative') return u.negative_unreplied > 0
    if (filter === 'has_unreplied') return u.unreplied > 0
    return true
  }) || []

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <PageHeader
        title="Reseller 대시보드"
        subtitle="모든 사장님 한 화면에서 관리 — impersonate 1클릭"
        icon={<Briefcase size={24} className="text-white" strokeWidth={2.5} />}
        variant="accent"
        badge="ADMIN"
      />

      <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 space-y-4 md:space-y-6">
        {/* 요약 */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
            <Card label="관리 사장님" value={data.total_users} icon={Users} color="from-blue-500 to-indigo-600" />
            <Card label="30일 리뷰" value={data.summary.total_reviews_30d} icon={MessageSquare} color="from-emerald-500 to-green-600" />
            <Card label="미답변" value={data.summary.total_unreplied} icon={Star} color="from-amber-500 to-orange-600" highlight={data.summary.total_unreplied > 20} />
            <Card label="부정 미답변" value={data.summary.total_negative_unreplied} icon={AlertTriangle} color="from-red-500 to-rose-600" highlight={data.summary.total_negative_unreplied > 0} />
          </div>
        )}

        {/* 필터 */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3 md:p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="이메일 / 이름 / user_id 검색"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500"
              />
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs md:text-sm font-medium text-gray-700"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> 새로고침
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { v: 'all', label: '전체' },
              { v: 'login_issue', label: '로그인 이슈' },
              { v: 'has_negative', label: '부정 미답변' },
              { v: 'has_unreplied', label: '미답변 있음' },
            ].map(f => (
              <button
                key={f.v}
                onClick={() => setFilter(f.v as any)}
                className={`px-2.5 py-1 rounded-md text-[11px] md:text-xs font-bold transition ${
                  filter === f.v ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* 사용자 리스트 */}
        <div className="space-y-2">
          <div className="text-xs md:text-sm text-gray-500 px-1">{filtered.length} / {data?.total_users || 0}명 표시</div>
          {filtered.map(u => (
            <div key={u.user_id} className={`bg-white rounded-2xl border shadow-sm p-3 md:p-4 ${u.has_login_issue ? 'border-red-200' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <div className="text-sm md:text-base font-bold text-gray-900">
                      {u.display_name || u.email || u.user_id_short}
                    </div>
                    {u.has_login_issue && (
                      <span className="text-[10px] md:text-xs font-bold text-red-700 px-1.5 py-0.5 bg-red-50 rounded">
                        로그인 이슈
                      </span>
                    )}
                  </div>
                  {u.email && (
                    <div className="text-[11px] md:text-xs text-gray-500">{u.email}</div>
                  )}
                  <div className="text-[10px] md:text-xs text-gray-400 font-mono">{u.user_id_short}</div>
                </div>
                <button
                  onClick={() => impersonate(u.user_id)}
                  className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-br from-purple-500 to-violet-600 text-white text-[11px] md:text-xs font-bold rounded-lg hover:shadow-md transition"
                >
                  Impersonate <ArrowRight size={11} />
                </button>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap mb-2">
                {u.platforms.map(p => (
                  <span key={p} className="text-[10px] md:text-xs font-bold px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded">
                    {p}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <Mini label="30일 리뷰" value={u.reviews} />
                <Mini label="미답변" value={u.unreplied} highlight={u.unreplied > 5 ? 'warn' : null} />
                <Mini label="부정 미답변" value={u.negative_unreplied} highlight={u.negative_unreplied > 0 ? 'bad' : null} />
                <Mini label="평균 별점" value={u.avg_rating != null ? u.avg_rating.toFixed(1) : '—'} />
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-sm text-gray-400">
              해당하는 사용자 없음
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Card({ label, value, icon: Icon, color, highlight }: any) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-xl p-3 md:p-4 text-white shadow-sm ${highlight ? 'ring-2 ring-yellow-400' : ''}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={12} strokeWidth={2.5} />
        <div className="text-[10px] md:text-xs font-medium opacity-90">{label}</div>
      </div>
      <div className="text-2xl md:text-3xl font-black mt-0.5">{value}</div>
    </div>
  )
}

function Mini({ label, value, highlight }: any) {
  const color = highlight === 'bad' ? 'text-red-600' : highlight === 'warn' ? 'text-amber-600' : 'text-gray-900'
  return (
    <div>
      <div className="text-[10px] md:text-xs text-gray-500 mb-0.5">{label}</div>
      <div className={`text-sm md:text-base font-bold ${color}`}>{value}</div>
    </div>
  )
}
