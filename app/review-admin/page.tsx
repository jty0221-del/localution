'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Sidebar from '../components/Sidebar'

const LS_LINKS = 'localution.platform_links'

// 플랫폼 설정
const PLATFORM_META: Record<string, { label: string; color: string; bg: string; textColor: string }> = {
  google: { label: '구글', color: '#4285F4', bg: '#EBF3FE', textColor: '#1A56B0' },
  naver:  { label: '네이버', color: '#03C75A', bg: '#E8FBF0', textColor: '#015C2C' },
}

interface LinkedPlatform {
  platform: string; placeId: string; name: string; rating: number | null; reviewCount: number
}

interface Review {
  id: string; platform: string; rating: number; author: string; date: string; text: string; replied: boolean
}

interface ReviewState extends Review {
  aiReply: string; editReply: string; aiLoading: boolean; aiDone: boolean; showEdit: boolean
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={`text-sm ${i <= rating ? 'text-yellow-400' : 'text-[#E5E8EB]'}`}>★</span>
      ))}
    </div>
  )
}

function PlatformBadge({ platform }: { platform: string }) {
  const m = PLATFORM_META[platform]
  if (!m) return null
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: m.bg, color: m.textColor }}>
      {m.label}
    </span>
  )
}

export default function ReviewAdmin() {
  const [links, setLinks] = useState<LinkedPlatform[]>([])
  const [reviews, setReviews] = useState<ReviewState[]>([])
  const [loading, setLoading] = useState(false)
  const [filterPlatform, setFilterPlatform] = useState<string>('all')
  const [filterRating, setFilterRating] = useState<number>(0)
  const [filterReplied, setFilterReplied] = useState<'all' | 'pending' | 'done'>('all')
  const [storeName, setStoreName] = useState('')
  const [storeRegion, setStoreRegion] = useState('')
  const [storeType, setStoreType] = useState('')

  // localStorage에서 연동된 플랫폼 로드
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_LINKS)
      if (raw) {
        const parsed = JSON.parse(raw) as LinkedPlatform[]
        setLinks(parsed)
        if (parsed[0]) setStoreName(parsed[0].name || '')
      }
    } catch (_) {}
  }, [])

  // 연동된 플랫폼에서 리뷰 불러오기
  const loadReviews = useCallback(async () => {
    if (!links.length) return
    setLoading(true)
    const all: ReviewState[] = []

    for (const link of links) {
      try {
        const res = await fetch(`/api/platforms/${link.platform}?placeId=${encodeURIComponent(link.placeId)}`)
        if (!res.ok) continue
        const data = await res.json()
        const items: Review[] = data.reviews || []
        items.forEach(r => all.push({
          ...r,
          platform: link.platform,
          aiReply: '', editReply: '', aiLoading: false, aiDone: false, showEdit: false,
        }))
      } catch (_) {}
    }

    // 날짜 내림차순 정렬
    all.sort((a, b) => (b.date > a.date ? 1 : -1))
    setReviews(all)
    setLoading(false)
  }, [links])

  useEffect(() => { if (links.length) loadReviews() }, [links, loadReviews])

  // AI 답글 생성
  async function generateAI(idx: number) {
    const r = reviews[idx]
    setReviews(prev => prev.map((x, i) => i === idx ? { ...x, aiLoading: true, aiDone: false, aiReply: '' } : x))
    try {
      const res = await fetch('/api/ai-review-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review: r.text,
          platform: PLATFORM_META[r.platform]?.label || r.platform,
          storeName: storeName || '저희 매장',
          region: storeRegion,
          bizType: storeType,
          aiSettings: {
            tone: 'friendly', length: 'medium',
            includes: { thanks: true, revisit: true, mention: true, personalize: false, improve: true, keyword: true },
            closing: '', excludes: '',
          },
        }),
      })
      const data = await res.json()
      const reply = data.reply || '답글 생성 실패'
      setReviews(prev => prev.map((x, i) => i === idx
        ? { ...x, aiLoading: false, aiDone: true, aiReply: reply, editReply: reply, showEdit: true }
        : x
      ))
    } catch {
      setReviews(prev => prev.map((x, i) => i === idx
        ? { ...x, aiLoading: false, aiDone: false, aiReply: '⚠ AI 오류. 다시 시도해 주세요.' }
        : x
      ))
    }
  }

  function updateEditReply(idx: number, val: string) {
    setReviews(prev => prev.map((x, i) => i === idx ? { ...x, editReply: val } : x))
  }

  function markReplied(idx: number) {
    setReviews(prev => prev.map((x, i) => i === idx ? { ...x, replied: true, showEdit: false } : x))
  }

  // 필터링
  const filtered = reviews.filter(r => {
    if (filterPlatform !== 'all' && r.platform !== filterPlatform) return false
    if (filterRating > 0 && r.rating !== filterRating) return false
    if (filterReplied === 'pending' && r.replied) return false
    if (filterReplied === 'done' && !r.replied) return false
    return true
  })

  const pendingCount = reviews.filter(r => !r.replied).length
  const totalCount   = reviews.length

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex">
      <Sidebar />
      <main className="flex-1 md:ml-[220px] p-4 md:p-8 pt-16 md:pt-8 pr-16 md:pr-20">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#191F28]">리뷰 관리</h1>
            <p className="text-sm text-[#8B95A1] mt-0.5">
              {totalCount}개 리뷰 · <span className="text-red-500 font-semibold">{pendingCount}개 미답변</span>
            </p>
          </div>
          <button
            onClick={loadReviews}
            disabled={loading || !links.length}
            className="px-4 py-2 bg-[#3182F6] text-white text-sm font-semibold rounded-xl hover:bg-[#1B64DA] disabled:opacity-50 transition-colors"
          >
            {loading ? '불러오는 중...' : '새로고침'}
          </button>
        </div>

        {/* 미연동 안내 */}
        {!links.length && (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center mb-6">
            <div className="text-4xl mb-3">📡</div>
            <p className="font-bold text-[#191F28] mb-1">연동된 플랫폼이 없습니다</p>
            <p className="text-sm text-[#8B95A1] mb-4">대시보드에서 구글·네이버 매장을 먼저 연동해 주세요.</p>
            <Link href="/" className="inline-block px-5 py-2 bg-[#3182F6] text-white text-sm font-semibold rounded-xl hover:bg-[#1B64DA] transition-colors">
              대시보드로 이동
            </Link>
          </div>
        )}

        {/* AI 설정 바 */}
        {links.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-4 border border-[#E5E8EB]">
            <p className="text-xs font-semibold text-[#8B95A1] mb-3">AI 답글 설정 (매장 정보)</p>
            <div className="flex gap-3 flex-wrap">
              <input value={storeName} onChange={e => setStoreName(e.target.value)}
                placeholder="매장명" className="border border-[#E5E8EB] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3182F6] flex-1 min-w-[120px]" />
              <input value={storeRegion} onChange={e => setStoreRegion(e.target.value)}
                placeholder="지역 (예: 강남)" className="border border-[#E5E8EB] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3182F6] flex-1 min-w-[100px]" />
              <input value={storeType} onChange={e => setStoreType(e.target.value)}
                placeholder="업종 (예: 카페)" className="border border-[#E5E8EB] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3182F6] flex-1 min-w-[100px]" />
            </div>
          </div>
        )}

        {/* 필터 바 */}
        {reviews.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-4">
            {/* 플랫폼 */}
            <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm">
              {['all', ...links.map(l => l.platform)].map(p => (
                <button key={p} onClick={() => setFilterPlatform(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filterPlatform === p ? 'bg-[#3182F6] text-white' : 'text-[#8B95A1] hover:bg-[#F2F4F6]'}`}>
                  {p === 'all' ? '전체' : PLATFORM_META[p]?.label || p}
                </button>
              ))}
            </div>
            {/* 미답변/완료 */}
            <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm">
              {(['all', 'pending', 'done'] as const).map(f => (
                <button key={f} onClick={() => setFilterReplied(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filterReplied === f ? 'bg-[#3182F6] text-white' : 'text-[#8B95A1] hover:bg-[#F2F4F6]'}`}>
                  {f === 'all' ? '전체' : f === 'pending' ? '미답변' : '완료'}
                </button>
              ))}
            </div>
            {/* 별점 필터 */}
            <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm">
              {[0,1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setFilterRating(n)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filterRating === n ? 'bg-[#3182F6] text-white' : 'text-[#8B95A1] hover:bg-[#F2F4F6]'}`}>
                  {n === 0 ? '전체' : '★'.repeat(n)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 리뷰 목록 */}
        {loading && (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <div className="text-3xl mb-2 animate-pulse">⏳</div>
            <p className="text-sm text-[#8B95A1]">리뷰 불러오는 중...</p>
          </div>
        )}

        {!loading && filtered.length === 0 && reviews.length > 0 && (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <p className="text-sm text-[#8B95A1]">필터에 맞는 리뷰가 없습니다.</p>
          </div>
        )}

        <div className="space-y-4">
          {filtered.map((r, idx) => {
            const realIdx = reviews.indexOf(r)
            return (
              <div key={r.id} className={`bg-white rounded-2xl p-5 shadow-sm border-l-4 ${r.replied ? 'border-green-400' : 'border-[#3182F6]'}`}>
                {/* 리뷰 헤더 */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3182F6] to-[#8B5CF6] flex items-center justify-center text-white font-bold flex-shrink-0">
                    {r.author[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-[#191F28]">{r.author}</span>
                      <PlatformBadge platform={r.platform} />
                      <Stars rating={r.rating} />
                      {r.replied && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">답변완료</span>}
                    </div>
                    <p className="text-xs text-[#B0B8C1] mt-0.5">{r.date}</p>
                  </div>
                </div>

                {/* 리뷰 본문 */}
                <p className="text-sm text-[#4E5968] bg-[#F8F9FA] rounded-xl p-3 mb-3">{r.text || '(텍스트 없음)'}</p>

                {/* AI 답글 영역 */}
                {r.aiDone && r.showEdit && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-[#3182F6]">✨ AI 생성 답글 (편집 가능)</span>
                    </div>
                    <textarea
                      value={r.editReply}
                      onChange={e => updateEditReply(realIdx, e.target.value)}
                      rows={4}
                      className="w-full border border-[#3182F6] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#1B64DA] resize-none transition-colors"
                    />
                    <div className="flex gap-2 mt-2 justify-end">
                      <button
                        onClick={() => generateAI(realIdx)}
                        className="px-3 py-1.5 text-xs text-[#3182F6] border border-[#3182F6] rounded-lg hover:bg-[#EFF6FF] transition-colors font-semibold"
                      >
                        재생성
                      </button>
                      <button
                        onClick={() => markReplied(realIdx)}
                        className="px-4 py-1.5 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold"
                      >
                        답변 완료 표시
                      </button>
                    </div>
                  </div>
                )}

                {r.aiLoading && (
                  <div className="mb-3 p-3 bg-[#EFF6FF] rounded-xl text-sm text-[#3182F6] animate-pulse">
                    ✨ AI가 답글을 작성하고 있습니다...
                  </div>
                )}

                {/* 액션 버튼 */}
                {!r.replied && !r.showEdit && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => generateAI(realIdx)}
                      disabled={r.aiLoading}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#3182F6] text-white text-xs font-semibold rounded-xl hover:bg-[#1B64DA] disabled:opacity-50 transition-colors"
                    >
                      ✨ AI 답글 생성
                    </button>
                    <button
                      onClick={() => markReplied(realIdx)}
                      className="px-4 py-2 text-xs text-[#8B95A1] border border-[#E5E8EB] rounded-xl hover:bg-[#F2F4F6] transition-colors font-semibold"
                    >
                      수동 완료
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* 하단 여백 */}
        <div className="h-8" />
      </main>
    </div>
  )
}
