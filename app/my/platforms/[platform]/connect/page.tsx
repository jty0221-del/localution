'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'

export const dynamic = 'force-dynamic'

type PlatformSlug = 'naver_place' | 'baemin' | 'yogiyo' | 'coupangeats' | 'kakao_map'
const VALID_PLATFORMS: PlatformSlug[] = ['naver_place', 'baemin', 'yogiyo', 'coupangeats', 'kakao_map']

const PLATFORM_META: Record<PlatformSlug, {
  label: string
  shortLabel: string
  brandColor: string
  brandTextColor: string
  initial: string
  loginBg: string
  loginFg: string
  loginUrl: string
  forgotIdUrl: string
  forgotPwUrl: string
  singleForgot: boolean
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
    loginBg: '#E8E0FF',
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

type FoundStore = { placeId: string; name: string; desc: string; url: string }

export default function ConnectPlatformPage() {
  const router = useRouter()
  const params = useParams<{ platform: string }>()
  const platform = (params?.platform ?? '') as PlatformSlug
  const meta = PLATFORM_META[platform]

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [agreedScope, setAgreedScope] = useState(false)
  const [agreedOwnership, setAgreedOwnership] = useState(false)
  const [agreedRisk, setAgreedRisk] = useState(false)
  const [consentSaving, setConsentSaving] = useState(false)
  const [consentId, setConsentId] = useState<string | null>(null)

  const [accountId, setAccountId] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)

  // STEP 3: 매장 찾기 (naver_place 전용)
  const [storeQuery, setStoreQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<FoundStore[]>([])
  const [selectedStore, setSelectedStore] = useState<FoundStore | null>(null)
  const [savingStore, setSavingStore] = useState(false)

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
    if (!allAgreed) { setError('3개 항목 모두 동의해주세요.'); return }
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
      if (!data.ok) { setError(data.message || data.error || 'consent_failed'); return }
      setConsentId(data.consent_id)
      setStep(2)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setConsentSaving(false)
    }
  }

  async function submitCredentials() {
    if (!accountId.trim()) { setError(meta.shortLabel + ' 아이디를 입력해주세요.'); return }
    if (!password) { setError(meta.shortLabel + ' 비밀번호를 입력해주세요.'); return }
    setError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/platform-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, account_id: accountId.trim(), password }),
      })
      const data = await res.json()
      if (!data.ok) { setError(data.message || data.error || 'save_failed'); return }
      setPassword('')
      if (platform === 'naver_place') {
        // 네이버는 STEP 3에서 매장 ID를 추가로 설정
        setStep(3)
      } else {
        setSuccess(meta.label + ' 연결이 완료되었습니다.')
        setTimeout(() => router.push('/my/platforms'), 1100)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  // STEP 3: URL 또는 매장명으로 플레이스 ID 검색
  async function searchStore() {
    if (!storeQuery.trim()) { setError('매장명 또는 네이버 플레이스 URL을 입력해주세요.'); return }
    setError(null)
    setSearching(true)
    setSearchResults([])
    setSelectedStore(null)
    try {
      // URL이면 verify, 텍스트면 search
      const isUrl = storeQuery.trim().startsWith('http')
      const res = await fetch('/api/platforms/naver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isUrl
            ? { action: 'verify', input: storeQuery.trim() }
            : { action: 'search', query: storeQuery.trim() }
        ),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || '검색 실패'); return }
      if (isUrl && data.placeId) {
        setSearchResults([{ placeId: data.placeId, name: data.name || '', desc: data.desc || '', url: data.url || '' }])
      } else if (data.items) {
        const items: FoundStore[] = (data.items || []).map((item: any) => {
          const urlStr = item.link || ''
          const m = urlStr.match(/place\/?(\d{5,})/)
          const placeId = m ? m[1] : ''
          return { placeId, name: item.title || '', desc: item.roadAddress || item.address || '', url: urlStr }
        }).filter((i: FoundStore) => i.placeId)
        setSearchResults(items)
        if (items.length === 0) setError('검색 결과가 없어요. 네이버 플레이스 URL을 직접 붙여넣어 보세요.')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSearching(false)
    }
  }

  async function saveStoreId(store: FoundStore) {
    setSavingStore(true)
    setError(null)
    try {
      const res = await fetch('/api/platform-accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'naver_place',
          platform_store_id: store.placeId,
          platform_store_name: store.name,
        }),
      })
      const data = await res.json()
      if (!data.ok) { setError(data.message || data.error || '저장 실패'); return }
      setSuccess('네이버 플레이스 연결이 완료되었습니다!')
      setTimeout(() => router.push('/my/platforms'), 1200)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSavingStore(false)
    }
  }

  // ── STEP 1 ──
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
          <div className="rounded-xl p-6 mb-6 border" style={{ background: meta.brandColor + '15', borderColor: meta.brandColor + '40' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-black" style={{ background: meta.brandColor, color: meta.brandTextColor }}>
                {meta.initial}
              </div>
              <div>
                <div className="text-[11px] font-bold mb-0.5" style={{ color: meta.brandColor }}>STEP 1 / {platform === 'naver_place' ? '3' : '2'}</div>
                <h1 className="text-xl font-black text-[#191F28]">{meta.label} 대리권 위임 동의</h1>
              </div>
            </div>
            <p className="text-xs text-[#4E5968] leading-relaxed mt-2">연결 전 아래 3가지 항목에 모두 동의해주세요. 동의 이력은 3년간 보관됩니다.</p>
          </div>
          {error && <div className="mb-4 rounded-lg bg-[#FEF2F2] border border-[#FECACA] p-3 text-sm text-[#DC2626]">{error}</div>}
          <div className="rounded-xl bg-white border border-[#E5E7EB] p-6">
            <div className="space-y-4 mb-6">
              <label className="flex gap-3 cursor-pointer">
                <input type="checkbox" checked={agreedScope} onChange={(e) => setAgreedScope(e.target.checked)} className="mt-1 w-4 h-4 accent-[#3182F6]" />
                <div className="flex-1">
                  <div className="font-medium text-[#191F28] mb-1">① 위임 범위에 동의합니다 <span className="text-[#DC2626]">*</span></div>
                  <div className="text-sm text-[#4E5968] leading-relaxed">하랑마케팅(이하 "회사")이 본인 {meta.label} 계정을 사용하여 <strong className="text-[#191F28]">(1) 리뷰 조회, (2) 리뷰에 답글 게시, (3) 매장 순위/통계 수집, (4) 로그인 상태 유지</strong>의 4개 업무만 대리 수행하는 것에 동의합니다.</div>
                </div>
              </label>
              <label className="flex gap-3 cursor-pointer">
                <input type="checkbox" checked={agreedOwnership} onChange={(e) => setAgreedOwnership(e.target.checked)} className="mt-1 w-4 h-4 accent-[#3182F6]" />
                <div className="flex-1">
                  <div className="font-medium text-[#191F28] mb-1">② 본인 계정임을 확인합니다 <span className="text-[#DC2626]">*</span></div>
                  <div className="text-sm text-[#4E5968] leading-relaxed">연결하려는 {meta.label} 계정은 <strong className="text-[#191F28]">본인이 직접 소유·운영하는 사업자 계정</strong>이며, 제3자 명의 계정이 아님을 확인합니다.</div>
                </div>
              </label>
              <label className="flex gap-3 cursor-pointer">
                <input type="checkbox" checked={agreedRisk} onChange={(e) => setAgreedRisk(e.target.checked)} className="mt-1 w-4 h-4 accent-[#3182F6]" />
                <div className="flex-1">
                  <div className="font-medium text-[#191F28] mb-1">③ 플랫폼 자동화 정책 리스크를 인지합니다 <span className="text-[#DC2626]">*</span></div>
                  <div className="text-sm text-[#4E5968] leading-relaxed">{meta.label}이 자동화 접근 정책을 변경할 경우 서비스가 <strong className="text-[#191F28]">예고 없이 일시 중단되거나 계정 제재를 받을 수 있다</strong>는 점을 인지합니다.</div>
                </div>
              </label>
            </div>
            <div className="rounded-lg bg-[#F9FAFB] p-3 text-xs text-[#6B7280] mb-6 leading-relaxed">
              동의 즉시 IP 주소, User-Agent, 동의 일시, 동의 문서 버전이 증거 기록으로 저장되며, 3년간 보관 후 자동 파기됩니다.{' '}
              <Link href="/legal/platform-consent" className="text-[#3182F6] hover:underline">대리권 위임동의서 전문</Link>을 참고하세요.
            </div>
            <div className="flex gap-2">
              <Link href="/my/platforms" className="flex-1 text-center py-3 rounded-lg border border-[#E5E7EB] text-sm font-medium text-[#4E5968] hover:bg-[#F9FAFB]">취소</Link>
              <button onClick={submitConsent} disabled={!allAgreed || consentSaving} className="flex-1 py-3 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ background: meta.brandColor }}>
                {consentSaving ? '기록 중…' : '동의하고 다음으로'}
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // ── STEP 3: 네이버 플레이스 매장 찾기 ──
  if (step === 3) {
    return (
      <main className="min-h-screen bg-white flex flex-col">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="text-[11px] text-[#8B95A1]">STEP 3 / 3</div>
          <Link href="/my/platforms" aria-label="닫기" className="w-8 h-8 flex items-center justify-center text-[#191F28] text-2xl leading-none hover:bg-[#F2F4F6] rounded-lg">✕</Link>
        </div>
        <div className="flex-1 max-w-sm w-full mx-auto px-6 pt-6 pb-8 flex flex-col">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black mb-6 shadow-sm" style={{ background: '#03C75A', color: '#fff' }}>N</div>
          <h1 className="text-[22px] font-black text-[#191F28] leading-snug mb-2">내 매장을 찾아볼게요</h1>
          <p className="text-sm text-[#4E5968] mb-8">매장명 또는 네이버 플레이스 URL을 입력하면<br />자동으로 플레이스 ID를 찾아 저장해요.</p>

          {error && <div className="mb-4 rounded-lg bg-[#FEF2F2] border border-[#FECACA] p-3 text-[13px] text-[#DC2626]">{error}</div>}
          {success && <div className="mb-4 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] p-3 text-[13px] text-[#059669]">✓ {success}</div>}

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={storeQuery}
              onChange={(e) => setStoreQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchStore()}
              placeholder="예: 일산닭갈국수 부천점 또는 플레이스 URL"
              className="flex-1 px-4 py-3 rounded-2xl bg-[#F5F6F8] border border-transparent text-[14px] placeholder-[#B0B8C1] focus:outline-none focus:border-[#191F28] focus:bg-white"
            />
            <button
              onClick={searchStore}
              disabled={searching || !storeQuery.trim()}
              className="px-4 py-3 rounded-2xl bg-[#03C75A] text-white text-[13px] font-bold disabled:opacity-50 whitespace-nowrap"
            >
              {searching ? '검색 중…' : '찾기'}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2 mb-4">
              {searchResults.map((store) => (
                <button
                  key={store.placeId}
                  onClick={() => setSelectedStore(store)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition ${selectedStore?.placeId === store.placeId ? 'border-[#03C75A] bg-[#F0FFF7]' : 'border-[#E5E7EB] hover:border-[#03C75A]'}`}
                >
                  <div className="font-semibold text-[#191F28] text-[14px]">{store.name}</div>
                  <div className="text-[12px] text-[#6B7280] mt-0.5">{store.desc}</div>
                  <div className="text-[11px] text-[#03C75A] mt-0.5">플레이스 ID: {store.placeId}</div>
                </button>
              ))}
            </div>
          )}

          {selectedStore && (
            <button
              onClick={() => saveStoreId(selectedStore)}
              disabled={savingStore}
              className="w-full py-4 rounded-2xl text-[15px] font-bold text-white disabled:opacity-50 mb-3"
              style={{ background: '#03C75A' }}
            >
              {savingStore ? '저장 중…' : '이 매장으로 연결 완료'}
            </button>
          )}

          <button
            onClick={() => router.push('/my/platforms')}
            className="w-full py-3 rounded-2xl text-[14px] text-[#6B7280] hover:bg-[#F5F6F8]"
          >
            나중에 설정하기
          </button>

          <div className="mt-6 text-[11px] text-[#8B95A1] leading-relaxed text-center">
            플레이스 ID는 자동 답글·리뷰 수집에 필요해요.<br />나중에 플랫폼 연결 페이지에서 언제든 수정할 수 있어요.
          </div>
        </div>
      </main>
    )
  }

  // ── STEP 2: 로그인 UI ──
  return (
    <main className="min-h-screen bg-white flex flex-col">
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="text-[11px] text-[#8B95A1]">STEP 2 / {platform === 'naver_place' ? '3' : '2'}</div>
        <Link href="/my/platforms" aria-label="닫기" className="w-8 h-8 flex items-center justify-center text-[#191F28] text-2xl leading-none hover:bg-[#F2F4F6] rounded-lg">✕</Link>
      </div>
      <div className="flex-1 max-w-sm w-full mx-auto px-6 pt-6 pb-8 flex flex-col">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black mb-8 shadow-sm" style={{ background: meta.brandColor, color: meta.brandTextColor }}>
          {meta.initial}
        </div>
        <h1 className="text-[22px] font-black text-[#191F28] leading-snug mb-10">
          {meta.shortLabel} 리뷰 관리를 위해<br />로그인이 필요해요
        </h1>
        {error && <div className="mb-4 rounded-lg bg-[#FEF2F2] border border-[#FECACA] p-3 text-[13px] text-[#DC2626]">{error}</div>}
        {success && <div className="mb-4 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] p-3 text-[13px] text-[#059669]">✓ {success}</div>}
        <input
          type="text"
          autoComplete="off"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          placeholder={`${meta.shortLabel} 아이디`}
          className="w-full px-4 py-4 rounded-2xl bg-[#F5F6F8] border border-transparent text-[15px] placeholder-[#B0B8C1] focus:outline-none focus:border-[#191F28] focus:bg-white mb-3"
        />
        <div className="relative mb-8">
          <input
            type={showPw ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={`${meta.shortLabel} 비밀번호`}
            className="w-full px-4 py-4 pr-12 rounded-2xl bg-[#F5F6F8] border border-transparent text-[15px] placeholder-[#B0B8C1] focus:outline-none focus:border-[#191F28] focus:bg-white"
          />
          <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 표시'} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[#8B95A1] hover:text-[#191F28]">
            {showPw ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </button>
        </div>
        <button onClick={submitCredentials} disabled={saving || !accountId || !password} className="w-full py-4 rounded-2xl text-[15px] font-bold disabled:opacity-50 transition" style={{ background: meta.loginBg, color: meta.loginFg }}>
          {saving ? '암호화 저장 중…' : '로그인'}
        </button>
        <div className="flex-1 min-h-[24px]" />
        <div className="mt-10">
          <p className="text-[13px] text-[#4E5968] mb-3">{meta.shortLabel} 아이디, 비밀번호를 까먹었다면?</p>
          <div className="flex gap-2">
            {meta.singleForgot ? (
              <a href={meta.forgotIdUrl} target="_blank" rel="noopener noreferrer" className="flex-1 py-3 rounded-xl border border-[#E5E8EB] text-[13px] font-semibold text-[#4E5968] text-center hover:bg-[#F9FAFB]">아이디, 비밀번호 찾기 &nbsp;&gt;</a>
            ) : (
              <>
                <a href={meta.forgotIdUrl} target="_blank" rel="noopener noreferrer" className="flex-1 py-3 rounded-xl border border-[#E5E8EB] text-[13px] font-semibold text-[#4E5968] text-center hover:bg-[#F9FAFB]">아이디 찾기 &nbsp;&gt;</a>
                <a href={meta.forgotPwUrl} target="_blank" rel="noopener noreferrer" className="flex-1 py-3 rounded-xl border border-[#E5E8EB] text-[13px] font-semibold text-[#4E5968] text-center hover:bg-[#F9FAFB]">비밀번호 찾기 &nbsp;&gt;</a>
              </>
            )}
          </div>
        </div>
        <div className="mt-6 text-[11px] text-[#8B95A1] leading-relaxed text-center">
          입력한 비밀번호는 즉시 AES-256-GCM 으로 암호화되어 저장돼요. 운영자도 평문 조회 불가 🔐
        </div>
        {consentId && <div className="mt-3 text-center text-[10px] text-[#C3CAD1]">동의 기록 ID: {consentId.slice(0, 8)}…</div>}
      </div>
    </main>
  )
}
