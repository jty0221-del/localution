'use client'

// ============================================================
// 41차-8 · 리뷰 관리 허브 — 전 플랫폼 통합
//   · /api/stores/me 에서 review_count / unreplied_count / rating_avg 표시
//   · /api/place/reviews 기반 통합 피드 (구 apiPath 제거)
//   · 리뷰만 있는 플랫폼도 "관리하기" 버튼 표시
// ============================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'
import PageHeader from '../components/PageHeader'

export const dynamic = 'force-dynamic'

// ─────────────────────────────────────────
// 로고 컴포넌트
// ─────────────────────────────────────────
function NaverLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#03C75A"/>
      <path d="M10 38V10h8.2l9.6 14.8V10H36v28h-8.2L18.2 23.2V38H10Z" fill="white"/>
    </svg>
  )
}
function GoogleLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="white" stroke="#E5E7EB" strokeWidth="1.5"/>
      <path d="M43.6 24.5c0-1.3-.12-2.6-.34-3.84H24v7.26h10.97c-.48 2.52-1.93 4.66-4.11 6.09v5.06h6.65C41.18 35.4 43.6 30.35 43.6 24.5z" fill="#4285F4"/>
      <path d="M24 44c5.46 0 10.04-1.81 13.38-4.9l-6.52-5.07c-1.81 1.22-4.13 1.94-6.86 1.94-5.27 0-9.73-3.56-11.33-8.34H6.3v5.24A19.98 19.98 0 0024 44z" fill="#34A853"/>
      <path d="M12.67 27.63A12.02 12.02 0 0112.05 24c0-1.26.22-2.49.62-3.63v-5.24H6.3A19.98 19.98 0 004 24c0 3.23.77 6.28 2.3 8.87l6.37-5.24z" fill="#FBBC05"/>
      <path d="M24 11.06c2.97 0 5.63 1.02 7.73 3.01l5.79-5.79C34.02 5.06 29.44 3.04 24 3.04A19.98 19.98 0 006.3 15.13l6.37 5.24C14.27 14.62 18.73 11.06 24 11.06z" fill="#EA4335"/>
    </svg>
  )
}
function KakaoLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#FEE500"/>
      <path d="M24 11C15.16 11 8 16.82 8 24.02c0 4.7 3.11 8.83 7.8 11.2l-1.98 7.28c-.17.63.53 1.14 1.08.77L22.6 38.1c.45.05.93.08 1.4.08 8.84 0 16-5.82 16-13.02S32.84 11 24 11z" fill="#3C1E1E"/>
    </svg>
  )
}
function BaeminLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#2AC1BC"/>
      <rect x="11" y="13" width="10" height="22" rx="3" fill="#1A1A1A"/>
      <rect x="11" y="13" width="10" height="10" rx="3" fill="#1A1A1A"/>
      <path d="M21 18h5.5a5.5 5.5 0 010 11H21" stroke="#1A1A1A" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      <path d="M21 24h6a5 5 0 010 10H21" stroke="#1A1A1A" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      <rect x="11" y="31" width="10" height="4" rx="2" fill="#1A1A1A"/>
    </svg>
  )
}
function YogiyoLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#FA0050"/>
      <circle cx="24" cy="16" r="7" fill="white"/>
      <path d="M17 26c0 0 2-4 7-4s7 4 7 4v10c0 2-1.5 3-3.5 3h-7C18.5 39 17 38 17 36V26z" fill="white"/>
      <circle cx="21" cy="15" r="2" fill="#FA0050"/>
      <circle cx="27" cy="15" r="2" fill="#FA0050"/>
      <path d="M21 20 Q24 22 27 20" stroke="#FA0050" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  )
}
function CoupangEatsLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#FF5A00"/>
      <path d="M32 14H16a6 6 0 00-6 6v8a6 6 0 006 6h4l4 4 4-4h4a6 6 0 006-6v-8a6 6 0 00-6-6z" fill="white"/>
      <path d="M19 22h10M19 27h7" stroke="#FF5A00" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  )
}

// ─────────────────────────────────────────
// 상수
// ─────────────────────────────────────────
const ALL_PLATFORMS = ['naver', 'baemin', 'yogiyo', 'coupang', 'kakao'] as const
type PlatformKey = typeof ALL_PLATFORMS[number]

// hub key → stores/me slug 매핑
const HUB_TO_SLUG: Record<PlatformKey, string> = {
  naver:   'naver_place',
  baemin:  'baemin',
  yogiyo:  'yogiyo',
  coupang: 'coupangeats',
  kakao:   'kakao_map',
}

