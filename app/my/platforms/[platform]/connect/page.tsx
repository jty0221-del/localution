'use client'

// app/my/platforms/[platform]/connect/page.tsx
// ============================================================
// 30차-22-C: 미니멀 로그인 스타일 리디자인 (2026-04-22)
//
//   STEP 1: 대리권 위임 동의 (3 체크박스) — 기존 유지, 상단 아이콘 업데이트
//   STEP 2: 미니멀 로그인 UI — 플랫폼 앱 로그인 화면 카피
//     · 상단 X 버튼
//     · 컬러 로고 아이콘
//     · "{플랫폼} 리뷰 관리를 위해 로그인이 필요해요" 타이틀
//     · ID / 비밀번호 입력
//     · 로그인 버튼 (풀너비, 파스텔 톤)
//     · "{플랫폼} 아이디, 비밀번호를 까먹었다면?" + 2 보조 버튼
//
//   API:
//     · /api/legal/platform-consent POST (STEP 1)
//     · /api/platform-accounts POST (STEP 2)
// ============================================================

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import PlatformLogo from '../../../../components/PlatformLogo'

export const dynamic = 'force-dynamic'

type PlatformSlug = 'naver_place' | 'baemin' | 'yogiyo' | 'coupangeats' | 'kakao_map'
const VALID_PLATFORMS: PlatformSlug[] = ['naver_place', 'baemin', 'yogiyo', 'coupangeats', 'kakao_map']

