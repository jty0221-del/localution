'use client'
export const dynamic = 'force-dynamic'

/**
 * /partner-points — 파트너 리워드 프로그램 (21차-2)
 *
 * 정책 (신규):
 * · 친구 초대 → 내 구독 기간 연장 (현금 포인트 아님 = 원가 0원)
 * · 5단계 티어: Starter / Bronze / Silver / Gold / Platinum
 * · 월간 챌린지: 이번 달 N명 달성 시 다음 달 요금 면제
 *
 * 백엔드(초대수 카운트·리워드 지급)는 다음 단계에서 연동.
 * 이 페이지는 UI + 정책 안내 + 내 코드·링크 공유를 우선 오픈.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Sidebar from '../components/Sidebar'
import PageHeader from '../components/PageHeader'
import Footer from '../components/Footer'
import {
 ArrowRight, Gift, Copy, Check, Users, Calendar, Link as LinkIcon,
 Sparkles, Search, Clock, Trophy, Info, ExternalLink, Flame, Crown,
 Medal, Star, Zap, TrendingUp, Circle,
} from 'lucide-react'

type Profile = { id?: string; email?: string; name?: string }

// ─────────────────────────────────────────────────────────────
// 티어 정의 (현금 아닌 "구독 연장" 기반 리워드)
// ─────────────────────────────────────────────────────────────
type Tier = {
 key: 'starter' | 'bronze' | 'silver' | 'gold' | 'platinum'
 rank: number
 label: string
 icon: React.ReactNode
 color: string
 bgColor: string
 borderColor: string
 badge: string
 requireInvites: number
 requirePaid?: number
 requireRevenue?: number
 rewards: string[]
}

const TIERS: Tier[] = [
 {
 key: 'starter',
 rank: 1,
 label: 'Starter',
 icon: <Medal size={18} />,
 color: '#A16207',
 bgColor: '#FEFCE8',
 borderColor: '#FEF08A',
 badge: '',
 requireInvites: 1,
 rewards: ['내 구독 +3일 연장', '파트너 등록 축하 쿠폰'],
 },
 {
 key: 'bronze',
 rank: 2,
 label: 'Bronze',
 icon: <Medal size={18} />,
 color: '#B45309',
 bgColor: '#FFF7ED',
 borderColor: '#FED7AA',
 badge: '',
 requireInvites: 3,
 rewards: ['내 구독 +10일 연장', '유료 모듈 1개 7일 무료 체험권'],
 },
 {
 key: 'silver',
 rank: 3,
 label: 'Silver',
 icon: <Trophy size={18} />,
 color: '#3182F6',
 bgColor: '#EFF6FF',
 borderColor: '#BFDBFE',
 badge: '',
 requireInvites: 5,
 requirePaid: 1,
 rewards: ['내 구독 +1개월 무료', '파트너 뱃지(커뮤니티 상단 노출)', '신규 모듈 베타 우선 초대'],
 },
 {
 key: 'gold',
 rank: 4,
 label: 'Gold',
 icon: <Star size={18} />,
 color: '#7C3AED',
 bgColor: '#F5F3FF',
 borderColor: '#DDD6FE',
 badge: '',
 requireInvites: 10,
 requirePaid: 3,
 rewards: ['내 구독 +3개월 무료', '1:1 전략 컨설팅 30분', '커뮤니티 "파트너스" 공식 명찰'],
 },
 {
 key: 'platinum',
 rank: 5,
 label: 'Platinum',
 icon: <Crown size={18} />,
 color: '#0891B2',
 bgColor: '#ECFEFF',
 borderColor: '#A5F3FC',
 badge: '',
 requireInvites: 10,
 requirePaid: 5,
 requireRevenue: 1000000,
 rewards: ['영구 50% 할인', '신규 모듈 베타 1순위 접근', '내 스토리 메인 히어로 노출', '전용 파트너스 오픈채팅 초대'],
 },
]

// ─────────────────────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────────────────────
// v1.6q: httpOnly 쿠키 → /api/me 서버 endpoint
async function fetchCurrentUser(): Promise<Profile | null> {
 try {
 const res = await fetch('/api/me', { credentials: 'include', cache: 'no-store' })
 if (!res.ok) return null
 const json = await res.json()
 return json.user || null
 } catch { return null }
}

async function sha1Hex(input: string): Promise<string> {
 if (typeof window === 'undefined' || !window.crypto?.subtle) {
 let h = 5381
 for (let i = 0; i < input.length; i++) h = ((h << 5) + h) + input.charCodeAt(i)
 return (h >>> 0).toString(16).padStart(8, '0')
 }
 const enc = new TextEncoder().encode(input)
 const buf = await window.crypto.subtle.digest('SHA-1', enc)
 return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function slugEmailLocal(email: string): string {
 const local = (email.split('@')[0] || 'partner').toLowerCase()
 return local.replace(/[^a-z0-9]/g, '').slice(0, 12) || 'partner'
}

async function buildPartnerCode(email: string): Promise<string> {
 const slug = slugEmailLocal(email)
 const hash = await sha1Hex('localution-partner-v1:' + email.toLowerCase())
 const n = parseInt(hash.slice(0, 10), 16)
 const tail = n.toString(36).slice(0, 6).padStart(6, '0')
 return `${slug}_${tail}`
}

function partnerLink(code: string): string {
 return `https://www.localution.co.kr?ref=${encodeURIComponent(code)}`
}

// ─────────────────────────────────────────────────────────────
// 복사 버튼
// ─────────────────────────────────────────────────────────────
function CopyButton({ text, label = '복사' }: { text: string; label?: string }) {
 const [copied, setCopied] = useState(false)
 const onCopy = useCallback(async () => {
 try {
 if (navigator.clipboard?.writeText) {
 await navigator.clipboard.writeText(text)
 } else {
 const ta = document.createElement('textarea')
 ta.value = text
 ta.style.position = 'fixed'
 ta.style.opacity = '0'
 document.body.appendChild(ta)
 ta.select()
 document.execCommand('copy')
 document.body.removeChild(ta)
 }
 setCopied(true)
 setTimeout(() => setCopied(false), 1400)
 } catch {
 alert('복사 실패 — 직접 선택해서 복사해주세요.')
 }
 }, [text])
 return (
 <button
 onClick={onCopy}
 className={`inline-flex items-center justify-center gap-1 px-3.5 py-2 rounded-lg text-[12px] font-bold border transition min-w-[56px] ${
 copied
 ? 'bg-[#03C75A] border-[#03C75A] text-white'
 : 'bg-white border-[#E5E8EB] text-[#3182F6] hover:border-[#3182F6] hover:bg-[#F0F6FF]'
 }`}
 title="클립보드에 복사"
 >
 {copied ? <><Check size={12} strokeWidth={3} />복사됨</> : <><Copy size={12} strokeWidth={2.5} />{label}</>}
 </button>
 )
}

// ─────────────────────────────────────────────────────────────
// 이번 달 D-카운트
// ─────────────────────────────────────────────────────────────
function useMonthlyChallengeCountdown() {
 const now = new Date()
 const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
 const diffMs = endOfMonth.getTime() - now.getTime()
 const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
 return {
 monthLabel: `${now.getMonth() + 1}월`,
 daysLeft,
 endOfMonth: `${endOfMonth.getMonth() + 1}월 ${endOfMonth.getDate()}일`,
 }
}

// ─────────────────────────────────────────────────────────────
// 본문
// ─────────────────────────────────────────────────────────────
export default function PartnerPointsPage() {
 const [profile, setProfile] = useState<Profile | null>(null)
 const [code, setCode] = useState<string>('')
 const [loading, setLoading] = useState(true)
 const [search, setSearch] = useState('')

 // 내 진척 상황 (추후 API 연동). 지금은 더미 0.
 const [stats, setStats] = useState({
 invitesTotal: 0, // 누적 가입자 수
 invitesPaid: 0, // 그중 유료 전환 수
 revenueTotal: 0, // 누적 발생 매출 (원)
 bonusDaysEarned: 0, // 받은 연장일
 monthlyInvites: 0, // 이번 달 초대 수
 })

 // 히스토리
 const history: { id: string; at: string; type: string; amount: string; memo: string }[] = []

 useEffect(() => {
 let alive = true
 ;(async () => {
 const p = await fetchCurrentUser()
 if (!alive) return
 setProfile(p)
 if (p?.email) {
 const c = await buildPartnerCode(p.email)
 if (!alive) return
 setCode(c)
 // TODO: /api/partner/stats 연동 — 지금은 0 유지
 }
 setLoading(false)
 })()
 return () => { alive = false }
 }, [])

 const link = useMemo(() => (code ? partnerLink(code) : ''), [code])
 const { monthLabel, daysLeft, endOfMonth } = useMonthlyChallengeCountdown()

 // 현재 티어 & 다음 티어 계산
 const currentTier = useMemo(() => {
 let achieved: Tier | null = null
 for (const t of TIERS) {
 const okInvites = stats.invitesTotal >= t.requireInvites
 const okPaid = !t.requirePaid || stats.invitesPaid >= t.requirePaid
 const okRevenue = !t.requireRevenue || stats.revenueTotal >= t.requireRevenue
 if (okInvites && okPaid && okRevenue) achieved = t
 }
 return achieved
 }, [stats])

 const nextTier = useMemo(() => {
 const curRank = currentTier?.rank ?? 0
 return TIERS.find(t => t.rank === curRank + 1) || null
 }, [currentTier])

 const progressToNext = useMemo(() => {
 if (!nextTier) return { pct: 100, remaining: 0, message: '최고 등급 달성' }
 const need = nextTier.requireInvites
 const cur = stats.invitesTotal
 const pct = Math.min(100, Math.round((cur / need) * 100))
 return {
 pct,
 remaining: Math.max(0, need - cur),
 message: `다음 등급(${nextTier.label})까지 ${Math.max(0, need - cur)}명 남음`,
 }
 }, [nextTier, stats])

 const filteredHistory = useMemo(() => {
 const q = search.trim().toLowerCase()
 if (!q) return history
 return history.filter(h =>
 h.type.toLowerCase().includes(q) ||
 h.memo.toLowerCase().includes(q)
 )
 }, [history, search])

 // 미로그인 가드
 if (!loading && !profile?.email) {
 return (
 <div className="min-h-screen bg-[#F8F9FA] flex">
 <Sidebar />
 <main className="flex-1 ml-0 md:ml-[220px] pt-4 md:pt-0 min-w-0">
 <div className="max-w-xl mx-auto pt-20 px-6 text-center">
 <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#FEF3C7] text-[#D97706] mb-4">
 <Gift size={26} />
 </div>
 <h1 className="text-[22px] font-black text-[#191F28] mb-2">파트너 리워드</h1>
 <p className="text-[14px] text-[#4E5968] mb-6">
 로그인 후 내 파트너 코드·링크를 확인하고, 친구를 초대해 구독 기간을 늘려보세요.
 </p>
 <Link
 href="/login?redirect=/partner-points"
 className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#3182F6] hover:bg-[#1B64DA] text-white text-sm font-bold transition"
 >
 로그인하러 가기 <ArrowRight size={14} />
 </Link>
 </div>
 <Footer />
 </main>
 </div>
 )
 }

 const CHALLENGE_GOAL = 3

 return (
 <div className="min-h-screen bg-[#F8F9FA] flex">
 <Sidebar />
 <main className="md:ml-[220px] flex flex-col min-h-screen">
 <PageHeader
 icon={<Gift size={28} className="text-white" strokeWidth={2.5} />}
 title="파트너 리워드"
 subtitle="친구 초대하면 내 구독 기간이 늘어나요 · 현금 포인트 대신 실질 혜택"
 variant="primary"
 />

 <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8 w-full">
 {/* 브레드크럼 */}
 <div className="flex items-center gap-2 text-xs text-[#8B95A1] mb-4">
 <Link href="/dashboard" className="hover:text-[#191F28]">대시보드</Link>
 <ArrowRight size={12} />
 <span className="text-[#3182F6] font-medium">파트너 리워드</span>
 </div>

 {/* ═══════════════════════════════════════════════════════
 1. 현재 티어 + 진행바 (상단 히어로)
 ═══════════════════════════════════════════════════════ */}
 <div
 className="rounded-2xl p-6 mb-5 border-2 shadow-sm"
 style={{
 background: currentTier
 ? `linear-gradient(135deg, ${currentTier.bgColor} 0%, #ffffff 100%)`
 : 'linear-gradient(135deg, #F8F9FB 0%, #ffffff 100%)',
 borderColor: currentTier?.borderColor || '#E5E8EB',
 }}
 >
 <div className="flex items-start justify-between flex-wrap gap-4">
 <div className="min-w-0">
 <p className="text-[11px] text-[#8B95A1] font-bold mb-1">현재 등급</p>
 <div className="flex items-center gap-2.5 mb-1">
 <span className="text-3xl">{currentTier?.badge || ''}</span>
 <h2 className="text-[24px] md:text-[28px] font-black" style={{ color: currentTier?.color || '#4E5968' }}>
 {currentTier?.label || '미달성'}
 </h2>
 </div>
 <p className="text-[13px] text-[#4E5968]">
 {currentTier
 ? `축하해요! ${currentTier.rewards[0]}을(를) 받으셨어요.`
 : '첫 파트너 1명만 초대해도 Starter 등급 + 구독 +3일이 시작돼요.'}
 </p>
 </div>

 <div className="flex items-center gap-4 flex-wrap">
 <div className="text-center">
 <p className="text-[10px] text-[#8B95A1] font-bold">누적 초대</p>
 <p className="text-2xl font-black text-[#191F28]">{stats.invitesTotal}<span className="text-xs font-bold text-[#8B95A1]">명</span></p>
 </div>
 <div className="w-px h-10 bg-[#E5E8EB]" />
 <div className="text-center">
 <p className="text-[10px] text-[#8B95A1] font-bold">유료 전환</p>
 <p className="text-2xl font-black text-[#3182F6]">{stats.invitesPaid}<span className="text-xs font-bold text-[#8B95A1]">명</span></p>
 </div>
 <div className="w-px h-10 bg-[#E5E8EB]" />
 <div className="text-center">
 <p className="text-[10px] text-[#8B95A1] font-bold">받은 연장</p>
 <p className="text-2xl font-black text-[#059669]">+{stats.bonusDaysEarned}<span className="text-xs font-bold text-[#8B95A1]">일</span></p>
 </div>
 </div>
 </div>

 {/* 다음 티어 진행바 */}
 {nextTier && (
 <div className="mt-5 pt-4 border-t border-[#E5E8EB]/60">
 <div className="flex items-center justify-between mb-1.5">
 <span className="text-[12px] font-bold text-[#191F28] flex items-center gap-1.5">
 <span>{nextTier.badge}</span>
 다음: <span style={{ color: nextTier.color }}>{nextTier.label}</span>
 <span className="text-[#8B95A1] font-normal">· {nextTier.rewards[0]}</span>
 </span>
 <span className="text-[11px] font-bold text-[#4E5968]">
 {stats.invitesTotal} / {nextTier.requireInvites}명
 <span className="text-[#C9CDD2] ml-1">· {progressToNext.remaining}명 남음</span>
 </span>
 </div>
 <div className="h-2.5 bg-white rounded-full overflow-hidden border border-[#E5E8EB]">
 <div
 className="h-full rounded-full transition-all"
 style={{
 width: progressToNext.pct + '%',
 background: `linear-gradient(90deg, ${nextTier.color} 0%, ${nextTier.color}CC 100%)`,
 }}
 />
 </div>
 {nextTier.requirePaid && (
 <p className="text-[11px] text-[#8B95A1] mt-1.5">
 ※ 유료 전환 {stats.invitesPaid}/{nextTier.requirePaid}명도 함께 충족해야 해요.
 </p>
 )}
 </div>
 )}
 </div>

 {/* ═══════════════════════════════════════════════════════
 2. 월간 챌린지 (핵심 리텐션 장치)
 ═══════════════════════════════════════════════════════ */}
 <div className="bg-gradient-to-br from-[#FFF7ED] to-[#FEF3C7] border-2 border-[#FED7AA] rounded-2xl p-5 mb-5">
 <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
 <div className="min-w-0">
 <div className="flex items-center gap-2 mb-1">
 <div className="w-8 h-8 rounded-xl bg-[#F97316] text-white flex items-center justify-center flex-shrink-0">
 <Flame size={16} />
 </div>
 <h3 className="text-[15px] md:text-[17px] font-black text-[#9A3412]">{monthLabel} 챌린지</h3>
 <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F97316] text-white font-black">
 D-{daysLeft}
 </span>
 </div>
 <p className="text-[13px] text-[#9A3412] font-semibold leading-snug">
 이번 달 <b className="text-[#EA580C]">{CHALLENGE_GOAL}명</b> 초대 달성 시 → <b>다음 달 요금 100% 면제</b>
 </p>
 <p className="text-[11px] text-[#A16207] mt-0.5">마감: {endOfMonth} 23:59</p>
 </div>
 <div className="text-right shrink-0">
 <p className="text-[10px] text-[#A16207] font-bold">진행</p>
 <p className="text-2xl font-black text-[#EA580C]">
 {stats.monthlyInvites}<span className="text-xs text-[#A16207]"> / {CHALLENGE_GOAL}명</span>
 </p>
 </div>
 </div>

 {/* 진행바 + 마일스톤 */}
 <div className="relative">
 <div className="h-3 bg-white rounded-full overflow-hidden border border-[#FED7AA]">
 <div
 className="h-full rounded-full transition-all"
 style={{
 width: Math.min(100, (stats.monthlyInvites / CHALLENGE_GOAL) * 100) + '%',
 background: 'linear-gradient(90deg, #F97316 0%, #EA580C 100%)',
 }}
 />
 </div>
 <div className="flex justify-between mt-1.5">
 {[...Array(CHALLENGE_GOAL + 1)].map((_, i) => (
 <span key={i} className={`text-[10px] font-bold ${i <= stats.monthlyInvites ? 'text-[#EA580C]' : 'text-[#C9CDD2]'}`}>
 {i === 0 ? '시작' : i === CHALLENGE_GOAL ? '목표' : `${i}명`}
 </span>
 ))}
 </div>
 </div>
 </div>

 {/* ═══════════════════════════════════════════════════════
 3. 티어 5종 그리드
 ═══════════════════════════════════════════════════════ */}
 <div className="mb-6">
 <h3 className="text-[15px] md:text-[17px] font-black text-[#191F28] mb-3 flex items-center gap-2">
 <Trophy size={16} className="text-[#D97706]" />
 리워드 등급표
 </h3>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
 {TIERS.map(t => {
 const invitesOk = stats.invitesTotal >= t.requireInvites
 const paidOk = !t.requirePaid || stats.invitesPaid >= t.requirePaid
 const revenueOk = !t.requireRevenue || stats.revenueTotal >= t.requireRevenue
 const achieved = invitesOk && paidOk && revenueOk
 const current = currentTier?.key === t.key

 return (
 <div
 key={t.key}
 className={`relative rounded-2xl p-4 border-2 transition-all ${
 current ? 'shadow-lg scale-[1.02]' : achieved ? 'shadow-sm' : 'opacity-70'
 }`}
 style={{
 background: achieved ? t.bgColor : '#FAFBFC',
 borderColor: current ? t.color : achieved ? t.borderColor : '#E5E8EB',
 }}
 >
 {current && (
 <span
 className="absolute -top-2 right-3 text-[9px] font-black px-2 py-0.5 rounded-md text-white"
 style={{ background: t.color }}
 >
 내 등급
 </span>
 )}
 {achieved && !current && (
 <span className="absolute -top-2 right-3 text-[9px] font-black px-2 py-0.5 rounded-md bg-[#059669] text-white">
 달성 완료
 </span>
 )}

 <div className="flex items-center gap-1.5 mb-2">
 <span className="text-2xl">{t.badge}</span>
 <h4 className="text-[14px] font-black" style={{ color: t.color }}>{t.label}</h4>
 </div>

 {/* 조건 */}
 <div className="text-[11px] text-[#4E5968] space-y-0.5 mb-3 pb-3 border-b border-[#E5E8EB]/70">
 <div className="flex items-center gap-1">
 <span className={invitesOk ? 'text-[#059669]' : 'text-[#C9CDD2]'}>
 {invitesOk ? <Check size={12} strokeWidth={3} /> : <Circle size={12} strokeWidth={2.5} />}
 </span>
 <span>초대 <b>{t.requireInvites}명</b></span>
 </div>
 {t.requirePaid && (
 <div className="flex items-center gap-1">
 <span className={paidOk ? 'text-[#059669]' : 'text-[#C9CDD2]'}>
 {paidOk ? <Check size={12} strokeWidth={3} /> : <Circle size={12} strokeWidth={2.5} />}
 </span>
 <span>유료 전환 <b>{t.requirePaid}명</b></span>
 </div>
 )}
 {t.requireRevenue && (
 <div className="flex items-center gap-1">
 <span className={revenueOk ? 'text-[#059669]' : 'text-[#C9CDD2]'}>
 {revenueOk ? <Check size={12} strokeWidth={3} /> : <Circle size={12} strokeWidth={2.5} />}
 </span>
 <span>누적 매출 <b>{(t.requireRevenue / 10000).toFixed(0)}만원</b></span>
 </div>
 )}
 </div>

 {/* 혜택 */}
 <ul className="space-y-1">
 {t.rewards.map((r, i) => (
 <li key={i} className="flex items-start gap-1 text-[11px] text-[#191F28] leading-snug">
 <Zap size={10} className="mt-0.5 shrink-0" style={{ color: t.color }} />
 <span>{r}</span>
 </li>
 ))}
 </ul>
 </div>
 )
 })}
 </div>
 </div>

 {/* ═══════════════════════════════════════════════════════
 4. 내 초대 코드 · 링크
 ═══════════════════════════════════════════════════════ */}
 <div className="bg-white border border-[#E5E8EB] rounded-2xl p-5 md:p-6 mb-6 shadow-sm">
 <div className="flex items-center gap-2 mb-4">
 <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] text-[#3182F6] flex items-center justify-center">
 <LinkIcon size={16} />
 </div>
 <div>
 <h3 className="text-[14px] font-black text-[#191F28]">내 초대 코드 · 링크</h3>
 <p className="text-[11px] text-[#8B95A1]">누가 가입했을 때 이 코드나 링크를 거쳐야 내 리워드로 집계돼요</p>
 </div>
 </div>

 <div className="mb-3">
 <label className="block text-[12px] font-bold text-[#191F28] mb-1.5">내 파트너 코드</label>
 <div className="flex items-stretch gap-2">
 <div className="flex-1 min-w-0 flex items-center px-3.5 py-2.5 rounded-lg bg-[#F8F9FB] border border-[#E5E8EB] text-[13px] text-[#4E5968] font-mono select-all">
 {loading ? <span className="text-[#8B95A1]">불러오는 중…</span> : code || '—'}
 </div>
 {code && <CopyButton text={code} />}
 </div>
 </div>

 <div className="mb-2">
 <label className="block text-[12px] font-bold text-[#191F28] mb-1.5">내 초대 링크</label>
 <div className="flex items-stretch gap-2">
 <div className="flex-1 min-w-0 flex items-center px-3.5 py-2.5 rounded-lg bg-[#F8F9FB] border border-[#E5E8EB] text-[13px] text-[#4E5968] truncate select-all">
 {loading ? <span className="text-[#8B95A1]">불러오는 중…</span> : link || '—'}
 </div>
 {link && <CopyButton text={link} label="링크 복사" />}
 </div>
 </div>

 {/* 공유 단축키 */}
 {link && (
 <div className="flex flex-wrap gap-1.5 mt-3">
 <a
 href={`https://story.kakao.com/s/share?url=${encodeURIComponent(link)}`}
 target="_blank"
 rel="noopener noreferrer"
 className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-[#FEE500] text-[#3C1E1E] hover:opacity-90"
 >
 카카오 공유
 </a>
 <a
 href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('로컬루션 — 소상공인 마케팅 도우미')}&url=${encodeURIComponent(link)}`}
 target="_blank"
 rel="noopener noreferrer"
 className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-[#191F28] text-white hover:opacity-90"
 >
 𝕏 트윗
 </a>
 <a
 href={link}
 target="_blank"
 rel="noopener noreferrer"
 className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-white text-[#3182F6] border border-[#BFDBFE] hover:bg-[#EFF6FF]"
 >
 <ExternalLink size={11} /> 미리보기
 </a>
 </div>
 )}
 </div>

 {/* ═══════════════════════════════════════════════════════
 5. 내 리워드 적립 내역
 ═══════════════════════════════════════════════════════ */}
 <div className="bg-white border border-[#E5E8EB] rounded-2xl shadow-sm mb-6">
 <div className="p-5 md:p-6 flex items-center justify-between flex-wrap gap-3 border-b border-[#F2F4F6]">
 <h3 className="text-[15px] font-black text-[#191F28] flex items-center gap-2">
 <TrendingUp size={15} className="text-[#3182F6]" />
 내 리워드 적립 내역
 </h3>
 <div className="relative">
 <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B95A1]" />
 <input
 type="text"
 value={search}
 onChange={e => setSearch(e.target.value)}
 placeholder="검색..."
 className="pl-8 pr-3 py-2 w-[180px] rounded-xl border border-[#E5E8EB] text-[12px] focus:outline-none focus:ring-2 focus:ring-[#3182F6] focus:border-transparent"
 />
 </div>
 </div>

 {filteredHistory.length === 0 ? (
 <div className="py-14 flex flex-col items-center justify-center text-center">
 <div className="w-14 h-14 rounded-2xl bg-[#F2F4F6] text-[#8B95A1] flex items-center justify-center mb-3">
 <Gift size={22} />
 </div>
 <div className="text-[13px] text-[#4E5968] font-semibold mb-0.5">아직 받은 리워드가 없어요</div>
 <div className="text-[12px] text-[#8B95A1]">
 친구 1명만 초대해도 <b className="text-[#059669]">내 구독 +3일</b>이 바로 적립됩니다.
 </div>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-[13px]">
 <thead>
 <tr className="bg-[#FAFBFC] text-[11px] uppercase tracking-wider text-[#8B95A1]">
 <th className="text-left font-semibold px-4 py-2.5">일시</th>
 <th className="text-left font-semibold px-4 py-2.5">유형</th>
 <th className="text-left font-semibold px-4 py-2.5">메모</th>
 <th className="text-right font-semibold px-4 py-2.5">혜택</th>
 </tr>
 </thead>
 <tbody>
 {filteredHistory.map(h => (
 <tr key={h.id} className="border-t border-[#F2F4F6]">
 <td className="px-4 py-2.5 text-[#4E5968]">{h.at}</td>
 <td className="px-4 py-2.5 font-semibold text-[#191F28]">{h.type}</td>
 <td className="px-4 py-2.5 text-[#4E5968]">{h.memo}</td>
 <td className="px-4 py-2.5 text-right font-bold text-[#3182F6]">{h.amount}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>

 {/* ═══════════════════════════════════════════════════════
 6. 공유 가이드
 ═══════════════════════════════════════════════════════ */}
 <div className="bg-[#EFF6FF] border border-[#DBEAFE] rounded-2xl p-5 text-[13px] text-[#1E40AF] leading-relaxed">
 <div className="flex items-start gap-2 mb-2 font-bold">
 <Sparkles size={14} className="mt-0.5" />
 이렇게 공유해보세요
 </div>
 <ul className="space-y-1 list-disc list-inside marker:text-[#3182F6]">
 <li>블로그·인스타·유튜브 설명란에 <b>내 초대 링크</b>를 상시 걸어두기</li>
 <li>카카오톡 채널·1:1 문의 답변에 <b>파트너 코드</b>를 안내하기</li>
 <li>지인 사장님 온보딩 시 직접 링크 전달 → 가입하면 <b>내 구독 +3일</b> 자동 적립</li>
 <li>월 3명 채우면 <b>다음 달 요금 0원</b> — 카톡방·커뮤니티에 공유</li>
 </ul>
 <div className="mt-3 flex items-center gap-2 text-[12px] text-[#4E5968]">
 <Clock size={12} />
 적립은 파트너가 가입 완료 시 즉시, 유료 전환 혜택은 결제 확정 후 최대 7일 내 반영됩니다.
 </div>
 </div>
 </div>
 <Footer />
 </main>
 </div>
 )
}
