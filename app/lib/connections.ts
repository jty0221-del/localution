'use client'
// ============================================================
//  로컬루션 공통 연동 상태 훅
//  /dashboard, /settings, /review-admin 에서 공유되는 단일 소스
// ============================================================
import { useEffect, useState, useCallback } from 'react'

export const CANONICAL_PLATFORMS = [
  'naver', 'google', 'kakao', 'baemin', 'yogiyo', 'coupang', 'yeoshin', 'hometax',
] as const
export type PlatformId = typeof CANONICAL_PLATFORMS[number]

export const PLATFORM_LABEL: Record<PlatformId, string> = {
  naver: '네이버 플레이스',
  google: '구글 비즈니스',
  kakao: '카카오맵',
  baemin: '배달의민족',
  yogiyo: '요기요',
  coupang: '쿠팡이츠',
  yeoshin: '여신금융',
  hometax: '홈택스',
}

export const PLATFORM_COLOR: Record<PlatformId, string> = {
  naver: '#03C75A',
  google: '#4285F4',
  kakao: '#FEE500',
  baemin: '#2AC1BC',
  yogiyo: '#FA3C00',
  coupang: '#FF4B30',
  yeoshin: '#003087',
  hometax: '#006AB4',
}

const LS_KEY = 'localution.platform_links'
const EVENT = 'localution:connections-change'

// 타 페이지에서 저장한 비표준 키 → 표준 키 매핑
const ALIAS_MAP: Record<string, PlatformId> = {
  naver_place: 'naver',
  coupangeats: 'coupang',
  kakao_map: 'kakao',
}

export function normalizeKey(k: string): PlatformId | null {
  if ((CANONICAL_PLATFORMS as readonly string[]).includes(k)) return k as PlatformId
  if (ALIAS_MAP[k]) return ALIAS_MAP[k]
  return null
}

export interface ConnectionData {
  connected: boolean
  externalName?: string
  externalId?: string
  externalUrl?: string
  rating?: number | null
  reviewCount?: number
  linkedAt?: string
}

export type ConnectionsMap = Record<PlatformId, ConnectionData>

function emptyMap(): ConnectionsMap {
  const m = {} as ConnectionsMap
  CANONICAL_PLATFORMS.forEach(p => { m[p] = { connected: false } })
  return m
}

export function getConnections(): ConnectionsMap {
  if (typeof window === 'undefined') return emptyMap()
  const m = emptyMap()

  // 1) 통합 저장소 읽기 (배열 + 객체 모두 지원)
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        parsed.forEach((l: any) => {
          if (!l?.platform) return
          const k = normalizeKey(l.platform)
          if (!k) return
          m[k] = {
            connected: true,
            externalName: l.externalName || l.name,
            externalId: l.externalId || l.placeId || l.input,
            externalUrl: l.externalUrl || l.url,
            rating: l.rating ?? null,
            reviewCount: l.reviewCount ?? l.reviews,
            linkedAt: l.linkedAt,
          }
        })
      } else if (parsed && typeof parsed === 'object') {
        Object.keys(parsed).forEach(k => {
          const nk = normalizeKey(k)
          if (!nk) return
          const l = parsed[k] || {}
          m[nk] = {
            connected: true,
            externalName: l.externalName || l.name,
            externalId: l.externalId || l.placeId || l.input,
            externalUrl: l.externalUrl || l.url,
            rating: l.rating ?? null,
            reviewCount: l.reviewCount ?? l.reviews,
            linkedAt: l.linkedAt,
          }
        })
      }
    }
  } catch {}

  // 2) 레거시 per-platform 키 (localution.kakao.connected 등)
  try {
    CANONICAL_PLATFORMS.forEach(p => {
      const legacyConn = localStorage.getItem(`localution.${p}.connected`)
      if (legacyConn === 'true' && !m[p].connected) {
        m[p] = {
          ...m[p],
          connected: true,
          externalId: localStorage.getItem(`localution.${p}.storeId`) || undefined,
        }
      }
    })
  } catch {}

  return m
}

function readRawObject(): Record<string, any> {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      const obj: Record<string, any> = {}
      parsed.forEach((l: any) => {
        const k = normalizeKey(l?.platform)
        if (k) obj[k] = l
      })
      return obj
    }
    if (parsed && typeof parsed === 'object') {
      // 비표준 키를 정규화해서 다시 저장
      const obj: Record<string, any> = {}
      Object.keys(parsed).forEach(k => {
        const nk = normalizeKey(k)
        if (nk) obj[nk] = parsed[k]
      })
      return obj
    }
  } catch {}
  return {}
}

function notify() {
  try {
    window.dispatchEvent(new CustomEvent(EVENT))
  } catch {}
}

