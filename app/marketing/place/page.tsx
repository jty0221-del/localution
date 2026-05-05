'use client'
export const dynamic = 'force-dynamic'

import { useState, useMemo, useEffect, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'
import PageHeader from '../../components/PageHeader'
import Footer from '../../components/Footer'
import { MapPin } from 'lucide-react'

// ── 34항목 체크리스트 (하랑마케팅 PDF 기반) ─────────────
type ChecklistItem = { id: string; title: string; detail: string; youtube?: string; weight?: number }
type ChecklistGroup = { group: string; icon: string; color: string; items: ChecklistItem[] }

// 유튜브 ID 추출 (watch?v=, youtu.be/, embed/ 모두 지원)
function extractYoutubeId(url: string): string | null {
  if (!url) return null
  const m1 = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/)
  if (m1) return m1[1]
  const m2 = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)
  if (m2) return m2[1]
  const m3 = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/)
  if (m3) return m3[1]
  const m4 = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/)
  if (m4) return m4[1]
  return null
}

const CHECKLIST: ChecklistGroup[] = [
  {
    group: '기본정보 설정 점검',
    icon: '📋',
    color: '#3182F6',
    items: [
      { id: 'basic_1', title: '상호명 정확성', detail: '네이버 플레이스 상호명과 실제 매장명이 100% 일치해야 함. 띄어쓰기·영문 표기·특수문자까지 통일해야 검색 매칭이 잡힘. 간판과 다르면 신뢰도 감점.' },
      { id: 'basic_2', title: '카테고리 적절성', detail: '업종 카테고리가 서비스/제품과 일치해야 정확한 검색 결과에 노출. 음식점이면 세부 카테고리(한식/일식/카페 등)까지 세팅.' },
      { id: 'basic_3', title: '연락처·주소 최신화', detail: '번호 변경/이전 후 미업데이트 시 고객 이탈 + 검색 신뢰도 하락. 분기별 1회 이상 확인 권장.' },
      { id: 'basic_4', title: '영업시간·휴무일', detail: '영업시간/휴무/공휴일 안내가 최신인지. 잘못된 정보는 별점 하락과 부정 리뷰 직결.' },
      { id: 'basic_5', title: '편의시설 정보', detail: '주차, WiFi, 반려동물, 예약 가능, 포장 등 편의시설 체크. 등록 많을수록 네이버 알고리즘 가산점.' },
      { id: 'basic_6', title: '메뉴·가격 정보', detail: '대표 메뉴/가격/사진이 정확하고 가독성 좋게 등록돼야 전환율 상승. 가격 숨기면 전환 손해 큼.' },
      { id: 'basic_7', title: '소개글 및 대표키워드', detail: '소개글에 지역명+업종+차별점 키워드 자연스럽게 녹이기. 단순 나열 금지, 스토리텔링 형식이 유리.' },
    ],
  },
  {
    group: '노출 순위 영향 요소',
    icon: '🔍',
    color: '#12B76A',
    items: [
      { id: 'rank_1', title: '키워드 연관성', detail: '검색 키워드와 상호/카테고리/리뷰 키워드 연관도. 고객이 쓸 법한 키워드 자연 노출이 관건.' },
      { id: 'rank_2', title: '업체 인기도', detail: '조회수/클릭률/저장수/방문자수 지표. 네이버 내부 지표라 직접 확인 불가지만 활동성 유지가 답.' },
      { id: 'rank_3', title: '리뷰 수 및 질', detail: '리뷰 수, 평점, 최신성, 키워드 다양성 모두 영향. 50건 이상 4.5점 유지가 최소 기준.' },
      { id: 'rank_4', title: '사진 및 콘텐츠 품질', detail: '고화질 사진, 다양한 각도, 최신 이미지 필수. 대표사진·메뉴·내부·외부·분위기 최소 각 3장 이상.' },
      { id: 'rank_5', title: '정보 최신성', detail: '정기 업데이트(이벤트/사진/소식)가 순위에 긍정 영향. 3개월 이상 방치 시 하락 위험.' },
      { id: 'rank_6', title: '거리 및 위치 요소', detail: '사용자 검색 위치 기반 가중치. 물리적 거리는 못 바꾸니 타지역 키워드 노출은 리뷰/콘텐츠로 보완.' },
    ],
  },
  {
    group: '마케팅 활용 요소',
    icon: '📣',
    color: '#F59E0B',
    items: [
      { id: 'mkt_1', title: '리뷰 유도 및 관리', detail: '고객 자발적 리뷰 유도(영수증 안내/할인쿠폰). 부정 리뷰엔 24시간 내 답글 필수.' },
      { id: 'mkt_2', title: '이벤트/소식 게시', detail: '월 1~2회 이상 이벤트·할인·신메뉴 등 소식 게시. "소식" 탭 활성화가 활동성 점수에 기여.' },
      { id: 'mkt_3', title: '블로그/SNS 연동', detail: '자사 블로그/인스타/유튜브 링크 등록. 외부 채널 유입과 통합 브랜딩 효과.' },
      { id: 'mkt_4', title: '키워드 모니터링', detail: '주요 키워드 순위를 주 1회 이상 체크. 순위 변동 시 원인 파악 → 콘텐츠/리뷰 보완.' },
      { id: 'mkt_5', title: '네이버 예약 활용', detail: '예약 기능 활성화 시 예약 전환율 + 순위 가산점. 설정 안 하면 경쟁 업체에 밀림.' },
      { id: 'mkt_6', title: '네이버 톡톡 응대', detail: '톡톡 문의 빠른 응답률은 신뢰도 상승 직결. 자동 응답 메시지도 설정 권장.' },
    ],
  },
  {
    group: '순위/매출 하락 위험 요소',
    icon: '⚠️',
    color: '#F04452',
    items: [
      { id: 'risk_1', title: '정보 불일치', detail: '네이버/지도/홈페이지/SNS 정보가 제각각이면 신뢰도 하락 + 알고리즘 감점. 주소·연락처·영업시간 통일 필수.' },
      { id: 'risk_2', title: '과도한 정보 수정', detail: '짧은 시간에 상호/주소/카테고리 반복 수정 시 어뷰징으로 간주되어 순위 페널티. 수정은 월 1~2회 이내.' },
      { id: 'risk_3', title: '리뷰 어뷰징 위험', detail: '가짜 리뷰/지인 리뷰/대행사 조작 리뷰 발각 시 플레이스 제재. 자연 발생 리뷰 중심으로 관리.' },
      { id: 'risk_4', title: '부정적 평가 방치', detail: '1점 리뷰나 악성 평가에 무대응 시 잠재 고객 이탈. 답글 톤은 차분하고 개선 의지 담아 작성.' },
      { id: 'risk_5', title: '정책 위반 및 신고', detail: '네이버 정책(유해 콘텐츠/허위 광고/과장 표현) 위반 누적 시 노출 제한. 소개글/사진 검토 주기 필요.' },
      { id: 'risk_6', title: '경쟁 대비 활동 저하', detail: '경쟁 업체가 주 1회 업데이트할 때 우리가 월 1회면 상대적 순위 하락. 벤치마킹 정기 실행.' },
    ],
  },
  {
    group: '검색 알고리즘 & 순위 시스템 참고',
    icon: '🧠',
    color: '#8B5CF6',
    items: [
      { id: 'algo_1', title: '검색 연관성 (Relevance)', detail: '키워드-콘텐츠 매칭도. 상호·카테고리·리뷰 전반에 핵심 키워드가 자연스럽게 분포해야 함.' },
      { id: 'algo_2', title: '사용자 인기 지표', detail: '클릭/저장/방문/공유 등 사용자 반응 지표. 이벤트/쿠폰으로 반응 유도 가능.' },
      { id: 'algo_3', title: '거리 가중치', detail: '검색 위치 기반 거리 점수. 변경 불가지만 지역 키워드 강화로 일부 보완.' },
      { id: 'algo_4', title: '정보 충실도', detail: '등록 정보량(카테고리/편의시설/메뉴/사진 등)이 많을수록 가산점. 빈칸 최소화.' },
      { id: 'algo_5', title: '신뢰도 및 어뷰징 필터', detail: '비정상 활동(대량 리뷰/반복 수정) 감지 시 필터링. 건전한 운영 패턴 유지.' },
    ],
  },
  {
    group: '전문가 인사이트 추가 팁',
    icon: '💡',
    color: '#06B6D4',
    items: [
      { id: 'pro_1', title: '대표사진 주기적 교체', detail: '분기별 1회 대표사진 교체하면 "신규성" 가산점. 동일 사진 장기 노출은 감점 요인.' },
      { id: 'pro_2', title: '새로 오픈 배지 활용', detail: '오픈 6개월 이내 배지 자동 부여. 이 기간엔 공격적 마케팅 + 리뷰 확보 골든타임.' },
      { id: 'pro_3', title: '쿠폰 이벤트 제공', detail: '네이버 쿠폰 발행 시 노출 가산점 + 전환율 상승. 월 1~2회 소액 쿠폰이라도 지속 발행 권장.' },
      { id: 'pro_4', title: '플레이스 기능 풀활용', detail: '예약·주문·메뉴·쿠폰·소식·사진·영상 등 모든 기능 활성화. 비워둔 기능 하나당 감점.' },
    ],
  },
]

