'use client'
export const dynamic = 'force-dynamic'

/**
 * /partner-points — 파트너 포인트 프로그램 (20차-2)
 *
 * 정책:
 *   · 파트너가 내 링크·코드로 가입하고 주문하면 주문 금액의 3%를 포인트로 적립
 *   · 포인트는 크레딧으로 전환 가능
 *   · 코드·링크는 로그인한 유저 이메일 기반 결정론적 해시로 생성
 *
 * 백엔드(적립·전환·집계)는 다음 단계에서 연동. 이 페이지는
 *   "내 코드·링크 확인 + 복사 + 안내"를 먼저 오픈.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Sidebar from '../components/Sidebar'
import PageHeader from '../components/PageHeader'
import Footer from '../components/Footer'
import {
  ArrowRight, Gift, Copy, Check, Users, Wallet, Link as LinkIcon,
  Sparkles, Search, Clock, TrendingUp, Info, ExternalLink,
} from 'lucide-react'

type Profile = { id?: string; email?: string; name?: string }

// ─────────────────────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────────────────────
function readCookieUser(): Profile | null {
  if (typeof document === 'undefined') return null
  try {
    const m = document.cookie.match(/(?:^|;\s*)localution_user=([^;]+)/)
    if (!m) return null
    const raw = decodeURIComponent(m[1])
    const p = JSON.parse(raw)
    return p && typeof p === 'object' ? p : null
  } catch { return null }
}

// 브라우저 환경 SHA-1 해시 (crypto.subtle 이용) — 비동기
async function sha1Hex(input: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    // 폴백: djb2
    let h = 5381
    for (let i = 0; i < input.length; i++) h = ((h << 5) + h) + input.charCodeAt(i)
    return (h >>> 0).toString(16).padStart(8, '0')
  }
  const enc = new TextEncoder().encode(input)
  const buf = await window.crypto.subtle.digest('SHA-1', enc)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function slugEmailLocal(email: string): string {
  // jty0221@gmail.com -> jty0221
  const local = (email.split('@')[0] || 'partner').toLowerCase()
  return local.replace(/[^a-z0-9]/g, '').slice(0, 12) || 'partner'
}

async function buildPartnerCode(email: string): Promise<string> {
  const slug = slugEmailLocal(email)
  const hash = await sha1Hex('localution-partner-v1:' + email.toLowerCase())
  // 앞 6자, 숫자 섞인 base36 형태로 변환
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
function CopyButton({ text }: { text: string }) {
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
      {copied ? <><Check size={12} strokeWidth={3} />복사됨</> : <><Copy size={12} strokeWidth={2.5} />복사</>}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// 본문
// ─────────────────────────────────────────────────────────────
export default function PartnerPointsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [code, setCode]       = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')

  // 적립 내역 (추후 API 연동). 지금은 빈 배열.
  const history: { id: string; at: string; type: string; amount: number; memo: string }[] = []

  useEffect(() => {
    let alive = true
    ;(async () => {
      const p = readCookieUser()
      if (!alive) return
      setProfile(p)
      if (p?.email) {
        const c = await buildPartnerCode(p.email)
        if (!alive) return
        setCode(c)
      }
      setLoading(false)
    })()
    return () => { alive = false }
  }, [])

  const link = useMemo(() => (code ? partnerLink(code) : ''), [code])

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
      <div className="min-h-screen bg-[#F8F9FB] flex">
        <Sidebar />
        <main className="flex-1 ml-0 md:ml-[220px] pt-16 md:pt-0 min-w-0">
          <div className="max-w-xl mx-auto pt-20 px-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#FEF3C7] text-[#D97706] mb-4">
              <Gift size={26} />
            </div>
            <h1 className="text-[22px] font-black text-[#191F28] mb-2">파트너 포인트</h1>
            <p className="text-[14px] text-[#4E5968] mb-6">
              로그인 후 내 파트너 코드·링크를 확인하고, 친구를 초대해 포인트를 모아보세요.
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

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-[220px] pt-16 md:pt-0 min-w-0">
        <PageHeader
          icon="🎁"
          title="파트너 포인트"
          subtitle="회원을 등록하고 파트너 포인트를 받으세요"
          variant="blue"
        />

        <div className="max-w-5xl mx-auto pt-6 pb-20 px-4 md:px-8">
          {/* 브레드크럼 */}
          <div className="flex items-center gap-2 text-xs text-[#8B95A1] mb-4">
            <Link href="/dashboard" className="hover:text-[#191F28]">대시보드</Link>
            <ArrowRight size={12} />
            <span className="text-[#3182F6] font-medium">파트너 포인트</span>
          </div>

          {/* 상단 타이틀 */}
          <div className="mb-6">
            <h1 className="text-[22px] md:text-[26px] font-black text-[#191F28] flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-[#FEF3C7] text-[#D97706]">
                <Gift size={18} />
              </span>
              파트너 포인트
            </h1>
            <p className="text-[13px] text-[#4E5968] mt-1.5">
              회원을 등록하고 파트너 포인트를 받으세요
            </p>
          </div>

          {/* 상단 2분할 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
            {/* 좌: 보유 포인트 → 크레딧 전환 */}
            <div className="bg-[#F5F9FF] border-2 border-[#3182F6] rounded-2xl p-5 flex flex-col justify-between min-h-[132px]">
              <p className="text-[12px] text-[#4E5968] font-medium">보유 포인트는 크레딧으로 전환할 수 있어요!</p>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-baseline gap-1">
                  <span className="text-[12px] text-[#4E5968]">보유 포인트</span>
                  <span className="text-[22px] font-black text-[#191F28] ml-2">0<span className="text-[16px] font-bold text-[#3182F6]">P</span></span>
                </div>
                <button
                  disabled
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#3182F6] text-white text-[12px] font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  title="전환 기능 준비 중"
                >
                  크레딧으로 전환하기
                </button>
              </div>
            </div>

            {/* 우: 최대 적립 예상 */}
            <div className="bg-white border border-[#E5E8EB] rounded-2xl p-5 flex flex-col justify-between min-h-[132px]">
              <p className="text-[12px] text-[#4E5968] font-medium">내가 초대한 파트너의 광고 구동이 끝나면</p>
              <p className="text-[14px] text-[#191F28] mt-3">
                최대 <span className="text-[22px] font-black text-[#191F28] ml-1">0<span className="text-[16px] font-bold text-[#3182F6]">P</span></span> <span className="text-[13px] font-medium text-[#4E5968]">받을 수 있어요</span>
              </p>
            </div>
          </div>

          {/* 메인 카피 */}
          <div className="mb-5">
            <h2 className="text-[18px] md:text-[22px] font-black text-[#191F28] leading-snug">
              파트너가 내 링크나 코드로 가입하고 주문하면,
            </h2>
            <h2 className="text-[20px] md:text-[26px] font-black text-[#3182F6] leading-snug">
              주문 금액의 3%를 포인트로!
            </h2>
          </div>

          {/* 코드·링크 카드 */}
          <div className="bg-white border border-[#E5E8EB] rounded-2xl p-5 md:p-6 mb-6 shadow-sm">
            {/* 내 파트너 코드 */}
            <div className="mb-4">
              <label className="block text-[12px] font-bold text-[#191F28] mb-1.5">내 파트너 코드</label>
              <div className="flex items-stretch gap-2">
                <div className="flex-1 min-w-0 flex items-center px-3.5 py-2.5 rounded-lg bg-[#F8F9FB] border border-[#E5E8EB] text-[13px] text-[#4E5968] font-mono select-all">
                  {loading ? <span className="text-[#8B95A1]">불러오는 중…</span> : code || '—'}
                </div>
                {code && <CopyButton text={code} />}
              </div>
            </div>

            {/* 내 파트너 링크 */}
            <div className="mb-5">
              <label className="block text-[12px] font-bold text-[#191F28] mb-1.5">내 파트너 링크</label>
              <div className="flex items-stretch gap-2">
                <div className="flex-1 min-w-0 flex items-center px-3.5 py-2.5 rounded-lg bg-[#F8F9FB] border border-[#E5E8EB] text-[13px] text-[#4E5968] truncate select-all">
                  {loading ? <span className="text-[#8B95A1]">불러오는 중…</span> : link || '—'}
                </div>
                {link && <CopyButton text={link} />}
              </div>
              {link && (
                <div className="mt-1.5 text-[11px] text-[#8B95A1] flex items-center gap-1">
                  <Info size={11} />이 링크로 가입한 회원이 주문하면 3% 포인트로 자동 적립됩니다.
                </div>
              )}
            </div>

            {/* 하단 요약 2분할 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#E5E8EB] bg-[#FAFBFC]">
                <div className="w-9 h-9 rounded-lg bg-white border border-[#E5E8EB] flex items-center justify-center text-[#3182F6]">
                  <Users size={16} />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[12px] text-[#4E5968]">초대한 파트너</span>
                  <span className="text-[17px] font-black text-[#191F28]">0<span className="text-[12px] font-bold text-[#4E5968] ml-0.5">명</span></span>
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#E5E8EB] bg-[#FAFBFC]">
                <div className="w-9 h-9 rounded-lg bg-white border border-[#E5E8EB] flex items-center justify-center text-[#D97706]">
                  <Wallet size={16} />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[12px] text-[#4E5968]">총 수입</span>
                  <span className="text-[17px] font-black text-[#191F28]">0<span className="text-[12px] font-bold text-[#3182F6] ml-0.5">P</span></span>
                </div>
              </div>
            </div>
          </div>

          {/* 파트너 포인트 적립 내역 */}
          <div className="bg-white border border-[#E5E8EB] rounded-2xl shadow-sm mb-6">
            <div className="p-5 md:p-6 flex items-center justify-between flex-wrap gap-3 border-b border-[#F2F4F6]">
              <h3 className="text-[15px] font-black text-[#191F28] flex items-center gap-2">
                <TrendingUp size={15} className="text-[#3182F6]" />
                파트너 포인트 적립 내역
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
                <div className="text-[13px] text-[#4E5968] font-semibold mb-0.5">아직 적립 내역이 없어요</div>
                <div className="text-[12px] text-[#8B95A1]">
                  내 코드·링크를 공유해서 첫 파트너를 초대해보세요.
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
                      <th className="text-right font-semibold px-4 py-2.5">포인트</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map(h => (
                      <tr key={h.id} className="border-t border-[#F2F4F6]">
                        <td className="px-4 py-2.5 text-[#4E5968]">{h.at}</td>
                        <td className="px-4 py-2.5 font-semibold text-[#191F28]">{h.type}</td>
                        <td className="px-4 py-2.5 text-[#4E5968]">{h.memo}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-[#3182F6]">
                          {h.amount > 0 ? '+' : ''}{h.amount}P
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 안내 / FAQ */}
          <div className="bg-[#EFF6FF] border border-[#DBEAFE] rounded-2xl p-5 text-[13px] text-[#1E40AF] leading-relaxed">
            <div className="flex items-start gap-2 mb-2 font-bold">
              <Sparkles size={14} className="mt-0.5" />
              이렇게 활용해보세요
            </div>
            <ul className="space-y-1 list-disc list-inside marker:text-[#3182F6]">
              <li>블로그·인스타·유튜브 설명란에 <b>내 파트너 링크</b>를 상시 걸어두기</li>
              <li>카카오톡 채널·1:1 문의 답변에 <b>파트너 코드</b>를 안내하기</li>
              <li>지인 사장님 온보딩 시 직접 링크를 전달해 주기 → 주문 발생 시 자동 적립</li>
            </ul>
            <div className="mt-3 flex items-center gap-2 text-[12px] text-[#4E5968]">
              <Clock size={12} />
              적립은 결제 확정 후 최대 7일 내 반영됩니다.
            </div>
          </div>
        </div>
        <Footer />
      </main>
    </div>
  )
}
