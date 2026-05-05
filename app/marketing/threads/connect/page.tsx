'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
 Send, ArrowLeft, Shield, RefreshCw, Clock,
 Smartphone, MousePointerClick, CheckCircle2, Zap,
 AlertTriangle, UserPlus, AtSign, Loader2, CircleCheck,
} from 'lucide-react'

const PRE_STEPS = [
 {
 number: 1,
 icon: AtSign,
 title: 'Instagram 아이디 신청',
 desc: '아래 신청 양식에 본인의 Instagram 아이디를 입력하고 신청하세요.',
 detail: 'Instagram 아이디 = Threads 아이디입니다. "@" 없이 입력하세요.',
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
 from: 'from-[#3B82F6]', to: 'to-[#6366F1]',
 },
 {
 number: 2,
 icon: MousePointerClick,
 title: '아래 버튼 클릭',
 desc: '"Threads 계정 연결하기" 버튼을 클릭하면 Meta 로그인 화면으로 이동합니다.',
 detail: 'Meta(Instagram/Threads)의 공식 OAuth 인증 화면이 열립니다. 본인의 Threads 계정으로 로그인하세요.',
 from: 'from-[#8B5CF6]', to: 'to-[#EC4899]',
 },
 {
 number: 3,
 icon: CheckCircle2,
 title: 'Meta 권한 허용',
 desc: 'Meta 화면에서 로컬루션이 요청하는 두 가지 권한을 허용해주세요.',
 detail: '· threads_basic — 계정 정보 조회\n· threads_content_publish — 게시물 발행\n두 권한 모두 허용해야 자동 발행이 가능합니다.',
 from: 'from-[#059669]', to: 'to-[#0EA5E9]',
 },
 {
 number: 4,
 icon: Zap,
 title: '연결 완료',
 desc: '권한 허용 후 자동으로 로컬루션으로 돌아옵니다. 이제 AI가 작성한 글을 Threads에 바로 발행하거나 예약 발행할 수 있습니다.',
 detail: '연결된 계정은 스레드 자동 발행 페이지에서 언제든지 해제할 수 있습니다.',
 from: 'from-[#F59E0B]', to: 'to-[#EF4444]',
 },
]

type RequestStatus = 'idle' | 'loading' | 'done' | 'already' | 'error'

