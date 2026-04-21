'use client'

// app/my/platforms/[platform]/connect/page.tsx
// ============================================================
// 23차-8d: 플랫폼 연결 폼 (2026-04-21)
//
//   · 2단계 플로우
//     Step 1: 대리권 위임 동의 — 3개 필수 체크박스
//     Step 2: 자격증명 입력 — account_id / password (+ optional store info)
//   · Step 1 통과 → POST /api/legal/platform-consent
//   · Step 2 통과 → POST /api/platform-accounts
//   · 완료 후 /my/platforms 로 복귀
// ============================================================
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'

type PlatformSlug = 'naver_place' | 'baemin' | 'yogiyo' | 'coupangeats'
const VALID_PLATFORMS: PlatformSlug[] = ['naver_place', 'baemin', 'yogiyo', 'coupangeats']

const PLATFORM_META: Record<PlatformSlug, {
  label: string
  brandColor: string
  bgColor: string
  loginUrl: string
  idFieldLabel: string
  idFieldPlaceholder: string
  storeLabel: string
}> = {
  naver_place: {
    label: '네이버 플레이스',
    brandColor: '#03C75A',
    bgColor: '#E6F7EF',
    loginUrl: 'https://new.smartplace.naver.com/',
    idFieldLabel: '네이버 ID',
    idFieldPlaceholder: '네이버 로그인 ID',
    storeLabel: '업체명',
  },
  baemin: {
    label: '배달의민족',
    brandColor: '#2AC1BC',
    bgColor: '#E0F7F6',
    loginUrl: 'https://ceo.baemin.com/',
    idFieldLabel: '배민 사장님 ID',
    idFieldPlaceholder: '배민 사장님 로그인 ID',
    storeLabel: '매장명',
  },
  yogiyo: {
    label: '요기요',
    brandColor: '#FA0050',
    bgColor: '#FFE5ED',
    loginUrl: 'https://ceo.yogiyo.co.kr/',
    idFieldLabel: '요기요 사장님 ID',
    idFieldPlaceholder: '요기요 사장님 로그인 ID',
    storeLabel: '매장명',
  },
  coupangeats: {
    label: '쿠팡이츠',
    brandColor: '#FF4B30',
    bgColor: '#FFE7E3',
    loginUrl: 'https://store.coupangeats.com/',
    idFieldLabel: '쿠팡이츠 ID',
    idFieldPlaceholder: '쿠팡이츠 사장님 로그인 ID',
    storeLabel: '매장명',
  },
}

