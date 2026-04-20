'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'
import PageHeader from '../components/PageHeader'
import { toast } from '../lib/toast'
import { buildSettingsHref } from '../lib/settings-tabs'

const LS_STORE_INFO = 'localution.store_info'
const LS_QR_CUSTOM_URL = 'localution.qr_custom_url'
const LS_PLATFORM_LINKS = 'localution.platform_links'

interface StoreInfo {
  name: string
  category: string
  location: string
  naverUrl: string
  connected: boolean
  naverPlaceId?: string
  linkedSource?: 'platform_links' | 'manual'
}

const DEFAULT_STORE: StoreInfo = {
  name: '',
  category: '',
  location: '',
  naverUrl: '',
  connected: false,
  naverPlaceId: '',
  linkedSource: 'manual',
}

// /settings?tab=connect 에서 저장한 네이버 링크 읽어오기
function readNaverLink(): {
  externalId: string
  externalName: string
  externalUrl: string
  address?: string
  category?: string
} | null {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(LS_PLATFORM_LINKS) : null
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      const n = parsed.find((l: any) => l?.platform === 'naver')
      return n ? {
        externalId: n.externalId || n.placeId || '',
        externalName: n.externalName || n.name || '',
        externalUrl: n.externalUrl || n.url || '',
        address: n.address,
        category: n.category,
      } : null
    }
    if (parsed && typeof parsed === 'object' && parsed.naver) {
      const n = parsed.naver
      return {
        externalId: n.externalId || n.placeId || '',
        externalName: n.externalName || n.name || '',
        externalUrl: n.externalUrl || n.url || '',
        address: n.address,
        category: n.category,
      }
    }
    return null
  } catch {
    return null
  }
}

// ── QR 생성기 (Google Charts API 활용) ──
function QRCodeImage({ url, size = 200 }: { url: string; size?: number }) {
  const [imgSrc, setImgSrc] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    const encoded = encodeURIComponent(url)
    const src = 'https://chart.googleapis.com/chart?cht=qr&chs=' + size + 'x' + size + '&chl=' + encoded + '&choe=UTF-8&chld=M|2'
    setImgSrc(src)
    setError(false)
  }, [url, size])

  if (!url) {
    return (
      <div
        className="flex items-center justify-center bg-[#F8F9FA] border-2 border-dashed border-[#E5E8EB] rounded-xl text-[#C9CDD2] text-xs"
        style={{ width: size, height: size }}
      >
        URL을 입력하세요
      </div>
    )
  }

  if (error || !imgSrc) {
    return (
      <div
        className="flex items-center justify-center bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-[#B91C1C] text-xs p-3"
        style={{ width: size, height: size }}
      >
        QR 생성 실패
      </div>
    )
  }

  return (
    <img
      src={imgSrc}
      alt="QR Code"
      width={size}
      height={size}
      className="block rounded"
      onError={() => setError(true)}
    />
  )
}

