'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'
import PageHeader from '../components/PageHeader'
import {
  LayoutGrid, Lightbulb, HelpCircle, PartyPopper, MessageCircle,
  Heart, Bookmark, Pencil, Megaphone, Search, Flame, BarChart3,
  X, Plus, ArrowRight, Play, LucideIcon, MapPin, Coins, Trophy,
  Navigation, Loader2,
} from 'lucide-react'
import {
  COMMUNITY_REGIONS, regionLabel, groupedRegions, nearestRegions,
  type CommunityRegion,
} from '../lib/regions-community'
import {
  awardPoints, getBalance, readMyEmailFromCookie,
  maybeAwardFeatured, POINT_RULES, FEATURED_THRESHOLD,
} from '../lib/points'
import SlideAdBanner from '../components/SlideAdBanner'

// ─── 카테고리 ─────────────────────────────────────────────────────
type Category = { id: string; label: string; Icon: LucideIcon; color: string }

const CATEGORIES: Category[] = [
  { id: 'all',     label: '전체',      Icon: LayoutGrid,    color: '#8B95A1' },
  { id: 'tip',     label: '마케팅 팁', Icon: Lightbulb,     color: '#F59E0B' },
  { id: 'qna',     label: '질문/답변', Icon: HelpCircle,    color: '#3182F6' },
  { id: 'success', label: '성공사례',  Icon: PartyPopper,   color: '#10B981' },
  { id: 'free',    label: '자유게시판',Icon: MessageCircle, color: '#8B5CF6' },
]

// ─── 샘플 데이터 ──────────────────────────────────────────────────
const INITIAL_POSTS: any[] = [
  {
    id: 1, category: 'success', region_id: 'nationwide',
    author: '김사장님', avatar: '김', author_email: 'sample1@localution.co.kr',
    title: '네이버 플레이스 별점 4.2→4.8 만든 후기 공유해요',
    content: '안녕하세요! 3개월 동안 리뷰 관리를 열심히 했더니 별점이 크게 올랐어요. 핵심은 부정 리뷰에 빠르게 진심 어린 답변을 달고, 만족한 단골손님들께 자연스럽게 리뷰를 부탁드리는 거였어요. 로컬루션으로 리뷰 알림 받고 바로바로 대응한 게 정말 도움이 많이 됐습니다.',
    time: '2시간 전', likes: 47, comments: [
      { author: '이점주', text: '저도 비슷한 경험 있어요! 답변 속도가 진짜 중요하더라고요', time: '1시간 전' },
      { author: '박대표', text: '구체적인 멘트 예시도 공유해주실 수 있나요?', time: '45분 전' },
    ],
    liked: false, bookmarked: false,
  },
  {
    id: 2, category: 'tip', region_id: 'seoul-mapo',
    author: '마케팅고수', avatar: '마', author_email: 'sample2@localution.co.kr',
    title: '인스타 릴스로 매출 30% 올린 방법 (식당 운영자)',
    content: '식당 운영 5년차입니다. 올해 초부터 릴스를 시작했는데 효과가 어마어마해요. 핵심 팁: 1) 음식 만드는 과정 ASMR 2) 사장님 얼굴 노출(친근감) 3) 자막 필수 4) 첫 3초 후킹.',
    time: '5시간 전', likes: 89, comments: [],
    liked: true, bookmarked: false,
  },
  {
    id: 3, category: 'qna', region_id: 'seoul-gangnam',
    author: '초보사장', avatar: '초', author_email: 'sample3@localution.co.kr',
    title: '네이버 스마트플레이스 등록이 안 되는데 혹시 아시는 분?',
    content: '사업자등록증은 있는데 계속 반려가 되네요. 업종이 좀 특이해서 그런지... 혹시 비슷한 경험 있으신 분 도움 부탁드립니다ㅠ',
    time: '어제', likes: 12, comments: [],
    liked: false, bookmarked: true,
  },
  {
    id: 4, category: 'tip', region_id: 'busan-haeundae',
    author: '카페원장', avatar: '카', author_email: 'sample4@localution.co.kr',
    title: '단골 만드는 CRM 활용법 - 실전 경험 정리',
    content: '카페 운영하면서 고객 데이터 관리가 얼마나 중요한지 뼈저리게 느꼈어요. 생일 쿠폰, 방문 주기 파악, 선호 메뉴 기록... 이걸 체계적으로 하니까 재방문율이 확 올랐습니다.',
    time: '2일 전', likes: 63, comments: [],
    liked: false, bookmarked: false,
  },
  {
    id: 5, category: 'free', region_id: 'gyeonggi-bundang',
    author: '동네빵집', avatar: '동', author_email: 'sample5@localution.co.kr',
    title: '오늘 리뷰 답변하다가 감동받은 일',
    content: '별점 2점짜리 리뷰에 정성껏 답변했더니, 며칠 후 그 손님이 다시 오셔서 "사장님 답변 보고 마음 바뀌었어요"라고 하시더라구요.',
    time: '3일 전', likes: 134, comments: [],
    liked: true, bookmarked: false,
  },
  {
    id: 6, category: 'success', region_id: 'nationwide',
    author: '뷰티샵원장', avatar: '뷰', author_email: 'sample6@localution.co.kr',
    title: 'QR코드 하나로 예약 문의 80% 줄인 방법',
    content: '손님들한테 QR 찍어서 카카오 예약 연결하도록 했더니 전화 문의가 확 줄었어요. 직접 예약이 가능하니 손님도 편하고 저도 편하고!',
    time: '4일 전', likes: 56, comments: [],
    liked: false, bookmarked: false,
  },
]

