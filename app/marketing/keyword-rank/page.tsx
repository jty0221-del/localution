'use client'
export const dynamic = 'force-dynamic'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import Sidebar from '../../components/Sidebar'
import PageHeader from '../../components/PageHeader'
import Footer from '../../components/Footer'
import { nearestRegions, COMMUNITY_REGIONS } from '../../lib/regions-community'

// ─── 카테고리 트리 ──────────────────────────────────────────────────
interface SubItem     { name: string; keywords: string[] }
interface MidCategory { name: string; keywords?: string[]; subs?: SubItem[] }
interface TopCategory { name: string; mids: MidCategory[] }

const TREE: TopCategory[] = [
  { name: '음식점', mids: [
    { name: '한식', subs: [
      { name: '백반·정식',  keywords: ['한식', '백반', '정식', '집밥', '가정식'] },
      { name: '국밥·탕',   keywords: ['국밥', '순댓국', '설렁탕', '곰탕', '해장국'] },
      { name: '고기구이',   keywords: ['삼겹살', '소고기', '갈비', '돼지갈비', '한우'] },
      { name: '찌개·전골',  keywords: ['찌개', '부대찌개', '김치찌개', '순두부', '전골'] },
      { name: '냉면·국수',  keywords: ['냉면', '칼국수', '막국수', '비빔냉면', '국수'] },
      { name: '한정식',    keywords: ['한정식', '코스한식', '궁중요리', '사찰음식', '전통음식'] },
    ]},
    { name: '중식', subs: [
      { name: '짜장·짬뽕',  keywords: ['중국집', '짜장면', '짬뽕', '차돌짬뽕', '볶음밥'] },
      { name: '마라·훠궈',  keywords: ['마라탕', '훠궈', '마라샹궈', '마라', '훠궈뷔페'] },
    ]},
    { name: '일식', subs: [
      { name: '초밥·스시',  keywords: ['초밥', '스시', '오마카세', '회전초밥', '스시뷔페'] },
      { name: '라멘·우동',  keywords: ['라멘', '우동', '소바', '츠케멘', '돈코츠라멘'] },
      { name: '돈카츠·덮밥', keywords: ['돈카츠', '카츠동', '규동', '오야코동', '텐동'] },
    ]},
    { name: '양식', subs: [
      { name: '파스타·피자', keywords: ['파스타', '피자', '화덕피자', '리조또', '뇨끼'] },
      { name: '스테이크·그릴', keywords: ['스테이크', '그릴', '립', '바베큐', '통삼겹'] },
      { name: '버거',       keywords: ['버거', '수제버거', '스매시버거', '햄버거', '감자튀김'] },
    ]},
    { name: '분식·치킨', subs: [
      { name: '분식',  keywords: ['분식', '떡볶이', '순대', '튀김', '라볶이'] },
      { name: '치킨',  keywords: ['치킨', '후라이드', '양념치킨', '닭강정', '닭발'] },
    ]},
    { name: '아시안', subs: [
      { name: '베트남', keywords: ['쌀국수', '베트남음식', '반미', '분짜', '포'] },
      { name: '태국',  keywords: ['팟타이', '태국음식', '쏨땀', '카오팟', '똠양꿍'] },
    ]},
  ]},
  { name: '카페·디저트', mids: [
    { name: '카페', subs: [
      { name: '커피전문점',  keywords: ['카페', '커피', '아메리카노', '핸드드립', '콜드브루'] },
      { name: '브런치카페',  keywords: ['브런치카페', '브런치', '에그베네딕트', '팬케이크', '와플'] },
      { name: '감성카페',   keywords: ['감성카페', '인스타카페', '뷰카페', '루프탑카페', '야경카페'] },
      { name: '스터디카페',  keywords: ['스터디카페', '공부카페', '24시카페', '조용한카페', '카공'] },
    ]},
    { name: '디저트', subs: [
      { name: '케이크·마카롱',   keywords: ['케이크', '마카롱', '디저트카페', '커스텀케이크', '레이어케이크'] },
      { name: '빙수·아이스크림', keywords: ['빙수', '아이스크림', '젤라또', '팥빙수', '소프트아이스크림'] },
    ]},
    { name: '베이커리', keywords: ['베이커리', '빵집', '식빵', '바게트', '소금빵'] },
  ]},
  { name: '주류·술집', mids: [
    { name: '포차·포장마차',  keywords: ['포차', '포장마차', '야장', '호프포차', '야외포차'] },
    { name: '호프·수제맥주',  keywords: ['호프', '맥줏집', '생맥주', '수제맥주', '크래프트비어'] },
    { name: '막걸리·전통주',  keywords: ['막걸리', '전통주', '동동주', '막걸리집', '전통주바'] },
    { name: '이자카야',      keywords: ['이자카야', '야키토리', '꼬치구이', '일식바', '사케바'] },
    { name: '와인바',        keywords: ['와인바', '와인', '내추럴와인', '와인셀러', '비스트로'] },
    { name: '칵테일·위스키바', keywords: ['칵테일바', '바', '스피크이지', '위스키바', '진바'] },
  ]},
  { name: '뷰티', mids: [
    { name: '미용실·헤어', subs: [
      { name: '여성미용실', keywords: ['미용실', '헤어샵', '헤어살롱', '단발컷', '여성미용'] },
      { name: '남성바버',  keywords: ['바버샵', '남자미용실', '남성헤어', '페이드컷', '이발소'] },
      { name: '염색·펌',  keywords: ['염색', '펌', '탈색', '매직', '볼륨매직'] },
    ]},
    { name: '네일', subs: [
      { name: '네일샵',  keywords: ['네일샵', '젤네일', '네일', '아크릴', '빌더젤'] },
      { name: '네일아트', keywords: ['네일아트', '3D네일', '오로라네일', '그라데이션', '핸드페인팅'] },
    ]},
    { name: '피부관리',    keywords: ['피부관리', '피부샵', '에스테틱', '페이셜', '트러블케어'] },
    { name: '왁싱·제모',  keywords: ['왁싱', '제모', '레이저제모', '비키니왁싱', '전신왁싱'] },
    { name: '눈썹·속눈썹', keywords: ['눈썹문신', '반영구눈썹', '속눈썹연장', '눈썹정리', '아이래쉬'] },
    { name: '타투·피어싱', keywords: ['타투', '문신', '피어싱', '헤나', '바디아트'] },
  ]},
  { name: '의료·건강', mids: [
    { name: '내과·가정의학', keywords: ['내과', '가정의학과', '건강검진', '종합검진', '소화기내과'] },
    { name: '정형외과·재활', keywords: ['정형외과', '재활의학과', '도수치료', '물리치료', '통증클리닉'] },
    { name: '치과',         keywords: ['치과', '임플란트', '치아교정', '스케일링', '충치'] },
    { name: '한의원',        keywords: ['한의원', '침', '한약', '추나', '다이어트한의원'] },
    { name: '피부과',        keywords: ['피부과', '레이저', '보톡스', '필러', '여드름'] },
    { name: '안과',          keywords: ['안과', '라식', '라섹', '스마일라식', '백내장'] },
    { name: '성형외과',      keywords: ['성형외과', '쌍꺼풀', '코성형', '지방흡입', '윤곽'] },
    { name: '동물병원',      keywords: ['동물병원', '수의사', '강아지병원', '고양이병원', '예방접종'] },
    { name: '약국',          keywords: ['약국', '24시약국', '야간약국', '조제약국', '근처약국'] },
  ]},
  { name: '운동·피트니스', mids: [
    { name: '헬스·피트니스', subs: [
      { name: '헬스장',    keywords: ['헬스장', '헬스클럽', '피트니스센터', '근처헬스', '24시헬스'] },
      { name: 'PT·퍼스널', keywords: ['PT', '퍼스널트레이닝', '다이어트PT', '바디프로필', '1:1트레이닝'] },
      { name: '크로스핏',  keywords: ['크로스핏', '기능성훈련', '그룹트레이닝', '체력단련', '왓스박스'] },
    ]},
    { name: '스튜디오', subs: [
      { name: '필라테스', keywords: ['필라테스', '그룹필라테스', '개인필라테스', '재활필라테스', '필라테스스튜디오'] },
      { name: '요가',    keywords: ['요가', '핫요가', '명상요가', '아쉬탕가', '요가원'] },
      { name: '댄스',    keywords: ['댄스학원', '방송댄스', '힙합', '걸스힙합', '댄스스튜디오'] },
    ]},
    { name: '수영장',    keywords: ['수영장', '수영', '수영강습', '어린이수영', '성인수영'] },
    { name: '클라이밍',  keywords: ['클라이밍', '볼더링', '인공암벽', '클라이밍짐', '리드'] },
    { name: '골프', subs: [
      { name: '골프연습장', keywords: ['골프연습장', '타석', '실내골프연습장', '인도어골프', '골프'] },
      { name: '스크린골프', keywords: ['스크린골프', '골프존', '카카오골프', '스크린', '실내골프'] },
    ]},
  ]},
  { name: '교육', mids: [
    { name: '입시·학습', subs: [
      { name: '입시학원', keywords: ['입시학원', '수능', '내신', '재수학원', '대입'] },
      { name: '영어학원', keywords: ['영어학원', '영어회화', '토익', '토플', '영어유치원'] },
      { name: '수학학원', keywords: ['수학학원', '수학', '중등수학', '고등수학', '수학과외'] },
    ]},
    { name: '예체능', subs: [
      { name: '미술학원',   keywords: ['미술학원', '입시미술', '수채화', '드로잉', '아동미술'] },
      { name: '음악·피아노', keywords: ['음악학원', '피아노학원', '바이올린', '기타학원', '보컬'] },
      { name: '태권도·무술', keywords: ['태권도', '합기도', '유도', '검도', '무술'] },
    ]},
    { name: '코딩·IT',       keywords: ['코딩학원', '프로그래밍', '파이썬', '앱개발', 'SW교육'] },
    { name: '독서실',        keywords: ['독서실', '열람실', '코인독서실', '스터디룸', '공부방'] },
    { name: '어린이집·유치원', keywords: ['어린이집', '유치원', '놀이학교', '보육원', '유아교육'] },
  ]},
  { name: '생활편의', mids: [
    { name: '세탁소',      keywords: ['세탁소', '드라이클리닝', '이불세탁', '세탁물수거', '런드리'] },
    { name: '가전·폰수리',  keywords: ['가전수리', '휴대폰수리', '핸드폰수리', '액정수리', '삼성수리'] },
    { name: '청소업체',    keywords: ['청소업체', '집청소', '입주청소', '이사청소', '가사도우미'] },
    { name: '이사업체',    keywords: ['이사', '포장이사', '원룸이사', '이삿짐센터', '반포장이사'] },
    { name: '반려동물미용', keywords: ['강아지미용', '고양이미용', '펫샵', '애견미용', '펫그루밍'] },
    { name: '인테리어',    keywords: ['인테리어', '리모델링', '인테리어시공', '실내인테리어', '인테리어업체'] },
  ]},
  { name: '숙박·여행', mids: [
    { name: '호텔',        keywords: ['호텔', '비즈니스호텔', '부티크호텔', '럭셔리호텔', '호텔숙박'] },
    { name: '펜션·풀빌라',  keywords: ['펜션', '풀빌라', '독채펜션', '풀빌라펜션', '바베큐펜션'] },
    { name: '글램핑·캠핑',  keywords: ['글램핑', '캠핑장', '오토캠핑', '카라반', '야영장'] },
    { name: '게스트하우스',  keywords: ['게스트하우스', '호스텔', '도미토리', '에어비앤비', '민박'] },
    { name: '여행사',       keywords: ['여행사', '패키지여행', '해외여행', '국내여행', '단체여행'] },
  ]},
  { name: '쇼핑', mids: [
    { name: '마트·편의점', keywords: ['마트', '편의점', '슈퍼마켓', '로컬마트', '식료품점'] },
    { name: '꽃집',        keywords: ['꽃집', '플라워샵', '화원', '꽃배달', '웨딩꽃'] },
    { name: '옷가게·패션',  keywords: ['옷가게', '의류', '빈티지', '편집샵', '스트릿패션'] },
    { name: '안경·귀금속',  keywords: ['안경점', '귀금속', '보석', '주얼리', '시계'] },
    { name: '가구·소품',    keywords: ['가구', '인테리어소품', '홈퍼니싱', '소품샵', '리빙샵'] },
  ]},
]

