'use client'
export const dynamic = 'force-dynamic'

import { useState, useRef, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Camera, Image as ImageIcon, CheckCircle2, AlertTriangle, ClipboardList, Sparkles, Check, UtensilsCrossed } from 'lucide-react'

const BLUE = '#3182F6'
const BLUE_DARK = '#1B64DA'
const BLUE_BG = '#EFF6FF'
const BLACK = '#191F28'
const GRAY = '#8B95A1'
const BORDER = '#E5E8EB'

type Store = {
 slug: string; name: string; category: string; address: string
 keywords: string[]; naverUrl: string; greeting: string; signatures: string[]
}

type MenuItem = {
 name: string
 price?: number | null
 desc?: string | null
 is_signature?: boolean
}

// 하드코딩 데모 매장 제거됨 — 실제 매장 정보는 /api/stores/[slug] 또는 props로 주입
// 매장을 찾지 못하면 "매장을 찾을 수 없습니다" 안내 표시
const STORES: Record<string, Store> = {}

function sanitizeStoreId(raw: string | string[] | undefined): string {
 if (!raw) return 'default'
 let s = Array.isArray(raw) ? raw[0] : raw
 for (let i = 0; i < 2; i++) {
 try { const dec = decodeURIComponent(s); if (dec === s) break; s = dec } catch { break }
 }
 s = s.replace(/^\[+|\]+$/g, '').trim()
 if (/^\[.*\]$/.test(s)) s = s.replace(/^\[|\]$/g, '').trim()
 const lc = s.toLowerCase()
 if (!s || lc === 'storeid' || lc === 'storeid%5d' || lc.includes('[storeid]')) return 'default'
 return s
}

// 네이버 플레이스 URL에서 Place ID를 추출해 리뷰 작성 페이지 URL 반환
function getNaverReviewUrl(naverUrl: string): string {
 if (!naverUrl) return ''
 // https://m.place.naver.com/place/12345678
 // https://map.naver.com/v5/entry/place/12345678
 // https://m.place.naver.com/restaurant/12345678/home
 const parts = naverUrl.split('/')
 for (let i = 0; i < parts.length; i++) {
 const seg = parts[i]
 if (seg === 'place' || seg === 'restaurant' || seg === 'cafe' ||
 seg === 'beauty' || seg === 'hospital' || seg === 'hotel' ||
 seg === 'mart' || seg === 'pharmacy' || seg === 'accommodation') {
 const next = parts[i + 1]
 if (next && /^\d+$/.test(next)) {
 return 'https://m.place.naver.com/place/' + next + '/review/visitor/write'
 }
 }
 }
 // place ID를 찾지 못한 경우 원래 URL 반환
 return naverUrl
}

function toReadableName(storeId: string): string {
 if (!storeId || storeId === 'default') return '우리 매장'
 return storeId.replace(/-+/g, ' ').replace(/\s+/g, ' ').trim() || '우리 매장'
}

function getStore(storeId: string): Store {
 if (STORES[storeId]) return STORES[storeId]
 const readable = toReadableName(storeId)
 const isGeneric = readable === '우리 매장'
 return {
 slug: storeId, name: readable, category: '', address: '',
 keywords: ['맛있는 곳', '분위기 좋은 곳', '재방문 의사 있음'],
 naverUrl: 'https://m.place.naver.com/',
 greeting: isGeneric ? '방문해 주셔서 감사합니다' : (readable + '을(를) 방문해주셔서 감사합니다'),
 signatures: ['대표 메뉴'],
 }
}

type Photo = { id: string; cat: 'receipt' | 'photo'; url: string; label: string }
type LengthKey = 'short' | 'mid' | 'long'
type ReceiptStatus = 'idle' | 'checking' | 'ok' | 'warning' | 'confirm'

// ⭐ 2-C: 손님 활동 추적 (best-effort, 실패해도 사용자 흐름 유지)
function trackEvent(slug: string, event: string, meta?: any) {
 if (!slug) return
 try {
 fetch('/api/qr/track', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ slug, event, meta }),
 keepalive: true, // 페이지 닫혀도 fetch 완료 보장
 }).catch(() => null)
 } catch (_) {}
}

