'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Sidebar from '../components/Sidebar'

// ─── 샘플 데이터 ──────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'all',      label: '전체',      icon: '📋' },
  { id: 'tip',      label: '마케팅 팁', icon: '💡' },
  { id: 'qna',      label: '질문/답변', icon: '❓' },
  { id: 'success',  label: '성공사례',  icon: '🎉' },
  { id: 'free',     label: '자유게시판',icon: '💬' },
]

const INITIAL_POSTS = [
  {
    id: 1, category: 'success', author: '김사장님', avatar: '김',
    title: '네이버 플레이스 별점 4.2→4.8 만든 후기 공유해요',
    content: '안녕하세요! 3개월 동안 리뷰 관리를 열심히 했더니 별점이 크게 올랐어요. 핵심은 부정 리뷰에 빠르게 진심 어린 답변을 달고, 만족한 단골손님들께 자연스럽게 리뷰를 부탁드리는 거였어요. 로컬루션으로 리뷰 알림 받고 바로바로 대응한 게 정말 도움이 많이 됐습니다. 구체적인 방법이 궁금하신 분들은 댓글 달아주세요!',
    time: '2시간 전', likes: 47, comments: [
      { author: '이점주', text: '저도 비슷한 경험 있어요! 답변 속도가 진짜 중요하더라고요 👍', time: '1시간 전' },
      { author: '박대표', text: '구체적인 멘트 예시도 공유해주실 수 있나요?', time: '45분 전' },
      { author: '김사장님', text: '물론이죠! DM 주시면 제가 쓰는 템플릿 공유드릴게요 😊', time: '30분 전' },
    ],
    liked: false, bookmarked: false,
  },
  {
    id: 2, category: 'tip', author: '마케팅고수', avatar: '마',
    title: '인스타 릴스로 매출 30% 올린 방법 (식당 운영자)',
    content: '식당 운영 5년차입니다. 올해 초부터 릴스를 시작했는데 효과가 어마어마해요. 핵심 팁: 1) 음식 만드는 과정 ASMR 2) 사장님 얼굴 노출 (친근감) 3) 자막 필수 4) 첫 3초 후킹. 편집은 캡컷으로 하고 있어요. 질문 있으시면 편하게 물어보세요!',
    time: '5시간 전', likes: 89, comments: [
      { author: '최사장', text: '릴스 올리는 최적 시간대가 있나요?', time: '4시간 전' },
      { author: '마케팅고수', text: '저는 오전 11시~12시, 저녁 7시~9시에 올리고 있어요!', time: '3시간 전' },
    ],
    liked: true, bookmarked: false,
  },
  {
    id: 3, category: 'qna', author: '초보사장', avatar: '초',
    title: '네이버 스마트플레이스 등록이 안 되는데 혹시 아시는 분?',
    content: '사업자등록증은 있는데 계속 반려가 되네요. 업종이 좀 특이해서 그런지... 혹시 비슷한 경험 있으신 분 도움 부탁드립니다ㅠ',
    time: '어제', likes: 12, comments: [
      { author: '플레이스전문가', text: '업종명이 뭔가요? 업종에 따라 추가 서류가 필요할 수 있어요', time: '어제' },
      { author: '초보사장', text: '네일샵인데요!', time: '어제' },
      { author: '플레이스전문가', text: '네일샵은 미용업 신고증 사본도 같이 첨부하셔야 해요 😊', time: '어제' },
    ],
    liked: false, bookmarked: true,
  },
  {
    id: 4, category: 'tip', author: '카페원장', avatar: '카',
    title: '단골 만드는 CRM 활용법 - 실전 경험 정리',
    content: '카페 운영하면서 고객 데이터 관리가 얼마나 중요한지 뼈저리게 느꼈어요. 생일 쿠폰, 방문 주기 파악, 선호 메뉴 기록... 이걸 체계적으로 하니까 재방문율이 확 올랐습니다. 로컬루션 CRM 기능 쓰시는 분들이랑 노하우 나눠보고 싶어요!',
    time: '2일 전', likes: 63, comments: [],
    liked: false, bookmarked: false,
  },
  {
    id: 5, category: 'free', author: '동네빵집', avatar: '동',
    title: '오늘 리뷰 답변하다가 감동받은 일 🥹',
    content: '별점 2점짜리 리뷰에 정성껏 답변했더니, 며칠 후 그 손님이 다시 오셔서 "사장님 답변 보고 마음 바뀌었어요"라고 하시더라구요. 리뷰 하나하나가 다 소중한 인연이라는 걸 느꼈어요. 다들 오늘도 힘내세요 💪',
    time: '3일 전', likes: 134, comments: [
      { author: '이웃가게', text: '저도 비슷한 경험 있어요! 진심은 통하더라고요 ❤️', time: '3일 전' },
    ],
    liked: true, bookmarked: false,
  },
  {
    id: 6, category: 'success', author: '뷰티샵원장', avatar: '뷰',
    title: 'QR코드 하나로 예약 문의 80% 줄인 방법',
    content: '손님들한테 QR 찍어서 카카오 예약 연결하도록 했더니 전화 문의가 확 줄었어요. 직접 예약이 가능하니 손님도 편하고 저도 편하고! 테이블마다 QR 놓고 리뷰도 유도하고 있어요.',
    time: '4일 전', likes: 56, comments: [],
    liked: false, bookmarked: false,
  },
]