const KW_MAP: Record<string, string[]> = {}
for (const top of TREE) {
  for (const mid of top.mids) {
    if (!mid.subs && mid.keywords) KW_MAP[mid.name] = mid.keywords
    else if (mid.subs) for (const sub of mid.subs) KW_MAP[sub.name] = sub.keywords
  }
}
function getSuffixes(name: string, fallback: string): string[] {
  return KW_MAP[name] || [fallback, fallback + ' 추천', fallback + ' 예약', fallback + ' 근처', fallback + ' 후기']
}

// ─── 20개 키워드 생성 ──────────────────────────────────────────────
// 구조: A(기본5) + B(역세권5) + C(수식어5) + D(업체명·상황5)
function buildKeywords(regionShort: string, suffixes: string[], businessName: string, label: string) {
  const s = suffixes
  const f = s[0] || label
  return [
    // A. 지역 + 업종 기본 (5)
    { kw: regionShort + ' ' + (s[0] || f), rel: (s[0] || f) + ' 추천' },
    { kw: regionShort + ' ' + (s[1] || f), rel: (s[1] || f) + ' 장소' },
    { kw: regionShort + ' ' + (s[2] || f), rel: (s[2] || f) + ' 예약' },
    { kw: regionShort + ' ' + (s[3] || f), rel: (s[3] || f) + ' 추천' },
    { kw: regionShort + ' ' + (s[4] || f), rel: (s[4] || f) + ' 후기' },
    // B. 역세권 변형 (5)
    { kw: regionShort + '역 ' + (s[0] || f),       rel: regionShort + '역 근처 ' + (s[0] || f) },
    { kw: regionShort + '역 ' + (s[1] || f),       rel: regionShort + '역 ' + (s[1] || f) + ' 추천' },
    { kw: regionShort + '역 ' + (s[2] || f),       rel: regionShort + '역 ' + (s[2] || f) + ' 맛집' },
    { kw: regionShort + ' 근처 ' + (s[0] || f),    rel: '근처 ' + (s[0] || f) + ' 추천' },
    { kw: regionShort + ' 맛집 추천',               rel: regionShort + ' ' + (s[0] || f) + ' TOP5' },
    // C. 수식어 조합 (5)
    { kw: regionShort + ' ' + (s[0] || f) + ' 추천', rel: (s[0] || f) + ' 인기' },
    { kw: regionShort + ' ' + (s[0] || f) + ' 맛집', rel: (s[0] || f) + ' 유명한' },
    { kw: regionShort + ' 점심 ' + (s[0] || f),    rel: '점심 ' + (s[0] || f) + ' 추천' },
    { kw: regionShort + ' 저녁 ' + (s[0] || f),    rel: '저녁 ' + (s[0] || f) + ' 추천' },
    { kw: regionShort + ' 주말 ' + (s[0] || f),    rel: '주말 ' + (s[0] || f) + ' 추천' },
    // D. 업체명 + 상황 조합 (5)
    { kw: businessName,                             rel: businessName + ' 리뷰' },
    { kw: businessName + ' ' + regionShort,         rel: businessName + ' 예약' },
    { kw: regionShort + ' ' + (s[0] || f) + ' 혼밥', rel: '혼밥 ' + (s[0] || f) + ' 추천' },
    { kw: regionShort + ' ' + (s[0] || f) + ' 데이트', rel: '데이트 ' + (s[0] || f) + ' 코스' },
    { kw: regionShort + ' ' + (s[0] || f) + ' 회식', rel: '회식 ' + (s[0] || f) + ' 장소' },
  ].map((item, i) => ({ id: String(i), keyword: item.kw, relatedKw: item.rel, label }))
}

