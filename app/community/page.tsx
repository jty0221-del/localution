'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import PartnerSpotlight from '../components/PartnerSpotlight'

const CATEGORIES = [
  { id: 'all',     label: '전체',       icon: '📋' },
  { id: 'tip',     label: '마케팅 팁',  icon: '💡' },
  { id: 'qna',     label: '질문/답변',  icon: '❓' },
  { id: 'success', label: '성공사례',   icon: '🎉' },
  { id: 'free',    label: '자유게시판', icon: '💬' },
]

const INITIAL_POSTS = [
  { id: 1, category: 'success', author: '김사장님', avatar: '김',
    title: '네이버 플레이스 별점 4.2→4.8 만든 후기',
    content: '3개월 동안 리뷰 관리를 열심히 했더니 별점이 크게 올랐어요. 핵심은 부정 리뷰에 빠르게 진심 어린 답변을 달고, 만족한 단골손님들께 자연스럽게 리뷰를 부탁드리는 거였어요. 로컬루션으로 리뷰 알림 받고 바로바로 대응한 게 정말 도움이 됐습니다!',
    time: '2시간 전', likes: 47, comments: [
      { author: '이점주', text: '답변 속도가 진짜 중요하더라고요 👍', time: '1시간 전' },
      { author: '박대표', text: '구체적인 멘트 예시도 공유해주실 수 있나요?', time: '45분 전' },
    ], liked: false, bookmarked: false },
  { id: 2, category: 'tip', author: '마케팅고수', avatar: '마',
    title: '인스타 릴스로 매출 30% 올린 방법 (식당)',
    content: '릴스 핵심 팁: 1) 음식 만드는 과정 ASMR 2) 사장님 얼굴 노출으로 친근감 3) 자막 필수 4) 첫 3초 후킹. 편집은 캡컷으로 하고 있어요!',
    time: '5시간 전', likes: 89, comments: [], liked: true, bookmarked: false },
  { id: 3, category: 'qna', author: '초보사장', avatar: '초',
    title: '네이버 스마트플레이스 등록이 안 되는데 혹시 아시는 분?',
    content: '사업자등록증은 있는데 계속 반려가 됩니다. 업종이 좀 특이해서 그런지... 도움 주시면 감사하겠습니다ㅠ',
    time: '어제', likes: 12, comments: [
      { author: '플레이스전문가', text: '업종명이 뭔가요? 추가 서류가 필요할 수 있어요', time: '어제' },
    ], liked: false, bookmarked: true },
  { id: 4, category: 'tip', author: '카페원장', avatar: '카',
    title: '단골 만드는 CRM 활용법 - 실전 경험',
    content: '생일 쿠폰, 방문 주기 파악, 선호 메뉴 기록... 체계적으로 하니 재방문율이 확 올랐습니다!',
    time: '2일 전', likes: 63, comments: [], liked: false, bookmarked: false },
  { id: 5, category: 'free', author: '동네빵집', avatar: '동',
    title: '오늘 리뷰 답변하다가 감동받은 일 🥹',
    content: '별점 2점 리뷰에 정성껏 답변했더니, 며칠 후 그 손님이 다시 오셔서 "사장님 답변 보고 마음 바뀌었어요"라고 하시더라구요. 진심은 통해요!',
    time: '3일 전', likes: 134, comments: [
      { author: '이웃가게', text: '진심은 통하더라고요 ❤️', time: '3일 전' },
    ], liked: true, bookmarked: false },
]

