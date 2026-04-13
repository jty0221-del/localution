export const dynamic = 'force-dynamic'
'use client'
import { useState } from 'react'

const stats = [
  { label: '이번달 매출', value: '4,820,000원', change: '+12.4%', up: true, icon: '📈', color: 'blue' },
  { label: '신규 리뷰', value: '28개', change: '+5개', up: true, icon: '⭐', color: 'yellow' },
  { label: '단골 고객', value: '142명', change: '+8명', up: true, icon: '👥', color: 'green' },
  { label: '미수금', value: '320,000원', change: '-2건', up: false, icon: '📋', color: 'red' },
]

const reviews = [
  { platform: '네이버', name: '김지수', stars: 5, text: '음식이 너무 맛있어요! 사장님도 친절하시고 또 올게요 😊', time: '10분 전', answered: false },
  { platform: '배민', name: '박민준', stars: 4, text: '배달도 빠르고 양도 많아요. 가격 대비 최고!', time: '1시간 전', answered: true },
  { platform: '네이버', name: '이서연', stars: 5, text: '분위기 너무 좋고 커피도 맛있어요. 단골 될 것 같아요!', time: '3시간 전', answered: false },
]

const quickActions = [
  { label: 'AI 리뷰 답글', icon: '⭐', href: '/review-admin', color: 'bg-blue-50 text-blue-600' },
  { label: '알림톡 발송', icon: '💬', href: '/crm', color: 'bg-green-50 text-green-600' },
  { label: '세금계산서', icon: '📋', href: '/admin-biz', color: 'bg-orange-50 text-orange-600' },
  { label: '공동구매', icon: '🛒', href: '/qr-admin', color: 'bg-purple-50 text-purple-600' },
]

const colorMap: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600',
  yellow: 'bg-yellow-50 text-yellow-600',
  green: 'bg-green-50 text-green-600',
  red: 'bg-red-50 text-red-500',
}

export default function DashboardPage() {
  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })

  return (
    <div className="min-h-screen bg-[#F2F4F6]">
      <div className="md:ml-[220px] p-4 md:p-8 max-w-5xl">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6 pt-14 md:pt-0">
          <div>
            <p className="text-sm text-gray-400 mb-1">{today} · 부천 소사구</p>
            <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors">
              🔔
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-400 rounded-full"></span>
            </button>
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white font-bold shadow-sm shadow-blue-200">
              전
            </div>
          </div>
        </div>

        {/* AI 배너 */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-5 mb-6 shadow-sm shadow-blue-200">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-medium">AI 비서 활성화됨</span>
              </div>
              <h2 className="text-xl font-bold text-white mb-1">좋은 아침이에요, 전태영 사장님! ☀️</h2>
              <p className="text-blue-100 text-sm">오늘 답변 안 된 리뷰가 <span className="font-bold text-white">2개</span> 있어요. AI 답글 달아드릴까요?</p>
            </div>
            <span className="text-3xl">🤖</span>
          </div>
          <button className="mt-4 bg-white text-blue-600 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-blue-50 transition-colors">
            AI 답글 바로 달기 →
          </button>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className={`w-9 h-9 rounded-xl ${colorMap[stat.color]} flex items-center justify-center text-lg mb-3`}>
                {stat.icon}
              </div>
              <div className="text-xs text-gray-400 mb-1">{stat.label}</div>
              <div className="text-lg font-bold text-gray-900 leading-tight">{stat.value}</div>
              <div className={`text-xs font-semibold mt-1 ${stat.up ? 'text-blue-500' : 'text-red-400'}`}>
                {stat.up ? '↑' : '↓'} {stat.change}
              </div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {/* 최근 리뷰 */}
          <div className="md:col-span-2 bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">최근 리뷰</h3>
              <button className="text-sm text-blue-500 font-medium hover:underline">전체보기 →</button>
            </div>
            <div className="space-y-3">
              {reviews.map((review, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${review.platform === '네이버' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                        {review.platform}
                      </span>
                      <span className="text-sm font-semibold text-gray-800">{review.name}</span>
                      <span className="text-yellow-400 text-xs">{'★'.repeat(review.stars)}</span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{review.text}</p>
                    <span className="text-xs text-gray-400 mt-1 block">{review.time}</span>
                  </div>
                  {review.answered ? (
                    <span className="text-xs bg-gray-200 text-gray-500 px-2 py-1 rounded-lg font-medium whitespace-nowrap">답글 완료</span>
                  ) : (
                    <button className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-600 transition-colors whitespace-nowrap shadow-sm shadow-blue-200">
                      AI 답글
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 이번 주 현황 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">이번 주 현황</h3>
            <div className="space-y-3">
              {[
                { label: '리뷰 응답률', value: 85, color: 'bg-blue-500' },
                { label: '고객 재방문율', value: 62, color: 'bg-green-400' },
                { label: '매출 달성률', value: 78, color: 'bg-orange-400' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-600">{item.label}</span>
                    <span className="font-bold text-gray-900">{item.value}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-4 border-t border-gray-100">
              <div className="text-xs text-gray-400 mb-3">이번 달 AI 사용량</div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-gray-900">847</span>
                <span className="text-sm text-gray-400 pb-1">/ 1,000건</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: '84.7%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* 빠른 실행 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4">빠른 실행</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map(action => (
              <a
                key={action.label}
                href={action.href}
                className="flex flex-col items-center gap-2.5 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <span className={`w-11 h-11 rounded-xl ${action.color} flex items-center justify-center text-xl`}>
                  {action.icon}
                </span>
                <span className="text-sm font-medium text-gray-700 text-center">{action.label}</span>
              </a>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
