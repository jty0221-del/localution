'use client'

import {} from 'react'
import Link from 'next/link'

const PLATFORMS = [
  { name: '네이버',     href: '/review-admin/naver',   color: '#03C75A', bg: '#E8F9EF', icon: 'N', total: 47, pending: 3, score: 4.8 },
  { name: '구글',       href: '/review-admin/google',  color: '#4285F4', bg: '#EEF3FE', icon: 'G', total: 23, pending: 1, score: 4.6 },
  { name: '카카오',     href: '/review-admin/kakao',   color: '#F59E0B', bg: '#FFFBEB', icon: 'K', total: 15, pending: 2, score: 4.7 },
  { name: '배달의민족', href: '/review-admin/baemin',  color: '#2AC1BC', bg: '#EFFFFE', icon: 'B', total: 31, pending: 5, score: 4.5 },
  { name: '요기요',     href: '/review-admin/yogiyo',  color: '#FA0050', bg: '#FFF1F3', icon: 'Y', total: 18, pending: 0, score: 4.4 },
  { name: '쿠팡이츠',   href: '/review-admin/coupang', color: '#FF4B30', bg: '#FFF4F2', icon: 'C', total: 12, pending: 1, score: 4.3 },
]

const RECENT_REVIEWS = [
  { platform: '네이버', name: '김**', rating: 5, text: '직원분들이 너무 친절하고 음식도 맛있어요. 다음에도 꼭 방문할게요!', time: '10분 전', replied: false },
  { platform: '배달의민족', name: '이**', rating: 4, text: '배달이 조금 늦었지만 음식 맛은 정말 좋았습니다.', time: '35분 전', replied: false },
  { platform: '구글', name: 'John L.', rating: 5, text: 'Amazing food and service! Will definitely come back.', time: '1시간 전', replied: true },
  { platform: '네이버', name: '박**', rating: 3, text: '그냥 평범한 것 같아요. 기대가 너무 컸나봐요.', time: '2시간 전', replied: false },
  { platform: '카카오', name: '최**', rating: 5, text: '사장님이 너무 친절하세요. 단골될 것 같아요 ㅎㅎ', time: '3시간 전', replied: true },
]

const PLATFORM_COLOR: Record<string, string> = {
  '네이버': '#03C75A', '구글': '#4285F4', '카카오': '#F59E0B',
  '배달의민족': '#2AC1BC', '요기요': '#FA0050', '쿠팡이츠': '#FF4B30',
}

export default function ReviewAdminPage() {

  const totalPending = PLATFORMS.reduce((a, p) => a + p.pending, 0)

  return (
    <>
        <div className="p-4 md:p-6 max-w-6xl mx-auto">

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-black text-[#191F28]">리뷰 관리</h1>
              <p className="text-sm text-[#8B95A1] mt-0.5">전체 플랫폼 리뷰 현황</p>
            </div>
            {totalPending > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-[#FFF9C4] border border-[#F59E0B] rounded-xl">
                <span className="text-sm">⚠️</span>
                <span className="text-sm font-semibold text-[#B45309]">미답변 {totalPending}개</span>
              </div>
            )}
          </div>

          {/* 플랫폼 카드 */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            {PLATFORMS.map(p => (
              <Link key={p.name} href={p.href}
                className="bg-white rounded-2xl shadow-sm border border-[#F2F4F6] p-4 hover:shadow-md transition-all hover:-translate-y-0.5">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black"
                    style={{ background: p.bg, color: p.color }}>{p.icon}</div>
                  <span className="text-sm font-semibold text-[#191F28]">{p.name}</span>
                </div>
                <p className="text-2xl font-black text-[#191F28]">{p.total}<span className="text-sm font-medium text-[#8B95A1] ml-1">개</span></p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-[#8B95A1]">⭐ {p.score}</span>
                  {p.pending > 0 && (
                    <span className="px-2 py-0.5 bg-[#FEE2E2] text-[#DC2626] text-xs font-bold rounded-full">
                      미답변 {p.pending}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {/* 최근 리뷰 */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#F2F4F6] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#F2F4F6] flex items-center justify-between">
              <h2 className="font-bold text-[#191F28] text-sm">최근 리뷰</h2>
              <span className="text-xs text-[#8B95A1]">실시간 업데이트</span>
            </div>
            {RECENT_REVIEWS.map((r, i) => (
              <div key={i} className="px-5 py-4 border-b border-[#F2F4F6] last:border-0 hover:bg-[#F8F9FA]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: PLATFORM_COLOR[r.platform] + '20', color: PLATFORM_COLOR[r.platform] }}>
                        {r.platform}
                      </span>
                      <span className="text-xs text-[#8B95A1]">{r.name}</span>
                      <span className="text-xs text-[#F59E0B]">{'★'.repeat(r.rating)}</span>
                      <span className="text-xs text-[#8B95A1] ml-auto">{r.time}</span>
                    </div>
                    <p className="text-sm text-[#4E5968] truncate">{r.text}</p>
                  </div>
                  <button className={"px-3 py-1.5 rounded-xl text-xs font-semibold flex-shrink-0 " + (r.replied ? "bg-[#F2F4F6] text-[#8B95A1]" : "bg-[#3182F6] text-white hover:bg-[#1a6fd6]")}>
                    {r.replied ? '답변완료' : 'AI 답글'}
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
  )
    </>
}
