'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'
import PageHeader from '../components/PageHeader'
import { useConnections, PlatformId } from '../lib/connections'
import { toast, confirmDialog } from '../lib/toast'
import { buildSettingsHref } from '../lib/settings-tabs'

export const dynamic = 'force-dynamic'

// ═══════════════════════════════════════════════════════════════
//  플랫폼 로고 SVG 컴포넌트 (대시보드와 동일)
// ═══════════════════════════════════════════════════════════════

function BaeminLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#2AC1BC"/>
      <text x="24" y="31" fontSize="18" fontWeight="900" fill="#1A1A1A"
        fontFamily="'Apple SD Gothic Neo','Noto Sans KR',sans-serif"
        textAnchor="middle" letterSpacing="-0.5">배민</text>
    </svg>
  )
}

function YogiyoLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#E5007F"/>
      <text x="24" y="23" fontSize="11" fontWeight="900" fill="white"
        fontFamily="'Apple SD Gothic Neo','Noto Sans KR',sans-serif" textAnchor="middle">요기요</text>
      <circle cx="24" cy="33" r="4" fill="white"/>
      <path d="M16 43 Q24 39 32 43" stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
    </svg>
  )
}

function CoupangEatsLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="white" stroke="#E5E7EB" strokeWidth="1.5"/>
      <text x="5" y="25" fontSize="9.5" fontWeight="800" fontFamily="Arial,sans-serif" letterSpacing="0.2">
        <tspan fill="#E31837">c</tspan><tspan fill="#F4A900">o</tspan><tspan fill="#E31837">u</tspan><tspan fill="#5BAD48">p</tspan><tspan fill="#3B79BE">a</tspan><tspan fill="#E31837">n</tspan><tspan fill="#F4A900">g</tspan>
      </text>
      <text x="5" y="39" fontSize="13" fontWeight="900" fill="#4A2C0A" fontFamily="Arial,sans-serif">eats</text>
    </svg>
  )
}

// ═══════════════════════════════════════════════════════════════
//  타입 & 상수
// ═══════════════════════════════════════════════════════════════

interface Review {
  id: string
  platform: string
  rating: number
  author: string
  date: string
  text: string
  replied: boolean
}

interface PlatformStat {
  platform: string
  connected: boolean
  externalName?: string
  reviewCount?: number
  avgRating?: number
  unreplied?: number
  storeId?: string
  token?: string
  externalUrl?: string
}

const ALL_PLATFORMS = ['naver', 'kakao', 'google', 'baemin', 'yogiyo', 'coupang'] as const
type PlatformKey = typeof ALL_PLATFORMS[number]

type LogoFC = React.FC<{ size?: number }>

const PLATFORM_META: Record<PlatformKey, {
  label: string; color: string; bg: string; textColor: string; icon: string
  Logo?: LogoFC
  apiPath?: string
  detailPath: string
  legacyKeys?: { connected: string; storeId: string; token: string }
}> = {
  naver: {
    label: '네이버', color: '#03C75A', bg: '#E8FBF0', textColor: '#015C2C', icon: 'N',
    detailPath: '/review-admin/naver',
  },
  kakao: {
    label: '카카오', color: '#FEE500', bg: '#FFFBE0', textColor: '#1A1A1A', icon: 'K',
    detailPath: '/review-admin/kakao',
    legacyKeys: { connected: 'localution.kakao.connected', storeId: 'localution.kakao.storeId', token: 'localution.kakao.token' },
  },
  google: {
    label: '구글', color: '#4285F4', bg: '#EBF3FE', textColor: '#1A56B0', icon: 'G',
    detailPath: '/review-admin/google',
  },
  baemin: {
    label: '배민', color: '#2AC1BC', bg: '#E6F9F8', textColor: '#0B7B78', icon: 'B',
    Logo: BaeminLogo,
    apiPath: '/api/baemin-reviews',
    detailPath: '/review-admin/baemin',
    legacyKeys: { connected: 'localution.baemin.connected', storeId: 'localution.baemin.storeId', token: 'localution.baemin.token' },
  },
  yogiyo: {
    label: '요기요', color: '#E5007F', bg: '#FEF0EB', textColor: '#B32B00', icon: 'Y',
    Logo: YogiyoLogo,
    apiPath: '/api/yogiyo-reviews',
    detailPath: '/review-admin/yogiyo',
    legacyKeys: { connected: 'localution.yogiyo.connected', storeId: 'localution.yogiyo.storeId', token: 'localution.yogiyo.token' },
  },
  coupang: {
    label: '쿠팡이츠', color: '#FF5A00', bg: '#FFF3F0', textColor: '#900000', icon: 'C',
    Logo: CoupangEatsLogo,
    apiPath: '/api/reviews/coupang',
    detailPath: '/review-admin/coupang',
    legacyKeys: { connected: 'localution.coupang.connected', storeId: 'localution.coupang.storeId', token: 'localution.coupang.token' },
  },
}