// ─── 작은 UI 헬퍼 ─────────────────────────────────────────────────
function CatBadge({ cat, size = 'sm' }: { cat: Category | undefined; size?: 'xs' | 'sm' | 'md' }) {
  if (!cat) return null
  const iconSize = size === 'xs' ? 10 : size === 'sm' ? 12 : 14
  return (
    <span className="inline-flex items-center gap-1">
      <cat.Icon size={iconSize} strokeWidth={2.25} style={{ color: cat.color }} />
      {cat.label}
    </span>
  )
}

function RegionPill({ region_id }: { region_id?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-[#F2F4F6] text-[#4E5968] px-2 py-0.5 rounded-full">
      <MapPin size={10} strokeWidth={2.25} className="text-[#3182F6]" />
      {regionLabel(region_id)}
    </span>
  )
}

// 포인트 토스트(간이)
function PointToast({ amount, label, onClose }: { amount: number; label: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2600)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-gradient-to-r from-[#FFB703] to-[#FB8500] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom">
      <Coins size={18} strokeWidth={2.25} />
      <span className="font-bold text-sm">+{amount}P</span>
      <span className="text-xs opacity-90">{label}</span>
    </div>
  )
}

// ─── 글쓰기 모달 ──────────────────────────────────────────────────
function WriteModal({ onClose, onSubmit, defaultRegion }: {
  onClose: () => void
  onSubmit: (post: any) => void
  defaultRegion: string
}) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('free')
  const [regionId, setRegionId] = useState(defaultRegion || 'nationwide')
  const [media, setMedia] = useState<{ type: 'image'|'video'; url: string; name: string }[]>([])

  const handleFilesPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    Array.from(files).slice(0, 10).forEach(file => {
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      if (!isImage && !isVideo) return
      if (isImage && file.size < 5 * 1024 * 1024) {
        const reader = new FileReader()
        reader.onload = () => setMedia(prev => [...prev, { type: 'image', url: reader.result as string, name: file.name }])
        reader.readAsDataURL(file)
      } else {
        const url = URL.createObjectURL(file)
        setMedia(prev => [...prev, { type: isVideo ? 'video' : 'image', url, name: file.name }])
      }
    })
    e.target.value = ''
  }
  const removeMedia = (i: number) => setMedia(prev => prev.filter((_, idx) => idx !== i))

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) return
    onSubmit({ title, content, category, region_id: regionId, media })
    onClose()
  }

  const grouped = useMemo(() => groupedRegions(), [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-[#F2F4F6] sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-[#191F28]">글쓰기 <span className="text-xs text-[#8B95A1] font-medium">· 작성 시 +{POINT_RULES.POST_CREATE.delta}P 적립</span></h2>
          <button onClick={onClose} className="text-[#8B95A1] hover:text-[#191F28] transition-colors">
            <X size={22} strokeWidth={2} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* 지역 선택 */}
          <div>
            <label className="block text-sm font-medium text-[#191F28] mb-2">지역 게시판</label>
            <select
              value={regionId}
              onChange={e => setRegionId(e.target.value)}
              className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] transition-colors bg-white"
            >
              {grouped.map(g => (
                <optgroup key={g.parent ?? 'nationwide'} label={g.parent ?? '전국'}>
                  {g.items.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.parent_label ? `${r.parent_label} ${r.label}` : r.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="text-[11px] text-[#8B95A1] mt-1.5">같은 지역 사장님들만 서로 볼 수 있어요 · 전국 게시판은 누구나 열람 가능</p>
          </div>

          {/* 카테고리 */}
          <div>
            <label className="block text-sm font-medium text-[#191F28] mb-2">카테고리</label>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    category === cat.id ? 'bg-[#3182F6] text-white' : 'bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB]'
                  }`}
                >
                  <cat.Icon size={12} strokeWidth={2.25} />
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* 제목 */}
          <div>
            <label className="block text-sm font-medium text-[#191F28] mb-2">제목</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] transition-colors" />
          </div>

          {/* 내용 */}
          <div>
            <label className="block text-sm font-medium text-[#191F28] mb-2">내용</label>
            <textarea value={content} onChange={e => setContent(e.target.value)}
              placeholder="소상공인 이웃들과 경험을 나눠보세요!"
              rows={6}
              className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] transition-colors resize-none" />
          </div>

          {/* 사진/영상 업로드 */}
          <div>
            <label className="block text-sm font-medium text-[#191F28] mb-2">사진·영상 (선택 · 최대 10개)</label>
            <div className="flex flex-wrap gap-2">
              {media.map((m, i) => (
                <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden bg-[#F2F4F6] group">
                  {m.type === 'image'
                    ? <img src={m.url} alt={m.name} className="w-full h-full object-cover" />
                    : <video src={m.url} className="w-full h-full object-cover" muted />}
                  <button type="button" onClick={() => removeMedia(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black transition-colors">
                    <X size={10} strokeWidth={2.5} />
                  </button>
                </div>
              ))}
              {media.length < 10 && (
                <label className="w-20 h-20 rounded-xl border-2 border-dashed border-[#E5E8EB] flex flex-col items-center justify-center cursor-pointer hover:border-[#3182F6] hover:bg-[#F2F8FF] transition-colors text-[#8B95A1] hover:text-[#3182F6]">
                  <Plus size={18} strokeWidth={2.25} />
                  <span className="text-[10px] mt-0.5">사진/영상</span>
                  <input type="file" accept="image/*,video/*" multiple onChange={handleFilesPicked} className="hidden" />
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-6 pt-0">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-[#E5E8EB] text-[#4E5968] font-semibold text-sm hover:bg-[#F2F4F6] transition-colors">
            취소
          </button>
          <button onClick={handleSubmit} disabled={!title.trim() || !content.trim()}
            className="flex-1 py-3 rounded-xl bg-[#3182F6] text-white font-semibold text-sm hover:bg-[#1B64DA] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            게시하기 (+{POINT_RULES.POST_CREATE.delta}P)
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 글 상세 모달 ─────────────────────────────────────────────────
function PostModal({ post, onClose, onLike, onBookmark, onComment }: any) {
  const [comment, setComment] = useState('')
  const cat = CATEGORIES.find(c => c.id === post.category)

  const submitComment = () => {
    if (!comment.trim()) return
    onComment(post.id, comment.trim())
    setComment('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-[#F2F4F6] flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium bg-[#EFF6FF] text-[#3182F6] px-3 py-1 rounded-full">
              {cat && <cat.Icon size={12} strokeWidth={2.25} />}
              {cat?.label}
            </span>
            <RegionPill region_id={post.region_id} />
            {post.featured && (
              <span className="inline-flex items-center gap-1 text-xs font-bold bg-gradient-to-r from-[#FFB703] to-[#FB8500] text-white px-2 py-1 rounded-full">
                <Trophy size={10} strokeWidth={2.5} />인기글
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-[#8B95A1] hover:text-[#191F28] transition-colors">
            <X size={22} strokeWidth={2} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#3182F6] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
              {post.avatar}
            </div>
            <div>
              <div className="font-semibold text-[#191F28]">{post.author}</div>
              <div className="text-xs text-[#8B95A1]">{post.time}</div>
            </div>
          </div>
          <h2 className="text-xl font-bold text-[#191F28] mb-4">{post.title}</h2>
          <p className="text-[#4E5968] leading-relaxed whitespace-pre-wrap mb-6">{post.content}</p>

          {post.media && post.media.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mb-6">
              {post.media.map((m: any, i: number) => (
                <div key={i} className="rounded-xl overflow-hidden bg-[#F2F4F6]">
                  {m.type === 'image'
                    ? <img src={m.url} alt={m.name} className="w-full h-48 object-cover" />
                    : <video src={m.url} controls className="w-full h-48 object-cover bg-black" />}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 pb-6 border-b border-[#F2F4F6]">
            <button onClick={() => onLike(post.id)}
              className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${post.liked ? 'text-[#FF3B30]' : 'text-[#8B95A1] hover:text-[#FF3B30]'}`}>
              <Heart size={16} strokeWidth={post.liked ? 0 : 2} fill={post.liked ? 'currentColor' : 'none'} />
              {post.likes}
            </button>
            <button onClick={() => onBookmark(post.id)}
              className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${post.bookmarked ? 'text-[#3182F6]' : 'text-[#8B95A1] hover:text-[#3182F6]'}`}>
              <Bookmark size={16} strokeWidth={post.bookmarked ? 0 : 2} fill={post.bookmarked ? 'currentColor' : 'none'} />
              저장
            </button>
            {post.likes >= FEATURED_THRESHOLD - 5 && !post.featured && (
              <span className="ml-auto text-[11px] text-[#FB8500] font-medium">
                좋아요 {FEATURED_THRESHOLD}개 달성 시 인기글 +{POINT_RULES.POST_FEATURED.delta}P
              </span>
            )}
          </div>

          <div className="mt-4">
            <div className="text-sm font-semibold text-[#191F28] mb-4">댓글 {post.comments.length}개</div>
            {post.comments.length === 0 && (
              <div className="text-center text-[#8B95A1] text-sm py-6">첫 번째 댓글을 남겨보세요! (+{POINT_RULES.COMMENT_CREATE.delta}P)</div>
            )}
            <div className="space-y-4">
              {post.comments.map((c: any, i: number) => (
                <div key={i} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#F2F4F6] text-[#4E5968] flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {c.author[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-[#191F28]">{c.author}</span>
                      <span className="text-xs text-[#8B95A1]">{c.time}</span>
                    </div>
                    <p className="text-sm text-[#4E5968]">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-[#F2F4F6] flex-shrink-0">
          <div className="flex gap-2">
            <input type="text" value={comment} onChange={e => setComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitComment()}
              placeholder="댓글을 입력하세요... (+50P)"
              className="flex-1 border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#3182F6] transition-colors" />
            <button onClick={submitComment}
              className="px-4 py-2.5 bg-[#3182F6] text-white text-sm font-semibold rounded-xl hover:bg-[#1B64DA] transition-colors">
              등록
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── 메인 ─────────────────────────────────────────────────────────
export default function Community() {
  const [posts, setPosts] = useState<any[]>(INITIAL_POSTS)
  const [activeCategory, setActiveCategory] = useState('all')
  const [activeRegion, setActiveRegion] = useState<string>('nationwide')
  const [selectedPost, setSelectedPost] = useState<any>(null)
  const [showWrite, setShowWrite] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [myEmail, setMyEmail] = useState<string>('')
  const [balance, setBalance] = useState<number>(0)
  const [toast, setToast] = useState<{ amount: number; label: string } | null>(null)

  // 위치기반 (당근식)
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'ok' | 'denied' | 'unavailable' | 'timeout' | 'unsupported'>('idle')
  const [nearRegions, setNearRegions] = useState<Array<CommunityRegion & { distance_km: number }>>([])

  const requestGeoLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoStatus('unsupported')
      return
    }
    setGeoStatus('loading')
    // 1차 시도: 고정밀 요청 (GPS/WiFi 기반, 정확도 ↑)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        try {
          const list = nearestRegions(pos.coords.latitude, pos.coords.longitude, 6)
          setNearRegions(list)
          setGeoStatus('ok')
          // 가장 가까운 지역으로 자동 선택(전국 제외 첫 번째)
          const top = list[0]
          if (top) setActiveRegion(top.id)
          try {
            window.localStorage.setItem('localution.community_geo', JSON.stringify({
              lat: pos.coords.latitude, lng: pos.coords.longitude, ts: Date.now(),
            }))
          } catch (_) {}
        } catch (_) {
          setGeoStatus('unavailable')
        }
      },
      (err) => {
        // 고정밀 실패 시 저정밀로 2차 시도 (IP 기반, 커버리지 ↑)
        if (err && err.code === 3 /* TIMEOUT */) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              try {
                const list = nearestRegions(pos.coords.latitude, pos.coords.longitude, 6)
                setNearRegions(list)
                setGeoStatus('ok')
                const top = list[0]
                if (top) setActiveRegion(top.id)
                try {
                  window.localStorage.setItem('localution.community_geo', JSON.stringify({
                    lat: pos.coords.latitude, lng: pos.coords.longitude, ts: Date.now(),
                  }))
                } catch (_) {}
              } catch (_) {
                setGeoStatus('unavailable')
              }
            },
            (err2) => {
              if (err2 && err2.code === 1) setGeoStatus('denied')
              else if (err2 && err2.code === 3) setGeoStatus('timeout')
              else setGeoStatus('unavailable')
            },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 },
          )
          return
        }
        if (err && err.code === 1) setGeoStatus('denied')
        else if (err && err.code === 2) setGeoStatus('unavailable')
        else setGeoStatus('unavailable')
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 10 * 60 * 1000 },
    )
  }

  // 캐시된 좌표 있으면 자동 로드
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('localution.community_geo')
      if (!raw) return
      const g = JSON.parse(raw)
      if (typeof g?.lat !== 'number' || typeof g?.lng !== 'number') return
      const list = nearestRegions(g.lat, g.lng, 6)
      setNearRegions(list)
      setGeoStatus('ok')
    } catch (_) {}
  }, [])

  // 로그인 이메일 + 포인트 잔액 읽기
  useEffect(() => {
    const email = readMyEmailFromCookie() || 'guest@localution.co.kr'
    setMyEmail(email)
    setBalance(getBalance(email))
  }, [])

  // localStorage 에 저장된 내 글 로드
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('localution.community_posts')
      if (!raw) return
      const myPosts = JSON.parse(raw)
      if (Array.isArray(myPosts) && myPosts.length > 0) {
        setPosts(prev => {
          const existingIds = new Set(prev.map((p: any) => p.id))
          const fresh = myPosts.filter((p: any) => !existingIds.has(p.id))
          return [...fresh, ...prev]
        })
      }
    } catch (_) {}
  }, [])

  const filteredPosts = useMemo(() => posts.filter(p => {
    const matchCat    = activeCategory === 'all' || p.category === activeCategory
    const matchRegion = activeRegion === 'nationwide' || p.region_id === activeRegion
    const matchSearch = !searchQuery || p.title.includes(searchQuery) || p.content.includes(searchQuery)
    return matchCat && matchRegion && matchSearch
  }), [posts, activeCategory, activeRegion, searchQuery])

  const hotPosts = useMemo(() => [...posts].sort((a, b) => b.likes - a.likes).slice(0, 3), [posts])

  const pushToast = (amount: number, label: string) => setToast({ amount, label })

  const handleLike = (id: number) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== id) return p
      const newLikes = p.liked ? p.likes - 1 : p.likes + 1
      const next = { ...p, liked: !p.liked, likes: newLikes }
      // 인기글 기준 넘기면 작성자에게 500P
      if (!p.featured && newLikes >= FEATURED_THRESHOLD && p.author_email) {
        const r = maybeAwardFeatured({ post_id: p.id, author_email: p.author_email, likes: newLikes })
        if (r.ok) {
          next.featured = true
          next.featured_at = new Date().toISOString()
          if (p.author_email === myEmail) {
            setBalance(getBalance(myEmail))
            pushToast(POINT_RULES.POST_FEATURED.delta, '🎉 인기글 선정!')
          }
        }
      }
      return next
    }))
    if (selectedPost?.id === id) {
      setSelectedPost((prev: any) => prev ? { ...prev, liked: !prev.liked, likes: prev.liked ? prev.likes - 1 : prev.likes + 1 } : null)
    }
  }

  const handleBookmark = (id: number) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, bookmarked: !p.bookmarked } : p))
    if (selectedPost?.id === id) {
      setSelectedPost((prev: any) => prev ? { ...prev, bookmarked: !prev.bookmarked } : null)
    }
  }

  const handleNewPost = (data: any) => {
    const newId = Date.now()
    const newPost = {
      id: newId, ...data,
      author: '나', avatar: '나', author_email: myEmail,
      time: '방금', likes: 0, comments: [],
      liked: false, bookmarked: false, featured: false,
      media: data.media || [],
    }
    setPosts(prev => {
      const next = [newPost, ...prev]
      try {
        const mine = next.filter((p: any) => p.author === '나').slice(0, 50)
        window.localStorage.setItem('localution.community_posts', JSON.stringify(mine))
      } catch (_) {}
      return next
    })
    // 포인트 적립
    const r = awardPoints({ user_email: myEmail, rule_key: 'POST_CREATE', ref_type: 'post', ref_id: newId })
    if (r.ok) {
      setBalance(getBalance(myEmail))
      pushToast(POINT_RULES.POST_CREATE.delta, POINT_RULES.POST_CREATE.label)
    }
  }

  const handleComment = (postId: number, text: string) => {
    setPosts(prev => prev.map(p => p.id === postId
      ? { ...p, comments: [...p.comments, { author: '나', text, time: '방금' }] }
      : p))
    setSelectedPost((prev: any) => prev && prev.id === postId
      ? { ...prev, comments: [...prev.comments, { author: '나', text, time: '방금' }] }
      : prev)
    const commentRefId = `${postId}-${Date.now()}`
    const r = awardPoints({ user_email: myEmail, rule_key: 'COMMENT_CREATE', ref_type: 'comment', ref_id: commentRefId })
    if (r.ok) {
      setBalance(getBalance(myEmail))
      pushToast(POINT_RULES.COMMENT_CREATE.delta, POINT_RULES.COMMENT_CREATE.label)
    }
  }

  const regionGroups = useMemo(() => groupedRegions(), [])

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex">
      <Sidebar />
      <main className="flex-1 md:ml-[220px] pt-14 md:pt-0 min-w-0">
        <PageHeader
          icon="💬"
          title="커뮤니티"
          subtitle="소상공인 사장님들의 경험·노하우 + 우리 동네 게시판"
          variant="promo"
          right={
            <div className="hidden md:flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur px-3 py-1.5 rounded-full text-sm font-bold">
                <Coins size={14} strokeWidth={2.5} />
                {balance.toLocaleString()}P
              </div>
              <button onClick={() => setShowWrite(true)}
                className="inline-flex items-center gap-1.5 bg-white text-[#EA580C] font-bold px-4 py-2 rounded-full text-sm shadow hover:shadow-lg transition-all">
                <Pencil size={14} strokeWidth={2.5} />
                글쓰기
              </button>
            </div>
          }
        />

        <div className="max-w-5xl mx-auto p-4 md:p-6 w-full">
          {/* 모바일 상단 바 */}
          <div className="md:hidden flex items-center justify-between mb-4 gap-2">
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-[#FFB703] to-[#FB8500] text-white px-3 py-1.5 rounded-full text-sm font-bold shadow">
              <Coins size={14} strokeWidth={2.5} />
              {balance.toLocaleString()}P
            </div>
            <button onClick={() => setShowWrite(true)}
              className="inline-flex items-center gap-1.5 bg-[#3182F6] text-white font-bold px-4 py-2 rounded-full text-sm shadow">
              <Pencil size={14} strokeWidth={2.5} />
              글쓰기
            </button>
          </div>

          {/* 슬라이드 광고 배너 — 최상단 (포인트·이용안내 위) */}
          <SlideAdBanner className="mb-4" />

          {/* 포인트 이벤트 배너 */}
          <div className="bg-gradient-to-r from-[#FFF7ED] via-[#FFFBEB] to-[#FEF3C7] border border-[#FED7AA] rounded-2xl px-5 py-4 mb-4">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFB703] to-[#FB8500] flex items-center justify-center text-white flex-shrink-0 shadow">
                <Coins size={18} strokeWidth={2.25} />
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold text-[#9A3412] mb-1">🎉 커뮤니티 활동 포인트 이벤트</p>
                <p className="text-xs text-[#78350F] leading-relaxed">
                  글 작성 <b>+{POINT_RULES.POST_CREATE.delta}P</b> · 댓글 작성 <b>+{POINT_RULES.COMMENT_CREATE.delta}P</b> · 인기 게시글(좋아요 {FEATURED_THRESHOLD}개↑) <b>+{POINT_RULES.POST_FEATURED.delta}P</b>
                </p>
                <p className="text-[11px] text-[#9A3412] mt-1 opacity-80">포인트는 결제·광고·리포트 차감에 사용 가능 · 초기 운영 정책으로 한도·룰은 예고 없이 조정될 수 있어요</p>
              </div>
            </div>
          </div>

          {/* 공지 배너 */}
          <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl px-5 py-3.5 mb-4 flex items-start gap-3">
            <span className="w-9 h-9 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
              <Megaphone size={18} strokeWidth={2} className="text-[#3182F6]" />
            </span>
            <div>
              <p className="text-sm font-bold text-[#3182F6] mb-0.5">커뮤니티 이용 안내</p>
              <p className="text-xs text-[#4E5968] leading-relaxed">서로 존중하는 댓글 문화 · 광고성 게시글은 삭제될 수 있어요 · 좋은 정보는 저장·공유 환영</p>
            </div>
          </div>

          {/* 모바일 · 태블릿 전용 지역 게시판 선택 (lg 이상은 우측 사이드바 카드로 표시) */}
          <div className="lg:hidden bg-white rounded-2xl px-4 py-2.5 mb-4 shadow-sm border border-[#F2F4F6]">
            <div className="flex items-center gap-2">
              <MapPin size={13} strokeWidth={2.25} className="text-[#3182F6] flex-shrink-0" />
              <span className="text-xs font-bold text-[#191F28] flex-shrink-0">지역</span>
              <select
                value={activeRegion}
                onChange={e => setActiveRegion(e.target.value)}
                className="flex-1 min-w-0 text-xs bg-[#F2F4F6] border-none rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#3182F6]/30 font-semibold text-[#191F28]"
              >
                {regionGroups.map(g => (
                  <optgroup key={g.parent ?? 'nationwide'} label={g.parent ?? '전국'}>
                    {g.items.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.parent_label ? `${r.parent_label} ${r.label}` : r.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <button
                onClick={requestGeoLocation}
                disabled={geoStatus === 'loading'}
                className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-[#EFF6FF] text-[#3182F6] hover:bg-[#DBEAFE] transition-colors disabled:opacity-60"
              >
                {geoStatus === 'loading'
                  ? <Loader2 size={11} strokeWidth={2.5} className="animate-spin" />
                  : <Navigation size={11} strokeWidth={2.5} />}
                내 위치
              </button>
            </div>
            {(geoStatus === 'denied' || geoStatus === 'unavailable' || geoStatus === 'timeout' || geoStatus === 'unsupported') && (
              <p className="text-[10px] text-[#FB8500] mt-1.5 leading-snug">
                {geoStatus === 'denied' && '위치 권한이 차단돼 있어요. 브라우저 설정에서 허용해 주세요'}
                {geoStatus === 'unavailable' && '위치를 확인할 수 없어요. WiFi/모바일 데이터 확인 후 다시 시도'}
                {geoStatus === 'timeout' && '위치 찾기가 너무 오래 걸려요. 다시 시도해 주세요'}
                {geoStatus === 'unsupported' && '이 브라우저는 위치 기능을 지원하지 않아요'}
              </p>
            )}
          </div>

          {/* 광고 문의 라인 */}
          <div className="mb-5 flex items-center justify-between bg-white rounded-2xl px-4 py-2.5 shadow-sm border border-[#F2F4F6]">
            <p className="text-xs text-[#8B95A1]">
              이 공간은 매장·서비스 홍보 배너로도 활용됩니다
            </p>
            <Link href="/inquiry?category=ad"
              className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FFF4E5] text-[#EA580C] hover:bg-[#FFE8CC] transition-colors">
              광고 문의 <ArrowRight size={12} strokeWidth={2.5} />
            </Link>
          </div>

          {/* 검색 */}
          <div className="relative mb-5">
            <Search size={16} strokeWidth={2} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8B95A1]" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="궁금한 내용을 검색해보세요..."
              className="w-full bg-white border border-[#E5E8EB] rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] transition-colors shadow-sm" />
          </div>

          <div className="flex gap-6">
            <div className="flex-1 min-w-0">
              {/* 카테고리 탭 */}
              <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
                {CATEGORIES.map(cat => {
                  const active = activeCategory === cat.id
                  return (
                    <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        active ? 'bg-[#3182F6] text-white shadow-sm'
                               : 'bg-white text-[#4E5968] border border-[#E5E8EB] hover:border-[#3182F6] hover:text-[#3182F6]'
                      }`}>
                      <cat.Icon size={14} strokeWidth={2.25} style={active ? undefined : { color: cat.color }} />
                      {cat.label}
                    </button>
                  )
                })}
              </div>

              {/* 현재 필터 요약 */}
              <div className="text-xs text-[#8B95A1] mb-3">
                {regionLabel(activeRegion)} · {CATEGORIES.find(c => c.id === activeCategory)?.label} · 총 {filteredPosts.length}건
              </div>

              {/* 게시글 목록 */}
              {filteredPosts.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                  <div className="w-14 h-14 rounded-2xl bg-[#F2F4F6] mx-auto mb-3 flex items-center justify-center">
                    <Search size={26} strokeWidth={1.75} className="text-[#8B95A1]" />
                  </div>
                  <div className="font-semibold text-[#191F28] mb-1">게시글이 없어요</div>
                  <div className="text-sm text-[#8B95A1]">우리 동네에 첫 글을 남겨보세요 (+{POINT_RULES.POST_CREATE.delta}P)</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPosts.map(post => {
                    const cat = CATEGORIES.find(c => c.id === post.category)
                    return (
                      <div key={post.id} onClick={() => setSelectedPost(post)}
                        className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="text-xs font-medium bg-[#F2F4F6] text-[#4E5968] px-2 py-0.5 rounded-full">
                                <CatBadge cat={cat} size="xs" />
                              </span>
                              <RegionPill region_id={post.region_id} />
                              {post.featured && (
                                <span className="inline-flex items-center gap-1 text-xs font-bold bg-gradient-to-r from-[#FFB703] to-[#FB8500] text-white px-2 py-0.5 rounded-full">
                                  <Trophy size={10} strokeWidth={2.5} />인기
                                </span>
                              )}
                              {post.bookmarked && (
                                <span className="inline-flex items-center gap-1 text-xs text-[#3182F6]">
                                  <Bookmark size={10} strokeWidth={0} fill="currentColor" />
                                  저장됨
                                </span>
                              )}
                            </div>
                            <h3 className="font-semibold text-[#191F28] group-hover:text-[#3182F6] transition-colors mb-1 truncate">
                              {post.title}
                            </h3>
                            <p className="text-sm text-[#8B95A1] line-clamp-2 leading-relaxed">
                              {post.content}
                            </p>
                            {post.media && post.media.length > 0 && (
                              <div className="flex gap-1.5 mt-2">
                                {post.media.slice(0, 3).map((m: any, i: number) => (
                                  <div key={i} className="w-14 h-14 rounded-lg overflow-hidden bg-[#F2F4F6] relative">
                                    {m.type === 'image'
                                      ? <img src={m.url} alt="" className="w-full h-full object-cover" />
                                      : <>
                                          <video src={m.url} className="w-full h-full object-cover" muted />
                                          <span className="absolute inset-0 flex items-center justify-center text-white bg-black/30">
                                            <Play size={14} strokeWidth={0} fill="white" />
                                          </span>
                                        </>}
                                  </div>
                                ))}
                                {post.media.length > 3 && (
                                  <div className="w-14 h-14 rounded-lg bg-[#F2F4F6] flex items-center justify-center text-xs text-[#4E5968] font-bold">+{post.media.length - 3}</div>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#EFF6FF] text-[#3182F6] flex items-center justify-center font-bold text-sm">
                            {post.avatar}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#F2F4F6]">
                          <span className="text-xs text-[#8B95A1]">{post.author}</span>
                          <span className="text-xs text-[#8B95A1]">{post.time}</span>
                          <span className="ml-auto flex items-center gap-3 text-xs text-[#8B95A1]">
                            <span className={`inline-flex items-center gap-1 ${post.liked ? 'text-[#FF3B30]' : ''}`}>
                              <Heart size={12} strokeWidth={post.liked ? 0 : 2} fill={post.liked ? 'currentColor' : 'none'} />
                              {post.likes}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <MessageCircle size={12} strokeWidth={2} />
                              {post.comments.length}
                            </span>
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 데스크탑 사이드 — 슬림 버전 (w-64 → w-52, p-5 → p-4) */}
            <div className="hidden lg:block w-52 flex-shrink-0 space-y-3">
              {/* 지역 게시판 (최상단 · 메인 라인에서 제거된 것을 사이드바에 컴팩트화) */}
              <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-[#F2F4F6]">
                <div className="flex items-center gap-1.5 mb-2">
                  <MapPin size={12} strokeWidth={2.25} className="text-[#3182F6]" />
                  <h3 className="font-bold text-[#191F28] text-xs">지역 게시판</h3>
                  <button
                    onClick={requestGeoLocation}
                    disabled={geoStatus === 'loading'}
                    title="내 위치 찾기"
                    className="ml-auto inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#EFF6FF] text-[#3182F6] hover:bg-[#DBEAFE] transition-colors disabled:opacity-60"
                  >
                    {geoStatus === 'loading'
                      ? <Loader2 size={10} strokeWidth={2.5} className="animate-spin" />
                      : <Navigation size={10} strokeWidth={2.5} />}
                  </button>
                </div>
                <select
                  value={activeRegion}
                  onChange={e => setActiveRegion(e.target.value)}
                  className="w-full text-[11px] font-semibold text-[#191F28] bg-[#F2F4F6] border-none rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#3182F6]/30"
                >
                  {regionGroups.map(g => (
                    <optgroup key={g.parent ?? 'nationwide'} label={g.parent ?? '전국'}>
                      {g.items.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.parent_label ? `${r.parent_label} ${r.label}` : r.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <p className="text-[10px] text-[#8B95A1] mt-1.5 leading-snug">선택한 지역만 보기 · 전국 누구나 열람</p>
                {geoStatus === 'denied' && (
                  <p className="text-[10px] text-[#FB8500] mt-1 leading-snug">위치 권한이 차단돼 있어요. 브라우저 설정에서 허용해 주세요</p>
                )}
                {geoStatus === 'unavailable' && (
                  <p className="text-[10px] text-[#FB8500] mt-1 leading-snug">위치를 확인할 수 없어요. WiFi/모바일 데이터 연결 확인 후 다시 시도</p>
                )}
                {geoStatus === 'timeout' && (
                  <p className="text-[10px] text-[#FB8500] mt-1 leading-snug">위치 찾기가 너무 오래 걸려요. 다시 시도해 주세요</p>
                )}
                {geoStatus === 'unsupported' && (
                  <p className="text-[10px] text-[#FB8500] mt-1 leading-snug">이 브라우저는 위치 기능을 지원하지 않아요</p>
                )}
              </div>

              {/* 내 포인트 */}
              <div className="bg-gradient-to-br from-[#FFF7ED] to-[#FFFBF0] rounded-2xl p-3.5 border border-[#FED7AA]">
                <div className="flex items-center gap-1.5 mb-1">
                  <Coins size={13} strokeWidth={2.25} className="text-[#EA580C]" />
                  <h3 className="font-bold text-[#EA580C] text-[11px]">내 포인트</h3>
                </div>
                <p className="text-xl font-black text-[#9A3412] leading-tight">{balance.toLocaleString()}<span className="text-xs ml-1">P</span></p>
                <p className="text-[10px] text-[#78350F] mt-1 leading-snug opacity-90">활동하면 쌓여요 · 결제·광고에 사용</p>
              </div>

              {/* 내 근처 지역 (geo OK 일 때만) */}
              {geoStatus === 'ok' && nearRegions.length > 0 && (
                <div className="bg-white rounded-2xl p-3.5 shadow-sm">
                  <h3 className="font-bold text-[#191F28] mb-2 flex items-center gap-1.5 text-xs">
                    <Navigation size={12} strokeWidth={2.25} className="text-[#059669]" />
                    내 근처
                  </h3>
                  <div className="space-y-1">
                    {nearRegions.slice(0, 4).map(r => (
                      <button
                        key={r.id}
                        onClick={() => setActiveRegion(r.id)}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] transition-colors ${
                          activeRegion === r.id
                            ? 'bg-[#F0FDF4] text-[#059669] font-bold'
                            : 'text-[#4E5968] hover:bg-[#F8F9FA]'
                        }`}
                      >
                        <span className="truncate">
                          {r.parent_label ? `${r.parent_label} ${r.label}` : r.label}
                        </span>
                        <span className="opacity-70 text-[10px] flex-shrink-0 ml-1">
                          {r.distance_km < 1 ? `${(r.distance_km * 1000).toFixed(0)}m` : `${r.distance_km.toFixed(1)}km`}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 인기 게시글 */}
              <div className="bg-white rounded-2xl p-3.5 shadow-sm">
                <h3 className="font-bold text-[#191F28] mb-2.5 flex items-center gap-1.5 text-xs">
                  <Flame size={12} strokeWidth={2.25} className="text-[#FF3B30]" />
                  인기 게시글
                </h3>
                <div className="space-y-2">
                  {hotPosts.map((post, i) => (
                    <div key={post.id} onClick={() => setSelectedPost(post)} className="cursor-pointer group">
                      <div className="flex items-start gap-1.5">
                        <span className={`text-xs font-bold flex-shrink-0 ${i === 0 ? 'text-[#FF3B30]' : i === 1 ? 'text-[#FF8C00]' : 'text-[#8B95A1]'}`}>{i + 1}</span>
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium text-[#191F28] group-hover:text-[#3182F6] transition-colors line-clamp-2 leading-snug">{post.title}</p>
                          <p className="inline-flex items-center gap-1 text-[10px] text-[#8B95A1] mt-0.5">
                            <Heart size={9} strokeWidth={0} fill="currentColor" className="text-[#FF3B30]" />
                            {post.likes}
                            <span className="text-[9px] opacity-75 truncate">· {regionLabel(post.region_id)}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 카테고리별 게시글 */}
              <div className="bg-white rounded-2xl p-3.5 shadow-sm">
                <h3 className="font-bold text-[#191F28] mb-2 flex items-center gap-1.5 text-xs">
                  <BarChart3 size={12} strokeWidth={2.25} className="text-[#3182F6]" />
                  카테고리별
                </h3>
                <div className="space-y-1">
                  {CATEGORIES.filter(c => c.id !== 'all').map(cat => {
                    const count = posts.filter(p => p.category === cat.id && (activeRegion === 'nationwide' || p.region_id === activeRegion)).length
                    return (
                      <div key={cat.id} className="flex items-center justify-between text-[11px]">
                        <span className="inline-flex items-center gap-1 text-[#4E5968]">
                          <cat.Icon size={12} strokeWidth={2.25} style={{ color: cat.color }} />
                          {cat.label}
                        </span>
                        <span className="font-semibold text-[#191F28]">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="-mx-4 md:-mx-6 mt-20">
            <Footer />
          </div>
        </div>
      </main>

      {showWrite && (
        <WriteModal onClose={() => setShowWrite(false)} onSubmit={handleNewPost} defaultRegion={activeRegion} />
      )}
      {selectedPost && (
        <PostModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onLike={handleLike}
          onBookmark={handleBookmark}
          onComment={handleComment}
        />
      )}
      {toast && <PointToast amount={toast.amount} label={toast.label} onClose={() => setToast(null)} />}
    </div>
  )
}
