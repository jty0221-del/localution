'use client'

// app/my/platforms/page.tsx
// ============================================================
// 23차-8c: 플랫폼 허브 페이지 (2026-04-21)
// 30차-5: 좌측 Sidebar + Footer 추가 (2026-04-22)
//
// · 4개 플랫폼(네이버플레이스/배민/요기요/쿠팡이츠) 연결 상태 카드
// · 각 카드에서 "연결하기" → /my/platforms/[platform]/connect 로 이동
// · 이미 연결된 카드는 "연결 해제" + 최근 로그인 상태 표시
// · Sidebar 로 다른 페이지 자유 이동 가능
// ============================================================
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Sidebar from '../../components/Sidebar'
import Footer from '../../components/Footer'
import PageHeader from '../../components/PageHeader'
import PlatformLogo from '../../components/PlatformLogo'
import { Link2 } from 'lucide-react'

type PlatformSlug = 'naver_place' | 'baemin' | 'yogiyo' | 'coupangeats' | 'kakao_map'

type AvailablePlatform = {
 platform: PlatformSlug
 label: string
 connected: boolean
}

type ConnectedAccount = {
 platform: PlatformSlug
 platform_label: string
 account_id: string
 platform_store_name: string | null
 connected_at: string
 last_login_at: string | null
 last_login_status: string | null
}

type ApiResp = {
 ok: boolean
 accounts?: ConnectedAccount[]
 available_platforms?: AvailablePlatform[]
 error?: string
}

const PLATFORM_META: Record<PlatformSlug, {
 label: string
 brandColor: string
 bgColor: string
 description: string
 initial: string
}> = {
 naver_place: {
 label: '네이버 플레이스',
 brandColor: '#03C75A',
 bgColor: '#E6F7EF',
 description: '매장 리뷰/순위 자동 관리',
 initial: 'N',
 },
 baemin: {
 label: '배달의민족',
 brandColor: '#2AC1BC',
 bgColor: '#E0F7F6',
 description: '배민 사장님 리뷰 자동 답글',
 initial: '배',
 },
 yogiyo: {
 label: '요기요',
 brandColor: '#FA0050',
 bgColor: '#FFE5ED',
 description: '요기요 리뷰 자동 답글',
 initial: '요',
 },
 coupangeats: {
 label: '쿠팡이츠',
 brandColor: '#FF4B30',
 bgColor: '#FFE7E3',
 description: '쿠팡이츠 리뷰 자동 답글',
 initial: '쿠',
 },
 kakao_map: {
 label: '카카오맵',
 brandColor: '#FEE500',
 bgColor: '#FFFBE5',
 description: '카카오맵 리뷰 자동 수집·답글',
 initial: '카',
 },
}

const LOGIN_STATUS_LABEL: Record<string, { text: string; color: string }> = {
 ok: { text: '정상', color: '#059669' },
 captcha: { text: 'CAPTCHA 필요', color: '#D97706' },
 blocked: { text: '로그인 차단', color: '#DC2626' },
 wrong_pw: { text: '비밀번호 오류', color: '#DC2626' },
 two_factor: { text: '2차 인증 필요', color: '#D97706' },
 unknown_error: { text: '알 수 없는 오류', color: '#DC2626' },
}

function formatDate(iso: string | null): string {
 if (!iso) return '-'
 try {
 const d = new Date(iso)
 return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
 } catch {
 return '-'
 }
}