function safeFileName(raw: string): string {
  const trimmed = (raw || '업체').trim()
  return trimmed
    .replace(/[\/\\:*?"<>|]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 40) || '업체'
}

function downloadQR(url: string, fileName: string) {
  if (!url) { toast.error('QR로 만들 URL이 없습니다.'); return }
  const size = 600
  const encoded = encodeURIComponent(url)
  const src = 'https://chart.googleapis.com/chart?cht=qr&chs=' + size + 'x' + size + '&chl=' + encoded + '&choe=UTF-8&chld=M|2'
  const link = document.createElement('a')
  link.href = src
  link.download = fileName + '.png'
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function openPrintTemplate(opts: {
  url: string
  storeName: string
}) {
  const { url, storeName } = opts
  if (!url) { toast.error('QR로 만들 URL이 없습니다.'); return }
  const qrSize = 600
  const qrSrc = 'https://chart.googleapis.com/chart?cht=qr&chs=' + qrSize + 'x' + qrSize + '&chl=' + encodeURIComponent(url) + '&choe=UTF-8&chld=M|2'

  const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + storeName + ' - 리뷰 QR</title>' +
    '<style>' +
    '@page { size: A4; margin: 0; }' +
    'body { margin: 0; padding: 0; font-family: -apple-system, "Pretendard", "Malgun Gothic", sans-serif; }' +
    '.page { width: 210mm; height: 297mm; padding: 20mm; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: space-between; background: #fff; }' +
    '.top { text-align: center; width: 100%; }' +
    '.badge { display: inline-block; padding: 6px 18px; border-radius: 999px; background: #FEF3C7; color: #92400E; font-size: 14px; font-weight: 700; margin-bottom: 18px; }' +
    'h1 { font-size: 44px; font-weight: 900; color: #191F28; margin: 0 0 10px; letter-spacing: -1px; }' +
    '.sub { font-size: 20px; color: #4E5968; font-weight: 600; margin: 0 0 6px; }' +
    '.qr-box { padding: 24px; background: #fff; border: 3px solid #191F28; border-radius: 24px; margin: 10px 0; }' +
    '.qr-box img { display: block; width: 140mm; height: 140mm; }' +
    '.scan-hint { font-size: 22px; font-weight: 800; color: #3182F6; margin: 10px 0 0; }' +
    '.reward-sub { font-size: 18px; color: #4E5968; font-weight: 600; text-align: center; }' +
    '.bottom { width: 100%; text-align: center; padding-top: 8px; border-top: 2px dashed #E5E8EB; }' +
    '.steps { display: flex; justify-content: center; gap: 28px; margin: 12px 0 6px; font-size: 14px; color: #4E5968; }' +
    '.step { font-weight: 600; }' +
    '.step b { display: inline-block; width: 22px; height: 22px; line-height: 22px; border-radius: 50%; background: #3182F6; color: #fff; font-size: 12px; margin-right: 6px; }' +
    '.footer { font-size: 12px; color: #8B95A1; margin-top: 6px; }' +
    '@media print { .no-print { display: none !important; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }' +
    '.print-btn { position: fixed; top: 12px; right: 12px; padding: 10px 18px; background: #3182F6; color: #fff; border: none; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; }' +
    '</style></head><body>' +
    '<button class="print-btn no-print" onclick="window.print()">🖨️ 인쇄하기</button>' +
    '<div class="page">' +
    '<div class="top">' +
    '<div class="badge">📸 QR 찍고 리뷰 남기기</div>' +
    '<h1>' + storeName + '</h1>' +
    '<p class="sub">이용해주셔서 감사합니다 💛</p>' +
    '</div>' +
    '<div class="qr-box"><img src="' + qrSrc + '" alt="QR"/></div>' +
    '<p class="scan-hint">📱 카메라로 QR을 찍어주세요</p>' +
    '<div class="reward-sub">리뷰 남겨주시면 감사하겠습니다 🙏</div>' +
    '<div class="bottom">' +
    '<div class="steps">' +
    '<div class="step"><b>1</b>QR 스캔</div>' +
    '<div class="step"><b>2</b>리뷰 작성</div>' +
    '<div class="step"><b>3</b>혜택 받기</div>' +
    '</div>' +
    '<p class="footer">Powered by Localution · 로컬루션</p>' +
    '</div>' +
    '</div>' +
    '<script>setTimeout(function(){ window.print(); }, 500);</script>' +
    '</body></html>'

  const w = window.open('', '_blank')
  if (w) {
    w.document.write(html)
    w.document.close()
  } else {
    toast.error('팝업이 차단되었습니다. 브라우저 팝업 허용 후 다시 시도하세요.')
  }
}

async function persistStoreToServer(storeInfo: StoreInfo): Promise<{ ok: boolean; slug?: string }> {
  if (!storeInfo || !storeInfo.name) return { ok: false }
  try {
    const slug = makeStoreId(storeInfo.name)
    const res = await fetch('/api/stores/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug,
        name: storeInfo.name,
        category: storeInfo.category,
        location: storeInfo.location,
        naver_place_id: storeInfo.naverPlaceId,
        naver_url: storeInfo.naverUrl,
      }),
    })
    const j = await res.json().catch(() => ({ ok: false }))
    return { ok: !!j.ok, slug: j.slug }
  } catch {
    return { ok: false }
  }
}

function makeStoreId(name: string): string {
  let result = ''
  const lower = name.toLowerCase()
  for (let i = 0; i < lower.length; i++) {
    const c = lower.charCodeAt(i)
    const isAlpha = (c >= 97 && c <= 122)
    const isDigit = (c >= 48 && c <= 57)
    const isKorean = (c >= 0xAC00 && c <= 0xD7A3)
    result += (isAlpha || isDigit || isKorean) ? lower[i] : '-'
  }
  while (result.includes('--')) result = result.split('--').join('-')
  if (result.startsWith('-')) result = result.slice(1)
  if (result.endsWith('-')) result = result.slice(0, -1)
  return result || 'store-' + Date.now()
}

// 리뷰 URL 생성 - 연동된 업체 정보를 쿼리파라미터에 담아 /review/[slug] 로 연결
function buildReviewUrl(storeInfo: StoreInfo): string {
  if (!storeInfo.connected || !storeInfo.name) return ''
  const storeId = makeStoreId(storeInfo.name)
  const base = (typeof window !== 'undefined' ? window.location.origin : 'https://www.localution.co.kr')
  const params = new URLSearchParams()
  if (storeInfo.name) params.set('n', storeInfo.name)
  if (storeInfo.category) params.set('t', storeInfo.category)
  if (storeInfo.location) params.set('a', storeInfo.location)
  if (storeInfo.naverUrl) params.set('naver', storeInfo.naverUrl)
  if (storeInfo.naverPlaceId) params.set('pid', storeInfo.naverPlaceId)
  const qs = params.toString()
  return base + '/review/' + storeId + (qs ? '?' + qs : '')
}

