'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
 Send, AlertTriangle, CheckCircle2, Clock, XCircle,
 Trash2, RefreshCw, Settings, Hash, Image as ImageIcon,
 CalendarClock, Loader2, Link2Off, Plus, X, Upload,
 Sparkles, ChevronDown, BookMarked, Star, Youtube,
} from 'lucide-react'
import NextImage from 'next/image'
import Sidebar from '@/app/components/Sidebar'
import Footer from '@/app/components/Footer'
import Link from 'next/link'

// ──────────────────────────────────────────
// 타입
// ──────────────────────────────────────────
type ThreadsPost = {
 id: string
 text_content: string
 hashtags: string[]
 image_url: string | null
 media_type: 'TEXT' | 'IMAGE'
 status: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed'
 scheduled_at: string | null
 published_at: string | null
 threads_post_id: string | null
 error_message: string | null
 retry_count: number
 created_at: string
}

type AccountInfo = {
 connected: boolean
 username?: string
 expires_in_days?: number
}

// ──────────────────────────────────────────
// 상태 뱃지
// ──────────────────────────────────────────
function StatusBadge({ status }: { status: ThreadsPost['status'] }) {
 const map = {
 draft: { label: '임시저장', bg: 'bg-[#F3F4F6]', text: 'text-[#6B7280]' },
 scheduled: { label: '예약됨', bg: 'bg-[#EFF6FF]', text: 'text-[#3182F6]' },
 publishing: { label: '발행중', bg: 'bg-[#FFF7ED]', text: 'text-[#EA580C]' },
 published: { label: '발행완료', bg: 'bg-[#ECFDF5]', text: 'text-[#059669]' },
 failed: { label: '실패', bg: 'bg-[#FFF1F2]', text: 'text-[#E11D48]' },
 }
 const s = map[status] ?? map.draft
 return (
 <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
 {s.label}
 </span>
 )
}

// ──────────────────────────────────────────
// 계정 연결 배너
// ──────────────────────────────────────────
function ConnectBanner() {
 return (
 <div className="bg-[#FFF7F0] border border-[#FED7AA] rounded-2xl p-5 flex items-start gap-4 mb-6">
 <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F97316] to-[#EA580C] shadow-sm flex items-center justify-center flex-shrink-0">
 <AlertTriangle size={16} className="text-white" strokeWidth={2.5} />
 </div>
 <div className="flex-1 min-w-0">
 <p className="font-semibold text-[#111827] text-sm">Threads 계정이 연결되지 않았습니다</p>
 <p className="text-xs text-[#4E5968] mt-1">Meta API 인증 후 자동 발행 기능을 사용할 수 있습니다.</p>
 <Link
 href="/marketing/threads/connect"
 className="mt-3 inline-flex items-center gap-1.5 bg-[#111827] text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-[#1F2937] transition-colors"
 >
 <Link2Off size={12} strokeWidth={2.5} />
 계정 연결하기
 </Link>
 </div>
 </div>
 )
}

// ──────────────────────────────────────────
// 페르소나
// ──────────────────────────────────────────
const PERSONAS = [
 { id: 'friendly', label: '친근한', sub: '동네 사장님' },
 { id: 'professional', label: '전문적', sub: '신뢰감' },
 { id: 'emotional', label: '감성적', sub: '공감 유도' },
 { id: 'witty', label: '유머러스', sub: '재치있게' },
] as const

type PersonaId = typeof PERSONAS[number]['id']

