'use client'

// ============================================================
// 30차-22 · /review-admin/naver — 공통 컴포넌트 사용 wrapper
// v33: 비번 변경/계정 잠금 감지 배너 추가
// ============================================================

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import PlatformReviewAdmin, { PlatformConfig } from '../components/PlatformReviewAdmin'

export const dynamic = 'force-dynamic'

type CredStatus = {
  needs_re_register?: boolean
  needs_attention?: boolean
  last_login_status?: string | null
  last_login_at?: string | null
}

function CredentialsAlert() {
  const [status, setStatus] = useState<CredStatus | null>(null)
  useEffect(() => {
    let ignore = false
    fetch('/api/platform-accounts').then(r => r.json()).then(j => {
      if (ignore || !j?.ok) return
      const naver = (j.accounts || []).find((a: any) => a.platform === 'naver_place')
      if (naver) setStatus(naver)
    }).catch(() => null)
    return () => { ignore = true }
  }, [])

  if (!status?.needs_attention) return null

  if (status.needs_re_register) {
    return (
      <div className="mx-4 mt-3 p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA]">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🔐</span>
          <div className="flex-1">
            <div className="font-bold text-[#991B1B] text-[14px] mb-1">비밀번호 변경 감지 — 재등록 필요</div>
            <div className="text-[12px] text-[#7F1D1D] leading-relaxed mb-3">
              네이버 비밀번호가 변경되었거나 잘못된 정보입니다. 새 비밀번호로 다시 등록해야 답글 자동 발행이 정상 작동해요.
            </div>
            <Link
              href="/my/platforms/naver_place/connect"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#DC2626] text-white text-[12px] font-bold hover:bg-[#B91C1C]"
            >
              새 비밀번호로 재등록 →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-4 mt-3 p-4 rounded-xl bg-[#FFF7ED] border border-[#FED7AA]">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#FED7AA] flex items-center justify-center flex-shrink-0">
          <AlertTriangle size={18} className="text-[#9A3412]" strokeWidth={2.5} />
        </div>
        <div className="flex-1">
          <div className="font-bold text-[#9A3412] text-[14px] mb-1">계정 보안 잠금 감지</div>
          <div className="text-[12px] text-[#7C2D12] leading-relaxed mb-3">
            네이버가 자동화 보호조치를 적용했어요. 시크릿 모드에서 직접 로그인해 본인 인증을 완료한 후, 비번이 바뀌었으면 새 비번으로 재등록해주세요.
          </div>
          <div className="flex gap-2">
            <a
              href="https://nid.naver.com/nidlogin.login"
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0EA5E9] text-white text-[12px] font-bold hover:bg-[#0284C7]"
            >
              네이버 직접 로그인 ↗
            </a>
            <Link
              href="/my/platforms/naver_place/connect"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#F97316] text-white text-[12px] font-bold hover:bg-[#EA580C]"
            >
              재등록
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function NaverLogo() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <rect width="64" height="64" rx="14" fill="#03C75A"/>
      <path d="M13 51V13h10.5L40 38.5V13H51v38H40.5L24 25.5V51H13Z" fill="white"/>
    </svg>
  )
}

const CONFIG: PlatformConfig = {
  platform: 'naver_place',
  uiKey: 'naver',
  label: '네이버 플레이스',
  color: '#03C75A',
  bg: '#E8FBF0',
  textColor: '#015C2C',
  icon: 'N',
  iconLetter: 'N',
  logoNode: <NaverLogo />,
  supportsFetch: true,
  connectHref: '/my/platforms/naver_place/connect',
  reviewAdminUrl: 'https://smartplace.naver.com/',
}

export default function NaverReviewPage() {
  return (
    <>
      <CredentialsAlert />
      <div className="flex justify-end px-4 pt-2">
        <Link
          href="/review-admin/naver-health"
          className="inline-flex items-center gap-1.5 text-[11px] text-[#64748B] hover:text-[#03C75A] transition"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
          시스템 진단
        </Link>
      </div>
      <PlatformReviewAdmin config={CONFIG} />
    </>
  )
}
