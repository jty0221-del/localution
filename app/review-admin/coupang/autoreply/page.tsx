'use client'

import Sidebar from '@/app/components/Sidebar'
import AutoReplySettings from '@/app/components/AutoReplySettings'
import Link from 'next/link'
import { ChevronLeft, ShoppingCart } from 'lucide-react'

export default function CoupangAutoReplyPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Sidebar />
      <div className="md:ml-[220px]">
        <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 space-y-4 md:space-y-6">
          <div>
            <Link href="/review-admin/coupang" className="inline-flex items-center gap-1 text-xs md:text-sm text-[#8B95A1] hover:text-[#191F28]">
              <ChevronLeft size={14} /> 쿠팡이츠 리뷰 관리
            </Link>
            <div className="flex items-center gap-3 mt-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF4B30] to-[#C02A15] shadow-sm flex items-center justify-center">
                <ShoppingCart size={20} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black text-[#191F28]">쿠팡이츠 AI 자동답글</h1>
                <p className="text-xs md:text-sm text-[#8B95A1]">4시간마다 미답변 리뷰에 AI 초안 자동 작성</p>
              </div>
            </div>
          </div>

          <AutoReplySettings platform="coupangeats" platformLabel="쿠팡이츠" />

          <div className="bg-white rounded-2xl border border-[#E5E8EB] p-4 md:p-5">
            <div className="text-sm md:text-base font-bold text-[#191F28] mb-2">관련 페이지</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Link href="/review-admin/coupang" className="px-3 py-2.5 bg-[#F8F9FA] rounded-lg text-xs md:text-sm font-medium text-[#191F28] hover:bg-[#E5E8EB] transition">
                쿠팡이츠 리뷰 관리 →
              </Link>
              <Link href="/my/platforms/coupangeats/connect" className="px-3 py-2.5 bg-[#F8F9FA] rounded-lg text-xs md:text-sm font-medium text-[#191F28] hover:bg-[#E5E8EB] transition">
                쿠팡이츠 계정 연결 →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
