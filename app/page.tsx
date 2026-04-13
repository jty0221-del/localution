'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import Sidebar from './components/Sidebar'

const stats = [
  { label: '오늘 리뷰', value: '12', change: '+3', positive: true, icon: '⭐' },
  { label: '이번 주 방문', value: '284', change: '+18%', positive: true, icon: '👥' },
  { label: '평균 별점', value: '4.6', change: '+0.2', positive: true, icon: '📊' },
  { label: '미답변 리뷰', value: '5', change: '-2', positive: true, icon: '💬' },
]

const recentReviews = [
  { platform: '네이버', name: '김**', rating: 5, content: '음식이 정말 맛있고 서비스도 친절해요!', time: '10분 전', replied: false },
  { platform: '구글', name: 'J***', rating: 4, content: 'Great place, will visit again!', time: '1시간 전', replied: true },
  { platform: '카카오', name: '이**', rating: 3, content: '맛은 있는데 웨이팅이 좀 길어요.', time: '3시간 전', replied: false },
]

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex">
      <Sidebar />
      <main className="flex-1 md:ml-[220px] p-4 md:p-8">
        {/* 모바일 헤더 */}
        <div className="md:hidden flex items-center justify-between mb-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg bg-white shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-bold text-lg text-[#191F28]">로컬루션</span>
          <div className="w-9" />
        </div>

        {/* 인사 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#191F28]">안녕하세요 👋</h1>
          <p className="text-[#8B95A1] mt-1">오늘도 매장 운영 화이팅이에요!</p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="text-2xl mb-2">{stat.icon}</div>
              <div className="text-2xl font-bold text-[#191F28]">{stat.value}</div>
              <div className="text-sm text-[#8B95A1] mt-1">{stat.label}</div>
              <div className={`text-xs mt-2 font-medium ${stat.positive ? 'text-[#00C471]' : 'text-[#FF3B30]'}`}>
                {stat.change}
              </div>
            </div>
          ))}
        </div>

        {/* AI 추천 배너 */}
        <div className="bg-[#3182F6] rounded-2xl p-6 mb-8 text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-medium opacity-80 mb-1">AI 추천</div>
              <div className="text-lg font-bold mb-2">미답변 리뷰 5개가 있어요</div>
              <div className="text-sm opacity-80">AI가 답변 초안을 준비했어요. 확인해볼까요?</div>
            </div>
            <div className="text-3xl">🤖</div>
          </div>
          <Link
            href="/review-admin"
            className="inline-block mt-4 bg-white text-[#3182F6] font-semibold text-sm px-4 py-2 rounded-lg"
          >
            리뷰 관리하기 →
          </Link>
        </div>

        {/* 최근 리뷰 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-[#191F28]">최근 리뷰</h2>
            <Link href="/review-admin" className="text-sm text-[#3182F6] font-medium">전체보기</Link>
          </div>
          <div className="space-y-4">
            {recentReviews.map((review, i) => (
              <div key={i} className="flex items-start gap-3 pb-4 border-b border-[#F2F4F6] last:border-0 last:pb-0">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#F2F4F6] flex items-center justify-center text-xs font-bold text-[#3182F6]">
                  {review.platform[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-[#191F28]">{review.name}</span>
                    <span className="text-xs text-[#8B95A1]">{review.platform}</span>
                    <span className="text-yellow-400 text-xs">{'★'.repeat(review.rating)}</span>
                    {!review.replied && (
                      <span className="text-xs bg-[#FFE8E8] text-[#FF3B30] px-1.5 py-0.5 rounded-full">미답변</span>
                    )}
                  </div>
                  <p className="text-sm text-[#4E5968] truncate">{review.content}</p>
                  <span className="text-xs text-[#8B95A1]">{review.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 빠른 실행 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'AI 리뷰 답변', icon: '✍️', href: '/review-admin', color: '#EFF6FF' },
            { label: '고객 관리', icon: '👤', href: '/crm', color: '#F0FFF4' },
            { label: '매장 관리', icon: '🏪', href: '/admin-biz', color: '#FFF7E6' },
            { label: '기능 추가', icon: '✨', href: '/pricing', color: '#F5F0FF' },
          ].map((item, i) => (
            <Link
              key={i}
              href={item.href}
              className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow text-center"
            >
              <div className="text-3xl mb-2">{item.icon}</div>
              <div className="text-sm font-medium text-[#191F28]">{item.label}</div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
