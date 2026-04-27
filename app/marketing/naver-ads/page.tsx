'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Sidebar from '../../components/Sidebar'
import PageHeader from '../../components/PageHeader'
import Footer from '../../components/Footer'

// ─── 타입 ──────────────────────────────────────────────────────
type VolumeKeyword = {
  relKeyword: string
  monthlyPcQcCnt: number | string
  monthlyMobileQcCnt: number | string
  monthlyAvePcClkCnt: number | string
  monthlyAveMobileClkCnt: number | string
  compIdx: string // '낮음' | '중간' | '높음'
  plAvgDepth: number | string
}

type BidRow = {
  rank: number
  pc: number | null
  mobile: number | null
}

// ─── 숫자 포맷 ──────────────────────────────────────────────────
function fmt(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return '-'
  const n = Number(v)
  if (isNaN(n)) return String(v)
  if (n < 10) return '10 미만'
  return n.toLocaleString('ko-KR')
}

function fmtWon(v: number | null): string {
  if (v === null) return '-'
  return v.toLocaleString('ko-KR') + '원'
}

function compColor(c: string) {
  if (c === '높음') return 'text-[#E11D48] bg-[#FFF1F2]'
  if (c === '중간') return 'text-[#F59E0B] bg-[#FFFBEB]'
  return 'text-[#059669] bg-[#ECFDF5]'
}

// ─── 탭 ────────────────────────────────────────────────────────
type Tab = 'volume' | 'bid' | 'suggest'