const TOTAL_ITEMS = CHECKLIST.reduce((s, g) => s + g.items.length, 0) // 34

// ── 점수 구간 해석 ─────────────────────────────────────
function interpretScore(score: number) {
  if (score >= 31) return { label: '마케팅 잘 진행 중', color: '#12B76A', bg: '#ECFDF5', detail: '현재 운영 수준이 우수합니다. 주기적인 유지 관리와 경쟁 모니터링만 꾸준히 해주세요.' }
  if (score >= 21) return { label: '1~2군데 보완 필요', color: '#3182F6', bg: '#EFF6FF', detail: '기본기는 잡혀 있습니다. 미체크 항목 중 위험/노출 관련 항목 우선 보완하세요.' }
  if (score >= 16) return { label: '경쟁력 부족', color: '#F59E0B', bg: '#FFFBEB', detail: '경쟁 업체 대비 부족한 영역이 많습니다. 기본정보/노출/마케팅 3영역 동시 보완 필요.' }
  return { label: '시급 (즉시 조치)', color: '#F04452', bg: '#FFF1F2', detail: '플레이스 최적화가 거의 안 된 상태입니다. 상위 노출이나 유입 기대 어려움. 1주일 내 전면 점검 권장.' }
}

// ── URL 파싱 ───────────────────────────────────────────
type ParsedPlace = { id: string; category: string | null }
function parsePlace(raw: string): ParsedPlace | null {
  if (!raw) return null
  const url = raw.trim()
  // m.place.naver.com/{category}/{id}
  const m1 = url.match(/m\.place\.naver\.com\/(restaurant|place|hairshop|beautyshop|accommodation|hospital|cafe|attraction)\/(\d+)/)
  if (m1) return { category: m1[1], id: m1[2] }
  // map.naver.com/p/entry/place/{id}
  const m2 = url.match(/map\.naver\.com\/p\/entry\/place\/(\d+)/)
  if (m2) return { category: null, id: m2[1] }
  // pcmap.place.naver.com/{category}/{id}
  const m3 = url.match(/pcmap\.place\.naver\.com\/(\w+)\/(\d+)/)
  if (m3) return { category: m3[1], id: m3[2] }
  // naver.me/xxxxx (단축URL 미지원)
  if (/naver\.me\//.test(url)) return null
  // 순수 숫자
  if (/^\d{5,}$/.test(url)) return { category: null, id: url }
  return null
}

// ── 상세 모달 ──────────────────────────────────────────
function DetailModal({ item, youtubeUrl, onSetYoutube, onClose }: {
  item: ChecklistItem | null
  youtubeUrl: string
  onSetYoutube: (url: string) => void
  onClose: () => void
}) {
  const [editMode, setEditMode] = useState(false)
  const [inputUrl, setInputUrl] = useState('')

  useEffect(() => {
    if (!item) return
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [item, onClose])

  useEffect(() => {
    setEditMode(false)
    setInputUrl(youtubeUrl || '')
  }, [item, youtubeUrl])

  if (!item) return null
  const ytId = extractYoutubeId(youtubeUrl)

  const save = () => {
    const v = inputUrl.trim()
    if (v && !extractYoutubeId(v)) {
      alert('유튜브 URL 형식이 올바르지 않아요.\n예: https://youtu.be/dQw4w9WgXcQ')
      return
    }
    onSetYoutube(v)
    setEditMode(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-base font-black text-[#191F28] pr-4">{item.title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-[#F2F4F6] flex items-center justify-center text-[#8B95A1] text-xl leading-none">×</button>
        </div>
        <p className="text-sm text-[#4E5968] leading-relaxed whitespace-pre-line">{item.detail}</p>

        {/* ── 유튜브 영상 섹션 ── */}
        <div className="mt-5 pt-4 border-t border-[#F2F4F6]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-[#191F28]">🎬 관련 영상</p>
            {!editMode && (
              <button onClick={() => setEditMode(true)} className="text-[11px] font-semibold text-[#8B95A1] hover:text-[#3182F6]">
                {youtubeUrl ? '수정' : '+ 링크 추가'}
              </button>
            )}
          </div>

          {editMode ? (
            <div className="space-y-2">
              <input
                type="text"
                value={inputUrl}
                onChange={e => setInputUrl(e.target.value)}
                placeholder="https://youtu.be/..."
                className="w-full px-3 py-2 rounded-lg border-2 border-[#E5E8EB] focus:border-[#3182F6] focus:outline-none text-xs"
              />
              <div className="flex gap-2">
                <button onClick={save} className="flex-1 py-2 rounded-lg bg-[#FF0000] text-white text-xs font-bold hover:bg-[#CC0000]">저장</button>
                <button onClick={() => { setEditMode(false); setInputUrl(youtubeUrl || '') }} className="flex-1 py-2 rounded-lg bg-[#F2F4F6] text-[#8B95A1] text-xs font-bold hover:bg-[#E5E8EB]">취소</button>
                {youtubeUrl && (
                  <button onClick={() => { onSetYoutube(''); setEditMode(false); setInputUrl('') }} className="px-3 py-2 rounded-lg bg-[#FFF1F2] text-[#F04452] text-xs font-bold hover:bg-[#FFE4E6]">삭제</button>
                )}
              </div>
              <p className="text-[10px] text-[#8B95A1]">youtu.be / youtube.com/watch?v= / shorts / embed 형식 모두 지원</p>
            </div>
          ) : ytId ? (
            <div className="space-y-2">
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  src={`https://www.youtube.com/embed/${ytId}`}
                  className="absolute inset-0 w-full h-full rounded-xl"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <a href={youtubeUrl} target="_blank" rel="noopener noreferrer"
                className="block text-center text-[11px] text-[#3182F6] font-semibold hover:underline">
                유튜브에서 열기 ↗
              </a>
            </div>
          ) : (
            <div className="text-center py-4 bg-[#F8F9FA] rounded-xl">
              <p className="text-xs text-[#8B95A1]">아직 연결된 영상이 없습니다</p>
              <p className="text-[10px] text-[#8B95A1] mt-1">"+ 링크 추가"로 유튜브 URL 붙여넣기</p>
            </div>
          )}
        </div>

        <button onClick={onClose} className="mt-5 w-full py-3 rounded-xl bg-[#3182F6] text-white text-sm font-bold hover:bg-[#1B64DA] transition-colors">확인</button>
      </div>
    </div>
  )
}

// ── 체크박스 + 제목 + 상세 버튼 ────────────────────────
function ChecklistRow({ item, checked, hasVideo, onToggle, onOpen }: {
  item: ChecklistItem; checked: boolean; hasVideo: boolean; onToggle: () => void; onOpen: () => void
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-[#F8F9FA] transition-colors">
      <button onClick={onToggle} className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${checked ? 'bg-[#12B76A] border-[#12B76A]' : 'bg-white border-[#D1D5DB] hover:border-[#3182F6]'}`}>
        {checked && <span className="text-white text-xs font-black">✓</span>}
      </button>
      <button onClick={onToggle} className="flex-1 text-left min-w-0">
        <p className={`text-sm font-semibold ${checked ? 'text-[#12B76A] line-through' : 'text-[#191F28]'}`}>{item.title}</p>
      </button>
      {hasVideo && (
        <button onClick={onOpen} title="영상 보기" className="flex-shrink-0 w-6 h-6 rounded-full bg-[#FFF1F2] text-[#F04452] hover:bg-[#FF0000] hover:text-white flex items-center justify-center transition-colors">
          <span className="text-[10px]">▶</span>
        </button>
      )}
      <button onClick={onOpen} className="flex-shrink-0 text-[11px] font-semibold text-[#3182F6] hover:text-[#1B64DA] px-2 py-1 rounded-lg hover:bg-[#EFF6FF] transition-colors">
        상세 →
      </button>
    </div>
  )
}

// ── 메인 페이지 ────────────────────────────────────────
// ── 22차-3b: SVG sparkline 차트 ─────────────
function SparklineChart({ title, snapshots, field, color }: {
  title: string
  snapshots: any[]
  field: 'visitor_review_count' | 'blog_review_count'
  color: string
}) {
  const pts = snapshots
    .map(s => ({ ts: new Date(s.ts).getTime(), v: s[field] }))
    .filter(p => typeof p.v === 'number' && !isNaN(p.v))
  if (pts.length === 0) return null

  const values = pts.map(p => p.v as number)
  const minV = Math.min(...values)
  const maxV = Math.max(...values)
  const range = maxV - minV || 1
  const first = values[0]
  const last  = values[values.length - 1]
  const delta = last - first

  const W = 600
  const H = 80
  const pad = 4
  const stepX = pts.length > 1 ? (W - pad * 2) / (pts.length - 1) : 0

  const coords = pts.map((p, i) => {
    const x = pad + i * stepX
    const y = H - pad - ((p.v as number - minV) / range) * (H - pad * 2)
    return { x, y, v: p.v as number, ts: p.ts }
  })

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')
  const areaPath = coords.length > 1
    ? `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${H - pad} L${coords[0].x.toFixed(1)},${H - pad} Z`
    : ''

  const fmtDate = (ts: number) => new Date(ts).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-bold text-[#4E5968]">{title}</p>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-[#8B95A1]">{first} → <span className="font-bold text-[#191F28]">{last}</span></span>
          {delta !== 0 && (
            <span className={`font-bold ${delta > 0 ? 'text-[#12B76A]' : 'text-[#F04452]'}`}>
              {delta > 0 ? '+' : ''}{delta}
            </span>
          )}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height: 80 }}>
        {areaPath && <path d={areaPath} fill={color} fillOpacity={0.12} />}
        <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={i === coords.length - 1 ? 3 : 2} fill={color} />
        ))}
      </svg>
      <div className="flex justify-between text-[9px] text-[#B0B8C1] mt-1">
        <span>{fmtDate(pts[0].ts)}</span>
        {pts.length > 2 && <span>{fmtDate(pts[Math.floor(pts.length / 2)].ts)}</span>}
        <span>{fmtDate(pts[pts.length - 1].ts)}</span>
      </div>
    </div>
  )
}

export default function PlaceDiagnosisPage() {
  const [urlInput, setUrlInput] = useState('')
  const [placeId, setPlaceId] = useState<string | null>(null)
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [modalItem, setModalItem] = useState<ChecklistItem | null>(null)
  const [storeInfo, setStoreInfo] = useState<any>(null)
  const [youtubeLinks, setYoutubeLinks] = useState<Record<string, string>>({})
  const [fetchedInfo, setFetchedInfo] = useState<any>(null)
  const [loadingInfo, setLoadingInfo] = useState(false)
  const [fetchError, setFetchError] = useState<string>('')
  // 22차-2: 추적 등록
  const [trackedTargets, setTrackedTargets] = useState<any[]>([])
  const [loadingTargets, setLoadingTargets] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [registerMsg, setRegisterMsg] = useState<string>('')
  // 22차-3b: 차트/새로고침
  const [expandedTargetId, setExpandedTargetId] = useState<string | null>(null)
  const [historyByTarget, setHistoryByTarget] = useState<Record<string, any[]>>({})
  const [loadingHistoryId, setLoadingHistoryId] = useState<string | null>(null)
  const [refreshingId, setRefreshingId] = useState<string | null>(null)

  // localStorage: store_info + youtube links 로딩
  useEffect(() => {
    try {
      const s = localStorage.getItem('localution.store_info')
      if (s) setStoreInfo(JSON.parse(s))
    } catch {}
    try {
      const y = localStorage.getItem('localution.place_checklist_youtube')
      if (y) setYoutubeLinks(JSON.parse(y))
    } catch {}
  }, [])

  // 22차-2: 추적 목록 로딩
  const reloadTargets = useCallback(async () => {
    setLoadingTargets(true)
    try {
      const res = await fetch('/api/place/targets', { cache: 'no-store' })
      if (res.status === 401) { setTrackedTargets([]); return }
      const data = await res.json()
      if (res.ok && Array.isArray(data.targets)) setTrackedTargets(data.targets)
    } catch {} finally { setLoadingTargets(false) }
  }, [])
  useEffect(() => { reloadTargets() }, [reloadTargets])

  const isCurrentTracked = useMemo(
    () => !!placeId && trackedTargets.some(t => t.place_id === placeId),
    [placeId, trackedTargets],
  )

  const registerTarget = useCallback(async () => {
    if (!placeId) return
    setRegistering(true)
    setRegisterMsg('')
    try {
      const res = await fetch('/api/place/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput || placeId }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 401) setRegisterMsg('로그인 후 이용 가능합니다.')
        else setRegisterMsg(data.error || '등록 실패')
        return
      }
      setRegisterMsg(`✓ "${data.target?.name || placeId}" 추적 등록 완료`)
      await reloadTargets()
    } catch (e: any) {
      setRegisterMsg('네트워크 오류로 등록 실패')
    } finally {
      setRegistering(false)
    }
  }, [placeId, urlInput, reloadTargets])

  const removeTarget = useCallback(async (targetId: string, name: string) => {
    if (!confirm(`"${name}" 추적을 해제할까요? 스냅샷 이력도 함께 삭제됩니다.`)) return
    try {
      const res = await fetch(`/api/place/targets?target_id=${encodeURIComponent(targetId)}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || '삭제 실패')
        return
      }
      await reloadTargets()
    } catch {
      alert('네트워크 오류로 삭제 실패')
    }
  }, [reloadTargets])

  const loadTrackedTarget = useCallback((t: any) => {
    const url = `https://m.place.naver.com/${t.category || 'restaurant'}/${t.place_id}/home`
    setUrlInput(url)
    setPlaceId(t.place_id)
    setFetchedInfo({
      placeId:              t.place_id,
      category:             t.category,
      categoryName:         t.category_name,
      name:                 t.name,
      address:              t.road_address || '',
      roadAddress:          t.road_address || '',
      phone:                t.phone || '',
      thumbnail:            t.thumbnail_url || '',
      visitorReviewCount:   t.last_visitor_review,
      blogReviewCount:      t.last_blog_review,
      rating:               t.last_rating,
    })
    setFetchError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // 22차-3b: 이력 로딩
  const loadHistory = useCallback(async (targetId: string) => {
    setLoadingHistoryId(targetId)
    try {
      const res = await fetch(`/api/place/history?target_id=${encodeURIComponent(targetId)}&days=30&limit=90`, { cache: 'no-store' })
      if (!res.ok) { setHistoryByTarget(p => ({ ...p, [targetId]: [] })); return }
      const data = await res.json()
      setHistoryByTarget(p => ({ ...p, [targetId]: Array.isArray(data.snapshots) ? data.snapshots : [] }))
    } catch {
      setHistoryByTarget(p => ({ ...p, [targetId]: [] }))
    } finally {
      setLoadingHistoryId(null)
    }
  }, [])

  const toggleExpand = useCallback((targetId: string) => {
    setExpandedTargetId(cur => {
      const next = cur === targetId ? null : targetId
      if (next && !historyByTarget[targetId]) loadHistory(targetId)
      return next
    })
  }, [historyByTarget, loadHistory])

  // 22차-3b: 수동 새로고침
  const refreshTarget = useCallback(async (targetId: string) => {
    setRefreshingId(targetId)
    try {
      const res = await fetch('/api/place/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_id: targetId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { alert(data.error || '새로고침 실패'); return }
      await Promise.all([reloadTargets(), loadHistory(targetId)])
    } catch {
      alert('네트워크 오류로 새로고침 실패')
    } finally {
      setRefreshingId(null)
    }
  }, [reloadTargets, loadHistory])

  const setYoutubeLink = useCallback((itemId: string, url: string) => {
    setYoutubeLinks(prev => {
      const next = { ...prev }
      if (url) next[itemId] = url
      else delete next[itemId]
      try { localStorage.setItem('localution.place_checklist_youtube', JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  // placeId 바뀌면 해당 체크 복구
  useEffect(() => {
    if (!placeId) return
    try {
      const saved = localStorage.getItem(`localution.place_check.${placeId}`)
      if (saved) setChecked(JSON.parse(saved))
      else setChecked({})
    } catch { setChecked({}) }
  }, [placeId])

  // checked 변경 시 저장
  useEffect(() => {
    if (!placeId) return
    try { localStorage.setItem(`localution.place_check.${placeId}`, JSON.stringify(checked)) } catch {}
  }, [checked, placeId])

  const score = useMemo(() => Object.values(checked).filter(Boolean).length, [checked])
  const ratio = Math.round((score / TOTAL_ITEMS) * 100)
  const interp = interpretScore(score)

  const handleAnalyze = async () => {
    const parsed = parsePlace(urlInput)
    if (!parsed) {
      alert('네이버 플레이스 URL에서 placeId 를 추출하지 못했어요.\n예: https://m.place.naver.com/restaurant/12345678 또는 숫자 ID 직접 입력')
      return
    }
    setPlaceId(parsed.id)
    setFetchError('')
    setFetchedInfo(null)
    setLoadingInfo(true)
    try {
      const qs = new URLSearchParams({ id: parsed.id })
      if (parsed.category) qs.set('category', parsed.category)
      const res = await fetch(`/api/place/lookup?${qs.toString()}`, { cache: 'no-store' })
      const data = await res.json()
      if (res.ok && data.ok && data.info) {
        setFetchedInfo(data.info)
      } else {
        setFetchError(data.message || '네이버에서 정보를 가져오지 못했어요. 비공개 업체거나 일시적 차단일 수 있어요.')
      }
    } catch (e) {
      setFetchError('네트워크 오류로 정보를 불러오지 못했어요.')
    } finally {
      setLoadingInfo(false)
    }
  }

  const toggleItem = useCallback((id: string) => {
    setChecked(p => ({ ...p, [id]: !p[id] }))
  }, [])

  const resetAll = () => {
    if (!confirm('체크 상태를 초기화할까요?')) return
    setChecked({})
  }

  const checkAll = () => {
    const all: Record<string, boolean> = {}
    CHECKLIST.forEach(g => g.items.forEach(i => { all[i.id] = true }))
    setChecked(all)
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-[220px] pt-4 md:pt-0 min-w-0">
        <PageHeader
          icon={<MapPin size={28} className="text-white" strokeWidth={2.5} />}
          title="네이버 플레이스 SEO"
          subtitle="내 매장 URL 붙여넣고 34항목 체크리스트로 자체 점검"
          variant="placeGreen"
        />
        <div className="p-4 md:p-6 max-w-5xl mx-auto">

          {/* URL 입력 박스 */}
          <div className="bg-white rounded-2xl shadow-sm p-5 mb-5">
            <label className="block text-sm font-bold text-[#191F28] mb-2">🔗 네이버 플레이스 URL 입력</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
                placeholder="https://m.place.naver.com/restaurant/12345678"
                className="flex-1 px-4 py-3 rounded-xl border-2 border-[#E5E8EB] focus:border-[#3182F6] focus:outline-none text-sm"
              />
              <button onClick={handleAnalyze}
                className="px-6 py-3 rounded-xl bg-[#3182F6] text-white text-sm font-bold hover:bg-[#1B64DA] transition-colors whitespace-nowrap">
                분석 시작
              </button>
            </div>
            <p className="mt-2 text-[11px] text-[#8B95A1]">
              • 네이버지도/플레이스 주소 또는 숫자 ID 직접 입력 가능 (예: <code className="bg-[#F2F4F6] px-1.5 py-0.5 rounded">37463942</code>)<br/>
              • <code className="bg-[#F2F4F6] px-1.5 py-0.5 rounded">naver.me</code> 단축 URL 은 미지원 (원본 URL 붙여넣기)
            </p>
          </div>

          {/* 22차-2 + 22차-3b: 내가 추적 중인 지점 + 추이 차트 */}
          {trackedTargets.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-5 mb-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-[#191F28]">내가 추적 중인 지점 <span className="text-[#8B95A1] font-normal">({trackedTargets.length})</span></p>
                {loadingTargets && <span className="text-[10px] text-[#8B95A1]">불러오는 중...</span>}
              </div>
              <div className="space-y-2">
                {trackedTargets.map((t: any) => {
                  const expanded = expandedTargetId === t.id
                  const hist: any[] = historyByTarget[t.id] || []
                  const latestVisitor = hist.length > 0 ? hist[hist.length - 1].visitor_review_count : t.last_visitor_review
                  const firstVisitor  = hist.length > 0 ? hist[0].visitor_review_count : null
                  const visitorDelta  = (latestVisitor != null && firstVisitor != null) ? latestVisitor - firstVisitor : null
                  const latestBlog    = hist.length > 0 ? hist[hist.length - 1].blog_review_count : t.last_blog_review
                  const firstBlog     = hist.length > 0 ? hist[0].blog_review_count : null
                  const blogDelta     = (latestBlog != null && firstBlog != null) ? latestBlog - firstBlog : null
                  return (
                    <div key={t.id} className="rounded-xl bg-[#F8F9FA] hover:bg-[#F2F4F6] transition-colors">
                      <div className="flex items-center gap-3 p-3">
                        {t.thumbnail_url && (
                          <img src={t.thumbnail_url} alt={t.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[#191F28] truncate">{t.name}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-[#8B95A1]">
                            {t.category_name && <span>{t.category_name}</span>}
                            {t.last_visitor_review != null && (
                              <span>방문 <span className="text-[#3182F6] font-bold">{t.last_visitor_review}</span>
                                {visitorDelta != null && visitorDelta !== 0 && (
                                  <span className={`ml-0.5 text-[9px] font-bold ${visitorDelta > 0 ? 'text-[#12B76A]' : 'text-[#F04452]'}`}>
                                    {visitorDelta > 0 ? '+' : ''}{visitorDelta}
                                  </span>
                                )}
                              </span>
                            )}
                            {t.last_blog_review != null && (
                              <span>블로그 <span className="text-[#3182F6] font-bold">{t.last_blog_review}</span>
                                {blogDelta != null && blogDelta !== 0 && (
                                  <span className={`ml-0.5 text-[9px] font-bold ${blogDelta > 0 ? 'text-[#12B76A]' : 'text-[#F04452]'}`}>
                                    {blogDelta > 0 ? '+' : ''}{blogDelta}
                                  </span>
                                )}
                              </span>
                            )}
                            {t.last_rating != null && (
                              <span>★ <span className="text-[#F59E0B] font-bold">{t.last_rating}</span></span>
                            )}
                            {t.last_ts && <span className="text-[#B0B8C1]">· {new Date(t.last_ts).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}</span>}
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => toggleExpand(t.id)}
                            className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg transition-colors ${expanded ? 'bg-[#EFF6FF] text-[#3182F6]' : 'bg-white text-[#4E5968] hover:bg-[#EFF6FF] hover:text-[#3182F6] border border-[#E5E8EB]'}`}>
                            {expanded ? '▲ 닫기' : '차트'}
                          </button>
                          <button
                            onClick={() => refreshTarget(t.id)}
                            disabled={refreshingId === t.id}
                            className="px-2.5 py-1.5 text-[10px] font-bold rounded-lg bg-white text-[#4E5968] hover:bg-[#F2F4F6] border border-[#E5E8EB] transition-colors disabled:opacity-50">
                            {refreshingId === t.id ? '…' : '↻'}
                          </button>
                          <button
                            onClick={() => loadTrackedTarget(t)}
                            className="px-3 py-1.5 text-[10px] font-bold rounded-lg bg-[#3182F6] text-white hover:bg-[#1B64DA] transition-colors">
                            점검
                          </button>
                          <button
                            onClick={() => removeTarget(t.id, t.name)}
                            className="px-2 py-1.5 text-[10px] font-bold rounded-lg bg-white text-[#8B95A1] hover:bg-[#FFF1F2] hover:text-[#F04452] border border-[#E5E8EB] transition-colors">
                            ✕
                          </button>
                        </div>
                      </div>
                      {expanded && (
                        <div className="border-t border-[#E5E8EB] bg-white rounded-b-xl p-4">
                          {loadingHistoryId === t.id && (
                            <p className="text-[11px] text-[#8B95A1]">이력 불러오는 중...</p>
                          )}
                          {loadingHistoryId !== t.id && hist.length === 0 && (
                            <p className="text-[11px] text-[#8B95A1]">아직 이력이 없습니다. ↻ 버튼으로 수동 새로고침하거나 매일 자동 스냅샷을 기다려 주세요.</p>
                          )}
                          {loadingHistoryId !== t.id && hist.length >= 1 && (
                            <div className="space-y-4">
                              <SparklineChart
                                title="방문자 리뷰 추이"
                                snapshots={hist}
                                field="visitor_review_count"
                                color="#3182F6"
                              />
                              <SparklineChart
                                title="블로그 리뷰 추이"
                                snapshots={hist}
                                field="blog_review_count"
                                color="#12B76A"
                              />
                              <p className="text-[10px] text-[#8B95A1] text-right">최근 30일 · 총 {hist.length}개 스냅샷</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <p className="mt-3 text-[10px] text-[#8B95A1] leading-relaxed">
                · 등록한 지점은 매일 자동으로 리뷰수/평점이 스냅샷 저장됩니다. ↻ 버튼으로 즉시 새로고침 가능.
              </p>
            </div>
          )}

          {/* 분석 결과 영역 */}
          {placeId && (
            <>
              {/* 상단: 점수 + 매장정보 */}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-5 mb-5">

                {/* 좌: 점수 카드 */}
                <div className="bg-white rounded-2xl shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold text-[#191F28]">종합 점검 점수</p>
                    <div className="flex gap-2">
                      <button onClick={checkAll} className="text-[11px] font-semibold text-[#3182F6] px-2 py-1 rounded-lg hover:bg-[#EFF6FF]">전체 체크</button>
                      <button onClick={resetAll} className="text-[11px] font-semibold text-[#8B95A1] px-2 py-1 rounded-lg hover:bg-[#F2F4F6]">초기화</button>
                    </div>
                  </div>
                  <div className="flex items-end gap-3 mb-3">
                    <span className="text-5xl font-black" style={{ color: interp.color }}>{score}</span>
                    <span className="text-sm font-bold text-[#8B95A1] mb-2">/ {TOTAL_ITEMS}점 ({ratio}%)</span>
                  </div>
                  <div className="w-full bg-[#F2F4F6] rounded-full h-3 overflow-hidden mb-3">
                    <div className="h-full rounded-full transition-all" style={{ width: `${ratio}%`, background: interp.color }}/>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: interp.bg }}>
                    <p className="text-sm font-bold mb-1" style={{ color: interp.color }}>{interp.label}</p>
                    <p className="text-xs text-[#4E5968] leading-relaxed">{interp.detail}</p>
                  </div>
                </div>

                {/* 우: 매장정보 요약 */}
                <div className="bg-white rounded-2xl shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold text-[#191F28]">매장 정보</p>
                    {loadingInfo && <span className="text-[10px] text-[#3182F6] font-semibold flex items-center gap-1"><span className="w-2 h-2 border-2 border-[#3182F6] border-t-transparent rounded-full animate-spin"/>불러오는 중</span>}
                    {fetchedInfo && !loadingInfo && <span className="text-[10px] text-[#12B76A] font-bold">✓ 네이버 연동</span>}
                  </div>

                  {fetchedInfo?.thumbnail && (
                    <img src={fetchedInfo.thumbnail} alt={fetchedInfo.name || ''}
                      className="w-full h-32 object-cover rounded-xl mb-3" />
                  )}

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between gap-2">
                      <span className="text-[#8B95A1] flex-shrink-0">플레이스 ID</span>
                      <span className="font-mono font-bold text-[#191F28] text-right truncate">{placeId}</span>
                    </div>
                    {(fetchedInfo?.name || storeInfo?.name) && (
                      <div className="flex justify-between gap-2">
                        <span className="text-[#8B95A1] flex-shrink-0">매장명</span>
                        <span className="font-bold text-[#191F28] text-right truncate">{fetchedInfo?.name || storeInfo?.name}</span>
                      </div>
                    )}
                    {(fetchedInfo?.categoryName || storeInfo?.category) && (
                      <div className="flex justify-between gap-2">
                        <span className="text-[#8B95A1] flex-shrink-0">업종</span>
                        <span className="font-bold text-[#191F28] text-right truncate">{fetchedInfo?.categoryName || storeInfo?.category}</span>
                      </div>
                    )}
                    {fetchedInfo?.address && (
                      <div className="flex justify-between gap-2">
                        <span className="text-[#8B95A1] flex-shrink-0">주소</span>
                        <span className="font-bold text-[#191F28] text-right text-[10px] leading-tight">{fetchedInfo.address}</span>
                      </div>
                    )}
                    {fetchedInfo?.phone && (
                      <div className="flex justify-between gap-2">
                        <span className="text-[#8B95A1] flex-shrink-0">전화</span>
                        <a href={`tel:${fetchedInfo.phone}`} className="font-bold text-[#3182F6] text-right">{fetchedInfo.phone}</a>
                      </div>
                    )}
                    {fetchedInfo?.visitorReviewCount !== null && fetchedInfo?.visitorReviewCount !== undefined && (
                      <div className="flex justify-between gap-2">
                        <span className="text-[#8B95A1]">방문자 리뷰</span>
                        <span className="font-bold text-[#191F28]">{fetchedInfo.visitorReviewCount}개</span>
                      </div>
                    )}
                    {fetchedInfo?.blogReviewCount !== null && fetchedInfo?.blogReviewCount !== undefined && (
                      <div className="flex justify-between gap-2">
                        <span className="text-[#8B95A1]">블로그 리뷰</span>
                        <span className="font-bold text-[#191F28]">{fetchedInfo.blogReviewCount}개</span>
                      </div>
                    )}
                    {fetchedInfo?.rating !== null && fetchedInfo?.rating !== undefined && (
                      <div className="flex justify-between gap-2">
                        <span className="text-[#8B95A1]">평점</span>
                        <span className="font-bold text-[#F59E0B]">★ {fetchedInfo.rating}</span>
                      </div>
                    )}
                  </div>

                  {fetchError && (
                    <p className="mt-3 text-[10px] text-[#F04452] bg-[#FFF1F2] rounded-lg p-2 leading-relaxed">{fetchError}</p>
                  )}

                  <div className="mt-4 pt-4 border-t border-[#F2F4F6] space-y-2">
                    {/* 22차-2: 추적 등록 버튼 */}
                    {fetchedInfo && (
                      isCurrentTracked ? (
                        <div className="w-full text-center text-xs font-bold py-2.5 rounded-xl bg-[#E8F5E9] text-[#12B76A] border border-[#12B76A]/30">
                          ✓ 추적 중 (매일 자동 갱신)
                        </div>
                      ) : (
                        <button
                          onClick={registerTarget}
                          disabled={registering}
                          className="block w-full text-center text-xs font-bold py-2.5 rounded-xl bg-[#3182F6] text-white hover:bg-[#1B64DA] transition-colors disabled:opacity-50">
                          {registering ? '등록 중...' : '추적 등록 (매일 자동 갱신)'}
                        </button>
                      )
                    )}
                    {registerMsg && (
                      <p className="text-[10px] text-center text-[#4E5968] leading-relaxed">{registerMsg}</p>
                    )}
                    <a href={`https://m.place.naver.com/${fetchedInfo?.category || 'restaurant'}/${placeId}/home`} target="_blank" rel="noopener noreferrer"
                      className="block w-full text-center text-xs font-bold py-2.5 rounded-xl bg-[#03C75A] text-white hover:bg-[#02B350] transition-colors">
                      네이버 플레이스에서 보기 ↗
                    </a>
                    <a href={`https://map.naver.com/p/entry/place/${placeId}`} target="_blank" rel="noopener noreferrer"
                      className="block w-full text-center text-xs font-bold py-2.5 rounded-xl bg-[#F2F4F6] text-[#191F28] hover:bg-[#E5E8EB] transition-colors">
                      네이버 지도에서 열기 ↗
                    </a>
                  </div>
                </div>
              </div>

              {/* 체크리스트 섹션 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-base font-black text-[#191F28]">34항목 자체 점검 체크리스트</p>
                  <span className="text-[11px] text-[#8B95A1]">각 항목 체크 + "상세" 버튼으로 설명 확인</span>
                </div>

                {CHECKLIST.map(group => {
                  const groupChecked = group.items.filter(i => checked[i.id]).length
                  return (
                    <div key={group.group} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-[#F2F4F6]">
                      <div className="px-5 py-3 flex items-center gap-3 border-b border-[#F2F4F6]" style={{ background: `${group.color}0D` }}>
                        <span className="text-xl">{group.icon}</span>
                        <div className="flex-1">
                          <p className="text-sm font-black text-[#191F28]">{group.group}</p>
                        </div>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: group.color, color: '#fff' }}>
                          {groupChecked}/{group.items.length}
                        </span>
                      </div>
                      <div className="px-2 py-2">
                        {group.items.map(item => (
                          <ChecklistRow
                            key={item.id}
                            item={item}
                            checked={!!checked[item.id]}
                            hasVideo={!!(youtubeLinks[item.id] || item.youtube)}
                            onToggle={() => toggleItem(item.id)}
                            onOpen={() => setModalItem(item)}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* 하단 안내 */}
              <div className="mt-5 rounded-2xl bg-[#F8F9FA] border border-[#E5E8EB] p-4">
                <p className="text-xs font-bold text-[#191F28] mb-1">체크리스트 활용 팁</p>
                <p className="text-[11px] text-[#4E5968] leading-relaxed">
                  · 점검은 매장 대표가 직접 하는 걸 권장 (직원 위임 시 체감 온도 차이)<br/>
                  · 1차 점검 후 미체크 항목부터 2주 단위로 개선 → 재점검<br/>
                  · 체크 상태는 플레이스 ID별로 자동 저장됩니다
                </p>
              </div>
            </>
          )}

          {/* placeId 없을 때 안내 */}
          {!placeId && (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <div className="text-5xl mb-3">📍</div>
              <p className="text-base font-black text-[#191F28] mb-1">URL을 입력하면 분석이 시작됩니다</p>
              <p className="text-xs text-[#8B95A1] leading-relaxed">
                네이버 플레이스 URL을 붙여넣고 분석 시작을 누르면<br/>
                매장 정보 + 34항목 자체 점검 체크리스트가 표시됩니다.
              </p>
              <div className="mt-5 inline-block text-left bg-[#F8F9FA] rounded-xl p-4 text-[11px] text-[#4E5968] font-mono">
                https://m.place.naver.com/restaurant/<span className="text-[#3182F6] font-bold">12345678</span><br/>
                https://map.naver.com/p/entry/place/<span className="text-[#3182F6] font-bold">12345678</span>
              </div>
            </div>
          )}

        </div>

        <DetailModal
          item={modalItem}
          youtubeUrl={modalItem ? (youtubeLinks[modalItem.id] || modalItem.youtube || '') : ''}
          onSetYoutube={(url) => modalItem && setYoutubeLink(modalItem.id, url)}
          onClose={() => setModalItem(null)}
        />
        <Footer />
      </main>
    </div>
  )
}
