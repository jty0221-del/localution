'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import PartnerSpotlight from './components/PartnerSpotlight'

const stats = [
  { label: '오늘 리뷰',    value: '12',  change: '+3',   positive: true,  icon: '⭐' },
  { label: '이번 주 방문', value: '284', change: '+18%', positive: true,  icon: '👥' },
  { label: '평균 별점',    value: '4.6', change: '+0.2', positive: true,  icon: '📊' },
  { label: '미답변 리뷰',  value: '5',   change: '-2',   positive: true,  icon: '💬' },
]

const weeklyData = [
  { day: '월', count: 8 }, { day: '화', count: 12 }, { day: '수', count: 5 },
  { day: '목', count: 15 }, { day: '금', count: 20 }, { day: '토', count: 18 }, { day: '일', count: 12 },
]

const recentReviews = [
  { platform: '네이버', name: '김**', rating: 5, content: '음식이 정말 맛있고 서비스도 친절해요!', time: '10분 전', replied: false },
  { platform: '구글',   name: 'J***', rating: 4, content: 'Great place, will visit again!',         time: '1시간 전', replied: true },
  { platform: '카카오', name: '이**', rating: 3, content: '맛은 있는데 웨이팅이 좀 길어요.',        time: '3시간 전', replied: false },
]

export default function Dashboard() {
  const [showPopup, setShowPopup] = useState(false)
  const maxCount = Math.max(...weeklyData.map(d => d.count))

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex">
      <Sidebar />
      <main className="flex-1 md:ml-[220px] px-4 md:px-8 pb-8">
        <TopBar />

        {/* 인사 + 팝업 버튼 */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
          <p className="text-[#8B95A1]">오늘도 매장 운영 화이팅이에요! 🔥</p>
          <button onClick={() => setShowPopup(true)}
            className="flex items-center gap-2 text-xs font-semibold bg-white border border-[#E5E8EB] text-[#4E5968] px-3 py-2 rounded-xl hover:border-[#3182F6] hover:text-[#3182F6] transition-colors shadow-sm">
            🏆 이달의 우수매장
          </button>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {stats.map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-2xl mb-2">{s.icon}</div>
              <div className="text-2xl font-bold text-[#191F28]">{s.value}</div>
              <div className="text-sm text-[#8B95A1] mt-1">{s.label}</div>
              <div className={`text-xs mt-2 font-semibold ${s.positive ? 'text-[#00C471]' : 'text-[#FF3B30]'}`}>{s.change}</div>
            </div>
          ))}
        </div>

        {/* 파트너 배너 */}
        <PartnerSpotlight variant="banner" />

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* 주간 리뷰 차트 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-[#191F28]">📈 이번 주 리뷰 현황</h2>
              <span className="text-xs text-[#8B95A1]">총 90개</span>
            </div>
            <div className="flex items-end gap-2 h-32">
              {weeklyData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-bold text-[#4E5968]">{d.count}</span>
                  <div className="w-full rounded-t-lg transition-all"
                    style={{
                      height: `${(d.count / maxCount) * 100}%`,
                      backgroundColor: d.day === '목' || d.day === '금' ? '#3182F6' : '#BFDBFE',
                      minHeight: 8,
                    }} />
                  <span className="text-xs text-[#8B95A1]">{d.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI 추천 + 빠른 실행 */}
          <div className="space-y-4">
            <div className="bg-[#3182F6] rounded-2xl p-5 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-semibold opacity-75 mb-1">🤖 AI 추천</div>
                  <div className="font-bold mb-1">미답변 리뷰 5개</div>
                  <div className="text-xs opacity-80">AI 초안이 준비됐어요</div>
                </div>
                <span className="text-3xl">📝</span>
              </div>
              <Link href="/review-admin"
                className="inline-block mt-3 bg-white text-[#3182F6] text-xs font-bold px-4 py-2 rounded-lg">
                바로 답변하기 →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '고객 관리', icon: '👤', href: '/crm',         color: '#EFF6FF' },
                { label: 'QR 관리',  icon: '📱', href: '/qr-admin',    color: '#F0FFF4' },
                { label: '매장 설정', icon: '🏪', href: '/admin-biz',  color: '#FFF7E6' },
                { label: '기능 추가', icon: '✨', href: '/pricing',     color: '#F5F0FF' },
              ].map((item, i) => (
                <Link key={i} href={item.href}
                  className="rounded-xl p-4 text-center hover:shadow-md transition-shadow"
                  style={{ backgroundColor: item.color }}>
                  <div className="text-2xl mb-1">{item.icon}</div>
                  <div className="text-xs font-semibold text-[#191F28]">{item.label}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* 최근 리뷰 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-[#191F28]">최근 리뷰</h2>
            <Link href="/review-admin" className="text-sm text-[#3182F6] font-semibold">전체보기 →</Link>
          </div>
          <div className="space-y-4">
            {recentReviews.map((r, i) => (
              <div key={i} className="flex items-start gap-3 pb-4 border-b border-[#F2F4F6] last:border-0 last:pb-0">
                <div className="w-8 h-8 rounded-full bg-[#EFF6FF] flex items-center justify-center text-xs font-bold text-[#3182F6] flex-shrink-0">
                  {r.platform[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-semibold text-[#191F28]">{r.name}</span>
                    <span className="text-xs text-[#8B95A1]">{r.platform}</span>
                    <span className="text-yellow-400 text-xs">{'★'.repeat(r.rating)}</span>
                    {!r.replied && <span className="text-xs bg-[#FFE8E8] text-[#FF3B30] px-2 py-0.5 rounded-full">미답변</span>}
                  </div>
                  <p className="text-sm text-[#4E5968] truncate">{r.content}</p>
                  <span className="text-xs text-[#8B95A1]">{r.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {showPopup && <PartnerSpotlight variant="popup" />}
    </div>
  )
}