type LogoFC = React.FC<{ size?: number }>
const PLATFORM_META: Record<PlatformKey, {
  label: string; color: string; bg: string; textColor: string; icon: string
  Logo?: LogoFC
  detailPath: string
}> = {
  naver:   { label: '네이버 플레이스', color: '#03C75A', bg: '#E8FBF0', textColor: '#015C2C', icon: 'N', Logo: NaverLogo,  detailPath: '/review-admin/naver' },
  baemin:  { label: '배달의민족',       color: '#2AC1BC', bg: '#E6F9F8', textColor: '#0B7B78', icon: 'B', Logo: BaeminLogo,      detailPath: '/review-admin/baemin' },
  yogiyo:  { label: '요기요',           color: '#E5007F', bg: '#FEF0EB', textColor: '#B32B00', icon: 'Y', Logo: YogiyoLogo,       detailPath: '/review-admin/yogiyo' },
  coupang: { label: '쿠팡이츠',         color: '#FF5A00', bg: '#FFF3F0', textColor: '#900000', icon: 'C', Logo: CoupangEatsLogo,  detailPath: '/review-admin/coupang' },
  kakao:   { label: '카카오맵',         color: '#FEE500', bg: '#FFFBE0', textColor: '#1A1A1A', icon: 'K', Logo: KakaoLogo,  detailPath: '/review-admin/kakao' },
}

interface PlatformStat {
  platform: PlatformKey
  connected: boolean
  externalName: string
  reviewCount: number
  avgRating: number | null
  unreplied: number
  latestAt: string | null
}

interface FeedReview {
  id: string
  platform: PlatformKey
  rating: number | null
  author: string
  date: string
  text: string
  replied: boolean
}

function Stars({ n, color = '#F59E0B' }: { n: number; color?: string }) {
  const v = Math.max(0, Math.min(5, Math.round(n)))
  return (
    <span className="text-sm tracking-tight" style={{ color }}>
      {'★'.repeat(v)}<span className="text-[#E5E8EB]">{'★'.repeat(5 - v)}</span>
    </span>
  )
}
function timeAgo(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '-'
  const diff = Date.now() - d.getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '방금'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  const dd = Math.floor(h / 24)
  if (dd < 30) return `${dd}일 전`
  return d.toLocaleDateString('ko-KR')
}