export default function ConnectPlatformPage() {
  const router = useRouter()
  const params = useParams<{ platform: string }>()
  const platform = (params?.platform ?? '') as PlatformSlug
  const meta = PLATFORM_META[platform]

  const [step, setStep] = useState<1 | 2>(1)
  const [agreedScope, setAgreedScope] = useState(false)
  const [agreedOwnership, setAgreedOwnership] = useState(false)
  const [agreedRisk, setAgreedRisk] = useState(false)
  const [consentSaving, setConsentSaving] = useState(false)
  const [consentId, setConsentId] = useState<string | null>(null)

  const [accountId, setAccountId] = useState('')
  const [password, setPassword] = useState('')
  const [storeName, setStoreName] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // platform 슬러그 검증
  useEffect(() => {
    if (platform && !VALID_PLATFORMS.includes(platform)) {
      router.replace('/my/platforms')
    }
  }, [platform, router])

  if (!meta) {
    return (
      <main className="min-h-screen bg-[#F9FAFB] py-10">
        <div className="max-w-xl mx-auto px-4 text-center text-[#6B7280]">
          유효하지 않은 플랫폼입니다.
          <div className="mt-4">
            <Link href="/my/platforms" className="text-[#3182F6] hover:underline">← 플랫폼 허브로</Link>
          </div>
        </div>
      </main>
    )
  }

  const allAgreed = agreedScope && agreedOwnership && agreedRisk

  async function submitConsent() {
    if (!allAgreed) {
      setError('3개 항목 모두 동의해주세요.')
      return
    }
    setError(null)
    setConsentSaving(true)
    try {
      const res = await fetch('/api/legal/platform-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          agreed_scope: agreedScope,
          agreed_ownership: agreedOwnership,
          agreed_risk: agreedRisk,
          extra_payload: {
            ua_snapshot: typeof navigator !== 'undefined' ? navigator.userAgent : null,
            rendered_at: new Date().toISOString(),
          },
        }),
      })
      const data = await res.json()
      if (!data.ok) {
        setError(data.message || data.error || 'consent_failed')
        return
      }
      setConsentId(data.consent_id)
      setStep(2)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setConsentSaving(false)
    }
  }

  async function submitCredentials() {
    if (!accountId.trim()) {
      setError(meta.idFieldLabel + '을 입력해주세요.')
      return
    }
    if (!password) {
      setError('비밀번호를 입력해주세요.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/platform-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          account_id: accountId.trim(),
          password,
          platform_store_name: storeName.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!data.ok) {
        setError(data.message || data.error || 'save_failed')
        return
      }
      setSuccess(meta.label + ' 연결이 완료되었습니다.')
      setPassword('')
      // 1초 후 허브로 복귀
      setTimeout(() => router.push('/my/platforms'), 1200)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F9FAFB] py-10">
      <div className="max-w-2xl mx-auto px-4">
        {/* 브레드크럼 */}
        <div className="flex items-center gap-2 text-sm text-[#6B7280] mb-6">
          <Link href="/dashboard" className="hover:text-[#3182F6]">대시보드</Link>
          <span>/</span>
          <Link href="/my/platforms" className="hover:text-[#3182F6]">플랫폼 연결</Link>
          <span>/</span>
          <span className="text-[#191F28]">{meta.label}</span>
        </div>

        {/* 헤더 카드 */}
        <div
          className="rounded-xl p-6 mb-6 border"
          style={{ background: meta.bgColor, borderColor: meta.brandColor + '40' }}
        >
          <div className="text-xs font-medium mb-1" style={{ color: meta.brandColor }}>
            {step === 1 ? 'STEP 1 / 2' : 'STEP 2 / 2'}
          </div>
          <h1 className="text-2xl font-bold text-[#191F28] mb-1">
            {step === 1 ? `${meta.label} 대리권 위임 동의` : `${meta.label} 계정 정보 입력`}
          </h1>
          <p className="text-sm text-[#4E5968]">
            {step === 1
              ? '연결 전 아래 3가지 항목에 모두 동의해주세요. 동의 이력은 3년간 보관됩니다.'
              : '사장님 계정의 ID/비밀번호를 입력해주세요. 비밀번호는 AES-256-GCM 방식으로 암호화되어 저장됩니다.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-[#FEF2F2] border border-[#FECACA] p-3 text-sm text-[#DC2626]">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] p-3 text-sm text-[#059669]">
            ✓ {success}
          </div>
        )}

        {/* STEP 1: 동의 */}
        {step === 1 && (
          <div className="rounded-xl bg-white border border-[#E5E7EB] p-6">
            <div className="space-y-4 mb-6">
              <label className="flex gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedScope}
                  onChange={(e) => setAgreedScope(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-[#3182F6]"
                />
                <div className="flex-1">
                  <div className="font-medium text-[#191F28] mb-1">
                    ① 위임 범위에 동의합니다 <span className="text-[#DC2626]">*</span>
                  </div>
                  <div className="text-sm text-[#4E5968] leading-relaxed">
                    하랑마케팅(이하 "회사")이 내 본인 {meta.label} 계정을 사용하여
                    <strong className="text-[#191F28]"> (1) 리뷰 조회, (2) 리뷰에 답글 게시, (3) 매장 순위/통계 수집, (4) 로그인 상태 유지</strong>의
                    4개 업무만 대리 수행하는 것에 동의합니다. 그 외의 결제/정산/광고 집행/매장 정보 수정 등은 위임 범위에 포함되지 않습니다.
                  </div>
                </div>
              </label>

              <label className="flex gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedOwnership}
                  onChange={(e) => setAgreedOwnership(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-[#3182F6]"
                />
                <div className="flex-1">
                  <div className="font-medium text-[#191F28] mb-1">
                    ② 본인 계정임을 확인합니다 <span className="text-[#DC2626]">*</span>
                  </div>
                  <div className="text-sm text-[#4E5968] leading-relaxed">
                    연결하려는 {meta.label} 계정은 <strong className="text-[#191F28]">본인이 직접 소유·운영하는 사업자 계정</strong>이며,
                    제3자 명의 계정이 아님을 확인합니다. 타인 계정을 연결해 발생한 모든 민·형사상 책임은 본인이 부담합니다.
                  </div>
                </div>
              </label>

              <label className="flex gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedRisk}
                  onChange={(e) => setAgreedRisk(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-[#3182F6]"
                />
                <div className="flex-1">
                  <div className="font-medium text-[#191F28] mb-1">
                    ③ 플랫폼 자동화 정책 리스크를 인지합니다 <span className="text-[#DC2626]">*</span>
                  </div>
                  <div className="text-sm text-[#4E5968] leading-relaxed">
                    {meta.label}이 자동화 접근 정책을 변경할 경우 서비스가 <strong className="text-[#191F28]">예고 없이 일시 중단되거나 계정 제재를 받을 수 있다</strong>는 점을 인지하며,
                    이로 인한 간접손해에 대해 회사의 고의·중과실이 없는 한 책임을 묻지 않을 것에 동의합니다.
                  </div>
                </div>
              </label>
            </div>

            <div className="rounded-lg bg-[#F9FAFB] p-3 text-xs text-[#6B7280] mb-6 leading-relaxed">
              동의 즉시 IP 주소, User-Agent, 동의 일시, 동의 문서 버전이 증거 기록으로 저장되며, 3년간 보관 후 자동 파기됩니다.
              {' '}상세 내용은{' '}
              <Link href="/legal/platform-consent" className="text-[#3182F6] hover:underline">대리권 위임동의서 전문</Link>을 참고하세요.
            </div>

            <div className="flex gap-2">
              <Link
                href="/my/platforms"
                className="flex-1 text-center py-3 rounded-lg border border-[#E5E7EB] text-sm font-medium text-[#4E5968] hover:bg-[#F9FAFB]"
              >
                취소
              </Link>
              <button
                onClick={submitConsent}
                disabled={!allAgreed || consentSaving}
                className="flex-1 py-3 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{ background: meta.brandColor }}
              >
                {consentSaving ? '기록 중…' : '동의하고 다음으로'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: 자격증명 */}
        {step === 2 && (
          <div className="rounded-xl bg-white border border-[#E5E7EB] p-6">
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-[#191F28] mb-1.5">
                  {meta.idFieldLabel} <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  placeholder={meta.idFieldPlaceholder}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:border-[#3182F6]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#191F28] mb-1.5">
                  비밀번호 <span className="text-[#DC2626]">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호 입력"
                    className="w-full px-3 py-2.5 pr-16 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:border-[#3182F6]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#6B7280] hover:text-[#191F28] px-2 py-1"
                  >
                    {showPw ? '숨기기' : '표시'}
                  </button>
                </div>
                <div className="mt-1.5 text-xs text-[#6B7280]">
                  저장 즉시 AES-256-GCM 으로 암호화됩니다. 운영자도 평문 조회 불가.
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#191F28] mb-1.5">
                  {meta.storeLabel} <span className="text-[#9CA3AF]">(선택)</span>
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="예: 하랑마케팅 강남점"
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:border-[#3182F6]"
                />
              </div>
            </div>

            {/* 안내 */}
            <div className="rounded-lg bg-[#F9FAFB] p-3 text-xs text-[#6B7280] mb-6 leading-relaxed space-y-1">
              <div>· 본 화면에서 입력한 ID/비밀번호는 HTTPS 로만 전송됩니다</div>
              <div>· 연결 후 <a href={meta.loginUrl} target="_blank" rel="noopener" className="text-[#3182F6] hover:underline">{meta.loginUrl}</a> 에서 비밀번호가 변경되면 재연결이 필요합니다</div>
              <div>· 2단계 인증이 활성화되어 있으면 자동화가 중단됩니다 (연결 후 필요 시 해제 요청)</div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-lg border border-[#E5E7EB] text-sm font-medium text-[#4E5968] hover:bg-[#F9FAFB]"
              >
                뒤로
              </button>
              <button
                onClick={submitCredentials}
                disabled={saving}
                className="flex-1 py-3 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{ background: meta.brandColor }}
              >
                {saving ? '암호화 저장 중…' : '연결 완료'}
              </button>
            </div>

            {consentId && (
              <div className="mt-4 text-center text-xs text-[#9CA3AF]">
                동의 기록 ID: {consentId.slice(0, 8)}…
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