// ─── 글쓰기 모달 ──────────────────────────────────────────────────
function WriteModal({ onClose, onSubmit }: { onClose: () => void, onSubmit: (post: any) => void }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('free')

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) return
    onSubmit({ title, content, category })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-[#F2F4F6]">
          <h2 className="text-lg font-bold text-[#191F28]">글쓰기</h2>
          <button onClick={onClose} className="text-[#8B95A1] hover:text-[#191F28] text-2xl leading-none">×</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#191F28] mb-2">카테고리</label>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    category === cat.id
                      ? 'bg-[#3182F6] text-white'
                      : 'bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB]'
                  }`}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#191F28] mb-2">제목</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#191F28] mb-2">내용</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="소상공인 이웃들과 경험을 나눠보세요. 마케팅 팁, 성공/실패 사례, 질문 모두 환영합니다!"
              rows={6}
              className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] transition-colors resize-none"
            />
          </div>
        </div>
        <div className="flex gap-3 p-6 pt-0">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-[#E5E8EB] text-[#4E5968] font-semibold text-sm hover:bg-[#F2F4F6] transition-colors">
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || !content.trim()}
            className="flex-1 py-3 rounded-xl bg-[#3182F6] text-white font-semibold text-sm hover:bg-[#1B64DA] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            게시하기
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 글 상세 모달 ─────────────────────────────────────────────────
function PostModal({ post, onClose, onLike, onBookmark }: any) {
  const [comment, setComment] = useState('')
  const [comments, setComments] = useState(post.comments)
  const cat = CATEGORIES.find(c => c.id === post.category)

  const submitComment = () => {
    if (!comment.trim()) return
    setComments([...comments, { author: '나', text: comment, time: '방금' }])
    setComment('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-[#F2F4F6] flex-shrink-0">
          <span className="text-sm font-medium bg-[#EFF6FF] text-[#3182F6] px-3 py-1 rounded-full">
            {cat?.icon} {cat?.label}
          </span>
          <button onClick={onClose} className="text-[#8B95A1] hover:text-[#191F28] text-2xl leading-none">×</button>
        </div>

        {/* 내용 */}
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

          {/* 액션 */}
          <div className="flex items-center gap-4 pb-6 border-b border-[#F2F4F6]">
            <button
              onClick={() => onLike(post.id)}
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${post.liked ? 'text-[#FF3B30]' : 'text-[#8B95A1] hover:text-[#FF3B30]'}`}
            >
              {post.liked ? '❤️' : '🤍'} {post.likes + (post.liked ? 0 : 0)}
            </button>
            <button
              onClick={() => onBookmark(post.id)}
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${post.bookmarked ? 'text-[#3182F6]' : 'text-[#8B95A1] hover:text-[#3182F6]'}`}
            >
              {post.bookmarked ? '🔖' : '📎'} 저장
            </button>
          </div>

          {/* 댓글 */}
          <div className="mt-4">
            <div className="text-sm font-semibold text-[#191F28] mb-4">댓글 {comments.length}개</div>
            {comments.length === 0 && (
              <div className="text-center text-[#8B95A1] text-sm py-6">첫 번째 댓글을 남겨보세요!</div>
            )}
            <div className="space-y-4">
              {comments.map((c: any, i: number) => (
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

        {/* 댓글 입력 */}
        <div className="p-4 border-t border-[#F2F4F6] flex-shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={comment}
              onChange={e => setComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitComment()}
              placeholder="댓글을 입력하세요..."
              className="flex-1 border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#3182F6] transition-colors"
            />
            <button
              onClick={submitComment}
              className="px-4 py-2.5 bg-[#3182F6] text-white text-sm font-semibold rounded-xl hover:bg-[#1B64DA] transition-colors"
            >
              등록
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── 메인 커뮤니티 페이지 ─────────────────────────────────────────
export default function Community() {
  const [posts, setPosts] = useState(INITIAL_POSTS)
  const [activeCategory, setActiveCategory] = useState('all')
  const [selectedPost, setSelectedPost] = useState<any>(null)
  const [showWrite, setShowWrite] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredPosts = posts.filter(p => {
    const matchCat = activeCategory === 'all' || p.category === activeCategory
    const matchSearch = !searchQuery || p.title.includes(searchQuery) || p.content.includes(searchQuery)
    return matchCat && matchSearch
  })

  const hotPosts = [...posts].sort((a, b) => b.likes - a.likes).slice(0, 3)

  const handleLike = (id: number) => {
    setPosts(prev => prev.map(p =>
      p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p
    ))
    if (selectedPost?.id === id) {
      setSelectedPost((prev: any) => prev ? {
        ...prev, liked: !prev.liked, likes: prev.liked ? prev.likes - 1 : prev.likes + 1
      } : null)
    }
  }

  const handleBookmark = (id: number) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, bookmarked: !p.bookmarked } : p))
    if (selectedPost?.id === id) {
      setSelectedPost((prev: any) => prev ? { ...prev, bookmarked: !prev.bookmarked } : null)
    }
  }

  const handleNewPost = (data: any) => {
    const newPost = {
      id: Date.now(), ...data,
      author: '나', avatar: '나',
      time: '방금', likes: 0, comments: [],
      liked: false, bookmarked: false,
    }
    setPosts(prev => [newPost, ...prev])
  }

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex">
      <Sidebar />
      <main className="flex-1 md:ml-[220px] p-4 md:p-8 pt-16 md:pt-8">

        {/* 헤더 */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#191F28]">커뮤니티</h1>
            <p className="text-[#8B95A1] mt-1">소상공인 사장님들의 경험과 노하우를 나눠요</p>
          </div>
          <button
            onClick={() => setShowWrite(true)}
            className="flex items-center gap-2 bg-[#3182F6] text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-[#1B64DA] transition-colors text-sm"
          >
            ✏️ 글쓰기
          </button>
        </div>

        {/* 검색 */}
        <div className="relative mb-5">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8B95A1]">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="궁금한 내용을 검색해보세요..."
            className="w-full bg-white border border-[#E5E8EB] rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] transition-colors shadow-sm"
          />
        </div>

        <div className="flex gap-6">
          {/* 메인 피드 */}
          <div className="flex-1 min-w-0">
            {/* 카테고리 탭 */}
            <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    activeCategory === cat.id
                      ? 'bg-[#3182F6] text-white shadow-sm'
                      : 'bg-white text-[#4E5968] border border-[#E5E8EB] hover:border-[#3182F6] hover:text-[#3182F6]'
                  }`}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>

            {/* 게시글 목록 */}
            {filteredPosts.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                <div className="text-4xl mb-3">🔍</div>
                <div className="font-semibold text-[#191F28] mb-1">검색 결과가 없어요</div>
                <div className="text-sm text-[#8B95A1]">다른 키워드로 검색해보세요</div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPosts.map(post => {
                  const cat = CATEGORIES.find(c => c.id === post.category)
                  return (
                    <div
                      key={post.id}
                      onClick={() => setSelectedPost(post)}
                      className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="text-xs font-medium bg-[#F2F4F6] text-[#4E5968] px-2 py-0.5 rounded-full">
                              {cat?.icon} {cat?.label}
                            </span>
                            {post.bookmarked && <span className="text-xs text-[#3182F6]">🔖 저장됨</span>}
                          </div>
                          <h3 className="font-semibold text-[#191F28] group-hover:text-[#3182F6] transition-colors mb-1 truncate">
                            {post.title}
                          </h3>
                          <p className="text-sm text-[#8B95A1] line-clamp-2 leading-relaxed">
                            {post.content}
                          </p>
                        </div>
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#EFF6FF] text-[#3182F6] flex items-center justify-center font-bold text-sm">
                          {post.avatar}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#F2F4F6]">
                        <span className="text-xs text-[#8B95A1]">{post.author}</span>
                        <span className="text-xs text-[#8B95A1]">{post.time}</span>
                        <span className="ml-auto flex items-center gap-3 text-xs text-[#8B95A1]">
                          <span className={`flex items-center gap-1 ${post.liked ? 'text-[#FF3B30]' : ''}`}>
                            {post.liked ? '❤️' : '🤍'} {post.likes}
                          </span>
                          <span className="flex items-center gap-1">
                            💬 {post.comments.length}
                          </span>
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 데스크탑 사이드 패널 */}
          <div className="hidden lg:block w-64 flex-shrink-0 space-y-4">
            {/* 인기 게시글 */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-[#191F28] mb-4 flex items-center gap-2">
                🔥 인기 게시글
              </h3>
              <div className="space-y-3">
                {hotPosts.map((post, i) => (
                  <div
                    key={post.id}
                    onClick={() => setSelectedPost(post)}
                    className="cursor-pointer group"
                  >
                    <div className="flex items-start gap-2">
                      <span className={`text-sm font-bold flex-shrink-0 ${i === 0 ? 'text-[#FF3B30]' : i === 1 ? 'text-[#FF8C00]' : 'text-[#8B95A1]'}`}>
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-xs font-medium text-[#191F28] group-hover:text-[#3182F6] transition-colors line-clamp-2">
                          {post.title}
                        </p>
                        <p className="text-xs text-[#8B95A1] mt-0.5">❤️ {post.likes}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 커뮤니티 안내 */}
            <div className="bg-[#EFF6FF] rounded-2xl p-5">
              <h3 className="font-bold text-[#191F28] mb-2">📢 커뮤니티 안내</h3>
              <ul className="text-xs text-[#4E5968] space-y-1.5">
                <li>• 서로 존중하는 댓글 문화를 지켜주세요</li>
                <li>• 광고성 게시글은 삭제될 수 있어요</li>
                <li>• 좋은 정보는 저장하고 공유해주세요!</li>
              </ul>
            </div>

            {/* 카테고리 통계 */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-[#191F28] mb-4">📊 카테고리별 게시글</h3>
              <div className="space-y-2">
                {CATEGORIES.filter(c => c.id !== 'all').map(cat => {
                  const count = posts.filter(p => p.category === cat.id).length
                  return (
                    <div key={cat.id} className="flex items-center justify-between text-sm">
                      <span className="text-[#4E5968]">{cat.icon} {cat.label}</span>
                      <span className="font-semibold text-[#191F28]">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 모달들 */}
      {showWrite && (
        <WriteModal onClose={() => setShowWrite(false)} onSubmit={handleNewPost} />
      )}
      {selectedPost && (
        <PostModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onLike={handleLike}
          onBookmark={handleBookmark}
        />
      )}
    </div>
  )
}
