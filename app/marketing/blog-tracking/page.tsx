'use client'
export const dynamic = 'force-dynamic'

/**
 * /marketing/blog-tracking — 블로그·체험단 글 네이버 순위 추적 (18차-2)
 *
 * 18차-1 에서 구축한 백엔드 연동:
 *   GET    /api/marketing/blog-tracking                 → { targets: [...] }
 *   POST   /api/marketing/blog-tracking                 → { target, checked? }
 *   DELETE /api/marketing/blog-tracking?id=<uuid>       → { ok }
 *   POST   /api/marketing/blog-tracking/check           → { mode, result/results }
 *   GET    /api/marketing/blog-tracking/history?target_id=<uuid>  → { target, history }
 *
 * 레이아웃: 기존 /marketing/blog-post 패턴 (Sidebar + ml-220 + PageHeader + Footer)
 */

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Sidebar from '../../components/Sidebar'
import PageHeader from '../../components/PageHeader'
import Footer from '../../components/Footer'
import {
  ArrowRight, TrendingUp, Plus, RefreshCw, Loader2, Trash2,
  ExternalLink, CheckCircle2, AlertCircle, Link as LinkIcon,
  Search, Eye, ChevronDown, ChevronUp, Clock, Activity,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// 타입 (API 응답과 1:1 매칭)
// ─────────────────────────────────────────────────────────────
type Section = 'popular_post' | 'blog_tab' | 'not_found' | string

type TargetRow = {
  target_id: string
  user_id: string
  label: string
  keyword: string
  target_url: string
  blog_id: string
  post_id: string
  tags: string[]
  active: boolean
  created_at: string
  latest_rank: number | null
  latest_section: Section | null
  latest_checked_at: string | null
  latest_total_found: number | null
}

type HistoryPoint = {
  id: number
  checked_at: string
  rank: number | null
  section: Section
  total_found: number | null
  note: string | null
  source?: string | null       // 'naver_mobile' | 'cron_daily' | ...
}

type CronStatus = {
  enabled:      boolean
  schedule:     string
  schedule_kst: string
  last_run_at:  string | null
  next_run_at:  string
  runs_last_7d: number
}

// ─────────────────────────────────────────────────────────────
// 순위 시각화 유틸
// ─────────────────────────────────────────────────────────────
function rankBadgeStyle(rank: number | null): { label: string; cls: string; desc: string } {
  if (rank === null) return {
    label: '미노출',
    cls:   'bg-[#F2F4F6] text-[#8B95A1] border-[#E5E8EB]',
    desc:  '아직 인기글에 잡히지 않음',
  }
  if (rank <= 3)  return { label: `${rank}위`, cls: 'bg-[#03C75A] text-white border-[#03C75A]',             desc: 'TOP3 — 최상위' }
  if (rank <= 10) return { label: `${rank}위`, cls: 'bg-[#E8F6EA] text-[#03C75A] border-[#C7E9CE]',         desc: 'TOP10 — 상위권' }
  if (rank <= 30) return { label: `${rank}위`, cls: 'bg-[#E8F1FE] text-[#3182F6] border-[#CFDFFC]',         desc: '중상위' }
  return           { label: `${rank}위`, cls: 'bg-[#FEF9E8] text-[#F5A623] border-[#FCEBC0]',               desc: '중하위' }
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '미조회'
  try {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1)   return '방금 전'
    if (diffMin < 60)  return `${diffMin}분 전`
    if (diffMin < 60*24) return `${Math.floor(diffMin / 60)}시간 전`
    return d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return iso }
}

function shortenUrl(url: string): string {
  try {
    const u = new URL(url)
    const path = u.pathname.replace(/\/$/, '')
    return `${u.hostname}${path.length > 28 ? path.slice(0, 28) + '…' : path}`
  } catch { return url.length > 44 ? url.slice(0, 44) + '…' : url }
}

