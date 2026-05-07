'use client'
// ============================================================
// 관리자 — 사용자별 쿠팡이츠 상세 (사장님 화면 동일 시야 + 관리 액션)
// /admin/coupang/[userId]
//   · 매장별 리뷰 카운트 / 미답변 / 마지막 수집
//   · 최근 50개 리뷰 목록 (storeId 별 필터)
//   · 매장 추가/수정/삭제
//   · 매장별 fetch / 재로그인 / 테스트
//   · 사장님 비번 없이 모두 작동
// ============================================================

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  RefreshCw, ArrowLeft, Star, Store, MessageSquare,
  Edit2, Trash2, Camera,
} from 'lucide-react'

type StoreStat = {
  id: string
  name: string | null
  review_count: number
  unreplied: number
  last_collected_at: string | null
  last_review_posted_at: string | null
}

type Review = {
  id: string
  platform_review_id: string
  store_id: string
  author: string
  rating: number | null
  content: string
  has_photos: boolean
  posted_at: string | null
  collected_at: string | null
  has_reply: boolean
  reply_status: string | null
  reply_preview: string | null
}

type Detail = {
  ok: boolean
  user_id: string
  account_id: string
  primary_store_id: string | null
  primary_store_name: string | null
  last_login_status: string | null
  last_login_at: string | null
  connected_at: string
  updated_at: string
  has_session_cookies: boolean
  session_cookie_count: number
  coupang_login_at: string | null
  coupang_login_method: string | null
  last_whoami_at: string | null
  stores: StoreStat[]
  total_reviews: number
  total_unreplied: number
  recent_reviews: Review[]
}

function fmtDate(iso: string | null): string {
  if (!iso) return '-'
  try { return new Date(iso).toLocaleString('ko-KR', { hour12: false }) } catch { return '-' }
}

function maskId(id: string): string {
  if (!id) return ''
  if (id.length <= 4) return id[0] + '*'.repeat(id.length - 1)
  return id.slice(0, 2) + '*'.repeat(id.length - 4) + id.slice(-2)
}