export default function NaverAdsPage() {
  const [tab, setTab] = useState<Tab>('volume')

  // volume
  const [volInput, setVolInput]   = useState('')
  const [volData, setVolData]     = useState<VolumeKeyword[]>([])
  const [volLoading, setVolLoading] = useState(false)
  const [volError, setVolError]   = useState<string | null>(null)

  // bid
  const [bidInput, setBidInput]   = useState('')
  const [bidKeyword, setBidKeyword] = useState('')
  const [bidRows, setBidRows]     = useState<BidRow[]>([])
  const [bidLoading, setBidLoading] = useState(false)
  const [bidError, setBidError]   = useState<string | null>(null)

  // suggest
  const [sugInput, setSugInput]   = useState('')
  const [sugData, setSugData]     = useState<VolumeKeyword[]>([])
  const [sugLoading, setSugLoading] = useState(false)
  const [sugError, setSugError]   = useState<string | null>(null)

  // ── 검색량 조회 ──────────────────────────────────────────────
  async function fetchVolume() {
    const kws = volInput.trim()
    if (!kws) return
    setVolLoading(true); setVolError(null); setVolData([])
    try {
      const r = await fetch(`/api/marketing/naver-ads?type=volume&keywords=${encodeURIComponent(kws)}`)
      const j = await r.json()
      if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`)
      setVolData(j.keywords || [])
    } catch (e) {
      setVolError(e instanceof Error ? e.message : '오류 발생')
    } finally {
      setVolLoading(false)
    }
  }

  // ── 입찰가 조회 ──────────────────────────────────────────────
  async function fetchBid() {
    const kw = bidInput.trim()
    if (!kw) return
    setBidLoading(true); setBidError(null); setBidRows([]); setBidKeyword('')
    try {
      const r = await fetch(`/api/marketing/naver-ads?type=bid&keyword=${encodeURIComponent(kw)}`)
      const j = await r.json()
      if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`)
      setBidRows(j.rows || [])
      setBidKeyword(j.keyword || kw)
    } catch (e) {
      setBidError(e instanceof Error ? e.message : '오류 발생')
    } finally {
      setBidLoading(false)
    }
  }

  // ── 키워드 제안 조회 ─────────────────────────────────────────
  async function fetchSuggest() {
    const kw = sugInput.trim()
    if (!kw) return
    setSugLoading(true); setSugError(null); setSugData([])
    try {
      const r = await fetch(`/api/marketing/naver-ads?type=volume&keywords=${encodeURIComponent(kw)}`)
      const j = await r.json()
      if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`)
      // relKeyword가 입력 키워드와 다른 것들만 = 파생 키워드
      const all: VolumeKeyword[] = j.keywords || []
      setSugData(all.filter(k => k.relKeyword !== kw))
    } catch (e) {
      setSugError(e instanceof Error ? e.message : '오류 발생')
    } finally {
      setSugLoading(false)
    }
  }

  const TAB_LIST: { key: Tab; label: string; icon: string; desc: string }[] = [
    { key: 'volume',  label: '검색량 조회',     icon: '📊', desc: '키워드별 PC·모바일 월간 검색량' },
    { key: 'bid',     label: '파워링크 입찰가', icon: '💰', desc: '순위별 PC·모바일 예상 입찰 단가' },
    { key: 'suggest', label: '키워드 확장',     icon: '🔍', desc: '주키워드에서 파생되는 추천 키워드' },
  ]

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Sidebar />
      <div className="md:ml-[220px] flex flex-col min-h-screen">
        <PageHeader
          title="네이버 광고 분석"
          description="파워링크 입찰가·검색량·키워드 확장을 한 곳에서 조회하세요"
        />

        <main className="flex-1 px-4 md:px-6 py-6 max-w-5xl mx-auto w-full space-y-6">

          {/* API 키 안내 배너 */}
          <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl p-4 flex gap-3">
            <span className="text-xl flex-shrink-0">⚠️</span>
            <div className="text-sm text-[#92400E]">
              <p className="font-semibold mb-1">네이버 검색광고 API 키 필요</p>
              <p>
                <strong>.env.local</strong>에 아래 3개를 추가해야 작동합니다.<br/>
                <code className="bg-[#FEF3C7] px-1 rounded text-xs">NAVER_AD_API_KEY</code>{' '}
                <code className="bg-[#FEF3C7] px-1 rounded text-xs">NAVER_AD_SECRET_KEY</code>{' '}
                <code className="bg-[#FEF3C7] px-1 rounded text-xs">NAVER_AD_CUSTOMER_ID</code><br/>
                발급: 네이버 검색광고 → 도구 → API 사용 설정
              </p>
            </div>
          </div>

          {/* 탭 */}
          <div className="grid grid-cols-3 gap-3">
            {TAB_LIST.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={"rounded-2xl p-4 text-left transition-all border-2 " + (tab === t.key ? 'bg-white border-[#3182F6] shadow-md' : 'bg-white border-transparent shadow-sm hover:border-[#DBEAFE]')}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{t.icon}</span>
                  <span className={"text-sm font-bold " + (tab === t.key ? 'text-[#3182F6]' : 'text-[#191F28]')}>{t.label}</span>
                </div>
                <p className="text-[11px] text-[#8B95A1] leading-snug">{t.desc}</p>
              </button>
            ))}
          </div>

          {/* ── 탭 콘텐츠: 검색량 ────────────────────────────────── */}
          {tab === 'volume' && (
            <div className="bg-white rounded-2xl shadow-sm border border-[#E5E8EB] p-5 space-y-5">
              <div>
                <p className="text-sm font-bold text-[#191F28] mb-2">키워드 입력 <span className="text-[#8B95A1] font-normal">(최대 10개, 쉼표로 구분)</span></p>
                <div className="flex gap-2">
                  <input
                    className="flex-1 border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#3182F6]"
                    placeholder="예: 부천맛집, 부천역맛집, 부천시청맛집"
                    value={volInput}
                    onChange={e => setVolInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && fetchVolume()}
                  />
                  <button onClick={fetchVolume} disabled={volLoading || !volInput.trim()}
                    className="px-5 py-2.5 bg-[#3182F6] text-white rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-[#1D6EF5] transition-colors">
                    {volLoading ? '조회 중…' : '조회'}
                  </button>
                </div>
              </div>

              {volError && (
                <div className="bg-[#FFF1F2] border border-[#FECDD3] rounded-xl p-3 text-sm text-[#E11D48]">{volError}</div>
              )}

              {volData.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#F2F4F6]">
                        <th className="text-left py-2.5 px-3 text-[11px] font-bold text-[#8B95A1] w-[180px]">키워드</th>
                        <th className="text-right py-2.5 px-3 text-[11px] font-bold text-[#8B95A1]">PC 검색량</th>
                        <th className="text-right py-2.5 px-3 text-[11px] font-bold text-[#8B95A1]">모바일 검색량</th>
                        <th className="text-right py-2.5 px-3 text-[11px] font-bold text-[#8B95A1]">총 검색량</th>
                        <th className="text-center py-2.5 px-3 text-[11px] font-bold text-[#8B95A1]">경쟁도</th>
                      </tr>
                    </thead>
                    <tbody>
                      {volData.map((row, i) => {
                        const pc = Number(row.monthlyPcQcCnt) || 0
                        const mb = Number(row.monthlyMobileQcCnt) || 0
                        const total = pc + mb
                        return (
                          <tr key={i} className="border-b border-[#F8F9FA] hover:bg-[#F8F9FA] transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-[#191F28]">{row.relKeyword}</td>
                            <td className="py-2.5 px-3 text-right text-[#4E5968]">{fmt(pc)}</td>
                            <td className="py-2.5 px-3 text-right text-[#4E5968]">{fmt(mb)}</td>
                            <td className="py-2.5 px-3 text-right font-semibold text-[#3182F6]">{fmt(total)}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={"text-[11px] font-bold px-2 py-0.5 rounded-full " + compColor(row.compIdx)}>
                                {row.compIdx || '-'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  <p className="text-[11px] text-[#B0B8C1] mt-2 px-1">* 최근 1개월 기준 · 10 미만은 '10 미만'으로 표시</p>
                </div>
              )}

              {!volLoading && volData.length === 0 && !volError && (
                <div className="text-center py-10 text-[#B0B8C1] text-sm">키워드를 입력하고 조회하세요</div>
              )}
            </div>
          )}

          {/* ── 탭 콘텐츠: 파워링크 입찰가 ───────────────────────── */}
          {tab === 'bid' && (
            <div className="bg-white rounded-2xl shadow-sm border border-[#E5E8EB] p-5 space-y-5">
              <div>
                <p className="text-sm font-bold text-[#191F28] mb-2">키워드 입력 <span className="text-[#8B95A1] font-normal">(1개)</span></p>
                <div className="flex gap-2">
                  <input
                    className="flex-1 border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#3182F6]"
                    placeholder="예: 부천맛집"
                    value={bidInput}
                    onChange={e => setBidInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && fetchBid()}
                  />
                  <button onClick={fetchBid} disabled={bidLoading || !bidInput.trim()}
                    className="px-5 py-2.5 bg-[#3182F6] text-white rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-[#1D6EF5] transition-colors">
                    {bidLoading ? '조회 중…' : '조회'}
                  </button>
                </div>
              </div>

              {bidError && (
                <div className="bg-[#FFF1F2] border border-[#FECDD3] rounded-xl p-3 text-sm text-[#E11D48]">{bidError}</div>
              )}

              {bidRows.length > 0 && (
                <div>
                  <p className="text-sm font-bold text-[#191F28] mb-3">
                    <span className="text-[#3182F6]">[{bidKeyword}]</span> 파워링크 입찰가
                  </p>
                  <div className="space-y-2.5">
                    {bidRows.map(row => (
                      <div key={row.rank} className={"rounded-xl border p-4 flex items-center gap-4 " + (row.rank === 1 ? 'border-[#FFD700] bg-[#FFFBEB]' : row.rank <= 3 ? 'border-[#E5E8EB] bg-[#FAFBFF]' : 'border-[#E5E8EB] bg-white')}>
                        <div className={"w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 " + (row.rank === 1 ? 'bg-[#FFD700] text-white' : row.rank <= 3 ? 'bg-[#3182F6] text-white' : 'bg-[#F2F4F6] text-[#8B95A1]')}>
                          {row.rank}
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <div className="bg-[#EFF6FF] rounded-lg px-3 py-2">
                            <p className="text-[10px] text-[#8B95A1] font-semibold mb-0.5">PC</p>
                            <p className="text-sm font-bold text-[#3182F6]">{fmtWon(row.pc)}</p>
                          </div>
                          <div className="bg-[#F0FDF4] rounded-lg px-3 py-2">
                            <p className="text-[10px] text-[#8B95A1] font-semibold mb-0.5">MOBILE</p>
                            <p className="text-sm font-bold text-[#059669]">{fmtWon(row.mobile)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-[#B0B8C1] mt-2 px-1">* 현재 시점 기준 예상 최소 입찰가 · 실제 낙찰가는 경쟁에 따라 다를 수 있음</p>
                </div>
              )}

              {!bidLoading && bidRows.length === 0 && !bidError && (
                <div className="text-center py-10 text-[#B0B8C1] text-sm">키워드를 입력하고 조회하세요</div>
              )}
            </div>
          )}

          {/* ── 탭 콘텐츠: 키워드 확장 ──────────────────────────── */}
          {tab === 'suggest' && (
            <div className="bg-white rounded-2xl shadow-sm border border-[#E5E8EB] p-5 space-y-5">
              <div>
                <p className="text-sm font-bold text-[#191F28] mb-1">주키워드 입력</p>
                <p className="text-xs text-[#8B95A1] mb-2">주키워드 하나를 입력하면 함께 검색되는 파생 키워드와 검색량을 보여줍니다</p>
                <div className="flex gap-2">
                  <input
                    className="flex-1 border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#3182F6]"
                    placeholder="예: 부천맛집"
                    value={sugInput}
                    onChange={e => setSugInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && fetchSuggest()}
                  />
                  <button onClick={fetchSuggest} disabled={sugLoading || !sugInput.trim()}
                    className="px-5 py-2.5 bg-[#3182F6] text-white rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-[#1D6EF5] transition-colors">
                    {sugLoading ? '조회 중…' : '조회'}
                  </button>
                </div>
              </div>

              {sugError && (
                <div className="bg-[#FFF1F2] border border-[#FECDD3] rounded-xl p-3 text-sm text-[#E11D48]">{sugError}</div>
              )}

              {sugData.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#F2F4F6]">
                        <th className="text-left py-2.5 px-3 text-[11px] font-bold text-[#8B95A1]">#</th>
                        <th className="text-left py-2.5 px-3 text-[11px] font-bold text-[#8B95A1]">파생 키워드</th>
                        <th className="text-right py-2.5 px-3 text-[11px] font-bold text-[#8B95A1]">PC</th>
                        <th className="text-right py-2.5 px-3 text-[11px] font-bold text-[#8B95A1]">모바일</th>
                        <th className="text-right py-2.5 px-3 text-[11px] font-bold text-[#8B95A1]">합계</th>
                        <th className="text-center py-2.5 px-3 text-[11px] font-bold text-[#8B95A1]">경쟁도</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sugData
                        .sort((a, b) => (Number(b.monthlyMobileQcCnt) + Number(b.monthlyPcQcCnt)) - (Number(a.monthlyMobileQcCnt) + Number(a.monthlyPcQcCnt)))
                        .map((row, i) => {
                          const pc = Number(row.monthlyPcQcCnt) || 0
                          const mb = Number(row.monthlyMobileQcCnt) || 0
                          return (
                            <tr key={i} className="border-b border-[#F8F9FA] hover:bg-[#F8F9FA] transition-colors">
                              <td className="py-2 px-3 text-[#8B95A1] text-xs">{i + 1}</td>
                              <td className="py-2 px-3 font-semibold text-[#191F28]">{row.relKeyword}</td>
                              <td className="py-2 px-3 text-right text-[#4E5968] text-xs">{fmt(pc)}</td>
                              <td className="py-2 px-3 text-right text-[#4E5968] text-xs">{fmt(mb)}</td>
                              <td className="py-2 px-3 text-right font-semibold text-[#3182F6] text-xs">{fmt(pc + mb)}</td>
                              <td className="py-2 px-3 text-center">
                                <span className={"text-[10px] font-bold px-2 py-0.5 rounded-full " + compColor(row.compIdx)}>
                                  {row.compIdx || '-'}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                  <p className="text-[11px] text-[#B0B8C1] mt-2 px-1">* 검색량 높은 순 정렬 · 블로그·플레이스 콘텐츠 기획 시 활용</p>
                </div>
              )}

              {sugData.length === 0 && !sugLoading && !sugError && (
                <div className="text-center py-10 text-[#B0B8C1] text-sm">주키워드를 입력하면 파생 키워드를 보여줍니다</div>
              )}
            </div>
          )}

        </main>
        <Footer />
      </div>
    </div>
  )
}
