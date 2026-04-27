'use client'
export const dynamic = 'force-dynamic'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import Sidebar from '../../components/Sidebar'
import PageHeader from '../../components/PageHeader'
import Footer from '../../components/Footer'
import { nearestRegions, COMMUNITY_REGIONS } from '../../lib/regions-community'

// ── 플레이스 업종 목록 ──────────────────────────────────────────
const PLACE_TYPE_GROUPS: { label: string; items: string[] }[] = [
  { label: '음식점', items: ['맛집', '한식', '중식', '일식', '양식', '분식', '치킨', '피자', '버거', '고기집', '삼겹살', '소고기', '해산물', '회', '초밥', '라멘', '우동', '냉면', '국밥', '백반', '도시락', '샌드위치', '샐러드', '비건', '할랄'] },
  { label: '카페·디저트', items: ['카페', '커피', '베이커리', '브런치', '디저트', '케이크', '아이스크림', '버블티', '주스바', '스무디', '빙수', '와플', '도넛'] },
  { label: '주류·술집', items: ['술집', '이자카야', '포차', '호프', '와인바', '칵테일바', '막걸리집', '소주방', '루프탑바'] },
  { label: '뷰티', items: ['미용실', '헤어샵', '네일샵', '네일아트', '피부관리', '왁싱', '눈썹문신', '속눈썹', '피어싱', '타투', '메이크업', '헬스·뷰티'] },
  { label: '의료·건강', items: ['병원', '의원', '치과', '한의원', '피부과', '정형외과', '내과', '소아과', '안과', '이비인후과', '성형외과', '산부인과', '정신건강의학과', '동물병원', '약국'] },
  { label: '운동·피트니스', items: ['헬스장', 'PT', '필라테스', '요가', '크로스핏', '수영장', '클라이밍', '골프', '골프연습장', '스크린골프', '테니스', '배드민턴', '복싱', '격투기', '댄스'] },
  { label: '교육', items: ['학원', '영어학원', '수학학원', '미술학원', '음악학원', '태권도', '피아노', '독서실', '스터디카페', '과외', '코딩학원', '입시학원', '어린이집', '유치원'] },
  { label: '생활편의', items: ['세탁소', '수선집', '열쇠', '청소업체', '이사업체', '인테리어', '에어컨청소', '가전수리', '휴대폰수리', '자전거수리', '반려동물미용', '동물훈련'] },
  { label: '숙박·여행', items: ['호텔', '모텔', '펜션', '게스트하우스', '에어비앤비', '글램핑', '캠핑', '여행사'] },
  { label: '쇼핑', items: ['편의점', '마트', '꽃집', '문구점', '서점', '옷가게', '신발가게', '안경점', '귀금속', '인테리어소품', '가구'] },
]

const ALL_PLACE_TYPES = PLACE_TYPE_GROUPS.flatMap(g => g.items)

