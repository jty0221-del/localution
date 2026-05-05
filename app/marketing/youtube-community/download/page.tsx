'use client'

import {
  Youtube,
  Download,
  Monitor,
  Chrome,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Shield,
  Cpu,
  HardDrive,
} from 'lucide-react'
import Sidebar from '../../../components/Sidebar'
import PageHeader from '../../../components/PageHeader'
import Footer from '../../../components/Footer'
import Link from 'next/link'

const AGENT_VERSION = 'v1.0.0'
const AGENT_FILENAME = 'yt_community_agent.exe'
const AGENT_DOWNLOAD_PATH = '/downloads/' + AGENT_FILENAME

const STEPS = [
  {
    step: '1',
    title: '파일 다운로드',
    desc: '아래 버튼을 클릭해 yt_community_agent.exe 를 PC에 저장하세요.',
  },
  {
    step: '2',
    title: 'exe 파일 실행',
    desc: '저장된 파일을 더블클릭하세요. 터미널 창이 열리면 정상입니다. 창을 닫지 마세요.',
  },
  {
    step: '3',
    title: '업로드 페이지 열기',
    desc: '유튜브 커뮤니티 업로드 페이지로 이동하면 "에이전트 연결됨" 초록 표시를 확인할 수 있습니다.',
  },
]

const FAQS = [
  {
    q: '"Windows의 PC 보호" 경고가 뜨면 어떻게 하나요?',
    a: '"추가 정보" 클릭 후 "실행" 버튼을 누르세요. 공개 서명이 없는 로컬 에이전트이므로 Windows Defender가 경고를 표시하지만 안전합니다.',
  },
  {
    q: '에이전트를 실행했는데 "미연결"로 나와요.',
    a: '터미널 창에 "Running on http://127.0.0.1:7777" 문구가 보이면 정상 실행 중입니다. 브라우저 페이지를 새로고침하거나 "재확인" 버튼을 눌러보세요.',
  },
  {
    q: '크롬 브라우저가 필요한가요?',
    a: '네, 에이전트는 크롬(Chrome) 브라우저를 자동으로 제어합니다. 미리 크롬에 유튜브 계정이 로그인되어 있어야 합니다.',
  },
  {
    q: '에이전트를 종료하려면?',
    a: '터미널 창을 닫거나 Ctrl+C 를 누르면 에이전트가 종료됩니다.',
  },
]

export default function AgentDownloadPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Sidebar />

      <div className="md:ml-[220px] flex flex-col min-h-screen">
        <PageHeader
          variant="youtube"
          icon={<Download size={28} className="text-white" strokeWidth={2.5} />}
          title="에이전트 다운로드"
          subtitle="유튜브 커뮤니티 자동 업로드를 위한 로컬 에이전트 · Windows 전용"
        />

        <main className="flex-1 px-4 md:px-6 py-6 max-w-4xl mx-auto w-full space-y-5">

          {/* 다운로드 카드 */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E8EB] p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center flex-shrink-0">
                    <Youtube size={15} className="text-white" strokeWidth={2.5} />
                  </div>
                  <span className="text-base font-black text-[#191F28]">yt_community_agent.exe</span>
                  <span className="text-[11px] font-semibold bg-[#F2F4F6] text-[#8B95A1] px-2 py-0.5 rounded-full">{AGENT_VERSION}</span>
                </div>
                <p className="text-sm text-[#4E5968] mt-1">
                  유튜브 커뮤니티 탭 자동 게시 · 댓글 작성 · 댓글 고정
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  <span className="flex items-center gap-1.5 text-xs text-[#8B95A1]">
                    <Monitor size={12} strokeWidth={2.5} />
                    Windows 10 / 11
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-[#8B95A1]">
                    <Chrome size={12} strokeWidth={2.5} />
                    Chrome 필요
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-[#8B95A1]">
                    <Shield size={12} strokeWidth={2.5} />
                    내 PC에서만 실행
                  </span>
                </div>
              </div>
              <a
                href={AGENT_DOWNLOAD_PATH}
                download={AGENT_FILENAME}
                className="flex-shrink-0 flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-black px-6 py-3 rounded-2xl shadow-sm hover:shadow-md hover:from-red-600 hover:to-red-700 active:scale-[0.98] transition-all"
              >
                <Download size={16} strokeWidth={2.5} />
                다운로드
              </a>
            </div>
          </div>

          {/* 시스템 요구사항 */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E8EB] p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#3182F6] to-[#1B64DA] flex items-center justify-center flex-shrink-0">
                <Cpu size={13} className="text-white" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-bold text-[#191F28]">시스템 요구사항</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { icon: <Monitor size={14} strokeWidth={2.5} />, label: '운영체제', value: 'Windows 10 / 11 (64bit)' },
                { icon: <Chrome size={14} strokeWidth={2.5} />, label: '브라우저', value: 'Chrome (유튜브 로그인 필수)' },
                { icon: <HardDrive size={14} strokeWidth={2.5} />, label: '저장공간', value: '약 50MB 이상' },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F8F9FA]">
                  <span className="text-[#8B95A1] mt-0.5 flex-shrink-0">{icon}</span>
                  <div>
                    <p className="text-[11px] text-[#8B95A1] font-semibold">{label}</p>
                    <p className="text-xs text-[#191F28] font-semibold mt-0.5">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 설치 및 실행 방법 */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E8EB] p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center flex-shrink-0">
                <ChevronRight size={14} className="text-white" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-bold text-[#191F28]">설치 및 실행 방법</span>
            </div>
            <div className="space-y-4">
              {STEPS.map(({ step, title, desc }) => (
                <div key={step} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#FF0000] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{step}</span>
                  <div>
                    <p className="text-sm font-semibold text-[#191F28]">{title}</p>
                    <p className="text-xs text-[#8B95A1] mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E8EB] p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center flex-shrink-0">
                <AlertCircle size={13} className="text-white" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-bold text-[#191F28]">자주 묻는 질문</span>
            </div>
            <div className="space-y-4">
              {FAQS.map(({ q, a }) => (
                <div key={q} className="pb-4 border-b border-[#F2F4F6] last:border-0 last:pb-0">
                  <div className="flex items-start gap-2 mb-1.5">
                    <CheckCircle2 size={13} className="text-[#3182F6] flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                    <p className="text-xs font-bold text-[#191F28]">{q}</p>
                  </div>
                  <p className="text-xs text-[#4E5968] leading-relaxed pl-5">{a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 업로드 페이지 이동 버튼 */}
          <div className="flex justify-center pb-4">
            <Link
              href="/marketing/youtube-community"
              className="flex items-center gap-2 text-sm font-semibold text-[#8B95A1] hover:text-[#191F28] transition-colors"
            >
              <Youtube size={14} strokeWidth={2.5} />
              커뮤니티 업로드 페이지로 이동
              <ChevronRight size={13} strokeWidth={2.5} />
            </Link>
          </div>

        </main>

        <Footer />
      </div>
    </div>
  )
}
