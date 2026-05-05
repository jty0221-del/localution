'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { adminFetch } from '../../lib/adminFetch'

type UserRow = {
 id: string
 email: string | null
 created_at: string
 last_sign_in_at: string | null
 customers_count: number
 subscriptions_count: number
}

export default function AdminUsersPage() {
 const [rows, setRows] = useState<UserRow[]>([])
 const [loading, setLoading] = useState(true)
 const [err, setErr] = useState<string | null>(null)
 const [search, setSearch] = useState('')

 useEffect(() => {
 (async () => {
 try {
 const res = await adminFetch('/api/admin/users')
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

 const filtered = !search
 ? rows
 : rows.filter(r => (r.email ?? '').toLowerCase().includes(search.toLowerCase()))

 return (
 <div className="p-4 md:p-8 max-w-6xl mx-auto">
 <header className="mb-6">
 <h1 className="text-2xl font-black text-[#191F28] tracking-tight">사용자</h1>
 <p className="text-sm text-[#8B95A1] mt-1">
 {loading ? '집계 중…' : `총 ${rows.length}명 가입`}
 </p>
 </header>

 {err && (
 <div className="bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-sm rounded-xl p-4 mb-5">
 {err}
 </div>
 )}

 <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
 <input
 value={search}
 onChange={e => setSearch(e.target.value)}
 placeholder="이메일 검색…"
 className="w-full px-4 py-2.5 bg-[#F2F4F6] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3182F6]/20 text-[#191F28]"
 />
 </div>

 <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead className="bg-[#F8FAFC] text-[#8B95A1] text-xs">
 <tr>
 <th className="px-4 py-3 text-left font-semibold">이메일</th>
 <th className="px-4 py-3 text-right font-semibold">구독</th>
 <th className="px-4 py-3 text-right font-semibold">고객</th>
 <th className="px-4 py-3 text-left font-semibold">가입일</th>
 <th className="px-4 py-3 text-left font-semibold">최근 로그인</th>
 </tr>
 </thead>
 <tbody>
 {loading ? (
 // 15차-9 스켈레톤 로더 (5행 애니메이션)
 Array.from({ length: 5 }).map((_, i) => (
 <tr key={i} className="border-t border-[#F2F4F6] animate-pulse">
 <td className="px-4 py-3">
 <div className="h-3 bg-[#F2F4F6] rounded w-40 mb-1" />
 <div className="h-2 bg-[#F2F4F6] rounded w-16" />
 </td>
 <td className="px-4 py-3"><div className="h-3 bg-[#F2F4F6] rounded w-6 ml-auto" /></td>
 <td className="px-4 py-3"><div className="h-3 bg-[#F2F4F6] rounded w-6 ml-auto" /></td>
 <td className="px-4 py-3"><div className="h-3 bg-[#F2F4F6] rounded w-20" /></td>
 <td className="px-4 py-3"><div className="h-3 bg-[#F2F4F6] rounded w-20" /></td>
 </tr>
 ))
 ) : filtered.length === 0 ? (
 <tr><td colSpan={5} className="text-center text-[#8B95A1] py-10">사용자가 없습니다</td></tr>
 ) : filtered.map(u => (
 <tr key={u.id} className="border-t border-[#F2F4F6]">
 <td className="px-4 py-3">
 <div className="font-semibold text-[#191F28] text-xs">{u.email ?? '—'}</div>
 <div className="text-[10px] text-[#B0B8C1] font-mono">{u.id.slice(0, 8)}…</div>
 </td>
 <td className="px-4 py-3 text-right font-bold text-[#3182F6]">{u.subscriptions_count}</td>
 <td className="px-4 py-3 text-right font-bold text-[#16A34A]">{u.customers_count}</td>
 <td className="px-4 py-3 text-xs text-[#4E5968]">{u.created_at?.slice(0, 10) ?? '—'}</td>
 <td className="px-4 py-3 text-xs text-[#8B95A1]">{u.last_sign_in_at?.slice(0, 10) ?? '—'}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 )
}
