'use client'

// ============================================================
// /review-admin/baemin — 배민 리뷰 관리 + 시스템 상태
// 78차: SystemHealthBar 헤더 상단 큰 배너 → 우측 하단 플로팅 + 모달 팝업
// ============================================================

import { useState, useEffect } from 'react'
import PlatformReviewAdmin, { PlatformConfig } from '../components/PlatformReviewAdmin'
import { Lock, RefreshCw, Settings, X, ShieldCheck, ShieldAlert, Trash2, Stethoscope } from 'lucide-react'

export const dynamic = 'force-dynamic'

function BaeminLogo() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <rect width="56" height="56" fill="#2DDDC8"/>
      <text x="28" y="36" textAnchor="middle" fontSize="22" fontWeight="900"
        fill="white" fontFamily="'Apple SD Gothic Neo','Noto Sans KR',sans-serif"
        letterSpacing="-0.5">배민</text>
    </svg>
  )
}

// ── 시스템 상태 (플로팅 + 모달) ─────────────────────────────
type HealthStatus = {
  proxy:  { ok: boolean; country?: string; ip?: string; error?: string }
  cookie: { ok: boolean; age_hours?: number; stale?: boolean; fix?: string }
  api:    { ok: boolean; status_code?: number; error?: string }
  creds:  { ok: boolean; account_id?: string; last_login?: string }
}