export default function ReviewPage() {
 const params = useParams<{ storeId: string }>()
 const searchParams = useSearchParams()
 const storeId = sanitizeStoreId(params?.storeId)
 const baseStore = getStore(storeId)

 const qpName = searchParams?.get('n') || ''
 const qpCat = searchParams?.get('t') || ''
 const qpAddr = searchParams?.get('a') || ''
 const qpKw = searchParams?.get('kw') || ''
 const qpNaver = searchParams?.get('naver') || ''
 const qpPid = searchParams?.get('pid') || ''

 const [store, setStore] = useState<Store>(() => {
 const hasQp = qpName || qpCat || qpAddr || qpNaver || qpPid
 if (hasQp) {
 const finalName = qpName || baseStore.name
 return {
 ...baseStore,
 name: finalName,
 category: qpCat || baseStore.category,
 address: qpAddr || baseStore.address,
 naverUrl: qpNaver || (qpPid ? `https://m.place.naver.com/place/${qpPid}/review/visitor/write` : baseStore.naverUrl),
 keywords: qpKw ? [qpKw, ...baseStore.keywords.slice(0, 3)] : baseStore.keywords,
 greeting: qpName ? (finalName + '을(를) 방문해주셔서 감사합니다') : baseStore.greeting,
 }
 }
 return baseStore
 })

 useEffect(() => {
 if (qpName || qpAddr || qpNaver || qpPid) return
 try {
 const raw = window.localStorage.getItem('localution.store_info')
 if (!raw) return
 const info = JSON.parse(raw)
 if (!info || !info.connected) return
 let slug = ''
 const lower = (info.name || '').toLowerCase()
 for (let i = 0; i < lower.length; i++) {
 const c = lower.charCodeAt(i)
 const ok = (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || (c >= 0xAC00 && c <= 0xD7A3)
 slug += ok ? lower[i] : '-'
 }
 while (slug.includes('--')) slug = slug.split('--').join('-')
 if (slug.startsWith('-')) slug = slug.slice(1)
 if (slug.endsWith('-')) slug = slug.slice(0, -1)
 if (storeId === slug || storeId.includes(slug) || slug.includes(storeId) || !STORES[storeId]) {
 setStore(prev => ({
 ...prev,
 name: info.name || prev.name,
 category: info.category || prev.category,
 address: info.location || prev.address,
 naverUrl: info.naverUrl || prev.naverUrl,
 greeting: info.name ? (info.name + '을(를) 방문해주셔서 감사합니다') : prev.greeting,
 }))
 }
 } catch (_) {}
 }, [storeId, qpName, qpAddr, qpNaver, qpPid])

 // 2-A: 공개 매장 정보 API 우선 — 손님 페이지에서 정확한 매장 식별
 // /api/qr/store/{slug} (인증 불필요, 공개 정보만)
 // → 사장님이 매장 정보 변경해도 QR URL 그대로 자동 반영
 useEffect(() => {
 if (!storeId || storeId === 'default') return
 let alive = true
 ;(async () => {
 try {
 // 1차: 새 공개 API (slug 기반, 인증 X)
 const qrRes = await fetch('/api/qr/store/' + encodeURIComponent(storeId), { cache: 'no-store' })
 if (qrRes.ok) {
 const qj = await qrRes.json()
 if (!alive || !qj?.ok || !qj.store) return
 const s = qj.store
 setStore(prev => ({
 ...prev,
 name: s.name || prev.name,
 category: s.category || prev.category,
 address: s.address || prev.address,
 naverUrl: s.naverUrl || (s.naverPlaceId
 ? `https://m.place.naver.com/place/${s.naverPlaceId}/review/visitor/write`
 : (s.naverExternalPlaceId
 ? `https://m.place.naver.com/place/${s.naverExternalPlaceId}/review/visitor/write`
 : prev.naverUrl)),
 greeting: s.name ? (s.name + '을(를) 방문해주셔서 감사합니다') : prev.greeting,
 }))
 return
 }

 // 2차 fallback: 기존 (인증된 사장님 자기 매장 조회 — 호환용)
 if (qpName || qpAddr || qpNaver || qpPid) return
 const res = await fetch('/api/stores/' + encodeURIComponent(storeId), { cache: 'no-store' })
 if (!res.ok) return
 const j = await res.json()
 if (!alive || !j?.ok || !j.store) return
 const s = j.store
 setStore(prev => ({
 ...prev,
 name: s.name || prev.name,
 category: s.category || prev.category,
 address: s.address || s.location || prev.address,
 naverUrl: s.naver_url || (s.naver_place_id ? `https://m.place.naver.com/place/${s.naver_place_id}/review/visitor/write` : prev.naverUrl),
 keywords: (s.main_keyword || (s.sub_keywords && s.sub_keywords.length))
 ? [s.main_keyword, ...(s.sub_keywords || []), ...prev.keywords.slice(0, 2)].filter(Boolean)
 : prev.keywords,
 greeting: s.name ? (s.name + '을(를) 방문해주셔서 감사합니다') : prev.greeting,
 }))
 } catch (_) {}
 })()
 return () => { alive = false }
 }, [storeId, qpName, qpAddr, qpNaver, qpPid])

 // 매장 메뉴 가져오기 (사장님이 등록한 메뉴 — AI가 실제 메뉴만 언급)
 useEffect(() => {
 let alive = true
 ;(async () => {
 try {
 const r = await fetch('/api/menu/public?slug=' + encodeURIComponent(storeId), { cache: 'no-store' })
 if (!r.ok) return
 const j = await r.json()
 if (!alive || !j?.ok || !Array.isArray(j.items)) return
 const menu: MenuItem[] = j.items.map((it: any) => ({
 name: it.name_ko || it.name_en || '',
 price: typeof it.price === 'number' ? it.price : null,
 desc: it.desc_ko || null,
 is_signature: !!it.is_signature,
 })).filter((m: MenuItem) => m.name)
 setStoreMenu(menu)
 } catch {}
 })()
 return () => { alive = false }
 }, [storeId])

 const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0)
 const [photos, setPhotos] = useState<Photo[]>([])
 const [receiptStatus, setReceiptStatus] = useState<ReceiptStatus>('idle')
 const [gender, setGender] = useState<'F' | 'M' | '-'>('-')
 const [age, setAge] = useState<string>('30s')
 const [tone, setTone] = useState<string>('warm')
 const [length, setLength] = useState<LengthKey>('mid')
 const [drafting, setDrafting] = useState(false)
 const [advancing, setAdvancing] = useState(false)
 const [draft, setDraft] = useState('')
 const [final, setFinal] = useState('')
 // ⭐ 2-B: 영수증 OCR 결과 + AI 진행 상태
 const [receiptInfo, setReceiptInfo] = useState<{ items: string[]; storeName?: string; total?: string; matched?: boolean } | null>(null)
 const [storeMenu, setStoreMenu] = useState<MenuItem[]>([])
 const [aiSource, setAiSource] = useState<'ai' | 'fallback' | null>(null)
 const [aiHashtags, setAiHashtags] = useState<string[]>([])
 const [copied, setCopied] = useState(false)

 const albumRef = useRef<HTMLInputElement>(null)
 const cameraRef = useRef<HTMLInputElement>(null)
 const [uploadCat, setUploadCat] = useState<'receipt' | 'photo'>('receipt')

 // ⭐ 2-C: 페이지 진입 = QR 스캔 이벤트 (storeId 가 default 가 아닐 때만)
 useEffect(() => {
 if (!storeId || storeId === 'default') return
 trackEvent(storeId, 'scan', { has_qp: !!(qpName || qpAddr || qpNaver || qpPid) })
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [storeId])

 // ── 2-B: 영수증 OCR 검증 — 서버 Claude OCR 우선 + TextDetector fallback ──
 useEffect(() => {
 const receipt = photos.find(p => p.cat === 'receipt')
 if (!receipt) { setReceiptStatus('idle'); setReceiptInfo(null); return }
 if (receiptStatus === 'ok') return // 이미 확인됨
 setReceiptStatus('checking')

 let alive = true
 ;(async () => {
 // 1차: 서버 Claude Vision OCR (정확도 최고, items 추출도 가능)
 try {
 const ocrController = new AbortController()
 const ocrTimer = setTimeout(() => ocrController.abort(), 25000) // 25초 (서버 20s + 여유)
 const ocrRes = await fetch('/api/qr-review-generate', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 action: 'ocr',
 receiptImage: receipt.url,
 expectedStoreName: store.name,
 }),
 signal: ocrController.signal,
 })
 clearTimeout(ocrTimer)
 if (ocrRes.ok) {
 const j = await ocrRes.json()
 const info = j?.receiptInfo
 if (alive && info) {
 setReceiptInfo({
 items: Array.isArray(info.items) ? info.items.slice(0, 5) : [],
 storeName: info.storeName || undefined,
 total: info.total || undefined,
 matched: !!info.matched,
 })
 // matched 가 명시되면 그것 우선, 아니면 storeName 비교
 const ocrName = String(info.storeName || '').toLowerCase()
 const ourName = store.name.toLowerCase()
 const fuzzyMatch = ocrName && ourName && (
 ocrName.includes(ourName.split(' ')[0]) ||
 ourName.includes(ocrName.split(' ')[0])
 )
 const ok = info.matched === true || (info.matched !== false && fuzzyMatch)
 setReceiptStatus(ok ? 'ok' : 'warning')
 // 2-C 추적: 영수증 업로드 + 일치 여부
 trackEvent(storeId, 'receipt_uploaded', {
 items_count: Array.isArray(info.items) ? info.items.length : 0,
 total: info.total || null,
 })
 if (ok) trackEvent(storeId, 'receipt_verified', { ocr_store: info.storeName || null })
 return
 }
 }
 } catch (_) {}

 // 2차 fallback: 클라이언트 TextDetector (Chrome 만 지원)
 if (typeof window !== 'undefined' && 'TextDetector' in window) {
 try {
 const detector = new (window as any).TextDetector()
 const img = new Image()
 img.src = receipt.url
 await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej })
 const results = await detector.detect(img)
 const ocrText = results.map((r: any) => r.rawValue).join(' ').toLowerCase()
 const nameWords = store.name.toLowerCase().split(/[\s\-]+/).filter((w: string) => w.length >= 2)
 const found = nameWords.some((w: string) => ocrText.includes(w))
 if (!alive) return
 setReceiptStatus(found ? 'ok' : 'warning')
 return
 } catch (_) {}
 }

 // 3차 fallback: 사용자에게 수동 확인 요청
 if (!alive) return
 setReceiptStatus('confirm')
 })()
 return () => { alive = false }
 }, [photos, store.name])

 // 이미지 압축 — Vision API 속도 향상 핵심 (4MB → 200KB, 1024px max)
 const compressImage = (file: File, maxSize = 1024, quality = 0.82): Promise<string> => {
 return new Promise((resolve, reject) => {
 const reader = new FileReader()
 reader.onload = () => {
 const img = new Image()
 img.onload = () => {
 const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1)
 const w = Math.round(img.width * ratio)
 const h = Math.round(img.height * ratio)
 const canvas = document.createElement('canvas')
 canvas.width = w; canvas.height = h
 const ctx = canvas.getContext('2d')
 if (!ctx) { resolve(String(reader.result)); return }
 ctx.drawImage(img, 0, 0, w, h)
 try {
 resolve(canvas.toDataURL('image/jpeg', quality))
 } catch {
 resolve(String(reader.result))
 }
 }
 img.onerror = () => resolve(String(reader.result))
 img.src = String(reader.result)
 }
 reader.onerror = reject
 reader.readAsDataURL(file)
 })
 }

 const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const files = e.target.files
 if (!files || files.length === 0) return
 const arr = Array.from(files)
 const buffer: Photo[] = []
 // 영수증은 OCR 정확도 위해 큰 해상도 + 고품질 유지 (작은 글자)
 // 일반 사진은 분위기만 파악하면 되므로 작게 압축
 const isReceipt = uploadCat === 'receipt'
 const maxDim = isReceipt ? 1800 : 1024
 const quality = isReceipt ? 0.92 : 0.82
 for (const f of arr) {
 try {
 const url = await compressImage(f, maxDim, quality)
 buffer.push({ id: Date.now() + '-' + Math.random().toString(36).slice(2, 8), cat: uploadCat, url, label: f.name })
 } catch {
 // 압축 실패 시 원본 사용
 const reader = new FileReader()
 const url = await new Promise<string>(r => { reader.onload = () => r(String(reader.result)); reader.readAsDataURL(f) })
 buffer.push({ id: Date.now() + '-' + Math.random().toString(36).slice(2, 8), cat: uploadCat, url, label: f.name })
 }
 }
 setPhotos(prev => [...prev, ...buffer])
 if (uploadCat === 'receipt') setReceiptStatus('checking')
 if (uploadCat === 'photo') {
 trackEvent(storeId, 'photo_uploaded', { count: buffer.length })
 }
 e.target.value = ''
 }

 const openAlbum = (cat: 'receipt' | 'photo') => { setUploadCat(cat); setTimeout(() => albumRef.current?.click(), 0) }
 const openCamera = (cat: 'receipt' | 'photo') => { setUploadCat(cat); setTimeout(() => cameraRef.current?.click(), 0) }

 const removePhoto = (id: string) => {
 setPhotos(prev => {
 const next = prev.filter(p => p.id !== id)
 if (!next.some(p => p.cat === 'receipt')) setReceiptStatus('idle')
 return next
 })
 }

 const recordSubmission = () => {
 if (typeof window === 'undefined') return
 try {
 const key = 'localution.review_stats'
 const raw = window.localStorage.getItem(key)
 const arr: any[] = raw ? (JSON.parse(raw) || []) : []
 arr.push({ ts: Date.now(), storeId, storeName: store.name, gender, age, tone, length, photoCount: photos.length, hasReceipt: photos.some(p => p.cat === 'receipt'), hasPhoto: photos.some(p => p.cat === 'photo') })
 if (arr.length > 1000) arr.splice(0, arr.length - 1000)
 window.localStorage.setItem(key, JSON.stringify(arr))
 } catch (_) {}
 }

 // ⭐ 2-B: 서버 AI 리뷰 생성 우선 + 실패 시 buildReview fallback
 // tone 매핑: page.tsx 의 'warm/short/detail/casual/funny' → API 의 'mom/honest/insta/friend/z'
 const TONE_MAP: Record<string, string> = {
 warm: 'mom', // 따뜻한 → 맘카페 스타일
 detail: 'gourmet', // 상세 → 미식가 (전문)
 short: 'honest', // 짧고 정확 → 솔직담백
 casual: 'z', // 캐주얼 → Z세대
 funny: 'friend', // 유쾌한 → 친구 카톡
 }
 const startGenerate = async () => {
 setDrafting(true)
 setAiSource(null)
 setAiHashtags([])
 recordSubmission()

 try {
 // 사진 url (data:base64 형식) 모음 — 서버에 sample 3장만
 const photoUrls = photos
 .filter(p => p.cat === 'photo')
 .map(p => p.url)
 .slice(0, 3)
 const receiptUrl = photos.find(p => p.cat === 'receipt')?.url

 const apiTone = TONE_MAP[tone] || 'mom'
 const rating = 5 // 손님이 QR 통해 자발적 리뷰 — 일반적으로 긍정

 // 클라이언트 타임아웃 45초 — 서버 maxDuration(50s) 직전 fallback
 const controller = new AbortController()
 const timer = setTimeout(() => controller.abort(), 45000)

 const res = await fetch('/api/qr-review-generate', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 action: 'generate',
 images: receiptUrl ? [receiptUrl, ...photoUrls].slice(0, 3) : photoUrls,
 storeName: store.name,
 storeType: store.category,
 mainKeyword: store.keywords?.[0] || '',
 comment: '',
 tone: apiTone,
 rating,
 receiptItems: receiptInfo?.items || [],
 // 매장이 등록한 실제 메뉴 — AI 가 가짜 메뉴 만드는 것 방지
 storeMenu: storeMenu.slice(0, 30).map(m => ({
 name: m.name,
 price: m.price,
 signature: m.is_signature,
 })),
 }),
 signal: controller.signal,
 })
 clearTimeout(timer)

 if (res.ok) {
 const j = await res.json()
 if (j?.review && typeof j.review === 'string' && j.review.length > 20) {
 setDraft(j.review)
 if (Array.isArray(j.hashtags)) setAiHashtags(j.hashtags.slice(0, 5))
 setAiSource('ai')
 setDrafting(false)
 // 2-C 추적
 trackEvent(storeId, 'ai_generated', {
 tone: apiTone, length, ai_source: 'ai',
 char_count: j.review.length,
 has_receipt: photos.some(p => p.cat === 'receipt'),
 has_photo: photos.some(p => p.cat === 'photo'),
 })
 setStep(3)
 return
 }
 }
 } catch (_) {}

 // Fallback: 로컬 buildReview (AI 호출 실패 / API 키 없음)
 const fallbackText = buildReview(store, gender, age, tone, length, photos)
 setDraft(fallbackText)
 setAiSource('fallback')
 setDrafting(false)
 trackEvent(storeId, 'ai_generated', {
 tone, length, ai_source: 'fallback', char_count: fallbackText.length,
 })
 setStep(3)
 }

 const advance = () => {
 setAdvancing(true)
 setTimeout(() => { setFinal(draft.trim()); setAdvancing(false); setStep(4) }, 600)
 }

 const copyAndGoNaver = async () => {
 try { await navigator.clipboard.writeText(final) } catch {
 const el = document.createElement('textarea')
 el.value = final
 document.body.appendChild(el)
 el.select()
 document.execCommand('copy')
 document.body.removeChild(el)
 }
 setCopied(true)
 setTimeout(() => setCopied(false), 2500)
 // 2-C 추적: 네이버 등록 클릭
 trackEvent(storeId, 'submitted_naver', {
 char_count: final.length,
 tone, length, rating: 5,
 has_receipt: photos.some(p => p.cat === 'receipt'),
 has_photo: photos.some(p => p.cat === 'photo'),
 })
 const reviewUrl = getNaverReviewUrl(store.naverUrl)
 setTimeout(() => window.open(reviewUrl, '_blank'), 350)
 }

 const reset = () => { setStep(0); setPhotos([]); setReceiptStatus('idle'); setDraft(''); setFinal('') }

 const toneOptions = [
 { k: 'warm', l: '따뜻하게', d: '감성적이고 다정한' },
 { k: 'casual', l: '친근하게', d: '친구에게 말하듯' },
 { k: 'short', l: '심플하게', d: '핵심만 깔끔하게' },
 { k: 'detail', l: '자세하게', d: '구체적인 경험 중심' },
 { k: 'funny', l: '유머러스하게', d: '재치있고 재미있게' },
 { k: 'emotional', l: '감성 충만', d: '여운과 감동 중심' },
 { k: 'pro', l: '꼼꼼하게', d: '전문적이고 상세하게' },
 { k: 'honest', l: '솔직하게', d: '장단점 균형있게' },
 ]

 const hasReceipt = photos.some(p => p.cat === 'receipt')

 return (
 <div style={{ background: '#F7F8FA', minHeight: '100vh', color: BLACK }}>
 <input ref={albumRef} type="file" accept="image/*" multiple hidden onChange={handleFile} />
 <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={handleFile} />

 <header className="px-5 pt-8 pb-6 text-white" style={{ background: `linear-gradient(180deg, ${BLUE} 0%, ${BLUE_DARK} 100%)` }}>
 <div className="max-w-[520px] mx-auto">
 <div className="flex items-center gap-2 text-xs opacity-90 mb-1">
 <span>{store.category}</span>
 {store.address && (<><span>·</span><span>{store.address}</span></>)}
 </div>
 <h1 className="text-2xl font-black mb-1">{store.name}</h1>
 <p className="text-sm opacity-95">{store.greeting}</p>
 <div className="flex gap-1.5 mt-5">
 {[0, 1, 2, 3, 4].map(i => (
 <div key={i} className="flex-1 h-1.5 rounded-full" style={{ background: i <= step ? '#ffffff' : 'rgba(255,255,255,0.3)' }} />
 ))}
 </div>
 </div>
 </header>

 <main className="max-w-[520px] mx-auto px-5 py-6">

 {/* ── Step 0: 소개 ── */}
 {step === 0 && (
 <div className="space-y-4">
 <div className="bg-white rounded-2xl p-5 shadow-sm">
 <h2 className="text-xl font-black mb-2">1분만에 네이버 리뷰 작성</h2>
 {store.naverUrl && store.naverUrl !== 'https://m.place.naver.com/' && (
 <div className="flex items-center gap-1.5 mb-2">
 <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-black" style={{ background: '#03C75A' }}>N</span>
 <span className="text-[11px] font-bold" style={{ color: '#03C75A' }}>네이버 플레이스 인증 매장</span>
 </div>
 )}
 <p className="text-sm leading-relaxed" style={{ color: GRAY }}>
 사장님을 위해 방문 후기를 AI가 대신 써드려요.<br />
 영수증과 사진만 올려주시면 끝!
 </p>
 <div className="mt-5 space-y-2.5">
 {[
 { n: 1, t: '영수증 · 사진 업로드 (20초)' },
 { n: 2, t: '나이대 · 말투 · 길이 선택 (10초)' },
 { n: 3, t: 'AI 리뷰 생성 + 직접 수정 (20초)' },
 { n: 4, t: '복사 → 네이버 붙여넣기 (10초)' },
 ].map(s => (
 <div key={s.n} className="flex items-start gap-3 text-sm">
 <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0" style={{ background: BLUE }}>{s.n}</span>
 <span className="flex-1 pt-0.5" style={{ color: '#4E5968' }}>{s.t}</span>
 </div>
 ))}
 </div>
 </div>
 <div className="bg-white rounded-2xl p-4 shadow-sm">
 <p className="text-[11px] font-bold mb-2" style={{ color: BLUE }}>AI가 자동으로 처리해드리는 것</p>
 <ul className="text-xs space-y-1" style={{ color: '#4E5968' }}>
 <li>· 영수증 스캔으로 매장 일치 여부 자동 확인</li>
 <li>· 사진 AI 분석 (음식 · 서비스 · 전경 자동 구분)</li>
 <li>· {store.name} 맞춤 SEO 키워드 자동 삽입</li>
 <li>· 나이 · 말투 · 길이 기반 자연스러운 문장</li>
 <li>· AI 티 안 나는 구어체 블로거 스타일</li>
 </ul>
 </div>
 <button onClick={() => setStep(1)} className="w-full py-4 rounded-2xl font-black text-white text-base shadow-lg" style={{ background: BLUE }}>
 시작하기
 </button>
 </div>
 )}

 {/* ── Step 1: 업로드 ── */}
 {step === 1 && (
 <div className="space-y-4">
 <div>
 <h2 className="text-lg font-black mb-1">영수증과 사진을 올려주세요</h2>
 <p className="text-xs" style={{ color: GRAY }}>영수증 1장 + 사진 몇 장이면 AI가 알아서 분석해요</p>
 </div>

 <div className="space-y-2">
 {([
 { cat: 'receipt', label: '영수증', desc: '스캔으로 매장 자동 인식', Icon: ClipboardList },
 { cat: 'photo', label: '사진', desc: '음식 · 서비스 · 전경 등', Icon: Camera },
 ] as const).map(c => {
 const count = photos.filter(p => p.cat === c.cat).length
 const active = count > 0
 return (
 <div key={c.cat} className="p-4 rounded-2xl border-2 border-dashed bg-white transition-colors" style={{ borderColor: active ? BLUE : BORDER }}>
 <div className="flex items-center gap-3 mb-3">
 <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: BLUE_BG, color: BLUE }}>
 <c.Icon size={20} strokeWidth={2.5} />
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2">
 <span className="font-black text-sm" style={{ color: BLACK }}>{c.label}</span>
 {active && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: BLUE }}>{count}장</span>}
 </div>
 <p className="text-[11px] mt-0.5" style={{ color: GRAY }}>{c.desc}</p>
 </div>
 </div>
 <div className="grid grid-cols-2 gap-2">
 <button onClick={() => openCamera(c.cat)}
 className="py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-1.5 shadow-sm"
 style={{ background: BLUE }}>
 <Camera size={16} strokeWidth={2.5} /><span>바로 촬영</span>
 </button>
 <button onClick={() => openAlbum(c.cat)}
 className="py-3 rounded-xl text-sm font-bold border-2 flex items-center justify-center gap-1.5 bg-white"
 style={{ borderColor: BLUE, color: BLUE }}>
 <ImageIcon size={16} strokeWidth={2.5} /><span>앨범에서</span>
 </button>
 </div>
 </div>
 )
 })}
 </div>

 {/* ── 영수증 스캔 검증 UI ── */}
 {hasReceipt && (
 <div>
 {receiptStatus === 'checking' && (
 <div className="p-3.5 rounded-2xl flex items-center gap-3" style={{ background: BLUE_BG, border: `1px solid #BFDBFE` }}>
 <div className="w-4 h-4 rounded-full border-2 animate-spin flex-shrink-0" style={{ borderColor: '#BFDBFE', borderTopColor: BLUE }} />
 <p className="text-xs font-semibold" style={{ color: BLUE }}>영수증 스캔 중... {store.name} 일치 여부 확인하고 있어요</p>
 </div>
 )}
 {receiptStatus === 'ok' && (
 <div className="p-3.5 rounded-2xl" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
 <div className="flex items-center gap-3">
 <CheckCircle2 size={18} className="flex-shrink-0 text-[#059669]" strokeWidth={2.5} />
 <p className="text-xs font-bold" style={{ color: '#059669' }}>
 {store.name} 영수증 확인됐어요!
 {receiptInfo?.items && receiptInfo.items.length > 0 ? ' 메뉴 자동 인식 완료' : ' AI 가 분석할게요'}
 </p>
 </div>
 {receiptInfo?.items && receiptInfo.items.length > 0 && (
 <div className="mt-2 pl-7 flex flex-wrap gap-1">
 {receiptInfo.items.slice(0, 4).map((it, i) => (
 <span key={i} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-white border border-[#BBF7D0] text-[#059669] font-medium">
 <UtensilsCrossed size={10} strokeWidth={2.5} /> {it}
 </span>
 ))}
 </div>
 )}
 </div>
 )}
 {receiptStatus === 'warning' && (
 <div className="p-3.5 rounded-2xl" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
 <p className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: '#D97706' }}><AlertTriangle size={13} strokeWidth={2.5} /> 영수증에서 {store.name} 정보를 찾지 못했어요</p>
 <p className="text-[11px] mb-3" style={{ color: '#92400E' }}>{store.name}의 영수증이 맞나요? 맞으면 계속 진행할 수 있어요.</p>
 <div className="flex gap-2">
 <button onClick={() => setReceiptStatus('ok')}
 className="flex-1 py-2 rounded-xl text-xs font-bold text-white" style={{ background: '#059669' }}>
 맞아요, 계속할게요
 </button>
 <button onClick={() => { setPhotos(p => p.filter(x => x.cat !== 'receipt')); setReceiptStatus('idle') }}
 className="flex-1 py-2 rounded-xl text-xs font-bold border-2 bg-white" style={{ borderColor: BORDER, color: '#4E5968' }}>
 다시 올릴게요
 </button>
 </div>
 </div>
 )}
 {receiptStatus === 'confirm' && (
 <div className="p-3.5 rounded-2xl" style={{ background: BLUE_BG, border: `1px solid #BFDBFE` }}>
 <p className="text-xs font-bold mb-1 flex items-center gap-1.5" style={{ color: BLUE }}><ClipboardList size={13} strokeWidth={2.5} /> 영수증 확인</p>
 <p className="text-[11px] mb-3" style={{ color: '#1D4ED8' }}>이 영수증이 <strong>{store.name}</strong>에서 발행된 영수증이 맞나요?</p>
 <div className="flex gap-2">
 <button onClick={() => setReceiptStatus('ok')}
 className="flex-1 py-2 rounded-xl text-xs font-bold text-white" style={{ background: BLUE }}>
 <span className="inline-flex items-center gap-1 justify-center"><Check size={12} strokeWidth={3} /> 맞아요</span>
 </button>
 <button onClick={() => { setPhotos(p => p.filter(x => x.cat !== 'receipt')); setReceiptStatus('idle') }}
 className="flex-1 py-2 rounded-xl text-xs font-bold border-2 bg-white" style={{ borderColor: BORDER, color: '#4E5968' }}>
 다시 올릴게요
 </button>
 </div>
 </div>
 )}
 </div>
 )}

 {photos.length > 0 && (
 <div className="bg-white rounded-2xl p-3 space-y-2 shadow-sm">
 <p className="text-xs font-bold px-1" style={{ color: '#4E5968' }}>업로드된 파일 {photos.length}장</p>
 <div className="grid grid-cols-3 gap-2">
 {photos.map(p => (
 <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
 <img src={p.url} alt={p.label} className="w-full h-full object-cover" />
 <button onClick={() => removePhoto(p.id)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs font-bold flex items-center justify-center">×</button>
 <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 bg-black/50 text-[10px] text-white text-center">{p.cat === 'receipt' ? '영수증' : '사진'}</div>
 </div>
 ))}
 </div>
 </div>
 )}

 <div className="flex gap-2">
 <button onClick={() => setStep(0)} className="flex-1 py-4 rounded-2xl font-bold text-sm border-2 bg-white" style={{ borderColor: BLUE, color: BLUE }}>이전</button>
 <button
 onClick={() => setStep(2)}
 disabled={photos.length === 0 || (hasReceipt && receiptStatus === 'checking')}
 className="flex-[2] py-4 rounded-2xl font-black text-white text-base shadow-lg disabled:opacity-40"
 style={{ background: BLUE }}>
 {receiptStatus === 'checking' ? '영수증 확인 중...' : photos.length === 0 ? '파일을 올려주세요' : `다음 (${photos.length}장)`}
 </button>
 </div>
 </div>
 )}

 {/* ── Step 2: 스타일 선택 ── */}
 {step === 2 && (
 <div className="space-y-5">
 <div>
 <h2 className="text-lg font-black mb-1">리뷰 스타일을 골라주세요</h2>
 <p className="text-xs" style={{ color: GRAY }}>AI가 맞춤 리뷰를 작성합니다</p>
 </div>

 {/* 성별 */}
 <div>
 <label className="text-sm font-bold mb-2 block">성별 (선택)</label>
 <div className="grid grid-cols-3 gap-2">
 {([['F', '여성'], ['M', '남성'], ['-', '미표시']] as [string, string][]).map(([k, l]) => (
 <button key={k} onClick={() => setGender(k as 'F' | 'M' | '-')}
 className="py-3 rounded-xl text-sm font-bold border-2 transition-colors"
 style={{ borderColor: gender === k ? BLUE : BORDER, background: gender === k ? BLUE : '#fff', color: gender === k ? '#fff' : '#4E5968' }}>
 {l}
 </button>
 ))}
 </div>
 </div>

 {/* 나이대 */}
 <div>
 <label className="text-sm font-bold mb-2 block">나이대</label>
 <div className="grid grid-cols-5 gap-1.5">
 {['10s', '20s', '30s', '40s', '50s+'].map(a => (
 <button key={a} onClick={() => setAge(a)}
 className="py-3 rounded-xl text-sm font-bold border-2 transition-colors"
 style={{ borderColor: age === a ? BLUE : BORDER, background: age === a ? BLUE : '#fff', color: age === a ? '#fff' : '#4E5968' }}>
 {a === '50s+' ? '50+' : a.replace('s', '')}
 </button>
 ))}
 </div>
 </div>

 {/* 말투 — 8종 */}
 <div>
 <label className="text-sm font-bold mb-2 block">말투</label>
 <div className="grid grid-cols-2 gap-2">
 {toneOptions.map(t => (
 <button key={t.k} onClick={() => setTone(t.k)}
 className="p-3 rounded-xl text-left border-2 transition-colors"
 style={{ borderColor: tone === t.k ? BLUE : BORDER, background: tone === t.k ? BLUE_BG : '#fff' }}>
 <div className="font-black text-sm" style={{ color: tone === t.k ? BLUE : BLACK }}>{t.l}</div>
 <div className="text-[11px] mt-0.5" style={{ color: GRAY }}>{t.d}</div>
 </button>
 ))}
 </div>
 </div>

 {/* 리뷰 길이 */}
 <div>
 <label className="text-sm font-bold mb-2 block">리뷰 길이</label>
 <div className="grid grid-cols-3 gap-2">
 {([
 { k: 'short', l: '짧음', d: '약 150자' },
 { k: 'mid', l: '중간', d: '약 250자' },
 { k: 'long', l: '길게', d: '약 400자' },
 ] as Array<{ k: LengthKey; l: string; d: string }>).map(x => (
 <button key={x.k} onClick={() => setLength(x.k)}
 className="p-3 rounded-xl text-center border-2 transition-colors"
 style={{ borderColor: length === x.k ? BLUE : BORDER, background: length === x.k ? BLUE_BG : '#fff' }}>
 <div className="font-black text-sm" style={{ color: length === x.k ? BLUE : BLACK }}>{x.l}</div>
 <div className="text-[11px] mt-0.5" style={{ color: GRAY }}>{x.d}</div>
 </button>
 ))}
 </div>
 </div>

 <div className="flex gap-2">
 <button onClick={() => setStep(1)} className="flex-1 py-4 rounded-2xl font-bold text-sm border-2 bg-white" style={{ borderColor: BLUE, color: BLUE }}>이전</button>
 <button onClick={startGenerate} disabled={drafting}
 className="flex-[2] py-4 rounded-2xl font-black text-white text-base shadow-lg disabled:opacity-60"
 style={{ background: BLUE }}>
 {drafting ? 'AI가 리뷰 작성 중...' : 'AI 리뷰 생성하기'}
 </button>
 </div>
 </div>
 )}

 {/* ── Step 3: 초안 확인 ── */}
 {step === 3 && (
 <div className="space-y-4">
 <div>
 <h2 className="text-lg font-black mb-1 flex items-center gap-1.5">
 {aiSource === 'ai' && <Sparkles size={16} className="text-[#7C3AED]" strokeWidth={2.5} />}
 {aiSource === 'ai' ? 'AI가 사진과 영수증을 분석했어요' : 'AI 초안이 완성됐어요'}
 </h2>
 <p className="text-xs" style={{ color: GRAY }}>내용을 직접 수정할 수도 있어요. 다 됐으면 아래 다음 버튼을 눌러주세요</p>
 </div>

 {/* 영수증 OCR 결과 — AI 가 메뉴 인식 시 노출 */}
 {receiptInfo && receiptInfo.items && receiptInfo.items.length > 0 && (
 <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-3">
 <p className="text-[11px] font-bold mb-1.5 text-[#92400E] flex items-center gap-1.5"><ClipboardList size={11} strokeWidth={2.5} /> 영수증에서 인식된 메뉴</p>
 <div className="flex flex-wrap gap-1.5">
 {receiptInfo.items.map((it, i) => (
 <span key={i} className="text-[11px] px-2.5 py-0.5 rounded-full bg-white text-[#92400E] font-medium border border-[#FDE68A]">
 {it}
 </span>
 ))}
 </div>
 {receiptInfo.total && (
 <p className="text-[11px] text-[#9A3412] mt-1.5">합계: <strong>{receiptInfo.total}</strong></p>
 )}
 </div>
 )}

 <div className="bg-white rounded-2xl p-5 shadow-sm">
 <div className="flex items-center gap-2 mb-3 flex-wrap">
 <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full text-white" style={{ background: aiSource === 'ai' ? '#7C3AED' : BLUE }}>
 {aiSource === 'ai' ? (<><Sparkles size={10} strokeWidth={2.5} /> AI 작성</>) : 'AI 초안'}
 </span>
 <span className="text-[11px]" style={{ color: GRAY }}>{draft.length}자 · 직접 수정 가능</span>
 {aiSource === 'ai' && (
 <span className="text-[10px] text-[#7C3AED] font-medium">사진 · 영수증 · 매장 정보 분석 완료</span>
 )}
 </div>
 <textarea
 value={draft}
 onChange={e => setDraft(e.target.value)}
 className="w-full min-h-[240px] text-sm leading-relaxed border-none outline-none resize-none bg-transparent"
 style={{ color: BLACK }}
 />
 </div>

 {/* AI 가 만든 해시태그 */}
 {aiHashtags.length > 0 && (
 <div className="bg-white rounded-xl p-3" style={{ border: '1px solid ' + BORDER }}>
 <p className="text-[11px] font-bold mb-2 text-[#7C3AED] flex items-center gap-1.5"><Sparkles size={11} strokeWidth={2.5} /> AI 추천 해시태그 (선택)</p>
 <div className="flex flex-wrap gap-1.5">
 {aiHashtags.map(h => (
 <button
 key={h}
 onClick={() => {
 // 클릭 시 본문 끝에 해시태그 토글 추가/제거
 if (draft.includes(h)) {
 setDraft(draft.replace(new RegExp(`\\s*${h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'), ''))
 } else {
 setDraft(draft.trim() + '\n\n' + h)
 }
 }}
 className={`text-[11px] px-2.5 py-1 rounded-full font-bold transition-colors ${
 draft.includes(h)
 ? 'bg-[#7C3AED] text-white'
 : 'bg-[#F3E8FF] text-[#7C3AED] hover:bg-[#E9D5FF]'
 }`}>
 {h}
 </button>
 ))}
 </div>
 <p className="text-[10px] text-[#8B95A1] mt-1.5">탭하면 본문에 추가/제거됩니다</p>
 </div>
 )}

 <div className="bg-white rounded-xl p-3" style={{ border: '1px solid ' + BORDER }}>
 <p className="text-[11px] font-bold mb-2" style={{ color: BLUE }}>포함된 SEO 키워드</p>
 <div className="flex flex-wrap gap-1.5">
 {store.keywords.map(k => (
 <span key={k} className="text-[11px] px-2.5 py-1 rounded-full font-bold" style={{ background: BLUE_BG, color: BLUE }}>{k}</span>
 ))}
 </div>
 </div>
 <div className="flex gap-2">
 <button onClick={() => setStep(2)} className="flex-1 py-4 rounded-2xl font-bold text-sm border-2 bg-white" style={{ borderColor: BLUE, color: BLUE }}>이전</button>
 <button onClick={advance} disabled={advancing || draft.trim().length === 0}
 className="flex-[2] py-4 rounded-2xl font-black text-white text-sm shadow-lg disabled:opacity-60"
 style={{ background: BLUE }}>
 {advancing ? '준비 중...' : '다음'}
 </button>
 </div>
 </div>
 )}

 {/* ── Step 4: 최종 ── */}
 {step === 4 && (
 <div className="space-y-4">
 <div>
 <h2 className="text-lg font-black mb-1">리뷰 준비 완료</h2>
 <p className="text-xs" style={{ color: GRAY }}>아래 버튼 한 번이면 복사 + 네이버 이동까지 끝나요</p>
 </div>
 <div className="bg-white rounded-2xl p-5 shadow-sm">
 <div className="flex items-center gap-2 mb-3">
 <span className="text-[11px] font-bold px-2 py-1 rounded-full text-white" style={{ background: BLUE }}>최종본</span>
 <span className="text-[11px]" style={{ color: GRAY }}>{final.length}자</span>
 </div>
 <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: BLACK }}>{final}</p>
 </div>
 <button onClick={copyAndGoNaver} className="w-full py-4 rounded-2xl font-black text-white text-base shadow-lg" style={{ background: BLUE }}>
 {copied ? (<span className="inline-flex items-center gap-1.5 justify-center"><Check size={14} strokeWidth={3} /> 복사 완료 · 네이버로 이동 중</span>) : '네이버 리뷰 등록하기'}
 </button>
 <div className="bg-white rounded-xl p-4" style={{ border: '1px solid ' + BORDER }}>
 <p className="text-xs font-bold mb-2" style={{ color: BLUE }}>사용 방법</p>
 <ol className="text-xs space-y-1 list-decimal pl-4" style={{ color: '#4E5968' }}>
 <li>아래 버튼 클릭 → 리뷰가 자동으로 복사돼요</li>
 <li>네이버 리뷰 작성 페이지로 바로 이동해요</li>
 <li>영수증 인증 + 사진 첨부 (필수)</li>
 <li>빈 리뷰 칸에 붙여넣기 → 등록</li>
 </ol>
 </div>
 <button onClick={reset} className="w-full py-3 text-xs underline" style={{ color: GRAY }}>
 처음부터 다시 작성
 </button>
 </div>
 )}
 </main>

 <footer className="text-center py-6 text-[11px]" style={{ color: GRAY }}>
 Powered by <span className="font-bold" style={{ color: BLUE }}>로컬루션</span>
 </footer>

 {(drafting || advancing) && (
 <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm px-6">
 <div className="bg-white rounded-2xl p-6 max-w-[300px] w-full text-center shadow-2xl">
 <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 animate-spin" style={{ borderColor: BLUE_BG, borderTopColor: BLUE }} />
 <p className="font-black text-sm mb-1" style={{ color: BLACK }}>{drafting ? 'AI가 리뷰를 작성 중' : '마무리 중'}</p>
 <p className="text-[11px] mb-4" style={{ color: GRAY }}>{drafting ? '15~30초 정도 걸려요' : '잠시만 기다려주세요'}</p>
 {drafting && (
 <button
 onClick={() => {
 // AI 없이 즉시 fallback 텍스트로 진행
 const fallbackText = buildReview(store, gender, age, tone, length, photos)
 setDraft(fallbackText)
 setAiSource('fallback')
 setDrafting(false)
 setStep(3)
 }}
 className="text-[11px] underline"
 style={{ color: GRAY }}
 >
 AI 건너뛰고 직접 작성하기
 </button>
 )}
 </div>
 </div>
 )}

 {copied && (
 <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50">
 <div className="px-5 py-3 bg-[#191F28] text-white rounded-full text-xs font-bold shadow-2xl flex items-center gap-1.5">
 <Check size={12} strokeWidth={3} /> 복사 완료 · 네이버 이동 중
 </div>
 </div>
 )}
 </div>
 )
}

// ───────────────────────────────────────────────────────────────────
// buildReview: 안티-AI 한국어 리뷰 생성기
// 목표: short≈150자 / mid≈250자 / long≈400자 (한글 1자=1자 카운팅)
// 전략: 문장 풀에서 선택 → 합산 → 최솟값 미달 시 padding 추가 → 최댓값 초과 시 자르기
// ───────────────────────────────────────────────────────────────────
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

function buildReview(store: Store, gender: string, age: string, tone: string, length: LengthKey, photos: Photo[]): string {
 const sig1 = pick(store.signatures)
 const remaining = store.signatures.filter(s => s !== sig1)
 const sig2 = remaining.length > 0 ? pick(remaining) : sig1
 const kw1 = store.keywords[0] || ''
 const kw2 = store.keywords[1] || kw1
 const area = store.address ? store.address.split(' ').slice(-1)[0] : ''
 const hasReceipt = photos.some(p => p.cat === 'receipt')
 const hasPhoto = photos.some(p => p.cat === 'photo')
 const nm = store.name

 // ── 여성(F) 문장 풀 ──────────────────────────────────────────
 const F_s1 = [
 '주말에 친구랑 약속 잡았다가 여기 ' + nm + ' 왔는데 진짜ㅠㅠ 완전 제 취향이었어요!!',
 '요즘 ' + (kw1 || store.category) + ' 핫한 곳 찾고 있었는데 소문 듣고 바로 ' + nm + ' 달려왔어요ㅎㅎ',
 '친구가 여기 꼭 가봐야 된다고 난리길래 ' + nm + ' 다녀왔는데요~ 결론부터 말하면 진짜 너무 좋았어요ㅠㅠㅠ',
 '오랜만에 셀프 힐링 좀 해볼까 해서 ' + nm + ' 왔잖아요~ 근데 기대 이상이었어요!!',
 (area ? area + ' ' : '') + '쪽 놀러 왔다가 ' + nm + ' 들렀는데 완전 대박ㅠㅠ 처음부터 끝까지 만족이었어요!',
 ]
 const F_s2 = hasPhoto
 ? ['들어가자마자 분위기 미쳤어요ㅠㅠ 사진부터 막 찍었잖아요ㅎㅎ', '공간이 너무 예뻐서 앉기 전부터 핸드폰 먼저 꺼냈어요ㅋㅋㅋ', '인테리어 진짜 취향 저격이에요~ 구석구석 예쁘더라구요!']
 : ['들어가자마자 느낌부터 좋았어요~ 뭔가 기분 좋아지는 공간이더라구요!', '위치도 딱 찾기 좋아서 편했어요ㅎㅎ', '안쪽으로 들어가니까 더 아늑해서 놀랐어요ㅠㅠ']
 const F_s3 = hasReceipt
 ? ['저 이번에 ' + sig1 + '이랑 ' + sig2 + ' 시켰는데요~ 둘 다 진짜진짜 맛있었어요ㅠㅠ 특히 ' + sig1 + ' 완전 제 취향!!', sig1 + ' 먼저 먹어봤는데 한 입 먹자마자 "헉" 했어요ㅠㅠ 진짜 맛있더라구요~']
 : [sig1 + ' 시켜봤어요~ 첫입부터 "오~?" 하면서 계속 먹었잖아요ㅎㅎ 진짜 맛있었어요ㅠㅠ', sig1 + ' 유명하다길래 기대하고 먹었는데요 기대 이상이었어요!! 완전 만족~']
 const F_s4 = ['사장님 너무너무 친절하셔서 완전 기분 좋게 먹고 왔어요ㅠㅠ', '직원분들도 응대가 다정해서 편했어요~ 이런 거 되게 중요하잖아요ㅎㅎ', '사장님이 메뉴 설명도 해주시고 진짜 세심하셔서 감동이었어요ㅠㅠ']
 const F_s5: Record<string, string[]> = {
 '10s': ['친구들이랑 오면 완전 좋아할 것 같아요!! 사진도 엄청 잘 나와요ㅎㅎ', '또래끼리 수다 떨기 딱이에요ㅠㅠ 진짜 강추!'],
 '20s': ['데이트 코스로도 완전 찰떡이고 친구랑 와도 좋아요ㅎㅎ', '2030이면 여기 진짜 좋아할 거예요ㅠㅠ 감성 터져요~'],
 '30s': ['바쁜 일상 중에 힐링하러 오기 딱 좋아요ㅠㅠ 저도 또 올 거예요!', '조용히 쉬고 싶을 때 생각날 곳이에요~ 완전 내 스타일!'],
 '40s': ['가족이랑 와도 너무 편해요~ 엄마랑 같이 와도 좋아하실 것 같아요ㅎㅎ', '부담 없이 편하게 쉬기 좋아요ㅠㅠ 재방문 확정!'],
 '50s+': ['어른들 모시고 와도 좋을 분위기예요~ 부담 없어서 딱이에요ㅎㅎ', '편하게 한 끼 하기 정말 좋은 곳이에요!'],
 }
 // 길이별 outro (normal ≈40-55자, long ≈70-90자)
 const F_outro: Record<string, string[]> = {
 warm: [(area ? area + ' ' : '') + (kw2 || '분위기 좋은 곳') + ' 찾는 분들 여기 진짜 완전 강추예요ㅠㅠ!! 저 다음 주에 또 올 거예요ㅎㅎ', '진짜 오길 잘했다 싶었어요ㅠㅠ ' + (kw1 || store.category) + ' 찾으시면 무조건 여기 가세요!!'],
 short: ['완전 만족ㅠㅠ ' + (kw2 || '') + ' 찾으시면 여기요!!', (kw1 || '') + ' 강추강추~ 또 올 거예요ㅎㅎ'],
 detail: [(kw1 || store.category) + ' 진심으로 여기 진짜 잘 왔다 싶었어요ㅠㅠ 분위기·맛·응대 다 챙기는 곳 찾기 쉽지 않잖아요~ 근데 여기가 딱이었어요!! ' + (kw2 || '') + ' 찾는 분들 한번 꼭 가보세요~'],
 casual: [(kw2 || '') + ' 찾는 사람들 여기 완전 내 스타일일걸요ㅎㅎ!! 진짜 강추~', '여기 한번만 와봐요ㅠㅠ 진짜 반할 거예요!! ' + (kw1 || '') + ' 강추~'],
 funny: ['여기 진짜 "왜 진작 안 왔지?" 하는 타입의 맛집이에요ㅋㅋㅋ ' + (kw1 || '') + ' 찾으신다면 여기 무조건 강추!! 저 이미 세 번 방문 계획 세웠어요ㅠㅠ', (kw2 || '이 동네') + ' 자랑 아이템 하나 생겼어요ㅋㅋ "거기 알아? 되게 좋거든~" 이러면서 다 데려올 예정이에요ㅠㅠ 진짜 맛있었어요!!'],
 emotional: ['여기서의 시간이 오래 기억에 남을 것 같아요ㅠㅠ 맛도 분위기도 그냥 마음에 쏙 들었어요. ' + (kw1 || '') + ' 생각날 때 다시 와야겠어요~', '별로인 날도 여기 오면 기분이 좋아질 것 같은 느낌? ' + (kw2 || '') + ' 찾으시는 분들 꼭 와보세요ㅠㅠ 감성 충만해서 돌아왔어요!!'],
 pro: ['종합적으로 평가하면 맛·서비스·가성비 세 부분 모두 만족스러웠어요. ' + (kw1 || store.category) + '을 찾으시는 분들께 적극 추천드려요! 다음 방문에는 나머지 메뉴도 도전해볼 예정이에요ㅎㅎ'],
 honest: ['솔직히 말하면 딱 하나 아쉬웠던 건 대기가 좀 있었다는 거예요. 근데 그 기다림이 아깝지 않은 맛이었어요!! ' + (kw1 || '') + ' 찾으신다면 주말은 좀 이르게 오세요ㅎㅎ', '장점만 말하는 건 양심 없는 것 같아서ㅎㅎ 가격이 살짝 있긴 해요. 근데 그만큼의 퀄리티는 충분히 있었어요!! ' + (kw2 || '') + ' 고려하시는 분들 한번 가보세요~'],
 }
 // long 전용 패딩 풀 (F)
 const F_pad = [
 '이 정도면 완전 합격이지 않나요?? 저 점수 꽤 짜게 주는 편인데 여기는 진짜 만족이었어요!!',
 '계속 생각날 것 같아요ㅎㅎ 분명히 금방 또 오게 될 것 같은 느낌이에요ㅠㅠ',
 '주변 사람들한테도 진짜 강추하고 싶어요~ 아는 사람들한테 다 알려줄 거예요ㅎㅎ',
 '사진도 너무 잘 나와서 인스타에 올렸더니 친구들이 다 어디냐고 물어봤어요ㅋㅋㅋ',
 '음식도 음식이지만 공간 자체가 너무 좋아서 그냥 있기만 해도 힐링이 됐어요ㅠㅠ',
 ]

 // ── 남성(M) 문장 풀 ──────────────────────────────────────────
 const M_s1 = [
 '주말에 시간이 나서 ' + nm + ' 방문해봤어요.',
 '평소 ' + (kw1 || store.category) + ' 쪽 관심이 있어서 ' + nm + ' 한번 가봤어요.',
 (area ? area + ' ' : '') + '근처에 볼 일이 있어서 겸사겸사 ' + nm + ' 들렀어요.',
 '지인 추천으로 ' + nm + ' 찾아가봤어요.',
 '퇴근길에 ' + nm + ' 들러봤어요. 오래 전부터 궁금했던 곳이에요.',
 ]
 const M_s2 = hasPhoto
 ? ['안으로 들어가니 생각보다 공간이 넓고 깔끔했어요.', '자리 간격도 여유롭고 조명이 차분해서 편하게 앉을 수 있었어요.', '첫인상이 단정해서 마음에 들더라구요.']
 : ['위치가 찾기 어렵지 않아서 좋았어요.', '평일 저녁이었는데 자리도 여유 있어서 편했어요.', '처음 와보는 곳이었지만 분위기가 어색하지 않았어요.']
 const M_s3 = hasReceipt
 ? ['메뉴판을 보고 ' + sig1 + '이랑 ' + sig2 + ' 주문했어요. 둘 다 만족스러웠어요.', '대표 메뉴라는 ' + sig1 + ' 먼저 먹어봤어요. 양도 괜찮고 맛이 담백해서 좋았어요.']
 : [sig1 + ' 주문했어요. 평이 좋은 이유가 있더라구요.', sig1 + ' 시켜봤는데 생각보다 깊이가 있는 맛이에요. 추천해줄 만하네요.']
 const M_s4 = ['사장님 응대가 편안해서 부담 없이 식사할 수 있었어요.', '직원분들도 필요한 때만 조용히 도와주셔서 편했어요.', '주문이나 안내가 간결해서 좋았어요. 이런 부분이 생각보다 중요하더라구요.']
 const M_s5: Record<string, string[]> = {
 '10s': ['또래 친구들과 와도 어색하지 않을 분위기예요.', '가볍게 들르기 좋은 곳이에요.'],
 '20s': ['혼자 와도, 누구와 와도 편하게 있을 수 있는 곳이에요.', '요즘 감성에 맞는 무난한 분위기라 좋았어요.'],
 '30s': ['일 끝나고 조용히 시간 보내기 좋은 곳이에요.', '하루 마무리로 들르기 적당한 분위기였어요.'],
 '40s': ['가족과 와도 부담 없는 곳이에요.', '편하게 한 끼 하기 좋은 분위기였어요.'],
 '50s+': ['어른을 모시고 와도 무난한 곳이에요.', '조용히 머물기에 좋은 공간이에요.'],
 }
 const M_outro: Record<string, string[]> = {
 warm: [(area ? area + ' 근처' : '이 동네') + '에서 ' + (kw2 || '괜찮은 곳') + ' 찾으신다면 한번 가보실 만해요. 저도 조만간 다시 방문할 생각이에요.', '기분 좋게 잘 다녀왔어요. ' + (kw1 || store.category) + ' 찾는 분들께 조심스럽게 추천드려요.'],
 short: [(kw2 || '') + ' 무난하게 괜찮았어요. 재방문 의사 있어요.', '담백하게 잘 먹고 왔어요. ' + (kw1 || '') + '.'],
 detail: ['전반적으로 ' + (kw1 || store.category) + ' 기준으로 부족함 없는 곳이에요. ' + (kw2 || '') + ' 찾으시는 분들께도 나쁘지 않을 것 같아요. 저는 다시 방문할 생각입니다.'],
 casual: [(kw2 || '') + ' 찾으신다면 한번 가보세요. 저는 다음에 또 와볼 것 같아요.', '가볍게 다녀오기 괜찮은 곳이에요. ' + (kw1 || '') + ' 근처 오시면 들러보세요.'],
 funny: ['맛있는 집이라 소개할 때 " ' + nm + ' 알아?" 하면 포인트 좀 올릴 수 있을 것 같아요. ' + (kw1 || '') + ' 찾으신다면 여기 강추합니다.', '다음에 또 올 것 같아요. 그냥 그렇게 됩니다. ' + (kw2 || '') + '.'],
 emotional: ['조용히 앉아서 시간을 보내기 좋은 공간이었어요. 뭔가 마음이 차분해지는 기분이었어요. ' + (kw1 || '') + ' 생각날 때 다시 올 것 같아요.', '소소하지만 좋은 경험이었어요. ' + (kw2 || '') + ' 찾으시는 분들께 권해드리고 싶어요.'],
 pro: ['맛·서비스·가성비를 종합하면 평균 이상의 퀄리티예요. ' + (kw1 || store.category) + ' 카테고리에서 추천할 만한 곳입니다. 재방문 예정이에요.'],
 honest: ['전반적으로 만족스러웠어요. 굳이 아쉬운 점을 꼽자면 웨이팅이 있다는 거예요. 그래도 ' + (kw1 || '') + ' 찾으신다면 기다릴 만한 곳이에요.', '장단점이 있는 곳이에요. 맛은 확실하고 서비스도 무난해요. ' + (kw2 || '') + ' 찾으신다면 한번 가보세요.'],
 }
 const M_pad = [
 '앞으로도 이쪽 올 일 있으면 자연스럽게 들르게 될 것 같아요.',
 '이 정도 퀄리티면 재방문 의사 충분히 있어요. 다음엔 다른 메뉴도 도전해볼 생각이에요.',
 '비슷한 곳 여럿 가봤는데 여기가 전반적으로 균형이 잘 잡혀있는 편이에요.',
 '지인에게도 조심스럽게 추천할 만한 곳이에요.',
 ]

 // ── 중립(-) 문장 풀 ──────────────────────────────────────────
 const N_s1 = [
 '주말에 시간 나서 ' + nm + ' 다녀왔어요.',
 '요즘 ' + (kw1 || store.category) + ' 찾고 있다가 ' + nm + ' 가봤어요.',
 (area ? area + ' ' : '') + '쪽에 일 있어서 간 김에 ' + nm + ' 들렀어요.',
 '지인 추천으로 ' + nm + ' 찾아가봤어요.',
 ]
 const N_s2 = hasPhoto
 ? ['들어가자마자 공간이 깔끔하고 편안했어요.', '자리도 적당히 여유 있어서 기분 좋게 앉았어요.', '분위기가 차분해서 오래 있기 좋았어요.']
 : ['위치가 찾기 쉬워서 편했어요.', '처음이었는데 분위기가 부담 없이 편했어요.']
 const N_s3 = hasReceipt
 ? [sig1 + '이랑 ' + sig2 + ' 시켰어요. 둘 다 괜찮았어요.', '대표 메뉴 ' + sig1 + ' 먹어봤어요. 기대만큼 만족스러웠어요.']
 : [sig1 + ' 시켜봤어요. 생각보다 맛있었어요.', sig1 + '이 유명하다길래 먹어봤는데 괜찮았어요.']
 const N_s4 = ['응대도 편하고 부담스럽지 않았어요.', '사장님이 친절하셔서 기분 좋게 다녀왔어요.']
 const N_s5: Record<string, string[]> = {
 '10s': ['친구들이랑 가볍게 오기 좋아요.'],
 '20s': ['데이트하기도, 혼자 오기도 좋은 곳이에요.'],
 '30s': ['조용히 시간 보내기 좋은 곳이에요.'],
 '40s': ['가족과 와도 편한 곳이에요.'],
 '50s+': ['어른들 모시고 오기에도 무난해요.'],
 }
 const N_outro: Record<string, string[]> = {
 warm: [(area ? area : '이 근처') + ' ' + (kw2 || '괜찮은 곳') + ' 찾는 분들 한번 가보세요. 저도 또 올 것 같아요.'],
 short: [(kw2 || '') + ' 괜찮았어요. 재방문 의사 있어요.'],
 detail: ['전반적으로 ' + (kw1 || store.category) + ' 기준에서 괜찮은 곳이에요. ' + (kw2 || '') + ' 찾는 분들께 추천합니다.'],
 casual: [(kw2 || '') + ' 찾으신다면 한번 가보세요. 기분 좋게 다녀왔어요.'],
 funny: [nm + ' 생각보다 훨씬 좋았어요. "아 거기 알아~ 나 갔다왔어" 하고 싶어지는 곳이에요. ' + (kw1 || '') + ' 강추합니다!'],
 emotional: ['오래 기억에 남을 것 같은 공간이었어요. ' + (kw1 || '') + ' 찾으신다면 한번 가보세요.'],
 pro: ['종합 평가: 맛·공간·서비스 모두 무난하게 합격점이에요. ' + (kw1 || '') + ' 찾으시는 분들께 추천합니다.'],
 honest: ['좋은 점과 아쉬운 점 둘 다 있지만 전반적으로 만족스러웠어요. ' + (kw2 || '') + ' 찾으신다면 가볼 만해요.'],
 }
 const N_pad = [
 '다음에 기회 되면 다시 와볼 생각이에요.',
 '주변 분들께도 추천할 만한 곳이에요.',
 '비슷한 곳들이랑 비교해도 손색없는 퀄리티예요.',
 ]

 // ── 성별 분기 ──────────────────────────────────────────────────
 let s1: string, s2: string, s3: string, s4: string, s5: string, s6: string
 let padPool: string[]

 if (gender === 'F') {
 s1 = pick(F_s1); s2 = pick(F_s2); s3 = pick(F_s3); s4 = pick(F_s4)
 s5 = pick(F_s5[age] || F_s5['30s'])
 s6 = pick(F_outro[tone] || F_outro.warm)
 padPool = F_pad
 } else if (gender === 'M') {
 s1 = pick(M_s1); s2 = pick(M_s2); s3 = pick(M_s3); s4 = pick(M_s4)
 s5 = pick(M_s5[age] || M_s5['30s'])
 s6 = pick(M_outro[tone] || M_outro.warm)
 padPool = M_pad
 } else {
 s1 = pick(N_s1); s2 = pick(N_s2); s3 = pick(N_s3); s4 = pick(N_s4)
 s5 = pick(N_s5[age] || N_s5['30s'])
 s6 = pick(N_outro[tone] || N_outro.warm)
 padPool = N_pad
 }

 // ── 길이별 문장 조합 ──────────────────────────────────────────
 let parts: string[]
 if (length === 'short') {
 parts = [s1, s3, s6]
 } else if (length === 'mid') {
 parts = [s1, s2, s3, s5, s6]
 } else {
 // long: 6 scenes 기본
 parts = [s1, s2, s3, s4, s5, s6]
 }

 let text = parts.join(' ')

 // ── 최솟값 보장 (padding) ─────────────────────────────────────
 const minTargets: Record<LengthKey, number> = { short: 120, mid: 215, long: 360 }
 const maxTargets: Record<LengthKey, number> = { short: 155, mid: 260, long: 410 }
 const minLen = minTargets[length]
 const maxLen = maxTargets[length]

 // 섞어서 순서 랜덤화
 const shuffled = [...padPool].sort(() => Math.random() - 0.5)
 for (const pad of shuffled) {
 if (text.length >= minLen) break
 if (text.length + 1 + pad.length > maxLen) continue
 text += ' ' + pad
 }

 // ── 최댓값 초과 시 문장 경계에서 자르기 ─────────────────────
 if (text.length > maxLen) {
 const cut = text.slice(0, maxLen)
 const last = Math.max(
 cut.lastIndexOf('요'),
 cut.lastIndexOf('!'),
 cut.lastIndexOf('~'),
 cut.lastIndexOf('.')
 )
 text = last > 50 ? cut.slice(0, last + 1) : cut
 }

 // ── 공백 정리 (정규식 미사용) ─────────────────────────────────
 while (text.indexOf(' ') >= 0) text = text.split(' ').join(' ')
 while (text.indexOf('..') >= 0) text = text.split('..').join('.')
 text = text.split(' ,').join(',').split(' .').join('.')

 return text.trim()
}