function PersonaChips({ value, onChange }: { value: PersonaId; onChange: (v: PersonaId) => void }) {
 return (
 <div className="flex items-center gap-2 flex-wrap">
 <span className="text-xs font-semibold text-[#6B7280] flex-shrink-0">페르소나</span>
 {PERSONAS.map(p => (
 <button
 key={p.id}
 type="button"
 onClick={() => onChange(p.id)}
 title={p.sub}
 className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
 value === p.id
 ? 'bg-[#111827] text-white shadow-sm'
 : 'bg-[#F3F4F6] text-[#4E5968] hover:bg-[#E5E8EB]'
 }`}
 >
 {p.label}
 </button>
 ))}
 </div>
 )
}

// ──────────────────────────────────────────
// AI 초안 생성 패널
// ──────────────────────────────────────────
function AIDraftPanel({
 persona,
 onApply,
}: {
 persona: PersonaId
 onApply: (text: string, hashtags: string[]) => void
}) {
 const [open, setOpen] = useState(false)
 const [topic, setTopic] = useState('')
 const [loading, setLoading] = useState(false)
 const [error, setError] = useState('')

 async function generate() {
 if (!topic.trim()) return
 setLoading(true)
 setError('')
 try {
 const res = await fetch('/api/threads/generate', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ topic: topic.trim(), persona }),
 })
 const data = await res.json()
 if (data.ok) {
 onApply(data.text, data.hashtags)
 setOpen(false)
 setTopic('')
 } else {
 setError(data.error || 'AI 생성 실패')
 }
 } catch {
 setError('네트워크 오류')
 } finally {
 setLoading(false)
 }
 }

 return (
 <div className="bg-white border border-[#E5E8EB] rounded-2xl overflow-hidden">
 <button
 type="button"
 onClick={() => setOpen(v => !v)}
 className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#F9FAFB] transition-colors"
 >
 <span className="flex items-center gap-2">
 <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#6D28D9] flex items-center justify-center shadow-sm">
 <Sparkles size={13} className="text-white" strokeWidth={2.5} />
 </div>
 <span className="text-sm font-semibold text-[#111827]">AI 초안 생성</span>
 <span className="text-xs text-[#9CA3AF]">주제만 입력하면 완성</span>
 </span>
 <ChevronDown size={14} className={`text-[#9CA3AF] transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
 </button>

 {open && (
 <div className="px-4 pb-4 border-t border-[#F3F4F6] space-y-3 pt-3">
 <input
 type="text"
 value={topic}
 onChange={e => setTopic(e.target.value)}
 onKeyDown={e => { if (e.key === 'Enter' && !loading) generate() }}
 placeholder="예: 오늘 신메뉴 출시, 봄 시즌 할인, 단골 감사 이벤트"
 className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED]"
 />
 <p className="text-xs text-[#9CA3AF]">위에서 선택한 페르소나 말투로 생성됩니다.</p>
 {error && <p className="text-xs text-[#E11D48]">{error}</p>}
 <button
 type="button"
 onClick={generate}
 disabled={!topic.trim() || loading}
 className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] hover:from-[#6D28D9] hover:to-[#5B21B6] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-all text-sm"
 >
 {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} strokeWidth={2.5} />}
 {loading ? '생성 중...' : '초안 생성'}
 </button>
 </div>
 )}
 </div>
 )
}

// ──────────────────────────────────────────
// 템플릿 관리 (localStorage)
// ──────────────────────────────────────────
type Template = { id: string; name: string; blocks: PostBlock[]; createdAt: string }
const TMPL_KEY = 'threads_templates_v1'

function loadTemplates(): Template[] {
 if (typeof window === 'undefined') return []
 try { return JSON.parse(localStorage.getItem(TMPL_KEY) || '[]') as Template[] } catch { return [] }
}
function persistTemplates(list: Template[]) {
 localStorage.setItem(TMPL_KEY, JSON.stringify(list.slice(0, 20)))
}

function TemplatePanel({ blocks, onLoad }: { blocks: PostBlock[]; onLoad: (b: PostBlock[]) => void }) {
 const [open, setOpen] = useState(false)
 const [templates, setTemplates] = useState<Template[]>([])
 const [saving, setSaving] = useState(false)
 const [saveName, setSaveName] = useState('')

 function refresh() { setTemplates(loadTemplates()) }

 useEffect(() => { if (open) refresh() }, [open])

 function handleSave() {
 if (!saveName.trim()) return
 const list = loadTemplates()
 const newT: Template = {
 id: Math.random().toString(36).slice(2),
 name: saveName.trim(),
 blocks: blocks.map(b => ({ ...b, id: Math.random().toString(36).slice(2) })),
 createdAt: new Date().toISOString(),
 }
 persistTemplates([newT, ...list])
 setSaveName('')
 setSaving(false)
 refresh()
 }

 function handleDelete(id: string) {
 persistTemplates(loadTemplates().filter(t => t.id !== id))
 refresh()
 }

 return (
 <div className="bg-white border border-[#E5E8EB] rounded-2xl overflow-hidden">
 <button
 type="button"
 onClick={() => setOpen(v => !v)}
 className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#F9FAFB] transition-colors"
 >
 <span className="flex items-center gap-2">
 <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center shadow-sm">
 <BookMarked size={13} className="text-white" strokeWidth={2.5} />
 </div>
 <span className="text-sm font-semibold text-[#111827]">템플릿</span>
 <span className="text-xs text-[#9CA3AF]">자주 쓰는 형식 저장</span>
 </span>
 <ChevronDown size={14} className={`text-[#9CA3AF] transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
 </button>

 {open && (
 <div className="px-4 pb-4 border-t border-[#F3F4F6] pt-3 space-y-3">
 {saving ? (
 <div className="flex gap-2">
 <input
 type="text"
 value={saveName}
 onChange={e => setSaveName(e.target.value)}
 onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
 placeholder="템플릿 이름"
 autoFocus
 className="flex-1 border border-[#E5E8EB] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/30 focus:border-[#F59E0B]"
 />
 <button type="button" onClick={handleSave} disabled={!saveName.trim()}
 className="px-3 py-2 bg-[#111827] text-white text-xs font-semibold rounded-xl disabled:opacity-40 transition-colors">
 저장
 </button>
 <button type="button" onClick={() => setSaving(false)}
 className="px-3 py-2 text-[#6B7280] text-xs rounded-xl hover:bg-[#F3F4F6] transition-colors">
 취소
 </button>
 </div>
 ) : (
 <button
 type="button"
 onClick={() => setSaving(true)}
 className="flex items-center gap-1.5 text-xs font-semibold text-[#F59E0B] hover:text-[#D97706] border border-dashed border-[#FCD34D] hover:border-[#F59E0B] px-3 py-2 rounded-xl transition-colors"
 >
 <BookMarked size={12} strokeWidth={2.5} />
 현재 내용을 템플릿으로 저장
 </button>
 )}

 {templates.length === 0 ? (
 <p className="text-xs text-[#B0B8C1] text-center py-2">저장된 템플릿이 없습니다.</p>
 ) : (
 <div className="space-y-2">
 {templates.map(t => (
 <div key={t.id} className="flex items-center gap-2 p-2.5 bg-[#F9FAFB] rounded-xl">
 <div className="flex-1 min-w-0">
 <p className="text-xs font-semibold text-[#111827] truncate">{t.name}</p>
 <p className="text-xs text-[#B0B8C1] mt-0.5 truncate">
 {t.blocks[0]?.text?.slice(0, 45) || '(내용 없음)'}
 </p>
 </div>
 <button
 type="button"
 onClick={() => {
 onLoad(t.blocks.map(b => ({ ...b, id: Math.random().toString(36).slice(2) })))
 setOpen(false)
 }}
 className="text-xs font-semibold text-[#3182F6] hover:text-[#2563EB] px-2 py-1 rounded-lg hover:bg-[#EFF6FF] transition-colors flex-shrink-0"
 >
 불러오기
 </button>
 <button
 type="button"
 onClick={() => handleDelete(t.id)}
 className="p-1 text-[#D1D5DB] hover:text-[#E11D48] rounded-lg transition-colors flex-shrink-0"
 >
 <Trash2 size={12} strokeWidth={2} />
 </button>
 </div>
 ))}
 </div>
 )}
 </div>
 )}
 </div>
 )
}

// ──────────────────────────────────────────
// 리뷰 기반 생성 패널
// ──────────────────────────────────────────
type PositiveReview = {
 id: string
 platform: string
 rating: number
 content: string
 author_mask: string | null
 posted_at: string
}

const PLATFORM_LABEL: Record<string, string> = {
 naver_place: '네이버',
 baemin: '배민',
 coupangeats: '쿠팡이츠',
 yogiyo: '요기요',
 kakao_map: '카카오맵',
}

function ReviewDraftPanel({
 persona,
 onApply,
}: {
 persona: PersonaId
 onApply: (text: string, hashtags: string[]) => void
}) {
 const [open, setOpen] = useState(false)
 const [reviews, setReviews] = useState<PositiveReview[]>([])
 const [loadingReviews, setLoadingReviews] = useState(false)
 const [selectedId, setSelectedId] = useState<string | null>(null)
 const [generating, setGenerating] = useState(false)
 const [error, setError] = useState('')

 useEffect(() => {
 if (!open || reviews.length > 0) return
 setLoadingReviews(true)
 fetch('/api/threads/positive-reviews')
 .then(r => r.json())
 .then(d => setReviews(d.reviews ?? []))
 .catch(() => {})
 .finally(() => setLoadingReviews(false))
 }, [open, reviews.length])

 async function generate() {
 const review = reviews.find(r => r.id === selectedId)
 if (!review) return
 setGenerating(true)
 setError('')
 try {
 const res = await fetch('/api/threads/generate', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 mode: 'from_review',
 review_text: review.content,
 review_rating: review.rating,
 persona,
 }),
 })
 const data = await res.json()
 if (data.ok) {
 onApply(data.text, data.hashtags)
 setOpen(false)
 setSelectedId(null)
 } else {
 setError(data.error || '생성 실패')
 }
 } catch {
 setError('네트워크 오류')
 } finally {
 setGenerating(false)
 }
 }

 return (
 <div className="bg-white border border-[#E5E8EB] rounded-2xl overflow-hidden">
 <button
 type="button"
 onClick={() => setOpen(v => !v)}
 className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#F9FAFB] transition-colors"
 >
 <span className="flex items-center gap-2">
 <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#059669] to-[#047857] flex items-center justify-center shadow-sm">
 <Star size={13} className="text-white" strokeWidth={2.5} />
 </div>
 <span className="text-sm font-semibold text-[#111827]">리뷰에서 생성</span>
 <span className="text-xs text-[#9CA3AF]">긍정 리뷰 → 감사 포스트</span>
 </span>
 <ChevronDown size={14} className={`text-[#9CA3AF] transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
 </button>

 {open && (
 <div className="px-4 pb-4 border-t border-[#F3F4F6] pt-3 space-y-3">
 {loadingReviews ? (
 <div className="flex items-center justify-center py-6">
 <Loader2 size={20} className="animate-spin text-[#B0B8C1]" />
 </div>
 ) : reviews.length === 0 ? (
 <p className="text-xs text-[#B0B8C1] text-center py-4">
 4-5점 리뷰가 없거나 아직 수집되지 않았습니다.
 </p>
 ) : (
 <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
 {reviews.map(r => (
 <button
 key={r.id}
 type="button"
 onClick={() => setSelectedId(r.id === selectedId ? null : r.id)}
 className={`w-full text-left p-2.5 rounded-xl border transition-all ${
 r.id === selectedId
 ? 'border-[#059669] bg-[#F0FDF4]'
 : 'border-[#E5E8EB] hover:border-[#D1D5DB] bg-[#F9FAFB]'
 }`}
 >
 <div className="flex items-center gap-2 mb-1">
 <span className="inline-flex items-center gap-px text-[#059669]">
 {Array.from({ length: r.rating ?? 5 }).map((_, si) => (
 <Star key={si} size={11} strokeWidth={0} className="fill-current" />
 ))}
 </span>
 <span className="text-xs text-[#9CA3AF]">
 {PLATFORM_LABEL[r.platform] ?? r.platform}
 </span>
 {r.author_mask && (
 <span className="text-xs text-[#B0B8C1]">{r.author_mask}</span>
 )}
 </div>
 <p className="text-xs text-[#374151] line-clamp-2">{r.content}</p>
 </button>
 ))}
 </div>
 )}
 {error && <p className="text-xs text-[#E11D48]">{error}</p>}
 {selectedId && (
 <button
 type="button"
 onClick={generate}
 disabled={generating}
 className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#059669] to-[#047857] hover:from-[#047857] hover:to-[#065F46] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-all text-sm"
 >
 {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} strokeWidth={2.5} />}
 {generating ? '생성 중...' : '이 리뷰로 스레드 생성'}
 </button>
 )}
 </div>
 )}
 </div>
 )
}

// ──────────────────────────────────────────
// 해시태그 입력 칩
// ──────────────────────────────────────────
function HashtagInput({
 tags,
 onChange,
}: {
 tags: string[]
 onChange: (tags: string[]) => void
}) {
 const [input, setInput] = useState('')

 function addTag(raw: string) {
 const tag = raw.replace(/^#+/, '').trim()
 if (!tag) return
 if (!tags.includes(tag)) onChange([...tags, tag])
 setInput('')
 }

 function removeTag(tag: string) {
 onChange(tags.filter(t => t !== tag))
 }

 return (
 <div>
 <div className="flex flex-wrap gap-1.5 mb-2">
 {tags.map(tag => (
 <span
 key={tag}
 className="inline-flex items-center gap-1 bg-[#EFF6FF] text-[#3182F6] text-xs font-medium px-2.5 py-1 rounded-full"
 >
 <Hash size={10} strokeWidth={2.5} />
 {tag}
 <button
 type="button"
 onClick={() => removeTag(tag)}
 className="ml-0.5 hover:text-[#DC2626] transition-colors"
 >
 ×
 </button>
 </span>
 ))}
 </div>
 <input
 type="text"
 value={input}
 onChange={e => setInput(e.target.value)}
 onKeyDown={e => {
 if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
 e.preventDefault()
 addTag(input)
 }
 }}
 onBlur={() => { if (input.trim()) addTag(input) }}
 placeholder="해시태그 입력 후 Enter (# 없이)"
 className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2.5 text-sm text-[#111827] placeholder:text-[#B0B8C1] focus:outline-none focus:ring-2 focus:ring-[#111827]/20 focus:border-[#111827]"
 />
 </div>
 )
}

// ──────────────────────────────────────────
// 이미지 드래그앤드롭 업로드
// ──────────────────────────────────────────
function ImageDropZone({
 imageUrl,
 onUpload,
 onClear,
}: {
 imageUrl: string
 onUpload: (url: string) => void
 onClear: () => void
}) {
 const [dragging, setDragging] = useState(false)
 const [uploading, setUploading] = useState(false)
 const [error, setError] = useState('')
 const inputRef = useRef<HTMLInputElement>(null)

 async function uploadFile(file: File) {
 setUploading(true)
 setError('')
 try {
 const fd = new FormData()
 fd.append('file', file)
 const res = await fetch('/api/threads/upload', { method: 'POST', body: fd })
 const data = await res.json()
 if (data.url) {
 onUpload(data.url)
 } else {
 setError(data.error || '업로드 실패')
 }
 } catch {
 setError('네트워크 오류')
 } finally {
 setUploading(false)
 }
 }

 function onDrop(e: React.DragEvent) {
 e.preventDefault()
 setDragging(false)
 const file = e.dataTransfer.files[0]
 if (file) uploadFile(file)
 }

 if (imageUrl) {
 return (
 <div className="relative mt-3 rounded-xl overflow-hidden border border-[#E5E8EB] group">
 <NextImage src={imageUrl} alt="업로드 이미지" width={600} height={400}
 className="w-full max-h-64 object-cover" unoptimized />
 <button
 type="button"
 onClick={onClear}
 className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors"
 >
 <X size={13} strokeWidth={2.5} />
 </button>
 </div>
 )
 }

 return (
 <div className="mt-3">
 <div
 onDragOver={e => { e.preventDefault(); setDragging(true) }}
 onDragLeave={() => setDragging(false)}
 onDrop={onDrop}
 onClick={() => inputRef.current?.click()}
 className={`border-2 border-dashed rounded-xl px-4 py-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
 dragging ? 'border-[#111827] bg-[#F3F4F6]' : 'border-[#D1D5DB] hover:border-[#9CA3AF] hover:bg-[#F9FAFB]'
 }`}
 >
 {uploading ? (
 <Loader2 size={24} className="animate-spin text-[#6B7280]" />
 ) : (
 <Upload size={24} className="text-[#9CA3AF]" strokeWidth={1.5} />
 )}
 <p className="text-sm text-[#6B7280] font-medium">
 {uploading ? '업로드 중...' : '이미지를 드래그하거나 클릭해서 선택'}
 </p>
 <p className="text-xs text-[#B0B8C1]">JPG, PNG, GIF, WebP · 최대 8MB</p>
 </div>
 {error && <p className="mt-1.5 text-xs text-[#E11D48]">{error}</p>}
 <input ref={inputRef} type="file" accept="image/*" className="hidden"
 onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f) }} />
 </div>
 )
}

