'use client'
export const dynamic = 'force-dynamic'

import Link from 'next/link'
import Sidebar from '../components/Sidebar'

const CARDS = [
  { href: '/settings',         icon: '🏪', title: '매장 기본 정보',  desc: '상호명, 주소, 전화번호, 영업시간을 설정하세요',    color: '#3182F6' },
  { href: '/settings',         icon: '🔗', title: '플랫폼 연동',     desc: '네이버·구글·카카오 등 리뷰 플랫폼을 연동하세요', color: '#8B5CF6' },
  { href: '/marketing/place',  icon: '📍', title: '플레이스 진단',   desc: '네이버 플레이스 노출 점수와 개선 방안을 확인하세요', color: '#059669' },
  { href: '/marketing/keyword-rank', icon: '🔍', title: '키워드 순위', desc: '내 매장이 몇 위에 노출되는지 확인하세요',     color: '#F59E0B' },
  { href: '/qr-admin',         icon: '📱', title: 'QR 리뷰 관리',   desc: 'QR 코드 생성 및 리뷰 현황을 관리하세요',          color: '#EA580C' },
  { href: '/customers',        icon: '👥', title: '고객 관리',       desc: '단골·VIP·신규 고객을 태그로 분류 관리하세요',     color: '#E11D48' },
]

export default function StorePage() {
  return (
    <div className="flex min-h-screen bg-[#F2F4F6]">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-[220px] p-4 pt-20 md:p-6 md:pt-6 min-w-0">

        <div className="mb-6">
          <h1 className="text-2xl font-black text-[#191F28]">매장 관리</h1>
          <p className="text-sm text-[#8B95A1] mt-0.5">매장 운영에 필요한 모든 기능을 한눈에</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CARDS.map(c => (
            <Link key={c.title} href={c.href}
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border border-transparent hover:border-[#E5E8EB] group">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4"
                style={{ background: c.color + '18' }}>
                {c.icon}
              </div>
              <h3 className="font-black text-[#191F28] mb-1 group-hover:text-[#3182F6] transition-colors">
                {c.title}
              </h3>
              <p className="text-sm text-[#8B95A1] leading-relaxed">{c.desc}</p>
            </Link>
          ))}
        </div>

        {/* 빠른 설정 링크 */}
        <div className="mt-6 bg-gradient-to-r from-[#1B3FD8] to-[#3182F6] rounded-2xl p-5 flex items-center justify-between">
          <div className="text-white">
            <div className="font-black text-base mb-0.5">매장 정보가 완성될수록 더 많은 고객이 찾아옵니다</div>
            <div className="text-white/70 text-xs">설정 완성도가 높을수록 AI가 더 정확한 답글을 생성해요</div>
          </div>
          <Link href="/settings" className="flex-shrink-0 bg-white text-[#3182F6] font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-colors shadow-sm">
            설정하기 →
          </Link>
        </div>
      </main>
    </div>
  )
}
