// app/review-admin/kakao/autoreply/page.tsx
// ============================================================
// v38: 카카오맵 자동답글 설정 페이지 (모바일 최적화)
// ============================================================
'use client'

import Sidebar from '@/app/components/Sidebar'
import AutoReplySettings from '@/app/components/AutoReplySettings'
import Link from 'next/link'
import { ChevronLeft, MessageSquare } from 'lucide-react'

export default function KakaoAutoReplyPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Sidebar />
      <div className="md:ml-[220px]">
        <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 space-y-4 md:space-y-6">
          {/* 헤더 */}
          <div>
            <Link href="/review-admin/kakao" className="inline-flex items-center gap-1 text-xs md:text-sm text-[#8B95A1] hover:text-[#191F28]">
              <ChevronLeft size={14} /> 카카오맵 리뷰 관리
            </Link>
            <div className="flex items-center gap-3 mt-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FEE500] to-[#F0C600] shadow-sm flex items-center justify-center">
                <MessageSquare size={20} className="text-[#3C1E1E]" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black text-[#191F28]">카카오맵 AI 자동답글</h1>
                <p className="text-xs md:text-sm text-[#8B95A1]">4시간마다 카카오 감성 답글 자동 작성</p>
              </div>
            </div>
          </div>

          <AutoReplySettings platform="kakao_map" platformLabel="카카오맵" />

          {/* 안내 */}
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl border border-amber-200 p-4 md:p-5">
            <div className="text-sm md:text-base font-bold text-amber-900 mb-2">카카오맵 답글 발행 방식</div>
            <ul className="text-xs md:text-sm text-amber-900 space-y-1.5 list-disc list-inside">
              <li>AI 초안 생성: 4시간마다 자동 (02:15 / 08:15 / 14:15 / 20:15 KST)</li>
              <li>비즈니스 미연결: AI 초안 → 사장님 1버튼 클릭 → 클립보드 복사 + 카카오맵 새 탭 → 붙여넣기</li>
              <li>비즈니스 연결: 워커가 자동으로 place.map.kakao.com 에 답글 등록</li>
              <li>250자 이내 권장 (네이버 silent reject 학습 기반)</li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-[#E5E8EB] p-4 md:p-5">
            <div className="text-sm md:text-base font-bold text-[#191F28] mb-2">관련 페이지</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Link href="/review-admin/kakao" className="px-3 py-2.5 bg-[#F8F9FA] rounded-lg text-xs md:text-sm font-medium text-[#191F28] hover:bg-[#E5E8EB] transition">
                카카오맵 리뷰 관리 →
              </Link>
              <Link href="/my/platforms/kakao_map/connect" className="px-3 py-2.5 bg-[#F8F9FA] rounded-lg text-xs md:text-sm font-medium text-[#191F28] hover:bg-[#E5E8EB] transition">
                카카오맵 계정 연결 →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
