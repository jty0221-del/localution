'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'
import PageHeader from '../components/PageHeader'
import { toast } from '../lib/toast'
import { buildSettingsHref } from '../lib/settings-tabs'

const LS_QR_SETTINGS   = 'localution.qr_settings'
const LS_QR_LIST       = 'localution.qr_list'
const LS_STORE_INFO    = 'localution.store_info'
const LS_QR_CUSTOM_URL = 'localution.qr_custom_url'
const LS_QR_MODE       = 'localution.qr_mode'

interface QRSettings {
  mainKeyword: string
  subKeywords: string[]
  subKwInput: string
  rewardType: string
  rewardValue: string
  autoGenerate: boolean
}

interface StoreInfo {
  name: string
  category: string
  location: string
  naverUrl: string
  connected: boolean
  // 플랫폼 연동 메타 (localution.platform_links 에서 가져옴)
  naverPlaceId?: string
  linkedSource?: 'platform_links' | 'manual'
}

interface QRCode {
  id: string
  name: string
  purpose: string
  scans: number
  reviews: number
  createdAt: string
  active: boolean
  keyword: string
}

const DEFAULT_SETTINGS: QRSettings = {
  mainKeyword: '',
  subKeywords: [],
  subKwInput: '',
  rewardType: 'none',
  rewardValue: '',
  autoGenerate: true,
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
const LS_PLATFORM_LINKS = 'localution.platform_links'
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
    // array 포맷 (/settings?tab=connect 에서 저장)
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
    // object 포맷 (dashboard)
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

const INITIAL_QR_LIST: QRCode[] = [
  { id: '1', name: '입구 리뷰 QR', purpose: 'review', scans: 0, reviews: 0, createdAt: '2025-12-01', active: true, keyword: '' },
  { id: '2', name: '테이블 QR #1', purpose: 'review', scans: 0, reviews: 0, createdAt: '2025-12-10', active: true, keyword: '' },
]

const PURPOSE_OPTIONS = [
  { value: 'review',   label: '리뷰 유도',   icon: '⭐', desc: '네이버·구글 리뷰 작성' },
  { value: 'menu',     label: '디지털 메뉴', icon: '📋', desc: 'QR로 메뉴판 연결' },
  { value: 'event',    label: '쿠폰·이벤트', icon: '🎁', desc: '할인 쿠폰 / 이벤트 페이지' },
  { value: 'sns',      label: 'SNS 팔로우',  icon: '📸', desc: '인스타·카카오 연결' },
]

// ─── QR 코드 SVG 생성 (더미 패턴) ────────────────────────────────
function QRPreview({ text, size = 120 }: { text: string; size?: number }) {
  const seed = text.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const cells = 21
  const cellSize = size / cells
  const pattern: boolean[][] = Array.from({ length: cells }, (_, r) =>
    Array.from({ length: cells }, (_, c) => {
      const inFinder = (r < 7 && c < 7) || (r < 7 && c >= cells - 7) || (r >= cells - 7 && c < 7)
      if (inFinder) {
        const lr = r % 7, lc = c % 7
        return (lr === 0 || lr === 6 || lc === 0 || lc === 6 || (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4))
      }
      return ((seed * (r * cells + c + 1)) % 3) !== 0
    })
  )
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
      <rect width={size} height={size} fill="white" rx="4" />
      {pattern.map((row, r) => row.map((filled, c) => filled ? (
        <rect key={`${r}-${c}`} x={c * cellSize} y={r * cellSize}
          width={cellSize} height={cellSize} fill="#191F28" />
      ) : null))}
    </svg>
  )
}


// ── SEO 키워드 자동 추천 엔진 ──
const CATEGORY_KW_MAP: Record<string, string[]> = {
  '카페': ['카페', '커피', '디저트', '브런치카페', '분위기좋은카페'],
  '음식점': ['맛집', '한식', '술집', '데이트코스', '회식장소'],
  '한식': ['맛집', '한식당', '한정식', '백반', '가정식'],
  '중식': ['중국집', '짜장면', '중화요리', '짬뽕맛집'],
  '일식': ['초밥', '라멘', '일식당', '오마카세', '회'],
  '양식': ['파스타', '스테이크', '브런치', '이탈리안'],
  '치킨': ['치킨', '치맥', '배달맛집', '야식'],
  '고기': ['고깃집', '삼겹살', '소고기', '회식장소'],
  '술집': ['술집', '호프', '이자카야', '와인바', '칵테일바'],
  '미용실': ['미용실', '헤어샵', '펌', '염색', '커트'],
  '네일': ['네일샵', '젤네일', '네일아트', '손톱관리'],
  '피부관리': ['피부관리', '에스테틱', '피부과', '관리샵'],
  '헬스': ['헬스장', 'PT', '운동', '다이어트', '피트니스'],
  '학원': ['학원', '과외', '교육', '입시', '공부'],
  '병원': ['병원', '의원', '진료', '건강검진'],
  '약국': ['약국', '건강', '비타민'],
  '꽃집': ['꽃집', '플라워샵', '꽃배달', '꽃다발'],
  '세탁': ['세탁소', '드라이클리닝', '빨래'],
  '인테리어': ['인테리어', '리모델링', '시공'],
}

function generateSeoKeywords(location: string, category: string, storeName: string): string[] {
  const results: string[] = []
  const loc = location.trim()
  const cat = category.trim()

  // 1. 기본: 지역+업종 조합
  if (loc && cat) {
    results.push(loc + cat)
    results.push(loc + ' ' + cat)
  }

  // 2. 카테고리 매핑 키워드
  const matchedCat = Object.keys(CATEGORY_KW_MAP).find(k => cat.includes(k))
  if (matchedCat && loc) {
    const mapped = CATEGORY_KW_MAP[matchedCat]
    mapped.forEach(kw => {
      const combined = loc + kw
      if (!results.includes(combined)) results.push(combined)
    })
  }

  // 3. 매장명 기반
  if (storeName && loc) {
    results.push(loc + ' ' + storeName)
  }

  // 최대 8개까지
  return results.slice(0, 8)
}


