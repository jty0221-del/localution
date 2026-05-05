'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { AlertTriangle, MapPin, CheckCircle2, Lock, Loader2, X, Eye, EyeOff } from 'lucide-react'

export const dynamic = 'force-dynamic'

type PlatformSlug = 'naver_place' | 'baemin' | 'yogiyo' | 'coupangeats' | 'kakao_map'
const VALID_PLATFORMS: PlatformSlug[] = ['naver_place', 'baemin', 'yogiyo', 'coupangeats', 'kakao_map']

const PLATFORM_META: Record<PlatformSlug, {
 label: string; shortLabel: string; brandColor: string; brandTextColor: string
 initial: string; loginBg: string; loginFg: string; loginUrl: string
 forgotIdUrl: string; forgotPwUrl: string; singleForgot: boolean
}> = {
 naver_place: { label: '네이버 플레이스', shortLabel: '네이버', brandColor: '#03C75A', brandTextColor: '#FFFFFF', initial: 'N', loginBg: '#03C75A', loginFg: '#FFFFFF', loginUrl: 'https://new.smartplace.naver.com/', forgotIdUrl: 'https://nid.naver.com/user2/helpmain.nhn', forgotPwUrl: 'https://nid.naver.com/nidreminder/info', singleForgot: false },
 baemin: { label: '배달의민족', shortLabel: '배민', brandColor: '#2AC1BC', brandTextColor: '#FFFFFF', initial: '배', loginBg: '#E8E0FF', loginFg: '#4C3D8F', loginUrl: 'https://ceo.baemin.com/', forgotIdUrl: 'https://ceo.baemin.com/', forgotPwUrl: 'https://ceo.baemin.com/', singleForgot: true },
 yogiyo: { label: '요기요', shortLabel: '요기요', brandColor: '#FA0050', brandTextColor: '#FFFFFF', initial: '요', loginBg: '#E8E0FF', loginFg: '#4C3D8F', loginUrl: 'https://ceo.yogiyo.co.kr/', forgotIdUrl: 'https://ceo.yogiyo.co.kr/', forgotPwUrl: 'https://ceo.yogiyo.co.kr/', singleForgot: false },
 coupangeats: { label: '쿠팡이츠', shortLabel: '쿠팡이츠', brandColor: '#FF4B30', brandTextColor: '#FFFFFF', initial: '쿠', loginBg: '#E8E0FF', loginFg: '#4C3D8F', loginUrl: 'https://store.coupangeats.com/', forgotIdUrl: 'https://store.coupangeats.com/', forgotPwUrl: 'https://store.coupangeats.com/', singleForgot: false },
 kakao_map: { label: '카카오맵', shortLabel: '카카오', brandColor: '#FEE500', brandTextColor: '#191919', initial: '카', loginBg: '#FEE500', loginFg: '#191919', loginUrl: 'https://place.map.kakao.com/', forgotIdUrl: 'https://accounts.kakao.com/weblogin/find_account/email', forgotPwUrl: 'https://accounts.kakao.com/weblogin/find_password', singleForgot: false },
}

type FoundStore = {
 placeId: string; name: string; desc: string; url: string
 address: string; roadAddress: string; category: string; phone: string
}