function WriteModal({ onClose, onSubmit }: any) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('free')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-[#F2F4F6]">
          <h2 className="text-lg font-bold text-[#191F28]">✏️ 글쓰기</h2>
          <button onClick={onClose} className="text-[#8B95A1] text-2xl">×</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
              <button key={cat.id} onClick={() => setCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${category === cat.id ? 'bg-[#3182F6] text-white' : 'bg-[#F2F4F6] text-[#4E5968]'}`}>
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="제목"
            className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6]" />
          <textarea value={content} onChange={e => setContent(e.target.value)} rows={5}
            placeholder="소상공인 이웃들과 경험을 나눠보세요!"
            className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] resize-none" />
        </div>
        <div className="flex gap-3 p-6 pt-0">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-[#E5E8EB] text-[#4E5968] font-semibold text-sm">취소</button>
          <button onClick={() => { if (title && content) { onSubmit({ title, content, category }); onClose(); } }}
            className="flex-1 py-3 rounded-xl bg-[#3182F6] text-white font-semibold text-sm">게시하기</button>
        </div>
      </div>
    </div>
  )
}

function PostModal({ post, onClose, onLike }: any) {
  const [comment, setComment] = useState('')
  const [comments, setComments] = useState(post.comments)
  const cat = CATEGORIES.find(c => c.id === post.category)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-[#F2F4F6]">
          <span className="text-sm font-semibold bg-[#EFF6FF] text-[#3182F6] px-3 py-1 rounded-full">{cat?.icon} {cat?.label}</span>
          <button onClick={onClose} className="text-[#8B95A1] text-2xl">×</button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#3182F6] text-white flex items-center justify-center font-bold text-sm">{post.avatar}</div>
            <div><div className="font-bold text-[#191F28]">{post.author}</div><div className="text-xs text-[#8B95A1]">{post.time}</div></div>
          </div>
          <h2 className="text-xl font-bold text-[#191F28] mb-4">{post.title}</h2>
          <p className="text-[#4E5968] leading-relaxed mb-6">{post.content}</p>
          <div className="flex items-center gap-4 pb-5 border-b border-[#F2F4F6] mb-4">
            <button onClick={() => onLike(post.id)} className={`flex items-center gap-1 text-sm font-semibold ${post.liked ? 'text-[#FF3B30]' : 'text-[#8B95A1]'}`}>
              {post.liked ? '❤️' : '🤍'} {post.likes}
            </button>
            <span className="text-sm text-[#8B95A1]">💬 {comments.length}</span>
          </div>
          <div className="space-y-4">
            {comments.map((c: any, i: number) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-[#F2F4F6] flex items-center justify-center text-xs font-bold flex-shrink-0">{c.author[0]}</div>
                <div><div className="text-sm font-bold text-[#191F28]">{c.author} <span className="font-normal text-[#8B95A1] text-xs">{c.time}</span></div><p className="text-sm text-[#4E5968] mt-0.5">{c.text}</p></div>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-[#F2F4F6] flex gap-2">
          <input value={comment} onChange={e => setComment(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && comment.trim()) { setComments([...comments, { author: '나', text: comment, time: '방금' }]); setComment(''); }}}
            placeholder="댓글 입력..." className="flex-1 border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#3182F6]" />
          <button onClick={() => { if (comment.trim()) { setComments([...comments, { author: '나', text: comment, time: '방금' }]); setComment(''); }}}
            className="px-4 py-2.5 bg-[#3182F6] text-white text-sm font-bold rounded-xl">등록</button>
        </div>
      </div>
    </div>
  )
}

export default function Community() {
  const [posts, setPosts] = useState(INITIAL_POSTS)
  const [activeCategory, setActiveCategory] = useState('all')
  const [selectedPost, setSelectedPost] = useState<any>(null)
  const [showWrite, setShowWrite] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = posts.filter(p =>
    (activeCategory === 'all' || p.category === activeCategory) &&
    (!search || p.title.includes(search) || p.content.includes(search))
  )
  const hotPosts = [...posts].sort((a, b) => b.likes - a.likes).slice(0, 3)
  const handleLike = (id: number) => setPosts(prev => prev.map(p => p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p))
  const handleNew = (data: any) => setPosts(prev => [{ id: Date.now(), ...data, author: '나', avatar: '나', time: '방금', likes: 0, comments: [], liked: false, bookmarked: false }, ...prev])

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex">
      <Sidebar />
      <main className="flex-1 md:ml-[220px] px-4 md:px-8 pb-8">
        <TopBar />

        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <p className="text-[#8B95A1]">소상공인 사장님들의 경험과 노하우를 나눠요</p>
          <button onClick={() => setShowWrite(true)} className="flex items-center gap-2 bg-[#3182F6] text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-[#1B64DA] transition-colors">
            ✏️ 글쓰기
          </button>
        </div>

        <div className="relative mb-5">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8B95A1]">🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="검색..."
            className="w-full bg-white border border-[#E5E8EB] rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] shadow-sm" />
        </div>

        <div className="flex gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
              {CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${activeCategory === cat.id ? 'bg-[#3182F6] text-white' : 'bg-white text-[#4E5968] border border-[#E5E8EB] hover:border-[#3182F6]'}`}>
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {filtered.map(post => {
                const cat = CATEGORIES.find(c => c.id === post.category)
                return (
                  <div key={post.id} onClick={() => setSelectedPost(post)} className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold bg-[#F2F4F6] text-[#4E5968] px-2 py-0.5 rounded-full">{cat?.icon} {cat?.label}</span>
                          {post.bookmarked && <span className="text-xs text-[#3182F6]">🔖</span>}
                        </div>
                        <h3 className="font-bold text-[#191F28] group-hover:text-[#3182F6] transition-colors mb-1 truncate">{post.title}</h3>
                        <p className="text-sm text-[#8B95A1] line-clamp-2">{post.content}</p>
                      </div>
                      <div className="w-9 h-9 rounded-full bg-[#EFF6FF] text-[#3182F6] flex items-center justify-center font-bold text-sm flex-shrink-0">{post.avatar}</div>
                    </div>
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[#F2F4F6] text-xs text-[#8B95A1]">
                      <span>{post.author}</span><span>{post.time}</span>
                      <span className="ml-auto flex items-center gap-3">
                        <span className={post.liked ? 'text-[#FF3B30]' : ''}>{post.liked ? '❤️' : '🤍'} {post.likes}</span>
                        <span>💬 {post.comments.length}</span>
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 사이드바 */}
          <div className="hidden lg:block w-64 flex-shrink-0 space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-[#191F28] mb-4">🔥 인기 게시글</h3>
              {hotPosts.map((p, i) => (
                <div key={p.id} onClick={() => setSelectedPost(p)} className="flex gap-2 mb-3 cursor-pointer group">
                  <span className={`text-sm font-bold flex-shrink-0 ${i === 0 ? 'text-[#FF3B30]' : i === 1 ? 'text-[#FF8C00]' : 'text-[#8B95A1]'}`}>{i+1}</span>
                  <div>
                    <p className="text-xs font-semibold text-[#191F28] group-hover:text-[#3182F6] line-clamp-2">{p.title}</p>
                    <p className="text-xs text-[#8B95A1]">❤️ {p.likes}</p>
                  </div>
                </div>
              ))}
            </div>
            <PartnerSpotlight variant="card" />
            <div className="bg-[#EFF6FF] rounded-2xl p-5">
              <h3 className="font-bold text-[#191F28] mb-2">📢 공지</h3>
              <p className="text-xs text-[#4E5968] leading-relaxed">서로 존중하는 댓글 문화 부탁드립니다. 광고성 게시글은 삭제될 수 있어요.</p>
            </div>
          </div>
        </div>
      </main>

      {showWrite && <WriteModal onClose={() => setShowWrite(false)} onSubmit={handleNew} />}
      {selectedPost && <PostModal post={posts.find(p => p.id === selectedPost.id) || selectedPost} onClose={() => setSelectedPost(null)} onLike={handleLike} />}
    </div>
  )
}
