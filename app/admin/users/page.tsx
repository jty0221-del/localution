'use client'
// ============================================================
// 관리자 — 사용자 목록 (PC + 모바일 최적화)
// /admin/users
//   · 매장 정보 + 카테고리 + 지역 + 연동 플랫폼 통합 표시
//   · 분류별 필터: 지역 / 업종 / 플랫폼
//   · PC 표 / 모바일 카드 자동 전환
// ============================================================
export const dynamic = 'force-dynamic'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { adminFetch } from '../../lib/adminFetch'
import {
  Search, Users, Store, MapPin, Tag, Link2, Star,
  RefreshCw, ExternalLink,
} from 'lucide-react'

type UserRow = {
  user_id: string
  email: string | null
  provider: string | null
  signed_up_at: string | null
  last_sign_in_at: string | null
  store_count: number
  primary_store: {
    name: string
    category: string | null
    address: string | null
    location: string | null
    phone: string | null
    naver_place_id: string | null
  } | null
  region: string | null
  category: string | null
  platforms: string[]
  platform_count: number
  last_platform_login_at: string | null
  review_count: number
}

type Resp = {
  ok: boolean
  total: number
  with_store: number
  with_platform: number
  by_region: Record<string, number>
  by_category: Record<string, number>
  by_platform: Record<string, number>
  rows: UserRow[]
}

const PLATFORM_LABEL: Record<string, string> = {
  naver_place: '네이버',
  baemin: '배민',
  yogiyo: '요기요',
  coupangeats: '쿠팡',
  kakao_map: '카카오',
}

const PLATFORM_COLOR: Record<string, string> = {
  naver_place: '#03C75A',
  baemin: '#2AC1BC',
  yogiyo: '#FA0050',
  coupangeats: '#FF4B30',
  kakao_map: '#FEE500',
}

function fmtDate(iso: string | null): string {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' })
  } catch { return '-' }
}

