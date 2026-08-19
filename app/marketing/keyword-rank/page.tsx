'use client'

// app/marketing/keyword-rank/page.tsx
// ============================================================
// 플레이스 모니터링 — 매장별 키워드 순위 카드 그리드
//
// 2026-08-04 (AdRank 벤치마킹 P1):
//   기존 페이지는 100% 목업이었다 (ROW_TEMPLATES 하드코딩, API 호출 0개).
//   P0 에서 만든 순위 파이프라인에 연결해 실데이터로 전환한다.
//
//   · GET  /api/place/targets            매장 목록
//   · GET  /api/place/keywords           추적 키워드 (+ 최신 순위·점수)
//   · GET  /api/place/keyword-history    7일 시계열 (매장 단위로 한 번에)
//   · POST /api/place/keywords           키워드 추가
//   · POST /api/place/keyword-rank       즉시 재측정
//   · DELETE /api/place/keywords         키워드 삭제
//
// 순위는 매일 KST 06:00 크론(place-rank-daily)이 자동 수집한다.
// ============================================================

import { useState, useCallback, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Sidebar from '../../components/Sidebar'
import PageHeader from '../../components/PageHeader'
import Footer from '../../components/Footer'
import {
  TrendingUp,
  Search,
  RefreshCw,
  Plus,
  X,
  ExternalLink,
  Store,
  MapPin,
  Info,
  Trophy,
} from 'lucide-react'
import { rankTierOf, RANK_TIER_STYLE } from '../../lib/place-score'
import { Delta, EmptyState, IconBadge } from '../../components/ui'

// ─────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────
type Target = {
  id: string
  place_id: string
  name: string
  category_name: string | null
  road_address: string | null
  thumbnail_url: string | null
  last_visitor_review: number | null
  last_blog_review: number | null
  last_rating: number | null
}

type KeywordLatest = {
  rank: number | null
  total: number | null
  score: number | null
  visitor_review_count: number | null
  blog_review_count: number | null
  method: string | null
  ts: string
}

type KeywordTarget = {
  id: string
  target_id: string
  keyword: string
  enabled: boolean
  last_rank: number | null
  last_score: number | null
  last_checked_at: string | null
  latest: KeywordLatest | null
}

type HistoryRow = {
  id: number
  keyword_target_id: string
  keyword: string
  rank: number | null
  total: number | null
  score: number | null
  visitor_review_count: number | null
  blog_review_count: number | null
  ts: string
}

// ─────────────────────────────────────────────
// 포맷 헬퍼
// ─────────────────────────────────────────────
function fmtDate(iso: string): string {
  const d = new Date(iso)
  const yy = String(d.getFullYear()).slice(2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}.${mm}.${dd}`
}

function fmtNum(n: number | null | undefined): string {
  if (n == null) return '-'
  return n.toLocaleString('ko-KR')
}

function fmtRelative(iso: string | null): string {
  if (!iso) return '수집 전'
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '방금'
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  return `${Math.floor(hr / 24)}일 전`
}

// ─────────────────────────────────────────────
// 순위 배지 / 변동 표시
// ─────────────────────────────────────────────
function RankBadge({ rank }: { rank: number | null }) {
  const tier = rankTierOf(rank)
  const style = RANK_TIER_STYLE[tier]
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold whitespace-nowrap tabular-nums"
      style={{ background: style.bg, color: style.text }}
    >
      {rank == null ? '미노출' : `${rank}위`}
    </span>
  )
}

/**
 * 순위 변동.
 * 순위는 "숫자가 줄어야 좋은" 지표라 Delta 에 invert 를 준다.
 * (이 판단을 화면마다 따로 하면 색이 반대로 나오는 사고가 난다 —
 *  DESIGN_SYSTEM.md 3-1 참조)
 */
function RankDelta({ curr, prev }: { curr: number | null; prev: number | null | undefined }) {
  return <Delta curr={curr} prev={prev} invert />
}

// ─────────────────────────────────────────────
// 매장 카드
// ─────────────────────────────────────────────
function StoreCard({
  target,
  keywords,
  history,
  loadingHistory,
  onAddKeyword,
  onRemoveKeyword,
  onRefreshKeyword,
  refreshingId,
  addingTargetId,
}: {
  target: Target
  keywords: KeywordTarget[]
  history: HistoryRow[]
  loadingHistory: boolean
  onAddKeyword: (targetId: string, keyword: string) => Promise<void>
  onRemoveKeyword: (keywordTargetId: string) => Promise<void>
  onRefreshKeyword: (keywordTargetId: string) => Promise<void>
  refreshingId: string | null
  addingTargetId: string | null
}) {
  const [selectedKtId, setSelectedKtId] = useState<string | null>(null)
  const [newKeyword, setNewKeyword] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  // 선택된 키워드가 없으면 첫 번째로 기본 선택
  const activeKtId = selectedKtId && keywords.some(k => k.id === selectedKtId)
    ? selectedKtId
    : (keywords[0]?.id ?? null)

  const activeKeyword = keywords.find(k => k.id === activeKtId) ?? null

  // 선택된 키워드의 7일 이력 (최신이 위로 오도록 내림차순)
  const rows = useMemo(() => {
    if (!activeKtId) return []
    return history
      .filter(h => h.keyword_target_id === activeKtId)
      .slice()
      .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
      .slice(0, 7)
  }, [history, activeKtId])

  const placeUrl = `https://m.place.naver.com/restaurant/${target.place_id}/home`

  async function handleAdd() {
    const kw = newKeyword.trim()
    if (kw.length < 2) return
    await onAddKeyword(target.id, kw)
    setNewKeyword('')
    setShowAdd(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E5E8EB] shadow-sm overflow-hidden">
      {/* 카드 헤더 — 매장 정보 */}
      <div className="flex items-start gap-3 p-4 border-b border-[#F2F4F6]">
        {target.thumbnail_url ? (
          <img
            src={target.thumbnail_url}
            alt={target.name}
            className="w-11 h-11 rounded-xl object-cover flex-shrink-0 border border-[#F2F4F6]"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <IconBadge icon={Store} tone="primary" size="lg" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-bold text-[#191F28] text-[15px] truncate">{target.name}</h3>
            <a
              href={placeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#8B95A1] hover:text-[#3182F6] flex-shrink-0"
              title="네이버 플레이스에서 열기"
            >
              <ExternalLink size={13} strokeWidth={2.5} />
            </a>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#8B95A1]">
            {target.category_name && <span>{target.category_name}</span>}
            {target.road_address && (
              <span className="flex items-center gap-0.5 truncate">
                <MapPin size={10} strokeWidth={2.5} />
                {target.road_address}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-[11px]">
            <span className="text-[#4E5968]">
              블로그 <strong className="text-[#191F28] tabular-nums">{fmtNum(target.last_blog_review)}</strong>
            </span>
            <span className="text-[#4E5968]">
              방문자 <strong className="text-[#191F28] tabular-nums">{fmtNum(target.last_visitor_review)}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 키워드 칩 */}
      <div className="px-4 py-3 border-b border-[#F2F4F6]">
        <div className="flex items-center gap-1.5 flex-wrap">
          {keywords.map(k => {
            const active = k.id === activeKtId
            return (
              <button
                key={k.id}
                onClick={() => setSelectedKtId(k.id)}
                className={
                  'group inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ' +
                  (active
                    ? 'border-[#3182F6] bg-[#EFF6FF] text-[#3182F6]'
                    : 'border-[#E5E8EB] bg-white text-[#4E5968] hover:border-[#3182F6] hover:text-[#3182F6]')
                }
              >
                {k.keyword}
                {k.last_rank != null && (
                  <span className="text-[10px] font-bold opacity-70">{k.last_rank}위</span>
                )}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={e => {
                    e.stopPropagation()
                    if (confirm(`"${k.keyword}" 키워드 추적을 중단할까요?\n\n지금까지 쌓인 순위 기록도 함께 삭제됩니다.`)) {
                      onRemoveKeyword(k.id)
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.stopPropagation()
                      onRemoveKeyword(k.id)
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 text-[#8B95A1] hover:text-[#DC2626] transition-opacity cursor-pointer"
                  title="키워드 삭제"
                >
                  <X size={11} strokeWidth={3} />
                </span>
              </button>
            )
          })}

          {showAdd ? (
            <div className="inline-flex items-center gap-1">
              <input
                autoFocus
                value={newKeyword}
                onChange={e => setNewKeyword(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAdd()
                  if (e.key === 'Escape') { setShowAdd(false); setNewKeyword('') }
                }}
                placeholder="예: 부천 가발"
                maxLength={40}
                className="w-32 text-xs border border-[#3182F6] rounded-lg px-2 py-1 focus:outline-none"
              />
              <button
                onClick={handleAdd}
                disabled={newKeyword.trim().length < 2 || addingTargetId === target.id}
                className="px-2 py-1 rounded-lg bg-[#3182F6] text-white text-xs font-bold disabled:opacity-40"
              >
                {addingTargetId === target.id ? '추가 중' : '추가'}
              </button>
              <button
                onClick={() => { setShowAdd(false); setNewKeyword('') }}
                className="px-1.5 py-1 rounded-lg text-[#8B95A1] hover:bg-[#F2F4F6]"
              >
                <X size={12} strokeWidth={3} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border border-dashed border-[#C3CAD1] text-[#8B95A1] hover:border-[#3182F6] hover:text-[#3182F6] transition-colors"
            >
              <Plus size={11} strokeWidth={3} />
              키워드
            </button>
          )}
        </div>
      </div>

      {/* 7일 순위 표 */}
      {keywords.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-[13px] text-[#8B95A1] leading-relaxed">
            추적할 키워드를 등록해주세요.
            <br />
            매일 새벽 6시에 순위가 자동으로 기록됩니다.
          </p>
        </div>
      ) : loadingHistory ? (
        <div className="px-4 py-8 text-center text-[13px] text-[#8B95A1]">불러오는 중…</div>
      ) : rows.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <p className="text-[13px] text-[#8B95A1] leading-relaxed mb-3">
            아직 수집된 기록이 없어요.
            <br />
            지금 바로 측정해보거나, 내일 새벽 자동 수집을 기다려주세요.
          </p>
          {activeKtId && (
            <button
              onClick={() => onRefreshKeyword(activeKtId)}
              disabled={refreshingId === activeKtId}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#3182F6] text-white text-xs font-bold disabled:opacity-50"
            >
              <RefreshCw size={12} strokeWidth={3} className={refreshingId === activeKtId ? 'animate-spin' : ''} />
              {refreshingId === activeKtId ? '측정 중…' : '지금 측정하기'}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-[#FAFBFC] text-[#8B95A1]">
                  <th className="text-left font-semibold px-4 py-2">일자</th>
                  <th className="text-center font-semibold px-2 py-2">순위</th>
                  <th className="text-right font-semibold px-2 py-2">블로그</th>
                  <th className="text-right font-semibold px-2 py-2">방문자</th>
                  <th className="text-right font-semibold px-4 py-2">점수</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  // rows 는 최신순 — 다음 인덱스가 하루 전
                  const prev = rows[i + 1]?.rank
                  return (
                    <tr key={r.id} className="border-t border-[#F2F4F6]">
                      <td className="px-4 py-2 text-[#4E5968] whitespace-nowrap tabular-nums">{fmtDate(r.ts)}</td>
                      <td className="px-2 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <RankBadge rank={r.rank} />
                          <RankDelta curr={r.rank} prev={prev} />
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right text-[#4E5968] tabular-nums">{fmtNum(r.blog_review_count)}</td>
                      <td className="px-2 py-2 text-right text-[#4E5968] tabular-nums">{fmtNum(r.visitor_review_count)}</td>
                      <td className="px-4 py-2 text-right font-bold text-[#191F28] tabular-nums">
                        {r.score == null ? '-' : r.score.toFixed(1)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* 카드 푸터 — 최근 수집 시각 + 즉시 측정 */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#FAFBFC] border-t border-[#F2F4F6]">
            <span className="text-[11px] text-[#8B95A1]">
              최근 수집 {fmtRelative(activeKeyword?.last_checked_at ?? null)}
            </span>
            {activeKtId && (
              <button
                onClick={() => onRefreshKeyword(activeKtId)}
                disabled={refreshingId === activeKtId}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#3182F6] hover:text-[#1B64DA] disabled:opacity-50"
              >
                <RefreshCw size={11} strokeWidth={3} className={refreshingId === activeKtId ? 'animate-spin' : ''} />
                {refreshingId === activeKtId ? '측정 중' : '새로고침'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// 페이지
// ─────────────────────────────────────────────
export default function PlaceMonitoringPage() {
  const [targets, setTargets] = useState<Target[]>([])
  const [keywords, setKeywords] = useState<KeywordTarget[]>([])
  const [historyByTarget, setHistoryByTarget] = useState<Record<string, HistoryRow[]>>({})
  const [loadingHistoryFor, setLoadingHistoryFor] = useState<Set<string>>(new Set())

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [refreshingId, setRefreshingId] = useState<string | null>(null)
  const [addingTargetId, setAddingTargetId] = useState<string | null>(null)
  const [keywordLimit, setKeywordLimit] = useState(50)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  // ── 초기 로드 ────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [tRes, kRes] = await Promise.all([
        fetch('/api/place/targets', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/place/keywords', { credentials: 'include', cache: 'no-store' }),
      ])

      if (tRes.status === 401 || kRes.status === 401) {
        setError('로그인이 필요해요. 다시 로그인한 뒤 이용해주세요.')
        return
      }

      const tData = await tRes.json()
      const kData = await kRes.json()

      setTargets(Array.isArray(tData?.targets) ? tData.targets : [])
      if (kData?.ok) {
        setKeywords(Array.isArray(kData.keywords) ? kData.keywords : [])
        if (kData.limit) setKeywordLimit(kData.limit)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // ── 매장별 7일 이력 로드 (키워드가 있는 매장만) ─
  const loadHistory = useCallback(async (targetId: string) => {
    setLoadingHistoryFor(prev => new Set(prev).add(targetId))
    try {
      const res = await fetch(
        `/api/place/keyword-history?target_id=${encodeURIComponent(targetId)}&days=7`,
        { credentials: 'include', cache: 'no-store' },
      )
      const data = await res.json()
      if (data?.ok) {
        setHistoryByTarget(prev => ({ ...prev, [targetId]: data.rows ?? [] }))
      }
    } catch {
      /* 이력 로드 실패는 카드 단위로 격리 — 전체 화면은 유지 */
    } finally {
      setLoadingHistoryFor(prev => {
        const next = new Set(prev)
        next.delete(targetId)
        return next
      })
    }
  }, [])

  // 키워드가 있는 매장의 이력을 자동 로드
  useEffect(() => {
    const withKeywords = Array.from(new Set(keywords.map(k => k.target_id)))
    for (const tid of withKeywords) {
      if (historyByTarget[tid] === undefined && !loadingHistoryFor.has(tid)) {
        loadHistory(tid)
      }
    }
    // historyByTarget 을 의존성에 넣으면 매 로드마다 재실행되므로 keywords 만 추적
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keywords, loadHistory])

  // ── 키워드 추가 ──────────────────────────────
  const handleAddKeyword = useCallback(async (targetId: string, keyword: string) => {
    setAddingTargetId(targetId)
    try {
      const res = await fetch('/api/place/keywords', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_id: targetId, keyword }),
      })
      const data = await res.json()
      if (!data?.ok) {
        showToast(data?.error || '키워드를 추가하지 못했어요')
        return
      }
      await loadAll()
      showToast(`"${keyword}" 추적을 시작했어요. 지금 측정하거나 내일 새벽 자동 수집을 기다리시면 돼요.`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : '키워드 추가 실패')
    } finally {
      setAddingTargetId(null)
    }
  }, [loadAll])

  // ── 키워드 삭제 ──────────────────────────────
  const handleRemoveKeyword = useCallback(async (keywordTargetId: string) => {
    try {
      const res = await fetch(`/api/place/keywords?id=${encodeURIComponent(keywordTargetId)}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json()
      if (!data?.ok) {
        showToast(data?.error || '삭제하지 못했어요')
        return
      }
      await loadAll()
    } catch (e) {
      showToast(e instanceof Error ? e.message : '삭제 실패')
    }
  }, [loadAll])

  // ── 즉시 재측정 ──────────────────────────────
  const handleRefreshKeyword = useCallback(async (keywordTargetId: string) => {
    setRefreshingId(keywordTargetId)
    try {
      const res = await fetch('/api/place/keyword-rank', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword_target_id: keywordTargetId }),
      })
      const data = await res.json()

      if (!data?.ok) {
        showToast(data?.error || '순위를 가져오지 못했어요')
        return
      }

      const rankText = data.rank == null ? '미노출' : `${data.rank}위`
      showToast(`측정 완료 — ${data.keyword} ${rankText} (점수 ${data.score ?? '-'})`)

      // 해당 매장 이력 갱신
      const kt = keywords.find(k => k.id === keywordTargetId)
      if (kt) {
        setHistoryByTarget(prev => {
          const next = { ...prev }
          delete next[kt.target_id]
          return next
        })
        await loadHistory(kt.target_id)
      }
      await loadAll()
    } catch (e) {
      showToast(e instanceof Error ? e.message : '측정 실패')
    } finally {
      setRefreshingId(null)
    }
  }, [keywords, loadAll, loadHistory])

  // ── 검색 필터 ────────────────────────────────
  const filteredTargets = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return targets
    return targets.filter(t => {
      if (t.name?.toLowerCase().includes(q)) return true
      return keywords.some(k => k.target_id === t.id && k.keyword.toLowerCase().includes(q))
    })
  }, [targets, keywords, search])

  const keywordCount = keywords.length
  const trackedCount = useMemo(
    () => keywords.filter(k => k.last_rank != null && k.last_rank <= 10).length,
    [keywords],
  )

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Sidebar />
      <div className="md:ml-[220px] flex flex-col min-h-screen">
        <PageHeader
          icon={<TrendingUp size={28} className="text-white" strokeWidth={2.5} />}
          title="플레이스 모니터링"
          subtitle="등록한 매장의 키워드 순위를 매일 새벽 자동으로 추적해요"
          variant="sky"
        />

        {/* 상단 바 */}
        <div className="bg-white border-b border-[#E5E8EB] px-4 md:px-6 py-3 sticky top-0 z-20">
          <div className="max-w-6xl mx-auto flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <Search
                size={14}
                strokeWidth={2.5}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B95A1]"
              />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="매장명 · 키워드로 검색"
                className="w-full text-sm border border-[#E5E8EB] rounded-xl pl-9 pr-3 py-2 bg-white text-[#191F28] focus:outline-none focus:border-[#3182F6]"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1.5 rounded-lg bg-[#F2F4F6] text-[#4E5968] font-semibold whitespace-nowrap">
                키워드 {keywordCount} / {keywordLimit}
              </span>
              <span className="px-2.5 py-1.5 rounded-lg bg-[#EFF6FF] text-[#3182F6] font-semibold whitespace-nowrap inline-flex items-center gap-1">
                <Trophy size={11} strokeWidth={3} />
                10위 이내 {trackedCount}
              </span>
            </div>

            <button
              onClick={() => {
                setHistoryByTarget({})
                loadAll()
              }}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E5E8EB] bg-white text-[#4E5968] text-xs font-bold hover:border-[#3182F6] hover:text-[#3182F6] disabled:opacity-50"
            >
              <RefreshCw size={12} strokeWidth={3} className={loading ? 'animate-spin' : ''} />
              새로고침
            </button>
          </div>
        </div>

        <main className="flex-1 px-4 md:px-6 py-5 max-w-6xl mx-auto w-full">
          {/* 안내 배너 */}
          <div className="mb-4 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] px-4 py-3 flex items-start gap-2.5">
            <Info size={15} strokeWidth={2.5} className="text-[#3182F6] flex-shrink-0 mt-0.5" />
            <p className="text-[12px] text-[#1E40AF] leading-relaxed">
              키워드를 등록하면 <strong>매일 새벽 6시</strong>에 네이버 플레이스 순위가 자동으로 기록돼요.
              기록이 쌓일수록 순위 추이와 점수 변화를 정확하게 볼 수 있어요.
              지금 당장 확인하고 싶으면 카드의 <strong>새로고침</strong>을 눌러주세요.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-4 py-3 text-[13px] text-[#DC2626]">
              {error}
            </div>
          )}

          {loading ? (
            <div className="rounded-2xl bg-white border border-[#E5E8EB] p-12 text-center text-[#8B95A1] text-sm">
              불러오는 중…
            </div>
          ) : targets.length === 0 ? (
            /* 매장 자체가 없음 */
            <div className="rounded-2xl bg-white border border-[#E5E8EB] shadow-sm">
              <EmptyState
                icon={Store}
                title="먼저 매장을 등록해주세요"
                description={
                  <>
                    네이버 플레이스 URL 만 붙여넣으면 등록돼요.
                    <br />
                    등록하면 이 화면에서 키워드별 순위를 매일 자동으로 추적해요.
                  </>
                }
                action={
                  <Link
                    href="/marketing/place"
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#3182F6] text-white text-sm font-bold hover:bg-[#1B64DA]"
                  >
                    <Plus size={14} strokeWidth={3} />
                    매장 등록하러 가기
                  </Link>
                }
              />
            </div>
          ) : filteredTargets.length === 0 ? (
            <div className="rounded-2xl bg-white border border-[#E5E8EB] shadow-sm">
              <EmptyState
                icon={Search}
                tone="neutral"
                title="검색 결과가 없어요"
                description="매장명이나 키워드를 다시 확인해주세요."
                compact
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredTargets.map(t => (
                <StoreCard
                  key={t.id}
                  target={t}
                  keywords={keywords.filter(k => k.target_id === t.id)}
                  history={historyByTarget[t.id] ?? []}
                  loadingHistory={loadingHistoryFor.has(t.id)}
                  onAddKeyword={handleAddKeyword}
                  onRemoveKeyword={handleRemoveKeyword}
                  onRefreshKeyword={handleRefreshKeyword}
                  refreshingId={refreshingId}
                  addingTargetId={addingTargetId}
                />
              ))}
            </div>
          )}

          {/* 하단 설명 */}
          {targets.length > 0 && (
            <div className="mt-6 rounded-2xl bg-white border border-[#E5E8EB] p-5">
              <h4 className="font-bold text-[#191F28] text-sm mb-2.5">순위와 점수는 이렇게 계산돼요</h4>
              <ul className="space-y-1.5 text-[12px] text-[#4E5968] leading-relaxed">
                <li>
                  1) <strong>순위</strong> — 네이버 플레이스에서 해당 키워드로 검색했을 때 내 매장이 몇 번째로
                  나오는지. 100위까지 확인하고, 그 안에 없으면 미노출로 표시돼요.
                </li>
                <li>
                  2) <strong>점수</strong> — 순위 40% · 블로그 리뷰 25% · 방문자 리뷰 25% · 평점 10% 를
                  합쳐 100점 만점으로 환산한 값이에요. 리뷰는 로그 스케일이라 대형 매장이 만점을 독식하지
                  않아요.
                </li>
                <li>
                  3) <strong>변동</strong> — 전날 대비 순위 변화예요. 숫자가 줄면 상승(초록), 늘면
                  하락(빨강)으로 표시돼요.
                </li>
              </ul>
            </div>
          )}
        </main>

        <Footer />
      </div>

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl bg-[#191F28] text-white text-[13px] font-medium shadow-lg max-w-[90vw]">
          {toast}
        </div>
      )}
    </div>
  )
}