// ─────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────────────────────
export default function BlogTrackingPage() {
  const [targets, setTargets]   = useState<TargetRow[]>([])
  const [cron, setCron]         = useState<CronStatus | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  // 등록 폼
  const [formOpen, setFormOpen]   = useState(false)
  const [fLabel, setFLabel]       = useState('')
  const [fKeyword, setFKeyword]   = useState('')
  const [fUrl, setFUrl]           = useState('')
  const [fMemo, setFMemo]         = useState('')
  const [fCheckNow, setFCheckNow] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // 일괄 체크
  const [bulkChecking, setBulkChecking] = useState(false)

  // 카드별 상태
  const [checkingIds, setCheckingIds] = useState<Set<string>>(new Set())
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [historyMap, setHistoryMap]   = useState<Record<string, HistoryPoint[]>>({})

  // ─── 데이터 로드 ───
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/marketing/blog-tracking', {
        cache: 'no-store', credentials: 'include',
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || `HTTP ${res.status}`)
      }
      const j = await res.json()
      setTargets(Array.isArray(j.targets) ? j.targets : [])
      setCron(j.cron ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오기 실패')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ─── 등록 ───
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!fLabel.trim() || !fKeyword.trim() || !fUrl.trim()) {
      setError('라벨, 키워드, 블로그 URL 모두 입력해주세요.')
      return
    }
    if (!/blog\.naver\.com\/[^/]+\/\d+/.test(fUrl)) {
      setError('URL 형식 오류 — blog.naver.com/{blogId}/{postId} 형태여야 합니다.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/marketing/blog-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          label:     fLabel.trim(),
          keyword:   fKeyword.trim(),
          target_url: fUrl.trim(),
          memo:      fMemo.trim() || undefined,
          check_now: fCheckNow,
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`)
      // 성공 → 폼 리셋 + 목록 재조회
      setFLabel(''); setFKeyword(''); setFUrl(''); setFMemo('')
      setFormOpen(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : '등록 실패')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── 삭제 ───
  async function handleDelete(id: string, label: string) {
    if (!confirm(`'${label}' 타겟을 삭제할까요?\n체크 이력도 함께 삭제됩니다.`)) return
    try {
      const res = await fetch(`/api/marketing/blog-tracking?id=${id}`, {
        method: 'DELETE', credentials: 'include',
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || `HTTP ${res.status}`)
      }
      setTargets(prev => prev.filter(t => t.target_id !== id))
    } catch (e) {
      alert(e instanceof Error ? e.message : '삭제 실패')
    }
  }

  // ─── 단건 체크 ───
  async function handleCheckOne(id: string) {
    setCheckingIds(prev => new Set(prev).add(id))
    try {
      const res = await fetch('/api/marketing/blog-tracking/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ target_id: id }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`)
      // 목록 갱신 + 펼쳐진 카드면 history 도 갱신
      await load()
      if (expandedIds.has(id)) await loadHistory(id, true)
    } catch (e) {
      alert(e instanceof Error ? e.message : '순위 조회 실패')
    } finally {
      setCheckingIds(prev => { const s = new Set(prev); s.delete(id); return s })
    }
  }

  // ─── 전체 체크 ───
  async function handleCheckAll() {
    if (!targets.length) return
    if (!confirm(`등록된 ${targets.length}개 타겟의 순위를 한번에 조회할까요?\n네이버 서버 부하 방지를 위해 각 건 사이에 300ms 간격이 있습니다.`)) return
    setBulkChecking(true)
    try {
      const res = await fetch('/api/marketing/blog-tracking/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ target_id: 'all' }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`)
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : '전체 순위 조회 실패')
    } finally {
      setBulkChecking(false)
    }
  }

  // ─── 히스토리 로드 ───
  async function loadHistory(id: string, force = false) {
    if (!force && historyMap[id]) return
    try {
      const res = await fetch(`/api/marketing/blog-tracking/history?target_id=${id}&limit=30`, {
        cache: 'no-store', credentials: 'include',
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`)
      setHistoryMap(prev => ({ ...prev, [id]: Array.isArray(j.history) ? j.history : [] }))
    } catch {
      /* 조용히 */
    }
  }

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const s = new Set(prev)
      if (s.has(id)) {
        s.delete(id)
      } else {
        s.add(id)
        loadHistory(id)
      }
      return s
    })
  }

  // ─────────────────────────────────────────────────────
  // 렌더
  // ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8F9FB] flex">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-[220px] pt-16 md:pt-0 min-w-0">
        <PageHeader
          icon="📈"
          title="블로그 순위 추적"
          subtitle="체험단·직접 쓴 블로그 글이 네이버 인기글 몇 위에 있는지 자동 추적"
          variant="emerald"
        />

        <div className="max-w-5xl mx-auto pt-6 pb-20 px-4 md:px-8">
          {/* 브레드크럼 */}
          <div className="flex items-center gap-2 text-xs text-[#8B95A1] mb-4">
            <Link href="/marketing" className="hover:text-[#191F28]">마케팅 관리</Link>
            <ArrowRight size={12} />
            <span className="text-[#3182F6] font-medium">블로그 순위 추적</span>
          </div>

          {/* 상단 타이틀 블록 */}
          <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#191F28] flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#3182F6] to-[#1B64DA] text-white">
                  <TrendingUp size={18} />
                </span>
                블로그 순위 추적
              </h1>
              <p className="text-sm text-[#4E5968] mt-1.5">
                체험단 글·블로그 포스팅 URL과 검색 키워드를 등록하면, <b>네이버 모바일 인기글 몇 위</b>인지 자동으로 체크합니다.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCheckAll}
                disabled={bulkChecking || !targets.length}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E5E8EB] bg-white text-sm font-semibold text-[#4E5968] hover:text-[#191F28] hover:border-[#3182F6] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {bulkChecking ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                전체 순위 갱신
              </button>
              <button
                onClick={() => setFormOpen(v => !v)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#3182F6] hover:bg-[#1B64DA] text-white text-sm font-semibold transition"
              >
                <Plus size={14} strokeWidth={2.5} />
                새 타겟 등록
              </button>
            </div>
          </div>

          {/* 자동 체크 상태 카드 (18차-3) */}
          {cron?.enabled && (
            <div className="bg-gradient-to-br from-[#0B1F3B] via-[#1B3B8A] to-[#3182F6] text-white rounded-2xl p-5 mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-[0_8px_32px_-8px_rgba(49,130,246,0.4)]">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0 relative">
                  <Activity size={20} className="text-white" />
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#03C75A] border-2 border-[#0B1F3B] animate-pulse" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-[#B4D2FF] font-semibold">
                    자동 순위 체크 작동 중
                  </div>
                  <div className="text-[15px] font-bold mt-0.5">
                    {cron.schedule_kst} · 네이버 인기글 자동 추적
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-[12px] flex-shrink-0">
                <div className="flex flex-col items-start sm:items-end">
                  <span className="text-[#B4D2FF]">마지막 자동 체크</span>
                  <span className="font-bold text-white">
                    {cron.last_run_at ? formatDateTime(cron.last_run_at) : '첫 실행 대기'}
                  </span>
                </div>
                <div className="w-px h-7 bg-white/20 hidden sm:block" />
                <div className="flex flex-col items-start sm:items-end">
                  <span className="text-[#B4D2FF]">다음 자동 체크</span>
                  <span className="font-bold text-white">
                    {new Date(cron.next_run_at).toLocaleString('ko-KR', {
                      month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="w-px h-7 bg-white/20 hidden sm:block" />
                <div className="flex flex-col items-start sm:items-end">
                  <span className="text-[#B4D2FF]">최근 7일 수집</span>
                  <span className="font-bold text-white">{cron.runs_last_7d}건</span>
                </div>
              </div>
            </div>
          )}

          {/* 안내 인포박스 */}
          <div className="bg-[#EFF6FF] border border-[#DBEAFE] rounded-2xl p-4 mb-6 flex gap-3">
            <Search size={18} className="text-[#3182F6] flex-shrink-0 mt-0.5" />
            <div className="text-[13px] text-[#1E40AF] leading-relaxed">
              <b>조회 기준</b>: 네이버 모바일 통합검색 <b>인기글</b> 영역에서 해당 블로그 글의 노출 순위를 찾습니다.
              블로그탭이나 PC 검색과 다를 수 있으며, 인기글에 잡히지 않으면 <b>미노출</b>로 기록됩니다.
              자동 체크는 <b>매일 오전 5시</b>에 진행되고, 수동으로 "전체 순위 갱신" 버튼을 눌러 즉시 확인할 수도 있습니다.
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mb-4 bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] rounded-xl p-3 text-sm flex items-start gap-2">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* 등록 폼 */}
          {formOpen && (
            <form
              onSubmit={handleCreate}
              className="bg-white border border-[#E5E8EB] rounded-2xl p-5 md:p-6 mb-6 shadow-sm"
            >
              <h3 className="text-base font-bold text-[#191F28] mb-4 flex items-center gap-2">
                <Plus size={16} className="text-[#3182F6]" />
                새 블로그 타겟 등록
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-semibold text-[#4E5968] mb-1.5">라벨 *</label>
                  <input
                    type="text"
                    value={fLabel}
                    onChange={e => setFLabel(e.target.value)}
                    placeholder="예) 4월 강남 식당 체험단 1번"
                    className="w-full px-3 py-2 border border-[#E5E8EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent"
                    maxLength={60}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#4E5968] mb-1.5">검색 키워드 *</label>
                  <input
                    type="text"
                    value={fKeyword}
                    onChange={e => setFKeyword(e.target.value)}
                    placeholder="예) 강남 맛집"
                    className="w-full px-3 py-2 border border-[#E5E8EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent"
                    maxLength={80}
                    required
                  />
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-xs font-semibold text-[#4E5968] mb-1.5">블로그 글 URL *</label>
                <input
                  type="url"
                  value={fUrl}
                  onChange={e => setFUrl(e.target.value)}
                  placeholder="https://blog.naver.com/blogId/postId"
                  className="w-full px-3 py-2 border border-[#E5E8EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent font-mono"
                  required
                />
                <p className="text-[11px] text-[#8B95A1] mt-1">
                  네이버 블로그 글 주소 — blog.naver.com/아이디/글번호 형태
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-[#4E5968] mb-1.5">메모 (선택)</label>
                <input
                  type="text"
                  value={fMemo}
                  onChange={e => setFMemo(e.target.value)}
                  placeholder="예) 체험단, 광고, 사장님 직접 작성"
                  className="w-full px-3 py-2 border border-[#E5E8EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent"
                  maxLength={120}
                />
              </div>
              <label className="flex items-center gap-2 mb-4 text-sm text-[#4E5968] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={fCheckNow}
                  onChange={e => setFCheckNow(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#3182F6]"
                />
                등록과 동시에 바로 1회 순위 체크
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#3182F6] hover:bg-[#1B64DA] text-white text-sm font-bold transition disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} strokeWidth={2.5} />}
                  {submitting ? '등록 중…' : '등록하기'}
                </button>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#E5E8EB] text-sm font-semibold text-[#4E5968] hover:bg-[#F2F4F6] transition"
                >
                  취소
                </button>
              </div>
            </form>
          )}

          {/* 타겟 목록 */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="bg-white border border-[#E5E8EB] rounded-2xl p-5 animate-pulse">
                  <div className="h-4 w-32 bg-[#F2F4F6] rounded mb-2" />
                  <div className="h-3 w-24 bg-[#F2F4F6] rounded mb-4" />
                  <div className="h-10 w-20 bg-[#F2F4F6] rounded" />
                </div>
              ))}
            </div>
          ) : targets.length === 0 ? (
            <EmptyState onCreate={() => setFormOpen(true)} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {targets.map(t => {
                const badge = rankBadgeStyle(t.latest_rank)
                const checking = checkingIds.has(t.target_id)
                const expanded = expandedIds.has(t.target_id)
                const history  = historyMap[t.target_id] ?? []

                return (
                  <div
                    key={t.target_id}
                    className="bg-white border border-[#E5E8EB] rounded-2xl p-5 hover:shadow-sm transition"
                  >
                    {/* 라벨 + 삭제 */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="text-[15px] font-bold text-[#191F28] break-keep line-clamp-2">
                        {t.label}
                      </h4>
                      <button
                        onClick={() => handleDelete(t.target_id, t.label)}
                        aria-label="삭제"
                        className="flex-shrink-0 w-7 h-7 rounded-lg text-[#8B95A1] hover:bg-[#FEF2F2] hover:text-[#DC2626] transition flex items-center justify-center"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* 키워드 */}
                    <div className="flex items-center gap-1 mb-3">
                      <Search size={12} className="text-[#8B95A1] flex-shrink-0" />
                      <span className="text-[12px] font-semibold text-[#4E5968] truncate">
                        {t.keyword}
                      </span>
                    </div>

                    {/* 순위 뱃지 + 세부 */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`inline-flex flex-col items-center justify-center min-w-[72px] py-2 px-3 rounded-xl border ${badge.cls}`}>
                        <span className="text-lg font-black leading-none">{badge.label}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] text-[#8B95A1] mb-0.5">{badge.desc}</div>
                        <div className="flex items-center gap-1 text-[11px] text-[#8B95A1]">
                          <Clock size={10} />
                          <span>{formatDateTime(t.latest_checked_at)}</span>
                        </div>
                      </div>
                    </div>

                    {/* URL */}
                    <a
                      href={t.target_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-[#3182F6] hover:underline mb-3 max-w-full truncate"
                    >
                      <LinkIcon size={10} />
                      <span className="truncate">{shortenUrl(t.target_url)}</span>
                      <ExternalLink size={10} className="flex-shrink-0" />
                    </a>

                    {/* 액션 */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCheckOne(t.target_id)}
                        disabled={checking || bulkChecking}
                        className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg bg-[#F2F4F6] hover:bg-[#E5E8EB] text-[#4E5968] text-[12px] font-semibold transition disabled:opacity-50"
                      >
                        {checking ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                        지금 확인
                      </button>
                      <button
                        onClick={() => toggleExpand(t.target_id)}
                        className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg bg-[#F2F4F6] hover:bg-[#E5E8EB] text-[#4E5968] text-[12px] font-semibold transition"
                      >
                        <Activity size={12} />
                        이력
                        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    </div>

                    {/* 이력 (펼치면) */}
                    {expanded && (
                      <div className="mt-4 pt-4 border-t border-[#E5E8EB]">
                        {history.length === 0 ? (
                          <div className="text-[11px] text-[#8B95A1] text-center py-4">
                            아직 체크 이력이 없습니다.
                          </div>
                        ) : (
                          <>
                            {/* 스파크라인 */}
                            <Sparkline history={history} />
                            {/* 최근 5건 리스트 */}
                            <div className="mt-3 space-y-1.5">
                              {history.slice(0, 5).map(h => {
                                const isCron = h.source === 'cron_daily'
                                return (
                                  <div key={h.id} className="flex items-center justify-between text-[11px] gap-2">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className={
                                        isCron
                                          ? 'px-1.5 py-0.5 rounded-md bg-[#E8F1FE] text-[#3182F6] font-bold text-[10px] border border-[#CFDFFC]'
                                          : 'px-1.5 py-0.5 rounded-md bg-[#F2F4F6] text-[#4E5968] font-bold text-[10px] border border-[#E5E8EB]'
                                      } title={isCron ? '자동 일일 체크' : '사용자 수동 체크'}>
                                        {isCron ? '자동' : '수동'}
                                      </span>
                                      <span className="text-[#8B95A1] truncate">{formatDateTime(h.checked_at)}</span>
                                    </div>
                                    <span className={`font-bold flex-shrink-0 ${h.rank === null ? 'text-[#8B95A1]' : 'text-[#191F28]'}`}>
                                      {h.rank === null ? '미노출' : `${h.rank}위`}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <Footer />
      </main>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// 빈 상태
// ─────────────────────────────────────────────────────────────
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="bg-white border border-[#E5E8EB] rounded-2xl p-10 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] text-[#3182F6] mx-auto flex items-center justify-center mb-4">
        <Eye size={24} />
      </div>
      <h3 className="text-base font-bold text-[#191F28] mb-1.5">
        추적 중인 블로그 글이 없습니다
      </h3>
      <p className="text-[13px] text-[#8B95A1] mb-5 leading-relaxed">
        체험단이 쓴 글이나 사장님이 직접 쓴 블로그 포스팅을 등록하면,<br />
        네이버 인기글에서 몇 위에 있는지 자동으로 확인해드려요.
      </p>
      <button
        onClick={onCreate}
        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#3182F6] hover:bg-[#1B64DA] text-white text-sm font-bold transition"
      >
        <Plus size={14} strokeWidth={2.5} />
        첫 타겟 등록하기
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// 스파크라인 (최근 20건, 미노출은 회색 점)
//   · 독립 SVG, recharts 불필요
// ─────────────────────────────────────────────────────────────
function Sparkline({ history }: { history: HistoryPoint[] }) {
  // 최신이 앞이므로 뒤집어서 시간순
  const data = [...history].reverse().slice(-20)
  if (data.length === 0) return null

  const W = 260
  const H = 60
  const PAD = 6
  // 순위 축: 1 (맨 위) → 50 (맨 아래). null 은 70 (아래 바깥)
  const maxR = 50
  const yOf = (r: number | null) => {
    if (r === null) return H - PAD  // 맨 아래
    const clamped = Math.min(r, maxR)
    return PAD + ((clamped - 1) / (maxR - 1)) * (H - PAD * 2)
  }
  const xOf = (i: number) =>
    data.length === 1 ? W / 2 : PAD + (i / (data.length - 1)) * (W - PAD * 2)

  const pts = data.map((d, i) => ({
    x: xOf(i),
    y: yOf(d.rank),
    rank: d.rank,
  }))
  const polyline = pts
    .filter(p => p.rank !== null)
    .map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ')

  return (
    <div className="bg-[#F8F9FB] rounded-xl p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-semibold text-[#8B95A1]">최근 순위 변화</span>
        <span className="text-[10px] text-[#8B95A1]">{data.length}회 체크</span>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block">
        {/* 10위 기준선 */}
        <line x1={PAD} x2={W - PAD} y1={yOf(10)} y2={yOf(10)} stroke="#CFDFFC" strokeDasharray="2 3" strokeWidth="1" />
        {/* 추이 선 */}
        {polyline && (
          <polyline points={polyline} fill="none" stroke="#3182F6" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        )}
        {/* 점 */}
        {pts.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={p.rank === null ? 2.5 : 3}
            fill={p.rank === null ? '#CBD5E1' : (p.rank <= 10 ? '#03C75A' : p.rank <= 30 ? '#3182F6' : '#F5A623')}
          />
        ))}
      </svg>
      <div className="flex items-center gap-3 mt-1 text-[9px] text-[#8B95A1]">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#03C75A]" /> TOP10</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#3182F6]" /> 11~30</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#F5A623]" /> 31~50</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#CBD5E1]" /> 미노출</span>
      </div>
    </div>
  )
}