function Stars({ n, color = '#F59E0B' }: { n: number; color?: string }) {
  return (
    <span className="text-sm tracking-tight" style={{ color }}>
      {'★'.repeat(n)}<span className="text-[#E5E8EB]">{'★'.repeat(5 - n)}</span>
    </span>
  )
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr)
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

// ═══════════════════════════════════════════════════════════════
//  메인 페이지
// ═══════════════════════════════════════════════════════════════

export default function ReviewAdminHub() {
  // ─── 공통 연동 훅 (dashboard/settings 와 동일 소스) ─────────
  const { connections, removeConnection } = useConnections()

  const [reviewStats, setReviewStats] = useState<Record<string, { reviewCount?: number; avgRating?: number; unreplied?: number }>>({})
  const [feed, setFeed] = useState<Review[]>([])
  const [loadingFeed, setLoadingFeed] = useState(false)
  const [feedError, setFeedError] = useState('')
  const [filter, setFilter] = useState<'all' | PlatformKey>('all')

  // 28차-3: /api/stores/me 서버 소스 (platform_credentials 기반)
  const [serverPlatforms, setServerPlatforms] = useState<Record<string, {
    connected: boolean
    platform_store_id: string | null
    platform_store_name: string | null
    account_id_masked: string
  }>>({})
  const [serverNaverLink, setServerNaverLink] = useState<{
    external_id: string | null
    external_name: string | null
    external_url: string | null
  } | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/stores/me', { credentials: 'include', cache: 'no-store' })
        if (!res.ok) return
        const j = await res.json()
        if (!j?.ok) return
        // platform slug → review-admin key 매핑: naver_place→naver, coupangeats→coupang
        const slugToKey: Record<string, string> = {
          naver_place: 'naver',
          baemin: 'baemin',
          yogiyo: 'yogiyo',
          coupangeats: 'coupang',
          kakao_map: 'kakao',
        }
        const map: Record<string, any> = {}
        for (const p of (j.platforms || [])) {
          const key = slugToKey[p.platform] || p.platform
          map[key] = {
            connected: !!p.connected,
            platform_store_id: p.platform_store_id,
            platform_store_name: p.platform_store_name,
            account_id_masked: p.account_id_masked || '',
          }
        }
        setServerPlatforms(map)
        setServerNaverLink(j.naver_link || null)
      } catch (_) {}
    })()
  }, [])

  // 훅 기반 stats 파생 (로컬 훅 + 서버 연결 정보 병합)
  const stats: PlatformStat[] = useMemo(() => ALL_PLATFORMS.map(p => {
    const c = connections[p as PlatformId]
    const s = serverPlatforms[p]
    const r = reviewStats[p] || {}
    // 네이버는 platform_credentials 에 naver_place 로 저장되면 연결 처리
    const naverFromServer = p === 'naver' && (s?.connected || !!serverNaverLink)
    const connected = !!c?.connected || !!s?.connected || naverFromServer
    const externalName =
      c?.externalName ||
      s?.platform_store_name ||
      (p === 'naver' ? serverNaverLink?.external_name || undefined : undefined)
    const externalUrl =
      c?.externalUrl ||
      (p === 'naver' ? serverNaverLink?.external_url || undefined : undefined)
    const storeId =
      c?.externalId ||
      s?.platform_store_id ||
      (p === 'naver' ? serverNaverLink?.external_id || undefined : undefined)
    return {
      platform: p,
      connected,
      externalName: externalName ?? undefined,
      externalUrl: externalUrl ?? undefined,
      storeId: storeId ?? undefined,
      reviewCount: r.reviewCount,
      avgRating: r.avgRating,
      unreplied: r.unreplied,
    }
  }), [connections, reviewStats, serverPlatforms, serverNaverLink])

  // ─── 리뷰 피드 로드 ──────────────────────────────────────
  const loadFeed = useCallback(async () => {
    setLoadingFeed(true)
    setFeedError('')
    const all: Review[] = []
    const errors: string[] = []

    for (const stat of stats) {
      if (!stat.connected) continue
      const meta = PLATFORM_META[stat.platform as PlatformKey]
      if (!meta.apiPath) continue
      try {
        const params = new URLSearchParams()
        if (stat.storeId) params.set('storeId', stat.storeId)
        if (stat.token) params.set('token', stat.token)
        params.set('test', 'true') // 데모 모드 (실제 토큰 없을 때 샘플 반환)
        const res = await fetch(`${meta.apiPath}?${params.toString()}`)
        if (!res.ok) {
          errors.push(`${meta.label}: ${res.status}`)
          continue
        }
        const data = await res.json()
        const reviews: any[] = Array.isArray(data) ? data : (data.reviews || data.items || [])
        for (const r of reviews) {
          all.push({
            id: `${stat.platform}-${r.id || r.reviewId || Math.random()}`,
            platform: stat.platform,
            rating: Number(r.rating || r.score || 5),
            author: r.author || r.nickname || r.reviewer || '익명',
            date: r.createdAt || r.date || r.createdDate || new Date().toISOString(),
            text: r.text || r.content || r.review || '',
            replied: !!(r.replied || r.replyContent || r.replyText),
          })
        }
        // 통계 업데이트 (리뷰 수, 평균 평점, 미답변)
        setReviewStats(prev => ({
          ...prev,
          [stat.platform]: {
            reviewCount: reviews.length,
            avgRating: reviews.length ? +(reviews.reduce((a, b) => a + Number(b.rating || b.score || 5), 0) / reviews.length).toFixed(1) : 0,
            unreplied: reviews.filter(r => !(r.replied || r.replyContent || r.replyText)).length,
          },
        }))
      } catch (e: unknown) {
        errors.push(`${meta.label}: 연결이 잠깐 불안정했어요. 다시 시도해주세요 🙏`)
      }
    }

    // 최신순 정렬
    all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    setFeed(all)
    if (errors.length) setFeedError(`일부 플랫폼 로드 실패: ${errors.join(' / ')}`)
    setLoadingFeed(false)
  }, [stats])

  useEffect(() => {
    if (stats.some(s => s.connected)) loadFeed()
  }, [stats.map(s => s.connected).join(','), loadFeed])

  const connectedCount = stats.filter(s => s.connected).length
  const totalReviews = stats.reduce((a, s) => a + (s.reviewCount || 0), 0)
  const totalUnreplied = stats.reduce((a, s) => a + (s.unreplied || 0), 0)

  const filteredFeed = filter === 'all' ? feed : feed.filter(r => r.platform === filter)

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col overflow-x-hidden">
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 md:ml-[220px] pt-14 md:pt-0 min-w-0">
        <PageHeader
          icon="💬"
          title="리뷰 관리 허브"
          subtitle="플랫폼을 연결하면 실시간 리뷰가 자동으로 표시됩니다"
          variant="primary"
        />

        <div className="max-w-5xl mx-auto p-4 md:p-6 w-full">

        {/* ─── 요약 통계 ─── */}
        <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 md:p-5 border border-[#E5E8EB]">
            <p className="text-[11px] md:text-xs text-[#8B95A1] font-medium mb-1">연결된 플랫폼</p>
            <p className="text-xl md:text-2xl font-black text-[#191F28]">{connectedCount}<span className="text-sm text-[#8B95A1] font-medium">/{ALL_PLATFORMS.length}</span></p>
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

        {/* ─── 플랫폼 연결 카드 ─── */}
        <h2 className="text-base md:text-lg font-bold text-[#191F28] mb-3">플랫폼 연결</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4 mb-8">
          {stats.map(stat => {
            const meta = PLATFORM_META[stat.platform as PlatformKey]
            return (
              <div key={stat.platform}
                className="bg-white rounded-2xl border border-[#E5E8EB] p-4 md:p-5 flex flex-col">
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
                    {stat.connected ? (
                      <p className="text-[10px] text-[#10B981] font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />연결됨
                      </p>
                    ) : (
                      <p className="text-[10px] text-[#8B95A1] font-medium">미연결</p>
                    )}
                  </div>
                </div>

                {stat.connected ? (
                  <>
                    {stat.externalName && (
                      <p className="text-xs font-semibold text-[#191F28] mb-2 truncate">{stat.externalName}</p>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-[#4E5968] mb-3">
                      {typeof stat.avgRating === 'number' && stat.avgRating > 0 && (
                        <span>{stat.avgRating.toFixed(1)} <Stars n={Math.round(stat.avgRating)} color={meta.color} /></span>
                      )}
                      {typeof stat.reviewCount === 'number' && (
                        <span className="text-[#8B95A1]">리뷰 {stat.reviewCount}</span>
                      )}
                    </div>
                    <div className="mt-auto flex gap-1.5">
                      <Link href={meta.detailPath}
                        className="flex-1 text-center px-3 py-2 rounded-xl text-xs font-bold transition-all"
                        style={{ background: meta.bg, color: meta.textColor }}>
                        관리하기 →
                      </Link>
                      <button
                        onClick={async () => {
                          const ok = await confirmDialog(`${meta.label} 연동을 해제할까요?`, {
                            title: '연동 해제',
                            okText: '해제',
                            danger: true,
                          })
                          if (!ok) return
                          removeConnection(stat.platform as PlatformId)
                          setReviewStats(prev => { const n = { ...prev }; delete n[stat.platform]; return n })
                          toast.success(`${meta.label} 연동을 해제했어요`)
                        }}
                        className="px-2.5 py-2 rounded-xl text-xs font-bold bg-[#F2F4F6] text-[#8B95A1] hover:bg-[#E5E8EB] transition-all"
                        title="연동 해제">
                        ✕
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-[#8B95A1] mb-3 leading-relaxed">아직 연결되지 않았습니다.<br/>연동하면 실시간 리뷰가 표시됩니다.</p>
                    <Link href={buildSettingsHref('connect', { platform: stat.platform })}
                      className="mt-auto w-full text-center px-3 py-2 rounded-xl text-xs font-bold text-white transition-all"
                      style={{ background: meta.color }}>
                      + 연결하기
                    </Link>
                  </>
                )}
              </div>
            )
          })}
        </div>

        {/* ─── 실시간 리뷰 피드 ─── */}
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-base md:text-lg font-bold text-[#191F28]">실시간 리뷰 피드</h2>
          <button onClick={loadFeed} disabled={loadingFeed || connectedCount === 0}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#3182F6] text-white hover:bg-[#1C6FE0] disabled:bg-[#B0B8C1] transition-colors">
            {loadingFeed ? '불러오는 중...' : '↻ 새로고침'}
          </button>
        </div>

        {/* 필터 탭 */}
        {connectedCount > 0 && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            <button onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${filter === 'all' ? 'bg-[#191F28] text-white' : 'bg-white text-[#4E5968] border border-[#E5E8EB]'}`}>
              전체 ({feed.length})
            </button>
            {stats.filter(s => s.connected).map(s => {
              const meta = PLATFORM_META[s.platform as PlatformKey]
              const count = feed.filter(r => r.platform === s.platform).length
              return (
                <button key={s.platform} onClick={() => setFilter(s.platform as PlatformKey)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${filter === s.platform ? 'text-white' : 'bg-white text-[#4E5968] border border-[#E5E8EB]'}`}
                  style={filter === s.platform ? { background: meta.color } : {}}>
                  {meta.label} ({count})
                </button>
              )
            })}
          </div>
        )}

        {feedError && (
          <div className="bg-[#FEF3C7] border border-[#FCD34D] text-[#92400E] text-xs rounded-xl p-3 mb-4">
            ⚠ {feedError}
          </div>
        )}

        {/* 피드 본문 */}
        {connectedCount === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E5E8EB] p-8 md:p-12 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-sm font-bold text-[#191F28] mb-1">아직 연결된 플랫폼이 없습니다</p>
            <p className="text-xs text-[#8B95A1] mb-4">위에서 플랫폼을 연결하면 실시간 리뷰가 자동으로 표시됩니다.</p>
            <Link href={buildSettingsHref('connect')}
              className="inline-block px-4 py-2 rounded-xl text-xs font-bold bg-[#3182F6] text-white hover:bg-[#1C6FE0]">
              연동 관리로 이동
            </Link>
          </div>
        ) : loadingFeed ? (
          <div className="bg-white rounded-2xl border border-[#E5E8EB] p-12 text-center text-sm text-[#8B95A1]">
            리뷰 불러오는 중...
          </div>
        ) : filteredFeed.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E5E8EB] p-8 text-center">
            <p className="text-sm text-[#8B95A1]">표시할 리뷰가 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFeed.map(review => {
              const meta = PLATFORM_META[review.platform as PlatformKey]
              if (!meta) return null
              const Logo = meta.Logo
              return (
                <div key={review.id} className="bg-white rounded-2xl border border-[#E5E8EB] p-4 md:p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: meta.bg }}>
                      {Logo ? <Logo size={20} /> : (
                        <span className="text-xs font-bold" style={{ color: meta.textColor }}>{meta.icon}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold" style={{ color: meta.color }}>{meta.label}</span>
                          <Stars n={review.rating} color={meta.color} />
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!review.replied && (
                            <span className="text-[10px] font-bold text-[#FF5A00] bg-[#FFF3F0] rounded-full px-2 py-0.5">미답변</span>
                          )}
                          <span className="text-[10px] text-[#8B95A1]">{timeAgo(review.date)}</span>
                        </div>
                      </div>
                      <p className="text-xs font-semibold text-[#4E5968] mb-1">{review.author}</p>
                      <p className="text-xs text-[#191F28] leading-relaxed line-clamp-3">{review.text}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Link href={meta.detailPath}
                      className="text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors"
                      style={{ background: meta.bg, color: meta.textColor }}>
                      상세 관리 →
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        </div>
        </main>
      </div>
      <Footer />
    </div>
  )
}
   