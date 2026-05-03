'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import Sidebar from '../../components/Sidebar'
import PageHeader from '../../components/PageHeader'
import Footer from '../../components/Footer'
import { Target } from 'lucide-react'

// ── 업체 컨텍스트 ─────────────────────────────────────
interface BizContext {
  region: string
  category: string
  businessName: string
}
const DEFAULT_CTX: BizContext = { region: '강남', category: '맛집', businessName: '내 가게' }

const KEYWORD_PATTERNS: Record<string, string[]> = {
  '맛집':     ['맛집', '회식', '점심', '데이트', '저녁'],
  '카페':     ['카페', '브런치', '디저트', '스터디카페', '감성카페'],
  '네일샵':   ['네일', '젤네일', '페디큐어', '네일아트', '속눈썹'],
  '치과':     ['치과', '임플란트', '교정', '라미네이트', '스케일링'],
  '미용실':   ['미용실', '염색', '펌', '남자컷', '헤어컷'],
  '동물병원': ['동물병원', '건강검진', '예방접종', '중성화', '강아지'],
  '학원':     ['학원', '과외', '입시학원', '영어학원', '수학학원'],
  '피트니스': ['헬스장', 'PT', '필라테스', '요가', '크로스핏'],
  '병원':     ['병원', '의원', '진료', '예약', '상담'],
}
function getSuffixes(c: string): string[] { return KEYWORD_PATTERNS[c] || KEYWORD_PATTERNS['맛집'] }
function inferCategoryFromName(n: string): string | null {
  if (!n) return null
  if (/카페|커피|베이커리|브런치/.test(n)) return '카페'
  if (/치과/.test(n)) return '치과'
  if (/네일/.test(n)) return '네일샵'
  if (/미용실|헤어샵|헤어|살롱/.test(n)) return '미용실'
  if (/동물병원/.test(n)) return '동물병원'
  if (/학원/.test(n)) return '학원'
  if (/헬스|피트니스|요가|필라테스/.test(n)) return '피트니스'
  if (/의원|한의원|정형외과|병원/.test(n)) return '병원'
  return null
}
function readBizContext(): BizContext {
  if (typeof window === 'undefined') return DEFAULT_CTX
  try {
    const raw1 = localStorage.getItem('localution.store_info')
    const raw2 = localStorage.getItem('localution_store')
    const p: any = raw1 ? JSON.parse(raw1) : raw2 ? JSON.parse(raw2) : {}
    const addrSrc = [p?.location, p?.address, p?.branch, p?.storeName, p?.name].filter(Boolean).join(' ')
    let region = DEFAULT_CTX.region
    const gu = addrSrc.match(/([가-힣]{1,4})(구|군)/)
    if (gu) region = gu[1]
    else {
      const known = ['해운대','광안리','서면','강남','서초','홍대','합정','이태원','성수','건대','일산','분당','판교','송도','동탄','광교','수원','안양','평촌','인천','부평','부천','대구','동성로','수성','광주','상무','대전','둔산','울산','청주','전주','제주','서귀포','창원','마산','포항','경주','천안','아산','세종','강릉','춘천','원주']
      for (const k of known) if (addrSrc.includes(k)) { region = k; break }
    }
    const businessName = p?.name || p?.storeName || DEFAULT_CTX.businessName
    const category = p?.category || p?.industry || inferCategoryFromName(businessName) || DEFAULT_CTX.category
    return { region, category, businessName }
  } catch { return DEFAULT_CTX }
}

// ── 키워드별 점수 분석 데이터 ─────────────────────────
interface KeywordScore {
  keyword: string
  totalScore: number
  factors: {
    label: string
    score: number
    max: number
    tip: string
  }[]
  searchVol: number
  competition: '낮음' | '보통' | '높음'
  currentRank: number | null
  trend: 'up' | 'down' | 'stable'
}