// ── QR 코드 생성기 (Google Charts API 활용) ──
function QRCodeImage({ url, size = 180 }: { url: string; size?: number }) {
  const [imgSrc, setImgSrc] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    // Google Chart API로 QR 생성
    const encoded = encodeURIComponent(url)
    const src = 'https://chart.googleapis.com/chart?cht=qr&chs=' + size + 'x' + size + '&chl=' + encoded + '&choe=UTF-8&chld=M|2'
    setImgSrc(src)
    setError(false)
  }, [url, size])

  if (error || !imgSrc) {
    // 폴백: 더미 QR
    return <QRPreview text={url} size={size} />
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

// 파일명 sanitize — OS·브라우저 호환용
function safeFileName(raw: string): string {
  const trimmed = (raw || '업체').trim()
  // 파일명 금지문자 + 한글·영문·숫자·하이픈만 유지 (공백은 _로)
  return trimmed
    .replace(/[\/\\:*?"<>|]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 40) || '업체'
}

// QR 다운로드 함수
function downloadQR(url: string, fileName: string) {
  const size = 400
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

// A4 매장 부착용 인쇄 템플릿 — 새 창 열고 인쇄 다이얼로그 자동 호출
function openPrintTemplate(opts: {
  url: string
  storeName: string
  keyword?: string
  rewardType?: string
  rewardValue?: string
}) {
  const { url, storeName, keyword = '', rewardType = 'none', rewardValue = '' } = opts
  const qrSize = 600
  const qrSrc = 'https://chart.googleapis.com/chart?cht=qr&chs=' + qrSize + 'x' + qrSize + '&chl=' + encodeURIComponent(url) + '&choe=UTF-8&chld=M|2'
  const rewardLine = rewardType !== 'none' && rewardValue
    ? '<div class="reward">🎁 리뷰 남기면 <b>' + rewardValue.replace(/[<>&]/g, '') + '</b></div>'
    : '<div class="reward-sub">리뷰 남겨주시면 감사하겠습니다 🙏</div>'

  const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + storeName + ' - 리뷰 QR</title>' +
    '<style>' +
    '@page { size: A4; margin: 0; }' +
    'body { margin: 0; padding: 0; font-family: -apple-system, "Pretendard", "Malgun Gothic", sans-serif; }' +
    '.page { width: 210mm; height: 297mm; padding: 20mm; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: space-between; background: #fff; }' +
    '.top { text-align: center; width: 100%; }' +
    '.badge { display: inline-block; padding: 6px 18px; border-radius: 999px; background: #FEF3C7; color: #92400E; font-size: 14px; font-weight: 700; margin-bottom: 18px; }' +
    'h1 { font-size: 44px; font-weight: 900; color: #191F28; margin: 0 0 10px; letter-spacing: -1px; }' +
    '.sub { font-size: 20px; color: #4E5968; font-weight: 600; margin: 0 0 6px; }' +
    '.store { font-size: 16px; color: #8B95A1; margin: 0; }' +
    '.qr-box { padding: 24px; background: #fff; border: 3px solid #191F28; border-radius: 24px; margin: 10px 0; }' +
    '.qr-box img { display: block; width: 140mm; height: 140mm; }' +
    '.scan-hint { font-size: 22px; font-weight: 800; color: #3182F6; margin: 10px 0 0; }' +
    '.reward { background: #FEF3C7; padding: 18px 28px; border-radius: 16px; font-size: 22px; color: #92400E; font-weight: 700; text-align: center; width: 100%; box-sizing: border-box; }' +
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
    (keyword ? '<p class="store">#' + keyword + '</p>' : '') +
    '</div>' +
    '<div class="qr-box"><img src="' + qrSrc + '" alt="QR"/></div>' +
    '<p class="scan-hint">📸 카메라로 QR을 찍어주세요</p>' +
    rewardLine +
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

// 서버(Supabase stores 테이블)에 업체 정보 영구 등록
// /review/[slug] 페이지에서 누가 바로 열어도 업체 데이터로 꾸며지도록
async function persistStoreToServer(
  storeInfo: StoreInfo,
  settings: QRSettings
): Promise<{ ok: boolean; slug?: string }> {
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
        main_keyword: settings?.mainKeyword,
        sub_keywords: settings?.subKeywords,
        reward_type: settings?.rewardType,
        reward_value: settings?.rewardValue,
      }),
    })
    const j = await res.json().catch(() => ({ ok: false }))
    return { ok: !!j.ok, slug: j.slug }
  } catch {
    return { ok: false }
  }
}

// storeId 생성 (상호명 기반 slug)
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

// 리뷰 URL 생성 (네이버 Place ID 포함 시 정확한 리뷰 페이지로 연결)
function buildReviewUrl(storeInfo: StoreInfo, settings: QRSettings): string {
  const storeId = makeStoreId(storeInfo.name)
  const base = (typeof window !== 'undefined' ? window.location.origin : 'https://localution.co.kr')
  const params = new URLSearchParams()
  if (storeInfo.name) params.set('n', storeInfo.name)
  if (storeInfo.category) params.set('t', storeInfo.category)
  // a = 주소·지역 — 리뷰 페이지 헤더에 "카페 · 부천시 원미구" 식으로 노출
  if (storeInfo.location) params.set('a', storeInfo.location)
  if (settings.mainKeyword) params.set('kw', settings.mainKeyword)
  if (storeInfo.naverUrl) params.set('naver', storeInfo.naverUrl)
  // 네이버 Place ID — 리뷰 페이지에서 실제 네이버 리뷰 작성으로 리다이렉트 가능
  if (storeInfo.naverPlaceId) params.set('pid', storeInfo.naverPlaceId)
  if (settings.rewardType !== 'none' && settings.rewardValue) params.set('reward', settings.rewardValue)
  const qs = params.toString()
  return base + '/review/' + storeId + (qs ? '?' + qs : '')
}

