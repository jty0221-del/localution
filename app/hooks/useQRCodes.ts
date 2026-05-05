'use client'

// ============================================================
// useQRCodes — 사장님 QR 코드 목록 (localStorage → DB 마이그레이션)
// · /api/qr-codes GET/POST/PUT/DELETE 사용
// · 로그인 시: DB가 source of truth, localStorage 캐시
// · 비로그인 시: localStorage 만 (게스트 모드)
// · 마이그레이션 후 LS 원본 자동 삭제
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react'

export type QRCode = {
 id: string
 name: string
 purpose: string
 review_url: string | null
 scans: number
 reviews: number
 active: boolean
 created_at?: string
 updated_at?: string
}

const LS_LIST = 'localution.qr_list' // 기존 키
const LS_CACHE = 'localution.qr_codes.cache' // DB 모드 캐시
const LS_MIGRATED = 'localution.qr_codes.migrated_at'

export type UseQRCodesMode = 'local' | 'remote' | 'loading'

const todayISODate = () => new Date().toISOString().slice(0, 10)

export function useQRCodes() {
 const [qrCodes, setQRCodes] = useState<QRCode[]>([])
 const [mode, setMode] = useState<UseQRCodesMode>('loading')
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState<string | null>(null)
 const migratedRef = useRef(false)

 const readLocalLegacy = (): any[] => {
 try {
 const raw = localStorage.getItem(LS_LIST)
 if (!raw) return []
 const parsed = JSON.parse(raw)
 return Array.isArray(parsed) ? parsed : []
 } catch { return [] }
 }

 const readCache = (): QRCode[] => {
 try {
 const raw = localStorage.getItem(LS_CACHE)
 if (!raw) return []
 const parsed = JSON.parse(raw)
 return Array.isArray(parsed) ? parsed : []
 } catch { return [] }
 }

 const writeCache = (next: QRCode[]) => {
 try { localStorage.setItem(LS_CACHE, JSON.stringify(next)) } catch {}
 }

 const fetchRemote = useCallback(async (): Promise<QRCode[] | null> => {
 try {
 const r = await fetch('/api/qr-codes', { credentials: 'include', cache: 'no-store' })
 if (!r.ok) return null
 const j = await r.json()
 if (!j.ok) { setError(j.error); return null }
 const list = (j.qr_codes || []) as QRCode[]
 writeCache(list)
 return list
 } catch (e) {
 setError(e instanceof Error ? e.message : 'fetch failed')
 return null
 }
 }, [])

 // 마이그레이션 (LS_LIST → DB)
 const ensureMigrated = useCallback(async () => {
 if (migratedRef.current) return
 try {
 if (localStorage.getItem(LS_MIGRATED)) { migratedRef.current = true; return }
 const legacy = readLocalLegacy()
 if (legacy.length === 0) {
 localStorage.setItem(LS_MIGRATED, todayISODate())
 migratedRef.current = true
 return
 }
 let migrated = 0
 for (const item of legacy) {
 try {
 const r = await fetch('/api/qr-codes', {
 method: 'POST',
 credentials: 'include',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 name: item.name || 'QR 코드',
 purpose: item.purpose || 'review',
 review_url: item.reviewUrl || item.review_url || null,
 }),
 })
 if (r.ok) migrated++
 } catch {}
 }
 localStorage.setItem(LS_MIGRATED, todayISODate())
 // 모든 데이터 마이그레이션 성공 시 LS 원본 삭제
 if (migrated === legacy.length) {
 try { localStorage.removeItem(LS_LIST) } catch {}
 console.log('[useQRCodes] migrated', migrated, 'codes, LS cleaned')
 }
 migratedRef.current = true
 } catch (e) {
 console.warn('[useQRCodes] migration error:', e)
 }
 }, [])

 const bootstrap = useCallback(async () => {
 setLoading(true)
 setError(null)
 try {
 // 캐시 즉시 표시
 const cached = readCache()
 if (cached.length > 0) setQRCodes(cached)

 const r = await fetch('/api/qr-codes', { credentials: 'include', cache: 'no-store' })
 if (r.status === 401 || r.status === 403) {
 // 미로그인 → legacy LS 모드
 setQRCodes(readLocalLegacy() as QRCode[])
 setMode('local')
 return
 }
 if (r.ok) {
 await ensureMigrated()
 const list = await fetchRemote()
 setQRCodes(list || [])
 setMode('remote')
 return
 }
 setQRCodes(readLocalLegacy() as QRCode[])
 setMode('local')
 } catch (_) {
 setQRCodes(readLocalLegacy() as QRCode[])
 setMode('local')
 } finally {
 setLoading(false)
 }
 }, [ensureMigrated, fetchRemote])

 useEffect(() => { bootstrap() }, [bootstrap])

 const add = async (input: { name: string; purpose: string; review_url?: string | null }) => {
 if (mode !== 'remote') {
 // 로컬 모드 — 일단 LS 사용 (로그인 후 자동 마이그레이션됨)
 const next: QRCode = {
 id: 'qr-' + Date.now(),
 name: input.name,
 purpose: input.purpose,
 review_url: input.review_url ?? null,
 scans: 0,
 reviews: 0,
 active: true,
 created_at: new Date().toISOString(),
 }
 const list = [next, ...qrCodes]
 setQRCodes(list)
 try { localStorage.setItem(LS_LIST, JSON.stringify(list)) } catch {}
 return next
 }
 const r = await fetch('/api/qr-codes', {
 method: 'POST',
 credentials: 'include',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(input),
 })
 const j = await r.json()
 if (!j.ok) { setError(j.error); return null }
 const next = [j.qr_code, ...qrCodes]
 setQRCodes(next)
 writeCache(next)
 return j.qr_code
 }

 const update = async (id: string, patch: Partial<QRCode>) => {
 if (mode !== 'remote') {
 const list = qrCodes.map(q => q.id === id ? { ...q, ...patch } : q)
 setQRCodes(list)
 try { localStorage.setItem(LS_LIST, JSON.stringify(list)) } catch {}
 return
 }
 const r = await fetch('/api/qr-codes', {
 method: 'PUT',
 credentials: 'include',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ id, ...patch }),
 })
 const j = await r.json()
 if (!j.ok) { setError(j.error); return }
 const list = qrCodes.map(q => q.id === id ? { ...q, ...patch } : q)
 setQRCodes(list)
 writeCache(list)
 }

 const remove = async (id: string) => {
 if (mode !== 'remote') {
 const list = qrCodes.filter(q => q.id !== id)
 setQRCodes(list)
 try { localStorage.setItem(LS_LIST, JSON.stringify(list)) } catch {}
 return
 }
 const r = await fetch('/api/qr-codes?id=' + id, { method: 'DELETE', credentials: 'include' })
 const j = await r.json()
 if (!j.ok) { setError(j.error); return }
 const list = qrCodes.filter(q => q.id !== id)
 setQRCodes(list)
 writeCache(list)
 }

 const refresh = useCallback(async () => { await bootstrap() }, [bootstrap])

 return { qrCodes, mode, loading, error, add, update, remove, refresh }
}