// ── 5개 점수 프로파일 (상위·평균·하위 분포 유지) ───────
// 각 프로파일: 전체/부문별 점수 + 팁 템플릿 (지역·업종·키워드 치환 가능)
type FactorTplFn = (ctx: BizContext, kw: string) => string
interface ScoreProfile {
  totalScore: number
  searchVol: number
  competition: '낮음' | '보통' | '높음'
  currentRank: number | null
  trend: 'up' | 'down' | 'stable'
  factors: { label: string; score: number; max: number; tipFn: FactorTplFn }[]
}

const PROFILES: ScoreProfile[] = [
  // 1. 주력 대형 키워드 — 72점, 높음 경쟁, 3위
  { totalScore: 72, searchVol: 2340, competition: '높음', currentRank: 3, trend: 'up', factors: [
    { label: '제목 키워드 포함', score: 95, max: 100, tipFn: () => '매장명에 주요 키워드가 잘 포함되어 있습니다' },
    { label: '소개글 키워드 밀도', score: 45, max: 100, tipFn: () => '소개글에 키워드를 2~3회 더 자연스럽게 추가하세요' },
    { label: '리뷰 키워드 언급', score: 88, max: 100, tipFn: () => '고객 리뷰에서 해당 키워드가 자주 언급됩니다' },
    { label: '블로그 노출 빈도', score: 62, max: 100, tipFn: () => '해당 키워드로 블로그 체험단을 진행하면 효과적입니다' },
    { label: '카테고리 일치도', score: 90, max: 100, tipFn: () => '업종 카테고리가 키워드와 잘 매칭됩니다' },
    { label: '최근 활동 점수', score: 55, max: 100, tipFn: () => '최근 2주간 사진/소식 업로드가 부족합니다' },
  ]},
  // 2. 브랜드/롱테일 — 91점, 낮음 경쟁, 2위 (최고 사례)
  { totalScore: 91, searchVol: 196, competition: '낮음', currentRank: 2, trend: 'up', factors: [
    { label: '제목 키워드 포함', score: 100, max: 100, tipFn: () => '매장명에 키워드가 포함되어 있습니다' },
    { label: '소개글 키워드 밀도', score: 82, max: 100, tipFn: (_, kw) => `소개글에 "${kw}" 키워드가 적절히 포함됨` },
    { label: '리뷰 키워드 언급', score: 94, max: 100, tipFn: (_, kw) => `리뷰에서 "${kw}" 키워드가 빈번히 언급됩니다` },
    { label: '블로그 노출 빈도', score: 88, max: 100, tipFn: () => '블로그에서 해당 키워드로 꾸준히 노출 중' },
    { label: '카테고리 일치도', score: 95, max: 100, tipFn: () => '카테고리 매칭 우수' },
    { label: '최근 활동 점수', score: 85, max: 100, tipFn: () => '최근 활동이 활발합니다' },
  ]},
  // 3. 역세권 대형 — 48점, 높음 경쟁, 12위 (개선 필요)
  { totalScore: 48, searchVol: 2860, competition: '높음', currentRank: 12, trend: 'up', factors: [
    { label: '제목 키워드 포함', score: 60, max: 100, tipFn: (c) => `매장명에 "${c.region}역" 키워드가 직접 포함되지 않음` },
    { label: '소개글 키워드 밀도', score: 30, max: 100, tipFn: (c) => `소개글에 "${c.region}역" 관련 키워드가 매우 부족합니다` },
    { label: '리뷰 키워드 언급', score: 52, max: 100, tipFn: () => '리뷰에서 해당 키워드 언급이 적은 편입니다' },
    { label: '블로그 노출 빈도', score: 35, max: 100, tipFn: () => '해당 키워드 블로그 글이 매우 부족합니다' },
    { label: '카테고리 일치도', score: 78, max: 100, tipFn: () => '카테고리는 부분 일치' },
    { label: '최근 활동 점수', score: 40, max: 100, tipFn: () => '최근 활동 점수가 낮습니다. 주 2회 이상 업로드 권장' },
  ]},
  // 4. 중형 — 58점, 높음 경쟁, 8위 (하락세)
  { totalScore: 58, searchVol: 2570, competition: '높음', currentRank: 8, trend: 'down', factors: [
    { label: '제목 키워드 포함', score: 50, max: 100, tipFn: (c) => `"${c.region}" 키워드가 매장명에 없습니다. 소개글 보강 필요` },
    { label: '소개글 키워드 밀도', score: 42, max: 100, tipFn: (c) => `소개글에 "${c.region}" 키워드를 3~4회 추가하세요` },
    { label: '리뷰 키워드 언급', score: 65, max: 100, tipFn: (c) => `리뷰에서 "${c.region}" 언급 비율이 보통입니다` },
    { label: '블로그 노출 빈도', score: 55, max: 100, tipFn: () => '해당 키워드 블로그 글이 부족합니다' },
    { label: '카테고리 일치도', score: 82, max: 100, tipFn: () => '카테고리 일치도 양호' },
    { label: '최근 활동 점수', score: 48, max: 100, tipFn: () => '최근 사진/소식 업데이트가 부족합니다' },
  ]},
  // 5. 업종 특화 — 65점, 보통, 7위 (유지)
  { totalScore: 65, searchVol: 1450, competition: '보통', currentRank: 7, trend: 'stable', factors: [
    { label: '제목 키워드 포함', score: 80, max: 100, tipFn: (c) => `매장명에 "${c.category}" 관련 키워드 부분 포함` },
    { label: '소개글 키워드 밀도', score: 55, max: 100, tipFn: (_, kw) => `소개글에 "${kw}" 키워드를 1~2회 추가하면 좋습니다` },
    { label: '리뷰 키워드 언급', score: 72, max: 100, tipFn: (c) => `리뷰에서 ${c.category} 관련 키워드가 적당히 언급됩니다` },
    { label: '블로그 노출 빈도', score: 50, max: 100, tipFn: (_, kw) => `"${kw}" 키워드 블로그 체험단 진행 권장` },
    { label: '카테고리 일치도', score: 88, max: 100, tipFn: (c) => `${c.category} 카테고리와 잘 매칭됩니다` },
    { label: '최근 활동 점수', score: 52, max: 100, tipFn: () => '최근 2주간 업데이트 필요' },
  ]},
]