const PLATFORM_META: Record<PlatformSlug, {
  label: string                // 전체 이름
  shortLabel: string           // 타이틀용 짧은 이름 ("요기요" / "배민" / "쿠팡이츠" / "네이버")
  brandColor: string           // 로고 배경
  brandTextColor: string       // 로고 글자색 (대부분 white)
  initial: string              // 로고 아이콘 안 문자
  loginBg: string              // 로그인 버튼 배경 (파스텔 톤)
  loginFg: string              // 로그인 버튼 글자 (대부분 white)
  loginUrl: string
  forgotIdUrl: string          // "아이디 찾기" 실제 이동 URL (플랫폼 공식)
  forgotPwUrl: string          // "비밀번호 찾기" 실제 이동 URL
  singleForgot: boolean        // 배민처럼 한 버튼으로 통합할지
}> = {
  naver_place: {
    label: '네이버 플레이스',
    shortLabel: '네이버',
    brandColor: '#03C75A',
    brandTextColor: '#FFFFFF',
    initial: 'N',
    loginBg: '#03C75A',
    loginFg: '#FFFFFF',
    loginUrl: 'https://new.smartplace.naver.com/',
    forgotIdUrl: 'https://nid.naver.com/user2/helpmain.nhn',
    forgotPwUrl: 'https://nid.naver.com/nidreminder/info',
    singleForgot: false,
  },
  baemin: {
    label: '배달의민족',
    shortLabel: '배민',
    brandColor: '#2AC1BC',
    brandTextColor: '#FFFFFF',
    initial: '배',
    loginBg: '#E8E0FF',        // 이미지처럼 파스텔 라벤더
    loginFg: '#4C3D8F',
    loginUrl: 'https://ceo.baemin.com/',
    forgotIdUrl: 'https://ceo.baemin.com/',
    forgotPwUrl: 'https://ceo.baemin.com/',
    singleForgot: true,
  },
  yogiyo: {
    label: '요기요',
    shortLabel: '요기요',
    brandColor: '#FA0050',
    brandTextColor: '#FFFFFF',
    initial: '요',
    loginBg: '#E8E0FF',
    loginFg: '#4C3D8F',
    loginUrl: 'https://ceo.yogiyo.co.kr/',
    forgotIdUrl: 'https://ceo.yogiyo.co.kr/',
    forgotPwUrl: 'https://ceo.yogiyo.co.kr/',
    singleForgot: false,
  },
  coupangeats: {
    label: '쿠팡이츠',
    shortLabel: '쿠팡이츠',
    brandColor: '#FF4B30',
    brandTextColor: '#FFFFFF',
    initial: '쿠',
    loginBg: '#E8E0FF',
    loginFg: '#4C3D8F',
    loginUrl: 'https://store.coupangeats.com/',
    forgotIdUrl: 'https://store.coupangeats.com/',
    forgotPwUrl: 'https://store.coupangeats.com/',
    singleForgot: false,
  },
  kakao_map: {
    label: '카카오맵',
    shortLabel: '카카오',
    brandColor: '#FEE500',
    brandTextColor: '#191919',
    initial: '카',
    loginBg: '#FEE500',
    loginFg: '#191919',
    loginUrl: 'https://place.map.kakao.com/',
    forgotIdUrl: 'https://accounts.kakao.com/weblogin/find_account/email',
    forgotPwUrl: 'https://accounts.kakao.com/weblogin/find_password',
    singleForgot: false,
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
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)

  const [kakaoPlaceUrl, setKakaoPlaceUrl] = useState('')
  const [deliveryShopId, setDeliveryShopId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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
      setError(meta.shortLabel + ' 아이디를 입력해주세요.')
      return
    }
    if (!password) {
      setError(meta.shortLabel + ' 비밀번호를 입력해주세요.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      // kakao_map: place URL에서 숫자 ID 추출
      let kakaoPlaceId: string | undefined
      if (platform === 'kakao_map' && kakaoPlaceUrl.trim()) {
        const m = kakaoPlaceUrl.trim().match(/\/?(\d{6,})/)
        if (m) kakaoPlaceId = m[1]
      }
      const res = await fetch('/api/platform-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          account_id: accountId.trim(),
          password,
          ...(kakaoPlaceId ? { platform_store_id: kakaoPlaceId } : {}),
          ...(['baemin', 'yogiyo', 'coupangeats'].includes(platform) && deliveryShopId.trim()
            ? { platform_store_id: deliveryShopId.trim() }
            : {}),
        }),
      })
      const data = await res.json()
      if (!data.ok) {
        setError(data.message || data.error || 'save_failed')
        return
      }
      setSuccess(meta.label + ' 연결이 완료되었습니다.')
      setPassword('')
      setTimeout(() => router.push('/my/platforms'), 1100)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  // ── STEP 1: 법무 동의 (기존 디자인 유지) ─────────────
  if (step === 1) {
    return (
      <main className="min-h-screen bg-[#F9FAFB] py-10">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center gap-2 text-sm text-[#6B7280] mb-6">
            <Link href="/dashboard" className="hover:text-[#3182F6]">대시보드</Link>
            <span>/</span>
            <Link href="/my/platforms" className="hover:text-[#3182F6]">플랫폼 연결</Link>
            <span>/</span>
            <span className="text-[#191F28]">{meta.label}</span>
          </div>

          <div
            className="rounded-xl p-6 mb-6 border"
            style={{ background: meta.brandColor + '15', borderColor: meta.brandColor + '40' }}
          >
            <div className="flex items-center gap-3 mb-2">
              {/* 35차-4: 공통 PlatformLogo 로 교체 */}
              <PlatformLogo platform={platform} size={48} rounded={14} />
              <div>
                <div className="text-[11px] font-bold mb-0.5" style={{ color: meta.brandColor }}>
                  STEP 1 / 2
                </div>
                <h1 className="text-xl font-black text-[#191F28]">
                  {meta.label} 대리권 위임 동의
                </h1>
              </div>
            </div>
            <p className="text-xs text-[#4E5968] leading-relaxed mt-2">
              연결 전 아래 3가지 항목에 모두 동의해주세요. 동의 이력은 3년간 보관됩니다.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-[#FEF2F2] border border-[#FECACA] p-3 text-sm text-[#DC2626]">
              {error}
            </div>
          )}

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
                    하랑마케팅(이하 "회사")이 본인 {meta.label} 계정을 사용하여
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
        </div>
      </main>
    )
  }

  // ── STEP 2: 미니멀 로그인 UI ─────────────────────────
  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* 상단 바: X 버튼 */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="text-[11px] text-[#8B95A1]">
          STEP 2 / 2
        </div>
        <Link
          href="/my/platforms"
          aria-label="닫기"
          className="w-8 h-8 flex items-center justify-center text-[#191F28] text-2xl leading-none hover:bg-[#F2F4F6] rounded-lg"
        >
          ✕
        </Link>
      </div>

      {/* 본문 */}
      <div className="flex-1 max-w-sm w-full mx-auto px-6 pt-6 pb-8 flex flex-col">
        {/* 컬러 로고 아이콘 (35차-4: 공통 PlatformLogo) */}
        <div className="mb-8">
          <PlatformLogo platform={platform} size={56} rounded={14} />
        </div>

        {/* 타이틀 */}
        <h1 className="text-[22px] font-black text-[#191F28] leading-snug mb-10">
          {meta.shortLabel} 리뷰 관리를 위해<br />로그인이 필요해요
        </h1>

        {/* 에러/성공 메시지 */}
        {error && (
          <div className="mb-4 rounded-lg bg-[#FEF2F2] border border-[#FECACA] p-3 text-[13px] text-[#DC2626]">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] p-3 text-[13px] text-[#059669]">
            ✓ {success}
          </div>
        )}

        {/* ID 입력 */}
        <input
          type="text"
          autoComplete="off"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          placeholder={`${meta.shortLabel} 아이디`}
          className="w-full px-4 py-4 rounded-2xl bg-[#F5F6F8] border border-transparent text-[15px] placeholder-[#B0B8C1] focus:outline-none focus:border-[#191F28] focus:bg-white mb-3"
        />

        {/* 비밀번호 입력 */}
        <div className="relative mb-8">
          <input
            type={showPw ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={`${meta.shortLabel} 비밀번호`}
            className="w-full px-4 py-4 pr-12 rounded-2xl bg-[#F5F6F8] border border-transparent text-[15px] placeholder-[#B0B8C1] focus:outline-none focus:border-[#191F28] focus:bg-white"
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 표시'}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[#8B95A1] hover:text-[#191F28]"
          >
            {showPw ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </button>
        </div>

        {/* 카카오맵 전용: 플레이스 URL 입력 */}
        {platform === 'kakao_map' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-[#4E5968]">
              카카오맵 플레이스 URL <span className="text-[#8B95A1] font-normal">(선택 — 리뷰 수집에 필요)</span>
            </label>
            <input
              type="url"
              value={kakaoPlaceUrl}
              onChange={e => setKakaoPlaceUrl(e.target.value)}
              placeholder="https://place.map.kakao.com/1234567890"
              className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#FEE500] bg-white"
            />
            <p className="text-[11px] text-[#8B95A1]">카카오맵에서 내 매장 페이지 URL을 붙여넣으세요</p>
          </div>
        )}

        {/* 배민/요기요/쿠팡이츠: 가게 ID (선택) */}
        {['baemin', 'yogiyo', 'coupangeats'].includes(platform) && (
          <div className="flex flex-col gap-1.5 mb-6">
            <label className="text-[12px] font-semibold text-[#4E5968]">
              가게 ID <span className="text-[#8B95A1] font-normal">(선택 — URL의 숫자)</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={deliveryShopId}
              onChange={e => setDeliveryShopId(e.target.value.replace(/\D/g, ''))}
              placeholder="예: 14637452"
              className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#3182F6] bg-white"
            />
            <p className="text-[11px] text-[#8B95A1]">{meta.shortLabel} 사장님 포털 URL의 숫자 ID</p>
          </div>
        )}

        {/* 로그인 버튼 */}
        <button
          onClick={submitCredentials}
          disabled={saving || !accountId || !password}
          className="w-full py-4 rounded-2xl text-[15px] font-bold disabled:opacity-50 transition"
          style={{ background: meta.loginBg, color: meta.loginFg }}
        >
          {saving ? '암호화 저장 중…' : '로그인'}
        </button>

        {/* 스페이서 */}
        <div className="flex-1 min-h-[24px]" />

        {/* 비밀번호/아이디 찾기 */}
        <div className="mt-10">
          <p className="text-[13px] text-[#4E5968] mb-3">
            {meta.shortLabel} 아이디, 비밀번호를 까먹었다면?
          </p>
          <div className="flex gap-2">
            {meta.singleForgot ? (
              <a
                href={meta.forgotIdUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 rounded-xl border border-[#E5E8EB] text-[13px] font-semibold text-[#4E5968] text-center hover:bg-[#F9FAFB]"
              >
                아이디, 비밀번호 찾기 &nbsp;&gt;
              </a>
            ) : (
              <>
                <a
                  href={meta.forgotIdUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 rounded-xl border border-[#E5E8EB] text-[13px] font-semibold text-[#4E5968] text-center hover:bg-[#F9FAFB]"
                >
                  아이디 찾기 &nbsp;&gt;
                </a>
                <a
                  href={meta.forgotPwUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 rounded-xl border border-[#E5E8EB] text-[13px] font-semibold text-[#4E5968] text-center hover:bg-[#F9FAFB]"
                >
                  비밀번호 찾기 &nbsp;&gt;
                </a>
              </>
            )}
          </div>
        </div>

        {/* 하단 안전 안내 */}
        <div className="mt-6 text-[11px] text-[#8B95A1] leading-relaxed text-center">
          입력한 비밀번호는 즉시 AES-256-GCM 으로 암호화되어 저장돼요. 운영자도 평문 조회 불가 🔐
        </div>

        {consentId && (
          <div className="mt-3 text-center text-[10px] text-[#C3CAD1]">
            동의 기록 ID: {consentId.slice(0, 8)}…
          </div>
        )}
      </div>
    </main>
  )
}