// URL 유효성 체크
function isValidUrl(raw: string): boolean {
  if (!raw) return false
  try {
    const u = new URL(raw.trim())
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

function normalizeUrl(raw: string): string {
  const t = (raw || '').trim()
  if (!t) return ''
  if (/^https?:\/\//i.test(t)) return t
  return 'https://' + t
}

// ─────────────────────────────────────────────────────
// QR 리뷰 생성 통계 (기존 유지)
// ─────────────────────────────────────────────────────
interface ReviewStatRecord {
  ts: number
  storeId: string
  storeName: string
  gender: 'F' | 'M' | '-'
  age: '10s' | '20s' | '30s' | '40s' | '50s+'
  tone: 'warm' | 'short' | 'detail' | 'casual'
  length: 'short' | 'mid' | 'long'
  photoCount: number
  hasReceipt: boolean
  hasPhoto: boolean
}

function ReviewStatsSection({ storeName }: { storeName: string }) {
  const [records, setRecords] = useState<ReviewStatRecord[]>([])
  const [filterMine, setFilterMine] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const load = () => {
      try {
        const raw = window.localStorage.getItem('localution.review_stats')
        if (!raw) { setRecords([]); return }
        const arr = JSON.parse(raw)
        setRecords(Array.isArray(arr) ? arr : [])
      } catch { setRecords([]) }
    }
    load()
    const onStorage = (e: StorageEvent) => { if (e.key === 'localution.review_stats') load() }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const filtered = (filterMine && storeName)
    ? records.filter(r => (r.storeName || '').includes(storeName) || storeName.includes(r.storeName || ''))
    : records

  const ageKeys: ReviewStatRecord['age'][] = ['10s', '20s', '30s', '40s', '50s+']
  const genderKeys: ReviewStatRecord['gender'][] = ['F', 'M', '-']
  const crossTab: Record<string, number> = {}
  for (const a of ageKeys) for (const g of genderKeys) crossTab[a + '|' + g] = 0
  for (const r of filtered) {
    const key = r.age + '|' + r.gender
    if (key in crossTab) crossTab[key] += 1
  }

  const toneCounts: Record<string, number> = { warm: 0, short: 0, detail: 0, casual: 0 }
  const lengthCounts: Record<string, number> = { short: 0, mid: 0, long: 0 }
  for (const r of filtered) {
    if (r.tone in toneCounts) toneCounts[r.tone] += 1
    if (r.length in lengthCounts) lengthCounts[r.length] += 1
  }

  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  const days7: { label: string; count: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * day)
    const label = (d.getMonth() + 1) + '/' + d.getDate()
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    const end = start + day
    const count = filtered.filter(r => r.ts >= start && r.ts < end).length
    days7.push({ label, count })
  }
  const maxDay = Math.max(1, ...days7.map(d => d.count))
  const maxCell = Math.max(1, ...Object.values(crossTab))
  const total = filtered.length

  const topCombo = Object.entries(crossTab).sort((a, b) => b[1] - a[1])[0]
  const topComboLabel = topCombo && topCombo[1] > 0
    ? (() => {
        const [age, gender] = topCombo[0].split('|')
        const gLabel = gender === 'F' ? '여성' : gender === 'M' ? '남성' : '미표시'
        return age.replace('s+', '+').replace('s', '대') + ' ' + gLabel
      })()
    : '데이터 부족'

  const genderLabel: Record<string, string> = { F: '여성', M: '남성', '-': '미표시' }
  const toneLabel: Record<string, string> = { warm: '따뜻하게', short: '심플하게', detail: '자세하게', casual: '친근하게' }
  const lengthLabel: Record<string, string> = { short: '짧음', mid: '중간', long: '길게' }

  return (
    <section className="mt-6 bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-[#E5E8EB]">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <div className="min-w-0">
          <h2 className="text-lg md:text-xl font-black text-[#191F28] flex items-center gap-2">
            <span className="text-xl">📊</span> QR 리뷰 생성 통계
          </h2>
          <p className="text-xs text-[#8B95A1] mt-0.5">
            /review QR 스캔 후 고객이 선택한 성별·연령·톤·길이 누적 집계
          </p>
        </div>
        <div className="flex items-center gap-1 bg-[#F2F4F6] rounded-lg p-0.5">
          <button
            onClick={() => setFilterMine(true)}
            className={'px-3 py-1.5 rounded-md text-xs font-bold transition-colors ' + (filterMine ? 'bg-white shadow text-[#3182F6]' : 'text-[#8B95A1]')}
          >내 매장</button>
          <button
            onClick={() => setFilterMine(false)}
            className={'px-3 py-1.5 rounded-md text-xs font-bold transition-colors ' + (!filterMine ? 'bg-white shadow text-[#3182F6]' : 'text-[#8B95A1]')}
          >전체</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-5">
        <div className="bg-[#EFF6FF] rounded-xl p-3 border border-[#BFDBFE]">
          <p className="text-[10px] text-[#3182F6] font-bold mb-1">누적 생성</p>
          <p className="text-2xl font-black text-[#1B64DA]">{total}<span className="text-xs ml-1 font-bold">건</span></p>
        </div>
        <div className="bg-[#F0FDF4] rounded-xl p-3 border border-[#BBF7D0]">
          <p className="text-[10px] text-[#059669] font-bold mb-1">최근 7일</p>
          <p className="text-2xl font-black text-[#047857]">{days7.reduce((a, b) => a + b.count, 0)}<span className="text-xs ml-1 font-bold">건</span></p>
        </div>
        <div className="bg-[#FEF3C7] rounded-xl p-3 border border-[#FDE68A]">
          <p className="text-[10px] text-[#B45309] font-bold mb-1">TOP 세그먼트</p>
          <p className="text-base font-black text-[#92400E] leading-tight truncate">{topComboLabel}</p>
        </div>
        <div className="bg-[#FAE8FF] rounded-xl p-3 border border-[#F5D0FE]">
          <p className="text-[10px] text-[#86198F] font-bold mb-1">사진 포함</p>
          <p className="text-2xl font-black text-[#701A75]">
            {total === 0 ? 0 : Math.round(filtered.filter(r => r.hasPhoto).length / total * 100)}<span className="text-xs ml-1 font-bold">%</span>
          </p>
        </div>
      </div>

      {total === 0 ? (
        <div className="bg-[#F8F9FA] rounded-xl p-8 text-center">
          <div className="text-3xl mb-2">📭</div>
          <p className="text-sm text-[#4E5968] font-semibold mb-1">아직 수집된 제출 데이터가 없어요</p>
          <p className="text-xs text-[#8B95A1]">고객이 QR을 스캔해 리뷰를 생성하면 자동으로 쌓여요</p>
        </div>
      ) : (
        <>
          <div className="mb-5">
            <h3 className="text-sm font-black text-[#191F28] mb-2">성별 × 연령 분포</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="text-left p-2 text-[#8B95A1] font-bold">연령</th>
                    {genderKeys.map(g => (
                      <th key={g} className="text-center p-2 text-[#8B95A1] font-bold">{genderLabel[g]}</th>
                    ))}
                    <th className="text-center p-2 text-[#8B95A1] font-bold">합계</th>
                  </tr>
                </thead>
                <tbody>
                  {ageKeys.map(age => {
                    const rowTotal = genderKeys.reduce((a, g) => a + crossTab[age + '|' + g], 0)
                    return (
                      <tr key={age} className="border-t border-[#F2F4F6]">
                        <td className="p-2 font-bold text-[#4E5968]">{age.replace('s+', '+').replace('s', '대')}</td>
                        {genderKeys.map(g => {
                          const v = crossTab[age + '|' + g]
                          const opacity = v === 0 ? 0 : 0.15 + (v / maxCell) * 0.85
                          return (
                            <td key={g} className="p-2 text-center">
                              <div
                                className="inline-flex items-center justify-center min-w-[36px] py-1 rounded-md font-bold"
                                style={{
                                  background: v === 0 ? '#F8F9FA' : 'rgba(49, 130, 246, ' + opacity + ')',
                                  color: v === 0 ? '#C9CCCF' : (opacity > 0.5 ? '#ffffff' : '#1B64DA'),
                                }}
                              >{v}</div>
                            </td>
                          )
                        })}
                        <td className="p-2 text-center font-black text-[#191F28]">{rowTotal}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div className="bg-[#F8F9FA] rounded-xl p-4">
              <h3 className="text-sm font-black text-[#191F28] mb-2">말투 선호도</h3>
              {(Object.keys(toneCounts) as (keyof typeof toneCounts)[]).map(k => {
                const v = toneCounts[k] || 0
                const pct = total === 0 ? 0 : Math.round(v / total * 100)
                return (
                  <div key={k} className="mb-2 last:mb-0">
                    <div className="flex justify-between text-[11px] mb-0.5">
                      <span className="font-bold text-[#4E5968]">{toneLabel[k]}</span>
                      <span className="text-[#8B95A1]">{v}건 ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-[#E5E8EB] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: pct + '%', background: '#3182F6' }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="bg-[#F8F9FA] rounded-xl p-4">
              <h3 className="text-sm font-black text-[#191F28] mb-2">길이 선호도</h3>
              {(Object.keys(lengthCounts) as (keyof typeof lengthCounts)[]).map(k => {
                const v = lengthCounts[k] || 0
                const pct = total === 0 ? 0 : Math.round(v / total * 100)
                return (
                  <div key={k} className="mb-2 last:mb-0">
                    <div className="flex justify-between text-[11px] mb-0.5">
                      <span className="font-bold text-[#4E5968]">{lengthLabel[k]}</span>
                      <span className="text-[#8B95A1]">{v}건 ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-[#E5E8EB] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: pct + '%', background: '#10B981' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-black text-[#191F28] mb-2">최근 7일 생성 추이</h3>
            <div className="flex items-end gap-1 h-24">
              {days7.map(d => {
                const h = d.count === 0 ? 4 : Math.max(8, (d.count / maxDay) * 100)
                return (
                  <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-bold text-[#4E5968]">{d.count}</span>
                    <div
                      className="w-full rounded-t"
                      style={{ height: h + '%', background: d.count === 0 ? '#E5E8EB' : 'linear-gradient(180deg, #3182F6 0%, #1B64DA 100%)' }}
                    />
                    <span className="text-[10px] text-[#8B95A1]">{d.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </section>
  )
}

// ─────────────────────────────────────────────────────
// 메인
// ─────────────────────────────────────────────────────
export default function QRAdmin() {
  const [storeInfo, setStoreInfo] = useState<StoreInfo>(DEFAULT_STORE)
  const [storeEdit, setStoreEdit] = useState(false)
  const [storeDraft, setStoreDraft] = useState<StoreInfo>(DEFAULT_STORE)
  const [naverLinked, setNaverLinked] = useState(false)

  // QR 생성기 상태
  const [qrMode, setQrMode] = useState<'linked' | 'custom'>('linked')
  const [customUrl, setCustomUrl] = useState('')
  const [urlCopied, setUrlCopied] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    try {
      const rawStore = localStorage.getItem(LS_STORE_INFO)
      if (rawStore) setStoreInfo(JSON.parse(rawStore))
      const rawCustom = localStorage.getItem(LS_QR_CUSTOM_URL)
      if (rawCustom) setCustomUrl(rawCustom)
      const naver = readNaverLink()
      setNaverLinked(!!naver)
      // 연동돼 있으면 기본은 '자동 연동' 모드
      if (!naver && !rawStore) setQrMode('custom')
    } catch (_) {}
  }, [])

  // 네이버 플레이스 연결 정보에서 원클릭 불러오기
  const importFromNaverLink = () => {
    const naver = readNaverLink()
    if (!naver) {
      toast.warn('네이버 플레이스 연결 정보가 없습니다.\n설정 > 플랫폼 연결에서 먼저 네이버를 연결해주세요.')
      return
    }
    const next: StoreInfo = {
      name: naver.externalName || storeInfo.name,
      category: naver.category || storeInfo.category,
      location: naver.address || storeInfo.location,
      naverUrl: naver.externalUrl || storeInfo.naverUrl,
      connected: true,
      naverPlaceId: naver.externalId,
      linkedSource: 'platform_links',
    }
    setStoreInfo(next)
    persistStoreToServer(next).catch(() => {})
    setStoreDraft(next)
    try { localStorage.setItem(LS_STORE_INFO, JSON.stringify(next)) } catch (_) {}
    setQrMode('linked')
    toast.success('네이버 플레이스 정보를 불러왔어요. QR이 자동으로 생성됐습니다.')
  }

  const saveStoreInfo = () => {
    const next = { ...storeDraft, connected: !!(storeDraft.name && storeDraft.location) }
    setStoreInfo(next)
    try { localStorage.setItem(LS_STORE_INFO, JSON.stringify(next)) } catch (_) {}
    setStoreEdit(false)
    if (next.connected) {
      persistStoreToServer(next).catch(() => {})
      setQrMode('linked')
    }
  }

  const saveCustomUrl = (raw: string) => {
    setCustomUrl(raw)
    try { localStorage.setItem(LS_QR_CUSTOM_URL, raw) } catch (_) {}
  }

  const linkedUrl = buildReviewUrl(storeInfo)
  const normalizedCustom = normalizeUrl(customUrl)
  const activeUrl = qrMode === 'linked' ? linkedUrl : (isValidUrl(normalizedCustom) ? normalizedCustom : '')

  const copyUrl = async () => {
    if (!activeUrl) return
    try {
      await navigator.clipboard.writeText(activeUrl)
      setUrlCopied(true)
      setTimeout(() => setUrlCopied(false), 1500)
    } catch {
      // fallback
      try {
        const ta = document.createElement('textarea')
        ta.value = activeUrl
        ta.style.position = 'fixed'
        ta.style.left = '-9999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        setUrlCopied(true)
        setTimeout(() => setUrlCopied(false), 1500)
      } catch {
        toast.error('복사에 실패했습니다.')
      }
    }
  }

  const storeId = storeInfo.connected ? makeStoreId(storeInfo.name) : ''
  const previewSrc = qrMode === 'linked' ? linkedUrl : ''

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex">
      <Sidebar />
      <main className="flex-1 md:ml-[220px] pt-14 md:pt-0 min-w-0">
        <PageHeader
          icon="🧾"
          title="QR 관리"
          subtitle="QR 한 번 스캔 → 고객이 바로 5점 리뷰 — 매장 QR 생성기"
          variant="success"
        />

        <div className="max-w-5xl mx-auto p-4 md:p-6 w-full">

          {/* 상태 요약 배너 */}
          <div className="flex gap-3 mb-5 flex-wrap">
            {storeInfo.connected ? (
              <div className="bg-[#F0FDF4] rounded-2xl px-5 py-3.5 shadow-sm flex items-center gap-2 border border-[#BBF7D0]">
                <span className="text-lg">🟢</span>
                <div className="min-w-0">
                  <p className="text-xs text-[#059669] font-semibold">업체 연동됨</p>
                  <p className="text-xs text-[#4E5968] truncate max-w-[240px]">{storeInfo.name}</p>
                </div>
              </div>
            ) : (
              <div className="bg-[#FFFBEB] rounded-2xl px-5 py-3.5 shadow-sm flex items-center gap-2 border border-[#FDE68A]">
                <span className="text-lg">⚠️</span>
                <div>
                  <p className="text-xs text-[#D97706] font-semibold">업체 미연동</p>
                  <p className="text-xs text-[#4E5968]">아래에서 네이버 연동 먼저 하세요</p>
                </div>
              </div>
            )}
            {storeInfo.connected && storeId && (
              <div className="bg-[#EFF6FF] rounded-2xl px-5 py-3.5 shadow-sm flex items-center gap-2 border border-[#BFDBFE] min-w-0">
                <span className="text-lg">📱</span>
                <div className="min-w-0">
                  <p className="text-xs text-[#3182F6] font-semibold">내 리뷰 페이지</p>
                  <p className="text-xs font-mono text-[#4E5968] truncate max-w-[280px]">/review/{storeId}</p>
                </div>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════
               1. 네이버 업체 연동 카드 (축소형)
             ═══════════════════════════════════════════════════════ */}
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-5">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#F0FDF4] flex items-center justify-center text-base flex-shrink-0">🟢</div>
                <div className="min-w-0">
                  <h3 className="font-bold text-[#191F28]">네이버 업체 연동</h3>
                  <p className="text-xs text-[#8B95A1]">
                    {naverLinked ? '플랫폼 연결 감지됨 · 원클릭으로 불러오세요' : '연동 시 QR이 자동으로 리뷰 페이지에 연결됩니다'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {naverLinked && (
                  <button
                    onClick={importFromNaverLink}
                    className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-[#03C75A] text-white hover:opacity-90 whitespace-nowrap">
                    ⚡ 플레이스 불러오기
                  </button>
                )}
                {!naverLinked && (
                  <a href={buildSettingsHref('connect', { platform: 'naver' })}
                    className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-[#EFF6FF] text-[#3182F6] hover:bg-[#DBEAFE] whitespace-nowrap">
                    + 네이버 연결하기
                  </a>
                )}
                {storeInfo.connected && !storeEdit && (
                  <button
                    onClick={() => { setStoreDraft(storeInfo); setStoreEdit(true) }}
                    className="text-[11px] text-[#3182F6] font-semibold hover:underline whitespace-nowrap px-2">
                    수정
                  </button>
                )}
              </div>
            </div>

            {!storeEdit && !storeInfo.connected ? (
              <div>
                <p className="text-sm text-[#4E5968] mb-4 leading-relaxed">
                  업체 정보를 연결하면 <span className="text-[#3182F6] font-semibold">QR 스캔 시 바로 내 리뷰 페이지</span>로 연결돼요.
                </p>
                <button
                  onClick={() => { setStoreDraft(DEFAULT_STORE); setStoreEdit(true) }}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-[#BFDBFE] text-[#3182F6] font-semibold text-sm hover:bg-[#EFF6FF] transition-colors">
                  + 업체 정보 직접 입력
                </button>
              </div>
            ) : storeEdit ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#4E5968] mb-1">상호명 *</label>
                  <input
                    value={storeDraft.name}
                    onChange={e => setStoreDraft(p => ({ ...p, name: e.target.value }))}
                    placeholder="예: 하랑커피"
                    className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#3182F6] transition-colors"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-[#4E5968] mb-1">업종</label>
                    <input
                      value={storeDraft.category}
                      onChange={e => setStoreDraft(p => ({ ...p, category: e.target.value }))}
                      placeholder="예: 카페"
                      className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#3182F6] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#4E5968] mb-1">지역 *</label>
                    <input
                      value={storeDraft.location}
                      onChange={e => setStoreDraft(p => ({ ...p, location: e.target.value }))}
                      placeholder="예: 부천"
                      className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#3182F6] transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#4E5968] mb-1">네이버 플레이스 URL <span className="font-normal">(선택)</span></label>
                  <input
                    value={storeDraft.naverUrl}
                    onChange={e => setStoreDraft(p => ({ ...p, naverUrl: e.target.value }))}
                    placeholder="https://naver.me/..."
                    className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#3182F6] transition-colors"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setStoreEdit(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB] transition-colors">
                    취소
                  </button>
                  <button
                    onClick={saveStoreInfo}
                    disabled={!storeDraft.name || !storeDraft.location}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      storeDraft.name && storeDraft.location
                        ? 'bg-[#059669] text-white hover:bg-[#047857]'
                        : 'bg-[#F2F4F6] text-[#8B95A1] cursor-not-allowed'
                    }`}>
                    연동하기
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-[#F0FDF4] rounded-xl border border-[#BBF7D0]">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="w-2 h-2 rounded-full bg-[#059669] flex-shrink-0" />
                  <span className="font-bold text-[#191F28] text-sm">{storeInfo.name}</span>
                  {storeInfo.linkedSource === 'platform_links' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#03C75A] text-white font-bold">
                      네이버 플레이스 연동
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#4E5968] pl-4">
                  {[storeInfo.category, storeInfo.location].filter(Boolean).join(' · ')}
                </p>
                {storeInfo.naverPlaceId && (
                  <p className="text-[10px] text-[#8B95A1] pl-4 mt-0.5">
                    Place ID: <span className="font-mono text-[#4E5968]">{storeInfo.naverPlaceId}</span>
                  </p>
                )}
                {storeInfo.naverUrl && (
                  <a href={storeInfo.naverUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-[#3182F6] pl-4 hover:underline block mt-0.5">
                    네이버 플레이스 보기 →
                  </a>
                )}
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════
               2. QR 생성기 (핵심)
             ═══════════════════════════════════════════════════════ */}
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">📱</span>
              <h3 className="font-bold text-[#191F28]">QR 생성기</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#3182F6] font-bold">naver 스타일</span>
            </div>
            <p className="text-xs text-[#8B95A1] mb-4">
              URL을 직접 넣거나, 네이버 플레이스 연동 시 자동으로 내 리뷰 페이지 URL이 들어갑니다.
            </p>

            {/* 모드 탭 */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#F2F4F6] rounded-xl mb-5">
              <button
                onClick={() => setQrMode('linked')}
                disabled={!storeInfo.connected}
                className={`py-2.5 rounded-lg text-xs md:text-sm font-bold transition-colors ${
                  qrMode === 'linked'
                    ? 'bg-white shadow text-[#059669]'
                    : !storeInfo.connected ? 'text-[#C9CDD2] cursor-not-allowed' : 'text-[#8B95A1] hover:text-[#4E5968]'
                }`}>
                🟢 플레이스 자동 연동 {storeInfo.connected && <span className="text-[10px] font-normal ml-1">(추천)</span>}
              </button>
              <button
                onClick={() => setQrMode('custom')}
                className={`py-2.5 rounded-lg text-xs md:text-sm font-bold transition-colors ${
                  qrMode === 'custom' ? 'bg-white shadow text-[#3182F6]' : 'text-[#8B95A1] hover:text-[#4E5968]'
                }`}>
                ✏️ URL 직접 입력
              </button>
            </div>

            {/* 모드별 입력 영역 */}
            {qrMode === 'linked' ? (
              <div className="mb-5">
                {storeInfo.connected ? (
                  <div className="p-4 bg-[#F0FDF4] rounded-xl border border-[#BBF7D0]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm">⚡</span>
                      <p className="text-xs font-bold text-[#059669]">연동된 리뷰 페이지 URL</p>
                    </div>
                    <p className="text-xs text-[#4E5968] break-all font-mono bg-white rounded-lg p-2.5 border border-[#BBF7D0]">
                      {linkedUrl}
                    </p>
                    <p className="text-[11px] text-[#8B95A1] mt-2 leading-relaxed">
                      고객이 QR을 스캔하면 네이버 연동 정보(상호·업종·지역·Place ID)가 자동으로 리뷰 페이지에 세팅됩니다.
                    </p>
                  </div>
                ) : (
                  <div className="p-5 bg-[#F8F9FA] rounded-xl text-center">
                    <div className="text-2xl mb-1">🔌</div>
                    <p className="text-sm text-[#4E5968] font-semibold mb-1">업체가 아직 연동되지 않았어요</p>
                    <p className="text-xs text-[#8B95A1] mb-3">위 카드에서 네이버 플레이스를 먼저 연결하세요.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-5">
                <label className="block text-xs font-semibold text-[#4E5968] mb-1.5">QR로 만들 URL *</label>
                <input
                  type="url"
                  value={customUrl}
                  onChange={e => saveCustomUrl(e.target.value)}
                  placeholder="https://smartplace.naver.com/... 또는 https://www.instagram.com/..."
                  className="w-full border-2 border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] transition-colors font-mono"
                />
                {customUrl && !isValidUrl(normalizedCustom) && (
                  <p className="text-[11px] text-[#DC2626] mt-1.5">
                    ⚠️ 올바른 URL 형식이 아닙니다 (http:// 또는 https:// 로 시작해야 함)
                  </p>
                )}
                {customUrl && isValidUrl(normalizedCustom) && (
                  <p className="text-[11px] text-[#059669] mt-1.5">
                    ✓ 유효한 URL · 아래 QR이 이 주소로 연결됩니다
                  </p>
                )}
                {/* 빠른 입력 프리셋 */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <span className="text-[10px] text-[#8B95A1] font-bold self-center">빠른 입력:</span>
                  {storeInfo.connected && (
                    <button
                      onClick={() => saveCustomUrl(linkedUrl)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-[#F0FDF4] text-[#059669] border border-[#BBF7D0] hover:bg-[#DCFCE7] font-semibold">
                      내 리뷰 페이지
                    </button>
                  )}
                  {storeInfo.naverUrl && (
                    <button
                      onClick={() => saveCustomUrl(storeInfo.naverUrl)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-[#EFF6FF] text-[#3182F6] border border-[#BFDBFE] hover:bg-[#DBEAFE] font-semibold">
                      네이버 플레이스
                    </button>
                  )}
                  <button
                    onClick={() => saveCustomUrl('')}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-[#F2F4F6] text-[#8B95A1] hover:bg-[#E5E8EB] font-semibold">
                    지우기
                  </button>
                </div>
              </div>
            )}

            {/* QR + 액션 */}
            <div className="flex flex-col md:flex-row gap-6 items-start border-t border-[#F2F4F6] pt-5">
              {/* QR 이미지 */}
              <div className="p-4 bg-white rounded-2xl border-2 border-[#E5E8EB] shadow-sm shrink-0 mx-auto md:mx-0">
                <QRCodeImage url={activeUrl} size={200} />
              </div>

              {/* 정보 + 버튼 */}
              <div className="flex-1 min-w-0 w-full space-y-3">
                <div>
                  <p className="text-[11px] text-[#8B95A1] font-bold mb-1">생성된 QR URL</p>
                  <div className="flex items-center gap-1.5">
                    <p className="flex-1 text-xs text-[#3182F6] break-all font-mono bg-[#F8FAFF] rounded-lg p-2.5 border border-[#E5E8EB] min-h-[42px]">
                      {activeUrl || <span className="text-[#C9CDD2]">URL이 설정되면 여기에 표시됩니다</span>}
                    </p>
                    <button
                      onClick={copyUrl}
                      disabled={!activeUrl}
                      className={`shrink-0 px-3 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                        urlCopied ? 'bg-[#059669] text-white' :
                        activeUrl ? 'bg-[#EFF6FF] text-[#3182F6] hover:bg-[#DBEAFE]' : 'bg-[#F2F4F6] text-[#C9CDD2] cursor-not-allowed'
                      }`}>
                      {urlCopied ? '✓ 복사됨' : '📋 복사'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => downloadQR(activeUrl, safeFileName(storeInfo.name || 'qr') + '-review-qr')}
                    disabled={!activeUrl}
                    className={`py-3 rounded-xl text-sm font-bold transition-colors ${
                      activeUrl ? 'bg-[#3182F6] text-white hover:bg-[#1B64DA]' : 'bg-[#F2F4F6] text-[#C9CDD2] cursor-not-allowed'
                    }`}>
                    📥 PNG 저장
                  </button>
                  <button
                    onClick={() => openPrintTemplate({ url: activeUrl, storeName: storeInfo.name || '매장' })}
                    disabled={!activeUrl}
                    className={`py-3 rounded-xl text-sm font-bold transition-colors ${
                      activeUrl ? 'bg-[#12B76A] text-white hover:bg-[#0E9655]' : 'bg-[#F2F4F6] text-[#C9CDD2] cursor-not-allowed'
                    }`}>
                    🖨️ A4 인쇄용
                  </button>
                </div>

                {qrMode === 'linked' && storeInfo.connected && (
                  <button
                    onClick={() => setShowPreview(v => !v)}
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-white border border-[#E5E8EB] text-[#4E5968] hover:bg-[#F8F9FA] transition-colors">
                    {showPreview ? '🙈 리뷰 페이지 미리보기 닫기' : '👁️ 리뷰 페이지 미리보기 열기'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════
               3. 리뷰 페이지 미리보기 (iframe)
             ═══════════════════════════════════════════════════════ */}
          {showPreview && qrMode === 'linked' && storeInfo.connected && previewSrc && (
            <div className="bg-white rounded-2xl p-6 shadow-sm mb-5">
              <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                <div>
                  <h3 className="font-bold text-[#191F28] flex items-center gap-2">
                    <span>👁️</span> 리뷰 페이지 미리보기
                  </h3>
                  <p className="text-xs text-[#8B95A1] mt-0.5">고객이 QR 스캔 시 보게 될 페이지 (실제 화면)</p>
                </div>
                <a
                  href={previewSrc}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-[#EFF6FF] text-[#3182F6] hover:bg-[#DBEAFE] whitespace-nowrap">
                  새 창에서 열기 ↗
                </a>
              </div>
              <div className="relative bg-[#F2F4F6] rounded-xl p-3 border border-[#E5E8EB]">
                <iframe
                  src={previewSrc}
                  title="리뷰 페이지 미리보기"
                  className="w-full bg-white rounded-lg border border-[#E5E8EB]"
                  style={{ height: '680px' }}
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
                />
              </div>
              <p className="text-[11px] text-[#8B95A1] mt-2 text-center">
                ※ 실제 배포 페이지가 iframe으로 로드됩니다. QR 스캔 경험과 동일해요.
              </p>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
               4. QR 리뷰 생성 통계
             ═══════════════════════════════════════════════════════ */}
          <ReviewStatsSection storeName={storeInfo.name} />

        </div>
        <Footer />
      </main>
    </div>
  )
}