// 업체 컨텍스트 → 5개 키워드 점수 배열
function buildKeywordScores(ctx: BizContext): KeywordScore[] {
  const s = getSuffixes(ctx.category)
  // 5개 키워드 슬롯
  const keywords = [
    `${ctx.region} ${s[0]}`,         // 주력
    `${ctx.region}구 ${s[1]}`,       // 롱테일
    `${ctx.region}역 ${s[0]}`,       // 역세권
    `${ctx.region} ${s[3]}`,         // 중형
    `${ctx.region} ${s[4] || s[0]}`, // 업종 특화
  ]
  return PROFILES.map((p, i) => ({
    keyword: keywords[i],
    totalScore: p.totalScore,
    searchVol: p.searchVol,
    competition: p.competition,
    currentRank: p.currentRank,
    trend: p.trend,
    factors: p.factors.map(f => ({
      label: f.label,
      score: f.score,
      max: f.max,
      tip: f.tipFn(ctx, keywords[i]),
    })),
  }))
}

// ── 점수 색상 헬퍼 ────────────────────────────────────
function scoreColor(s: number) {
  if (s >= 80) return '#12B76A'
  if (s >= 60) return '#F59E0B'
  return '#F04452'
}
function scoreLabel(s: number) {
  if (s >= 80) return '우수'
  if (s >= 60) return '보통'
  return '개선 필요'
}
function scoreBg(s: number) {
  if (s >= 80) return 'bg-[#ECFDF5]'
  if (s >= 60) return 'bg-[#FFFBEB]'
  return 'bg-[#FFF1F2]'
}