// 업종 → 검색 접미어
const KEYWORD_PATTERNS: Record<string, string[]> = {
  '맛집':     ['맛집', '회식', '점심', '데이트', '저녁'],
  '한식':     ['한식', '밥집', '점심', '백반', '정식'],
  '중식':     ['중식', '짜장면', '짬뽕', '탕수육', '중국집'],
  '일식':     ['일식', '초밥', '라멘', '우동', '돈카츠'],
  '양식':     ['양식', '파스타', '스테이크', '피자', '리조또'],
  '분식':     ['분식', '떡볶이', '순대', '튀김', '라볶이'],
  '치킨':     ['치킨', '후라이드', '양념치킨', '닭갈비', '닭발'],
  '피자':     ['피자', '도우', '화덕피자', '뇨끼', '리조또'],
  '버거':     ['버거', '햄버거', '수제버거', '스매시버거', '감자튀김'],
  '고기집':   ['고기집', '삼겹살', '갈비', '돼지갈비', '회식'],
  '삼겹살':   ['삼겹살', '목살', '항정살', '돼지갈비', '고기집'],
  '소고기':   ['소고기', '한우', '갈비', '등심', '회식'],
  '해산물':   ['해산물', '회', '조개구이', '랍스터', '새우'],
  '회':       ['회', '회포장', '회식', '초밥', '해산물'],
  '초밥':     ['초밥', '스시', '오마카세', '회', '일식'],
  '카페':     ['카페', '브런치', '디저트', '스터디카페', '감성카페'],
  '커피':     ['커피', '아메리카노', '라떼', '콜드브루', '핸드드립'],
  '베이커리': ['베이커리', '빵집', '케이크', '크루아상', '마카롱'],
  '브런치':   ['브런치', '카페', '에그베네딕트', '팬케이크', '와플'],
  '디저트':   ['디저트', '케이크', '마카롱', '빙수', '아이스크림'],
  '미용실':   ['미용실', '염색', '펌', '남자컷', '헤어컷'],
  '헤어샵':   ['헤어샵', '미용실', '염색', '펌', '드라이'],
  '네일샵':   ['네일', '젤네일', '패디큐어', '네일아트', '속눈썹'],
  '네일아트': ['네일아트', '젤네일', '네일', '아트', '속눈썹연장'],
  '피부관리': ['피부관리', '피부샵', '피부케어', '트러블케어', '관리샵'],
  '왁싱':     ['왁싱', '제모', '비키니왁싱', '전신왁싱', '눈썹정리'],
  '병원':     ['병원', '의원', '진료', '예약', '전문의'],
  '치과':     ['치과', '임플란트', '교정', '라미네이트', '스케일링'],
  '한의원':   ['한의원', '침', '추나', '한약', '다이어트한의원'],
  '피부과':   ['피부과', '레이저', '보톡스', '필러', '여드름'],
  '동물병원': ['동물병원', '건강검진', '예방접종', '중성화', '강아지'],
  '헬스장':   ['헬스장', 'PT', '피트니스', '헬스클럽', '근처헬스'],
  'PT':       ['PT', '퍼스널트레이닝', '다이어트PT', '헬스PT', '바디프로필'],
  '필라테스': ['필라테스', '필라테스스튜디오', '그룹필라테스', '요가', '개인레슨'],
  '요가':     ['요가', '요가원', '핫요가', '명상', '필라테스'],
  '학원':     ['학원', '과외', '입시학원', '영어학원', '수학학원'],
  '스터디카페': ['스터디카페', '독서실', '스터디룸', '공부방', '코인독서실'],
  '호텔':     ['호텔', '숙박', '룸', '수영장호텔', '펜트하우스'],
  '펜션':     ['펜션', '글램핑', '풀빌라', '독채펜션', '바베큐'],
  '직접입력': [],
}

function getSuffixes(category: string): string[] {
  return KEYWORD_PATTERNS[category] || [category, category + ' 추천', category + ' 예약', category + ' 근처', category + ' 후기']
}

function inferCategoryFromName(name: string): string | null {
  if (!name) return null
  if (/카페|커피|베이커리|브런치/.test(name)) return '카페'
  if (/치과/.test(name)) return '치과'
  if (/네일/.test(name)) return '네일샵'
  if (/미용실|헤어샵|헤어|살롱/.test(name)) return '미용실'
  if (/동물병원/.test(name)) return '동물병원'
  if (/학원/.test(name)) return '학원'
  if (/헬스|피트니스|요가|필라테스/.test(name)) return '헬스장'
  if (/의원|한의원|정형외과|치과|병원/.test(name)) return '병원'
  return null
}

// ── 업체 컨텍스트 ──────────────────────────────────────────────
interface BizContext { region: string; regionGu: string; category: string; businessName: string }
const DEFAULT_CTX: BizContext = { region: '강남', regionGu: '강남구', category: '맛집', businessName: '내 가게' }

function readBizContext(): BizContext {
  if (typeof window === 'undefined') return DEFAULT_CTX
  try {
    const raw1 = localStorage.getItem('localution.store_info')
    const raw2 = localStorage.getItem('localution_store')
    const p: Record<string, string> = raw1 ? JSON.parse(raw1) : raw2 ? JSON.parse(raw2) : {}
    const addrSrc = [p?.location, p?.address, p?.branch, p?.storeName, p?.name].filter(Boolean).join(' ')
    let region = DEFAULT_CTX.region, regionGu = DEFAULT_CTX.regionGu
    const gu = addrSrc.match(/([가-힣]{1,4})(구|군)/)
    if (gu) { region = gu[1]; regionGu = gu[1] + gu[2] }
    const businessName = p?.name || p?.storeName || DEFAULT_CTX.businessName
    const category = p?.category || p?.industry || inferCategoryFromName(businessName) || DEFAULT_CTX.category
    return { region, regionGu, category, businessName }
  } catch { return DEFAULT_CTX }
}