export default function AdminUsersPage() {
  const [data, setData] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterRegion, setFilterRegion] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterPlatform, setFilterPlatform] = useState<string>('all')

  const load = async () => {
    setLoading(true); setErr(null)
    try {
      const res = await adminFetch('/api/admin/users')
      if (!res.ok) { setErr(`로드 실패 (${res.status})`); return }
      const json = await res.json()
      setData(json)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'fetch error')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    if (!data) return []
    return data.rows.filter(r => {
      if (search) {
        const q = search.toLowerCase()
        const hits = [
          r.email,
          r.user_id,
          r.primary_store?.name,
          r.primary_store?.address,
          r.primary_store?.phone,
          r.primary_store?.naver_place_id,
        ].some(s => (s || '').toLowerCase().includes(q))
        if (!hits) return false
      }
      if (filterRegion !== 'all' && r.region !== filterRegion) return false
      if (filterCategory !== 'all' && r.category !== filterCategory) return false
      if (filterPlatform !== 'all' && !r.platforms.includes(filterPlatform)) return false
      return true
    })
  }, [data, search, filterRegion, filterCategory, filterPlatform])

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6">
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-3 mb-4 md:mb-6 flex-wrap">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl md:text-2xl font-black text-[#191F28] flex items-center gap-2">
              <Users size={22} className="text-[#3182F6] flex-shrink-0" strokeWidth={2.5} />
              사용자 목록
            </h1>
            <p className="text-xs md:text-sm text-[#4E5968] mt-1">
              로컬루션 가입자 + 매장 정보 + 연동 플랫폼 통합
            </p>
          </div>
          <button onClick={load} disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#3182F6] text-white text-xs md:text-sm font-bold hover:bg-[#1B64DA] disabled:opacity-50 flex-shrink-0">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} strokeWidth={2.5} />
            새로고침
          </button>
        </div>

        {err && (
          <div className="mb-4 p-3 md:p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm">{err}</div>
        )}

        {data && (
          <>
            {/* 요약 카드 */}
            <section className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
              <StatCard label="전체 가입자" value={data.total} color="#191F28" />
              <StatCard label="매장 등록" value={data.with_store} color="#3182F6" />
              <StatCard label="플랫폼 연동" value={data.with_platform} color="#7C3AED" />
              <StatCard label="필터 결과" value={filtered.length} color="#059669" />
            </section>

            {/* 분류 칩 */}
            <section className="mb-3 space-y-2">
              {/* 지역 */}
              <FilterChips
                label="지역"
                Icon={MapPin}
                color="#F59E0B"
                value={filterRegion}
                onChange={setFilterRegion}
                options={data.by_region}
              />
              {/* 업종 */}
              <FilterChips
                label="업종"
                Icon={Tag}
                color="#7C3AED"
                value={filterCategory}
                onChange={setFilterCategory}
                options={data.by_category}
              />
              {/* 플랫폼 */}
              <FilterChips
                label="플랫폼"
                Icon={Link2}
                color="#3182F6"
                value={filterPlatform}
                onChange={setFilterPlatform}
                options={data.by_platform}
                labelMap={PLATFORM_LABEL}
              />
            </section>

            {/* 검색 */}
            <div className="mb-4 p-2 bg-white rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 px-2">
                <Search size={16} className="text-[#8B95A1] flex-shrink-0" strokeWidth={2.5} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="이메일·매장명·주소·전화번호·placeId 검색"
                  className="flex-1 px-2 py-2 text-sm focus:outline-none text-[#191F28] bg-transparent"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="text-xs text-[#8B95A1] hover:text-[#191F28]">×</button>
                )}
              </div>
            </div>

            {/* 모바일 카드 / PC 표 */}
            <div className="md:hidden space-y-2">
              {loading ? <SkeletonCards /> :
                filtered.length === 0 ? <EmptyState /> :
                filtered.map(u => <UserCard key={u.user_id} u={u} />)
              }
            </div>

            <div className="hidden md:block bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[#F2F4F6] text-[#191F28] font-bold">
                    <tr>
                      <th className="px-3 py-2 text-left">사용자</th>
                      <th className="px-3 py-2 text-left">매장</th>
                      <th className="px-3 py-2 text-left">업종</th>
                      <th className="px-3 py-2 text-left">지역</th>
                      <th className="px-3 py-2 text-left">연동</th>
                      <th className="px-3 py-2 text-right">리뷰</th>
                      <th className="px-3 py-2 text-left">가입일</th>
                      <th className="px-3 py-2 text-center">상세</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-t border-[#F2F4F6] animate-pulse">
                          <td className="px-3 py-3"><div className="h-3 bg-[#F2F4F6] rounded w-40" /></td>
                          <td className="px-3 py-3"><div className="h-3 bg-[#F2F4F6] rounded w-32" /></td>
                          <td className="px-3 py-3"><div className="h-3 bg-[#F2F4F6] rounded w-16" /></td>
                          <td className="px-3 py-3"><div className="h-3 bg-[#F2F4F6] rounded w-12" /></td>
                          <td className="px-3 py-3"><div className="h-3 bg-[#F2F4F6] rounded w-20" /></td>
                          <td className="px-3 py-3"><div className="h-3 bg-[#F2F4F6] rounded w-8 ml-auto" /></td>
                          <td className="px-3 py-3"><div className="h-3 bg-[#F2F4F6] rounded w-16" /></td>
                          <td className="px-3 py-3"></td>
                        </tr>
                      ))
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan={8} className="text-center text-[#8B95A1] py-10 text-sm">사용자가 없습니다</td></tr>
                    ) : filtered.map(u => (
                      <tr key={u.user_id} className="border-b border-[#F2F4F6] hover:bg-[#FAFBFF]">
                        <td className="px-3 py-2.5 max-w-[180px]">
                          <div className="text-xs font-bold text-[#191F28] truncate" title={u.email || ''}>{u.email || '-'}</div>
                          <div className="text-[10px] text-[#8B95A1] font-mono">{u.user_id.slice(0, 8)}{u.provider ? ' · ' + u.provider : ''}</div>
                        </td>
                        <td className="px-3 py-2.5 max-w-[200px]">
                          {u.primary_store ? (
                            <>
                              <div className="text-xs font-bold text-[#191F28] truncate" title={u.primary_store.name}>
                                {u.primary_store.name}
                                {u.store_count > 1 && <span className="ml-1 text-[10px] text-[#7C3AED]">+{u.store_count - 1}</span>}
                              </div>
                              {u.primary_store.address && (
                                <div className="text-[10px] text-[#8B95A1] truncate" title={u.primary_store.address}>
                                  {u.primary_store.address}
                                </div>
                              )}
                            </>
                          ) : <span className="text-[10px] text-[#B0B8C1]">미등록</span>}
                        </td>
                        <td className="px-3 py-2.5 text-[11px] text-[#7C3AED]">{u.category || '-'}</td>
                        <td className="px-3 py-2.5 text-[11px] text-[#F59E0B] font-bold">{u.region || '-'}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {u.platforms.map(p => (
                              <span key={p} className="text-[9px] font-black text-white px-1.5 py-0.5 rounded"
                                style={{ background: PLATFORM_COLOR[p] || '#6B7280', color: p === 'kakao_map' ? '#191F28' : '#fff' }}>
                                {PLATFORM_LABEL[p] || p}
                              </span>
                            ))}
                            {u.platforms.length === 0 && <span className="text-[10px] text-[#B0B8C1]">없음</span>}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold tabular-nums" style={{ color: u.review_count > 0 ? '#191F28' : '#B0B8C1' }}>
                          {u.review_count}
                        </td>
                        <td className="px-3 py-2.5 text-[10px] text-[#4E5968]">{fmtDate(u.signed_up_at)}</td>
                        <td className="px-3 py-2.5 text-center">
                          {u.platforms.includes('coupangeats') && (
                            <Link href={'/admin/coupang/' + u.user_id}
                              className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-1 rounded bg-[#FF4B30] text-white hover:bg-[#DC2626]">
                              쿠팡 <ExternalLink size={9} strokeWidth={2.5} />
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="p-3 md:p-4 rounded-2xl bg-white shadow-sm">
      <div className="text-[11px] md:text-xs font-bold text-[#8B95A1]">{label}</div>
      <div className="text-xl md:text-2xl font-black tabular-nums" style={{ color }}>{value}</div>
    </div>
  )
}

function FilterChips({ label, Icon, color, value, onChange, options, labelMap }: {
  label: string
  Icon: any
  color: string
  value: string
  onChange: (v: string) => void
  options: Record<string, number>
  labelMap?: Record<string, string>
}) {
  const entries = Object.entries(options).sort((a, b) => b[1] - a[1])
  if (entries.length === 0) return null
  return (
    <div className="bg-white rounded-2xl shadow-sm p-2.5">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon size={13} className="flex-shrink-0" style={{ color }} strokeWidth={2.5} />
        <span className="text-[11px] md:text-xs font-bold text-[#191F28]">{label}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        <button onClick={() => onChange('all')}
          className={'text-[10px] md:text-[11px] font-bold px-2 py-1 rounded ' +
            (value === 'all' ? 'bg-[#191F28] text-white' : 'bg-[#F2F4F6] text-[#4E5968]')}>
          전체
        </button>
        {entries.map(([k, v]) => (
          <button key={k} onClick={() => onChange(k)}
            className={'text-[10px] md:text-[11px] font-bold px-2 py-1 rounded ' +
              (value === k ? 'text-white' : 'bg-[#FAFBFF] border')}
            style={value === k
              ? { background: color }
              : { borderColor: color + '40', color }}>
            {labelMap?.[k] || k} ({v})
          </button>
        ))}
      </div>
    </div>
  )
}

function UserCard({ u }: { u: UserRow }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-3.5">
      <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-[#191F28] truncate" title={u.email || ''}>{u.email || '-'}</div>
          <div className="text-[10px] text-[#8B95A1] font-mono">
            {u.user_id.slice(0, 8)} {u.provider && '· ' + u.provider} · 가입 {fmtDate(u.signed_up_at)}
          </div>
        </div>
        {u.platforms.includes('coupangeats') && (
          <Link href={'/admin/coupang/' + u.user_id}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#FF4B30] text-white text-[10px] font-bold flex-shrink-0">
            쿠팡 상세 <ExternalLink size={10} strokeWidth={2.5} />
          </Link>
        )}
      </div>

      {u.primary_store ? (
        <div className="mb-2 p-2.5 rounded-xl bg-[#FAFBFF]">
          <div className="flex items-center gap-1.5 text-sm font-bold text-[#191F28] mb-1">
            <Store size={13} className="text-[#8B95A1]" strokeWidth={2.5} />
            <span className="truncate">{u.primary_store.name}</span>
            {u.store_count > 1 && <span className="text-[10px] text-[#7C3AED]">+{u.store_count - 1}개</span>}
          </div>
          {u.primary_store.address && (
            <div className="text-[11px] text-[#4E5968] flex items-start gap-1">
              <MapPin size={11} className="text-[#F59E0B] flex-shrink-0 mt-0.5" strokeWidth={2.5} />
              <span className="break-words">{u.primary_store.address}</span>
            </div>
          )}
          <div className="mt-1 flex items-center gap-2 text-[11px] flex-wrap">
            {u.category && <span className="text-[#7C3AED] font-bold">{u.category}</span>}
            {u.region && <span className="text-[#F59E0B] font-bold">· {u.region}</span>}
            {u.primary_store.phone && <span className="text-[#8B95A1] font-mono">{u.primary_store.phone}</span>}
          </div>
        </div>
      ) : (
        <div className="mb-2 p-2 rounded-xl bg-[#FFFBEB] text-[11px] text-[#92400E]">매장 미등록</div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex flex-wrap gap-1">
          {u.platforms.map(p => (
            <span key={p} className="text-[10px] font-black px-1.5 py-0.5 rounded"
              style={{ background: PLATFORM_COLOR[p] || '#6B7280', color: p === 'kakao_map' ? '#191F28' : '#fff' }}>
              {PLATFORM_LABEL[p] || p}
            </span>
          ))}
          {u.platforms.length === 0 && <span className="text-[10px] text-[#B0B8C1]">연동 없음</span>}
        </div>
        <div className="flex items-center gap-1.5 text-[11px]">
          <Star size={11} className="text-[#F59E0B]" fill="currentColor" strokeWidth={0} />
          <span className="font-bold tabular-nums" style={{ color: u.review_count > 0 ? '#191F28' : '#B0B8C1' }}>
            {u.review_count} 리뷰
          </span>
        </div>
      </div>
    </div>
  )
}

function SkeletonCards() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl p-4 animate-pulse space-y-2">
          <div className="h-4 bg-[#F2F4F6] rounded w-32" />
          <div className="h-3 bg-[#F2F4F6] rounded w-48" />
          <div className="h-3 bg-[#F2F4F6] rounded w-24" />
        </div>
      ))}
    </>
  )
}

function EmptyState() {
  return (
    <div className="bg-white rounded-2xl p-8 text-center text-sm text-[#8B95A1]">
      조건에 맞는 사용자가 없습니다
    </div>
  )
}
