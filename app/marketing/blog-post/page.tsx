'use client'
export const dynamic = 'force-dynamic'

// ============================================================
// /marketing/blog-post — 네이버 블로그 포스팅 자동 생성 (2026 AI 검색 최적화)
//   · 글 트랙 3종 (순위용/신뢰용/관심사형)
//   · 페르소나: 이름·나이·성별·말투 (굵직한 타입)
//   · 프리셋: 누르면 업종만 채워줌 (키워드는 작성자 직접 입력)
//   · 리뷰 연동 키워드, CTA 4단계, 25자 제목, 사진 분산
// ============================================================

import { useState, useEffect, useRef } from 'react'
import Sidebar from '../../components/Sidebar'
import PageHeader from '../../components/PageHeader'
import {
  Sparkles, Copy, Check, Image as ImageIcon, X, Plus,
  User, Tag, FileText, MessageCircle, Link as LinkIcon,
  Loader2, AlertCircle, RefreshCw, PenLine, Target,
  TrendingUp, Heart, Award, UtensilsCrossed, Gift, Megaphone,
} from 'lucide-react'
import Footer from '../../components/Footer'

const LS_KEY = 'localution.naver_blog_post_inputs_v2'

// ── 글 유형 6트랙 — 사장님용 3종 + 블로거/마케팅용 3종 ──
type Track = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
type TrackGroup = 'owner' | 'blogger'
const TRACKS: { id: Track; group: TrackGroup; label: string; desc: string; lengthHint: string; icon: any; color: string }[] = [
  // 사장님용
  { id: 'A', group: 'owner',   label: '순위용',         desc: '플레이스 연동·키워드 상위 노출 (정보·리스트형)', lengthHint: '800~1,500자',   icon: TrendingUp,      color: '#3182F6' },
  { id: 'B', group: 'owner',   label: '신뢰용',         desc: '문의·예약·방문 유도 (사례·스토리형)',           lengthHint: '1,500~2,500자', icon: Award,           color: '#7C3AED' },
  { id: 'C', group: 'owner',   label: '관심사형',        desc: '특정 타겟 공감·재방문·팬 확보 (공감·생활형)',   lengthHint: '1,000~2,000자', icon: Heart,           color: '#EC4899' },
  // 블로거/마케팅용
  { id: 'D', group: 'blogger', label: '맛집 후기',       desc: '블로거 솔직 후기·방문기 (메뉴/맛/분위기 위주)',  lengthHint: '800~1,500자',   icon: UtensilsCrossed, color: '#EA580C' },
  { id: 'E', group: 'blogger', label: '체험단·협찬',     desc: '체험·협찬 받은 후 작성 (광고 표기 자동 포함)',   lengthHint: '1,500~2,500자', icon: Gift,            color: '#059669' },
  { id: 'F', group: 'owner',   label: '이벤트·프로모션', desc: '할인·이벤트·오픈 알림 (직접 전환 유도)',          lengthHint: '600~1,200자',   icon: Megaphone,       color: '#DC2626' },
]

// ── 말투 타입 (굵직하게 분리, 완전 다른 톤) ──
type Tone = 'professional' | 'friendly' | 'expert' | 'storyteller' | 'witty'
const TONES: { id: Tone; label: string; desc: string }[] = [
  { id: 'professional', label: '프로페셔널',  desc: '격식 있는 합쇼체 · 신뢰감 · 전문 분야 (병원·법무·세무)' },
  { id: 'friendly',     label: '친근 동네',    desc: '편한 해요체 · 동네 친구 같은 · 공감 (카페·미용실·식당)' },
  { id: 'expert',       label: '권위 전문가',  desc: '데이터·근거 중심 · 솔직 진단형 · 신뢰 (피부과·교육)' },
  { id: 'storyteller',  label: '스토리텔러',   desc: '경험·사례 풀어쓰기 · 진정성 · 감동 (여행·예술·핸드메이드)' },
  { id: 'witty',        label: '위트 + 트렌드', desc: '가볍고 트렌디 · MZ 친화 · 재미 (디저트·패션·뷰티)' },
]