export default function ThreadsConnectPage() {
 const [instagramId, setInstagramId] = useState('')
 const [storeName, setStoreName] = useState('')
 const [reqStatus, setReqStatus] = useState<RequestStatus>('idle')
 const [errMsg, setErrMsg] = useState('')
 const [alreadyMsg, setAlreadyMsg] = useState('')

 // 이미 신청한 경우 자동 확인
 useEffect(() => {
 fetch('/api/threads/request-tester')
 .then(r => r.json())
 .then(d => {
 if (d.request && d.request.status !== 'rejected') {
 setAlreadyMsg(
 d.request.status === 'done'
 ? '테스터 등록이 완료되었습니다. 아래 연결 단계를 진행해주세요.'
 : '신청이 접수되어 처리 중입니다. 완료 후 아래 단계를 진행해주세요.'
 )
 setReqStatus('already')
 }
 })
 .catch(() => {})
 }, [])

 async function handleSubmit(e: React.FormEvent) {
 e.preventDefault()
 if (!instagramId.trim()) return
 setReqStatus('loading')
 setErrMsg('')
 try {
 const res = await fetch('/api/threads/request-tester', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ instagram_id: instagramId.trim(), store_name: storeName.trim() }),
 })
 const data = await res.json()
 if (!res.ok || !data.ok) { setErrMsg(data.error || '신청 실패'); setReqStatus('error'); return }
 if (data.already) { setAlreadyMsg(data.message); setReqStatus('already'); return }
 setReqStatus('done')
 } catch {
 setErrMsg('네트워크 오류가 발생했습니다.')
 setReqStatus('error')
 }
 }

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

 {/* 헤더 */}
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
 <div className="flex items-center gap-2.5 mb-5">
 <div className="w-8 h-8 bg-gradient-to-br from-[#F59E0B] to-[#EF4444] rounded-lg flex items-center justify-center flex-shrink-0">
 <AlertTriangle size={15} className="text-white" strokeWidth={2.5} />
 </div>
 <div>
 <p className="text-sm font-black text-[#92400E]">사전 등록 필수 — 현재 베타 운영 중</p>
 <p className="text-xs text-[#B45309] mt-0.5">Meta 앱 검수 완료 전까지 사전 등록 사용자만 연결 가능합니다</p>
 </div>
 </div>

 {/* 단계 안내 */}
 <div className="space-y-3 mb-5">
 {PRE_STEPS.map((step) => {
 const Icon = step.icon
 return (
 <div key={step.number} className="bg-white rounded-xl border border-[#FDE68A] p-4">
 <div className="flex items-start gap-3">
 <div className="w-7 h-7 bg-gradient-to-br from-[#F59E0B] to-[#D97706] rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
 <Icon size={13} className="text-white" strokeWidth={2.5} />
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-[10px] font-bold text-[#B45309] uppercase tracking-wider mb-0.5">사전 {step.number}단계</p>
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

 {/* 신청 폼 */}
 {reqStatus === 'done' ? (
 <div className="bg-white rounded-xl border border-[#BBF7D0] p-4 flex items-start gap-3">
 <div className="w-8 h-8 bg-gradient-to-br from-[#059669] to-[#0EA5E9] rounded-lg flex items-center justify-center flex-shrink-0">
 <CircleCheck size={16} className="text-white" strokeWidth={2.5} />
 </div>
 <div>
 <p className="text-sm font-bold text-[#065F46]">신청이 접수되었습니다</p>
 <p className="text-xs text-[#047857] mt-1 leading-relaxed">
 로컬루션 팀이 1-2 영업일 내 Meta 테스터로 등록해드립니다.
 Meta 이메일 초대를 수락한 후 아래 단계를 진행해주세요.
 </p>
 </div>
 </div>
 ) : reqStatus === 'already' ? (
 <div className="bg-white rounded-xl border border-[#BFDBFE] p-4 flex items-start gap-3">
 <div className="w-8 h-8 bg-gradient-to-br from-[#3B82F6] to-[#6366F1] rounded-lg flex items-center justify-center flex-shrink-0">
 <CircleCheck size={16} className="text-white" strokeWidth={2.5} />
 </div>
 <div>
 <p className="text-sm font-bold text-[#1E40AF]">신청 확인됨</p>
 <p className="text-xs text-[#1D4ED8] mt-1 leading-relaxed">{alreadyMsg}</p>
 </div>
 </div>
 ) : (
 <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[#FDE68A] p-4 space-y-3">
 <p className="text-xs font-bold text-[#92400E] mb-1">테스터 등록 신청</p>
 <div>
 <label className="text-xs font-medium text-[#374151] mb-1.5 block">
 Instagram 아이디 <span className="text-[#EF4444]">*</span>
 </label>
 <div className="relative">
 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] text-sm font-medium">@</span>
 <input
 type="text"
 value={instagramId}
 onChange={e => setInstagramId(e.target.value)}
 placeholder="instagram_username"
 className="w-full pl-7 pr-3 py-2.5 text-sm border border-[#E5E8EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/40 focus:border-[#F59E0B] bg-[#F9FAFB]"
 required
 />
 </div>
 </div>
 <div>
 <label className="text-xs font-medium text-[#374151] mb-1.5 block">업체명 (선택)</label>
 <input
 type="text"
 value={storeName}
 onChange={e => setStoreName(e.target.value)}
 placeholder="예: 홍길동 카페"
 className="w-full px-3 py-2.5 text-sm border border-[#E5E8EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/40 focus:border-[#F59E0B] bg-[#F9FAFB]"
 />
 </div>
 {reqStatus === 'error' && (
 <p className="text-xs text-[#EF4444]">{errMsg}</p>
 )}
 <button
 type="submit"
 disabled={!instagramId.trim() || reqStatus === 'loading'}
 className="w-full flex items-center justify-center gap-2 bg-[#F59E0B] hover:bg-[#D97706] disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm"
 >
 {reqStatus === 'loading' ? (
 <Loader2 size={15} className="animate-spin" strokeWidth={2.5} />
 ) : (
 <UserPlus size={15} strokeWidth={2.5} />
 )}
 {reqStatus === 'loading' ? '신청 중...' : '테스터 등록 신청하기'}
 </button>
 </form>
 )}
 </div>

 {/* 구분선 */}
 <div className="flex items-center gap-3 my-6">
 <div className="flex-1 h-px bg-[#E5E8EB]" />
 <span className="text-xs text-[#9CA3AF] font-medium">사전 등록 완료 후</span>
 <div className="flex-1 h-px bg-[#E5E8EB]" />
 </div>

 <div className="bg-[#EFF6FF] rounded-xl px-4 py-3 mb-4 text-sm text-[#1D4ED8]">
 Meta 초대를 수락한 뒤 아래 4단계로 본인 Threads 계정을 연결하세요.
 </div>

 {/* 연결 방법 4단계 */}
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
