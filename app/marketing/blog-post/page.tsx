'use client'
export const dynamic = 'force-dynamic'

// ============================================================
// /marketing/blog-post — 네이버 블로그 포스팅 자동 생성 (2026 AI 검색 최적화)
// · 글 트랙 3종 (순위용/신뢰용/관심사형)
// · 페르소나: 이름·나이·성별·말투 (굵직한 타입)
// · 프리셋: 누르면 업종만 채워줌 (키워드는 작성자 직접 입력)
// · 리뷰 연동 키워드, CTA 4단계, 25자 제목, 사진 분산
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
 { id: 'A', group: 'owner', label: '순위용', desc: '플레이스 연동·키워드 상위 노출 (정보·리스트형)', lengthHint: '800~1,500자', icon: TrendingUp, color: '#3182F6' },
 { id: 'B', group: 'owner', label: '신뢰용', desc: '문의·예약·방문 유도 (사례·스토리형)', lengthHint: '1,500~2,500자', icon: Award, color: '#7C3AED' },
 { id: 'C', group: 'owner', label: '관심사형', desc: '특정 타겟 공감·재방문·팬 확보 (공감·생활형)', lengthHint: '1,000~2,000자', icon: Heart, color: '#EC4899' },
 // 블로거/마케팅용
 { id: 'D', group: 'blogger', label: '맛집 후기', desc: '블로거 솔직 후기·방문기 (메뉴/맛/분위기 위주)', lengthHint: '800~1,500자', icon: UtensilsCrossed, color: '#EA580C' },
 { id: 'E', group: 'blogger', label: '체험단·협찬', desc: '체험·협찬 받은 후 작성 (광고 표기 자동 포함)', lengthHint: '1,500~2,500자', icon: Gift, color: '#059669' },
 { id: 'F', group: 'owner', label: '이벤트·프로모션', desc: '할인·이벤트·오픈 알림 (직접 전환 유도)', lengthHint: '600~1,200자', icon: Megaphone, color: '#DC2626' },
]

// ── 말투 타입 (굵직하게 분리, 완전 다른 톤) ──
type Tone = 'professional' | 'friendly' | 'expert' | 'storyteller' | 'witty'
const TONES: { id: Tone; label: string; desc: string }[] = [
 { id: 'professional', label: '프로페셔널', desc: '격식 있는 합쇼체 · 신뢰감 · 전문 분야 (병원·법무·세무)' },
 { id: 'friendly', label: '친근 동네', desc: '편한 해요체 · 동네 친구 같은 · 공감 (카페·미용실·식당)' },
 { id: 'expert', label: '권위 전문가', desc: '데이터·근거 중심 · 솔직 진단형 · 신뢰 (피부과·교육)' },
 { id: 'storyteller', label: '스토리텔러', desc: '경험·사례 풀어쓰기 · 진정성 · 감동 (여행·예술·핸드메이드)' },
 { id: 'witty', label: '위트 + 트렌드', desc: '가볍고 트렌디 · MZ 친화 · 재미 (디저트·패션·뷰티)' },
]

// ── 성별 ──
type Gender = 'any' | 'male' | 'female'
const GENDERS: { id: Gender; label: string }[] = [
 { id: 'any', label: '무관' },
 { id: 'male', label: '남성' },
 { id: 'female', label: '여성' },
]

// ── 연령대 (클릭 선택) ──
type AgeRange = 'any' | '20s' | '30s' | '40s' | '50s' | '60plus'
const AGE_RANGES: { id: AgeRange; label: string }[] = [
 { id: 'any', label: '무관' },
 { id: '20s', label: '20대' },
 { id: '30s', label: '30대' },
 { id: '40s', label: '40대' },
 { id: '50s', label: '50대' },
 { id: '60plus', label: '60대 이상' },
]