export default function MyPlatformsPage() {
 const router = useRouter()
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState<string | null>(null)
 const [available, setAvailable] = useState<AvailablePlatform[]>([])
 const [accounts, setAccounts] = useState<ConnectedAccount[]>([])
 const [unlinking, setUnlinking] = useState<PlatformSlug | null>(null)

 async function load() {
 setLoading(true)
 setError(null)
 try {
 const res = await fetch('/api/platform-accounts', { cache: 'no-store' })
 if (res.status === 401) {
 router.push('/login?redirect=' + encodeURIComponent('/my/platforms'))
 return
 }
 const data: ApiResp = await res.json()
 if (!data.ok) {
 setError(data.error || 'unknown_error')
 return
 }
 setAvailable(data.available_platforms ?? [])
 setAccounts(data.accounts ?? [])
 } catch (e) {
 setError(e instanceof Error ? e.message : String(e))
 } finally {
 setLoading(false)
 }
 }

 useEffect(() => { load() }, [])

 async function unlink(platform: PlatformSlug) {
 if (!confirm(`${PLATFORM_META[platform].label} 연결을 해제하시겠습니까?\n\n· 저장된 로그인 정보가 즉시 파기됩니다\n· 자동 답글/순위 추적이 중단됩니다`)) return
 setUnlinking(platform)
 try {
 const res = await fetch('/api/platform-accounts?platform=' + platform, {
 method: 'DELETE',
 })
 const data = await res.json()
 if (!data.ok) {
 alert('해제 실패: ' + (data.error || 'unknown'))
 } else {
 await load()
 }
 } catch (e) {
 alert('해제 실패: ' + (e instanceof Error ? e.message : String(e)))
 } finally {
 setUnlinking(null)
 }
 }

 return (
 <div className="min-h-screen bg-[#F8F9FA]">
 <Sidebar />
 <div className="md:ml-[220px] flex flex-col min-h-screen">
 <PageHeader
 icon={<Link2 size={28} className="text-white" strokeWidth={2.5} />}
 title="플랫폼 연결 관리"
 subtitle="네이버·배민·요기요·쿠팡이츠·카카오 — 본인 계정 연결로 리뷰·순위 자동화"
 variant="primary"
 />
 <main className="flex-1 px-4 md:px-6 py-4 md:py-6 max-w-6xl mx-auto w-full">
 <div className="w-full">
 {/* 안내 헤더 */}
 <header className="mb-5">
 <p className="text-xs md:text-sm text-[#4E5968] leading-relaxed">
 사장님 본인 계정을 연결하면 리뷰 답글·순위 추적이 자동으로 실행됩니다.
 비밀번호는 AES-256 방식으로 암호화되어 저장되며, 연결 해제 시 즉시 파기됩니다.
 </p>
 </header>

 {/* 안내 배너 — 법적 문서 링크 */}
 <div className="mb-6 rounded-xl border border-[#E5E7EB] bg-white p-4 text-sm text-[#4E5968]">
 <div className="flex items-start gap-3">
 <div className="w-6 h-6 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#3182F6] font-bold text-xs flex-shrink-0">!</div>
 <div className="flex-1">
 연결 전 반드시{' '}
 <Link href="/legal/platform-consent" className="text-[#3182F6] font-medium hover:underline">대리권 위임동의서</Link>,{' '}
 <Link href="/terms" className="text-[#3182F6] font-medium hover:underline">이용약관(제5조)</Link>,{' '}
 <Link href="/privacy" className="text-[#3182F6] font-medium hover:underline">개인정보처리방침(제8조)</Link>
 를 확인해주세요. 3개 필수 항목 동의 후 자격증명을 입력하실 수 있습니다.
 </div>
 </div>
 </div>

 {/* 바로가기 — 인증 후 다른 페이지로 이동 */}
 <div className="mb-6 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] p-4">
 <div className="flex items-center justify-between flex-wrap gap-3">
 <div className="flex items-center gap-2 text-sm text-[#1E40AF]">
 <span className="font-semibold">인증 완료 후 이동</span>
 <span className="text-[#3182F6]">— 자주 쓰는 페이지로 바로 가세요</span>
 </div>
 <div className="flex gap-2 flex-wrap">
 <Link href="/dashboard" className="px-3 py-1.5 rounded-lg bg-white border border-[#BFDBFE] text-xs font-medium text-[#1E40AF] hover:bg-[#DBEAFE]">
 대시보드
 </Link>
 <Link href="/settings" className="px-3 py-1.5 rounded-lg bg-white border border-[#BFDBFE] text-xs font-medium text-[#1E40AF] hover:bg-[#DBEAFE]">
 설정 / 매장정보
 </Link>
 <Link href="/review-admin" className="px-3 py-1.5 rounded-lg bg-white border border-[#BFDBFE] text-xs font-medium text-[#1E40AF] hover:bg-[#DBEAFE]">
 리뷰 관리
 </Link>
 <Link href="/marketing/place" className="px-3 py-1.5 rounded-lg bg-white border border-[#BFDBFE] text-xs font-medium text-[#1E40AF] hover:bg-[#DBEAFE]">
 플레이스 순위
 </Link>
 </div>
 </div>
 </div>

 {/* 에러 */}
 {error && (
 <div className="mb-4 rounded-lg bg-[#FEF2F2] border border-[#FECACA] p-3 text-sm text-[#DC2626]">
 오류: {error}
 </div>
 )}

 {/* 로딩 */}
 {loading ? (
 <div className="rounded-xl bg-white border border-[#E5E7EB] p-10 text-center text-[#6B7280]">
 불러오는 중…
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {(available.length ? available : Object.keys(PLATFORM_META).map((p) => ({
 platform: p as PlatformSlug,
 label: PLATFORM_META[p as PlatformSlug].label,
 connected: false,
 }))).map((item) => {
 const meta = PLATFORM_META[item.platform]
 const acc = accounts.find((a) => a.platform === item.platform)
 const status = acc?.last_login_status ? LOGIN_STATUS_LABEL[acc.last_login_status] : null
 return (
 <div
 key={item.platform}
 className="rounded-xl bg-white border border-[#E5E7EB] p-5 hover:border-[#D1D5DB] transition-colors"
 >
 {/* 상단: 로고 + 제목 (35차-4: 공통 PlatformLogo 로 교체) */}
 <div className="flex items-center gap-3 mb-4">
 <PlatformLogo
 platform={item.platform}
 size={44}
 rounded={11}
 />
 <div className="flex-1 min-w-0">
 <div className="font-semibold text-[#191F28] truncate">{meta.label}</div>
 <div className="text-xs text-[#6B7280]">{meta.description}</div>
 </div>
 {/* 연결 상태 배지 */}
 {item.connected ? (
 <span
 className="text-xs font-medium px-2 py-1 rounded-full flex-shrink-0"
 style={{ background: meta.bgColor, color: meta.brandColor }}
 >
 연결됨
 </span>
 ) : (
 <span className="text-xs font-medium px-2 py-1 rounded-full bg-[#F2F4F6] text-[#6B7280] flex-shrink-0">
 미연결
 </span>
 )}
 </div>

 {/* 연결된 경우 상세 */}
 {acc ? (
 <div className="space-y-2 mb-4 rounded-lg bg-[#F9FAFB] p-3 text-xs">
 <div className="flex justify-between">
 <span className="text-[#6B7280]">계정</span>
 <span className="text-[#191F28] font-medium">{acc.account_id}</span>
 </div>
 {acc.platform_store_name && (
 <div className="flex justify-between">
 <span className="text-[#6B7280]">매장</span>
 <span className="text-[#191F28] font-medium truncate max-w-[160px]">{acc.platform_store_name}</span>
 </div>
 )}
 <div className="flex justify-between">
 <span className="text-[#6B7280]">연결일</span>
 <span className="text-[#191F28]">{formatDate(acc.connected_at)}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-[#6B7280]">최근 로그인</span>
 <span className="text-[#191F28]">
 {acc.last_login_at ? formatDate(acc.last_login_at) : '미실행'}
 </span>
 </div>
 {status && (
 <div className="flex justify-between">
 <span className="text-[#6B7280]">상태</span>
 <span style={{ color: status.color }} className="font-medium">
 {status.text}
 </span>
 </div>
 )}
 </div>
 ) : (
 <div className="mb-4 rounded-lg bg-[#F9FAFB] p-3 text-xs text-[#6B7280]">
 아직 연결되지 않았습니다.
 <br />
 연결하면 리뷰 수집, AI 답글, 순위 추적이 자동화됩니다.
 </div>
 )}

 {/* 버튼 */}
 {item.connected ? (
 <div className="flex gap-2">
 <Link
 href={`/my/platforms/${item.platform}/connect`}
 className="flex-1 text-center py-2 rounded-lg border border-[#E5E7EB] text-sm font-medium text-[#4E5968] hover:bg-[#F9FAFB]"
 >
 재연결
 </Link>
 <button
 onClick={() => unlink(item.platform)}
 disabled={unlinking === item.platform}
 className="flex-1 py-2 rounded-lg bg-[#FEF2F2] text-sm font-medium text-[#DC2626] hover:bg-[#FECACA] disabled:opacity-50"
 >
 {unlinking === item.platform ? '해제 중…' : '연결 해제'}
 </button>
 </div>
 ) : (
 <Link
 href={`/my/platforms/${item.platform}/connect`}
 className="block w-full text-center py-2.5 rounded-lg text-sm font-medium text-white"
 style={{ background: meta.brandColor }}
 >
 연결하기
 </Link>
 )}
 </div>
 )
 })}
 </div>
 )}

 {/* 하단 안내 */}
 <div className="mt-8 rounded-xl border border-[#E5E7EB] bg-white p-5 text-sm text-[#4E5968]">
 <div className="font-semibold text-[#191F28] mb-2">연결된 정보 보호</div>
 <ul className="space-y-1.5 list-disc pl-5">
 <li>비밀번호는 AES-256-GCM 으로 암호화되어 Supabase 에만 저장됩니다</li>
 <li>복호화 키(KEK)는 DB 와 완전 분리되어 있으며, 운영자도 평문 조회 불가</li>
 <li>연결 해제 시 자격증명은 즉시 삭제되며, 동의 이력만 감사 목적으로 3년간 보존</li>
 <li>플랫폼사의 자동화 정책 변경 시 서비스가 일시 중단될 수 있습니다</li>
 </ul>
 </div>
 </div>
 </main>
 <Footer />
 </div>
 </div>
 )
}
