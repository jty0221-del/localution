'use client'

import Link from 'next/link'
import { Send, ArrowLeft, Shield, RefreshCw, Clock } from 'lucide-react'

export default function ThreadsConnectPage() {
  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link
          href="/marketing/threads"
          className="inline-flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#111827] mb-8 transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          스레드 자동 발행으로 돌아가기
        </Link>

        <div className="bg-white rounded-2xl border border-[#E5E8EB] shadow-sm p-8">
          {/* 아이콘 */}
          <div className="w-14 h-14 bg-gradient-to-br from-[#111827] to-[#374151] rounded-2xl flex items-center justify-center mb-6 shadow-sm ring-1 ring-black/10">
            <Send size={24} className="text-white" strokeWidth={2.5} />
          </div>

          <h1 className="text-xl font-black text-[#111827] mb-2">Threads 계정 연결</h1>
          <p className="text-sm text-[#4E5968] leading-relaxed mb-6">
            Meta 공식 API를 통해 스레드에 자동 발행합니다.
            연결 후 즉시 발행과 예약 발행 모두 사용할 수 있습니다.
          </p>

          {/* 필요 권한 */}
          <div className="bg-[#F9FAFB] rounded-xl p-4 mb-6 space-y-2">
            <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">필요 권한</p>
            <div className="flex items-center gap-2 text-sm text-[#374151]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#059669] flex-shrink-0" />
              threads_basic — 계정 정보 조회
            </div>
            <div className="flex items-center gap-2 text-sm text-[#374151]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#059669] flex-shrink-0" />
              threads_content_publish — 게시물 발행
            </div>
          </div>

          {/* 연결 버튼 */}
          <a
            href="/api/oauth/threads"
            className="flex items-center justify-center gap-2 w-full bg-[#111827] hover:bg-[#1F2937] text-white font-semibold py-3.5 px-6 rounded-xl transition-colors"
          >
            <Send size={16} strokeWidth={2.5} />
            Threads 계정으로 연결
          </a>

          {/* 안내 사항 */}
          <div className="mt-6 space-y-3">
            <div className="flex items-start gap-2.5 text-xs text-[#6B7280]">
              <Shield size={13} className="mt-0.5 flex-shrink-0" strokeWidth={2} />
              <span>토큰은 AES-256-GCM 암호화 후 저장됩니다.</span>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-[#6B7280]">
              <RefreshCw size={13} className="mt-0.5 flex-shrink-0" strokeWidth={2} />
              <span>장기 토큰(60일) 사용, 만료 7일 전 자동 갱신됩니다.</span>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-[#6B7280]">
              <Clock size={13} className="mt-0.5 flex-shrink-0" strokeWidth={2} />
              <span>연결 후 언제든지 설정에서 해제할 수 있습니다.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