export function setConnection(platform: PlatformId, data: Partial<ConnectionData>) {
  try {
    const current = readRawObject()
    current[platform] = {
      ...(current[platform] || {}),
      ...data,
      platform,
      linkedAt: data.linkedAt || new Date().toISOString(),
    }
    localStorage.setItem(LS_KEY, JSON.stringify(current))
    // 레거시 호환 키도 세팅
    try { localStorage.setItem(`localution.${platform}.connected`, 'true') } catch {}
    notify()
  } catch {}
}

export function removeConnection(platform: PlatformId) {
  try {
    const current = readRawObject()
    delete current[platform]
    localStorage.setItem(LS_KEY, JSON.stringify(current))
    try {
      localStorage.removeItem(`localution.${platform}.connected`)
      localStorage.removeItem(`localution.${platform}.storeId`)
      localStorage.removeItem(`localution.${platform}.token`)
    } catch {}
    notify()
  } catch {}
}

// 30차-3: 서버 단일 진실원 동기화
// /api/stores/me 응답에서 connected:true 인 플랫폼을 가져와 로컬 상태에 머지한다.
// 서버 slug (naver_place / baemin / yogiyo / coupangeats) → 캐노니컬 키 (naver / baemin / yogiyo / coupang).
async function fetchServerConnections(): Promise<Partial<ConnectionsMap>> {
  if (typeof window === 'undefined') return {}
  try {
    const res = await fetch('/api/stores/me', { cache: 'no-store', credentials: 'include' })
    if (!res.ok) return {}
    const data = await res.json()
    if (!data?.ok) return {}
    const out: Partial<ConnectionsMap> = {}
    const server: Array<{
      platform: string
      connected: boolean
      platform_store_name?: string | null
      platform_store_id?: string | null
      connected_at?: string | null
    }> = data.platforms ?? []
    // naver_link 도 보조 소스로 사용 (place_targets 기반)
    const naverLink: {
      external_id?: string | null
      external_name?: string | null
      external_url?: string | null
    } | null = data.naver_link ?? null

    for (const sp of server) {
      if (!sp?.connected) continue
      const k = normalizeKey(sp.platform)
      if (!k) continue
      const externalUrl =
        k === 'naver' && sp.platform_store_id
          ? `https://map.naver.com/p/entry/place/${sp.platform_store_id}`
          : k === 'kakao' && sp.platform_store_id
          ? `https://place.map.kakao.com/${sp.platform_store_id}`
          : undefined
      out[k] = {
        connected: true,
        externalName: sp.platform_store_name ?? undefined,
        externalId: sp.platform_store_id ?? undefined,
        externalUrl,
        linkedAt: sp.connected_at ?? undefined,
      }
    }
    // naver_place 가 platform_credentials 에 없어도 place_targets 에 있으면 naver 연결로 표시
    if (!out.naver?.connected && naverLink && (naverLink.external_id || naverLink.external_name)) {
      out.naver = {
        connected: true,
        externalName: naverLink.external_name ?? undefined,
        externalId: naverLink.external_id ?? undefined,
        externalUrl: naverLink.external_url ?? undefined,
      }
    }
    return out
  } catch {
    return {}
  }
}

function mergeServer(local: ConnectionsMap, server: Partial<ConnectionsMap>): ConnectionsMap {
  const merged: ConnectionsMap = { ...local }
  ;(Object.keys(server) as PlatformId[]).forEach((k) => {
    const s = server[k]
    if (!s?.connected) return
    merged[k] = {
      ...merged[k],
      ...s,
      connected: true,
    }
  })
  return merged
}

// React 훅 — 현재 연동 상태 + 변경 구독 (로컬 + 서버 단일 진실원)
export function useConnections() {
  const [map, setMap] = useState<ConnectionsMap>(emptyMap())

  const refresh = useCallback(() => {
    // 1) localStorage 즉시 반영
    const local = getConnections()
    setMap(local)
    // 2) 서버 단일 진실원 비동기 머지
    fetchServerConnections().then((server) => {
      if (!server || Object.keys(server).length === 0) return
      setMap((prev) => mergeServer(prev, server))
    })
  }, [])

  useEffect(() => {
    refresh()
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return
      if (e.key === LS_KEY || e.key.startsWith('localution.')) refresh()
    }
    const onCustom = () => refresh()
    const onFocus = () => refresh()
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener(EVENT, onCustom as EventListener)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(EVENT, onCustom as EventListener)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh])

  return {
    connections: map,
    isConnected: (p: PlatformId) => !!map[p]?.connected,
    connectedCount: CANONICAL_PLATFORMS.filter(p => map[p]?.connected).length,
    toggle: (p: PlatformId, data?: Partial<ConnectionData>) => {
      if (map[p]?.connected) removeConnection(p)
      else setConnection(p, { connected: true, ...(data || {}) })
      refresh()
    },
    setConnection: (p: PlatformId, d: Partial<ConnectionData>) => {
      setConnection(p, { connected: true, ...d })
      refresh()
    },
    removeConnection: (p: PlatformId) => {
      removeConnection(p)
      refresh()
    },
    refresh,
  }
}