// ── 순위 색상 ──────────────────────────────────────────────────
function getRankColor(rank: number | null): string {
  if (rank === null) return 'text-[#8B95A1]'
  if (rank <= 3)  return 'text-[#3182F6] font-black'
  if (rank <= 5)  return 'text-[#12B76A] font-bold'
  if (rank <= 10) return 'text-[#F59E0B] font-bold'
  if (rank <= 20) return 'text-[#F04452] font-semibold'
  return 'text-[#8B95A1] font-medium'
}
function getRankBg(rank: number | null): string {
  if (rank === null) return ''
  if (rank <= 3)  return 'bg-[#EFF6FF]'
  if (rank <= 5)  return 'bg-[#ECFDF5]'
  if (rank <= 10) return 'bg-[#FFFBEB]'
  if (rank <= 20) return 'bg-[#FFF1F2]'
  return ''
}

function loadHistory(): Record<string, number[]> {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem('localution.rank_history') || '{}') } catch { return {} }
}
function saveHistory(keyword: string, rank: number | null) {
  if (typeof window === 'undefined' || rank === null) return
  try {
    const h = loadHistory()
    if (!h[keyword]) h[keyword] = []
    h[keyword] = [rank, ...h[keyword]].slice(0, 7)
    localStorage.setItem('localution.rank_history', JSON.stringify(h))
  } catch {}
}

interface RankResult {
  keyword: string; relatedKw: string; placeType: string
  rank: number | null; prevRank: number | null
  loading: boolean; error?: string; matchedTitle?: string; scannedAt?: string
}

function RankCard({ result, onRefresh }: { result: RankResult; onRefresh: () => void }) {
  const diff = result.prevRank !== null && result.rank !== null ? result.prevRank - result.rank : null
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-[#F2F4F6] hover:border-[#3182F6] transition-colors">
      <div className="px-4 py-3 border-b border-[#F2F4F6] flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#F2F4F6] text-[#4E5968] font-medium">{result.placeType}</span>
          <span className="text-sm font-bold text-[#191F28]">📍 {result.keyword}</span>
          <span className="text-[11px] text-[#3182F6] font-medium">→ {result.relatedKw}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {result.loading ? (
            <span className="w-5 h-5 border-2 border-[#3182F6] border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              {result.rank !== null ? (
                <span className={`text-sm font-black px-2.5 py-1 rounded-lg ${getRankBg(result.rank)} ${getRankColor(result.rank)}`}>
                  {result.rank}위
                </span>
              ) : (
                <span className="text-xs px-2.5 py-1 rounded-lg bg-[#F2F4F6] text-[#8B95A1]">
                  {result.error ? '오류' : '100위 밖'}
                </span>
              )}
              {diff !== null && (
                <span className={`text-[11px] font-bold ${diff > 0 ? 'text-[#12B76A]' : diff < 0 ? 'text-[#F04452]' : 'text-[#8B95A1]'}`}>
                  {diff > 0 ? '▲' + diff : diff < 0 ? '▼' + Math.abs(diff) : '–'}
                </span>
              )}
              <button onClick={onRefresh}
                className="text-[11px] text-[#8B95A1] hover:text-[#3182F6] transition-colors px-1.5 py-0.5 rounded"
                title="개별 새로고침">↻</button>
            </>
          )}
        </div>
      </div>
      <div className="px-4 py-3 text-xs">
        {result.loading ? (
          <p className="text-[#8B95A1] animate-pulse">네이버 검색 중...</p>
        ) : result.rank !== null ? (
          <div className="space-y-1">
            <p className="text-[#4E5968]"><span className="text-[#8B95A1]">매칭: </span><span className="font-medium text-[#191F28]">{result.matchedTitle || '—'}</span></p>
            {result.prevRank !== null && <p className="text-[#8B95A1]">직전 순위: {result.prevRank}위</p>}
            {result.scannedAt && <p className="text-[#8B95A1]">측정: {result.scannedAt}</p>}
          </div>
        ) : (
          <p className="text-[#8B95A1]">{result.error ? '⚠ ' + result.error : '검색 100위 이내에 업체가 없습니다.'}</p>
        )}
      </div>
    </div>
  )
}

// ── 지역 선택 드롭다운 (그룹화) ──────────────────────────────
function RegionSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const groups = useMemo(() => {
    const map: Record<string, { label: string; id: string }[]> = {}
    for (const r of COMMUNITY_REGIONS) {
      if (!r.parent_label) continue
      if (!map[r.parent_label]) map[r.parent_label] = []
      map[r.parent_label].push({ label: r.label, id: r.label })
    }
    return map
  }, [])

  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="text-sm border border-[#E5E8EB] rounded-lg px-2.5 py-1.5 bg-white text-[#191F28] font-medium focus:outline-none focus:border-[#3182F6] max-w-[160px]">
      {Object.entries(groups).map(([parent, regions]) => (
        <optgroup key={parent} label={parent}>
          {regions.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
        </optgroup>
      ))}
    </select>
  )
}

