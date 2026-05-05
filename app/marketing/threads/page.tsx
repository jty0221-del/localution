'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Send, AlertTriangle, CheckCircle2, Clock, XCircle,
  Trash2, RefreshCw, Settings, Hash, Image as ImageIcon,
  CalendarClock, Loader2, Link2Off, Plus, X, Upload
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
    draft:      { label: '임시저장', bg: 'bg-[#F3F4F6]', text: 'text-[#6B7280]' },
    scheduled:  { label: '예약됨',   bg: 'bg-[#EFF6FF]', text: 'text-[#3182F6]' },
    publishing: { label: '발행중',   bg: 'bg-[#FFF7ED]', text: 'text-[#EA580C]' },
    published:  { label: '발행완료', bg: 'bg-[#ECFDF5]', text: 'text-[#059669]' },
    failed:     { label: '실패',     bg: 'bg-[#FFF1F2]', text: 'text-[#E11D48]' },
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

function ComposeTab({ connected, accountLoaded }: { connected: boolean; accountLoaded: boolean }) {
  const searchParams = useSearchParams()
  const router = useRouter()

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
      {accountLoaded && !connected && <ConnectBanner />}

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
function HistoryTab() {
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
  const [tab, setTab] = useState<'compose' | 'scheduled' | 'history'>('compose')
  const [account, setAccount] = useState<AccountInfo | null>(null)
  const [accountLoaded, setAccountLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/threads/account')
      .then(r => r.json())
      .then(data => { setAccount(data); setAccountLoaded(true) })
      .catch(() => setAccountLoaded(true))
  }, [])

  const connectedParam = searchParams.get('connected')
  const errorParam     = searchParams.get('error')
  const detailParam    = searchParams.get('detail')

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

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-6 py-6 pb-20">
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

        {/* 탭 콘텐츠 */}
        <div className="max-w-2xl">
          {tab === 'compose' && <ComposeTab connected={account?.connected !== false} accountLoaded={accountLoaded} />}
          {tab === 'scheduled' && <ScheduledTab />}
          {tab === 'history' && <HistoryTab />}
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