// ──────────────────────────────────────────
// 단일 포스트 작성 블록
// ──────────────────────────────────────────
type PostBlock = {
 id: string
 text: string
 tags: string[]
 imageUrl: string
 useImage: boolean
}

function PostBlockEditor({
 block,
 index,
 isFirst,
 canRemove,
 onChange,
 onRemove,
}: {
 block: PostBlock
 index: number
 isFirst: boolean
 canRemove: boolean
 onChange: (b: PostBlock) => void
 onRemove: () => void
}) {
 const MAX_CHARS = 500
 const charCount = block.text.length

 return (
 <div className="relative flex gap-3">
 {/* 스레드 연결선 */}
 <div className="flex flex-col items-center flex-shrink-0" style={{ width: 32 }}>
 <div className="w-8 h-8 rounded-full bg-[#F3F4F6] border border-[#E5E8EB] flex items-center justify-center text-xs font-bold text-[#6B7280]">
 {index + 1}
 </div>
 {!isFirst || true ? <div className="w-0.5 flex-1 mt-1 bg-[#E5E8EB] min-h-[20px]" /> : null}
 </div>

 <div className="flex-1 min-w-0 pb-4">
 {/* 삭제 버튼 */}
 {canRemove && (
 <button type="button" onClick={onRemove}
 className="float-right ml-2 p-1 rounded-lg hover:bg-[#FFF1F2] text-[#D1D5DB] hover:text-[#E11D48] transition-colors">
 <X size={14} strokeWidth={2.5} />
 </button>
 )}

 {/* 본문 */}
 <textarea
 value={block.text}
 onChange={e => onChange({ ...block, text: e.target.value.slice(0, MAX_CHARS) })}
 rows={isFirst ? 4 : 3}
 placeholder={isFirst ? '스레드에 올릴 내용을 작성하세요...' : '답글 내용을 입력하세요...'}
 className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm text-[#111827] placeholder:text-[#B0B8C1] focus:outline-none focus:ring-2 focus:ring-[#111827]/20 focus:border-[#111827] resize-none"
 />
 <p className={`text-right text-xs mt-0.5 ${charCount >= 450 ? 'text-[#F59E0B]' : 'text-[#B0B8C1]'} ${charCount >= MAX_CHARS ? 'text-[#DC2626]' : ''}`}>
 {charCount} / {MAX_CHARS}
 </p>

 {/* 해시태그 (첫 번째 블록만) */}
 {isFirst && (
 <div className="mt-3">
 <label className="block text-xs font-semibold text-[#6B7280] mb-1.5">해시태그</label>
 <HashtagInput tags={block.tags} onChange={tags => onChange({ ...block, tags })} />
 </div>
 )}

 {/* 이미지 토글 */}
 <div className="mt-3">
 <label className="flex items-center gap-2 cursor-pointer w-fit">
 <div
 onClick={() => onChange({ ...block, useImage: !block.useImage, imageUrl: block.useImage ? '' : block.imageUrl })}
 className={`w-8 h-4 rounded-full transition-colors relative ${block.useImage ? 'bg-[#111827]' : 'bg-[#E5E8EB]'}`}
 >
 <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${block.useImage ? 'translate-x-4' : 'translate-x-0.5'}`} />
 </div>
 <span className="text-xs font-medium text-[#6B7280] flex items-center gap-1">
 <ImageIcon size={12} strokeWidth={2} />
 이미지
 </span>
 </label>

 {block.useImage && (
 <ImageDropZone
 imageUrl={block.imageUrl}
 onUpload={url => onChange({ ...block, imageUrl: url })}
 onClear={() => onChange({ ...block, imageUrl: '' })}
 />
 )}
 </div>
 </div>
 </div>
 )
}

// ──────────────────────────────────────────
// 작성 탭
// ──────────────────────────────────────────
function newBlock(): PostBlock {
 return { id: Math.random().toString(36).slice(2), text: '', tags: [], imageUrl: '', useImage: false }
}

function ComposeTab({
 connected, accountLoaded, justConnected, regenData,
}: {
 connected: boolean
 accountLoaded: boolean
 justConnected?: boolean
 regenData?: { text: string; hashtags: string[] } | null
}) {
 const searchParams = useSearchParams()
 const router = useRouter()

 const [persona, setPersona] = useState<PersonaId>('friendly')

 const [blocks, setBlocks] = useState<PostBlock[]>(() => {
 const initialText = searchParams.get('text') ? decodeURIComponent(searchParams.get('text')!) : ''
 const initialTags: string[] = (() => {
 const raw = searchParams.get('hashtags')
 if (!raw) return []
 try { return JSON.parse(decodeURIComponent(raw)) as string[] } catch { return [] }
 })()
 return [{ id: 'main', text: initialText, tags: initialTags, imageUrl: '', useImage: false }]
 })

 const [scheduledAt, setScheduledAt] = useState('')
 const [loading, setLoading] = useState(false)
 const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

 // ── YouTube 동시 발행 ──
 const YT_KEY = 'localution.yt_crosspost_v1'
 const [ytEnabled, setYtEnabled]       = useState(false)
 const [ytChannelUrl, setYtChannelUrl] = useState('')
 const [ytComment, setYtComment]       = useState('')
 const [ytAgentOk, setYtAgentOk]       = useState<boolean | null>(null)
 const [ytState, setYtState]           = useState<'idle' | 'running' | 'done' | 'error'>('idle')
 const [ytLogs, setYtLogs]             = useState<string[]>([])

 useEffect(() => {
  try {
   const s = JSON.parse(localStorage.getItem(YT_KEY) || '{}')
   if (s.channelUrl) setYtChannelUrl(s.channelUrl)
   if (s.commentText) setYtComment(s.commentText)
  } catch {}
 }, [])

 useEffect(() => {
  try {
   const s = JSON.parse(localStorage.getItem(YT_KEY) || '{}')
   localStorage.setItem(YT_KEY, JSON.stringify({ ...s, channelUrl: ytChannelUrl, commentText: ytComment }))
  } catch {}
 }, [ytChannelUrl, ytComment])

 async function checkYtAgent() {
  setYtAgentOk(null)
  try {
   const res = await fetch('http://127.0.0.1:7777/health', { signal: AbortSignal.timeout(2500) })
   setYtAgentOk(res.ok)
  } catch {
   setYtAgentOk(false)
  }
 }

 async function urlToBase64(url: string): Promise<{ base64: string; filename: string } | null> {
  try {
   const res = await fetch(url)
   const blob = await res.blob()
   const filename = url.split('/').pop()?.split('?')[0] || 'image.jpg'
   return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve({ base64: (reader.result as string).split(',')[1], filename })
    reader.onerror = reject
    reader.readAsDataURL(blob)
   })
  } catch {
   return null
  }
 }

 async function uploadToYoutube(mainBlock: PostBlock, channelUrl: string, commentText: string) {
  setYtState('running')
  setYtLogs(['유튜브 커뮤니티 업로드 시작...'])
  try {
   let imageBase64: string | null = null
   let imageFilename: string | null = null
   if (mainBlock.useImage && mainBlock.imageUrl) {
    const img = await urlToBase64(mainBlock.imageUrl)
    if (img) { imageBase64 = img.base64; imageFilename = img.filename }
   }
   const res = await fetch('http://127.0.0.1:7777/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
     channel_url: channelUrl,
     post_text: mainBlock.text,
     comment_text: commentText,
     profile_name: 'Default',
     image_base64: imageBase64,
     image_filename: imageFilename,
    }),
   })
   if (!res.ok) throw new Error(`에이전트 오류: ${res.status}`)
   const { task_id } = await res.json()
   const es = new EventSource(`http://127.0.0.1:7777/progress/${task_id}`)
   es.onmessage = (e) => {
    const d = JSON.parse(e.data)
    if (d.type === 'log') setYtLogs(prev => [...prev, d.message])
    if (d.type === 'done') {
     es.close()
     if (d.success) {
      setYtState('done')
      setYtLogs(prev => [...prev, '유튜브 커뮤니티 업로드 완료!'])
     } else {
      setYtState('error')
      setYtLogs(prev => [...prev, `실패: ${d.error || '알 수 없는 오류'}`])
     }
    }
   }
   es.onerror = () => {
    es.close()
    setYtState('error')
    setYtLogs(prev => [...prev, '에이전트 연결이 끊어졌습니다.'])
   }
  } catch (err: any) {
   setYtState('error')
   setYtLogs(prev => [...prev, `오류: ${err.message}`])
  }
 }

 // 발행 이력 "재생성" 또는 외부에서 텍스트가 주입될 때 첫 블록에 반영
 useEffect(() => {
 if (regenData) {
 setBlocks(prev => [{ ...prev[0], text: regenData.text, tags: regenData.hashtags }, ...prev.slice(1)])
 }
 }, [regenData])

 function updateBlock(index: number, updated: PostBlock) {
 setBlocks(prev => prev.map((b, i) => i === index ? updated : b))
 }

 function addReply() {
 if (blocks.length >= 6) return
 setBlocks(prev => [...prev, newBlock()])
 }

 function removeBlock(index: number) {
 setBlocks(prev => prev.filter((_, i) => i !== index))
 }

 async function submit(immediate: boolean) {
 const main = blocks[0]
 if (!main.text.trim()) return
 setLoading(true)
 setResult(null)
 try {
 const replies = blocks.slice(1).map(b => ({
 text_content: b.text,
 image_url: b.useImage && b.imageUrl ? b.imageUrl : null,
 })).filter(r => r.text_content.trim())

 const body: Record<string, unknown> = {
 text_content: main.text,
 hashtags: main.tags,
 image_url: main.useImage && main.imageUrl ? main.imageUrl : null,
 source: searchParams.get('source') ?? 'manual',
 card_news_topic: searchParams.get('topic') ?? undefined,
 thread_replies: replies.length > 0 ? replies : undefined,
 }
 if (!immediate && scheduledAt) body.scheduled_at = scheduledAt

 const res = await fetch('/api/threads/posts', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(body),
 })
 const data = await res.json()
 if (data.ok) {
 setResult({ ok: true, msg: immediate ? '발행 요청이 완료되었습니다.' : '예약이 완료되었습니다.' })
 if (immediate && ytEnabled && ytAgentOk && ytChannelUrl.trim() && ytComment.trim()) {
  uploadToYoutube(main, ytChannelUrl.trim(), ytComment.trim())
 }
 setBlocks([newBlock()])
 setScheduledAt('')
 router.refresh()
 } else {
 setResult({ ok: false, msg: data.error || '오류가 발생했습니다.' })
 }
 } catch {
 setResult({ ok: false, msg: '네트워크 오류가 발생했습니다.' })
 } finally {
 setLoading(false)
 }
 }

 return (
 <div className="space-y-4">
 {accountLoaded && !connected && !justConnected && <ConnectBanner />}

 {/* AI 초안 생성 */}
 <AIDraftPanel
 persona={persona}
 onApply={(text, hashtags) => {
 setBlocks(prev => [{ ...prev[0], text, tags: hashtags }, ...prev.slice(1)])
 }}
 />

 {/* 리뷰에서 생성 */}
 <ReviewDraftPanel
 persona={persona}
 onApply={(text, hashtags) => {
 setBlocks(prev => [{ ...prev[0], text, tags: hashtags }, ...prev.slice(1)])
 }}
 />

 {result && (
 <div className={`flex items-center gap-2.5 p-4 rounded-xl text-sm font-medium ${
 result.ok ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-[#FFF1F2] text-[#E11D48]'
 }`}>
 {result.ok ? <CheckCircle2 size={16} strokeWidth={2.5} /> : <XCircle size={16} strokeWidth={2.5} />}
 {result.msg}
 </div>
 )}

 {/* 포스트 블록들 */}
 <div className="bg-white border border-[#E5E8EB] rounded-2xl p-4 md:p-5">
 <div className="mb-4 pb-3 border-b border-[#F3F4F6]">
 <PersonaChips value={persona} onChange={setPersona} />
 </div>
 {blocks.map((block, i) => (
 <PostBlockEditor
 key={block.id}
 block={block}
 index={i}
 isFirst={i === 0}
 canRemove={i > 0}
 onChange={updated => updateBlock(i, updated)}
 onRemove={() => removeBlock(i)}
 />
 ))}

 {/* 답글 추가 버튼 */}
 {blocks.length < 6 && (
 <div className="flex items-center gap-3 mt-1 pl-10">
 <button
 type="button"
 onClick={addReply}
 className="flex items-center gap-1.5 text-xs font-semibold text-[#6B7280] hover:text-[#111827] px-3 py-1.5 rounded-lg border border-dashed border-[#D1D5DB] hover:border-[#9CA3AF] transition-colors"
 >
 <Plus size={13} strokeWidth={2.5} />
 답글 추가
 </button>
 {blocks.length > 1 && (
 <span className="text-xs text-[#B0B8C1]">{blocks.length}개 포스트 체인</span>
 )}
 </div>
 )}
 </div>

 {/* 예약 날짜 */}
 <div className="bg-white border border-[#E5E8EB] rounded-2xl p-4">
 <label className="block text-sm font-semibold text-[#111827] mb-2 flex items-center gap-1.5">
 <CalendarClock size={14} strokeWidth={2} />
 예약 발행 (선택)
 </label>
 <div className="flex items-center gap-2 flex-wrap">
 <input
 type="datetime-local"
 value={scheduledAt}
 onChange={e => setScheduledAt(e.target.value)}
 min={new Date().toISOString().slice(0, 16)}
 className="border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#111827]/20 focus:border-[#111827]"
 />
 {scheduledAt && (
 <button type="button" onClick={() => setScheduledAt('')}
 className="text-xs text-[#6B7280] hover:text-[#DC2626] underline">초기화</button>
 )}
 </div>
 </div>

 {/* 템플릿 */}
 <TemplatePanel blocks={blocks} onLoad={setBlocks} />

 {/* YouTube 동시 발행 */}
 <div className="bg-white border border-[#E5E8EB] rounded-2xl overflow-hidden">
  <div className="flex items-center justify-between px-4 py-3">
   <div className="flex items-center gap-2 min-w-0">
    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-sm flex-shrink-0">
     <Youtube size={13} className="text-white" strokeWidth={2.5} />
    </div>
    <span className="text-sm font-semibold text-[#111827] truncate">유튜브 커뮤니티 동시 발행</span>
    {ytEnabled && (
     <span className={`text-xs font-semibold flex-shrink-0 ${
      ytAgentOk === true ? 'text-[#059669]' : ytAgentOk === false ? 'text-[#DC2626]' : 'text-[#8B95A1]'
     }`}>
      · {ytAgentOk === true ? '연결됨' : ytAgentOk === false ? '미연결' : '확인 중'}
     </span>
    )}
   </div>
   <button
    type="button"
    onClick={() => { const next = !ytEnabled; setYtEnabled(next); if (next) checkYtAgent() }}
    className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ml-2 ${ytEnabled ? 'bg-[#FF0000]' : 'bg-[#E5E8EB]'}`}
   >
    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${ytEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
   </button>
  </div>

  {ytEnabled && (
   <div className="px-4 pb-4 border-t border-[#F3F4F6] pt-3 space-y-3">
    {ytAgentOk === false && (
     <div className="flex items-center justify-between p-2.5 bg-[#FFF1F2] rounded-xl border border-[#FECDD3]">
      <span className="text-xs text-[#DC2626] font-medium">에이전트가 실행 중이어야 업로드됩니다.</span>
      <Link href="/marketing/youtube-community/download" className="text-xs font-bold text-[#DC2626] underline flex-shrink-0 ml-2">다운로드</Link>
     </div>
    )}
    <div>
     <label className="block text-xs font-semibold text-[#8B95A1] mb-1.5">채널 URL</label>
     <input
      type="url"
      value={ytChannelUrl}
      onChange={e => setYtChannelUrl(e.target.value)}
      placeholder="https://www.youtube.com/@내채널"
      className="w-full px-3 py-2.5 text-sm rounded-xl border border-[#E5E8EB] focus:outline-none focus:ring-2 focus:ring-[#FF0000]/20 focus:border-[#FF0000] transition-all bg-[#F8F9FA] placeholder:text-[#B0B8C1]"
     />
    </div>
    <div>
     <label className="block text-xs font-semibold text-[#8B95A1] mb-1.5">고정 댓글 내용</label>
     <input
      type="text"
      value={ytComment}
      onChange={e => setYtComment(e.target.value)}
      placeholder="게시물에 자동으로 달리고 고정될 댓글"
      className="w-full px-3 py-2.5 text-sm rounded-xl border border-[#E5E8EB] focus:outline-none focus:ring-2 focus:ring-[#FF0000]/20 focus:border-[#FF0000] transition-all bg-[#F8F9FA] placeholder:text-[#B0B8C1]"
     />
    </div>
    <p className="text-[11px] text-[#B0B8C1]">채널 URL · 댓글 내용은 자동으로 저장됩니다.</p>
    {ytState !== 'idle' && (
     <div className={`rounded-xl border p-3 text-xs space-y-1 max-h-28 overflow-y-auto font-mono ${
      ytState === 'done' ? 'bg-[#F0FDF4] border-[#BBF7D0]'
      : ytState === 'error' ? 'bg-[#FFF1F2] border-[#FECDD3]'
      : 'bg-[#F8F9FA] border-[#E5E8EB]'
     }`}>
      {ytLogs.map((log, i) => (
       <div key={i} className={
        log.includes('완료') ? 'text-[#059669]'
        : log.includes('오류') || log.includes('실패') ? 'text-[#DC2626]'
        : 'text-[#4E5968]'
       }>{log}</div>
      ))}
     </div>
    )}
   </div>
  )}
 </div>

 {/* 발행 버튼 */}
 <div className="flex flex-col sm:flex-row gap-3">
 <button
 onClick={() => submit(true)}
 disabled={!blocks[0].text.trim() || loading}
 className="flex-1 flex items-center justify-center gap-2 bg-[#111827] hover:bg-[#1F2937] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors"
 >
 {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} strokeWidth={2.5} />}
 지금 발행
 </button>
 <button
 onClick={() => submit(false)}
 disabled={!blocks[0].text.trim() || !scheduledAt || loading}
 className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-[#F9FAFB] disabled:opacity-40 disabled:cursor-not-allowed border border-[#E5E8EB] text-[#374151] font-semibold py-3 px-6 rounded-xl transition-colors"
 >
 <CalendarClock size={16} strokeWidth={2} />
 예약 저장
 </button>
 </div>
 </div>
 )
}

// ──────────────────────────────────────────
// 예약 목록 탭
// ──────────────────────────────────────────
function ScheduledTab() {
 const [posts, setPosts] = useState<ThreadsPost[]>([])
 const [loading, setLoading] = useState(true)

 const load = useCallback(async () => {
 setLoading(true)
 const res = await fetch('/api/threads/posts?status=scheduled&limit=50')
 const data = await res.json()
 setPosts(data.posts ?? [])
 setLoading(false)
 }, [])

 useEffect(() => { load() }, [load])

 async function handlePublishNow(id: string) {
 await fetch(`/api/threads/posts/${id}/publish`, { method: 'POST' })
 load()
 }

 async function handleDelete(id: string) {
 if (!confirm('예약을 취소하고 삭제할까요?')) return
 await fetch(`/api/threads/posts/${id}`, { method: 'DELETE' })
 load()
 }

 if (loading) {
 return (
 <div className="flex items-center justify-center py-16">
 <Loader2 size={24} className="animate-spin text-[#B0B8C1]" />
 </div>
 )
 }

 if (posts.length === 0) {
 return (
 <div className="flex flex-col items-center justify-center py-16 text-[#B0B8C1]">
 <Clock size={32} strokeWidth={1.5} className="mb-3" />
 <p className="text-sm">예약된 포스트가 없습니다.</p>
 </div>
 )
 }

 return (
 <div className="space-y-3">
 <div className="flex items-center justify-between mb-2">
 <p className="text-sm text-[#6B7280]">총 {posts.length}개</p>
 <button onClick={load} className="text-xs text-[#6B7280] hover:text-[#111827] flex items-center gap-1">
 <RefreshCw size={12} strokeWidth={2} />
 새로고침
 </button>
 </div>
 {posts.map(post => (
 <div key={post.id} className="bg-white border border-[#E5E8EB] rounded-2xl p-4 md:p-5">
 <div className="flex items-start justify-between gap-3">
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-2 flex-wrap">
 <StatusBadge status={post.status} />
 {post.scheduled_at && (
 <span className="text-xs text-[#6B7280] flex items-center gap-1">
 <Clock size={11} strokeWidth={2} />
 {new Date(post.scheduled_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
 </span>
 )}
 </div>
 <p className="text-sm text-[#374151] line-clamp-2">{post.text_content}</p>
 {post.hashtags.length > 0 && (
 <p className="text-xs text-[#3182F6] mt-1 truncate">
 {post.hashtags.map(t => `#${t}`).join(' ')}
 </p>
 )}
 </div>
 <div className="flex items-center gap-2 flex-shrink-0">
 <button
 onClick={() => handlePublishNow(post.id)}
 title="지금 발행"
 className="p-2 rounded-lg hover:bg-[#111827] hover:text-white text-[#6B7280] transition-colors"
 >
 <Send size={14} strokeWidth={2.5} />
 </button>
 <button
 onClick={() => handleDelete(post.id)}
 title="삭제"
 className="p-2 rounded-lg hover:bg-[#FFF1F2] hover:text-[#E11D48] text-[#6B7280] transition-colors"
 >
 <Trash2 size={14} strokeWidth={2} />
 </button>
 </div>
 </div>
 </div>
 ))}
 </div>
 )
}

