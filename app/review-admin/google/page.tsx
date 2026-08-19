'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Lightbulb, Clipboard, Check, Sparkles, Globe, Search, Link2, ExternalLink, X, AlertCircle, Star } from 'lucide-react'
import Sidebar from '../../components/Sidebar'
import Footer from '../../components/Footer'
import PageHeader from '../../components/PageHeader'
import { toast } from '../../lib/toast'
import { buildSettingsHref } from '../../lib/settings-tabs'

interface Review {
 id: number
 author: string
 rating: number
 content: string
 date: string
 replied: boolean
}

const DEMO_REVIEWS: Review[] = [
 { id: 1, author: '김민준', rating: 5, content: '분위기도 좋고 음식도 정말 맛있어요. 서비스도 친절하고 다음에 또 오고 싶은 곳이에요!', date: '5시간 전', replied: true },
 { id: 2, author: '이서연', rating: 4, content: '저녁 식사하기 좋은 곳이에요. 음식 맛은 훌륭한데 가격이 조금 있는 편이에요.', date: '1일 전', replied: false },
 { id: 3, author: '박지훈', rating: 5, content: '이 근처에서 제일 맛있는 곳이에요! 세트 메뉴 강추합니다. 재방문 의사 100%', date: '3일 전', replied: false },
 { id: 4, author: '최수아', rating: 3, content: '음식 맛은 괜찮은데 대기 시간이 조금 길었어요. 인테리어는 예뻐서 사진 찍기 좋아요.', date: '5일 전', replied: false },
]

const PLATFORM = {
 key: 'google',
 label: '구글',
 color: '#4285F4',
 bg: '#EBF3FE',
 textColor: '#1A56B0',
 icon: 'G',
}

function Stars({ n }: { n: number }) {
 return (
 <span className="inline-flex items-center gap-px align-middle">
 {[0, 1, 2, 3, 4].map((i) => (
 <Star key={i} size={13} strokeWidth={0} className="fill-current"
 style={{ color: i < n ? '#F59E0B' : '#E5E8EB' }} />
 ))}
 </span>
 )
}