// ─── 메인 ─────────────────────────────────────────────────────────
// ──────────────────────────────────────────────
// QR 리뷰 생성 통계 (localStorage: localution.review_stats)
// /review/[storeId] 페이지의 startGenerate 시점에 쌓이는 demographics 집계
// ──────────────────────────────────────────────
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

  // 내 매장 필터 (storeName 부분일치)
  const filtered = (filterMine && storeName)
    ? records.filter(r => (r.storeName || '').includes(storeName) || storeName.includes(r.storeName || ''))
    : records

  // 성별 × 연령 교차 집계
  const ageKeys: ReviewStatRecord['age'][] = ['10s', '20s', '30s', '40s', '50s+']
  const genderKeys: ReviewStatRecord['gender'][] = ['F', 'M', '-']
  const crossTab: Record<string, number> = {}
  for (const a of ageKeys) for (const g of genderKeys) crossTab[a + '|' + g] = 0
  for (const r of filtered) {
    const key = r.age + '|' + r.gender
    if (key in crossTab) crossTab[key] += 1
  }

  // 톤·길이 집계
  const toneCounts: Record<string, number> = { warm: 0, short: 0, detail: 0, casual: 0 }
  const lengthCounts: Record<string, number> = { short: 0, mid: 0, long: 0 }
  for (const r of filtered) {
    if (r.tone in toneCounts) toneCounts[r.tone] += 1
    if (r.length in lengthCounts) lengthCounts[r.length] += 1
  }

  // 최근 7일 추이
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
    <section className="mt-8 bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-[#E5E8EB]">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <div className="min-w-0">
          <h2 className="text-lg md:text-xl font-black text-[#191F28] flex items-center gap-2">
            <span className="text-xl">📊</span> QR 리뷰 생성 통계
          </h2>
          <p className="text-xs text-[#8B95A1] mt-0.5">
            /review QR 스캔 후 고객이 선택한 성별·연령·톤·길이 누적 통계 · 매장별 인사이트
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

      {/* KPI 카드 */}
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
          {/* 성별 × 연령 교차 집계 */}
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
            <p className="text-[10px] text-[#8B95A1] mt-2">셀이 진할수록 많이 선택된 조합 · 마케팅 타겟 설정 참고 자료</p>
          </div>

          {/* 톤 · 길이 선호도 */}
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

          {/* 최근 7일 추이 */}
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

          <p className="text-[10px] text-[#8B95A1] mt-4">
            ※ 현재 데이터는 방문자 브라우저 localStorage 기준 · Supabase 연동 시 전 매장 크로스 집계 가능
          </p>
        </>
      )}
    </section>
  )
}

