'use client'

import Link from 'next/link'
import {
  Send, ArrowLeft, Shield, RefreshCw, Clock,
  Smartphone, MousePointerClick, CheckCircle2, Zap,
  AlertTriangle, MessageSquare, Mail, ExternalLink, UserPlus,
} from 'lucide-react'

// 사전 등록 3단계 (Meta 개발 모드 제한 안내)
const PRE_STEPS = [
  {
    number: 1,
    icon: MessageSquare,
    title: '로컬루션 팀에 연락',
    desc: '본인의 Instagram 아이디(@username)를 로컬루션 팀에 알려주세요.',
    detail: 'Instagram 아이디 = Threads 아이디입니다. 카카오톡 채널 또는 이메일로 문의해주세요.',
  },
  {
    number: 2,
    icon: UserPlus,
    title: 'Meta 테스터 초대 수락',
    desc: '로컬루션 팀이 등록하면 Meta에서 초대 이메일이 발송됩니다.',
    detail: '이메일의 [초대 수락] 버튼을 클릭하거나, developers.facebook.com에 로그인 후 상단 알림에서 수락하세요.',
  },
  {
    number: 3,
    icon: CheckCircle2,
    title: '수락 완료 → 아래 단계 진행',
    desc: '초대 수락 후 아래 "연결 방법" 4단계를 따라 계정을 연결하세요.',
    detail: '수락 완료 전에 연결을 시도하면 Meta에서 "앱 접근 불가" 오류가 발생합니다.',
  },
]

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
              <p className="text-sm text-[#6B7280] mt-0.5">본인의 Threads 계정을 연결하면 AI 글을 바로 발행할 수 있습니다</p>
            </div>
          </div>
        </div>

        {/* ── 사전 등록 섹션 ── */}
        <div className="bg-[#FFFBEB] rounded-2xl border border-[#FCD34D] shadow-sm p-5 md:p-6 mb-3">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-[#F59E0B] to-[#EF4444] rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={15} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-sm font-black text-[#92400E]">사전 등록 필수 — 현재 베타 운영 중</p>
              <p className="text-xs text-[#B45309] mt-0.5">서비스 정식 오픈 전까지 사전 등록 사용자만 연결 가능합니다</p>
            </div>
          </div>

          <div className="space-y-3">
            {PRE_STEPS.map((step) => {
              const Icon = step.icon
              return (
                <div key={step.number} className="bg-white rounded-xl border border-[#FDE68A] p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#F59E0B] to-[#D97706] rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon size={14} className="text-white" strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-bold text-[#B45309] uppercase tracking-wider">사전 {step.number}단계</span>
                      </div>
                      <p className="text-sm font-bold text-[#111827] mb-1">{step.title}</p>
                      <p className="text-xs text-[#4E5968] leading-relaxed mb-1.5">{step.desc}</p>
                      <p className="text-xs text-[#6B7280] leading-relaxed bg-[#FFFBEB] rounded-lg px-2.5 py-1.5">
                        {step.detail}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 연락처 버튼 */}
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <a
              href="http://pf.kakao.com/_localution"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-[#FEE500] hover:bg-[#F5D800] text-[#111827] font-semibold py-2.5 px-4 rounded-xl transition-colors text-sm"
            >
              <MessageSquare size={15} strokeWidth={2.5} />
              카카오톡으로 등록 신청
              <ExternalLink size={12} strokeWidth={2} className="opacity-60" />
            </a>
            <a
              href="mailto:jty0221@gmail.com?subject=Threads 테스터 등록 신청&body=안녕하세요. Threads 연결 테스터 등록을 신청합니다.%0A%0AInstagram 아이디: @"
              className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-[#F9FAFB] text-[#374151] font-semibold py-2.5 px-4 rounded-xl border border-[#FCD34D] transition-colors text-sm"
            >
              <Mail size={15} strokeWidth={2.5} />
              이메일로 등록 신청
            </a>
          </div>
        </div>

        {/* 구분선 */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-[#E5E8EB]" />
          <span className="text-xs text-[#9CA3AF] font-medium">사전 등록 완료 후</span>
          <div className="flex-1 h-px bg-[#E5E8EB]" />
        </div>

        {/* 연결 방법 4단계 */}
        <div className="bg-[#EFF6FF] rounded-xl px-4 py-3 mb-4 text-sm text-[#1D4ED8]">
          테스터 초대를 수락한 뒤 아래 4단계로 연결하세요.
        </div>

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
                    <span className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider">Step {step.number}</span>
                    <h3 className="text-base font-bold text-[#111827] mt-0.5 mb-1.5">{step.title}</h3>
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

        {/* 연결 버튼 */}
        <div className="bg-white rounded-2xl border border-[#E5E8EB] shadow-sm p-6 md:p-8 mb-6">
          <p className="text-sm font-semibold text-[#111827] mb-1">테스터 초대를 수락하셨나요?</p>
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
