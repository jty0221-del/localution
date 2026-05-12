'use client'

import Sidebar from '@/app/components/Sidebar'
import AutoReplySettings from '@/app/components/AutoReplySettings'
import Link from 'next/link'
import { ChevronLeft, ShoppingBag } from 'lucide-react'

export default function BaeminAutoReplyPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Sidebar />
      <div className="md:ml-[220px]">
        <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 space-y-4 md:space-y-6">
          <div>
            <Link href="/review-admin/baemin" className="inline-flex items-center gap-1 text-xs md:text-sm text-[#8B95A1] hover:text-[#191F28]">
              <ChevronLeft size={14} /> 배민 리뷰 관리
            </Link>
            <div className="flex items-center gap-3 mt-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2AC1BC] to-[#0E877F] shadow-sm flex items-center justify-center">
                <ShoppingBag size={20} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black text-[#191F28]">배민 AI 자동답글</h1>
                <p className="text-xs md:text-sm text-[#8B95A1]">4시간마다 미답변 리뷰에 AI 초안 자동 작성</p>
              </div>
            </div>
          </div>

          <AutoReplySettings platform="baemin" platformLabel="배민" />

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 md:p-5 text-xs md:text-sm text-amber-900">
            <div className="font-bold mb-1">배민 정책 안내</div>
            <ul className="space-y-1 list-disc list-inside">
              <li>30일 지난 리뷰는 답글 등록 불가 (배민 자체 제한)</li>
              <li>저장 쿠키로 직접 API 등록 (Worker fallback)</li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-[#E5E8EB] p-4 md:p-5">
            <div className="text-sm md:text-base font-bold text-[#191F28] mb-2">관련 페이지</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Link href="/review-admin/baemin" className="px-3 py-2.5 bg-[#F8F9FA] rounded-lg text-xs md:text-sm font-medium text-[#191F28] hover:bg-[#E5E8EB] transition">
                배민 리뷰 관리 →
              </Link>
              <Link href="/my/platforms/baemin/connect" className="px-3 py-2.5 bg-[#F8F9FA] rounded-lg text-xs md:text-sm font-medium text-[#191F28] hover:bg-[#E5E8EB] transition">
                배민 계정 연결 →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
