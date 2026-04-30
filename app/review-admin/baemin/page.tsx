'use client'

// ============================================================
// /review-admin/baemin — 배민 리뷰 관리 + 시스템 상태
// ============================================================

import { useState, useEffect } from 'react'
import PlatformReviewAdmin, { PlatformConfig } from '../components/PlatformReviewAdmin'

export const dynamic = 'force-dynamic'

function BaeminLogo() {
  // 배달의민족 로고 — 민트 배경 + 흰색 "배민" 텍스트
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <rect width="56" height="56" fill="#2DDDC8"/>
      <text x="28" y="36" textAnchor="middle" fontSize="22" fontWeight="900"
        fill="white" fontFamily="'Apple SD Gothic Neo','Noto Sans KR',sans-serif"
        letterSpacing="-0.5">배민</text>
    </svg>
  )
}

// ── 시스템 상태 배지 ────────────────────────────────────────
type HealthStatus = {
  proxy:  { ok: boolean; country?: string; ip?: string; error?: string }
  cookie: { ok: boolean; age_hours?: number; stale?: boolean; fix?: string }
  api:    { ok: boolean; status_code?: number; error?: string }
  creds:  { ok: boolean; account_id?: string; last_login?: string }
}

function SystemHealthBar() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [checking, setChecking] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [msg, setMsg] = useState('')

  async function check() {
    setChecking(true); setMsg('')
    try {
      const res = await fetch('/api/admin/baemin-health', { credentials: 'include' })
      const data = await res.json()
      if (data.status) setHealth(data.status)
    } catch {}
    setChecking(false)
  }

  async function autoLogin() {
    setLoginLoading(true); setMsg('')
    try {
      const res = await fetch('/api/baemin/auto-login', { method: 'POST', credentials: 'include' })
      const data = await res.json()
      if (data.ok) { setMsg('✅ 로그인 성공! 쿠키 갱신됨'); check() }
      else setMsg('❌ ' + (data.error || '로그인 실패'))
    } catch (e: any) { setMsg('❌ ' + e.message) }
    setLoginLoading(false)
  }

  useEffect(() => { check() }, [])

  const dot = (ok: boolean | undefined) => ok
    ? <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
    : <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />

  if (!health) return (
    <div className="mb-4 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-2 text-xs text-gray-500">
      <span className="animate-spin">⚙</span> 시스템 상태 확인 중...
    </div>
  )

  const allOk = health.proxy.ok && health.cookie.ok && health.api.ok

  return (
    <div className={"mb-4 px-4 py-3 rounded-xl border text-xs " + (allOk ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200")}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-bold text-gray-700">시스템 상태</span>
          <span className="flex items-center gap-1">{dot(health.proxy.ok)} 프록시 {health.proxy.ok ? (health.proxy.country === 'KR' ? '🇰🇷 KR' : health.proxy.country) : '미설정'}</span>
          <span className="flex items-center gap-1">{dot(health.cookie.ok)} 쿠키 {health.cookie.ok ? (health.cookie.age_hours !== undefined ? health.cookie.age_hours + 'h 전' : '유효') : '만료'}</span>
          <span className="flex items-center gap-1">{dot(health.api.ok)} API {health.api.ok ? '정상' : (health.api.status_code || '오류')}</span>
        </div>
        <div className="flex items-center gap-2">
          {!allOk && (
            <button onClick={autoLogin} disabled={loginLoading}
              className="px-3 py-1.5 bg-[#2DDDC8] text-white rounded-lg font-bold text-[11px] disabled:opacity-60 hover:bg-[#1BC7B3]">
              {loginLoading ? '로그인 중...' : '🔐 자동 로그인'}
            </button>
          )}
          <button onClick={check} disabled={checking}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-600 font-medium text-[11px] disabled:opacity-60 hover:bg-gray-50">
            {checking ? '확인 중...' : '🔄 재점검'}
          </button>
        </div>
      </div>
      {msg && <p className={"mt-2 font-medium " + (msg.startsWith('✅') ? 'text-green-700' : 'text-red-600')}>{msg}</p>}
      {!health.proxy.ok && (
        <p className="mt-1 text-amber-700">
          ⚠️ 프록시 미설정 — Vercel/Railway에 WEBSHARE_API_KEY 추가 필요
          <a href="https://proxy.webshare.io" target="_blank" rel="noopener" className="ml-1 underline">Webshare 무료 가입 ↗</a>
        </p>
      )}
      {health.cookie.stale && (
        <p className="mt-1 text-amber-700">⚠️ 쿠키 만료 ({health.cookie.age_hours}시간 경과) — "자동 로그인" 버튼으로 갱신하세요</p>
      )}
      {!health.creds.ok && (
        <p className="mt-1 text-amber-700">⚠️ 배민 계정 미연결 —
          <a href="/my/platforms/baemin/connect" className="ml-1 underline">계정 연결 ↗</a>
        </p>
      )}
    </div>
  )
}

const CONFIG: PlatformConfig = {
  platform: 'baemin',
  uiKey: 'baemin',
  label: '배달의민족',
  color: '#2DDDC8',
  bg: '#E0FAF8',
  textColor: '#0A5E5A',
  icon: 'B',
  iconLetter: '배',
  logoNode: <BaeminLogo />,
  supportsFetch: true,
  collectEndpoint: '/api/baemin/collect-reviews',
  connectHref: '/my/platforms/baemin/connect',
  reviewAdminUrl: 'https://self.baemin.com/',
  platformInfoBanner: {
    title: '배달의민족 리뷰 자동 수집 중',
    desc: 'AI가 배민 감성에 맞는 친근한 답글을 자동으로 작성해드려요',
    links: [
      { label: '배민 사장님 리뷰 관리 ↗', href: 'https://self.baemin.com/', dark: true },
      { label: '배민 사장님광장 ↗', href: 'https://ceo.baemin.com/', dark: false },
    ],
  },
}

export default function BaeminReviewPage() {
  return (
    <div>
      <SystemHealthBar />
      <PlatformReviewAdmin config={CONFIG} />
    </div>
  )
}