export default function ConnectPlatformPage() {
 const router = useRouter()
 const params = useParams<{ platform: string }>()
 const platform = (params?.platform ?? '') as PlatformSlug
 const meta = PLATFORM_META[platform]

 const [step, setStep] = useState<1 | 2 | 3>(1)
 const [agreedScope, setAgreedScope] = useState(false)
 const [agreedOwnership, setAgreedOwnership] = useState(false)
 const [agreedRisk, setAgreedRisk] = useState(false)
 const [consentSaving, setConsentSaving] = useState(false)
 const [consentId, setConsentId] = useState<string | null>(null)
 const [accountId, setAccountId] = useState('')
 const [password, setPassword] = useState('')
 const [showPw, setShowPw] = useState(false)
 const [saving, setSaving] = useState(false)

 const [storeQuery, setStoreQuery] = useState('')
 const [searching, setSearching] = useState(false)
 const [searchResults, setSearchResults] = useState<FoundStore[]>([])
 const [selectedStore, setSelectedStore] = useState<FoundStore | null>(null)
 const [savingStore, setSavingStore] = useState(false)

 const [error, setError] = useState<string | null>(null)
 const [success, setSuccess] = useState<string | null>(null)
 const [cookieText, setCookieText] = useState('')
 const [cookieSaving, setCookieSaving] = useState(false)
 const [cookieSaved, setCookieSaved] = useState(false)

 // 쿠팡이츠 STEP 3 (장사닥터 패턴: 비동기 큐 처리 + 폴링)
 const [coupangJobId, setCoupangJobId] = useState<string | null>(null)
 const [coupangStatus, setCoupangStatus] = useState<'queued' | 'processing' | 'completed' | 'failed' | 'unknown'>('queued')
 const [coupangMessage, setCoupangMessage] = useState('연동 신청을 받았어요. 곧 처리가 시작돼요.')
 const [coupangReviewCount, setCoupangReviewCount] = useState(0)
 const [coupangElapsed, setCoupangElapsed] = useState(0)
 const [coupangAccountIdMask, setCoupangAccountIdMask] = useState<string | null>(null)
 const pollRef = useRef<NodeJS.Timeout | null>(null)
 const elapsedRef = useRef<NodeJS.Timeout | null>(null)

 useEffect(() => {
 if (platform && !VALID_PLATFORMS.includes(platform)) router.replace('/my/platforms')
 }, [platform, router])

 if (!meta) return (
 <main className="min-h-screen bg-[#F9FAFB] py-10">
 <div className="max-w-xl mx-auto px-4 text-center text-[#6B7280]">
 유효하지 않은 플랫폼입니다.
 <div className="mt-4"><Link href="/my/platforms" className="text-[#3182F6] hover:underline">← 플랫폼 허브로</Link></div>
 </div>
 </main>
 )

 const allAgreed = agreedScope && agreedOwnership && agreedRisk

 async function submitConsent() {
 if (!allAgreed) { setError('3개 항목 모두 동의해주세요.'); return }
 setError(null); setConsentSaving(true)
 try {
 const res = await fetch('/api/legal/platform-consent', {
 method: 'POST', headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ platform, agreed_scope: agreedScope, agreed_ownership: agreedOwnership, agreed_risk: agreedRisk, extra_payload: { ua_snapshot: typeof navigator !== 'undefined' ? navigator.userAgent : null, rendered_at: new Date().toISOString() } }),
 })
 const data = await res.json()
 if (!data.ok) { setError(data.message || data.error || 'consent_failed'); return }
 setConsentId(data.consent_id); setStep(2)
 } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
 finally { setConsentSaving(false) }
 }

 async function submitCredentials() {
 if (!accountId.trim()) { setError(meta.shortLabel + ' 아이디를 입력해주세요.'); return }
 if (!password) { setError(meta.shortLabel + ' 비밀번호를 입력해주세요.'); return }
 setError(null); setSaving(true)
 try {
 const res = await fetch('/api/platform-accounts', {
 method: 'POST', headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ platform, account_id: accountId.trim(), password }),
 })
 const data = await res.json()
 if (!data.ok) { setError(data.message || data.error || 'save_failed'); return }
 setPassword('')
 if (platform === 'naver_place') { setStep(3) }
 else if (platform === 'coupangeats') {
 // 장사닥터 패턴: 자격증명 저장 직후 워커 큐에 작업 추가됨.
 // STEP 3 처리 화면으로 이동해서 폴링.
 setCoupangJobId(data.coupang_job_id || null)
 setCoupangStatus('queued')
 setCoupangMessage('연동 신청을 받았어요. 곧 처리가 시작돼요.')
 setStep(3)
 }
 else {
 setSuccess(meta.label + ' 연결 완료! 리뷰 자동 수집이 곧 시작돼요')
 setTimeout(() => router.push('/my/platforms'), 1400)
 }
 } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
 finally { setSaving(false) }
 }

 // ── 쿠팡이츠 폴링 (STEP 3 진입 시 작동) ──
 useEffect(() => {
 if (platform !== 'coupangeats' || step !== 3) return

 // 경과 시간 카운터 (1초)
 const startTime = Date.now()
 elapsedRef.current = setInterval(() => {
 setCoupangElapsed(Math.floor((Date.now() - startTime) / 1000))
 }, 1000)

 let pollCount = 0
 const poll = async () => {
 pollCount++
 try {
 const url = '/api/platform-accounts/coupang-status' + (coupangJobId ? '?job_id=' + encodeURIComponent(coupangJobId) : '')
 const r = await fetch(url, { cache: 'no-store' })
 const j = await r.json()
 if (!j.ok) return
 setCoupangStatus(j.status)
 setCoupangMessage(j.message || '')
 setCoupangReviewCount(j.review_count || 0)
 if (j.account_id_mask) setCoupangAccountIdMask(j.account_id_mask)
 if (j.status === 'completed' || j.status === 'failed') {
 if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
 if (elapsedRef.current) { clearInterval(elapsedRef.current); elapsedRef.current = null }
 // 완료 시 3초 후 플랫폼 허브로
 if (j.status === 'completed') {
 setTimeout(() => router.push('/my/platforms'), 3000)
 }
 }
 } catch {}
 }

 // 초기 즉시 1회 + 점진적 백오프 (3초 → 5초 → 10초)
 poll()
 pollRef.current = setInterval(() => {
 // 30회 (약 2분) 이후 폴링 간격 줄이기
 if (pollCount > 30 && pollRef.current) {
 clearInterval(pollRef.current)
 pollRef.current = setInterval(poll, 10000)
 }
 poll()
 }, 3000)

 return () => {
 if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
 if (elapsedRef.current) { clearInterval(elapsedRef.current); elapsedRef.current = null }
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [platform, step, coupangJobId])

 async function saveCoupangCookies() {
 if (!cookieText.trim()) { setError('쿠키를 붙여넣어 주세요.'); return }
 setCookieSaving(true); setError(null)
 try {
 const res = await fetch('/api/platform-accounts/coupangeats-cookie', {
 method: 'POST', headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ cookie_json: cookieText.trim() }),
 })
 const data = await res.json()
 if (!data.ok) { setError(data.error || '저장 실패'); return }
 setCookieSaved(true)
 setSuccess(`쿠키 ${data.saved}개 저장 완료! 이제 리뷰 자동 수집이 시작돼요.`)
 setTimeout(() => router.push('/my/platforms'), 1500)
 } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
 finally { setCookieSaving(false) }
 }

 async function searchStore() {
 if (!storeQuery.trim()) { setError('매장명 또는 네이버 플레이스 URL을 입력해주세요.'); return }
 setError(null); setSearching(true); setSearchResults([]); setSelectedStore(null)
 try {
 const isUrl = storeQuery.trim().startsWith('http')
 const res = await fetch('/api/platforms/naver', {
 method: 'POST', headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(isUrl ? { action: 'verify', input: storeQuery.trim() } : { action: 'search', query: storeQuery.trim() }),
 })
 const data = await res.json()
 if (!res.ok) { setError(data.error || '검색 실패'); return }
 if (isUrl && data.placeId) {
 setSearchResults([{ placeId: data.placeId, name: data.name || '', desc: data.desc || '', url: data.url || '', address: data.desc || '', roadAddress: data.desc || '', category: '', phone: '' }])
 } else if (data.items) {
 const items: FoundStore[] = (data.items || []).map((item: any) => {
 const urlStr = item.link || ''
 const m = urlStr.match(/place\/(\d{5,})/)
 const placeId = m ? m[1] : ''
 return {
 placeId,
 name: item.title || '',
 desc: item.roadAddress || item.address || '',
 url: urlStr,
 address: item.address || '',
 roadAddress: item.roadAddress || '',
 category: item.category || '',
 phone: item.telephone || '',
 }
 }).filter((i: FoundStore) => i.placeId)
 setSearchResults(items)
 if (items.length === 0) setError('검색 결과가 없어요. 네이버 플레이스 URL을 직접 붙여넣어 보세요.')
 }
 } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
 finally { setSearching(false) }
 }

 async function saveStoreId(store: FoundStore) {
 setSavingStore(true); setError(null)
 try {
 const res = await fetch('/api/platform-accounts', {
 method: 'PATCH', headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 platform: 'naver_place',
 platform_store_id: store.placeId,
 platform_store_name: store.name,
 store_address: store.roadAddress || store.address || store.desc,
 store_category: store.category,
 store_phone: store.phone,
 store_naver_url: store.url || ('https://map.naver.com/p/entry/place/' + store.placeId),
 }),
 })
 const data = await res.json()
 if (!data.ok) { setError(data.message || data.error || '저장 실패'); return }
 setSuccess('네이버 플레이스 연결 완료! 설정 페이지에도 자동 반영되었어요.')
 setTimeout(() => router.push('/my/platforms'), 1400)
 } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
 finally { setSavingStore(false) }
 }

 // ── STEP 3: 쿠팡이츠 (장사닥터 패턴 - 비동기 처리 화면) ──
 if (step === 3 && platform === 'coupangeats') {
 const isCompleted = coupangStatus === 'completed'
 const isFailed = coupangStatus === 'failed'
 const isProcessing = coupangStatus === 'processing'
 const isQueued = coupangStatus === 'queued'

 return (
 <main className="min-h-screen bg-white flex flex-col">
 <div className="flex items-center justify-between px-5 pt-4 pb-2">
 <div className="text-[11px] text-[#8B95A1]">STEP 3 / 3</div>
 <Link href="/my/platforms" aria-label="닫기" className="w-8 h-8 flex items-center justify-center text-[#191F28] hover:bg-[#F2F4F6] rounded-lg">
 <X size={20} />
 </Link>
 </div>
 <div className="flex-1 max-w-md w-full mx-auto px-6 pt-8 pb-8 flex flex-col">
 {/* 헤더 — 상태별 메시지 */}
 {!isCompleted && !isFailed && (
 <>
 <h1 className="text-[22px] font-black text-[#191F28] leading-snug mb-1">연동 신청을 완료했어요.</h1>
 <p className="text-[15px] text-[#4E5968] leading-relaxed">연동이 끝나면 알림을 보내드릴게요.</p>
 </>
 )}
 {isCompleted && (
 <>
 <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm mb-4">
 <CheckCircle2 size={22} className="text-white" strokeWidth={2.5} />
 </div>
 <h1 className="text-[22px] font-black text-[#191F28] leading-snug mb-1">연동이 완료됐어요.</h1>
 <p className="text-[15px] text-[#4E5968] leading-relaxed">
 리뷰 <strong className="text-[#191F28]">{coupangReviewCount}개</strong>를 가져왔어요.<br />
 지금부터 자동으로 새 리뷰가 들어와요.
 </p>
 </>
 )}
 {isFailed && (
 <>
 <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-sm mb-4">
 <AlertTriangle size={22} className="text-white" strokeWidth={2.5} />
 </div>
 <h1 className="text-[22px] font-black text-[#191F28] leading-snug mb-1">연동에 실패했어요.</h1>
 <p className="text-[15px] text-[#4E5968] leading-relaxed">{coupangMessage || '다시 시도해주세요.'}</p>
 {coupangAccountIdMask && (
 <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-[12px] text-amber-900 leading-relaxed">
 <div className="font-bold mb-1 flex items-center gap-1.5">
 <AlertTriangle size={13} className="text-amber-600 flex-shrink-0" strokeWidth={2.5} />
 혹시 쿠팡이츠 아이디가 맞나요?
 </div>
 <div className="mt-1.5">
 현재 등록된 아이디: <code className="bg-white px-1.5 py-0.5 rounded text-[11px] font-mono font-bold text-amber-900">{coupangAccountIdMask}</code>
 </div>
 <div className="mt-2 text-amber-800">
 쿠팡이츠는 네이버·배민과 <strong>다른 별도 계정</strong>이에요.<br />
 <a href="https://store.coupangeats.com/merchant/login" target="_blank" rel="noopener noreferrer" className="underline font-bold">store.coupangeats.com</a> 에서 사용하시는 사장님 아이디·비밀번호인지 확인해주세요.
 </div>
 </div>
 )}
 </>
 )}

 {/* 시각적 인디케이터 */}
 <div className="my-8 rounded-2xl bg-[#F8FAFF] border border-[#E5E8EB] p-6">
 {!isCompleted && !isFailed && (
 <div className="flex flex-col items-center justify-center py-4">
 <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#D70530] to-[#A30024] flex items-center justify-center shadow-md mb-4">
 <Loader2 size={28} className="text-white animate-spin" strokeWidth={2.5} />
 </div>
 <div className="text-[13px] font-bold text-[#191F28] mb-1">
 {isQueued ? '대기 중' : '리뷰 수집 중'}
 </div>
 <div className="text-[12px] text-[#4E5968] text-center leading-relaxed">{coupangMessage}</div>
 {coupangElapsed > 0 && (
 <div className="mt-3 text-[11px] text-[#8B95A1]">
 경과 시간: {coupangElapsed}초
 </div>
 )}
 </div>
 )}
 {isCompleted && (
 <div className="flex flex-col items-center justify-center py-4">
 <div className="text-[40px] font-black text-[#191F28] mb-1">{coupangReviewCount}</div>
 <div className="text-[13px] text-[#4E5968]">개의 리뷰를 받아왔어요</div>
 </div>
 )}
 {isFailed && (
 <div className="flex flex-col items-center justify-center py-4">
 <div className="text-[12px] text-[#DC2626] text-center leading-relaxed">{coupangMessage}</div>
 </div>
 )}
 </div>

 {/* 안내 박스 — 처리 중에만 표시 */}
 {!isCompleted && !isFailed && (
 <div className="rounded-xl bg-[#F2F4F6] p-4 flex items-start gap-3 mb-6">
 <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm flex-shrink-0">
 <Lock size={14} className="text-white" strokeWidth={2.5} />
 </div>
 <div className="text-[12px] text-[#4E5968] leading-relaxed">
 평균 8초 정도 걸리지만,<br />
 경우에 따라 최대 1시간까지 걸릴 수 있어요.
 </div>
 </div>
 )}

 <div className="flex-1 min-h-[24px]" />

 {/* 버튼 영역 */}
 <div className="flex gap-2">
 <button
 onClick={() => router.push('/my/platforms')}
 className="flex-1 py-4 rounded-2xl bg-[#F2F4F6] text-[#4E5968] text-[14px] font-bold hover:bg-[#E5E8EB]"
 >
 {isCompleted ? '닫기' : isFailed ? '닫기' : '나중에 확인'}
 </button>
 {isFailed && (
 <button
 onClick={() => { setStep(2); setCoupangStatus('queued'); setCoupangJobId(null) }}
 className="flex-1 py-4 rounded-2xl bg-[#D70530] text-white text-[14px] font-bold hover:bg-[#A30024]"
 >
 다시 시도
 </button>
 )}
 {isCompleted && (
 <Link
 href="/review-admin/coupang"
 className="flex-1 py-4 rounded-2xl bg-[#D70530] text-white text-[14px] font-bold text-center hover:bg-[#A30024]"
 >
 리뷰 보러가기
 </Link>
 )}
 </div>
 </div>
 </main>
 )
 }

 // ── STEP 3: 네이버 플레이스 매장 등록 ──
 if (step === 3) {
 return (
 <main className="min-h-screen bg-white flex flex-col">
 <div className="flex items-center justify-between px-5 pt-4 pb-2">
 <div className="text-[11px] text-[#8B95A1]">STEP 3 / 3</div>
 <Link href="/my/platforms" aria-label="닫기" className="w-8 h-8 flex items-center justify-center text-[#191F28] hover:bg-[#F2F4F6] rounded-lg">
 <X size={20} />
 </Link>
 </div>
 <div className="flex-1 max-w-sm w-full mx-auto px-6 pt-6 pb-8 flex flex-col">
 <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black mb-6 shadow-sm" style={{ background: '#03C75A', color: '#fff' }}>N</div>
 <h1 className="text-[22px] font-black text-[#191F28] leading-snug mb-1">내 매장을 찾아볼게요</h1>
 <p className="text-[13px] text-[#4E5968] mb-2 leading-relaxed">사장님센터 URL을 직접 붙여넣으면 가장 정확해요.<br />매장명 검색은 동명 매장이 있을 때 잘못 매칭될 수 있어요.</p>
 <div className="mb-3 rounded-lg bg-[#FEF3C7] border border-[#FDE68A] p-3 text-[12px] text-[#92400E] leading-relaxed flex items-start gap-2">
 <AlertTriangle size={14} className="text-[#F59E0B] flex-shrink-0 mt-0.5" strokeWidth={2.5} />
 <div>
 <strong>중요</strong>: 같은 이름의 매장이 여러 곳일 때 검색 결과가 다를 수 있어요. 본인이 사장님 권한 있는 정확한 매장이 맞는지 꼭 확인해주세요.
 <br /><strong>가장 정확한 방법</strong>: 사장님센터(<code>new.smartplace.naver.com/bizes/place/...</code>) 또는 본인 매장의 네이버 플레이스 URL 붙여넣기.
 </div>
 </div>
 <div className="mb-6 rounded-lg bg-[#F0FFF7] border border-[#A7F3D0] p-3 text-[12px] text-[#059669] flex items-center gap-2">
 <CheckCircle2 size={14} className="flex-shrink-0" strokeWidth={2.5} />
 <span>찾은 매장 정보는 <strong>설정 페이지</strong>에도 자동으로 반영돼요</span>
 </div>

 {error && <div className="mb-4 rounded-lg bg-[#FEF2F2] border border-[#FECACA] p-3 text-[13px] text-[#DC2626]">{error}</div>}
 {success && <div className="mb-4 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] p-3 text-[13px] text-[#059669] flex items-center gap-2"><CheckCircle2 size={14} strokeWidth={2.5} />{success}</div>}

 <div className="flex gap-2 mb-4">
 <input
 type="text" value={storeQuery}
 onChange={(e) => setStoreQuery(e.target.value)}
 onKeyDown={(e) => e.key === 'Enter' && searchStore()}
 placeholder="권장: 사장님센터 URL 또는 1137287126 (Place ID 숫자)"
 className="flex-1 px-4 py-3 rounded-2xl bg-[#F5F6F8] border border-transparent text-[14px] placeholder-[#B0B8C1] focus:outline-none focus:border-[#191F28] focus:bg-white"
 />
 <button onClick={searchStore} disabled={searching || !storeQuery.trim()} className="px-4 py-3 rounded-2xl bg-[#03C75A] text-white text-[13px] font-bold disabled:opacity-50 whitespace-nowrap">
 {searching ? '검색 중…' : '찾기'}
 </button>
 </div>

 {searchResults.length > 0 && (
 <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
 {searchResults.map((store) => (
 <button key={store.placeId} onClick={() => setSelectedStore(store)}
 className={`w-full text-left p-3 rounded-xl border-2 transition ${selectedStore?.placeId === store.placeId ? 'border-[#03C75A] bg-[#F0FFF7]' : 'border-[#E5E7EB] hover:border-[#03C75A]'}`}>
 <div className="font-semibold text-[#191F28] text-[14px]">{store.name}</div>
 {store.roadAddress && <div className="text-[12px] text-[#6B7280] mt-0.5 flex items-center gap-1"><MapPin size={11} className="flex-shrink-0" strokeWidth={2.5} />{store.roadAddress}</div>}
 {store.category && <div className="text-[12px] text-[#8B95A1] mt-0.5">{store.category}</div>}
 <div className="text-[11px] text-[#03C75A] mt-0.5">플레이스 ID: {store.placeId}</div>
 </button>
 ))}
 </div>
 )}

 {selectedStore && (
 <div className="mb-3 p-3 rounded-xl bg-[#F8FAFF] border border-[#DBEAFE] text-[12px] text-[#4E5968]">
 <div className="font-semibold text-[#191F28] mb-1">저장될 정보</div>
 <div>매장명: {selectedStore.name}</div>
 {(selectedStore.roadAddress || selectedStore.address) && <div>주소: {selectedStore.roadAddress || selectedStore.address}</div>}
 {selectedStore.category && <div>업종: {selectedStore.category}</div>}
 {selectedStore.phone && <div>전화: {selectedStore.phone}</div>}
 </div>
 )}

 {selectedStore && (
 <button onClick={() => saveStoreId(selectedStore)} disabled={savingStore}
 className="w-full py-4 rounded-2xl text-[15px] font-bold text-white disabled:opacity-50 mb-3" style={{ background: '#03C75A' }}>
 {savingStore ? '저장 중…' : '이 매장으로 연결 완료'}
 </button>
 )}

 <button onClick={() => router.push('/my/platforms')} className="w-full py-3 rounded-2xl text-[14px] text-[#6B7280] hover:bg-[#F5F6F8]">
 나중에 설정하기
 </button>
 <div className="mt-6 text-[11px] text-[#8B95A1] leading-relaxed text-center">
 설정 페이지에서도 매장 정보를 수정할 수 있어요
 </div>
 </div>
 </main>
 )
 }

 // ── STEP 1 ──
 if (step === 1) {
 return (
 <main className="min-h-screen bg-[#F9FAFB] py-10">
 <div className="max-w-2xl mx-auto px-4">
 <div className="flex items-center gap-2 text-sm text-[#6B7280] mb-6">
 <Link href="/dashboard" className="hover:text-[#3182F6]">대시보드</Link><span>/</span>
 <Link href="/my/platforms" className="hover:text-[#3182F6]">플랫폼 연결</Link><span>/</span>
 <span className="text-[#191F28]">{meta.label}</span>
 </div>
 <div className="rounded-xl p-6 mb-6 border" style={{ background: meta.brandColor + '15', borderColor: meta.brandColor + '40' }}>
 <div className="flex items-center gap-3 mb-2">
 <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-black" style={{ background: meta.brandColor, color: meta.brandTextColor }}>{meta.initial}</div>
 <div>
 <div className="text-[11px] font-bold mb-0.5" style={{ color: meta.brandColor }}>STEP 1 / {platform === 'naver_place' || platform === 'coupangeats' ? '3' : '2'}</div>
 <h1 className="text-xl font-black text-[#191F28]">{meta.label} 대리권 위임 동의</h1>
 </div>
 </div>
 <p className="text-xs text-[#4E5968] leading-relaxed mt-2">연결 전 아래 3가지 항목에 모두 동의해주세요.</p>
 </div>
 {error && <div className="mb-4 rounded-lg bg-[#FEF2F2] border border-[#FECACA] p-3 text-sm text-[#DC2626]">{error}</div>}
 <div className="rounded-xl bg-white border border-[#E5E7EB] p-6">
 <div className="space-y-4 mb-6">
 <label className="flex gap-3 cursor-pointer">
 <input type="checkbox" checked={agreedScope} onChange={(e) => setAgreedScope(e.target.checked)} className="mt-1 w-4 h-4 accent-[#3182F6]" />
 <div className="flex-1">
 <div className="font-medium text-[#191F28] mb-1">① 위임 범위에 동의합니다 <span className="text-[#DC2626]">*</span></div>
 <div className="text-sm text-[#4E5968] leading-relaxed">로컬루션이 본인 {meta.label} 계정으로 <strong className="text-[#191F28]">(1) 리뷰 조회, (2) 답글 게시, (3) 순위/통계 수집, (4) 로그인 유지</strong>만 대리 수행하는 것에 동의합니다.</div>
 </div>
 </label>
 <label className="flex gap-3 cursor-pointer">
 <input type="checkbox" checked={agreedOwnership} onChange={(e) => setAgreedOwnership(e.target.checked)} className="mt-1 w-4 h-4 accent-[#3182F6]" />
 <div className="flex-1">
 <div className="font-medium text-[#191F28] mb-1">② 본인 계정임을 확인합니다 <span className="text-[#DC2626]">*</span></div>
 <div className="text-sm text-[#4E5968] leading-relaxed">연결하려는 {meta.label} 계정은 <strong className="text-[#191F28]">본인이 직접 소유·운영하는 사업자 계정</strong>임을 확인합니다.</div>
 </div>
 </label>
 <label className="flex gap-3 cursor-pointer">
 <input type="checkbox" checked={agreedRisk} onChange={(e) => setAgreedRisk(e.target.checked)} className="mt-1 w-4 h-4 accent-[#3182F6]" />
 <div className="flex-1">
 <div className="font-medium text-[#191F28] mb-1">③ 자동화 정책 리스크를 인지합니다 <span className="text-[#DC2626]">*</span></div>
 <div className="text-sm text-[#4E5968] leading-relaxed">{meta.label} 정책 변경 시 서비스가 <strong className="text-[#191F28]">예고 없이 중단되거나 계정 제재를 받을 수 있다</strong>는 점을 인지합니다.</div>
 </div>
 </label>
 </div>
 <div className="flex gap-2">
 <Link href="/my/platforms" className="flex-1 text-center py-3 rounded-lg border border-[#E5E7EB] text-sm font-medium text-[#4E5968] hover:bg-[#F9FAFB]">취소</Link>
 <button onClick={submitConsent} disabled={!allAgreed || consentSaving} className="flex-1 py-3 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ background: meta.brandColor }}>
 {consentSaving ? '기록 중…' : '동의하고 다음으로'}
 </button>
 </div>
 </div>
 </div>
 </main>
 )
 }

 // ── STEP 2 ──
 return (
 <main className="min-h-screen bg-white flex flex-col">
 <div className="flex items-center justify-between px-5 pt-4 pb-2">
 <div className="text-[11px] text-[#8B95A1]">STEP 2 / {platform === 'naver_place' || platform === 'coupangeats' ? '3' : '2'}</div>
 <Link href="/my/platforms" aria-label="닫기" className="w-8 h-8 flex items-center justify-center text-[#191F28] hover:bg-[#F2F4F6] rounded-lg">
 <X size={20} />
 </Link>
 </div>
 <div className="flex-1 max-w-sm w-full mx-auto px-6 pt-6 pb-8 flex flex-col">
 <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black mb-8 shadow-sm" style={{ background: meta.brandColor, color: meta.brandTextColor }}>{meta.initial}</div>
 <h1 className="text-[22px] font-black text-[#191F28] leading-snug mb-6">{meta.shortLabel} 리뷰 관리를 위해<br />로그인이 필요해요</h1>
 {platform === 'coupangeats' && (
 <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 p-3 text-[12px] text-amber-900 leading-relaxed flex items-start gap-2">
 <AlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
 <div>
 <strong>쿠팡이츠 사장님 계정</strong> 입니다.<br />
 네이버·배민과 다른 별도 계정이에요. <a href="https://store.coupangeats.com/merchant/login" target="_blank" rel="noopener noreferrer" className="underline font-bold">store.coupangeats.com</a> 에서 사용하시는 사장님 아이디·비밀번호를 입력해주세요.
 </div>
 </div>
 )}
 {error && <div className="mb-4 rounded-lg bg-[#FEF2F2] border border-[#FECACA] p-3 text-[13px] text-[#DC2626]">{error}</div>}
 {success && <div className="mb-4 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] p-3 text-[13px] text-[#059669] flex items-center gap-2"><CheckCircle2 size={14} strokeWidth={2.5} />{success}</div>}
 <input type="text" autoComplete="off" value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder={`${meta.shortLabel} 아이디`} className="w-full px-4 py-4 rounded-2xl bg-[#F5F6F8] border border-transparent text-[15px] placeholder-[#B0B8C1] focus:outline-none focus:border-[#191F28] focus:bg-white mb-3" />
 <div className="relative mb-8">
 <input type={showPw ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={`${meta.shortLabel} 비밀번호`} className="w-full px-4 py-4 pr-12 rounded-2xl bg-[#F5F6F8] border border-transparent text-[15px] placeholder-[#B0B8C1] focus:outline-none focus:border-[#191F28] focus:bg-white" />
 <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[#8B95A1] hover:text-[#191F28]">
 {showPw ? <EyeOff size={20} strokeWidth={2} /> : <Eye size={20} strokeWidth={2} />}
 </button>
 </div>
 <button onClick={submitCredentials} disabled={saving || !accountId || !password} className="w-full py-4 rounded-2xl text-[15px] font-bold disabled:opacity-50 transition flex items-center justify-center gap-2" style={{ background: meta.loginBg, color: meta.loginFg }}>
 {saving && <Loader2 size={16} className="animate-spin" strokeWidth={2.5} />}
 {saving ? '암호화 저장 중…' : '로그인'}
 </button>
 <div className="flex-1 min-h-[24px]" />
 <div className="mt-10">
 <p className="text-[13px] text-[#4E5968] mb-3">{meta.shortLabel} 아이디, 비밀번호를 까먹었다면?</p>
 <div className="flex gap-2">
 {meta.singleForgot
 ? <a href={meta.forgotIdUrl} target="_blank" rel="noopener noreferrer" className="flex-1 py-3 rounded-xl border border-[#E5E8EB] text-[13px] font-semibold text-[#4E5968] text-center hover:bg-[#F9FAFB]">아이디, 비밀번호 찾기 &nbsp;&gt;</a>
 : <><a href={meta.forgotIdUrl} target="_blank" rel="noopener noreferrer" className="flex-1 py-3 rounded-xl border border-[#E5E8EB] text-[13px] font-semibold text-[#4E5968] text-center hover:bg-[#F9FAFB]">아이디 찾기 &nbsp;&gt;</a><a href={meta.forgotPwUrl} target="_blank" rel="noopener noreferrer" className="flex-1 py-3 rounded-xl border border-[#E5E8EB] text-[13px] font-semibold text-[#4E5968] text-center hover:bg-[#F9FAFB]">비밀번호 찾기 &nbsp;&gt;</a></>}
 </div>
 </div>
 <div className="mt-6 text-[11px] text-[#8B95A1] leading-relaxed text-center flex items-center justify-center gap-1">
 <Lock size={11} strokeWidth={2.5} />
 <span>입력한 비밀번호는 즉시 AES-256-GCM 으로 암호화되어 저장돼요</span>
 </div>
 {consentId && <div className="mt-3 text-center text-[10px] text-[#C3CAD1]">동의 기록 ID: {consentId.slice(0, 8)}…</div>}
 </div>
 </main>
 )
}