// ─── 종합점수 공식 ─────────────────────────────────────────────────
// 순위(50pt) + 블로그리뷰(25pt) + 방문자리뷰(25pt) = 100pt
function calcScore(rank: number | null, blogCnt: number | null, visitorCnt: number | null): number {
  // 순위 점수 (50점)
  let rankScore = 0
  if (rank !== null) {
    if (rank <= 1)  rankScore = 50
    else if (rank <= 3)  rankScore = 46
    else if (rank <= 5)  rankScore = 41
    else if (rank <= 10) rankScore = 33
    else if (rank <= 15) rankScore = 24
    else if (rank <= 20) rankScore = 17
    else if (rank <= 30) rankScore = 11
    else if (rank <= 50) rankScore = 6
    else rankScore = 2
  }

  // 블로그 리뷰 점수 (25점) — 누적 리뷰 수 기준
  let blogScore = 0
  if (blogCnt !== null) {
    if (blogCnt >= 500)  blogScore = 25
    else if (blogCnt >= 200) blogScore = 22
    else if (blogCnt >= 100) blogScore = 19
    else if (blogCnt >= 50)  blogScore = 15
    else if (blogCnt >= 20)  blogScore = 11
    else if (blogCnt >= 10)  blogScore = 7
    else if (blogCnt >= 1)   blogScore = 4
  }

  // 방문자 리뷰 점수 (25점) — 예약+영수증 합산
  let visitorScore = 0
  if (visitorCnt !== null) {
    if (visitorCnt >= 2000)  visitorScore = 25
    else if (visitorCnt >= 1000) visitorScore = 22
    else if (visitorCnt >= 500)  visitorScore = 19
    else if (visitorCnt >= 200)  visitorScore = 15
    else if (visitorCnt >= 100)  visitorScore = 11
    else if (visitorCnt >= 50)   visitorScore = 7
    else if (visitorCnt >= 10)   visitorScore = 4
    else if (visitorCnt >= 1)    visitorScore = 2
  }

  return parseFloat((rankScore + blogScore + visitorScore).toFixed(1))
}