export default function GoogleReviewPage() {
 const [reviews, setReviews] = useState<Review[]>([])
 const [connected, setConnected] = useState(false)
 const [storeName, setStoreName] = useState('')
 const [replyingId, setReplyingId] = useState<number | null>(null)
 const [aiReply, setAiReply] = useState('')
 const [generating, setGenerating] = useState(false)
 const [filterRating, setFilterRating] = useState<number | null>(null)
 const [filterReplied, setFilterReplied] = useState<'all' | 'replied' | 'unreplied'>('all')
 const [copied, setCopied] = useState(false)
 const [tone, setTone] = useState<'warm' | 'polite' | 'formal'>('warm')
 const [placeId, setPlaceId] = useState<string>('')
 const [connectOpen, setConnectOpen] = useState(false)

 const checkConnection = async () => {
 try {
 const res = await fetch('/api/stores/me', { credentials: 'include', cache: 'no-store' })
 const data = await res.json().catch(() => null)
 const googlePlatform = data?.platforms?.find((p: any) => p.platform === 'google')
 if (googlePlatform?.connected) {
 setConnected(true)
 setStoreName(googlePlatform.platform_store_name || data?.store?.name || '')
 setPlaceId(googlePlatform.platform_store_id || '')
 return
 }
 } catch {}

 // localStorage fallback
 try {
 const linksRaw = localStorage.getItem('localution.platform_links')
 const links = linksRaw ? JSON.parse(linksRaw) : []
 const googleLink = links.find((l: any) => l.platform === 'google')
 const legacyConnected = localStorage.getItem('localution.google.connected') === 'true'
 const isConn = !!googleLink || legacyConnected
 setConnected(isConn)
 let fallbackName = ''
 try {
 const p = JSON.parse(localStorage.getItem('localution_store') || '{}')
 fallbackName = p?.storeName || ''
 } catch {}
 setStoreName(googleLink?.externalName || fallbackName)
 } catch {}
 }

 useEffect(() => {
 checkConnection()
 setReviews(DEMO_REVIEWS)
 }, [])

 const handleAiReply = async (review: Review) => {
 setReplyingId(review.id)
 setGenerating(true)
 setAiReply('')
 try {
 const res = await fetch('/api/ai-review-reply', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 review_text: review.content,
 reviewer_name: review.author,
 rating: review.rating,
 store_name: storeName || '저희 매장',
 tone,
 }),
 })
 const data = await res.json()
 setAiReply(data.reply || data.message || '답글을 만들지 못했어요. 재생성을 눌러주세요.')
 } catch {
 setAiReply('연결이 잠깐 불안정했어요. 다시 시도해주세요.')
 } finally {
 setGenerating(false)
 }
 }

 const handleSubmit = async () => {
 try {
 await navigator.clipboard.writeText(aiReply)
 setCopied(true)
 setTimeout(() => setCopied(false), 2000)
 window.open('https://business.google.com/reviews/', '_blank', 'noopener,noreferrer')
 } catch {
 toast.warn('자동 복사가 안 돼요. 답글을 직접 드래그해서 복사해주세요')
 }
 }

 const filtered = reviews.filter(r => {
 if (filterRating !== null && r.rating !== filterRating) return false
 if (filterReplied === 'replied' && !r.replied) return false
 if (filterReplied === 'unreplied' && r.replied) return false
 return true
 })

 const stats = {
 total: reviews.length,
 unreplied: reviews.filter(r => !r.replied).length,
 avg: reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '0',
 }

 return (
 <div className="min-h-screen bg-[#F8F9FA]">
 <div className="flex flex-1">
 <Sidebar />
 <main className="flex-1 ml-0 md:ml-[220px] pt-4 md:pt-0 min-w-0">
 <PageHeader
 icon={<Globe size={28} className="text-white" strokeWidth={2.5} />}
 title="구글 리뷰 관리"
 subtitle={connected ? `${storeName} · 실시간 리뷰 자동 수집` : 'Google Business Profile 리뷰 · AI 답글 초안 자동 생성'}
 variant="google"
 />
 <div className="max-w-4xl mx-auto p-4 md:p-6 w-full">

 {/* 브레드크럼 + 상태 배지 */}
 <div className="flex items-center gap-2 mb-4 flex-wrap">
 <Link href="/review-admin" className="text-xs text-[#8B95A1] hover:text-[#4E5968] font-semibold">← 리뷰 관리</Link>
 <span className="text-[#E5E8EB]">·</span>
 {connected ? (
 <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] font-semibold">● 연결됨</span>
 ) : (
 <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] font-semibold">데모 모드</span>
 )}
 </div>

 {/* 데모 모드 배너 — 실시간 리뷰 API 연동 전까지 샘플 데이터 */}
 <div className="bg-gradient-to-r from-[#FEF3C7] to-[#FDE68A] border border-[#F59E0B] rounded-2xl p-4 mb-5">
 <div className="flex items-start gap-3 flex-wrap">
 <span className="text-2xl leading-none mt-0.5"></span>
 <div className="flex-1 min-w-[200px]">
 <p className="text-sm font-bold text-[#92400E] mb-1">데모 모드 · API 연동 준비중</p>
 <p className="text-xs text-[#B45309] leading-relaxed">
 현재 화면에 표시되는 리뷰는 기능 체험용 샘플 데이터예요. 구글 비즈니스 프로필 리뷰 API 제휴 심사가 완료되는 대로 실시간으로 연동됩니다.
 </p>
 </div>
 <Link href="/review-admin" className="px-3 py-2 rounded-xl text-[11px] md:text-xs font-bold bg-white text-[#92400E] border border-[#FDE68A] hover:bg-[#FFFBEB] whitespace-nowrap">
 허브로 돌아가기 →
 </Link>
 </div>
 </div>

 {!connected && (
 <div className="rounded-2xl border border-[#BFDBFE] bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] p-4 mb-5">
 <div className="flex items-start gap-3">
 <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4285F4] to-[#1A56B0] flex items-center justify-center shadow-sm flex-shrink-0">
 <Globe size={18} className="text-white" strokeWidth={2.5} />
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-bold text-[#1A56B0] mb-1">구글 매장 연결</p>
 <p className="text-[11px] md:text-xs text-[#1E40AF]/85 leading-relaxed mb-3">
 매장 이름으로 자동 검색하거나, Google Maps URL 을 직접 붙여넣어 연결할 수 있어요.
 연결 후 다음 동기화부터 실시간 리뷰가 들어옵니다.
 </p>
 <button
 onClick={() => setConnectOpen(true)}
 className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white hover:opacity-90 shadow-sm"
 style={{ background: PLATFORM.color }}>
 <Link2 size={12} strokeWidth={2.5} /> 구글 매장 연결하기
 </button>
 </div>
 </div>
 </div>
 )}

 {connected && placeId && (
 <div className="rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] p-3 mb-5 flex items-center justify-between gap-3 flex-wrap">
 <div className="flex items-center gap-2 min-w-0 flex-1">
 <Check size={14} className="text-[#059669] flex-shrink-0" strokeWidth={2.5} />
 <p className="text-xs text-[#166534] truncate">
 <strong>{storeName || '매장'}</strong> 연결됨 · Place ID <code className="bg-white px-1 rounded">{placeId.slice(0, 30)}{placeId.length > 30 ? '...' : ''}</code>
 </p>
 </div>
 <button onClick={() => setConnectOpen(true)}
 className="text-[11px] font-bold text-[#1A56B0] hover:underline flex-shrink-0">
 매장 변경
 </button>
 </div>
 )}

 <div className="grid grid-cols-3 gap-3 mb-5">
 <div className="bg-white rounded-2xl p-4 border border-[#E5E8EB]">
 <p className="text-[11px] text-[#8B95A1] font-medium mb-1">총 리뷰</p>
 <p className="text-xl font-black text-[#191F28]">{stats.total}건</p>
 </div>
 <div className="bg-white rounded-2xl p-4 border border-[#E5E8EB]">
 <p className="text-[11px] text-[#8B95A1] font-medium mb-1">미답변</p>
 <p className="text-xl font-black text-[#F59E0B]">{stats.unreplied}건</p>
 </div>
 <div className="bg-white rounded-2xl p-4 border border-[#E5E8EB]">
 <p className="text-[11px] text-[#8B95A1] font-medium mb-1">평균 별점</p>
 <p className="text-xl font-black text-[#191F28]">{stats.avg}점</p>
 </div>
 </div>

 <div className="bg-white rounded-2xl border border-[#E5E8EB] p-3 mb-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
 <div className="flex items-center gap-1.5 flex-wrap">
 <span className="text-[11px] text-[#8B95A1] font-semibold mr-1">평점</span>
 <button onClick={() => setFilterRating(null)}
 className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${filterRating === null ? 'text-white' : 'bg-[#F2F4F6] text-[#4E5968]'}`}
 style={filterRating === null ? { background: PLATFORM.color } : {}}>전체</button>
 {[5, 4, 3, 2, 1].map(n => (
 <button key={n} onClick={() => setFilterRating(n)}
 className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${filterRating === n ? 'text-white' : 'bg-[#F2F4F6] text-[#4E5968]'}`}
 style={filterRating === n ? { background: PLATFORM.color } : {}}><span className="inline-flex items-center gap-0.5">{n}<Star size={11} strokeWidth={0} className="fill-current" /></span></button>
 ))}
 </div>
 <div className="flex items-center gap-1.5 flex-wrap">
 <span className="text-[11px] text-[#8B95A1] font-semibold mr-1">상태</span>
 {([['all','전체'],['unreplied','미답변'],['replied','답변완료']] as const).map(([v, l]) => (
 <button key={v} onClick={() => setFilterReplied(v)}
 className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${filterReplied === v ? 'text-white' : 'bg-[#F2F4F6] text-[#4E5968]'}`}
 style={filterReplied === v ? { background: PLATFORM.color } : {}}>{l}</button>
 ))}
 </div>
 </div>

 <div className="space-y-3">
 {filtered.length === 0 ? (
 <div className="bg-white rounded-2xl p-8 text-center text-sm text-[#8B95A1] border border-[#E5E8EB]">
 선택하신 조건에 맞는 리뷰는 아직 없어요
 </div>
 ) : filtered.map(review => (
 <div key={review.id} className="bg-white rounded-2xl border border-[#E5E8EB] p-4 md:p-5">
 <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
 <div className="flex items-center gap-2 flex-wrap">
 <span className="text-sm font-bold text-[#191F28]">{review.author}</span>
 <Stars n={review.rating} />
 </div>
 <div className="flex items-center gap-2">
 <span className="text-[11px] text-[#8B95A1]">{review.date}</span>
 {review.replied && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ECFDF5] text-[#059669] font-semibold">답변완료</span>}
 </div>
 </div>
 <p className="text-sm text-[#4E5968] leading-relaxed mb-3 break-words">{review.content}</p>

 {replyingId === review.id && (
 <div className="rounded-xl p-3 mb-3 border" style={{ background: PLATFORM.bg, borderColor: PLATFORM.color + '40' }}>
 {generating ? (
 <p className="text-sm font-semibold" style={{ color: PLATFORM.textColor }}>AI 답글 생성 중...</p>
 ) : aiReply ? (
 <>
 <div className="mb-2">
 <div className="flex items-center gap-1.5 mb-2 flex-wrap">
 <span className="text-[10px] text-[#8B95A1] font-semibold">톤</span>
 {(['warm','polite','formal'] as const).map(t => {
 const label = t === 'warm' ? '친근' : t === 'polite' ? '정중' : '공식'
 const active = tone === t
 return (
 <button key={t}
 onClick={() => { setTone(t); if (replyingId && aiReply) { const r = reviews.find(x => x.id === replyingId); if (r) { setTone(t); setTimeout(() => handleAiReply(r), 0) } } }}
 className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${active ? 'text-white' : 'bg-[#F2F4F6] text-[#4E5968]'}`}
 style={active ? { background: PLATFORM.color } : {}}>
 {label}
 </button>
 )
 })}
 <span className="text-[9px] text-[#8B95A1] ml-0.5">· 클릭하면 재생성</span>
 </div>
 <p className="text-[10px] text-[#8B95A1] mb-1.5 flex items-center gap-1">
 <Lightbulb size={10} strokeWidth={2.5} />
 복사 후 구글 비즈니스 프로필에 붙여넣기
 </p>
 <p className="text-sm text-[#191F28] leading-relaxed">{aiReply}</p>
 </div>
 <div className="flex gap-2 flex-wrap">
 <button onClick={handleSubmit}
 className="px-3 py-1.5 rounded-lg text-xs font-bold text-white hover:opacity-90 flex items-center gap-1.5"
 style={{ background: PLATFORM.color }}>
 {copied ? (
 <><Check size={11} strokeWidth={3} /> 복사됨, 붙여넣기</>
 ) : (
 <><Clipboard size={11} strokeWidth={2.5} /> 복사 + 구글 열기</>
 )}
 </button>
 <button onClick={() => handleAiReply(review)}
 className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#F2F4F6] text-[#4E5968]">재생성</button>
 <button onClick={() => { setReplyingId(null); setAiReply('') }}
 className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#8B95A1]">취소</button>
 </div>
 </>
 ) : null}
 </div>
 )}

 {!review.replied && replyingId !== review.id && (
 <button onClick={() => handleAiReply(review)}
 className="px-4 py-2 rounded-xl text-xs font-bold text-white hover:opacity-90 flex items-center gap-1.5"
 style={{ background: PLATFORM.color }}>
 <Sparkles size={12} strokeWidth={2.5} />
 AI 답글 생성
 </button>
 )}
 </div>
 ))}
 </div>

 {/* ── Footer ── */}
 <div className="-mx-4 md:-mx-6 mt-10">
 <Footer />
 </div>

 </div>
 </main>
 </div>

 {/* 구글 매장 연결 모달 */}
 {connectOpen && (
 <GoogleConnectModal
 onClose={() => setConnectOpen(false)}
 onConnected={(name, id) => {
 setConnected(true)
 setStoreName(name || storeName)
 setPlaceId(id)
 setConnectOpen(false)
 toast.success('구글 매장 연결 완료')
 checkConnection()
 }}
 />
 )}
 </div>
 )
}