// ── 플레이스 선택 (그룹 드롭다운 + 직접입력) ─────────────────
function PlaceTypeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [custom, setCustom] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSelect = (v: string) => {
    if (v === '직접입력') {
      setShowCustom(true)
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setShowCustom(false)
      onChange(v)
    }
  }

  const handleCustomSubmit = () => {
    const v = custom.trim()
    if (v) { onChange(v); setShowCustom(false) }
  }

  return (
    <div className="flex items-center gap-1.5">
      {!showCustom ? (
        <select
          value={ALL_PLACE_TYPES.includes(value) ? value : '직접입력'}
          onChange={e => handleSelect(e.target.value)}
          className="text-sm border border-[#E5E8EB] rounded-lg px-2.5 py-1.5 bg-white text-[#191F28] font-medium focus:outline-none focus:border-[#3182F6] max-w-[140px]">
          {!ALL_PLACE_TYPES.includes(value) && value && (
            <option value={value}>✏ {value}</option>
          )}
          {PLACE_TYPE_GROUPS.map(g => (
            <optgroup key={g.label} label={g.label}>
              {g.items.map(item => <option key={item} value={item}>{item}</option>)}
            </optgroup>
          ))}
          <optgroup label="기타">
            <option value="직접입력">✏ 직접 입력</option>
          </optgroup>
        </select>
      ) : (
        <div className="flex items-center gap-1">
          <input ref={inputRef}
            value={custom}
            onChange={e => setCustom(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCustomSubmit(); if (e.key === 'Escape') setShowCustom(false) }}
            placeholder="업종 직접 입력..."
            className="text-sm border border-[#3182F6] rounded-lg px-2.5 py-1.5 bg-white text-[#191F28] focus:outline-none w-[130px]"
          />
          <button onClick={handleCustomSubmit}
            className="text-xs px-2 py-1.5 rounded-lg bg-[#3182F6] text-white font-medium hover:bg-[#1B64DA] transition-colors">
            확인
          </button>
          <button onClick={() => setShowCustom(false)}
            className="text-xs px-2 py-1.5 rounded-lg border border-[#E5E8EB] text-[#8B95A1] hover:bg-[#F2F4F6] transition-colors">
            취소
          </button>
        </div>
      )}
    </div>
  )
}