// ── 프리셋: 업종만 채움 (키워드는 작성자가 직접) ──
const INDUSTRY_PRESETS = [
 { id: 'cafe', label: '카페' },
 { id: 'food', label: '음식점' },
 { id: 'dental', label: '치과' },
 { id: 'nail', label: '네일샵' },
 { id: 'hair', label: '미용실' },
 { id: 'fitness', label: '헬스장/PT' },
 { id: 'pet', label: '동물병원' },
 { id: 'academy', label: '학원' },
 { id: 'skin', label: '피부과' },
 { id: 'realestate', label: '부동산' },
 { id: 'pharmacy', label: '약국' },
 { id: 'study', label: '스터디카페' },
 { id: 'oriental', label: '한의원' },
 { id: 'insurance', label: '보험설계사' },
 { id: 'clothes', label: '의류/쇼핑' },
] as const

export default function BlogPostGeneratorPage() {
 const [industry, setIndustry] = useState('')
 const [track, setTrack] = useState<Track>('A')
 const [personaName, setPersonaName] = useState('')
 const [personaAge, setPersonaAge] = useState<AgeRange>('any')
 const [personaGender, setPersonaGender] = useState<Gender>('any')
 const [personaTone, setPersonaTone] = useState<Tone>('friendly')
 const [coreTarget, setCoreTarget] = useState('')
 const [keywordInput, setKeywordInput] = useState('')
 const [keywords, setKeywords] = useState<string[]>([])
 const [detailKwInput, setDetailKwInput] = useState('')
 const [detailKeywords, setDetailKeywords] = useState<string[]>([])
 const [draft, setDraft] = useState('')
 // CTA: 마무리 메시지 (행동 유도 글) — 입력 폼 대신 자유 텍스트
 const [closingMessage, setClosingMessage] = useState('')
 // AI 초안 자동 생성 상태
 const [suggestLoading, setSuggestLoading] = useState(false)
 const [suggestError, setSuggestError] = useState<string | null>(null)
 const [length, setLength] = useState<1500 | 2000 | 2500 | 3000>(2000)
 const [photoNames, setPhotoNames] = useState<string[]>([])
 const fileRef = useRef<HTMLInputElement | null>(null)

 const [loading, setLoading] = useState(false)
 const [error, setError] = useState<string | null>(null)
 const [post, setPost] = useState<string | null>(null)
 const [copied, setCopied] = useState(false)
 const [viewMode, setViewMode] = useState<'preview' | 'markdown'>('preview')
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
 if (s.industry && !industry) setIndustry(s.industry)
 if (s.track) setTrack(s.track)
 if (s.personaName) setPersonaName(s.personaName)
 if (s.personaAge) setPersonaAge(s.personaAge)
 if (s.personaGender) setPersonaGender(s.personaGender)
 if (s.personaTone) setPersonaTone(s.personaTone)
 if (s.coreTarget) setCoreTarget(s.coreTarget)
 if (Array.isArray(s.keywords)) setKeywords(s.keywords)
 if (Array.isArray(s.detailKeywords)) setDetailKeywords(s.detailKeywords)
 if (s.closingMessage) setClosingMessage(s.closingMessage)
 if (s.length) setLength(s.length)
 }
 } catch (_) {}
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [])

 useEffect(() => {
 try {
 window.localStorage.setItem(LS_KEY, JSON.stringify({
 industry, track, personaName, personaAge, personaGender, personaTone,
 coreTarget, keywords, detailKeywords,
 closingMessage, length,
 }))
 } catch (_) {}
 }, [industry, track, personaName, personaAge, personaGender, personaTone, coreTarget, keywords, detailKeywords, closingMessage, length])

 const addKeyword = (k?: string) => {
 const target = (k ?? keywordInput).trim()
 if (!target) return
 if (keywords.includes(target)) { setKeywordInput(''); return }
 setKeywords(prev => [...prev, target])
 setKeywordInput('')
 }
 const removeKeyword = (k: string) => setKeywords(prev => prev.filter(x => x !== k))

 const addDetailKw = (k?: string) => {
 const target = (k ?? detailKwInput).trim()
 if (!target) return
 if (detailKeywords.includes(target)) { setDetailKwInput(''); return }
 setDetailKeywords(prev => [...prev, target])
 setDetailKwInput('')
 }
 const removeDetailKw = (k: string) => setDetailKeywords(prev => prev.filter(x => x !== k))

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

 // AI 초안 자동 생성 — 4·5·6번 입력값으로 7·8번 채움
 const handleSuggest = async () => {
 if (!industry.trim() && !keywords.length && !coreTarget.trim()) {
 setSuggestError('업종 / 핵심 타겟 / 키워드 중 하나는 입력해주세요')
 return
 }
 setSuggestError(null)
 setSuggestLoading(true)
 try {
 const r = await fetch('/api/marketing/blog-post-suggest', {
 method: 'POST',
 credentials: 'include',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 industry: industry.trim(),
 track,
 coreTarget: coreTarget.trim(),
 keywords: keywords.filter(Boolean),
 detailKeywords: detailKeywords.filter(Boolean),
 persona: { name: personaName.trim(), tone: personaTone },
 }),
 })
 const j = await r.json()
 if (!j.ok) { setSuggestError(j.error || '초안 생성 실패'); return }
 if (j.draft) setDraft(j.draft)
 if (j.closingMessage) setClosingMessage(j.closingMessage)
 } catch (e: any) {
 setSuggestError('네트워크 오류: ' + (e?.message || ''))
 } finally {
 setSuggestLoading(false)
 }
 }

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
 name: personaName.trim(),
 age: personaAge,
 gender: personaGender,
 tone: personaTone,
 },
 coreTarget: coreTarget.trim(),
 keywords: keywords.filter(Boolean),
 detailKeywords: detailKeywords.filter(Boolean),
 draft: draft.trim(),
 closingMessage: closingMessage.trim(),
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
 <div className="min-h-screen bg-[#F8F9FA]">
 <Sidebar />
 <main className="flex-1 ml-0 md:ml-[220px] flex flex-col min-h-screen pt-4 md:pt-0">
 <PageHeader
 icon={<PenLine size={28} className="text-white" strokeWidth={2.5} />}
 title="네이버 블로그 글 작성"
 subtitle="2026 AI 검색 최적화 · SEO+AEO 혼합 · 상위 노출과 전환율 동시 설계"
 variant="naver"
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

 <div className="mb-3">
 <label className="text-[11px] font-bold text-[#4E5968] mb-1 block">이름 또는 닉네임</label>
 <input value={personaName} onChange={e => setPersonaName(e.target.value)}
 placeholder="예: 박원장, 김실장, 강선생, 카페지기"
 className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#3182F6]" />
 </div>

 <div className="mb-3">
 <label className="text-[11px] font-bold text-[#4E5968] mb-1.5 block">연령대</label>
 <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5">
 {AGE_RANGES.map(a => (
 <button key={a.id} onClick={() => setPersonaAge(a.id)}
 className={`py-2 rounded-lg text-xs font-bold border ${personaAge === a.id ? 'border-[#3182F6] bg-[#EFF6FF] text-[#3182F6]' : 'border-[#E5E8EB] bg-white text-[#4E5968]'}`}>
 {a.label}
 </button>
 ))}
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

 {/* 6. 세부 키워드 (롱테일·연관) */}
 <section className="bg-white rounded-2xl shadow-sm border border-[#E5E8EB] p-4 md:p-5">
 <div className="flex items-start gap-2 mb-3">
 <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#EC4899] to-[#DB2777] flex items-center justify-center shadow-sm">
 <Tag size={15} className="text-white" strokeWidth={2.5} />
 </div>
 <div>
 <p className="text-sm font-black text-[#191F28]">6. 세부 키워드 (롱테일·연관)</p>
 <p className="text-[11px] text-[#8B95A1]">메인 키워드를 보조하는 세부 검색어 · 검색 다양성 확보 + 노출 폭 확대</p>
 </div>
 </div>
 <div className="flex gap-2 mb-2">
 <input value={detailKwInput} onChange={e => setDetailKwInput(e.target.value)}
 onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addDetailKw())}
 placeholder="예: 강남역 도보 5분, 주차 가능, 평일 야간 운영, 첫 방문 혜택"
 className="flex-1 border border-[#E5E8EB] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#EC4899]" />
 <button onClick={() => addDetailKw()} disabled={!detailKwInput.trim()}
 className="px-4 py-2 bg-[#EC4899] text-white rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-[#DB2777]">
 <Plus size={14} strokeWidth={2.5} />
 </button>
 </div>
 <div className="flex flex-wrap gap-1.5">
 {detailKeywords.map(k => (
 <span key={k} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FDF2F8] text-[#EC4899] text-xs font-bold border border-[#FBCFE8]">
 {k}
 <button onClick={() => removeDetailKw(k)} className="text-[#EC4899]/60 hover:text-[#DC2626]">
 <X size={11} strokeWidth={3} />
 </button>
 </span>
 ))}
 </div>
 </section>

 {/* AI 자동 초안 — 4·5·6번 정보로 7·8번 미리 채워주기 */}
 <div className="rounded-2xl p-4 md:p-5 bg-gradient-to-br from-[#EFF6FF] via-[#F5F3FF] to-[#FDF2F8] border-2 border-dashed border-[#7C3AED]">
 <div className="flex items-start gap-2.5 mb-3">
 <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3182F6] to-[#7C3AED] flex items-center justify-center shadow-sm flex-shrink-0">
 <Sparkles size={16} className="text-white" strokeWidth={2.5} />
 </div>
 <div className="flex-1">
 <p className="text-sm font-black text-[#191F28]">4·5·6번 정보로 초안 자동 작성</p>
 <p className="text-[11px] text-[#4E5968] leading-relaxed">
 핵심 타겟·키워드·세부키워드만 입력해도 7번(초안)·8번(마무리)에 들어갈 메모를 AI가 가볍게 만들어드려요. 그대로 사용하거나 자유롭게 수정 가능.
 </p>
 </div>
 </div>
 <button onClick={handleSuggest} disabled={suggestLoading}
 className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#3182F6] to-[#7C3AED] text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-md transition-shadow">
 {suggestLoading ? (
 <><Loader2 size={14} className="animate-spin" strokeWidth={2.5} /> AI가 초안 작성 중...</>
 ) : (
 <><Sparkles size={14} strokeWidth={2.5} /> AI 초안 자동 작성하기 (7·8번 자동 채움)</>
 )}
 </button>
 {suggestError && (
 <p className="mt-2 text-[11px] text-[#DC2626]">{suggestError}</p>
 )}
 </div>

 {/* 7. 초안·메모 */}
 <section className="bg-white rounded-2xl shadow-sm border border-[#E5E8EB] p-4 md:p-5">
 <div className="flex items-start gap-2 mb-3">
 <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0EA5E9] to-[#0369A1] flex items-center justify-center shadow-sm">
 <FileText size={15} className="text-white" strokeWidth={2.5} />
 </div>
 <div className="flex-1">
 <p className="text-sm font-black text-[#191F28]">7. 초안·메모·방향성 (선택)</p>
 <p className="text-[11px] text-[#8B95A1]">위 AI 초안 사용 또는 직접 작성 · 강조 포인트·사례·차별점·가격·위치 등</p>
 </div>
 {draft && (
 <button onClick={() => setDraft('')} className="text-[10px] text-[#8B95A1] hover:text-[#DC2626] flex-shrink-0">
 초기화
 </button>
 )}
 </div>
 <textarea value={draft} onChange={e => setDraft(e.target.value)}
 rows={6}
 placeholder={'담을 내용 자유롭게 작성:\n· 강조하고 싶은 차별점 (예: 24시간 운영, 자체 제조법, 10년 경력)\n· 실제 사례 (예: 30일 만에 4kg 감량한 회원님)\n· 위치·영업시간·가격 등 정보\n· 절대 빠지면 안 되는 메시지\n\n또는 위 [AI 초안 자동 작성] 버튼 활용'}
 className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0EA5E9] resize-none" />
 </section>

 {/* 8. 마무리 메시지 (행동 유도 글) */}
 <section className="bg-white rounded-2xl shadow-sm border border-[#E5E8EB] p-4 md:p-5">
 <div className="flex items-start gap-2 mb-3">
 <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#16A34A] to-[#15803D] flex items-center justify-center shadow-sm">
 <LinkIcon size={15} className="text-white" strokeWidth={2.5} />
 </div>
 <div className="flex-1">
 <p className="text-sm font-black text-[#191F28]">8. 마무리 메시지 (행동 유도)</p>
 <p className="text-[11px] text-[#8B95A1]">글을 읽은 후 자연스럽게 다음 행동으로 연결되는 글로 표현 · 빈칸 가능 · AI 자동 초안 사용 가능</p>
 </div>
 {closingMessage && (
 <button onClick={() => setClosingMessage('')} className="text-[10px] text-[#8B95A1] hover:text-[#DC2626] flex-shrink-0">
 초기화
 </button>
 )}
 </div>
 <textarea value={closingMessage} onChange={e => setClosingMessage(e.target.value)}
 rows={4}
 placeholder={'예시 (자유롭게 작성):\n· 망설이지 마시고 가벼운 마음으로 한 번 들러주세요\n· 처음 오시는 분들을 위해 첫 방문 안내 도와드리고 있어요\n· 평일 오후 시간대가 한가하니 천천히 둘러보기 좋습니다\n· 궁금하신 점은 언제든 편하게 물어봐 주시면 자세히 알려드릴게요\n\n빈칸으로 두면 글 트랙·타겟에 맞춰 자동 작성됩니다'}
 className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#16A34A] resize-none" />
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
 {loading ? (<><Loader2 size={18} className="animate-spin" strokeWidth={2.5} /> AI 작성 중... (1~2분, 길수록 더 걸려요)</>) : (<><Sparkles size={18} strokeWidth={2.5} /> 블로그 글 생성하기</>)}
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
 <div className="flex gap-2 flex-wrap">
 <div className="inline-flex rounded-xl bg-[#F2F4F6] p-0.5">
 <button onClick={() => setViewMode('preview')}
 className={'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ' +
 (viewMode === 'preview' ? 'bg-white text-[#191F28] shadow-sm' : 'text-[#8B95A1]')}>
 미리보기
 </button>
 <button onClick={() => setViewMode('markdown')}
 className={'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ' +
 (viewMode === 'markdown' ? 'bg-white text-[#191F28] shadow-sm' : 'text-[#8B95A1]')}>
 마크다운
 </button>
 </div>
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
 {viewMode === 'preview' ? (
 <BlogPreview markdown={post} />
 ) : (
 <pre className="whitespace-pre-wrap text-sm leading-relaxed text-[#191F28] bg-[#F8FAFB] rounded-xl p-4 border border-[#E5E8EB] font-sans">
 {post}
 </pre>
 )}
 </div>
 )}
 </div>

 <Footer />
 </main>
 </div>
 )
}