// ─────────────────────────────────────────────
// 구글 매장 연결 모달 — 자동 검색 + URL 직접 입력
// ─────────────────────────────────────────────
function GoogleConnectModal({ onClose, onConnected }: {
 onClose: () => void
 onConnected: (name: string, placeId: string) => void
}) {
 const [mode, setMode] = useState<'auto' | 'url'>('auto')
 const [query, setQuery] = useState('')
 const [url, setUrl] = useState('')
 const [loading, setLoading] = useState(false)
 const [candidates, setCandidates] = useState<Array<{
 placeId: string; name: string; address: string; rating: number | null; totalRatings: number; url: string
 }>>([])
 const [error, setError] = useState('')

 async function autoSearch() {
 setLoading(true); setError(''); setCandidates([])
 try {
 const res = await fetch('/api/place/google/auto-connect', {
 method: 'POST',
 credentials: 'include',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ query: query.trim() || undefined }),
 })
 const data = await res.json()
 if (!data.ok) {
 setError(data.error || '검색 실패')
 return
 }
 if (data.auto && data.saved) {
 onConnected(data.saved.name, data.saved.placeId)
 return
 }
 if (Array.isArray(data.candidates) && data.candidates.length > 0) {
 setCandidates(data.candidates)
 } else {
 setError('검색 결과 없음 — Google Maps URL 직접 입력을 사용해주세요')
 setMode('url')
 }
 } catch (e: any) {
 setError(e?.message || '오류')
 } finally {
 setLoading(false)
 }
 }

 async function pickCandidate(placeId: string, name: string) {
 setLoading(true); setError('')
 try {
 const res = await fetch('/api/place/google/set-place', {
 method: 'POST',
 credentials: 'include',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ place_id: placeId }),
 })
 const data = await res.json()
 if (!data.ok) { setError(data.error || '저장 실패'); return }
 onConnected(name, placeId)
 } catch (e: any) {
 setError(e?.message || '오류')
 } finally { setLoading(false) }
 }

 async function submitUrl() {
 if (!url.trim()) return
 setLoading(true); setError('')
 try {
 const res = await fetch('/api/place/google/set-place', {
 method: 'POST',
 credentials: 'include',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ url: url.trim() }),
 })
 const data = await res.json()
 if (!data.ok) { setError(data.error || '저장 실패'); return }
 onConnected('', data.saved_id || '')
 } catch (e: any) {
 setError(e?.message || '오류')
 } finally { setLoading(false) }
 }

 return (
 <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
 <div className="bg-white w-full md:max-w-md rounded-t-3xl md:rounded-2xl p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-2">
 <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4285F4] to-[#1A56B0] flex items-center justify-center shadow-sm">
 <Globe size={16} className="text-white" strokeWidth={2.5} />
 </div>
 <h3 className="text-base font-black text-[#191F28]">구글 매장 연결</h3>
 </div>
 <button onClick={onClose} className="p-1 text-[#8B95A1]">
 <X size={18} strokeWidth={2.5} />
 </button>
 </div>

 {/* 모드 탭 */}
 <div className="grid grid-cols-2 gap-1 p-1 bg-[#F2F4F6] rounded-xl mb-4">
 <button onClick={() => setMode('auto')}
 className={`py-2 rounded-lg text-xs font-bold transition-colors ${mode === 'auto' ? 'bg-white text-[#191F28] shadow-sm' : 'text-[#8B95A1]'}`}>
 자동 검색
 </button>
 <button onClick={() => setMode('url')}
 className={`py-2 rounded-lg text-xs font-bold transition-colors ${mode === 'url' ? 'bg-white text-[#191F28] shadow-sm' : 'text-[#8B95A1]'}`}>
 URL 직접 입력
 </button>
 </div>

 {mode === 'auto' && (
 <div className="space-y-3">
 <div>
 <label className="text-[11px] font-bold text-[#4E5968] mb-1 block">매장 이름 (비워두면 등록된 매장 정보 사용)</label>
 <div className="flex gap-2">
 <input type="text" value={query} onChange={e => setQuery(e.target.value)}
 placeholder="예: 부천 피노카페"
 className="flex-1 px-2.5 py-2 border border-[#E5E8EB] rounded-lg text-sm focus:outline-none focus:border-[#4285F4]" />
 <button onClick={autoSearch} disabled={loading}
 className="inline-flex items-center gap-1 px-3 py-2 bg-[#4285F4] text-white rounded-lg text-xs font-bold hover:bg-[#1A56B0] disabled:opacity-50">
 <Search size={12} strokeWidth={2.5} />
 {loading ? '...' : '검색'}
 </button>
 </div>
 </div>

 {error && (
 <div className="rounded-lg bg-[#FEF2F2] border border-[#FECACA] p-2.5 flex items-start gap-2">
 <AlertCircle size={12} className="text-[#DC2626] flex-shrink-0 mt-0.5" strokeWidth={2.5} />
 <p className="text-[11px] text-[#DC2626] leading-relaxed">{error}</p>
 </div>
 )}

 {candidates.length > 0 && (
 <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
 {candidates.map(c => (
 <button key={c.placeId}
 onClick={() => pickCandidate(c.placeId, c.name)}
 disabled={loading}
 className="w-full text-left p-3 rounded-xl border border-[#E5E8EB] hover:border-[#4285F4] hover:bg-[#EFF6FF]/30 transition-colors disabled:opacity-50">
 <p className="text-sm font-bold text-[#191F28] truncate">{c.name}</p>
 <p className="text-[11px] text-[#8B95A1] truncate">{c.address}</p>
 {c.rating != null && (
 <p className="text-[10px] text-[#F59E0B] mt-0.5 flex items-center gap-px">
 {Array.from({ length: Math.round(c.rating) }).map((_, i) => (
 <Star key={i} size={10} strokeWidth={0} className="fill-current" />
 ))}
 <span className="text-[#8B95A1] ml-1">({c.totalRatings})</span>
 </p>
 )}
 </button>
 ))}
 </div>
 )}
 </div>
 )}

 {mode === 'url' && (
 <div className="space-y-3">
 <div>
 <label className="text-[11px] font-bold text-[#4E5968] mb-1 block">Google Maps URL 또는 Place ID</label>
 <textarea value={url} onChange={e => setUrl(e.target.value)}
 placeholder="https://www.google.com/maps/place/... 또는 ChIJ..."
 className="w-full px-2.5 py-2 border border-[#E5E8EB] rounded-lg text-sm focus:outline-none focus:border-[#4285F4] resize-y min-h-[80px] font-mono text-[12px]" />
 <p className="text-[10px] text-[#8B95A1] mt-1 leading-relaxed">
 Google Maps 에서 매장 페이지 → 공유 → 링크 복사. 또는 직접 Place ID 를 붙여넣어도 됩니다.
 </p>
 </div>

 {error && (
 <div className="rounded-lg bg-[#FEF2F2] border border-[#FECACA] p-2.5 flex items-start gap-2">
 <AlertCircle size={12} className="text-[#DC2626] flex-shrink-0 mt-0.5" strokeWidth={2.5} />
 <p className="text-[11px] text-[#DC2626] leading-relaxed">{error}</p>
 </div>
 )}

 <button onClick={submitUrl} disabled={loading || !url.trim()}
 className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#4285F4] text-white rounded-xl text-sm font-bold hover:bg-[#1A56B0] disabled:opacity-50 shadow-sm">
 <Link2 size={14} strokeWidth={2.5} />
 {loading ? '저장 중...' : '연결하기'}
 </button>
 </div>
 )}

 <div className="mt-4 pt-3 border-t border-[#F2F4F6]">
 <a href="https://business.google.com/" target="_blank" rel="noopener noreferrer"
 className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1A56B0] hover:underline">
 <ExternalLink size={11} strokeWidth={2.5} />
 Google Business Profile 열기
 </a>
 </div>
 </div>
 </div>
 )
}