// ── 메인 ─────────────────────────────────────────────────────
export default function KeywordRankPage() {
  const [ctx, setCtx] = useState<BizContext>(DEFAULT_CTX)
  const [region, setRegion] = useState(DEFAULT_CTX.regionGu)
  const [placeType, setPlaceType] = useState('맛집')
  const [search, setSearch] = useState('')
  const [scanning, setScanning] = useState(false)
  const [lastUpdated, setLastUpdated] = useState('')
  const [results, setResults] = useState<RankResult[]>([])
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'ok' | 'denied' | 'unavailable' | 'timeout' | 'unsupported'>('idle')

  useEffect(() => {
    const c = readBizContext()
    setCtx(c)
    setRegion(c.regionGu)
    setPlaceType(c.category)
    const onChange = () => {
      const nc = readBizContext()
      setCtx(nc); setRegion(nc.regionGu); setPlaceType(nc.category)
    }
    window.addEventListener('localution:user-change', onChange)
    window.addEventListener('storage', onChange)
    return () => { window.removeEventListener('localution:user-change', onChange); window.removeEventListener('storage', onChange) }
  }, [])

  // 내 위치 찾기
  const requestGeoLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoStatus('unsupported'); return
    }
    setGeoStatus('loading')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        try {
          const list = nearestRegions(pos.coords.latitude, pos.coords.longitude, 3)
          const top = list[0]
          if (top) setRegion(top.label)
          setGeoStatus('ok')
        } catch { setGeoStatus('unavailable') }
      },
      (err) => {
        if (err.code === 1) setGeoStatus('denied')
        else if (err.code === 3) setGeoStatus('timeout')
        else setGeoStatus('unavailable')
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 5 * 60 * 1000 }
    )
  }, [])

  // region + placeType 바뀌면 키워드 재생성
  const keywords = useMemo(() => {
    const regionShort = region.replace(/(구|군|시)$/, '').replace(/\(.*?\)$/, '').trim()
    const suffixes = getSuffixes(placeType)
    return [
      { keyword: regionShort + ' ' + suffixes[0], relatedKw: regionShort + ' ' + suffixes[0] + ' 추천', placeType },
      { keyword: ctx.businessName + ' ' + regionShort, relatedKw: regionShort + ' ' + suffixes[0] + ' 상위노출', placeType },
      { keyword: regionShort + '역 ' + suffixes[0], relatedKw: regionShort + '역 ' + (suffixes[2] || suffixes[0]), placeType },
      { keyword: regionShort + ' ' + (suffixes[3] || suffixes[0]), relatedKw: regionShort + ' ' + (suffixes[3] || suffixes[0]) + ' 추천', placeType },
      { keyword: regionShort + ' ' + (suffixes[1] || suffixes[0]), relatedKw: regionShort + ' ' + (suffixes[1] || suffixes[0]) + ' 장소', placeType },
      { keyword: regionShort + ' ' + (suffixes[4] || suffixes[0]), relatedKw: regionShort + ' ' + (suffixes[4] || suffixes[0]) + ' 추천', placeType },
    ]
  }, [region, placeType, ctx.businessName])

  useEffect(() => {
    const history = loadHistory()
    setResults(keywords.map(kw => ({
      ...kw, rank: null, prevRank: history[kw.keyword]?.[0] ?? null, loading: false,
    })))
  }, [keywords])

  const fetchRank = useCallback(async (keyword: string, businessName: string) => {
    try {
      const res = await fetch('/api/naver-rank?keyword=' + encodeURIComponent(keyword) + '&businessName=' + encodeURIComponent(businessName))
      const data = await res.json()
      return { rank: data.rank ?? null, matchedTitle: data.matchedTitle, error: data.error }
    } catch { return { rank: null, error: '네트워크 오류' } }
  }, [])

  const refreshOne = useCallback(async (idx: number) => {
    const kw = results[idx]; if (!kw) return
    setResults(prev => prev.map((r, i) => i === idx ? { ...r, loading: true } : r))
    const { rank, matchedTitle, error } = await fetchRank(kw.keyword, ctx.businessName)
    saveHistory(kw.keyword, rank)
    const history = loadHistory()
    setResults(prev => prev.map((r, i) => i === idx ? {
      ...r, loading: false, prevRank: history[kw.keyword]?.[1] ?? null,
      rank, matchedTitle, error, scannedAt: new Date().toLocaleString('ko-KR'),
    } : r))
  }, [results, ctx.businessName, fetchRank])

  const handleScan = useCallback(async () => {
    if (scanning) return
    setScanning(true)
    setResults(prev => prev.map(r => ({ ...r, loading: true })))
    const history = loadHistory()
    const allResults = await Promise.all(keywords.map(kw => fetchRank(kw.keyword, ctx.businessName)))
    const now = new Date().toLocaleString('ko-KR')
    setResults(keywords.map((kw, i) => {
      const { rank, matchedTitle, error } = allResults[i]
      saveHistory(kw.keyword, rank)
      return { ...kw, rank, prevRank: history[kw.keyword]?.[0] ?? null, matchedTitle, error, loading: false, scannedAt: now }
    }))
    setLastUpdated(now)
    setScanning(false)
  }, [scanning, keywords, ctx.businessName, fetchRank])

  const top10Count = results.filter(r => r.rank !== null && r.rank <= 10).length
  const filtered = results.filter(r => search === '' || r.keyword.includes(search) || r.relatedKw.includes(search))

  const geoMsg: Record<string, string> = {
    denied: '위치 권한이 차단됐어요. 브라우저 설정에서 허용해 주세요.',
    unavailable: '위치를 확인할 수 없어요.',
    timeout: '위치 찾기가 너무 오래 걸려요. 다시 시도해 주세요.',
    unsupported: '이 브라우저는 위치 기능을 지원하지 않아요.',
  }

  return (
    <div className="flex min-h-screen bg-[#F2F4F6]">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-[220px] flex flex-col min-h-screen pt-16 md:pt-0 min-w-0">
        <PageHeader
          icon="📈"
          title="키워드 순위"
          subtitle="네이버 검색에서 내 업체가 몇 위인지 — 지역별 실시간 확인"
          variant="sky"
        />

        {/* 필터 바 */}
        <div className="bg-white border-b border-[#E5E8EB] px-4 py-3 sticky top-0 z-20">
          <div className="flex items-center gap-2 flex-wrap">

            {/* 지역 선택 + 내 위치 찾기 */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#8B95A1] font-medium shrink-0">지역</span>
              <RegionSelect value={region} onChange={setRegion} />
              <button
                onClick={requestGeoLocation}
                disabled={geoStatus === 'loading'}
                title="내 위치 기반 지역 자동 선택"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E5E8EB] text-xs font-medium text-[#4E5968] hover:border-[#3182F6] hover:text-[#3182F6] transition-colors disabled:opacity-50 shrink-0"
              >
                {geoStatus === 'loading' ? (
                  <span className="w-3 h-3 border-2 border-[#3182F6] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/>
                    <line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
                  </svg>
                )}
                내 위치
              </button>
            </div>

            {/* 플레이스 */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#8B95A1] font-medium shrink-0">플레이스</span>
              <PlaceTypeSelect value={placeType} onChange={setPlaceType} />
            </div>

            {/* 검색창 */}
            <div className="flex-1 min-w-[160px]">
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="키워드 검색..."
                className="w-full text-sm border border-[#E5E8EB] rounded-lg px-3 py-1.5 bg-white text-[#191F28] focus:outline-none focus:border-[#3182F6]"
              />
            </div>

            {/* 스캐닝 버튼 */}
            <button onClick={handleScan} disabled={scanning}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#3182F6] text-white text-sm font-semibold hover:bg-[#1B64DA] transition-colors disabled:opacity-60 shrink-0">
              {scanning
                ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />스캐닝...</>
                : '🔍 스캐닝'}
            </button>

            {lastUpdated && <span className="text-[11px] text-[#8B95A1] ml-auto shrink-0">마지막: {lastUpdated}</span>}
          </div>

          {/* 위치 에러 메시지 */}
          {geoMsg[geoStatus] && (
            <p className="text-[11px] text-[#F04452] mt-1.5">{geoMsg[geoStatus]}</p>
          )}
          {geoStatus === 'ok' && (
            <p className="text-[11px] text-[#12B76A] mt-1.5">✓ 위치 기반으로 <strong>{region}</strong>이 선택됐어요</p>
          )}
        </div>

        {/* 업체 안내 */}
        <div className="bg-[#EFF6FF] border-b border-[#BFDBFE] px-6 py-2">
          <p className="text-[11px] text-[#1D4ED8]">
            🔍 <strong>측정 업체:</strong> {ctx.businessName} &nbsp;·&nbsp;
            <strong>지역:</strong> {region} &nbsp;·&nbsp;
            <strong>업종:</strong> {placeType} &nbsp;·&nbsp;
            <a href="/settings" className="underline">설정에서 변경 →</a>
          </p>
        </div>

        {/* 통계 바 */}
        <div className="bg-white border-b border-[#F2F4F6] px-6 py-2">
          <div className="flex items-center gap-6 text-xs flex-wrap">
            <span className="text-[#8B95A1]">
              키워드 <strong className="text-[#191F28]">{results.length}개</strong>
              {results.some(r => r.rank !== null) && <> · 상위 10위 <strong className="text-[#3182F6]">{top10Count}개</strong></>}
            </span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#EFF6FF]"/><span className="text-[#3182F6]">1~3위</span></span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#ECFDF5]"/><span className="text-[#12B76A]">4~5위</span></span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#FFFBEB]"/><span className="text-[#F59E0B]">6~10위</span></span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#FFF1F2]"/><span className="text-[#F04452]">11~20위</span></span>
            </div>
          </div>
        </div>

        {/* 카드 그리드 */}
        <div className="flex-1 p-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-[#8B95A1]">
              <p className="text-lg font-bold mb-1">검색 결과 없음</p>
              <p className="text-sm">다른 키워드로 검색해 보세요</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filtered.map((result, i) => (
                <RankCard key={result.keyword} result={result} onRefresh={() => refreshOne(i)} />
              ))}
            </div>
          )}
          {!scanning && results.every(r => r.rank === null && !r.error) && (
            <div className="mt-8 flex flex-col items-center gap-2 text-[#8B95A1]">
              <p className="text-sm">🔍 <strong className="text-[#3182F6]">스캐닝</strong> 버튼을 눌러 실제 네이버 순위를 확인하세요</p>
              <p className="text-xs">업체명이 다르면 <a href="/settings" className="text-[#3182F6] underline">설정 → 매장 정보</a>에서 수정해 주세요</p>
            </div>
          )}
        </div>

        <Footer />
      </main>
    </div>
  )
}