export default function QRAdmin() {
  const [activeTab, setActiveTab] = useState<'settings' | 'list' | 'stats'>('settings')
  const [settings, setSettings] = useState<QRSettings>(DEFAULT_SETTINGS)
  const [storeInfo, setStoreInfo] = useState<StoreInfo>(DEFAULT_STORE)
  const [storeEdit, setStoreEdit] = useState(false)
  const [storeDraft, setStoreDraft] = useState<StoreInfo>(DEFAULT_STORE)
  const [qrList, setQrList] = useState<QRCode[]>(INITIAL_QR_LIST)
  const [saved, setSaved] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newQR, setNewQR] = useState({ name: '', purpose: 'review', keyword: '' })
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState(false)
  const [previewQR, setPreviewQR] = useState<QRCode | null>(null)
  const [suggestedKws, setSuggestedKws] = useState<string[]>([])
  const kwInputRef = useRef<HTMLInputElement>(null)

  const [naverLinked, setNaverLinked] = useState(false)

  // 21차-1c-A: QR 소스 모드 (자동 연동 vs URL 직접입력)
  const [qrMode, setQrMode] = useState<'linked' | 'custom'>('linked')
  const [customUrl, setCustomUrl] = useState('')

  // 21차-1c-B: 리뷰 페이지 iframe 미리보기 토글
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_QR_SETTINGS)
      if (raw) setSettings(JSON.parse(raw))
      const rawList = localStorage.getItem(LS_QR_LIST)
      if (rawList) setQrList(JSON.parse(rawList))
      const rawStore = localStorage.getItem(LS_STORE_INFO)
      if (rawStore) setStoreInfo(JSON.parse(rawStore))

      // /settings?tab=connect 에서 저장한 네이버 링크 감지
      const naver = readNaverLink()
      setNaverLinked(!!naver)

      // 21차-1c-A: custom URL / 모드 로드
      const rawCustom = localStorage.getItem(LS_QR_CUSTOM_URL)
      if (rawCustom) setCustomUrl(rawCustom)
      const rawMode = localStorage.getItem(LS_QR_MODE)
      if (rawMode === 'custom' || rawMode === 'linked') setQrMode(rawMode)
    } catch (_) {}
  }, [])

  // 21차-1c-A: custom URL 저장
  const saveCustomUrl = (url: string) => {
    setCustomUrl(url)
    try { localStorage.setItem(LS_QR_CUSTOM_URL, url) } catch (_) {}
  }
  const switchQrMode = (mode: 'linked' | 'custom') => {
    setQrMode(mode)
    try { localStorage.setItem(LS_QR_MODE, mode) } catch (_) {}
  }

  // ⚡ 네이버 플레이스 연결 정보에서 자동으로 불러오기
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
    // 네이버 연동 정보를 서버에 즉시 등록 (리뷰 페이지가 slug로 조회 가능하도록)
    persistStoreToServer(next, settings).catch(() => {})
    setStoreDraft(next)
    try { localStorage.setItem(LS_STORE_INFO, JSON.stringify(next)) } catch (_) {}

    // 키워드 자동 추천도 트리거
    if (next.location && next.category) {
      const suggestions = generateSeoKeywords(next.location, next.category, next.name)
      if (suggestions.length > 0 && !settings.mainKeyword) {
        const updated = {
          ...settings,
          mainKeyword: suggestions[0],
          subKeywords: settings.subKeywords.length === 0 ? suggestions.slice(1, 6) : settings.subKeywords,
        }
        saveSettings(updated)
        setSuggestedKws(suggestions)
      }
    }
  }

  function saveSettings(next: QRSettings) {
    setSettings(next)
    try { localStorage.setItem(LS_QR_SETTINGS, JSON.stringify(next)) } catch (_) {}
  }

  function saveSetting<K extends keyof QRSettings>(key: K, value: QRSettings[K]) {
    const next = { ...settings, [key]: value }
    saveSettings(next)
  }

  // ── 서브키워드: 원자적 업데이트 (버그 수정)
  const addSubKw = (raw: string) => {
    const trimmed = raw.replace(/,/g, '').trim()
    if (!trimmed || settings.subKeywords.includes(trimmed) || settings.subKeywords.length >= 5) return
    const next = { ...settings, subKeywords: [...settings.subKeywords, trimmed], subKwInput: '' }
    saveSettings(next)
  }

  const removeSubKw = (kw: string) => {
    const next = { ...settings, subKeywords: settings.subKeywords.filter(k => k !== kw) }
    saveSettings(next)
  }

  const handleSubKwKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addSubKw(settings.subKwInput)
    }
    if (e.key === 'Backspace' && !settings.subKwInput && settings.subKeywords.length > 0) {
      const next = { ...settings, subKeywords: settings.subKeywords.slice(0, -1) }
      saveSettings(next)
    }
  }

  // ── 네이버 업체 연동
  const saveStoreInfo = () => {
    const next = { ...storeDraft, connected: !!(storeDraft.name && storeDraft.location) }
    setStoreInfo(next)
    try { localStorage.setItem(LS_STORE_INFO, JSON.stringify(next)) } catch (_) {}
    setStoreEdit(false)
    // SEO 키워드 자동 추천
    let effectiveSettings = settings
    if (storeDraft.name && storeDraft.location) {
      const suggestions = generateSeoKeywords(storeDraft.location, storeDraft.category, storeDraft.name)
      if (suggestions.length > 0) {
        const mainKw = suggestions[0]
        const subKws = suggestions.slice(1, 6)
        const next2 = {
          ...settings,
          mainKeyword: settings.mainKeyword || mainKw,
          subKeywords: settings.subKeywords.length === 0 ? subKws : settings.subKeywords,
        }
        saveSettings(next2)
        effectiveSettings = next2
        setSuggestedKws(suggestions)
      }
    }
    // Supabase stores 테이블에 영구 저장 — 다른 기기/경로에서 /review/[slug] 접근 시도 데이터 유지
    if (next.connected) {
      persistStoreToServer(next, effectiveSettings).catch(() => {})
    }
  }

  const handleSaveSettings = () => {
    persistStoreToServer(storeInfo, settings).catch(() => {})
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleCreateQR = async () => {
    if (!newQR.name) return
    setCreating(true)
    await new Promise(r => setTimeout(r, 1200))
    const newItem: QRCode = {
      id: Date.now().toString(),
      name: newQR.name,
      purpose: newQR.purpose,
      scans: 0, reviews: 0,
      createdAt: new Date().toISOString().slice(0, 10),
      active: true,
      keyword: newQR.keyword || settings.mainKeyword || '',
    }
    const updated = [newItem, ...qrList]
    setQrList(updated)
    try { localStorage.setItem(LS_QR_LIST, JSON.stringify(updated)) } catch (_) {}
    setCreating(false)
    setCreated(true)
    setTimeout(() => {
      setCreated(false)
      setShowCreate(false)
      setNewQR({ name: '', purpose: 'review', keyword: '' })
      setActiveTab('list')
    }, 1500)
  }

  const toggleQRActive = (id: string) => {
    const updated = qrList.map(q => q.id === id ? { ...q, active: !q.active } : q)
    setQrList(updated)
    try { localStorage.setItem(LS_QR_LIST, JSON.stringify(updated)) } catch (_) {}
  }

  const activeCount = qrList.filter(q => q.active).length
  // 전역 tone은 settings 페이지에서 관리
  const globalTone = typeof window !== 'undefined'
    ? (localStorage.getItem('ai.tone') || 'friendly')
    : 'friendly'

  const toneLabel: Record<string, string> = {
    friendly: '친근하게', formal: '정중하게', casual: '캐주얼하게',
    bright: '밝고 유쾌하게', warm: '따뜻하게', pro: '전문적으로',
    empathy: '공감하며', simple: '간결하게',
  }

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex">
      <Sidebar />
      <main className="flex-1 md:ml-[220px] pt-14 md:pt-0 min-w-0">
        <PageHeader
          icon="🧾"
          title="QR 리뷰 관리"
          subtitle="QR 한 번 스캔 → 고객이 바로 5점 리뷰 — 매장·테이블별 생성기"
          variant="success"
        />

        <div className="max-w-5xl mx-auto p-4 md:p-6 w-full">

        {/* 상태 요약 */}
        <div className="flex gap-3 mb-6 flex-wrap">
          {storeInfo.connected ? (
            <div className="bg-[#F0FDF4] rounded-2xl px-5 py-3.5 shadow-sm flex items-center gap-2 border border-[#BBF7D0]">
              <span className="text-lg">🟢</span>
              <div className="min-w-0">
                <p className="text-xs text-[#059669] font-semibold">업체 연동됨</p>
                <p className="text-xs text-[#4E5968] truncate max-w-[200px]">{storeInfo.name}</p>
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
          <div className="bg-[#EFF6FF] rounded-2xl px-5 py-3.5 shadow-sm flex items-center gap-2 border border-[#BFDBFE]">
            <span className="text-lg">🤖</span>
            <div>
              <p className="text-xs text-[#3182F6] font-semibold">AI 리뷰 톤</p>
              <p className="text-xs font-semibold text-[#4E5968]">{toneLabel[globalTone] || '친근하게'}</p>
            </div>
          </div>
          {/* 21차-1c-C: 내 리뷰 페이지 경로 배너 (업체 연동 시 노출) */}
          {storeInfo.connected && (
            <div className="bg-[#EFF6FF] rounded-2xl px-5 py-3.5 shadow-sm flex items-center gap-2 border border-[#BFDBFE] min-w-0">
              <span className="text-lg">📱</span>
              <div className="min-w-0">
                <p className="text-xs text-[#3182F6] font-semibold">내 리뷰 페이지</p>
                <p className="text-xs font-mono text-[#4E5968] truncate max-w-[280px]">/review/{makeStoreId(storeInfo.name)}</p>
              </div>
            </div>
          )}
        </div>



        {/* ── AI 설정 (메인) ── */}
        {(() => { const _show = true; return _show && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 좌측 */}
            <div className="space-y-5">

              {/* 네이버 업체 연동 */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-[#F0FDF4] flex items-center justify-center text-base flex-shrink-0">🟢</div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-[#191F28]">네이버 업체 연동</h3>
                      <p className="text-xs text-[#8B95A1]">
                        {naverLinked ? '플랫폼 연결 감지됨 · 원클릭으로 불러오세요' : '연동 시 키워드 자동 설정'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {naverLinked && (
                      <button
                        onClick={importFromNaverLink}
                        className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-[#03C75A] text-white hover:opacity-90 whitespace-nowrap">
                        ⚡ 설정에서 불러오기
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
                      업체 정보를 입력하면 AI가 더 정확한 리뷰를 생성하고,<br/>
                      <span className="text-[#3182F6] font-semibold">QR 코드에 리뷰 URL이 자동 연결</span>돼요.
                    </p>
                    <button
                      onClick={() => { setStoreDraft(DEFAULT_STORE); setStoreEdit(true) }}
                      className="w-full py-3 rounded-xl border-2 border-dashed border-[#BFDBFE] text-[#3182F6] font-semibold text-sm hover:bg-[#EFF6FF] transition-colors">
                      + 업체 정보 입력하기
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
                    <div className="mt-2 pl-4">
                      <p className="text-[10px] text-[#8B95A1]">리뷰 URL: <span className="text-[#3182F6] font-mono">/review/{makeStoreId(storeInfo.name)}</span></p>
                    </div>
                  </div>
                )}
              </div>

              {/* SEO 키워드 */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] flex items-center justify-center text-base">🔑</div>
                  <div>
                    <h3 className="font-bold text-[#191F28]">SEO 키워드 세팅</h3>
                    <p className="text-xs text-[#8B95A1]">AI가 리뷰 생성 시 자동으로 활용합니다</p>
                  </div>
                </div>

                {/* 상위노출 키워드 */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-[#191F28] mb-2">
                    상위노출 키워드
                    <span className="text-xs font-normal text-[#8B95A1] ml-2">가장 중요한 키워드 1개</span>
                  </label>
                  <input
                    value={settings.mainKeyword}
                    onChange={e => saveSetting('mainKeyword', e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                    placeholder="예: 부천맛집"
                    className="w-full border-2 border-[#3182F6] rounded-xl px-4 py-3 text-sm focus:outline-none bg-[#F8FAFF] font-medium placeholder-[#C9CDD2]"
                  />
                </div>

                {/* 대표 키워드 (서브) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-[#191F28]">대표 키워드</label>
                    <span className="text-xs text-[#8B95A1]">(최대 5개 · Enter 또는 쉼표로 추가)</span>
                  </div>
                  <div
                    onClick={() => kwInputRef.current?.focus()}
                    className={`flex flex-wrap gap-2 p-3 border-2 rounded-xl bg-white min-h-[52px] transition-colors cursor-text ${
                      settings.subKeywords.length >= 5 ? 'border-[#E5E8EB] bg-[#F8F9FA]' : 'border-[#E5E8EB] focus-within:border-[#3182F6]'
                    }`}>
                    {settings.subKeywords.map(kw => (
                      <span key={kw}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EFF6FF] text-[#3182F6] text-sm rounded-full font-medium flex-shrink-0 border border-[#BFDBFE]">
                        #{kw}
                        <button onClick={e => { e.stopPropagation(); removeSubKw(kw) }}
                          className="text-[#3182F6]/60 hover:text-[#3182F6] font-black text-base leading-none">×</button>
                      </span>
                    ))}
                    {settings.subKeywords.length < 5 && (
                      <input
                        ref={kwInputRef}
                        value={settings.subKwInput}
                        onChange={e => saveSetting('subKwInput', e.target.value)}
                        onKeyDown={handleSubKwKeyDown}
                        onBlur={() => { if (settings.subKwInput.trim()) addSubKw(settings.subKwInput) }}
                        placeholder={settings.subKeywords.length === 0 ? "예: 부천카페, 오므라이스, 데이트코스" : "추가 입력..."}
                        className="flex-1 min-w-[120px] outline-none text-sm py-1 bg-transparent placeholder-[#C9CDD2]"
                      />
                    )}
                  </div>
                  <p className="text-[11px] text-[#8B95A1] mt-1.5 pl-1">
                    {settings.subKeywords.length}/5개 등록됨
                  </p>
                </div>

                {/* AI 추천 키워드 */}
                {suggestedKws.length > 0 && (
                  <div className="mt-4 p-3.5 bg-gradient-to-r from-[#F0FDF4] to-[#ECFDF5] rounded-xl border border-[#BBF7D0]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm">🤖</span>
                      <p className="text-xs font-bold text-[#059669]">AI 추천 키워드</p>
                      <span className="text-[10px] px-1.5 py-0.5 bg-[#059669] text-white rounded font-bold">자동</span>
                    </div>
                    <p className="text-[11px] text-[#4E5968] mb-2">
                      네이버 연동 정보 기반으로 추천된 키워드에요. 클릭하면 추가돼요.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestedKws.filter(kw => kw !== settings.mainKeyword && !settings.subKeywords.includes(kw)).map(kw => (
                        <button
                          key={kw}
                          onClick={() => {
                            if (settings.subKeywords.length < 5) {
                              const next = { ...settings, subKeywords: [...settings.subKeywords, kw] }
                              saveSettings(next)
                            }
                          }}
                          disabled={settings.subKeywords.length >= 5}
                          className="text-xs px-2.5 py-1.5 bg-white text-[#059669] rounded-full font-medium border border-[#BBF7D0] hover:bg-[#DCFCE7] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          + {kw}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 키워드 미리보기 */}
                {(settings.mainKeyword || settings.subKeywords.length > 0) && (
                  <div className="mt-4 p-3 bg-[#F8FAFF] rounded-xl border border-[#BFDBFE]">
                    <p className="text-xs font-semibold text-[#3182F6] mb-2">리뷰 생성 시 활용될 키워드 미리보기</p>
                    <div className="flex flex-wrap gap-1.5">
                      {settings.mainKeyword && (
                        <span className="text-xs px-2.5 py-1 bg-[#3182F6] text-white rounded-full font-semibold">#{settings.mainKeyword}</span>
                      )}
                      {settings.subKeywords.map(kw => (
                        <span key={kw} className="text-xs px-2.5 py-1 bg-white text-[#3182F6] rounded-full font-medium border border-[#BFDBFE]">#{kw}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 우측 */}
            <div className="space-y-5">

              {/* AI 톤 안내 (전역 설정) */}
              <div className="bg-gradient-to-br from-[#EFF6FF] to-[#F8FBFF] rounded-2xl p-5 border border-[#BFDBFE]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🤖</span>
                  <h3 className="font-bold text-[#191F28]">AI 리뷰 생성 톤</h3>
                </div>
                <p className="text-sm text-[#4E5968] mb-3 leading-relaxed">
                  현재 전역 설정: <span className="font-bold text-[#3182F6]">{toneLabel[globalTone] || '친근하게'}</span>
                </p>
                <p className="text-xs text-[#8B95A1] mb-3">
                  AI 톤은 설정 페이지에서 통합 관리됩니다. 변경하면 모든 AI 기능에 동일하게 적용돼요.
                </p>
                <a href="/settings?tab=ai"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3182F6] bg-white px-4 py-2 rounded-xl border border-[#BFDBFE] hover:bg-[#EFF6FF] transition-colors">
                  ⚙️ AI 설정 변경하기
                </a>
              </div>

              {/* 보상 설정 */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-[#FFF7ED] flex items-center justify-center text-base">🎁</div>
                  <div>
                    <h3 className="font-bold text-[#191F28]">고객 보상 설정</h3>
                    <p className="text-xs text-[#8B95A1]">리뷰 작성 시 제공할 혜택</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { value: 'none',    label: '없음',       desc: '순수 리뷰 유도' },
                    { value: 'coupon',  label: '쿠폰 제공',  desc: '할인 쿠폰 증정' },
                    { value: 'stamp',   label: '스탬프',     desc: '스탬프 적립' },
                    { value: 'free',    label: '서비스 제공', desc: '음료/디저트 서비스' },
                  ].map(opt => (
                    <label key={opt.value}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                        settings.rewardType === opt.value
                          ? 'border-[#3182F6] bg-[#EFF6FF]'
                          : 'border-[#E5E8EB] hover:border-[#BFDBFE]'
                      }`}>
                      <input type="radio" name="reward"
                        checked={settings.rewardType === opt.value}
                        onChange={() => saveSetting('rewardType', opt.value)}
                        className="accent-[#3182F6]"
                      />
                      <div>
                        <p className="text-sm font-semibold text-[#191F28]">{opt.label}</p>
                        <p className="text-xs text-[#8B95A1]">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
                {settings.rewardType !== 'none' && (
                  <div className="mt-3">
                    <input
                      value={settings.rewardValue}
                      onChange={e => saveSetting('rewardValue', e.target.value)}
                      placeholder={
                        settings.rewardType === 'coupon' ? '예: 아메리카노 10% 할인'
                        : settings.rewardType === 'stamp' ? '예: 도장 1개 추가'
                        : '예: 아이스크림 서비스'
                      }
                      className="w-full border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#3182F6] transition-colors placeholder-[#C9CDD2]"
                    />
                  </div>
                )}
              </div>

              {/* AI 리뷰 미리보기 */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-[#F5F3FF] flex items-center justify-center text-base">✨</div>
                  <h3 className="font-bold text-[#191F28]">AI 리뷰 미리보기</h3>
                </div>
                <div className="bg-[#F8FAFF] rounded-xl p-4 border border-[#BFDBFE] text-sm text-[#191F28] leading-relaxed italic">
                  {settings.mainKeyword
                    ? (() => {
                        const kws = [settings.mainKeyword, ...settings.subKeywords].filter(Boolean)
                        const kwStr = kws.slice(0, 3).map(k => '#' + k).join(' ')
                        const reward = settings.rewardType !== 'none' && settings.rewardValue
                          ? settings.rewardValue + '도 받아서 ' : ''
                        const storeName = storeInfo.connected ? storeInfo.name + ' ' : ''
                        return `${storeName}정말 좋은 경험이었어요! ${reward}기분 좋게 방문했습니다. 분위기도 좋고 직원분들도 친절해서 또 오고 싶어요 😊 ${kwStr}`
                      })()
                    : '키워드를 입력하면 AI 리뷰 미리보기가 표시됩니다...'
                  }
                </div>
                <p className="text-[11px] text-[#8B95A1] mt-2 text-center">
                  실제 생성 시 톤({toneLabel[globalTone] || '친근하게'})이 적용됩니다
                </p>
              </div>

              {/* 저장 */}
              <button onClick={handleSaveSettings}
                className={`w-full py-3.5 rounded-xl font-bold text-base transition-colors ${
                  saved ? 'bg-green-500 text-white' : 'bg-[#191F28] text-white hover:bg-[#333D4B]'
                }`}>
                {saved ? '✅ 저장됨' : '설정 저장하기'}
              </button>
            </div>
          </div>
        )})()}

        {/* ═══════════════════════════════════════════════════════
             내 리뷰 QR 코드 (자동 생성 · 단일)
           ═══════════════════════════════════════════════════════ */}
        {(() => {
          const linkedUrl = buildReviewUrl(storeInfo, settings)
          const qrTargetUrl = qrMode === 'custom' ? customUrl.trim() : linkedUrl
          const customValid = qrMode === 'custom' && /^https?:\/\//.test(customUrl.trim())
          const canRender = qrMode === 'linked' ? storeInfo.connected : customValid
          return (
        <div className="mt-6 bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">📱</span>
            <h3 className="font-bold text-[#191F28]">내 리뷰 QR 코드</h3>
            {qrMode === 'linked' && storeInfo.connected && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] font-bold">자동 연동됨</span>
            )}
            {qrMode === 'custom' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#3182F6] font-bold">URL 직접입력</span>
            )}
          </div>
          <p className="text-xs text-[#8B95A1] mb-3">
            {qrMode === 'linked'
              ? (storeInfo.connected
                  ? '연동된 네이버 업체 정보가 자동으로 반영됩니다. 다운로드 후 매장에 부착하세요.'
                  : '업체를 먼저 연동하면 QR이 생성됩니다.')
              : '원하는 URL을 입력하면 즉시 QR이 생성됩니다. (스마트스토어·예약페이지·SNS 등)'}
          </p>

          {/* 21차-1c-A: 모드 토글 */}
          <div className="inline-flex p-1 bg-[#F2F4F6] rounded-xl mb-4">
            <button
              onClick={() => switchQrMode('linked')}
              className={'px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ' +
                (qrMode === 'linked' ? 'bg-white text-[#191F28] shadow-sm' : 'text-[#8B95A1] hover:text-[#4E5968]')}>
              자동 연동
            </button>
            <button
              onClick={() => switchQrMode('custom')}
              className={'px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ' +
                (qrMode === 'custom' ? 'bg-white text-[#191F28] shadow-sm' : 'text-[#8B95A1] hover:text-[#4E5968]')}>
              URL 직접입력
            </button>
          </div>

          {qrMode === 'custom' && (
            <div className="mb-4">
              <input
                type="url"
                value={customUrl}
                onChange={(e) => saveCustomUrl(e.target.value)}
                placeholder="https://smartstore.naver.com/..."
                className="w-full px-4 py-3 rounded-xl border border-[#E5E8EB] focus:border-[#3182F6] focus:outline-none text-sm font-mono" />
              {customUrl && !customValid && (
                <p className="text-[11px] text-[#F04438] mt-1.5">※ http:// 또는 https:// 로 시작하는 URL을 입력하세요.</p>
              )}
            </div>
          )}

          {canRender ? (
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* QR */}
              <div className="p-4 bg-white rounded-2xl border-2 border-[#E5E8EB] shadow-sm shrink-0 mx-auto md:mx-0">
                <QRCodeImage url={qrTargetUrl} size={200} />
              </div>

              {/* 정보 + 버튼 */}
              <div className="flex-1 min-w-0 w-full space-y-3">
                <div className="space-y-1.5">
                  {qrMode === 'linked' ? (
                    <>
                      <div className="flex items-start gap-2">
                        <span className="text-[11px] text-[#8B95A1] font-semibold w-16 shrink-0 mt-0.5">상호</span>
                        <span className="text-sm font-bold text-[#191F28]">{storeInfo.name}</span>
                      </div>
                      {storeInfo.category && (
                        <div className="flex items-start gap-2">
                          <span className="text-[11px] text-[#8B95A1] font-semibold w-16 shrink-0 mt-0.5">업종</span>
                          <span className="text-sm text-[#4E5968]">{storeInfo.category}</span>
                        </div>
                      )}
                      {storeInfo.location && (
                        <div className="flex items-start gap-2">
                          <span className="text-[11px] text-[#8B95A1] font-semibold w-16 shrink-0 mt-0.5">위치</span>
                          <span className="text-sm text-[#4E5968]">{storeInfo.location}</span>
                        </div>
                      )}
                      {storeInfo.naverPlaceId && (
                        <div className="flex items-start gap-2">
                          <span className="text-[11px] text-[#8B95A1] font-semibold w-16 shrink-0 mt-0.5">Place mid</span>
                          <span className="text-sm text-[#4E5968] font-mono">{storeInfo.naverPlaceId}</span>
                        </div>
                      )}
                      <div className="flex items-start gap-2">
                        <span className="text-[11px] text-[#8B95A1] font-semibold w-16 shrink-0 mt-0.5">리뷰 URL</span>
                        <span className="text-[11px] text-[#3182F6] break-all font-mono">
                          {qrTargetUrl.replace(/^https?:\/\//, '').slice(0, 60)}...
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-start gap-2">
                      <span className="text-[11px] text-[#8B95A1] font-semibold w-16 shrink-0 mt-0.5">대상 URL</span>
                      <span className="text-[11px] text-[#3182F6] break-all font-mono">{qrTargetUrl}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => downloadQR(qrTargetUrl, qrMode === 'linked' ? (safeFileName(storeInfo.name) + '-review-qr') : 'custom-qr')}
                    className="py-3 rounded-xl text-sm font-bold bg-[#3182F6] text-white hover:bg-[#1B64DA] transition-colors">
                    📥 PNG 저장
                  </button>
                  <button
                    onClick={() => openPrintTemplate({
                      url: qrTargetUrl,
                      storeName: qrMode === 'linked' ? storeInfo.name : 'Custom QR',
                      keyword: settings.mainKeyword,
                      rewardType: settings.rewardType,
                      rewardValue: settings.rewardValue,
                    })}
                    className="py-3 rounded-xl text-sm font-bold bg-[#12B76A] text-white hover:bg-[#0E9655] transition-colors">
                    🖨️ A4 인쇄용
                  </button>
                </div>
              </div>
            </div>
          ) : qrMode === 'linked' ? (
            <div className="bg-[#F8F9FA] rounded-xl p-6 text-center">
              <div className="text-3xl mb-2">🔌</div>
              <p className="text-sm text-[#4E5968] font-semibold mb-1">업체가 아직 연동되지 않았어요</p>
              <p className="text-xs text-[#8B95A1] mb-4">네이버 플레이스를 연결하면 QR이 자동으로 만들어집니다.</p>
              <a href={buildSettingsHref('connect', { platform: 'naver' })}
                className="inline-block px-4 py-2 rounded-xl bg-[#03C75A] text-white text-xs font-bold">
                네이버 플레이스 연결하기
              </a>
            </div>
          ) : (
            <div className="bg-[#F8F9FA] rounded-xl p-6 text-center">
              <div className="text-3xl mb-2">🔗</div>
              <p className="text-sm text-[#4E5968] font-semibold">위에 URL을 입력하면 QR이 즉시 생성됩니다.</p>
            </div>
          )}

          {/* 21차-1c-B: 리뷰 페이지 iframe 미리보기 */}
          {canRender && (
            <div className="mt-6 pt-5 border-t border-[#F2F4F6]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm">👁️</span>
                  <h4 className="text-sm font-bold text-[#191F28]">QR 스캔 후 고객이 보는 화면</h4>
                </div>
                <div className="flex items-center gap-2">
                  <a href={qrTargetUrl} target="_blank" rel="noopener noreferrer"
                     className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-[#EFF6FF] text-[#3182F6] hover:bg-[#DBEAFE] whitespace-nowrap">
                    새 창에서 열기 ↗
                  </a>
                  <button onClick={() => setShowPreview(v => !v)}
                    className={'text-[11px] font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-colors ' +
                      (showPreview ? 'bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB]' : 'bg-[#191F28] text-white hover:bg-[#333D4B]')}>
                    {showPreview ? '미리보기 숨기기' : '미리보기 보기'}
                  </button>
                </div>
              </div>
              {showPreview && (
                <>
                  <div className="relative bg-[#F2F4F6] rounded-xl p-3 border border-[#E5E8EB]">
                    <iframe
                      src={qrTargetUrl}
                      title="리뷰 페이지 미리보기"
                      className="w-full bg-white rounded-lg border border-[#E5E8EB]"
                      style={{ height: '680px' }}
                      sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
                    />
                  </div>
                  <p className="text-[11px] text-[#8B95A1] mt-2 text-center">
                    ※ 실제 배포 페이지가 iframe으로 로드됩니다. QR 스캔 경험과 동일해요.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
          )
        })()}

        {/* ── QR 리뷰 생성 통계 (/review/[storeId] 제출 데이터 집계) ── */}
        <ReviewStatsSection storeName={storeInfo.name} />

        </div>
        <Footer />
</main>

{/* ── QR 다운로드 미리보기 모달 ── */}
      {previewQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-[#F2F4F6]">
              <h2 className="font-bold text-[#191F28]">{previewQR.name}</h2>
              <button onClick={() => setPreviewQR(null)} className="text-[#8B95A1] hover:text-[#191F28] text-2xl leading-none">×</button>
            </div>
            <div className="p-6 flex flex-col items-center gap-4">
              <div className="p-4 bg-white rounded-2xl border-2 border-[#E5E8EB] shadow-sm">
                {storeInfo.connected
                  ? <QRCodeImage url={buildReviewUrl(storeInfo, { ...settings, mainKeyword: previewQR.keyword || settings.mainKeyword })} size={180} />
                  : <QRPreview text={previewQR.name + previewQR.keyword} size={180} />
                }
              </div>
              {storeInfo.connected && (
                <p className="text-[10px] text-[#8B95A1] text-center break-all max-w-[260px] leading-relaxed">
                  {buildReviewUrl(storeInfo, { ...settings, mainKeyword: previewQR.keyword || settings.mainKeyword }).slice(0, 80)}...
                </p>
              )}
              {previewQR.keyword && (
                <span className="text-xs px-3 py-1.5 rounded-full bg-[#EFF6FF] text-[#3182F6] font-semibold">#{previewQR.keyword}</span>
              )}
              <p className="text-xs text-[#8B95A1] text-center">
                스캔 시 AI가 자동으로 리뷰 초안을 생성해드려요
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 w-full">
                <button
                  onClick={() => setPreviewQR(null)}
                  className="py-3 rounded-xl text-sm font-semibold bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB] transition-colors">
                  닫기
                </button>
                <button
                  onClick={() => {
                    if (storeInfo.connected) {
                      downloadQR(buildReviewUrl(storeInfo, { ...settings, mainKeyword: previewQR.keyword || settings.mainKeyword }), safeFileName(previewQR.name))
                    }
                  }}
                  disabled={!storeInfo.connected}
                  className={'py-3 rounded-xl text-sm font-semibold transition-colors ' + (storeInfo.connected ? 'bg-[#3182F6] text-white hover:bg-[#1B64DA]' : 'bg-[#E5E8EB] text-[#8B95A1] cursor-not-allowed')}>
                  💾 PNG 저장
                </button>
                <button
                  onClick={() => {
                    if (storeInfo.connected) {
                      openPrintTemplate({
                        url: buildReviewUrl(storeInfo, { ...settings, mainKeyword: previewQR.keyword || settings.mainKeyword }),
                        storeName: storeInfo.name,
                        keyword: previewQR.keyword || settings.mainKeyword,
                        rewardType: settings.rewardType,
                        rewardValue: settings.rewardValue,
                      })
                    }
                  }}
                  disabled={!storeInfo.connected}
                  className={'py-3 rounded-xl text-sm font-semibold transition-colors ' + (storeInfo.connected ? 'bg-[#12B76A] text-white hover:bg-[#0E9655]' : 'bg-[#E5E8EB] text-[#8B95A1] cursor-not-allowed')}>
                  🖨️ A4 인쇄용
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