export default function CoupangUserDetailPage() {
  const params = useParams<{ userId: string }>()
  const router = useRouter()
  const urlUserId = params?.userId || ''
  // resolved user_id (storeId 로 들어온 경우 server 가 실제 user_id 로 변환)
  const [userId, setUserId] = useState(urlUserId)
  const [data, setData] = useState<Detail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterStore, setFilterStore] = useState<string>('all')
  const [actionResult, setActionResult] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const r = await fetch('/api/admin/coupang-user-detail?user_id=' + urlUserId, { cache: 'no-store' })
      const j = await r.json()
      if (!j.ok) { setError(j.error || 'failed'); return }
      setData(j)
      // 서버가 storeId → 실제 user_id 로 변환했으면 URL 갱신
      if (j.resolved_from && j.user_id && j.user_id !== urlUserId) {
        setUserId(j.user_id)
        router.replace('/admin/coupang/' + j.user_id)
      } else {
        setUserId(j.user_id || urlUserId)
      }
    } catch (e: any) { setError(e?.message || 'fetch error') }
    finally { setLoading(false) }
  }, [urlUserId, router])

  useEffect(() => { load() }, [load])

  // 매장 정보 갱신 (이름/추가/삭제 통합)
  const saveStores = useCallback(async (newMeta: Array<{ id: string; name: string }>) => {
    if (newMeta.length === 0) {
      if (!confirm('매장 0개 — 모든 매장을 삭제하시겠어요? 자동 fetch 가 멈춥니다.')) return
    }
    setBusy(true); setActionResult(null)
    try {
      const r = await fetch('/api/admin/set-coupang-stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          store_meta: newMeta,
          primary_store_id: newMeta[0]?.id || '',
        }),
      })
      const j = await r.json()
      setActionResult(j.ok ? j.message : '실패: ' + (j.error || ''))
      await load()
    } catch (e: any) { setActionResult('오류: ' + (e?.message || 'unknown')) }
    finally { setBusy(false) }
  }, [userId, load])

  const renameStore = useCallback((sid: string, currentName: string | null) => {
    const newName = prompt(`매장 ${sid} 의 새 이름?`, currentName || '')
    if (newName === null) return
    if (!data) return
    const newMeta = data.stores.map(s => ({
      id: s.id,
      name: s.id === sid ? newName.trim() : (s.name || ''),
    }))
    saveStores(newMeta)
  }, [data, saveStores])

  const removeStore = useCallback((sid: string) => {
    if (!data) return
    if (!confirm(`매장 ${sid} 을 제거하시겠어요?\n\n해당 매장의 리뷰는 그대로 유지되지만 더 이상 자동 fetch 안 됩니다.`)) return
    const newMeta = data.stores
      .filter(s => s.id !== sid)
      .map(s => ({ id: s.id, name: s.name || '' }))
    saveStores(newMeta)
  }, [data, saveStores])

  const addStore = useCallback(() => {
    const input = prompt(
      '추가할 매장 ID 또는 쿠팡이츠 URL\n\n' +
      '여러 개 가능 (한 줄씩 또는 쉼표로 구분):\n\n' +
      '예시:\n' +
      '950251\n' +
      'https://store.coupangeats.com/merchant/management/reviews/950254\n' +
      '779523, 824040\n\n' +
      '— URL 에서 매장 ID 자동 추출됩니다.\n' +
      '— 매장명은 추가 후 [이름] 버튼으로 편집하세요.'
    )
    if (!input) return
    if (!data) return

    // ID 또는 URL 에서 storeId 추출
    const tokens = input.split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
    const newIds: string[] = []
    for (const t of tokens) {
      const m = t.match(/(?:reviews|store|stores)\/(\d{4,})/) || t.match(/^(\d{4,})$/)
      if (m && m[1]) {
        const sid = m[1]
        if (!data.stores.find(s => s.id === sid) && !newIds.includes(sid)) {
          newIds.push(sid)
        }
      }
    }

    if (newIds.length === 0) {
      alert('숫자 매장 ID 를 추출하지 못했어요. 다시 확인해 주세요.')
      return
    }

    const ok = confirm(`${newIds.length}개 매장 추가:\n\n${newIds.join('\n')}\n\n추가하시겠어요? (이름은 비어있게 등록되며 나중에 편집 가능)`)
    if (!ok) return

    const newMeta = [
      ...data.stores.map(s => ({ id: s.id, name: s.name || '' })),
      ...newIds.map(id => ({ id, name: '' })),
    ]
    saveStores(newMeta)
  }, [data, saveStores])

  const fetchStore = useCallback(async (sid: string, days: number) => {
    if (!confirm(`매장 ${sid} ${days}일치 fetch?`)) return
    setBusy(true); setActionResult(null)
    try {
      // trigger-fetch 는 user 단위라 모든 매장 발사 — 단일 매장만 원하면 별도 endpoint 필요
      // 여기선 days 만 다르게 해서 trigger
      const r = await fetch(`/api/admin/trigger-fetch?platform=coupangeats&user_id=${userId}&days=${days}`, { cache: 'no-store' })
      const j = await r.json()
      setActionResult(j.ok ? j.message : '실패: ' + (j.error || ''))
      setTimeout(() => load(), 3000)
    } catch (e: any) { setActionResult('오류: ' + (e?.message || 'unknown')) }
    finally { setBusy(false) }
  }, [userId, load])

  const retryLogin = useCallback(async () => {
    if (!confirm('재로그인 시도? (저장된 비밀번호로 save-login 재실행)')) return
    setBusy(true); setActionResult(null)
    try {
      const r = await fetch('/api/admin/retry-coupang-login?user_id=' + userId, { cache: 'no-store' })
      const j = await r.json()
      setActionResult(j.ok ? `재로그인 성공 (${j.method}, 쿠키 ${j.cookie_count}개)` : `실패 [${j.step}]: ${j.error}`)
      setTimeout(() => load(), 2000)
    } catch (e: any) { setActionResult('오류: ' + (e?.message || 'unknown')) }
    finally { setBusy(false) }
  }, [userId, load])

  const impersonate = useCallback(async () => {
    if (!confirm('이 사용자로 임시 로그인 하시겠어요?\n\n사장님이 보는 화면 그대로 진단 가능합니다 (1시간).\n복귀: 화면 상단 빨간 배너의 [관리자로 복귀] 버튼')) return
    setBusy(true); setActionResult(null)
    try {
      const r = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
        credentials: 'include',
      })
      const j = await r.json()
      if (j.ok) {
        // 사장님 리뷰 페이지로 이동
        window.location.href = '/review-admin/coupang'
      } else {
        setActionResult('실패: ' + (j.error || ''))
      }
    } catch (e: any) { setActionResult('오류: ' + (e?.message || 'unknown')) }
    finally { setBusy(false) }
  }, [userId])

  const filteredReviews = data?.recent_reviews.filter(r => filterStore === 'all' || r.store_id === filterStore) || []

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6">
        {/* 헤더 */}
        <div className="mb-4 md:mb-6">
          <Link href="/admin/coupang-diagnostics"
            className="inline-flex items-center gap-1 text-xs md:text-sm text-[#3182F6] hover:underline mb-2">
            <ArrowLeft size={14} strokeWidth={2.5} />
            진단 페이지로
          </Link>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl md:text-2xl font-black text-[#191F28] flex items-center gap-2">
                <Store size={22} className="text-[#FF4B30] flex-shrink-0" strokeWidth={2.5} />
                쿠팡이츠 사용자 상세
              </h1>
              <p className="text-xs md:text-sm text-[#4E5968] mt-1 font-mono">
                {userId.slice(0, 8)}... · 계정 {data ? maskId(data.account_id) : '...'}
              </p>
            </div>
            <div className="flex gap-1.5 flex-shrink-0 flex-wrap">
              <button onClick={impersonate} disabled={busy}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F04452] text-white text-xs md:text-sm font-bold hover:bg-[#DC2626] disabled:opacity-50"
                title="이 사용자로 임시 로그인 — 사장님 화면 그대로 진단">
                이 사용자로 로그인
              </button>
              <button onClick={load} disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#3182F6] text-white text-xs md:text-sm font-bold hover:bg-[#1B64DA] disabled:opacity-50">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} strokeWidth={2.5} />
                새로고침
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 md:p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm">
            {error}
          </div>
        )}

        {actionResult && (
          <div className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs md:text-sm text-blue-900">
            {actionResult}
          </div>
        )}

        {data && (
          <>
            {/* 연결 상태 요약 */}
            <section className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
              <StatCard label="총 리뷰" value={data.total_reviews} color="#191F28" />
              <StatCard label="미답변" value={data.total_unreplied} color="#F04452" />
              <StatCard label="매장 수" value={data.stores.length} color="#7C3AED" />
              <StatCard label="쿠키" value={data.session_cookie_count} color={data.has_session_cookies ? '#059669' : '#DC2626'} />
            </section>

            {/* 로그인 상태 */}
            <section className="mb-4 p-3 md:p-4 rounded-2xl bg-white shadow-sm">
              <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                <h2 className="text-sm md:text-base font-bold text-[#191F28]">로그인 / 세션</h2>
                <button onClick={retryLogin} disabled={busy}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F04452] text-white text-[11px] md:text-xs font-bold hover:bg-[#DC2626] disabled:opacity-50">
                  재로그인 시도
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] md:text-xs">
                <InfoRow label="last_login_status" value={data.last_login_status || '-'} mono />
                <InfoRow label="last_login_at" value={fmtDate(data.last_login_at)} />
                <InfoRow label="coupang_login_at" value={fmtDate(data.coupang_login_at)} />
                <InfoRow label="login_method" value={data.coupang_login_method || '-'} mono />
                <InfoRow label="last_whoami_at" value={fmtDate(data.last_whoami_at)} />
                <InfoRow label="connected_at" value={fmtDate(data.connected_at)} />
              </div>
            </section>

            {/* 매장 관리 */}
            <section className="mb-4 p-3 md:p-4 rounded-2xl bg-white shadow-sm">
              <div className="flex items-start justify-between gap-2 mb-3 flex-wrap">
                <h2 className="text-sm md:text-base font-bold text-[#191F28] flex items-center gap-2">
                  <Store size={16} className="text-[#FF4B30]" strokeWidth={2.5} />
                  매장 ({data.stores.length}개)
                </h2>
                <button onClick={addStore} disabled={busy}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#059669] text-white text-[11px] md:text-xs font-bold hover:bg-[#047857] disabled:opacity-50">
                  + 매장 추가
                </button>
              </div>
              {data.stores.length === 0 ? (
                <p className="text-xs text-[#8B95A1]">등록된 매장 없음. 우상단 [+ 매장 추가] 또는 진단 페이지에서 [매장 발견] 시도.</p>
              ) : (
                <div className="space-y-2">
                  {data.stores.map((s, i) => (
                    <div key={s.id} className="border border-[#E5E8EB] rounded-xl p-3">
                      <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            {i === 0 && <span className="text-[10px] font-black text-white bg-[#F97316] px-1.5 py-0.5 rounded">main</span>}
                            <span className="text-sm font-bold text-[#191F28]">
                              {s.name || <span className="italic text-[#8B95A1]">매장명 미등록</span>}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#7C3AED] font-mono">매장 ID: {s.id}</div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => renameStore(s.id, s.name)} disabled={busy}
                            className="text-[10px] font-bold px-2 py-1 rounded bg-[#3182F6] text-white hover:bg-[#1B64DA] disabled:opacity-50">
                            <Edit2 size={11} className="inline mr-0.5" strokeWidth={2.5} />이름
                          </button>
                          <button onClick={() => removeStore(s.id)} disabled={busy}
                            className="text-[10px] font-bold px-2 py-1 rounded bg-[#DC2626] text-white hover:bg-[#B91C1C] disabled:opacity-50">
                            <Trash2 size={11} className="inline mr-0.5" strokeWidth={2.5} />제거
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] mb-2">
                        <div className="p-2 rounded-lg bg-[#FAFBFF]">
                          <div className="text-[#8B95A1] font-bold">리뷰</div>
                          <div className="text-base font-black tabular-nums" style={{ color: s.review_count > 0 ? '#191F28' : '#DC2626' }}>{s.review_count}</div>
                        </div>
                        <div className="p-2 rounded-lg bg-[#FFF1F0]">
                          <div className="text-[#8B95A1] font-bold">미답변</div>
                          <div className="text-base font-black text-[#F04452] tabular-nums">{s.unreplied}</div>
                        </div>
                        <div className="p-2 rounded-lg bg-[#FAFBFF]">
                          <div className="text-[#8B95A1] font-bold">최근 수집</div>
                          <div className="text-[10px] text-[#4E5968]">{fmtDate(s.last_collected_at)}</div>
                        </div>
                        <div className="p-2 rounded-lg bg-[#FAFBFF]">
                          <div className="text-[#8B95A1] font-bold">최근 리뷰</div>
                          <div className="text-[10px] text-[#4E5968]">{fmtDate(s.last_review_posted_at)}</div>
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        <button onClick={() => fetchStore(s.id, 14)} disabled={busy}
                          className="text-[10px] font-bold px-2 py-1 rounded bg-[#3182F6] text-white hover:bg-[#1B64DA] disabled:opacity-50">
                          14d fetch
                        </button>
                        <button onClick={() => fetchStore(s.id, 180)} disabled={busy}
                          className="text-[10px] font-bold px-2 py-1 rounded bg-[#7C3AED] text-white hover:bg-[#6D28D9] disabled:opacity-50">
                          180d fetch
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 최근 리뷰 */}
            <section className="mb-4 p-3 md:p-4 rounded-2xl bg-white shadow-sm">
              <div className="flex items-start justify-between gap-2 mb-3 flex-wrap">
                <h2 className="text-sm md:text-base font-bold text-[#191F28] flex items-center gap-2">
                  <MessageSquare size={16} className="text-[#3182F6]" strokeWidth={2.5} />
                  최근 리뷰 ({filteredReviews.length} / 전체 {data.recent_reviews.length})
                </h2>
                <div className="flex gap-1.5 flex-wrap">
                  <button onClick={() => setFilterStore('all')}
                    className={'text-[11px] md:text-xs font-bold px-2.5 py-1 rounded ' +
                      (filterStore === 'all' ? 'bg-[#191F28] text-white' : 'bg-[#F2F4F6] text-[#4E5968]')}>
                    전체
                  </button>
                  {data.stores.map(s => (
                    <button key={s.id} onClick={() => setFilterStore(s.id)}
                      className={'text-[11px] md:text-xs font-bold px-2.5 py-1 rounded ' +
                        (filterStore === s.id ? 'bg-[#7C3AED] text-white' : 'bg-[#F5F3FF] text-[#7C3AED]')}>
                      {s.name || s.id.slice(0, 6)}
                    </button>
                  ))}
                </div>
              </div>

              {filteredReviews.length === 0 ? (
                <p className="text-xs text-[#8B95A1] text-center py-6">
                  {data.recent_reviews.length === 0 ? '수집된 리뷰 없음 — 위에서 fetch 트리거 또는 재로그인 시도' : '필터 조건 매칭 없음'}
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredReviews.map(r => (
                    <div key={r.id} className="border border-[#F2F4F6] rounded-xl p-3 hover:bg-[#FAFBFF]">
                      <div className="flex items-start justify-between gap-2 mb-1 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-[#191F28]">{r.author}</span>
                          {r.rating !== null && (
                            <span className="inline-flex items-center gap-0.5 text-xs font-bold tabular-nums" style={{ color: r.rating <= 2 ? '#F04452' : r.rating <= 3 ? '#F59E0B' : '#191F28' }}>
                              <Star size={11} fill="currentColor" strokeWidth={0} />
                              {r.rating}
                            </span>
                          )}
                          {r.has_photos && <Camera size={11} className="text-[#8B95A1]" strokeWidth={2.5} />}
                          <span className="text-[10px] text-[#7C3AED] font-mono">{r.store_id}</span>
                        </div>
                        <div className="text-[10px] text-[#8B95A1] flex-shrink-0">
                          {fmtDate(r.posted_at)}
                        </div>
                      </div>
                      <p className="text-xs text-[#4E5968] leading-relaxed mb-1.5 break-words">{r.content || <span className="italic text-[#B0B8C1]">내용 없음</span>}</p>
                      {r.has_reply && r.reply_preview && (
                        <div className="mt-2 p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                          <div className="text-[10px] font-bold text-emerald-700 mb-0.5">사장님 답글</div>
                          <p className="text-[11px] text-emerald-900 leading-relaxed">{r.reply_preview}</p>
                        </div>
                      )}
                      {!r.has_reply && (
                        <div className="text-[10px] text-[#F04452] font-bold">미답변</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="mt-4 text-[10px] md:text-[11px] text-[#8B95A1] text-right">
              마지막 갱신: {fmtDate(data.updated_at)}
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

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-[#FAFBFF]">
      <span className="text-[#8B95A1] font-bold flex-shrink-0">{label}</span>
      <span className={'text-[#191F28] truncate ' + (mono ? 'font-mono' : '')} title={value}>{value}</span>
    </div>
  )
}