// ── 블로그 미리보기 — 마크다운 → HTML 인라인 파서 (외부 lib 없음) ──
//   지원: # h1~h3, **bold**, *italic*, - / 1. lists, > quote, `code`,
//        ![alt](url) image, [text](url) link, --- hr, 빈줄 → 단락
function BlogPreview({ markdown }: { markdown: string }) {
 const html = renderMarkdownToHtml(markdown)
 return (
 <article
 className="bg-white rounded-xl border border-[#E5E8EB] p-5 md:p-7 prose-blog text-[15px] leading-[1.8] text-[#191F28]"
 dangerouslySetInnerHTML={{ __html: html }}
 />
 )
}

function escapeHtml(s: string): string {
 return s
 .replace(/&/g, '&amp;')
 .replace(/</g, '&lt;')
 .replace(/>/g, '&gt;')
 .replace(/"/g, '&quot;')
 .replace(/'/g, '&#39;')
}

function renderInline(s: string): string {
 // 이미 escape 된 문자열 가정
 // 1) 이미지 ![alt](url)
 s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) =>
 `<img src="${url}" alt="${alt}" class="my-3 rounded-xl border border-[#F2F4F6] max-w-full" />`)
 // 2) 링크 [text](url)
 s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-[#3182F6] underline">$1</a>')
 // 3) bold + italic 동시 ***
 s = s.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
 // 4) bold **text**
 s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
 // 5) italic *text* (단어 경계 안전)
 s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
 // 6) inline code `code`
 s = s.replace(/`([^`]+)`/g, '<code class="bg-[#F2F4F6] px-1.5 py-0.5 rounded text-[13px] font-mono">$1</code>')
 return s
}

function renderMarkdownToHtml(md: string): string {
 if (!md) return ''
 const lines = md.replace(/\r\n/g, '\n').split('\n')
 const out: string[] = []
 let i = 0
 const flushPara = (acc: string[]) => {
 if (acc.length === 0) return
 const text = acc.map(escapeHtml).join('<br />')
 out.push(`<p class="my-3">${renderInline(text)}</p>`)
 acc.length = 0
 }
 const para: string[] = []

 while (i < lines.length) {
 const line = lines[i]

 // 빈 줄 → 단락 끊기
 if (/^\s*$/.test(line)) { flushPara(para); i++; continue }

 // 헤더
 const h = line.match(/^(#{1,3})\s+(.+)$/)
 if (h) {
 flushPara(para)
 const lvl = h[1].length
 const txt = renderInline(escapeHtml(h[2]))
 const cls = lvl === 1 ? 'text-[28px] font-black mt-6 mb-3 leading-tight'
 : lvl === 2 ? 'text-[22px] font-black mt-5 mb-3 leading-tight'
 : 'text-[18px] font-bold mt-4 mb-2'
 out.push(`<h${lvl} class="${cls}">${txt}</h${lvl}>`)
 i++; continue
 }

 // 가로선
 if (/^\s*---+\s*$/.test(line)) {
 flushPara(para)
 out.push('<hr class="my-5 border-[#E5E8EB]" />')
 i++; continue
 }

 // 인용 >
 if (/^\s*>\s/.test(line)) {
 flushPara(para)
 const quotes: string[] = []
 while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
 quotes.push(lines[i].replace(/^\s*>\s?/, ''))
 i++
 }
 const inner = renderInline(quotes.map(escapeHtml).join('<br />'))
 out.push(`<blockquote class="border-l-4 border-[#3182F6] bg-[#F8FAFB] pl-4 py-2 my-4 italic text-[#4E5968]">${inner}</blockquote>`)
 continue
 }

 // 순서 없는 리스트
 if (/^\s*[-*]\s+/.test(line)) {
 flushPara(para)
 const items: string[] = []
 while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
 items.push(lines[i].replace(/^\s*[-*]\s+/, ''))
 i++
 }
 out.push('<ul class="list-disc pl-6 my-3 space-y-1.5">' +
 items.map(it => `<li>${renderInline(escapeHtml(it))}</li>`).join('') +
 '</ul>')
 continue
 }

 // 순서 있는 리스트
 if (/^\s*\d+\.\s+/.test(line)) {
 flushPara(para)
 const items: string[] = []
 while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
 items.push(lines[i].replace(/^\s*\d+\.\s+/, ''))
 i++
 }
 out.push('<ol class="list-decimal pl-6 my-3 space-y-1.5">' +
 items.map(it => `<li>${renderInline(escapeHtml(it))}</li>`).join('') +
 '</ol>')
 continue
 }

 // 이미지 단독 줄
 if (/^!\[[^\]]*\]\([^)]+\)\s*$/.test(line.trim())) {
 flushPara(para)
 out.push(renderInline(line.trim()))
 i++; continue
 }

 // 일반 단락
 para.push(line)
 i++
 }
 flushPara(para)
 return out.join('\n')
}
