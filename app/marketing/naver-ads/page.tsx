'use client'
export const dynamic = 'force-dynamic'

import { useState, useMemo } from 'react'
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

// ─── 해시태그 모달 ─────────────────────────────────────────────
function HashtagModal({ keywords, onClose }: { keywords: string[]; onClose: () => void }) {
  const [copied, setCopied] = useState<number | null>(null)
  const formats = [
    { label: '형식1', value: keywords.join(' ') },
    { label: '형식2', value: keywords.join(',') },
    { label: '형식3', value: keywords.map(k => '#' + k).join(' ') },
    { label: '형식4', value: keywords.map(k => '#' + k).join(',') },
  ]
  const copy = async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text)
    setCopied(idx); setTimeout(() => setCopied(null), 1500)
  }
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-[#F2F4F6]">
          <div>
            <p className="font-bold text-[#191F28] text-base">해시태그 추출</p>
            <p className="text-xs text-[#8B95A1] mt-0.5">연관 키워드를 해시태그 형식으로 추출할 수 있습니다.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F2F4F6] text-[#8B95A1] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="p-4 flex flex-col gap-2.5">
          {formats.map((f, i) => (
            <div key={i} className="flex items-center gap-2 bg-[#F8F9FA] rounded-xl px-3 py-2.5">
              <span className="text-xs font-semibold text-[#8B95A1] w-12 shrink-0">{f.label}</span>
              <span className="flex-1 text-sm text-[#191F28] truncate font-medium" title={f.value}>
                {f.value.length > 32 ? f.value.slice(0, 32) + '…' : f.value}
              </span>
              <button onClick={() => copy(f.value, i)}
                className={`shrink-0 p-1.5 rounded-lg transition-colors ${copied === i ? 'bg-[#ECFDF5] text-[#12B76A]' : 'hover:bg-[#E5E8EB] text-[#8B95A1]'}`}>
                {copied === i
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                }
              </button>
            </div>
          ))}
        </div>
        <div className="px-4 pb-4">
          <button onClick={() => copy(formats[2].value, 99)}
            className="w-full py-2.5 rounded-xl bg-[#3182F6] text-white text-sm font-semibold hover:bg-[#1B64DA] transition-colors">
            {copied === 99 ? '✓ 복사됨' : '#해시태그 전체 복사'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 정렬 ──────────────────────────────────────────────────────
type SortCol = 'none' | 'pc' | 'mobile' | 'total' | 'comp'
type SortDir = 'asc' | 'desc'

function SortBtn({ col, active, dir, onClick }: { col: SortCol; active: boolean; dir: SortDir; onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex flex-col ml-1 leading-none">
      <svg width="7" height="5" viewBox="0 0 7 5" fill={active && dir === 'asc' ? '#3182F6' : '#C9D0D8'}>
        <path d="M3.5 0L7 5H0L3.5 0Z"/>
      </svg>
      <svg width="7" height="5" viewBox="0 0 7 5" fill={active && dir === 'desc' ? '#3182F6' : '#C9D0D8'} style={{ marginTop: 1 }}>
        <path d="M3.5 5L0 0H7L3.5 5Z"/>
      </svg>
    </button>
  )
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
  const [volChecked, setVolChecked] = useState<Set<number>>(new Set())
  const [volSort, setVolSort]     = useState<SortCol>('none')
  const [volSortDir, setVolSortDir] = useState<SortDir>('desc')
  const [volHashModal, setVolHashModal] = useState(false)

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
  const [sugChecked, setSugChecked] = useState<Set<number>>(new Set())
  const [sugSort, setSugSort]     = useState<SortCol>('none')
  const [sugHashModal, setSugHashModal] = useState(false)
  const [sugSortDir, setSugSortDir] = useState<SortDir>('desc')

  // ── 엑셀(CSV) 다운로드 ───────────────────────────────────────
  function downloadExcel(rows: VolumeKeyword[], checkedIdx: Set<number>, filename: string) {
    const targets = [...checkedIdx].map(i => rows[i]).filter(Boolean)
    if (!targets.length) return
    const header = ['번호', '키워드', 'PC 검색량', '모바일 검색량', '총 검색량', '경쟁도']
    const body = targets.map((row, i) => {
      const pc = Number(row.monthlyPcQcCnt) || 0
      const mb = Number(row.monthlyMobileQcCnt) || 0
      return [String(i + 1), row.relKeyword, String(pc), String(mb), String(pc + mb), row.compIdx || '-']
    })
    const csv = '﻿' + [header, ...body].map(r => r.map(c => '"' + c.replace(/"/g, '""') + '"').join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

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
      const all: VolumeKeyword[] = j.keywords || []

      // 입력 키워드의 토큰을 분리 (2글자 이상 의미 단어만)
      const tokens = kw.replace(/\s+/g, '').match(/[가-힣a-z0-9]{2,}/gi) || [kw]

      // 관련 키워드만 필터: 토큰 중 하나라도 포함 + 입력 키워드 자신 제외
      const related = all.filter(k => {
        if (k.relKeyword === kw) return false
        const rk = k.relKeyword.replace(/\s+/g, '')
        return tokens.some(t => rk.includes(t))
      })

      // 총 검색량 내림차순, 최대 30개
      const sorted = related
        .sort((a, b) => ((Number(b.monthlyPcQcCnt) || 0) + (Number(b.monthlyMobileQcCnt) || 0)) - ((Number(a.monthlyPcQcCnt) || 0) + (Number(a.monthlyMobileQcCnt) || 0)))
        .slice(0, 30)

      setSugData(sorted)
    } catch (e) {
      setSugError(e instanceof Error ? e.message : '오류 발생')
    } finally {
      setSugLoading(false)
    }
  }

  const TAB_LIST: { key: Tab; label: string; icon: string; desc: string }[] = [
    { key: 'volume',  label: '검색량 조회',     icon: '📊', desc: '키워드별 PC·모바일 월간 검색량' },
    { key: 'suggest', label: '키워드 확장',     icon: '🔍', desc: '주키워드에서 파생되는 추천 키워드' },
    { key: 'bid',     label: '파워링크 입찰가', icon: '💰', desc: '순위별 PC·모바일 예상 입찰 단가' },
  ]

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Sidebar />
      <div className="md:ml-[220px] flex flex-col min-h-screen">
        <PageHeader
          icon="📊"
          title="네이버 광고 분석"
          subtitle="파워링크 입찰가·검색량·키워드 확장을 한 곳에서 조회하세요"
        />

        <main className="flex-1 px-4 md:px-6 py-6 max-w-5xl mx-auto w-full space-y-6">

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
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-[#191F28]">키워드 입력 <span className="text-[#8B95A1] font-normal">(최대 10개, 쉼표로 구분)</span></p>
                  {volChecked.size > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#8B95A1]"><strong className="text-[#3182F6]">{volChecked.size}개</strong> 선택됨</span>
                      <button onClick={() => setVolHashModal(true)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F2F4F6] hover:bg-[#EFF6FF] text-[#3182F6] text-xs font-bold transition-colors border border-[#E5E8EB] hover:border-[#3182F6]">
                        #
                      </button>
                      <button
                        onClick={() => {
                          const compRank: Record<string, number> = { '높음': 3, '중간': 2, '낮음': 1, '': 0 }
                          const sorted = [...volData].sort((a, b) => {
                            if (volSort === 'none') return 0
                            const av = volSort === 'pc' ? Number(a.monthlyPcQcCnt) || 0 : volSort === 'mobile' ? Number(a.monthlyMobileQcCnt) || 0 : volSort === 'total' ? (Number(a.monthlyPcQcCnt) || 0) + (Number(a.monthlyMobileQcCnt) || 0) : compRank[a.compIdx] ?? 0
                            const bv = volSort === 'pc' ? Number(b.monthlyPcQcCnt) || 0 : volSort === 'mobile' ? Number(b.monthlyMobileQcCnt) || 0 : volSort === 'total' ? (Number(b.monthlyPcQcCnt) || 0) + (Number(b.monthlyMobileQcCnt) || 0) : compRank[b.compIdx] ?? 0
                            return volSortDir === 'desc' ? bv - av : av - bv
                          })
                          downloadExcel(sorted, volChecked, '네이버광고_검색량_' + new Date().toISOString().slice(0,10) + '.csv')
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F2F4F6] hover:bg-[#ECFDF5] text-[#12B76A] text-xs font-semibold transition-colors border border-[#E5E8EB] hover:border-[#12B76A]"
                        title="엑셀 다운로드">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
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

              {volData.length > 0 && (() => {
                const compRank: Record<string, number> = { '높음': 3, '중간': 2, '낮음': 1, '': 0 }
                const sorted = [...volData].sort((a, b) => {
                  if (volSort === 'none') return 0
                  const av = volSort === 'pc' ? Number(a.monthlyPcQcCnt) || 0
                    : volSort === 'mobile' ? Number(a.monthlyMobileQcCnt) || 0
                    : volSort === 'total' ? (Number(a.monthlyPcQcCnt) || 0) + (Number(a.monthlyMobileQcCnt) || 0)
                    : compRank[a.compIdx] ?? 0
                  const bv = volSort === 'pc' ? Number(b.monthlyPcQcCnt) || 0
                    : volSort === 'mobile' ? Number(b.monthlyMobileQcCnt) || 0
                    : volSort === 'total' ? (Number(b.monthlyPcQcCnt) || 0) + (Number(b.monthlyMobileQcCnt) || 0)
                    : compRank[b.compIdx] ?? 0
                  return volSortDir === 'desc' ? bv - av : av - bv
                })
                const allChecked = sorted.length > 0 && sorted.every((_, i) => volChecked.has(i))
                const toggleSort = (col: SortCol) => {
                  if (volSort === col) setVolSortDir(d => d === 'desc' ? 'asc' : 'desc')
                  else { setVolSort(col); setVolSortDir('desc') }
                }
                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-[#E5E8EB] bg-[#F8F9FA]">
                          <th className="py-2.5 px-3 w-10">
                            <button onClick={() => {
                              if (allChecked) setVolChecked(new Set())
                              else setVolChecked(new Set(sorted.map((_, i) => i)))
                            }} className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${allChecked ? 'bg-[#3182F6] border-[#3182F6]' : 'border-[#D1D6DB] hover:border-[#3182F6]'}`}>
                              {allChecked && <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><polyline points="2 5 4.5 7.5 8.5 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </button>
                          </th>
                          <th className="text-center py-2.5 px-2 text-[11px] font-bold text-[#8B95A1] w-10">번호</th>
                          <th className="text-left py-2.5 px-3 text-[11px] font-bold text-[#8B95A1]">키워드</th>
                          <th className="text-right py-2.5 px-3 text-[11px] font-bold text-[#8B95A1] whitespace-nowrap">
                            PC 검색량
                            <SortBtn col="pc" active={volSort === 'pc'} dir={volSortDir} onClick={() => toggleSort('pc')} />
                          </th>
                          <th className="text-right py-2.5 px-3 text-[11px] font-bold text-[#8B95A1] whitespace-nowrap">
                            모바일 검색량
                            <SortBtn col="mobile" active={volSort === 'mobile'} dir={volSortDir} onClick={() => toggleSort('mobile')} />
                          </th>
                          <th className="text-right py-2.5 px-3 text-[11px] font-bold text-[#8B95A1] whitespace-nowrap">
                            총 검색량
                            <SortBtn col="total" active={volSort === 'total'} dir={volSortDir} onClick={() => toggleSort('total')} />
                          </th>
                          <th className="text-center py-2.5 px-3 text-[11px] font-bold text-[#8B95A1] whitespace-nowrap">
                            경쟁도
                            <SortBtn col="comp" active={volSort === 'comp'} dir={volSortDir} onClick={() => toggleSort('comp')} />
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((row, i) => {
                          const pc = Number(row.monthlyPcQcCnt) || 0
                          const mb = Number(row.monthlyMobileQcCnt) || 0
                          const total = pc + mb
                          const checked = volChecked.has(i)
                          return (
                            <tr key={i} className={`border-b border-[#F2F4F6] transition-colors ${checked ? 'bg-[#EFF6FF]' : 'hover:bg-[#F8F9FA]'}`}>
                              <td className="py-2.5 px-3">
                                <button onClick={() => setVolChecked(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n })}
                                  className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${checked ? 'bg-[#3182F6] border-[#3182F6]' : 'border-[#D1D6DB] hover:border-[#3182F6]'}`}>
                                  {checked && <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><polyline points="2 5 4.5 7.5 8.5 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                </button>
                              </td>
                              <td className="py-2.5 px-2 text-center text-xs text-[#B0B8C1] font-medium">{i + 1}</td>
                              <td className="py-2.5 px-3 font-semibold text-[#191F28]">{row.relKeyword}</td>
                              <td className="py-2.5 px-3 text-right text-[#4E5968]">{fmt(pc)}</td>
                              <td className="py-2.5 px-3 text-right text-[#4E5968]">{fmt(mb)}</td>
                              <td className="py-2.5 px-3 text-right font-semibold text-[#3182F6]">{fmt(total)}</td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${compColor(row.compIdx)}`}>
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
                )
              })()}

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
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-bold text-[#191F28]">주키워드 입력</p>
                  {sugChecked.size > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#8B95A1]"><strong className="text-[#3182F6]">{sugChecked.size}개</strong> 선택됨</span>
                      <button onClick={() => setSugHashModal(true)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F2F4F6] hover:bg-[#EFF6FF] text-[#3182F6] text-xs font-bold transition-colors border border-[#E5E8EB] hover:border-[#3182F6]">
                        #
                      </button>
                      <button
                        onClick={() => {
                          const compRank: Record<string, number> = { '높음': 3, '중간': 2, '낮음': 1, '': 0 }
                          const sorted = [...sugData].sort((a, b) => {
                            const col = sugSort === 'none' ? 'total' : sugSort
                            const av = col === 'pc' ? Number(a.monthlyPcQcCnt) || 0 : col === 'mobile' ? Number(a.monthlyMobileQcCnt) || 0 : col === 'total' ? (Number(a.monthlyPcQcCnt) || 0) + (Number(a.monthlyMobileQcCnt) || 0) : compRank[a.compIdx] ?? 0
                            const bv = col === 'pc' ? Number(b.monthlyPcQcCnt) || 0 : col === 'mobile' ? Number(b.monthlyMobileQcCnt) || 0 : col === 'total' ? (Number(b.monthlyPcQcCnt) || 0) + (Number(b.monthlyMobileQcCnt) || 0) : compRank[b.compIdx] ?? 0
                            return sugSortDir === 'desc' ? bv - av : av - bv
                          })
                          downloadExcel(sorted, sugChecked, '네이버광고_키워드확장_' + new Date().toISOString().slice(0,10) + '.csv')
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F2F4F6] hover:bg-[#ECFDF5] text-[#12B76A] text-xs font-semibold transition-colors border border-[#E5E8EB] hover:border-[#12B76A]"
                        title="엑셀 다운로드">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
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

              {sugData.length > 0 && (() => {
                const compRank: Record<string, number> = { '높음': 3, '중간': 2, '낮음': 1, '': 0 }
                const sorted = [...sugData].sort((a, b) => {
                  const col = sugSort === 'none' ? 'total' : sugSort
                  const av = col === 'pc' ? Number(a.monthlyPcQcCnt) || 0
                    : col === 'mobile' ? Number(a.monthlyMobileQcCnt) || 0
                    : col === 'total' ? (Number(a.monthlyPcQcCnt) || 0) + (Number(a.monthlyMobileQcCnt) || 0)
                    : compRank[a.compIdx] ?? 0
                  const bv = col === 'pc' ? Number(b.monthlyPcQcCnt) || 0
                    : col === 'mobile' ? Number(b.monthlyMobileQcCnt) || 0
                    : col === 'total' ? (Number(b.monthlyPcQcCnt) || 0) + (Number(b.monthlyMobileQcCnt) || 0)
                    : compRank[b.compIdx] ?? 0
                  return sugSortDir === 'desc' ? bv - av : av - bv
                })
                const allChecked = sorted.length > 0 && sorted.every((_, i) => sugChecked.has(i))
                const toggleSort = (col: SortCol) => {
                  if (sugSort === col) setSugSortDir(d => d === 'desc' ? 'asc' : 'desc')
                  else { setSugSort(col); setSugSortDir('desc') }
                }
                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-[#E5E8EB] bg-[#F8F9FA]">
                          <th className="py-2.5 px-3 w-10">
                            <button onClick={() => {
                              if (allChecked) setSugChecked(new Set())
                              else setSugChecked(new Set(sorted.map((_, i) => i)))
                            }} className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${allChecked ? 'bg-[#3182F6] border-[#3182F6]' : 'border-[#D1D6DB] hover:border-[#3182F6]'}`}>
                              {allChecked && <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><polyline points="2 5 4.5 7.5 8.5 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </button>
                          </th>
                          <th className="text-center py-2.5 px-2 text-[11px] font-bold text-[#8B95A1] w-10">#</th>
                          <th className="text-left py-2.5 px-3 text-[11px] font-bold text-[#8B95A1]">파생 키워드</th>
                          <th className="text-right py-2.5 px-3 text-[11px] font-bold text-[#8B95A1] whitespace-nowrap">
                            PC 검색량
                            <SortBtn col="pc" active={sugSort === 'pc'} dir={sugSortDir} onClick={() => toggleSort('pc')} />
                          </th>
                          <th className="text-right py-2.5 px-3 text-[11px] font-bold text-[#8B95A1] whitespace-nowrap">
                            모바일 검색량
                            <SortBtn col="mobile" active={sugSort === 'mobile'} dir={sugSortDir} onClick={() => toggleSort('mobile')} />
                          </th>
                          <th className="text-right py-2.5 px-3 text-[11px] font-bold text-[#8B95A1] whitespace-nowrap">
                            총 검색량
                            <SortBtn col="total" active={sugSort === 'total' || sugSort === 'none'} dir={sugSortDir} onClick={() => toggleSort('total')} />
                          </th>
                          <th className="text-center py-2.5 px-3 text-[11px] font-bold text-[#8B95A1] whitespace-nowrap">
                            경쟁도
                            <SortBtn col="comp" active={sugSort === 'comp'} dir={sugSortDir} onClick={() => toggleSort('comp')} />
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((row, i) => {
                          const pc = Number(row.monthlyPcQcCnt) || 0
                          const mb = Number(row.monthlyMobileQcCnt) || 0
                          const checked = sugChecked.has(i)
                          return (
                            <tr key={i} className={`border-b border-[#F2F4F6] transition-colors ${checked ? 'bg-[#EFF6FF]' : 'hover:bg-[#F8F9FA]'}`}>
                              <td className="py-2 px-3">
                                <button onClick={() => setSugChecked(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n })}
                                  className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${checked ? 'bg-[#3182F6] border-[#3182F6]' : 'border-[#D1D6DB] hover:border-[#3182F6]'}`}>
                                  {checked && <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><polyline points="2 5 4.5 7.5 8.5 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                </button>
                              </td>
                              <td className="py-2 px-2 text-center text-xs text-[#B0B8C1] font-medium">{i + 1}</td>
                              <td className="py-2 px-3 font-semibold text-[#191F28]">{row.relKeyword}</td>
                              <td className="py-2 px-3 text-right text-[#4E5968] text-xs">{fmt(pc)}</td>
                              <td className="py-2 px-3 text-right text-[#4E5968] text-xs">{fmt(mb)}</td>
                              <td className="py-2 px-3 text-right font-semibold text-[#3182F6] text-xs">{fmt(pc + mb)}</td>
                              <td className="py-2 px-3 text-center">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${compColor(row.compIdx)}`}>
                                  {row.compIdx || '-'}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    <p className="text-[11px] text-[#B0B8C1] mt-2 px-1">* 총 검색량 높은 순 기본 정렬 · 블로그·플레이스 콘텐츠 기획 시 활용</p>
                  </div>
                )
              })()}

              {sugData.length === 0 && !sugLoading && !sugError && (
                <div className="text-center py-10 text-[#B0B8C1] text-sm">주키워드를 입력하면 파생 키워드를 보여줍니다</div>
              )}
            </div>
          )}

        </main>
        <Footer />
      </div>

      {/* 해시태그 모달 - 검색량 */}
      {volHashModal && (() => {
        const compRank: Record<string, number> = { '높음': 3, '중간': 2, '낮음': 1, '': 0 }
        const sorted = [...volData].sort((a, b) => {
          if (volSort === 'none') return 0
          const av = volSort === 'pc' ? Number(a.monthlyPcQcCnt) || 0 : volSort === 'mobile' ? Number(a.monthlyMobileQcCnt) || 0 : volSort === 'total' ? (Number(a.monthlyPcQcCnt) || 0) + (Number(a.monthlyMobileQcCnt) || 0) : compRank[a.compIdx] ?? 0
          const bv = volSort === 'pc' ? Number(b.monthlyPcQcCnt) || 0 : volSort === 'mobile' ? Number(b.monthlyMobileQcCnt) || 0 : volSort === 'total' ? (Number(b.monthlyPcQcCnt) || 0) + (Number(b.monthlyMobileQcCnt) || 0) : compRank[b.compIdx] ?? 0
          return volSortDir === 'desc' ? bv - av : av - bv
        })
        const kws = [...volChecked].map(i => sorted[i]?.relKeyword).filter(Boolean)
        return <HashtagModal keywords={kws} onClose={() => setVolHashModal(false)} />
      })()}

      {/* 해시태그 모달 - 키워드 확장 */}
      {sugHashModal && (() => {
        const compRank: Record<string, number> = { '높음': 3, '중간': 2, '낮음': 1, '': 0 }
        const sorted = [...sugData].sort((a, b) => {
          const col = sugSort === 'none' ? 'total' : sugSort
          const av = col === 'pc' ? Number(a.monthlyPcQcCnt) || 0 : col === 'mobile' ? Number(a.monthlyMobileQcCnt) || 0 : col === 'total' ? (Number(a.monthlyPcQcCnt) || 0) + (Number(a.monthlyMobileQcCnt) || 0) : compRank[a.compIdx] ?? 0
          const bv = col === 'pc' ? Number(b.monthlyPcQcCnt) || 0 : col === 'mobile' ? Number(b.monthlyMobileQcCnt) || 0 : col === 'total' ? (Number(b.monthlyPcQcCnt) || 0) + (Number(b.monthlyMobileQcCnt) || 0) : compRank[b.compIdx] ?? 0
          return sugSortDir === 'desc' ? bv - av : av - bv
        })
        const kws = [...sugChecked].map(i => sorted[i]?.relKeyword).filter(Boolean)
        return <HashtagModal keywords={kws} onClose={() => setSugHashModal(false)} />
      })()}
    </div>
  )
}