// ── 성별 ──
type Gender = 'any' | 'male' | 'female'
const GENDERS: { id: Gender; label: string }[] = [
  { id: 'any',    label: '무관' },
  { id: 'male',   label: '남성' },
  { id: 'female', label: '여성' },
]

// ── 프리셋: 업종만 채움 (키워드는 작성자가 직접) ──
const INDUSTRY_PRESETS = [
  { id: 'cafe',       label: '카페' },
  { id: 'food',       label: '음식점' },
  { id: 'dental',     label: '치과' },
  { id: 'nail',       label: '네일샵' },
  { id: 'hair',       label: '미용실' },
  { id: 'fitness',    label: '헬스장/PT' },
  { id: 'pet',        label: '동물병원' },
  { id: 'academy',    label: '학원' },
  { id: 'skin',       label: '피부과' },
  { id: 'realestate', label: '부동산' },
  { id: 'pharmacy',   label: '약국' },
  { id: 'study',      label: '스터디카페' },
  { id: 'oriental',   label: '한의원' },
  { id: 'insurance',  label: '보험설계사' },
  { id: 'clothes',    label: '의류/쇼핑' },
] as const

export default function BlogPostGeneratorPage() {
  const [industry, setIndustry] = useState('')
  const [track, setTrack] = useState<Track>('A')
  const [personaName, setPersonaName] = useState('')
  const [personaAge, setPersonaAge]   = useState('')
  const [personaGender, setPersonaGender] = useState<Gender>('any')
  const [personaTone, setPersonaTone] = useState<Tone>('friendly')
  const [coreTarget, setCoreTarget] = useState('')
  const [keywordInput, setKeywordInput] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [reviewKwInput, setReviewKwInput] = useState('')
  const [reviewKeywords, setReviewKeywords] = useState<string[]>([])
  const [draft, setDraft] = useState('')
  const [ctaPhone, setCtaPhone] = useState('')
  const [ctaKakao, setCtaKakao] = useState('')
  const [ctaReservation, setCtaReservation] = useState('')
  const [length, setLength] = useState<1500 | 2000 | 2500 | 3000>(2000)
  const [photoNames, setPhotoNames] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [post, setPost] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const outputRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('localution.store_info')
      if (raw) {
        const info = JSON.parse(raw)
        if (info?.category && !industry) setIndustry(info.category)
      }
    } catch (_) {}
    try {
      const saved = window.localStorage.getItem(LS_KEY)
      if (saved) {
        const s = JSON.parse(saved)
        if (s.industry && !industry)   setIndustry(s.industry)
        if (s.track)                    setTrack(s.track)
        if (s.personaName)              setPersonaName(s.personaName)
        if (s.personaAge)               setPersonaAge(s.personaAge)
        if (s.personaGender)            setPersonaGender(s.personaGender)
        if (s.personaTone)              setPersonaTone(s.personaTone)
        if (s.coreTarget)               setCoreTarget(s.coreTarget)
        if (Array.isArray(s.keywords))  setKeywords(s.keywords)
        if (Array.isArray(s.reviewKeywords)) setReviewKeywords(s.reviewKeywords)
        if (s.ctaPhone)                 setCtaPhone(s.ctaPhone)
        if (s.ctaKakao)                 setCtaKakao(s.ctaKakao)
        if (s.ctaReservation)           setCtaReservation(s.ctaReservation)
        if (s.length)                   setLength(s.length)
      }
    } catch (_) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify({
        industry, track, personaName, personaAge, personaGender, personaTone,
        coreTarget, keywords, reviewKeywords,
        ctaPhone, ctaKakao, ctaReservation, length,
      }))
    } catch (_) {}
  }, [industry, track, personaName, personaAge, personaGender, personaTone, coreTarget, keywords, reviewKeywords, ctaPhone, ctaKakao, ctaReservation, length])

  const addKeyword = (k?: string) => {
    const target = (k ?? keywordInput).trim()
    if (!target) return
    if (keywords.includes(target)) { setKeywordInput(''); return }
    setKeywords(prev => [...prev, target])
    setKeywordInput('')
  }
  const removeKeyword = (k: string) => setKeywords(prev => prev.filter(x => x !== k))

  const addReviewKw = (k?: string) => {
    const target = (k ?? reviewKwInput).trim()
    if (!target) return
    if (reviewKeywords.includes(target)) { setReviewKwInput(''); return }
    setReviewKeywords(prev => [...prev, target])
    setReviewKwInput('')
  }
  const removeReviewKw = (k: string) => setReviewKeywords(prev => prev.filter(x => x !== k))

  const applyPreset = (label: string) => {
    setIndustry(label)
  }

  const handleFilesPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const names = Array.from(files).map(f => f.name)
    setPhotoNames(prev => Array.from(new Set([...prev, ...names])))
    if (fileRef.current) fileRef.current.value = ''
  }
  const removePhoto = (name: string) => setPhotoNames(prev => prev.filter(n => n !== name))

  const handleGenerate = async () => {
    if (!industry.trim() && !keywords.length) {
      setError('업종 또는 검색 의도 키워드 중 하나는 필수입니다')
      return
    }
    setError(null)
    setLoading(true)
    setPost(null)
    setCopied(false)
    try {
      const res = await fetch('/api/naver-blog-post', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industry: industry.trim(),
          track,
          persona: {
            name:   personaName.trim(),
            age:    personaAge.trim(),
            gender: personaGender,
            tone:   personaTone,
          },
          coreTarget: coreTarget.trim(),
          keywords: keywords.filter(Boolean),
          reviewKeywords: reviewKeywords.filter(Boolean),
          draft: draft.trim(),
          cta: {
            phone:        ctaPhone.trim(),
            kakao:        ctaKakao.trim(),
            reservation:  ctaReservation.trim(),
          },
          length,
          photoNames,
        }),
      })
      const j = await res.json()
      if (!j.ok) { setError(j.error || '생성 실패'); return }
      setPost(j.post)
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120)
    } catch (e: any) {
      setError('네트워크 오류: ' + (e?.message || ''))
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!post) return
    try {
      await navigator.clipboard.writeText(post)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (_) {
      const ta = document.createElement('textarea')
      ta.value = post
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="flex min-h-screen bg-[#F2F4F6]">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-[220px] flex flex-col min-h-screen pt-16 md:pt-0">
        <PageHeader
          icon={<PenLine size={28} className="text-white" strokeWidth={2.5} />}
          title="네이버 블로그 글 작성"
          subtitle="2026 AI 검색 최적화 · SEO+AEO 혼합 · 상위 노출과 전환율 동시 설계"
          variant="green"
        />

        <div className="flex-1 p-4 md:p-6 max-w-4xl mx-auto w-full space-y-4">

          {/* 1. 글 트랙 */}
          <section className="bg-white rounded-2xl shadow-sm border border-[#E5E8EB] p-4 md:p-5">
            <div className="flex items-start gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3182F6] to-[#7C3AED] flex items-center justify-center shadow-sm">
                <Target size={15} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-sm font-black text-[#191F28]">1. 글 유형 (목적)</p>
                <p className="text-[11px] text-[#8B95A1]">목적에 따라 글 구조가 완전히 달라집니다</p>
              </div>
            </div>

            {/* 사장님용 4종 (순위/신뢰/관심사/이벤트) */}
            <p className="text-[10px] font-bold text-[#8B95A1] tracking-wider uppercase mb-2 px-1">SHOP OWNER · 사장님용</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4">
              {TRACKS.filter(t => t.group === 'owner').map(t => {
                const Icon = t.icon
                const active = track === t.id
                return (
                  <button key={t.id} onClick={() => setTrack(t.id)}
                    className={`text-left p-3 rounded-xl border-2 transition-all ${active ? 'border-[#3182F6] bg-[#EFF6FF] shadow-sm' : 'border-[#E5E8EB] bg-white hover:border-[#BFDBFE]'}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: t.color + '15', color: t.color }}>
                        <Icon size={14} strokeWidth={2.5} />
                      </div>
                      <span className="text-sm font-black text-[#191F28]">{t.id}. {t.label}</span>
                    </div>
                    <p className="text-[11px] text-[#4E5968] leading-tight">{t.desc}</p>
                    <p className="text-[10px] mt-1.5 font-bold" style={{ color: t.color }}>권장 {t.lengthHint}</p>
                  </button>
                )
              })}
            </div>

            {/* 블로거/마케팅용 2종 (맛집후기/체험단) */}
            <p className="text-[10px] font-bold text-[#8B95A1] tracking-wider uppercase mb-2 px-1">BLOGGER · 블로거/마케팅용</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {TRACKS.filter(t => t.group === 'blogger').map(t => {
                const Icon = t.icon
                const active = track === t.id
                return (
                  <button key={t.id} onClick={() => setTrack(t.id)}
                    className={`text-left p-3 rounded-xl border-2 transition-all ${active ? 'border-[#3182F6] bg-[#EFF6FF] shadow-sm' : 'border-[#E5E8EB] bg-white hover:border-[#BFDBFE]'}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: t.color + '15', color: t.color }}>
                        <Icon size={14} strokeWidth={2.5} />
                      </div>
                      <span className="text-sm font-black text-[#191F28]">{t.id}. {t.label}</span>
                    </div>
                    <p className="text-[11px] text-[#4E5968] leading-tight">{t.desc}</p>
                    <p className="text-[10px] mt-1.5 font-bold" style={{ color: t.color }}>권장 {t.lengthHint}</p>
                  </button>
                )
              })}
            </div>
          </section>

          {/* 2. 업종/주제 */}
          <section className="bg-white rounded-2xl shadow-sm border border-[#E5E8EB] p-4 md:p-5">
            <div className="flex items-start gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#059669] to-[#16A34A] flex items-center justify-center shadow-sm">
                <Tag size={15} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-sm font-black text-[#191F28]">2. 업종 / 주제</p>
                <p className="text-[11px] text-[#8B95A1]">프리셋 클릭 = 업종만 빠르게 채워짐 (키워드는 직접 입력)</p>
              </div>
            </div>
            <input value={industry} onChange={e => setIndustry(e.target.value)}
              placeholder="예: 강남 피부과, 홍대 브런치 카페, 부산 필라테스 센터"
              className="w-full border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#3182F6] mb-2.5" />
            <div className="flex flex-wrap gap-1.5">
              {INDUSTRY_PRESETS.map(p => (
                <button key={p.id} onClick={() => applyPreset(p.label)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${industry === p.label ? 'bg-[#059669] text-white border-[#059669]' : 'bg-white text-[#4E5968] border-[#E5E8EB] hover:border-[#059669] hover:text-[#059669]'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </section>

          {/* 3. 페르소나 */}
          <section className="bg-white rounded-2xl shadow-sm border border-[#E5E8EB] p-4 md:p-5">
            <div className="flex items-start gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#EC4899] flex items-center justify-center shadow-sm">
                <User size={15} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-sm font-black text-[#191F28]">3. 페르소나 — 글 발행 주체</p>
                <p className="text-[11px] text-[#8B95A1]">담당자 정보로 글의 톤·관점 결정</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[11px] font-bold text-[#4E5968] mb-1 block">이름 또는 닉네임</label>
                <input value={personaName} onChange={e => setPersonaName(e.target.value)}
                  placeholder="예: 박원장, 김실장, 강선생, 카페지기"
                  className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#3182F6]" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#4E5968] mb-1 block">연령대</label>
                <input value={personaAge} onChange={e => setPersonaAge(e.target.value)}
                  placeholder="예: 30대 후반, 40대 초반, 20대 중반"
                  className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#3182F6]" />
              </div>
            </div>

            <div className="mb-3">
              <label className="text-[11px] font-bold text-[#4E5968] mb-1.5 block">성별</label>
              <div className="flex gap-1.5">
                {GENDERS.map(g => (
                  <button key={g.id} onClick={() => setPersonaGender(g.id)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border ${personaGender === g.id ? 'border-[#3182F6] bg-[#EFF6FF] text-[#3182F6]' : 'border-[#E5E8EB] bg-white text-[#4E5968]'}`}>
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#4E5968] mb-1.5 block">말투 타입 — 글 전체 톤이 완전히 달라집니다</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {TONES.map(t => {
                  const active = personaTone === t.id
                  return (
                    <button key={t.id} onClick={() => setPersonaTone(t.id)}
                      className={`text-left p-2.5 rounded-xl border-2 transition-all ${active ? 'border-[#7C3AED] bg-[#F5F3FF]' : 'border-[#E5E8EB] bg-white hover:border-[#BFDBFE]'}`}>
                      <p className="text-xs font-black text-[#191F28] mb-0.5">{t.label}</p>
                      <p className="text-[10px] text-[#8B95A1] leading-tight">{t.desc}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          {/* 4. 핵심 타겟 */}
          <section className="bg-white rounded-2xl shadow-sm border border-[#E5E8EB] p-4 md:p-5">
            <div className="flex items-start gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F59E0B] to-[#DC2626] flex items-center justify-center shadow-sm">
                <Target size={15} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-sm font-black text-[#191F28]">4. 핵심 타겟 (뾰족하게)</p>
                <p className="text-[11px] text-[#8B95A1]">[상태] + [고민/욕구] + [라이프스타일] 형태로</p>
              </div>
            </div>
            <textarea value={coreTarget} onChange={e => setCoreTarget(e.target.value)}
              rows={2}
              placeholder={'예시:\n· 퇴근 후 어깨 통증으로 고민하는 직장인 여성\n· 개원 3년차인데 경쟁 병원에 밀리는 피부과 원장님\n· 전단지 효과가 없어진 골목 카페 사장님'}
              className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#F59E0B] resize-none" />
          </section>

          {/* 5. 검색 의도 키워드 */}
          <section className="bg-white rounded-2xl shadow-sm border border-[#E5E8EB] p-4 md:p-5">
            <div className="flex items-start gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3182F6] to-[#1D4ED8] flex items-center justify-center shadow-sm">
                <Tag size={15} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-sm font-black text-[#191F28]">5. 검색 의도 키워드</p>
                <p className="text-[11px] text-[#8B95A1]">고객이 실제 검색할 때 쓰는 말 (업계 용어 X, 고객 언어 O)</p>
              </div>
            </div>
            <div className="flex gap-2 mb-2">
              <input value={keywordInput} onChange={e => setKeywordInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                placeholder="예: 강남 피부과 추천, 홍대 브런치 카페, 부산 필라테스 가격"
                className="flex-1 border border-[#E5E8EB] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#3182F6]" />
              <button onClick={() => addKeyword()} disabled={!keywordInput.trim()}
                className="px-4 py-2 bg-[#3182F6] text-white rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-[#1B64DA]">
                <Plus size={14} strokeWidth={2.5} />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {keywords.map(k => (
                <span key={k} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EFF6FF] text-[#3182F6] text-xs font-bold border border-[#BFDBFE]">
                  {k}
                  <button onClick={() => removeKeyword(k)} className="text-[#3182F6]/60 hover:text-[#DC2626]">
                    <X size={11} strokeWidth={3} />
                  </button>
                </span>
              ))}
              {keywords.length === 0 && <p className="text-[11px] text-[#8B95A1]">최소 1개 이상 입력 (없으면 업종으로 자동 작성)</p>}
            </div>
          </section>

          {/* 6. 리뷰 연동 키워드 */}
          <section className="bg-white rounded-2xl shadow-sm border border-[#E5E8EB] p-4 md:p-5">
            <div className="flex items-start gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#EC4899] to-[#DB2777] flex items-center justify-center shadow-sm">
                <MessageCircle size={15} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-sm font-black text-[#191F28]">6. 플레이스 리뷰 연동 키워드 (선택)</p>
                <p className="text-[11px] text-[#8B95A1]">본문에 자연스럽게 2회 이상 등장 → 손님 리뷰에도 같은 단어 유도 → 상위 노출 시너지</p>
              </div>
            </div>
            <div className="flex gap-2 mb-2">
              <input value={reviewKwInput} onChange={e => setReviewKwInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addReviewKw())}
                placeholder="예: 꼼꼼한 상담, 친절한 안내, 깔끔한 시설"
                className="flex-1 border border-[#E5E8EB] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#EC4899]" />
              <button onClick={() => addReviewKw()} disabled={!reviewKwInput.trim()}
                className="px-4 py-2 bg-[#EC4899] text-white rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-[#DB2777]">
                <Plus size={14} strokeWidth={2.5} />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {reviewKeywords.map(k => (
                <span key={k} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FDF2F8] text-[#EC4899] text-xs font-bold border border-[#FBCFE8]">
                  {k}
                  <button onClick={() => removeReviewKw(k)} className="text-[#EC4899]/60 hover:text-[#DC2626]">
                    <X size={11} strokeWidth={3} />
                  </button>
                </span>
              ))}
            </div>
          </section>

          {/* 7. 초안·메모 */}
          <section className="bg-white rounded-2xl shadow-sm border border-[#E5E8EB] p-4 md:p-5">
            <div className="flex items-start gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0EA5E9] to-[#0369A1] flex items-center justify-center shadow-sm">
                <FileText size={15} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-sm font-black text-[#191F28]">7. 초안·메모·방향성 (선택)</p>
                <p className="text-[11px] text-[#8B95A1]">강조 포인트, 사례, 차별점, 가격, 위치, 영업시간 등 자유롭게</p>
              </div>
            </div>
            <textarea value={draft} onChange={e => setDraft(e.target.value)}
              rows={5}
              placeholder={'담을 내용 자유롭게 작성:\n· 강조하고 싶은 차별점 (예: 24시간 운영, 자체 제조법, 10년 경력)\n· 실제 사례 (예: 30일 만에 4kg 감량한 회원님)\n· 위치·영업시간·가격 등 정보\n· 절대 빠지면 안 되는 메시지'}
              className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0EA5E9] resize-none" />
          </section>

          {/* 8. CTA */}
          <section className="bg-white rounded-2xl shadow-sm border border-[#E5E8EB] p-4 md:p-5">
            <div className="flex items-start gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#16A34A] to-[#15803D] flex items-center justify-center shadow-sm">
                <LinkIcon size={15} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-sm font-black text-[#191F28]">8. CTA (행동 유도)</p>
                <p className="text-[11px] text-[#8B95A1]">하나만 입력해도 됨 · 부담 없는 첫 걸음 4단계 자동 설계</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input value={ctaPhone} onChange={e => setCtaPhone(e.target.value)} placeholder="전화번호"
                className="border border-[#E5E8EB] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#16A34A]" />
              <input value={ctaKakao} onChange={e => setCtaKakao(e.target.value)} placeholder="카카오 채널"
                className="border border-[#E5E8EB] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#16A34A]" />
              <input value={ctaReservation} onChange={e => setCtaReservation(e.target.value)} placeholder="예약 링크"
                className="border border-[#E5E8EB] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#16A34A]" />
            </div>
          </section>

          {/* 9. 길이 + 사진 */}
          <section className="bg-white rounded-2xl shadow-sm border border-[#E5E8EB] p-4 md:p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-[#4E5968] mb-2">9. 글 길이</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {([1500, 2000, 2500, 3000] as const).map(n => (
                    <button key={n} onClick={() => setLength(n)}
                      className={`py-2 rounded-lg text-xs font-bold border ${length === n ? 'border-[#3182F6] bg-[#EFF6FF] text-[#3182F6]' : 'border-[#E5E8EB] bg-white text-[#4E5968]'}`}>
                      {n.toLocaleString()}자
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-[#4E5968] mb-2">10. 사진 파일명 (자동 분산 배치)</p>
                <div className="flex gap-2">
                  <input ref={fileRef} type="file" multiple accept="image/*" onChange={handleFilesPicked} className="hidden" id="photo-input" />
                  <label htmlFor="photo-input" className="flex-1 cursor-pointer border border-dashed border-[#3182F6] rounded-xl px-3 py-2 text-xs font-bold text-[#3182F6] flex items-center justify-center gap-1.5 hover:bg-[#EFF6FF]">
                    <ImageIcon size={13} strokeWidth={2.5} /> 사진 선택
                  </label>
                </div>
                {photoNames.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {photoNames.map(n => (
                      <span key={n} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F2F4F6] text-[10px] text-[#4E5968] font-mono">
                        {n}
                        <button onClick={() => removePhoto(n)} className="text-[#8B95A1] hover:text-[#DC2626]">
                          <X size={9} strokeWidth={3} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* 생성 버튼 */}
          <button onClick={handleGenerate} disabled={loading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#3182F6] to-[#7C3AED] text-white font-black text-base flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-lg transition-shadow">
            {loading ? (<><Loader2 size={18} className="animate-spin" strokeWidth={2.5} /> AI 작성 중... (10~40초)</>) : (<><Sparkles size={18} strokeWidth={2.5} /> 블로그 글 생성하기</>)}
          </button>

          {error && (
            <div className="bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl p-3 flex items-start gap-2">
              <AlertCircle size={14} className="text-[#DC2626] flex-shrink-0 mt-0.5" strokeWidth={2.5} />
              <p className="text-xs text-[#991B1B]">{error}</p>
            </div>
          )}

          {/* 결과 */}
          {post && (
            <div ref={outputRef} className="bg-white rounded-2xl shadow-sm border-2 border-[#3182F6] p-4 md:p-5">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3182F6] to-[#7C3AED] flex items-center justify-center shadow-sm">
                    <Sparkles size={15} className="text-white" strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-[#191F28]">생성된 블로그 글</p>
                    <p className="text-[10px] text-[#8B95A1]">트랙 {track} · 목표 {length.toLocaleString()}자 · 실제 {post.length.toLocaleString()}자</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleCopy}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${copied ? 'bg-green-500 text-white' : 'bg-[#191F28] text-white hover:bg-[#333D4B]'}`}>
                    {copied ? <><Check size={12} strokeWidth={3} /> 복사됨</> : <><Copy size={12} strokeWidth={2.5} /> 마크다운 복사</>}
                  </button>
                  <button onClick={handleGenerate}
                    className="px-3 py-2 rounded-xl bg-[#F2F4F6] text-[#4E5968] text-xs font-bold flex items-center gap-1.5 hover:bg-[#E5E8EB]">
                    <RefreshCw size={12} strokeWidth={2.5} /> 다시 생성
                  </button>
                </div>
              </div>
              <pre className="whitespace-pre-wrap text-sm leading-relaxed text-[#191F28] bg-[#F8FAFB] rounded-xl p-4 border border-[#E5E8EB] font-sans">
                {post}
              </pre>
            </div>
          )}
        </div>

        <Footer />
      </main>
    </div>
  )
}
