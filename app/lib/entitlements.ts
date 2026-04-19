/**
 * 엔타이틀먼트(권한) 시스템 — 유저별 구독 중인 모듈 관리
 *
 * Phase 0 (현재): localStorage 기반 목업. 결제 없이 UI/UX만 검증.
 * Phase 1: Supabase `subscriptions` 테이블로 교체 (schema: /supabase/entitlements.sql)
 * Phase 2: 토스페이먼츠 빌링키 연동
 *
 * 사용 예:
 *   const { has, hasAll, loading } = useEntitlements()
 *   if (!has('ai-review')) return <LockedBanner moduleId="ai-review" />
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import type { ModuleId } from './modules'
import { MODULES, getModule } from './modules'

const STORAGE_KEY = 'localution_entitlements'
const STORAGE_VERSION = '1'

export interface Entitlement {
  moduleId: ModuleId
  /** 구독 시작 시각 (ISO) */
  startedAt: string
  /** 다음 결제일 (ISO) */
  renewsAt: string
  /** 상태: active(활성), paused(일시정지), cancelled(해지) */
  status: 'active' | 'paused' | 'cancelled'
}

interface EntitlementStore {
  version: string
  entitlements: Entitlement[]
  /** 데모용: 모든 모듈 강제 언락 (개발/시연 모드) */
  devUnlockAll?: boolean
}

function readStore(): EntitlementStore {
  if (typeof window === 'undefined') {
    return { version: STORAGE_VERSION, entitlements: [] }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { version: STORAGE_VERSION, entitlements: [] }
    const parsed = JSON.parse(raw)
    if (parsed.version !== STORAGE_VERSION) {
      return { version: STORAGE_VERSION, entitlements: [] }
    }
    return parsed
  } catch {
    return { version: STORAGE_VERSION, entitlements: [] }
  }
}

function writeStore(store: EntitlementStore): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  // 다른 탭/컴포넌트 동기화
  window.dispatchEvent(new CustomEvent('localution:entitlements-changed'))
}

/** 모듈 구독 추가 (Phase 0 - 모의 결제 성공 시 호출) */
export function addEntitlement(moduleId: ModuleId): void {
  const store = readStore()
  // 이미 있으면 갱신
  const existing = store.entitlements.find(e => e.moduleId === moduleId)
  const now = new Date()
  const renews = new Date(now)
  renews.setMonth(renews.getMonth() + 1)

  if (existing) {
    existing.status = 'active'
    existing.renewsAt = renews.toISOString()
  } else {
    store.entitlements.push({
      moduleId,
      startedAt: now.toISOString(),
      renewsAt: renews.toISOString(),
      status: 'active',
    })
  }
  writeStore(store)
}

/** 모듈 해지 */
export function removeEntitlement(moduleId: ModuleId): void {
  const store = readStore()
  const ent = store.entitlements.find(e => e.moduleId === moduleId)
  if (ent) ent.status = 'cancelled'
  writeStore(store)
}

/** 개발 모드: 모든 모듈 언락/잠금 토글 */
export function toggleDevUnlockAll(): boolean {
  const store = readStore()
  store.devUnlockAll = !store.devUnlockAll
  writeStore(store)
  return !!store.devUnlockAll
}

/** 현재 활성 모듈 ID 배열 */
export function getActiveModuleIds(): ModuleId[] {
  const store = readStore()
  if (store.devUnlockAll) {
    return MODULES.map(m => m.id)
  }
  return store.entitlements
    .filter(e => e.status === 'active')
    .map(e => e.moduleId)
}

/** 즉시 체크 (서버/비-React 컨텍스트에서 사용) */
export function hasEntitlement(moduleId: ModuleId): boolean {
  return getActiveModuleIds().includes(moduleId)
}

// ============== React Hook ==============

export interface UseEntitlementsResult {
  /** 현재 구독 중인 모듈 ID 목록 */
  active: ModuleId[]
  /** 로딩 상태 (Phase 1부터 의미 있음) */
  loading: boolean
  /** 단일 모듈 체크 */
  has: (moduleId: ModuleId) => boolean
  /** 여러 모듈 모두 보유 여부 */
  hasAll: (moduleIds: ModuleId[]) => boolean
  /** 여러 모듈 중 하나라도 보유 여부 */
  hasAny: (moduleIds: ModuleId[]) => boolean
  /** 모듈별 상세 정보 (전체 구독 이력) */
  entitlements: Entitlement[]
  /** 개발용: 강제 언락 토글 */
  devUnlockAll: boolean
  toggleDevUnlock: () => void
  /** 목업 결제 완료 처리 */
  mockPurchase: (moduleId: ModuleId) => void
  /** 해지 */
  cancel: (moduleId: ModuleId) => void
}

export function useEntitlements(): UseEntitlementsResult {
  const [store, setStore] = useState<EntitlementStore>({
    version: STORAGE_VERSION,
    entitlements: [],
  })
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    setStore(readStore())
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
    // 다른 탭 변경 감지
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) refresh()
    }
    const onCustom = () => refresh()
    window.addEventListener('storage', onStorage)
    window.addEventListener('localution:entitlements-changed', onCustom)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('localution:entitlements-changed', onCustom)
    }
  }, [refresh])

  const active: ModuleId[] = store.devUnlockAll
    ? MODULES.map(m => m.id)
    : store.entitlements.filter(e => e.status === 'active').map(e => e.moduleId)

  const has = useCallback(
    (id: ModuleId) => active.includes(id),
    [active]
  )

  const hasAll = useCallback(
    (ids: ModuleId[]) => ids.every(id => active.includes(id)),
    [active]
  )

  const hasAny = useCallback(
    (ids: ModuleId[]) => ids.some(id => active.includes(id)),
    [active]
  )

  const mockPurchase = useCallback((id: ModuleId) => {
    addEntitlement(id)
  }, [])

  const cancel = useCallback((id: ModuleId) => {
    removeEntitlement(id)
  }, [])

  const toggleDevUnlock = useCallback(() => {
    toggleDevUnlockAll()
  }, [])

  return {
    active,
    loading,
    has,
    hasAll,
    hasAny,
    entitlements: store.entitlements,
    devUnlockAll: !!store.devUnlockAll,
    toggleDevUnlock,
    mockPurchase,
    cancel,
  }
}

/** 모듈 정보 + 구독 상태 결합 */
export function useModuleWithStatus(moduleId: ModuleId) {
  const { has, entitlements, loading } = useEntitlements()
  const mod = getModule(moduleId)
  const ent = entitlements.find(e => e.moduleId === moduleId)
  return {
    module: mod,
    entitlement: ent,
    hasAccess: has(moduleId),
    loading,
  }
}