// ─────────────────────────────────────────
// 메인 페이지
// ─────────────────────────────────────────
export default function ReviewAdminHub() {
  const [stats, setStats] = useState<PlatformStat[]>(
    ALL_PLATFORMS.map(p => ({
      platform: p, connected: false, externalName: '',
      reviewCount: 0, avgRating: null, unreplied: 0, latestAt: null,
    }))
  )
  const [loadingStats, setLoadingStats] = useState(true)

  const [feed, setFeed] = useState<FeedReview[]>([])
  const [loadingFeed, setLoadingFeed] = useState(false)
  const [filter, setFilter] = useState<'all' | PlatformKey>('all')

  // ── 1) 플랫폼 통계 로드 (stores/me) ──────────────────────
  const loadStats = useCallback(async () => {
    setLoadingStats(true)
    try {
      const res = await fetch('/api/stores/me', { credentials: 'include', cache: 'no-store' })
      if (!res.ok) return
      const j = await res.json()
      if (!j?.ok) return

      const slugMap: Record<string, PlatformKey> = {
        naver_place: 'naver', baemin: 'baemin',
        yogiyo: 'yogiyo', coupangeats: 'coupang', kakao_map: 'kakao',
      }

      setStats(prev => prev.map(s => {
        const slug = HUB_TO_SLUG[s.platform]
        const p = (j.platforms || []).find((x: any) => x.platform === slug)
        if (!p) return s
        return {
          platform: s.platform,
          connected: !!p.connected,
          externalName: p.platform_store_name || '',
          reviewCount: p.review_count ?? 0,
          avgRating: typeof p.rating_avg === 'number' ? p.rating_avg : null,
          unreplied: p.unreplied_count ?? 0,
          latestAt: p.latest_collected_at ?? null,
        }
      }))
    } catch (_) {}
    finally { setLoadingStats(false) }
  }, [])

  useEffect(() => { loadStats() }, [loadStats])

  // ── 2) 리뷰 피드 로드 (/api/place/reviews) ───────────────
  const loadFeed = useCallback(async () => {
    setLoadingFeed(true)
    const all: FeedReview[] = []

    await Promise.allSettled(
      stats
        .filter(s => s.connected || s.reviewCount > 0)
        .map(async (s) => {
          try {
            const res = await fetch(
              `/api/place/reviews?platform=${HUB_TO_SLUG[s.platform]}&limit=100`,
              { credentials: 'include', cache: 'no-store' },
            )
            if (!res.ok) return
            const data = await res.json()
            if (!data?.ok || !Array.isArray(data.reviews)) return
            for (const r of data.reviews) {
              all.push({
                id: `${s.platform}-${r.id}`,
                platform: s.platform,
                rating: typeof r.rating === 'number' ? r.rating : null,
                author: r.author_mask || r.author_name || '익명',
                date: r.posted_at || r.collected_at || new Date().toISOString(),
                text: r.content || '',
                replied: !!r.has_reply,
              })
            }
          } catch (_) {}
        })
    )

    all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    setFeed(all)
    setLoadingFeed(false)
  }, [stats])

  // stats 로드 완료 후 피드 자동 로드
  useEffect(() => {
    if (!loadingStats && stats.some(s => s.connected || s.reviewCount > 0)) {
      loadFeed()
    }
  }, [loadingStats]) // eslint-disable-line

  const activeCount   = stats.filter(s => s.connected || s.reviewCount > 0).length
  const totalReviews  = stats.reduce((a, s) => a + s.reviewCount, 0)
  const totalUnreplied = stats.reduce((a, s) => a + s.unreplied, 0)

  const filteredFeed = filter === 'all' ? feed : feed.filter(r => r.platform === filter)

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col overflow-x-hidden">
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 md:ml-[220px] pt-14 md:pt-0 min-w-0">
          <PageHeader
            icon="💬"
            title="리뷰 관리 허브"
            subtitle="연결된 모든 플랫폼의 리뷰를 한 곳에서 관리하세요"
            variant="primary"
          />

          <div className="max-w-5xl mx-auto p-4 md:p-6 w-full">

            {/* ─── 요약 통계 ─── */}
            <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
              <div className="bg-white rounded-2xl p-4 md:p-5 border border-[#E5E8EB]">
                <p className="text-[11px] md:text-xs text-[#8B95A1] font-medium mb-1">활성 플랫폼</p>
                <p className="text-xl md:text-2xl font-black text-[#191F28]">
                  {activeCount}<span className="text-sm text-[#8B95A1] font-medium">/{ALL_PLATFORMS.length}</span>
                </p>
              </div>
              <div className="bg-white rounded-2xl p-4 md:p-5 border border-[#E5E8EB]">
                <p className="text-[11px] md:text-xs text-[#8B95A1] font-medium mb-1">전체 리뷰</p>
                <p className="text-xl md:text-2xl font-black text-[#191F28]">{totalReviews}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 md:p-5 border border-[#E5E8EB]">
                <p className="text-[11px] md:text-xs text-[#8B95A1] font-medium mb-1">미답변</p>
                <p className="text-xl md:text-2xl font-black text-[#F59E0B]">{totalUnreplied}</p>
              </div>
            </div>

            {/* ─── 플랫폼 카드 ─── */}
            <h2 className="text-base md:text-lg font-bold text-[#191F28] mb-3">플랫폼별 현황</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4 mb-8">
              {stats.map(stat => {
                const meta = PLATFORM_META[stat.platform]
                const hasData = stat.connected || stat.reviewCount > 0
                return (
                  <div key={stat.platform} className="bg-white rounded-2xl border border-[#E5E8EB] p-4 flex flex-col">
                    {/* 헤더 */}
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                        style={meta.Logo ? {} : { background: meta.color }}>
                        {meta.Logo
                          ? React.createElement(meta.Logo, { size: 36 })
                          : <span className="text-white font-black text-sm">{meta.icon}</span>
                        }
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[#191F28]">{meta.label}</p>
                        {loadingStats ? (
                          <p className="text-[10px] text-[#8B95A1]">확인 중...</p>
                        ) : stat.connected ? (
                          <p className="text-[10px] text-[#10B981] font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />연결됨
                          </p>
                        ) : stat.reviewCount > 0 ? (
                          <p className="text-[10px] text-[#F59E0B] font-semibold">리뷰 수집됨</p>
                        ) : (
                          <p className="text-[10px] text-[#8B95A1]">미연결</p>
                        )}
                      </div>
                    </div>

                    {hasData ? (
                      <>
                        {stat.externalName && (
                          <p className="text-xs font-semibold text-[#191F28] mb-2 truncate">{stat.externalName}</p>
                        )}
                        {/* 통계 */}
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#4E5968] mb-3">
                          {typeof stat.avgRating === 'number' && (
                            <span className="flex items-center gap-0.5">
                              <Stars n={Math.round(stat.avgRating)} color={meta.color} />
                              <span className="ml-0.5">{stat.avgRating.toFixed(1)}</span>
                            </span>
                          )}
                          <span>리뷰 <b className="text-[#191F28]">{stat.reviewCount}</b></span>
                          {stat.unreplied > 0 && (
                            <span className="text-[#F04452] font-bold">미답변 {stat.unreplied}</span>
                          )}
                        </div>
                        {stat.latestAt && (
                          <p className="text-[10px] text-[#8B95A1] mb-2">마지막 수집 {timeAgo(stat.latestAt)}</p>
                        )}
                        <div className="mt-auto">
                          <Link href={meta.detailPath}
                            className="block w-full text-center px-3 py-2 rounded-xl text-xs font-bold transition-all"
                            style={{ background: meta.bg, color: meta.textColor }}>
                            관리하기 →
                          </Link>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-[#8B95A1] mb-3 leading-relaxed">
                          아직 연결되지 않았습니다.<br/>연동하면 리뷰가 자동 수집됩니다.
                        </p>
                        <div className="mt-auto flex flex-col gap-1.5">
                          <Link href={meta.detailPath}
                            className="block w-full text-center px-3 py-2 rounded-xl text-xs font-bold text-white transition-all"
                            style={{ background: meta.color }}>
                            리뷰 관리 →
                          </Link>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>

            {/* ─── 통합 피드 ─── */}
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="text-base md:text-lg font-bold text-[#191F28]">통합 리뷰 피드</h2>
              <button
                onClick={loadFeed}
                disabled={loadingFeed || activeCount === 0}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#3182F6] text-white hover:bg-[#1C6FE0] disabled:bg-[#B0B8C1] transition-colors"
              >
                {loadingFeed ? '불러오는 중...' : '↻ 새로고침'}
              </button>
            </div>

            {/* 필터 탭 */}
            {activeCount > 0 && (
              <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${filter === 'all' ? 'bg-[#191F28] text-white' : 'bg-white text-[#4E5968] border border-[#E5E8EB]'}`}
                >
                  전체 ({feed.length})
                </button>
                {stats.filter(s => s.connected || s.reviewCount > 0).map(s => {
                  const meta = PLATFORM_META[s.platform]
                  const count = feed.filter(r => r.platform === s.platform).length
                  return (
                    <button
                      key={s.platform}
                      onClick={() => setFilter(s.platform)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${filter === s.platform ? 'text-white' : 'bg-white text-[#4E5968] border border-[#E5E8EB]'}`}
                      style={filter === s.platform ? { background: meta.color } : {}}
                    >
                      {meta.label} ({count})
                    </button>
                  )
                })}
              </div>
            )}

            {/* 피드 본문 */}
            {activeCount === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E5E8EB] p-8 md:p-12 text-center">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-sm font-bold text-[#191F28] mb-1">아직 수집된 리뷰가 없어요</p>
                <p className="text-xs text-[#8B95A1] mb-4">각 플랫폼 페이지에서 시드 데이터를 심거나 플랫폼을 연결해주세요.</p>
              </div>
            ) : loadingFeed ? (
              <div className="bg-white rounded-2xl border border-[#E5E8EB] p-12 text-center text-sm text-[#8B95A1]">
                리뷰 불러오는 중...
              </div>
            ) : filteredFeed.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E5E8EB] p-8 text-center text-sm text-[#8B95A1]">
                표시할 리뷰가 없어요 😊
              </div>
            ) : (
              <div className="space-y-3">
                {filteredFeed.slice(0, 50).map(r => {
                  const meta = PLATFORM_META[r.platform]
                  return (
                    <div key={r.id} className="bg-white rounded-2xl border border-[#E5E8EB] p-4 md:p-5 hover:border-[#D1D5DB] transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
                          style={meta.Logo ? {} : { background: meta.color }}>
                          {meta.Logo
                            ? React.createElement(meta.Logo, { size: 32 })
                            : <span className="text-white font-black text-xs">{meta.icon}</span>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-bold text-[#191F28]">{r.author}</span>
                            {typeof r.rating === 'number' && <Stars n={r.rating} color={meta.color} />}
                            <span className="text-[10px] text-[#8B95A1]">{timeAgo(r.date)}</span>
                            {r.replied ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ECFDF5] text-[#059669] font-semibold">답글완료</span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FEF3C7] text-[#92400E] font-semibold">미답변</span>
                            )}
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                              style={{ background: meta.bg, color: meta.textColor }}>
                              {meta.label}
                            </span>
                          </div>
                          <p className="text-xs md:text-sm text-[#4E5968] leading-relaxed mb-2 break-words">
                            {r.text || '(내용 없음)'}
                          </p>
                          <Link href={meta.detailPath}
                            className="inline-block text-[11px] font-semibold hover:underline"
                            style={{ color: meta.color }}>
                            {meta.label}에서 답글 작성 →
                          </Link>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {filteredFeed.length > 50 && (
                  <p className="text-center text-xs text-[#8B95A1] py-2">최근 50개 표시 중 (총 {filteredFeed.length}개)</p>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  )
}
