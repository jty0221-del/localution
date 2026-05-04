'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Send, AlertTriangle, CheckCircle2, Clock, XCircle,
  Trash2, RefreshCw, Settings, Hash, Image as ImageIcon,
  CalendarClock, Loader2, Link2Off
} from 'lucide-react'
import PageHeader from '@/app/components/PageHeader'
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
// 작성 탭
// ──────────────────────────────────────────
function ComposeTab({ connected }: { connected: boolean }) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [text, setText] = useState(
    () => searchParams.get('text') ? decodeURIComponent(searchParams.get('text')!) : ''
  )
  const [tags, setTags] = useState<string[]>(() => {
    const raw = searchParams.get('hashtags')
    if (!raw) return []
    try { return JSON.parse(decodeURIComponent(raw)) as string[] } catch { return [] }
  })
  const [imageUrl, setImageUrl] = useState('')
  const [useImage, setUseImage] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const charCount = text.length
  const MAX_CHARS = 500

  async function submit(immediate: boolean) {
    if (!text.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const body: Record<string, unknown> = {
        text_content: text,
        hashtags: tags,
        source: searchParams.get('source') ?? 'manual',
        card_news_topic: searchParams.get('topic') ?? undefined,
      }
      if (useImage && imageUrl.trim()) body.image_url = imageUrl.trim()
      if (!immediate && scheduledAt) body.scheduled_at = scheduledAt

      const res = await fetch('/api/threads/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.ok) {
        setResult({ ok: true, msg: immediate ? '발행 요청이 완료되었습니다.' : '예약이 완료되었습니다.' })
        setText('')
        setTags([])
        setImageUrl('')
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
    <div className="space-y-5">
      {!connected && <ConnectBanner />}

      {result && (
        <div className={`flex items-center gap-2.5 p-4 rounded-xl text-sm font-medium ${
          result.ok ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-[#FFF1F2] text-[#E11D48]'
        }`}>
          {result.ok
            ? <CheckCircle2 size={16} strokeWidth={2.5} />
            : <XCircle size={16} strokeWidth={2.5} />}
          {result.msg}
        </div>
      )}

      {/* 본문 입력 */}
      <div>
        <label className="block text-sm font-semibold text-[#111827] mb-2">본문</label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value.slice(0, MAX_CHARS))}
          rows={5}
          placeholder="스레드에 올릴 내용을 작성하세요..."
          className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm text-[#111827] placeholder:text-[#B0B8C1] focus:outline-none focus:ring-2 focus:ring-[#111827]/20 focus:border-[#111827] resize-none"
        />
        <p className={`text-right text-xs mt-1 ${charCount >= 450 ? 'text-[#F59E0B]' : 'text-[#B0B8C1]'} ${charCount >= MAX_CHARS ? 'text-[#DC2626]' : ''}`}>
          {charCount} / {MAX_CHARS}
        </p>
      </div>

      {/* 해시태그 */}
      <div>
        <label className="block text-sm font-semibold text-[#111827] mb-2">해시태그</label>
        <HashtagInput tags={tags} onChange={setTags} />
      </div>

      {/* 이미지 토글 */}
      <div>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <div
            onClick={() => setUseImage(v => !v)}
            className={`w-10 h-5 rounded-full transition-colors relative ${useImage ? 'bg-[#111827]' : 'bg-[#E5E8EB]'}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${useImage ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-sm font-medium text-[#374151] flex items-center gap-1.5">
            <ImageIcon size={14} strokeWidth={2} />
            이미지 포함
          </span>
        </label>

        {useImage && (
          <input
            type="url"
            value={imageUrl}
            onChange={e => setImageUrl(e.target.value)}
            placeholder="공개 접근 가능한 이미지 URL"
            className="mt-3 w-full border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#111827]/20 focus:border-[#111827]"
          />
        )}
      </div>

      {/* 예약 날짜 */}
      <div>
        <label className="block text-sm font-semibold text-[#111827] mb-2">
          <span className="flex items-center gap-1.5">
            <CalendarClock size={14} strokeWidth={2} />
            예약 발행 (선택)
          </span>
        </label>
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={e => setScheduledAt(e.target.value)}
          min={new Date().toISOString().slice(0, 16)}
          className="w-full md:w-auto border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#111827]/20 focus:border-[#111827]"
        />
        {scheduledAt && (
          <button
            type="button"
            onClick={() => setScheduledAt('')}
            className="ml-2 text-xs text-[#6B7280] hover:text-[#DC2626] underline"
          >
            초기화
          </button>
        )}
      </div>

      {/* 버튼 */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          onClick={() => submit(true)}
          disabled={!connected || !text.trim() || loading}
          className="flex-1 flex items-center justify-center gap-2 bg-[#111827] hover:bg-[#1F2937] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} strokeWidth={2.5} />}
          지금 발행
        </button>

        <button
          onClick={() => submit(false)}
          disabled={!connected || !text.trim() || !scheduledAt || loading}
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

  useEffect(() => {
    fetch('/api/threads/account').then(r => r.json()).then(setAccount)
  }, [])

  // 카드뉴스에서 넘어왔을 때 알림
  const connectedParam = searchParams.get('connected')

  const tabs: { key: typeof tab; label: string }[] = [
    { key: 'compose', label: '작성' },
    { key: 'scheduled', label: '예약 목록' },
    { key: 'history', label: '발행 이력' },
  ]

  return (
    <>
      <PageHeader
        icon={<Send size={22} className="text-white" strokeWidth={2.5} />}
        title="스레드 자동 발행"
        subtitle="즉시 발행 또는 예약 발행 — 카드뉴스 해시태그 자동 연동"
        variant="primary"
      />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-6 py-6 pb-20">
        {connectedParam === '1' && (
          <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-2xl p-4 flex items-center gap-3 mb-6">
            <CheckCircle2 size={18} className="text-[#059669]" strokeWidth={2.5} />
            <p className="text-sm font-medium text-[#059669]">Threads 계정이 성공적으로 연결되었습니다.</p>
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
          {tab === 'compose' && <ComposeTab connected={account?.connected ?? false} />}
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
