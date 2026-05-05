'use client'

import Link from 'next/link'
import { Send, ArrowLeft, Shield, RefreshCw, Clock, Smartphone, MousePointerClick, CheckCircle2, Zap } from 'lucide-react'

const STEPS = [
  {
    number: 1,
    icon: Smartphone,
    title: 'Threads 계정 준비',
    desc: 'Threads 앱(iOS/Android)에서 본인 계정으로 로그인되어 있어야 합니다.',
    detail: 'Threads는 Instagram 계정으로 가입합니다. 아직 계정이 없다면 앱스토어에서 Threads를 설치하고 Instagram 계정으로 가입해주세요.',
    from: 'from-[#3B82F6]',
    to: 'to-[#6366F1]',
  },
  {
    number: 2,
    icon: MousePointerClick,
    title: '아래 버튼 클릭',
    desc: '"Threads 계정 연결하기" 버튼을 클릭하면 Meta 로그인 화면으로 이동합니다.',
    detail: 'Meta(Instagram/Threads)의 공식 OAuth 인증 화면이 열립니다. 본인의 Threads 계정으로 로그인하세요.',
    from: 'from-[#8B5CF6]',
    to: 'to-[#EC4899]',
  },
  {
    number: 3,
    icon: CheckCircle2,
    title: 'Meta 권한 허용',
    desc: 'Meta 화면에서 로컬루션이 요청하는 두 가지 권한을 허용해주세요.',
    detail: '· threads_basic — 계정 정보 조회\n· threads_content_publish — 게시물 발행\n두 권한 모두 허용해야 자동 발행이 가능합니다.',
    from: 'from-[#059669]',
    to: 'to-[#0EA5E9]',
  },
  {
    number: 4,
    icon: Zap,
    title: '연결 완료',
    desc: '권한 허용 후 자동으로 로컬루션으로 돌아옵니다. 이제 AI가 작성한 글을 Threads에 바로 발행하거나 예약 발행할 수 있습니다.',
    detail: '연결된 계정은 설정 페이지에서 언제든지 해제할 수 있습니다.',
    from: 'from-[#F59E0B]',
    to: 'to-[#EF4444]',
  },
]

export default function ThreadsConnectPage() {
  return (
    <div className="min-h-screen bg-[#F9FAFB] px-4 py-8">
      <div className="w-full max-w-2xl mx-auto">
        <Link
          href="/marketing/threads"
          className="inline-flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#111827] mb-8 transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          스레드 자동 발행으로 돌아가기
        </Link>

        {/* 헤더 카드 */}
        <div className="bg-white rounded-2xl border border-[#E5E8EB] shadow-sm p-6 md:p-8 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#111827] to-[#374151] rounded-xl flex items-center justify-center shadow-sm ring-1 ring-black/10 flex-shrink-0">
              <Send size={20} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-[#111827]">Threads 계정 연결 방법</h1>
              <p className="text-sm text-[#6B7280] mt-0.5">아래 4단계로 본인의 Threads 계정을 연결하세요</p>
            </div>
          </div>
          <div className="bg-[#EFF6FF] rounded-xl px-4 py-3 text-sm text-[#1D4ED8]">
            본인의 Threads 계정을 연결하면 로컬루션에서 작성한 게시물을 바로 발행할 수 있습니다.
          </div>
        </div>

        {/* 단계별 안내 */}
        <div className="space-y-4 mb-6">
          {STEPS.map((step) => {
            const Icon = step.icon
            return (
              <div key={step.number} className="bg-white rounded-2xl border border-[#E5E8EB] shadow-sm p-5 md:p-6">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 bg-gradient-to-br ${step.from} ${step.to} rounded-xl flex items-center justify-center shadow-sm ring-1 ring-black/5 flex-shrink-0 mt-0.5`}>
                    <Icon size={18} className="text-white" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider">Step {step.number}</span>
                    </div>
                    <h3 className="text-base font-bold text-[#111827] mb-1.5">{step.title}</h3>
                    <p className="text-sm text-[#4E5968] leading-relaxed mb-2">{step.desc}</p>
                    {step.detail && (
                      <p className="text-xs text-[#6B7280] leading-relaxed whitespace-pre-line bg-[#F9FAFB] rounded-lg px-3 py-2">
                        {step.detail}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* 연결 버튼 카드 */}
        <div className="bg-white rounded-2xl border border-[#E5E8EB] shadow-sm p-6 md:p-8 mb-6">
          <p className="text-sm font-semibold text-[#111827] mb-1">준비되셨나요?</p>
          <p className="text-sm text-[#6B7280] mb-5">버튼을 클릭하면 Meta 공식 로그인 화면으로 이동합니다.</p>
          <a
            href="/api/oauth/threads"
            className="flex items-center justify-center gap-2 w-full bg-[#111827] hover:bg-[#1F2937] text-white font-semibold py-3.5 px-6 rounded-xl transition-colors text-sm md:text-base"
          >
            <Send size={16} strokeWidth={2.5} />
            Threads 계정 연결하기
          </a>
        </div>

        {/* 보안 안내 */}
        <div className="bg-white rounded-2xl border border-[#E5E8EB] shadow-sm p-5 md:p-6">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">보안 안내</p>
          <div className="space-y-3">
            <div className="flex items-start gap-2.5 text-xs text-[#6B7280]">
              <Shield size={13} className="mt-0.5 flex-shrink-0 text-[#059669]" strokeWidth={2} />
              <span>연결 토큰은 AES-256-GCM 암호화 후 저장됩니다. 비밀번호는 로컬루션이 볼 수 없습니다.</span>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-[#6B7280]">
              <RefreshCw size={13} className="mt-0.5 flex-shrink-0 text-[#3B82F6]" strokeWidth={2} />
              <span>장기 토큰(60일)을 사용하며, 만료 7일 전 자동으로 갱신됩니다.</span>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-[#6B7280]">
              <Clock size={13} className="mt-0.5 flex-shrink-0 text-[#F59E0B]" strokeWidth={2} />
              <span>연결 후 언제든지 스레드 자동 발행 페이지에서 계정 연결을 해제할 수 있습니다.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