function SystemHealthFloating() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [checking, setChecking] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [cleanupLoading, setCleanupLoading] = useState(false)
  const [diagnoseLoading, setDiagnoseLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [open, setOpen] = useState(false)

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
      if (data.ok) { setMsg('로그인 성공 — 쿠키 갱신됨'); check() }
      else setMsg(data.error || '로그인 실패')
    } catch (e: any) { setMsg(e.message) }
    setLoginLoading(false)
  }

  async function cleanupAndRefetch() {
    if (!confirm('기존 배민 리뷰를 모두 삭제하고 다시 수집할까요?\n(잘못된 이미지/데이터 정리에 유용해요)')) return
    setCleanupLoading(true); setMsg('')
    try {
      const r1 = await fetch('/api/baemin/cleanup-reviews', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'all' }),
      })
      const d1 = await r1.json()
      if (!d1.ok) { setMsg(d1.error || '삭제 실패'); setCleanupLoading(false); return }

      // 즉시 재수집
      const r2 = await fetch('/api/baemin/collect-reviews', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days_back: 30 }),
      })
      const d2 = await r2.json()
      if (d2.ok) {
        setMsg('삭제 ' + d1.deleted + '건 → 재수집 ' + (d2.count ?? 0) + '건. 새로고침하세요.')
      } else {
        setMsg('삭제 ' + d1.deleted + '건 완료, 재수집은 큐 처리 중...')
      }
    } catch (e: any) { setMsg(e.message) }
    setCleanupLoading(false)
  }

  async function diagnose() {
    setDiagnoseLoading(true); setMsg('')
    try {
      const res = await fetch('/api/baemin/diagnose', { credentials: 'include' })
      const data = await res.json()
      if (!data.ok) { setMsg(data.error || '진단 실패'); setDiagnoseLoading(false); return }
      // 진단 결과를 새 탭에 JSON 으로 보여줌
      const w = window.open('', '_blank')
      if (w) {
        w.document.body.innerText = JSON.stringify(data, null, 2)
        w.document.body.style.cssText = 'font-family:monospace;font-size:12px;white-space:pre;padding:20px;'
        w.document.title = '배민 API 진단 결과'
      }
      setMsg('진단 결과를 새 탭에 열었어요')
    } catch (e: any) { setMsg(e.message) }
    setDiagnoseLoading(false)
  }

  useEffect(() => { check() }, [])

  if (!health) return null

  const allOk = health.proxy.ok && health.cookie.ok && health.api.ok

  // v1.2: 정상이어도 작은 칩은 항상 노출 (데이터 초기화/진단 접근용)
  return (
    <>
      {/* 플로팅 버튼 — 우측 하단, 작은 칩 형태 */}
      <button
        onClick={() => setOpen(true)}
        className={
          'fixed bottom-5 right-5 z-40 inline-flex items-center gap-1.5 px-3 py-2 rounded-full shadow-lg text-[11px] font-bold transition-all hover:scale-105 ' +
          (allOk
            ? 'bg-white text-[#059669] border border-[#A7F3D0]'
            : 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]')
        }
        title="배민 시스템 상태 확인"
      >
        {allOk
          ? <><ShieldCheck size={13} strokeWidth={2.5} /> 정상</>
          : <><ShieldAlert size={13} strokeWidth={2.5} /> 점검 필요</>}
      </button>

      {/* 모달 — 클릭시 상세 표시 */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#F2F4F6] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2DDDC8] to-[#1BC7B3] flex items-center justify-center shadow-sm">
                  <Settings size={15} className="text-white" strokeWidth={2.5} />
                </div>
                <span className="text-sm font-bold text-[#191F28]">배민 시스템 상태</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-[#8B95A1] hover:text-[#191F28]">
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <StatusRow
                label="한국 프록시"
                ok={health.proxy.ok}
                detail={health.proxy.ok
                  ? (health.proxy.country === 'KR' ? 'KR · ' + (health.proxy.ip || '연결됨') : (health.proxy.country || '연결됨'))
                  : '미설정'}
              />
              <StatusRow
                label="로그인 쿠키"
                ok={health.cookie.ok}
                detail={health.cookie.ok
                  ? (health.cookie.age_hours !== undefined ? health.cookie.age_hours + '시간 전 갱신' : '유효')
                  : '만료됨'}
              />
              <StatusRow
                label="배민 API"
                ok={health.api.ok}
                detail={health.api.ok ? '정상' : ('오류 ' + (health.api.status_code || ''))}
              />
              <StatusRow
                label="계정 연결"
                ok={health.creds.ok}
                detail={health.creds.ok ? (health.creds.account_id || '연결됨') : '미연결'}
              />

              {msg && (
                <p className={'text-xs font-medium px-3 py-2 rounded-lg ' +
                  (msg.includes('성공') ? 'bg-[#E8FFF0] text-[#059669]' : 'bg-[#FEF2F2] text-[#DC2626]')}>
                  {msg}
                </p>
              )}

              {!health.proxy.ok && (
                <p className="text-[11px] text-[#92400E] bg-[#FEF3C7] px-3 py-2 rounded-lg leading-relaxed">
                  Webshare/IPRoyal 등 한국 프록시 설정이 필요해요.
                  <a href="https://proxy.webshare.io" target="_blank" rel="noopener" className="ml-1 underline font-bold">무료 가입 ↗</a>
                </p>
              )}
              {!health.creds.ok && (
                <p className="text-[11px] text-[#92400E] bg-[#FEF3C7] px-3 py-2 rounded-lg leading-relaxed">
                  배민 계정이 연결되지 않았어요.
                  <a href="/my/platforms/baemin/connect" className="ml-1 underline font-bold">계정 연결 ↗</a>
                </p>
              )}
            </div>

            <div className="px-5 py-3 bg-[#F8F9FA] border-t border-[#F2F4F6] space-y-2">
              <div className="flex items-center gap-2">
                {!allOk && (
                  <button
                    onClick={autoLogin}
                    disabled={loginLoading}
                    className="flex-1 px-3 py-2 bg-[#2DDDC8] text-white rounded-xl font-bold text-xs disabled:opacity-60 hover:bg-[#1BC7B3] inline-flex items-center justify-center gap-1.5"
                  >
                    <Lock size={12} strokeWidth={2.5} />
                    {loginLoading ? '로그인 중...' : '자동 로그인'}
                  </button>
                )}
                <button
                  onClick={check}
                  disabled={checking}
                  className="flex-1 px-3 py-2 bg-white border border-[#E5E8EB] rounded-xl text-[#4E5968] font-bold text-xs disabled:opacity-60 hover:bg-[#F2F4F6] inline-flex items-center justify-center gap-1.5"
                >
                  <RefreshCw size={12} strokeWidth={2.5} className={checking ? 'animate-spin' : ''} />
                  {checking ? '확인 중...' : '재점검'}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={cleanupAndRefetch}
                  disabled={cleanupLoading}
                  className="flex-1 px-3 py-2 bg-white border border-[#FCA5A5] text-[#DC2626] rounded-xl font-bold text-xs disabled:opacity-60 hover:bg-[#FEF2F2] inline-flex items-center justify-center gap-1.5"
                  title="DB 의 모든 배민 리뷰 삭제 후 30일치 재수집"
                >
                  <Trash2 size={12} strokeWidth={2.5} />
                  {cleanupLoading ? '처리 중...' : '데이터 초기화 + 재수집'}
                </button>
                <button
                  onClick={diagnose}
                  disabled={diagnoseLoading}
                  className="flex-1 px-3 py-2 bg-white border border-[#A7F3D0] text-[#059669] rounded-xl font-bold text-xs disabled:opacity-60 hover:bg-[#ECFDF5] inline-flex items-center justify-center gap-1.5"
                  title="배민 API 응답 구조 확인 (디버깅용)"
                >
                  <Stethoscope size={12} strokeWidth={2.5} />
                  {diagnoseLoading ? '진단 중...' : 'API 진단'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function StatusRow({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-[#FAFBFF] rounded-lg">
      <div className="flex items-center gap-2">
        <span className={'w-2 h-2 rounded-full inline-block ' + (ok ? 'bg-[#12B76A]' : 'bg-[#F04452]')} />
        <span className="text-xs font-bold text-[#4E5968]">{label}</span>
      </div>
      <span className={'text-[11px] font-semibold ' + (ok ? 'text-[#059669]' : 'text-[#DC2626]')}>{detail}</span>
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
      <PlatformReviewAdmin config={CONFIG} />
      <SystemHealthFloating />
    </div>
  )
}