// ──────────────────────────────────────────
// 발행 이력 탭
// ──────────────────────────────────────────
function HistoryTab({ onRegen }: { onRegen: (text: string, hashtags: string[]) => void }) {
 const [posts, setPosts] = useState<ThreadsPost[]>([])
 const [loading, setLoading] = useState(true)

 const load = useCallback(async () => {
 setLoading(true)
 const res = await fetch('/api/threads/posts?limit=50')
 const data = await res.json()
 const history = (data.posts ?? []).filter(
 (p: ThreadsPost) => ['published', 'failed'].includes(p.status)
 )
 setPosts(history)
 setLoading(false)
 }, [])

 useEffect(() => { load() }, [load])

 if (loading) {
 return (
 <div className="flex items-center justify-center py-16">
 <Loader2 size={24} className="animate-spin text-[#B0B8C1]" />
 </div>
 )
 }

 if (posts.length === 0) {
 return (
 <div className="flex flex-col items-center justify-center py-16 text-[#B0B8C1]">
 <CheckCircle2 size={32} strokeWidth={1.5} className="mb-3" />
 <p className="text-sm">발행 이력이 없습니다.</p>
 </div>
 )
 }

 return (
 <div className="space-y-3">
 <div className="flex items-center justify-between mb-2">
 <p className="text-sm text-[#6B7280]">총 {posts.length}개</p>
 <button onClick={load} className="text-xs text-[#6B7280] hover:text-[#111827] flex items-center gap-1">
 <RefreshCw size={12} strokeWidth={2} />
 새로고침
 </button>
 </div>
 {posts.map(post => (
 <div key={post.id} className="bg-white border border-[#E5E8EB] rounded-2xl p-4 md:p-5">
 <div className="flex items-start gap-3">
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-2 flex-wrap">
 <StatusBadge status={post.status} />
 {post.published_at && (
 <span className="text-xs text-[#6B7280]">
 {new Date(post.published_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
 </span>
 )}
 </div>
 <p className="text-sm text-[#374151] line-clamp-2">{post.text_content}</p>
 {post.hashtags.length > 0 && (
 <p className="text-xs text-[#3182F6] mt-1 truncate">
 {post.hashtags.map(t => `#${t}`).join(' ')}
 </p>
 )}
 {post.status === 'failed' && post.error_message && (
 <p className="text-xs text-[#E11D48] mt-1.5 bg-[#FFF1F2] px-2 py-1 rounded-lg">
 {post.error_message}
 </p>
 )}
 </div>
 {post.status === 'published' && (
 <button
 onClick={() => onRegen(post.text_content, post.hashtags)}
 title="이 글 스타일로 재생성"
 className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold text-[#6B7280] hover:text-[#7C3AED] px-2 py-1.5 rounded-lg hover:bg-[#F5F3FF] transition-colors"
 >
 <RefreshCw size={12} strokeWidth={2.5} />
 재생성
 </button>
 )}
 </div>
 </div>
 ))}
 </div>
 )
}

// ──────────────────────────────────────────
// 계정 상태 표시
// ──────────────────────────────────────────
function AccountStatus({ info }: { info: AccountInfo | null }) {
 if (!info?.connected) return null
 return (
 <div className="flex items-center gap-2 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl px-3 py-2">
 <CheckCircle2 size={14} className="text-[#059669]" strokeWidth={2.5} />
 <span className="text-xs font-medium text-[#059669]">
 @{info.username} 연결됨 · {info.expires_in_days}일 후 갱신
 </span>
 <Link href="/marketing/threads/connect" className="ml-auto">
 <Settings size={13} className="text-[#059669]/60 hover:text-[#059669]" strokeWidth={2} />
 </Link>
 </div>
 )
}

// ──────────────────────────────────────────
// 메인 페이지
// ──────────────────────────────────────────
function ThreadsPageContent() {
 const searchParams = useSearchParams()
 const connectedParam = searchParams.get('connected')
 const errorParam = searchParams.get('error')
 const detailParam = searchParams.get('detail')

 const [tab, setTab] = useState<'compose' | 'scheduled' | 'history'>('compose')
 const [account, setAccount] = useState<AccountInfo | null>(null)
 const [accountLoaded, setAccountLoaded] = useState(false)
 const [regenData, setRegenData] = useState<{ text: string; hashtags: string[] } | null>(null)

 function handleRegen(text: string, hashtags: string[]) {
 setRegenData({ text, hashtags })
 setTab('compose')
 // 적용 후 초기화 (같은 버튼 두 번 눌러도 재적용되도록)
 setTimeout(() => setRegenData(null), 300)
 }

 useEffect(() => {
 const loadAccount = () =>
 fetch('/api/threads/account')
 .then(r => r.json())
 .then(data => { setAccount(data); setAccountLoaded(true) })
 .catch(() => setAccountLoaded(true))

 if (connectedParam === '1') {
 // 방금 연결 완료 — 즉시 조회 후 2.5초 뒤 재조회 (배포 전파 여유)
 loadAccount().then(() => {
 setTimeout(() => {
 fetch('/api/threads/account')
 .then(r => r.json())
 .then(data => setAccount(data))
 .catch(() => {})
 }, 2500)
 })
 } else {
 loadAccount()
 }
 }, [connectedParam])

 const tabs: { key: typeof tab; label: string }[] = [
 { key: 'compose', label: '작성' },
 { key: 'scheduled', label: '예약 목록' },
 { key: 'history', label: '발행 이력' },
 ]

 return (
 <>
 {/* 검은색 헤더 */}
 <section className="bg-black relative overflow-hidden">
 <div className="pointer-events-none absolute inset-0 opacity-30" aria-hidden="true"
 style={{ background: 'radial-gradient(800px 240px at 20% -20%, rgba(255,255,255,0.08), transparent 60%)' }} />
 <div className="relative max-w-5xl mx-auto px-4 md:px-8 py-9 md:py-12 flex items-center gap-3.5 md:gap-5">
 {/* Threads 로고 */}
 <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/10 ring-1 ring-white/20 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.4)] flex items-center justify-center flex-shrink-0">
 <svg viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 md:w-9 md:h-9">
 <path fill="white" d="M141.537 88.988c-.827-.396-1.667-.778-2.518-1.143-1.482-27.307-16.403-42.94-41.457-43.1h-.315c-14.986 0-27.317 6.397-34.563 17.849l13.138 8.945c5.449-8.146 13.998-10.192 21.437-10.192h.3c8.44.05 14.844 2.548 18.991 7.448 3.026 3.575 5.035 8.502 6.011 14.682-7.542-1.281-15.694-1.661-24.367-1.21-24.873 1.29-40.236 16.053-39.196 36.161.527 10.125 5.47 18.746 13.948 24.368 7.181 4.834 16.574 7.207 26.337 6.682 12.98-.7 23.328-5.625 30.498-14.593 5.49-7.038 8.85-16.25 10.11-27.808 5.089 3.097 8.863 7.375 10.799 12.775 3.323 9.467 3.486 25.074-7.189 35.726-9.342 9.317-20.645 13.533-38.734 13.663-19.99-.13-35.495-6.18-45.704-17.987-9.694-11.352-14.7-27.769-14.884-47.796.185-20.027 5.19-36.444 14.884-47.796 10.21-11.808 25.714-17.857 45.704-17.987 20.204.13 35.856 6.211 46.217 18.252 5.038 5.85 8.921 13.439 11.573 22.593l13.695-3.848c-3.218-10.914-8.274-20.167-15.111-27.454-13-14.322-31.472-21.695-56.294-21.916h-.173c-24.733.22-43.069 7.621-55.9 22.08-11.435 12.79-17.373 31.048-17.58 54.361v1.731c.207 23.313 6.145 41.571 17.58 54.362 12.831 14.458 31.167 21.86 55.9 22.08h.173c22.42-.2 39.362-6.624 50.794-19.056 14.533-15.787 14.06-36.142 9.44-49.123-3.323-9.298-10.006-16.89-19.443-21.855zm-45.56 43.777c-11.444 0-21.324-5.566-21.903-14.395-.393-6.767 3.367-12.63 10.354-15.467.27-.107.539-.21.81-.305 5.657-2.04 12.609-2.327 20.18-.812.278.055.552.118.821.189.3 4.213.37 8.656.2 13.247-.484 13.011-4.473 17.543-10.462 17.543z"/>
 </svg>
 </div>
 <div className="flex-1 min-w-0">
 <h1 className="text-[22px] md:text-[28px] font-black tracking-tight text-white leading-tight">스레드 자동 발행</h1>
 <p className="text-white/75 text-[12px] md:text-sm mt-1.5 leading-relaxed">즉시 발행 또는 예약 발행 — 카드뉴스 해시태그 자동 연동</p>
 </div>
 <div className="hidden md:flex items-center gap-1.5 text-[11px] font-bold text-white/90 bg-white/10 border border-white/20 px-3 py-1.5 rounded-full flex-shrink-0">
 로컬루션
 </div>
 </div>
 </section>

 <main className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-6 py-6 pb-20">
 {connectedParam === '1' && (
 <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-2xl p-4 flex items-center gap-3 mb-6">
 <CheckCircle2 size={18} className="text-[#059669]" strokeWidth={2.5} />
 <p className="text-sm font-medium text-[#059669]">Threads 계정이 성공적으로 연결되었습니다.</p>
 </div>
 )}
 {errorParam && (
 <div className="bg-[#FFF1F2] border border-[#FECDD3] rounded-2xl p-4 mb-6">
 <p className="text-sm font-semibold text-[#E11D48] mb-1">
 연결 오류: {errorParam}
 </p>
 {detailParam && (
 <p className="text-xs text-[#9F1239] font-mono break-all">{detailParam}</p>
 )}
 </div>
 )}

 {/* 계정 상태 */}
 {account && <div className="mb-5"><AccountStatus info={account} /></div>}

 {/* 탭 바 */}
 <div className="flex border-b border-[#E5E8EB] mb-6">
 {tabs.map(t => (
 <button
 key={t.key}
 onClick={() => setTab(t.key)}
 className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
 tab === t.key
 ? 'border-[#111827] text-[#111827]'
 : 'border-transparent text-[#6B7280] hover:text-[#374151]'
 }`}
 >
 {t.label}
 </button>
 ))}
 </div>

 {/* 탭 콘텐츠 — max-w-2xl 제거 (이전엔 ~672px 좁아서 PC 가독성 떨어짐) */}
 <div>
 {tab === 'compose' && <ComposeTab connected={account?.connected !== false} accountLoaded={accountLoaded} justConnected={connectedParam === '1'} regenData={regenData} />}
 {tab === 'scheduled' && <ScheduledTab />}
 {tab === 'history' && <HistoryTab onRegen={handleRegen} />}
 </div>
 </main>
 </>
 )
}

export default function ThreadsPage() {
 return (
 <div className="min-h-screen bg-[#F8F9FA]">
 <Sidebar />
 <div className="md:ml-[220px] flex flex-col min-h-screen">
 <Suspense>
 <ThreadsPageContent />
 </Suspense>
 <Footer />
 </div>
 </div>
 )
}