// ─── 타입 ──────────────────────────────────────────────────────────
interface BizContext { region: string; businessName: string }
const DEFAULT_CTX: BizContext = { region: '강남구', businessName: '내 가게' }
function readBizContext(): BizContext {
  if (typeof window === 'undefined') return DEFAULT_CTX
  try {
    const p: Record<string, string> = JSON.parse(
      localStorage.getItem('localution.store_info') || localStorage.getItem('localution_store') || '{}'
    )
    const addrSrc = [p?.location, p?.address, p?.branch, p?.storeName, p?.name].filter(Boolean).join(' ')
    let region = DEFAULT_CTX.region
    const gu = addrSrc.match(/([가-힣]{1,4})(구|군)/)
    if (gu) region = gu[1] + gu[2]
    return { region, businessName: p?.name || p?.storeName || DEFAULT_CTX.businessName }
  } catch { return DEFAULT_CTX }
}

interface RankEntry {
  date:         string
  rank:         number | null
  blogCnt:      number | null  // 블로그 리뷰 수
  visitorCnt:   number | null  // 방문자 리뷰(예약+영수증)
  score:        number
}
interface PlaceGroup {
  id: string; keyword: string; relatedKw: string; label: string
  history: RankEntry[]
  loading: boolean; pinned: boolean
  placeId?: string | null  // 캐시된 placeId
}

// ─── 색상 ──────────────────────────────────────────────────────────
function rankColor(r: number | null, mode: 'text' | 'bg' = 'text') {
  if (r === null) return mode === 'text' ? 'text-[#C9D0D8]' : ''
  if (mode === 'text') {
    if (r <= 3)  return 'text-[#3182F6] font-black'
    if (r <= 5)  return 'text-[#12B76A] font-bold'
    if (r <= 10) return 'text-[#F59E0B] font-bold'
    if (r <= 20) return 'text-[#F04452] font-semibold'
    return 'text-[#8B95A1]'
  }
  if (r <= 3)  return 'bg-[#EFF6FF]'
  if (r <= 5)  return 'bg-[#ECFDF5]'
  if (r <= 10) return 'bg-[#FFFBEB]'
  if (r <= 20) return 'bg-[#FFF1F2]'
  return 'bg-[#F8F9FA]'
}
function scoreColor(s: number) {
  if (s >= 80) return 'text-[#3182F6] font-bold'
  if (s >= 60) return 'text-[#12B76A] font-semibold'
  if (s >= 35) return 'text-[#F59E0B] font-semibold'
  return 'text-[#F04452]'
}

// ─── 로컬스토리지 ──────────────────────────────────────────────────
const LS_KEY = 'localution.place_realtime_v2'
function loadAllHistory(): Record<string, RankEntry[]> {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') } catch { return {} }
}
function saveEntry(keyword: string, entry: RankEntry) {
  try {
    const all = loadAllHistory()
    if (!all[keyword]) all[keyword] = []
    all[keyword] = [entry, ...all[keyword].filter(e => e.date !== entry.date)].slice(0, 30)
    localStorage.setItem(LS_KEY, JSON.stringify(all))
  } catch {}
}
function todayStr() {
  const d = new Date()
  return String(d.getFullYear()).slice(2) + '.' +
    String(d.getMonth() + 1).padStart(2, '0') + '.' +
    String(d.getDate()).padStart(2, '0')
}