// ── 경쟁도 뱃지 ──────────────────────────────────────
function CompBadge({ level }: { level: string }) {
  const cls = level === '높음' ? 'bg-[#FFF1F2] text-[#F04452]' : level === '보통' ? 'bg-[#FFFBEB] text-[#F59E0B]' : 'bg-[#ECFDF5] text-[#12B76A]'
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cls}`}>{level}</span>
}

// ── 개별 키워드 카드 ──────────────────────────────────
function ScoreCard({ data }: { data: KeywordScore }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-[#F2F4F6] hover:border-[#3182F6] transition-colors">
      {/* 카드 헤더 */}
      <button onClick={() => setOpen(v => !v)} className="w-full px-5 py-4 text-left hover:bg-[#FAFBFF] transition-colors">
        <div className="flex items-center gap-4">
          {/* 종합 점수 */}
          <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${scoreBg(data.totalScore)}`}>
            <span className="text-lg font-black" style={{ color: scoreColor(data.totalScore) }}>{data.totalScore}</span>
            <span className="text-[8px] font-bold" style={{ color: scoreColor(data.totalScore) }}>{scoreLabel(data.totalScore)}</span>
          </div>

          {/* 키워드 정보 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold text-[#191F28]">{data.keyword}</span>
              <CompBadge level={data.competition} />
              {data.trend === 'up' && <span className="text-[10px] text-[#12B76A] font-bold">▲ 상승세</span>}
              {data.trend === 'down' && <span className="text-[10px] text-[#F04452] font-bold">▼ 하락세</span>}
              {data.trend === 'stable' && <span className="text-[10px] text-[#8B95A1] font-bold">— 유지</span>}
            </div>
            <div className="flex items-center gap-4 text-[11px] text-[#8B95A1]">
              <span>월간 검색량 <strong className="text-[#191F28]">{data.searchVol.toLocaleString()}</strong></span>
              <span>현재 순위 <strong className={data.currentRank && data.currentRank <= 5 ? 'text-[#3182F6]' : data.currentRank && data.currentRank <= 10 ? 'text-[#F59E0B]' : 'text-[#F04452]'}>{data.currentRank ?? '—'}위</strong></span>
            </div>
            {/* 미니 요소별 바 */}
            <div className="flex gap-1 mt-2">
              {data.factors.map((f, i) => (
                <div key={i} className="flex-1 h-1.5 rounded-full bg-[#F2F4F6] overflow-hidden" title={`${f.label}: ${f.score}점`}>
                  <div className="h-full rounded-full" style={{ width: `${f.score}%`, background: scoreColor(f.score) }} />
                </div>
              ))}
            </div>
          </div>

          <span className={`text-xs text-[#8B95A1] transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
        </div>
      </button>

      {/* 상세 요소별 분석 */}
      {open && (
        <div className="border-t border-[#F2F4F6] px-5 py-4 space-y-3">
          {data.factors.map((f, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-[#191F28]">{f.label}</span>
                <span className="text-xs font-bold" style={{ color: scoreColor(f.score) }}>{f.score} / {f.max}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#F2F4F6] overflow-hidden mb-1">
                <div className="h-full rounded-full transition-all" style={{ width: `${f.score}%`, background: scoreColor(f.score) }} />
              </div>
              <p className="text-[11px] text-[#8B95A1]">💡 {f.tip}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────
export default function KeywordScorePage() {
  const [sortBy, setSortBy] = useState<'score' | 'volume' | 'rank'>('score')
  const [ctx, setCtx] = useState<BizContext>(DEFAULT_CTX)

  // 프로필 기반 업체 컨텍스트
  useEffect(() => {
    setCtx(readBizContext())
    const onChange = () => setCtx(readBizContext())
    window.addEventListener('localution:user-change', onChange)
    window.addEventListener('storage', onChange)
    return () => {
      window.removeEventListener('localution:user-change', onChange)
      window.removeEventListener('storage', onChange)
    }
  }, [])

  // 컨텍스트가 바뀌면 키워드 스코어 재생성
  const scores = useMemo(() => buildKeywordScores(ctx), [ctx])

  const sorted = [...scores].sort((a, b) => {
    if (sortBy === 'score') return b.totalScore - a.totalScore
    if (sortBy === 'volume') return b.searchVol - a.searchVol
    return (a.currentRank ?? 999) - (b.currentRank ?? 999)
  })

  const avgScore = Math.round(scores.reduce((s, k) => s + k.totalScore, 0) / scores.length)
  const highCount = scores.filter(k => k.totalScore >= 80).length
  const lowCount = scores.filter(k => k.totalScore < 60).length

  return (
    <div className="flex min-h-screen bg-[#F2F4F6]">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-[220px] pt-16 md:pt-0 min-w-0">
        <PageHeader
          icon={<Target size={28} className="text-white" strokeWidth={2.5} />}
          title="키워드 스코어"
          subtitle="조회수·경쟁도·전환가치를 한 번에 — 진짜 돈 되는 키워드만"
          variant="orange"
        />
        <div className="p-4 md:p-6">

        {/* 헤더 */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-black text-[#191F28]">📊 키워드 점수분석</h1>
            <p className="text-sm text-[#8B95A1] mt-0.5">키워드별 최적화 상태를 요소별로 분석하여 개선 방향을 제시합니다</p>
          </div>
        </div>

        {/* 데모 안내 배너 */}
        <div className="mb-6 bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl px-5 py-4">
          <p className="text-xs font-bold text-[#92400E] mb-1">⚠ 아래는 예시 데이터입니다</p>
          <p className="text-[11px] text-[#92400E] leading-relaxed">
            현재 보이는 키워드와 점수는 데모용 샘플입니다. 네이버 Search API 또는 외부 순위 측정 서비스(selfrank·키워드마스터 등)를 연동하면 내 매장의 실제 키워드 점수로 교체됩니다.
          </p>
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-sm p-5 text-center">
            <p className="text-xs text-[#8B95A1] mb-1">총 키워드</p>
            <p className="text-2xl font-black text-[#191F28]">{scores.length}개</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-5 text-center">
            <p className="text-xs text-[#8B95A1] mb-1">평균 점수</p>
            <p className="text-2xl font-black" style={{ color: scoreColor(avgScore) }}>{avgScore}점</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-5 text-center">
            <p className="text-xs text-[#8B95A1] mb-1">우수 키워드 (80+)</p>
            <p className="text-2xl font-black text-[#12B76A]">{highCount}개</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-5 text-center">
            <p className="text-xs text-[#8B95A1] mb-1">개선 필요 (60 미만)</p>
            <p className="text-2xl font-black text-[#F04452]">{lowCount}개</p>
          </div>
        </div>

        {/* 정렬 */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-[#191F28]">키워드별 점수 상세 <span className="text-[#8B95A1] font-normal">(클릭하여 요소별 분석 확인)</span></p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#8B95A1]">정렬:</span>
            {([['score', '점수순'], ['volume', '검색량순'], ['rank', '순위순']] as const).map(([key, label]) => (
              <button key={key} onClick={() => setSortBy(key)}
                className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors ${sortBy === key ? 'bg-[#3182F6] text-white' : 'bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB]'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 키워드 카드 목록 */}
        <div className="space-y-3">
          {sorted.map(kw => (
            <ScoreCard key={kw.keyword} data={kw} />
          ))}
        </div>

        {/* 하단 안내 */}
        <div className="mt-6 p-4 bg-white rounded-2xl shadow-sm text-center">
          <p className="text-[11px] text-[#8B95A1]">
            점수는 <strong className="text-[#3182F6]">네이버 플레이스 알고리즘</strong> 주요 요소를 기반으로 산출됩니다.
            실제 순위와 차이가 있을 수 있으며, 정기적 분석을 통해 최적화 전략을 수립하세요.
          </p>
        </div>
        </div>
        <Footer />
      </main>
    </div>
  )
}