// ─── PlaceCard ─────────────────────────────────────────────────────
function PlaceCard({ group, onRefresh, onPin, onDelete, viewMode }: {
  group: PlaceGroup; onRefresh: () => void; onPin: () => void; onDelete: () => void
  viewMode: 'table' | 'chart'
}) {
  const latest = group.history[0]
  const prev   = group.history[1]
  const diff   = latest?.rank !== null && prev?.rank !== null ? prev.rank - (latest?.rank ?? 0) : null

  return (
    <div className={`bg-white rounded-2xl shadow-sm border transition-all ${group.pinned ? 'border-[#3182F6] ring-1 ring-[#3182F6]/20' : 'border-[#F2F4F6] hover:border-[#C5D8FF]'}`}>
      {/* 헤더 */}
      <div className="px-4 py-3 border-b border-[#F2F4F6] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {group.pinned && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#EFF6FF] text-[#3182F6] font-bold shrink-0">고정</span>}
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#F2F4F6] text-[#4E5968] font-medium shrink-0">{group.label}</span>
          <span className="text-sm font-bold text-[#191F28] truncate">📍 {group.keyword}</span>
          <span className="text-[11px] text-[#3182F6] shrink-0">→ {group.relatedKw}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {group.loading ? (
            <span className="w-4 h-4 border-2 border-[#3182F6] border-t-transparent rounded-full animate-spin" />
          ) : latest ? (
            <div className="flex items-center gap-1">
              <span className={`text-sm font-black px-2 py-0.5 rounded-lg ${rankColor(latest.rank, 'bg')} ${rankColor(latest.rank)}`}>
                {latest.rank !== null ? latest.rank + '위' : '—'}
              </span>
              {diff !== null && (
                <span className={`text-[11px] font-bold ${diff > 0 ? 'text-[#12B76A]' : diff < 0 ? 'text-[#F04452]' : 'text-[#8B95A1]'}`}>
                  {diff > 0 ? '▲' + diff : diff < 0 ? '▼' + Math.abs(diff) : '±0'}
                </span>
              )}
            </div>
          ) : null}
          <button onClick={onRefresh} title="새로고침"
            className="p-1 rounded text-[#8B95A1] hover:text-[#3182F6] hover:bg-[#F2F4F6] transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
            </svg>
          </button>
          <button onClick={onPin} title={group.pinned ? '고정 해제' : '상단 고정'}
            className={`p-1 rounded transition-colors ${group.pinned ? 'text-[#3182F6] bg-[#EFF6FF]' : 'text-[#8B95A1] hover:text-[#3182F6] hover:bg-[#F2F4F6]'}`}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill={group.pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </button>
          <button onClick={onDelete} title="삭제"
            className="p-1 rounded text-[#8B95A1] hover:text-[#F04452] hover:bg-[#FFF1F2] transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* 테이블 */}
      {viewMode === 'table' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#F8F9FA] text-[#8B95A1]">
                <th className="text-left px-3 py-2 font-medium whitespace-nowrap">날짜</th>
                <th className="text-center px-2 py-2 font-medium">순위</th>
                <th className="text-right px-2 py-2 font-medium whitespace-nowrap">블로그</th>
                <th className="text-right px-2 py-2 font-medium whitespace-nowrap">방문자리뷰</th>
                <th className="text-right px-3 py-2 font-medium whitespace-nowrap">
                  종합점수
                  <span className="ml-0.5 text-[10px] font-normal text-[#C9D0D8]" title="순위(50)+블로그(25)+방문자리뷰(25)=100점">ℹ</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F8F9FA]">
              {group.loading ? (
                <tr><td colSpan={5} className="px-3 py-4 text-center text-[#8B95A1] animate-pulse">조회 중...</td></tr>
              ) : group.history.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-5 text-center text-[#C9D0D8]">↑ 조회 버튼을 눌러 순위를 확인하세요</td></tr>
              ) : group.history.map((row, i) => {
                const prevRow = group.history[i + 1]
                const d = row.rank !== null && prevRow?.rank !== null ? prevRow.rank - row.rank : null
                return (
                  <tr key={i} className={`transition-colors ${i === 0 ? 'bg-[#FAFBFF]' : 'hover:bg-[#FAFBFF]'}`}>
                    <td className="px-3 py-2 text-[#8B95A1] whitespace-nowrap">{row.date}</td>
                    <td className="px-2 py-2 text-center">
                      <span className={`font-bold ${rankColor(row.rank)}`}>{row.rank ?? '—'}</span>
                      {d !== null && (
                        <span className={`ml-1 text-[10px] font-bold ${d > 0 ? 'text-[#12B76A]' : d < 0 ? 'text-[#F04452]' : 'text-[#C9D0D8]'}`}>
                          {d > 0 ? '▲' + d : d < 0 ? '▼' + Math.abs(d) : ''}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right text-[#4E5968]">
                      {row.blogCnt !== null ? row.blogCnt.toLocaleString() : <span className="text-[#C9D0D8]">—</span>}
                    </td>
                    <td className="px-2 py-2 text-right text-[#4E5968]">
                      {row.visitorCnt !== null ? row.visitorCnt.toLocaleString() : <span className="text-[#C9D0D8]">—</span>}
                    </td>
                    <td className={`px-3 py-2 text-right ${scoreColor(row.score)}`}>{row.score.toFixed(1)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* 차트 뷰 */
        <div className="px-4 py-3">
          {group.history.length < 2 ? (
            <p className="text-xs text-[#C9D0D8] text-center py-3">데이터 2개 이상 필요</p>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-end gap-0.5 h-16">
                {group.history.slice(0, 14).reverse().map((row, i) => {
                  const h = row.rank ? Math.max(4, Math.round((1 - Math.min(row.rank, 30) / 30) * 60)) : 4
                  const bg = row.rank && row.rank <= 3 ? 'bg-[#3182F6]' : row.rank && row.rank <= 10 ? 'bg-[#12B76A]' : row.rank && row.rank <= 20 ? 'bg-[#F59E0B]' : 'bg-[#E5E8EB]'
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5"
                      title={row.date + (row.rank ? ' ' + row.rank + '위' : ' 순위없음')}>
                      <div className={`w-full rounded-t-sm ${bg}`} style={{ height: h + 'px' }} />
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-between text-[10px] text-[#C9D0D8]">
                <span>{group.history.slice(0, 14).at(-1)?.date}</span>
                <span>오늘</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── 지역 드롭다운 ─────────────────────────────────────────────────
function RegionSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const groups = useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const r of COMMUNITY_REGIONS) {
      if (!r.parent_label) continue
      if (!map[r.parent_label]) map[r.parent_label] = []
      map[r.parent_label].push(r.label)
    }
    return map
  }, [])
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="text-sm border border-[#E5E8EB] rounded-lg px-2.5 py-1.5 bg-white font-medium focus:outline-none focus:border-[#3182F6] max-w-[140px]">
      {Object.entries(groups).map(([parent, labels]) => (
        <optgroup key={parent} label={parent}>
          {labels.map(l => <option key={l} value={l}>{l}</option>)}
        </optgroup>
      ))}
    </select>
  )
}

// ─── 3단계 카테고리 선택기 ─────────────────────────────────────────
function CategorySelector({ topVal, midVal, subVal, customVal, onTop, onMid, onSub, onCustom }: {
  topVal: string; midVal: string; subVal: string; customVal: string
  onTop: (v: string) => void; onMid: (v: string) => void
  onSub: (v: string) => void; onCustom: (v: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const isCustom = topVal === '직접입력'
  const mids = useMemo(() => TREE.find(t => t.name === topVal)?.mids || [], [topVal])
  const currentMid = useMemo(() => mids.find(m => m.name === midVal), [mids, midVal])
  const subs = currentMid?.subs || []
  const isTerminal = !isCustom && subs.length === 0

  useEffect(() => { if (isCustom) setTimeout(() => inputRef.current?.focus(), 50) }, [isCustom])

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs text-[#8B95A1] font-medium shrink-0">업종</span>
      <select value={topVal} onChange={e => onTop(e.target.value)}
        className="text-sm border border-[#E5E8EB] rounded-lg px-2.5 py-1.5 bg-white font-medium focus:outline-none focus:border-[#3182F6] max-w-[110px]">
        {TREE.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
        <option value="직접입력">✏ 직접입력</option>
      </select>
      {!isCustom && mids.length > 0 && (
        <>
          <span className="text-[#D1D6DB] text-xs">›</span>
          <select value={midVal} onChange={e => onMid(e.target.value)}
            className={`text-sm border rounded-lg px-2.5 py-1.5 bg-white font-medium focus:outline-none max-w-[130px]
              ${isTerminal ? 'border-[#3182F6] bg-[#EFF6FF] text-[#3182F6]' : 'border-[#E5E8EB] focus:border-[#3182F6]'}`}>
            {mids.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
          </select>
        </>
      )}
      {!isCustom && subs.length > 0 && (
        <>
          <span className="text-[#D1D6DB] text-xs">›</span>
          <select value={subVal} onChange={e => onSub(e.target.value)}
            className="text-sm border border-[#3182F6] rounded-lg px-2.5 py-1.5 bg-[#EFF6FF] text-[#3182F6] font-semibold focus:outline-none max-w-[130px]">
            {subs.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
          </select>
        </>
      )}
      {isCustom && (
        <input ref={inputRef} value={customVal} onChange={e => onCustom(e.target.value)}
          onKeyDown={e => e.key === 'Escape' && onTop(TREE[0].name)}
          placeholder="업종 직접 입력..."
          className="text-sm border border-[#3182F6] rounded-lg px-2.5 py-1.5 focus:outline-none w-[150px]"
        />
      )}
    </div>
  )
}

// ─── 메인 ──────────────────────────────────────────────────────────
export default function PlaceRealtimePage() {
  const [ctx, setCtx]   = useState<BizContext>(DEFAULT_CTX)
  const [region, setRegion] = useState('강남구')
  const [geoStatus, setGeoStatus] = useState<'idle'|'loading'|'ok'|'denied'|'unavailable'|'unsupported'>('idle')

  const [topCat, setTopCat]     = useState('음식점')
  const [midCat, setMidCat]     = useState('한식')
  const [subCat, setSubCat]     = useState('백반·정식')
  const [customCat, setCustomCat] = useState('')

  const [groups, setGroups]       = useState<PlaceGroup[]>([])
  const [viewMode, setViewMode]   = useState<'table' | 'chart'>('table')
  const [scanning, setScanning]   = useState(false)
  const [search, setSearch]       = useState('')
  const [lastUpdated, setLastUpdated] = useState('')

  const handleTop = useCallback((v: string) => {
    setTopCat(v)
    if (v === '직접입력') return
    const fm = TREE.find(t => t.name === v)?.mids[0]
    setMidCat(fm?.name || ''); setSubCat(fm?.subs?.[0]?.name || '')
  }, [])
  const handleMid = useCallback((v: string) => {
    setMidCat(v)
    const mid = TREE.find(t => t.name === topCat)?.mids.find(m => m.name === v)
    setSubCat(mid?.subs?.[0]?.name || '')
  }, [topCat])

  const { activeLabel, activeSuffixes } = useMemo(() => {
    if (topCat === '직접입력') {
      const label = customCat || '직접입력'
      return { activeLabel: label, activeSuffixes: getSuffixes(label, label) }
    }
    const mid = TREE.find(t => t.name === topCat)?.mids.find(m => m.name === midCat)
    if (!mid?.subs?.length) return { activeLabel: midCat, activeSuffixes: getSuffixes(midCat, midCat) }
    return { activeLabel: subCat, activeSuffixes: getSuffixes(subCat, subCat) }
  }, [topCat, midCat, subCat, customCat])

  useEffect(() => {
    const c = readBizContext(); setCtx(c); setRegion(c.region)
    const onChange = () => { const nc = readBizContext(); setCtx(nc); setRegion(nc.region) }
    window.addEventListener('localution:user-change', onChange)
    window.addEventListener('storage', onChange)
    return () => { window.removeEventListener('localution:user-change', onChange); window.removeEventListener('storage', onChange) }
  }, [])

  const requestGeo = useCallback(() => {
    if (!navigator?.geolocation) { setGeoStatus('unsupported'); return }
    setGeoStatus('loading')
    navigator.geolocation.getCurrentPosition(
      pos => { try { const l = nearestRegions(pos.coords.latitude, pos.coords.longitude, 3); if (l[0]) setRegion(l[0].label); setGeoStatus('ok') } catch { setGeoStatus('unavailable') } },
      err => { if (err.code === 1) setGeoStatus('denied'); else setGeoStatus('unavailable') },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
    )
  }, [])

  const regionShort = useMemo(() => region.replace(/(구|군|시)$/, '').replace(/\(.*?\)$/, '').trim(), [region])

  // 키워드 그룹 초기화 (20개)
  useEffect(() => {
    const kwList    = buildKeywords(regionShort, activeSuffixes, ctx.businessName, activeLabel)
    const allHist   = loadAllHistory()
    setGroups(kwList.map(kw => ({
      ...kw,
      history: allHist[kw.keyword] || [],
      loading: false,
      pinned:  false,
    })))
  }, [regionShort, activeSuffixes, activeLabel, ctx.businessName])

  // 단일 조회
  const fetchOne = useCallback(async (g: PlaceGroup): Promise<RankEntry & { placeId?: string | null }> => {
    try {
      // 1) 순위 조회
      const rankRes = await fetch('/api/naver-rank?keyword=' + encodeURIComponent(g.keyword)
        + '&businessName=' + encodeURIComponent(ctx.businessName))
      const rankData = await rankRes.json()
      const rank: number | null = rankData.rank ?? null
      const placeId: string | null = rankData.placeId ?? g.placeId ?? null

      // 2) 업체 리뷰 수 조회 (placeId 있을 때만)
      let blogCnt: number | null = null
      let visitorCnt: number | null = null
      if (placeId) {
        try {
          const rvRes  = await fetch('/api/naver-place-reviews?placeId=' + placeId)
          const rvData = await rvRes.json()
          if (rvData.ok) {
            blogCnt    = rvData.blogReviewCount    ?? null
            visitorCnt = rvData.visitorReviewCount ?? null
          }
        } catch {}
      }

      return {
        date: todayStr(), rank, blogCnt, visitorCnt,
        score: calcScore(rank, blogCnt, visitorCnt),
        placeId,
      }
    } catch {
      return { date: todayStr(), rank: null, blogCnt: null, visitorCnt: null, score: 0 }
    }
  }, [ctx.businessName])

  const refreshOne = useCallback(async (id: string) => {
    setGroups(prev => prev.map(g => g.id === id ? { ...g, loading: true } : g))
    const group = groups.find(g => g.id === id)
    if (!group) return
    const result = await fetchOne(group)
    const { placeId, ...entry } = result
    saveEntry(group.keyword, entry)
    setGroups(prev => prev.map(g => g.id === id ? {
      ...g, loading: false,
      placeId: placeId ?? g.placeId,
      history: [entry, ...g.history.filter(e => e.date !== entry.date)].slice(0, 30),
    } : g))
  }, [groups, fetchOne])

  const handleScan = useCallback(async () => {
    if (scanning) return
    setScanning(true)
    setGroups(prev => prev.map(g => ({ ...g, loading: true })))
    const results = await Promise.all(groups.map(g => fetchOne(g)))
    setGroups(prev => prev.map((g, i) => {
      const { placeId, ...entry } = results[i]
      saveEntry(g.keyword, entry)
      return { ...g, loading: false, placeId: placeId ?? g.placeId,
        history: [entry, ...g.history.filter(e => e.date !== entry.date)].slice(0, 30) }
    }))
    setLastUpdated(new Date().toLocaleString('ko-KR'))
    setScanning(false)
  }, [scanning, groups, fetchOne])

  const togglePin    = useCallback((id: string) => setGroups(prev => prev.map(g => g.id === id ? { ...g, pinned: !g.pinned } : g)), [])
  const deleteGroup  = useCallback((id: string) => setGroups(prev => prev.filter(g => g.id !== id)), [])

  const sorted = useMemo(() => {
    const f = groups.filter(g => search === '' || g.keyword.includes(search) || g.relatedKw.includes(search))
    return [...f.filter(g => g.pinned), ...f.filter(g => !g.pinned)]
  }, [groups, search])

  const ranked10   = groups.filter(g => (g.history[0]?.rank ?? 999) <= 10).length
  const breadcrumb = topCat === '직접입력' ? (customCat || '직접입력')
    : (() => {
        const mid = TREE.find(t => t.name === topCat)?.mids.find(m => m.name === midCat)
        if (!mid?.subs?.length) return topCat + ' › ' + midCat
        return topCat + ' › ' + midCat + ' › ' + subCat
      })()

  return (
    <div className="flex min-h-screen bg-[#F2F4F6]">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-[220px] flex flex-col min-h-screen pt-16 md:pt-0 min-w-0">
        <PageHeader icon="🏪" title="플레이스 실시간"
          subtitle="네이버 플레이스 키워드 순위 · 블로그리뷰 · 방문자리뷰를 실시간으로 추적합니다"
          variant="sky" />

        {/* 필터 바 */}
        <div className="bg-white border-b border-[#E5E8EB] px-4 py-3 sticky top-0 z-20">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-[#8B95A1] font-medium">지역</span>
              <RegionSelect value={region} onChange={setRegion} />
              <button onClick={requestGeo} disabled={geoStatus === 'loading'}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E5E8EB] text-xs font-medium text-[#4E5968] hover:border-[#3182F6] hover:text-[#3182F6] transition-colors disabled:opacity-50 shrink-0">
                {geoStatus === 'loading'
                  ? <span className="w-3 h-3 border-2 border-[#3182F6] border-t-transparent rounded-full animate-spin" />
                  : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/>
                      <line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
                    </svg>
                }내 위치
              </button>
            </div>
            <CategorySelector topVal={topCat} midVal={midCat} subVal={subCat} customVal={customCat}
              onTop={handleTop} onMid={handleMid} onSub={setSubCat} onCustom={setCustomCat} />
            <div className="flex-1 min-w-[130px]">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="키워드 필터..."
                className="w-full text-sm border border-[#E5E8EB] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#3182F6]" />
            </div>
            <div className="flex items-center bg-[#F2F4F6] rounded-lg p-0.5 shrink-0">
              {(['table', 'chart'] as const).map(m => (
                <button key={m} onClick={() => setViewMode(m)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${viewMode === m ? 'bg-white text-[#191F28] shadow-sm' : 'text-[#8B95A1]'}`}>
                  {m === 'table' ? '표' : '차트'}
                </button>
              ))}
            </div>
            <button onClick={handleScan} disabled={scanning}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#3182F6] text-white text-sm font-semibold hover:bg-[#1B64DA] transition-colors disabled:opacity-60 shrink-0">
              {scanning ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />조회 중...</> : '🔍 전체 조회'}
            </button>
            {lastUpdated && <span className="text-[11px] text-[#8B95A1] ml-auto shrink-0">최근: {lastUpdated}</span>}
          </div>
          {geoStatus === 'ok' && <p className="text-[11px] text-[#12B76A] mt-1.5">✓ 위치 기반으로 <strong>{region}</strong> 선택됨</p>}
          {geoStatus === 'denied' && <p className="text-[11px] text-[#F04452] mt-1.5">위치 권한이 차단됐어요. 브라우저 설정에서 허용해 주세요.</p>}
        </div>

        {/* 현황 배너 */}
        <div className="bg-[#EFF6FF] border-b border-[#BFDBFE] px-6 py-2 flex items-center justify-between flex-wrap gap-2">
          <p className="text-[11px] text-[#1D4ED8]">
            🏪 <strong>{ctx.businessName}</strong> &nbsp;·&nbsp;
            <strong>{region}</strong> &nbsp;·&nbsp; {breadcrumb}
          </p>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-[#8B95A1]">총 <strong className="text-[#191F28]">{groups.length}개</strong></span>
            {groups.some(g => g.history[0]) && <span className="text-[#8B95A1]">10위내 <strong className="text-[#3182F6]">{ranked10}개</strong></span>}
            <div className="hidden md:flex items-center gap-2">
              {[['#EFF6FF','#3182F6','1~3위'],['#ECFDF5','#12B76A','4~5위'],['#FFFBEB','#F59E0B','6~10위'],['#FFF1F2','#F04452','11~20위']].map(([bg, c, label]) => (
                <span key={label} className="flex items-center gap-0.5">
                  <span className="w-2 h-2 rounded-sm" style={{ background: bg, border: '1px solid ' + c + '40' }}/>
                  <span style={{ color: c }}>{label}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 점수 기준 안내 */}
        <div className="bg-white border-b border-[#F2F4F6] px-6 py-1.5">
          <p className="text-[11px] text-[#8B95A1]">
            종합점수 기준: <span className="text-[#4E5968]">순위 50점</span> + <span className="text-[#4E5968]">블로그리뷰 25점</span> + <span className="text-[#4E5968]">방문자리뷰 25점</span> = 100점 만점 &nbsp;·&nbsp;
            블로그·방문자리뷰는 업체 placeId 확인 후 자동 수집됩니다
          </p>
        </div>

        {/* 카드 그리드 */}
        <div className="flex-1 p-6">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-[#8B95A1]">
              <p className="text-lg font-bold mb-1">키워드 없음</p>
              <p className="text-sm">지역·업종을 선택하면 20개 키워드가 자동 생성됩니다</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {sorted.map(group => (
                <PlaceCard key={group.id} group={group}
                  onRefresh={() => refreshOne(group.id)}
                  onPin={() => togglePin(group.id)}
                  onDelete={() => deleteGroup(group.id)}
                  viewMode={viewMode}
                />
              ))}
            </div>
          )}
          {!scanning && groups.every(g => g.history.length === 0) && (
            <div className="mt-8 flex flex-col items-center gap-2 text-[#8B95A1]">
              <div className="text-4xl">🔍</div>
              <p className="text-base font-bold text-[#191F28] mt-1">전체 조회를 눌러 20개 키워드 순위를 확인하세요</p>
              <p className="text-sm">순위 조회 시 업체 placeId를 자동으로 찾아 블로그·방문자리뷰도 함께 수집됩니다</p>
              <p className="text-xs"><a href="/settings" className="text-[#3182F6] underline">설정 → 매장 정보</a>에서 업체명을 정확히 입력해 주세요</p>
            </div>
          )}
        </div>
        <Footer />
      </main>
    </div>
  )
}
