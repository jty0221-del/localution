'use client'

// ============================================================
// /help — 사장님 도움말 & 시작 가이드 센터
// · 5분 시작 가이드
// · 기능별 사용법 (검색 가능)
// · 자주 묻는 질문
// · 1:1 문의 연결
// ============================================================
import { useState, useMemo } from 'react'
import Link from 'next/link'
import Sidebar from '../components/Sidebar'
import PageHeader from '../components/PageHeader'
import Footer from '../components/Footer'
import HarangMarketingPopup from '../components/HarangMarketingPopup'
import {
 HelpCircle, Search, ChevronDown, ChevronRight,
 Rocket, MessageSquare, QrCode, Users, Coins, Megaphone,
 Sparkles, BookOpen, ArrowRight, Phone, Mail, Lightbulb,
 Shield, Zap, Settings,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

type Guide = {
 id: string
 category: string
 title: string
 steps: string[]
 link?: { href: string; label: string }
}

const QUICK_START: Guide[] = [
 {
 id: 'qs-store',
 category: '시작',
 title: '1) 매장 정보 등록 (3분)',
 steps: [
 '사이드바 "매장 관리" 클릭',
 '네이버 플레이스 URL 붙여넣기 → 매장명 / 주소 / 전화 / 키워드 자동 채움',
 '대표 메뉴와 매장 강점 1-2줄 추가',
 '저장 클릭 → 모든 AI 기능이 우리 매장 정보 기반으로 작동',
 ],
 link: { href: '/settings/profile', label: '매장 정보 등록 →' },
 },
 {
 id: 'qs-platform',
 category: '시작',
 title: '2) 플랫폼 연결 (5분)',
 steps: [
 '"플랫폼 통합관리" 메뉴 클릭',
 '네이버·배민·요기요·쿠팡이츠 중 사용 중인 플랫폼 선택',
 '각 플랫폼 사장님 계정 ID/PW 입력 (AES-256 암호화 저장)',
 '연결 즉시 자동으로 리뷰 수집 시작 (15분마다 갱신)',
 ],
 link: { href: '/my/platforms', label: '플랫폼 연결하기 →' },
 },
 {
 id: 'qs-review',
 category: '시작',
 title: '3) AI 답글 생성 + 자동 발행',
 steps: [
 '리뷰 관리 → 플랫폼 선택 (네이버 / 배민 / ...)',
 '톤 11종 (친근 / 전문 / 감사 / 사과 / 미식 / 사장님 맞춤 등) 선택',
 '"AI 초안 만들기" 클릭 → 30초 안에 완성',
 '필요하면 직접 수정 → "발행" 클릭 → 자동 등록',
 ],
 link: { href: '/review-admin', label: '리뷰 답글 시작 →' },
 },
 {
 id: 'qs-qr',
 category: '시작',
 title: '4) QR 리뷰로 손님이 직접 후기 작성',
 steps: [
 'QR 관리 메뉴 → "새 QR 만들기"',
 '제목 / 보상 단계 (예: 5번 방문 시 1잔 무료) 입력',
 'QR 코드 PNG 다운로드 → 카운터·메뉴판에 비치',
 '손님 스캔 → AI 리뷰 자동 생성 → 네이버·구글 원클릭 등록',
 ],
 link: { href: '/qr-admin', label: 'QR 만들기 →' },
 },
]

const FEATURE_GUIDES: Guide[] = [
 {
 id: 'fg-stats',
 category: '리뷰',
 title: '답글 발행 통계 보기',
 steps: [
 '리뷰 관리 → "답글 발행 통계" 클릭',
 '기간 선택 (7일 / 30일 / 90일)',
 '플랫폼별 답변률·자동 발행 성공률·평균 소요 시간 확인',
 '문제가 반복되면 "문의 보내기" 버튼으로 통계 자동 첨부',
 ],
 link: { href: '/review-admin/stats', label: '통계 보기 →' },
 },
 {
 id: 'fg-keyword',
 category: '마케팅',
 title: '내 매장 키워드 순위 확인',
 steps: [
 '마케팅 → "플레이스(실시간)" 클릭',
 '지역 / 업종 / 키워드 선택',
 '실시간 검색 결과에서 내 매장 순위 확인',
 '주기적으로 체크하면 SEO 효과 측정 가능',
 ],
 link: { href: '/marketing/keyword-rank', label: '순위 확인 →' },
 },
 {
 id: 'fg-blog',
 category: '마케팅',
 title: '블로그 글 AI 자동 작성',
 steps: [
 '마케팅 → "블로그 글 작성"',
 '주제 / 키워드 / 페르소나 입력',
 '"AI 글쓰기" 클릭 → 3000자 SEO 최적화 글 자동 완성',
 '복사해서 네이버 블로그에 붙여넣기',
 ],
 link: { href: '/marketing/blog-post', label: '블로그 작성 →' },
 },
 {
 id: 'fg-instagram',
 category: '마케팅',
 title: '인스타그램 피드 자동 발행',
 steps: [
 '마케팅 → "피드 자동 발행"',
 '매장 사진 업로드 (최대 10장)',
 '톤 선택 + 주제 1줄 입력 → "AI 캡션 생성"',
 '캡션·해시태그 자동 완성 → 인스타 앱에 복사 / 붙여넣기',
 ],
 link: { href: '/marketing/instagram-feed', label: '인스타 발행 →' },
 },
 {
 id: 'fg-events',
 category: '마케팅',
 title: '매장 이벤트 만들기',
 steps: [
 '마케팅 → "이벤트·프로모션"',
 '템플릿 선택 (오픈 / 시즌 / 단골 / 타임세일 / 협업)',
 '제목 / 시작·종료일 / 혜택 / 대상 입력',
 '저장 → 진행 중 / 예정 / 종료 자동 분류',
 ],
 link: { href: '/marketing/events', label: '이벤트 만들기 →' },
 },
 {
 id: 'fg-customers',
 category: '고객',
 title: '단골·VIP 고객 관리',
 steps: [
 '고객 관리 메뉴 클릭',
 '직접 추가 또는 QR 스탬프카드로 자동 등록',
 'VIP / 단골 / 신규 자동 분류',
 '단체 메시지 보내기 (이름 자동 치환)',
 ],
 link: { href: '/customers', label: '고객 관리 →' },
 },
 {
 id: 'fg-reservations',
 category: '운영',
 title: '예약·일정 관리',
 steps: [
 '예약·일정 메뉴 클릭',
 '"+ 예약 추가" → 날짜 / 시간 / 인원 입력',
 '캘린더 뷰에서 한눈에 확인',
 '취소 / 완료 상태 변경 가능',
 ],
 link: { href: '/reservations', label: '예약 관리 →' },
 },
]

const FAQS = [
 {
 q: '비밀번호가 안전한가요?',
 a: '네이버·배민·요기요 등 플랫폼 비밀번호는 AES-256-GCM으로 암호화되어 서버에 보관됩니다. 답글 발행 외 다른 용도로 절대 사용되지 않으며, 연결 해제 시 즉시 파기됩니다.',
 },
 {
 q: 'AI가 만든 답글이 어색하지 않나요?',
 a: '매장명·강점·메뉴·사장님 이름까지 학습해서 자연스럽게 만듭니다. 톤 11종 + 사장님 맞춤 톤까지 지원하며, 발행 전 검토·수정이 가능합니다.',
 },
 {
 q: '리뷰가 새로 달리면 알 수 있나요?',
 a: '15분마다 자동 수집해서 별점 1-2점 부정 리뷰는 우선 알림으로 보내드립니다. 웹푸시와 카카오톡으로 받을 수 있어요.',
 },
 {
 q: '여러 매장을 한 계정에서 관리할 수 있나요?',
 a: '네. Pro 플랜에서는 매장별 권한 분리도 됩니다. 1인 마케팅 대행사·프랜차이즈 본부 사장님들이 자주 쓰세요.',
 },
 {
 q: '해지가 어렵거나 자동결제가 무서워요',
 a: '언제든 설정에서 원클릭 해지 가능. 당월 남은 일수만큼 일할 환불됩니다. 결제 3일 전·당일 카카오톡 알림도 발송됩니다.',
 },
 {
 q: '배민·요기요 30일 정책이 뭔가요?',
 a: '배민·요기요는 리뷰 등록 후 30일이 지나면 사장님 답글 등록이 막혀요. 그래서 새 리뷰는 알림 받자마자 답글 다는 게 좋아요. 통계 페이지에서 30일 만료 건수 확인 가능합니다.',
 },
]

// 카테고리별 가이드 anchor — Coins(정산) 제거 (settlement 페이지가 redirect-only)
const SECTIONS = [
 { id: 'quick',     label: '5분 시작 가이드', Icon: Rocket,        color: 'from-[#3182F6] to-[#1B64DA]' },
 { id: 'features',  label: '기능별 사용법',   Icon: MessageSquare, color: 'from-[#F59E0B] to-[#D97706]' },
 { id: 'faq',       label: '자주 묻는 질문',  Icon: Megaphone,     color: 'from-[#EC4899] to-[#BE185D]' },
 { id: 'inquiry',   label: '1:1 문의',        Icon: Users,         color: 'from-[#10B981] to-[#059669]' },
]

export default function HelpPage() {
 const [search, setSearch] = useState('')
 const [openId, setOpenId] = useState<string | null>(null)
 const [openFaq, setOpenFaq] = useState<number | null>(null)

 const allGuides = useMemo(() => [...QUICK_START, ...FEATURE_GUIDES], [])
 const filtered = useMemo(() => {
 if (!search.trim()) return allGuides
 const q = search.toLowerCase()
 return allGuides.filter(g =>
 g.title.toLowerCase().includes(q) ||
 g.category.toLowerCase().includes(q) ||
 g.steps.some(s => s.toLowerCase().includes(q))
 )
 }, [allGuides, search])

 return (
 <div className="min-h-screen bg-[#F8F9FA]">
 <Sidebar />
 <div className="md:ml-[220px] flex flex-col min-h-screen">
 <PageHeader
 icon={<HelpCircle size={28} className="text-white" strokeWidth={2.5} />}
 title="도움말 & 가이드"
 subtitle="처음 시작하시나요? 5분 가이드 + 기능별 사용법 + 자주 묻는 질문"
 variant="primary"
 />

 <main className="flex-1 px-4 md:px-6 py-4 md:py-6 max-w-6xl mx-auto w-full space-y-5 md:space-y-6">

 {/* 검색바 */}
 <div className="bg-white rounded-2xl shadow-sm p-3 md:p-4 flex items-center gap-2">
 <Search size={16} className="text-[#8B95A1] flex-shrink-0" strokeWidth={2.5} />
 <input
 type="text"
 value={search}
 onChange={e => setSearch(e.target.value)}
 placeholder="궁금한 기능을 검색하세요 (예: 답글, 키워드, QR)"
 className="flex-1 text-sm bg-transparent focus:outline-none text-[#191F28] placeholder:text-[#8B95A1]"
 />
 {search && (
 <button onClick={() => setSearch('')} className="text-xs text-[#8B95A1] hover:text-[#4E5968]">
 지우기
 </button>
 )}
 </div>

 {/* 카테고리 빠른 이동 */}
 {!search && (
 <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
 {SECTIONS.map(s => (
 <a key={s.id} href={`#${s.id}`}
 className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white border border-[#F2F4F6] hover:border-[#3182F6] hover:bg-[#FAFBFF] transition-all">
 <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-sm`}>
 <s.Icon size={15} className="text-white" strokeWidth={2.5} />
 </div>
 <p className="text-[11px] font-bold text-[#191F28] text-center leading-tight">{s.label}</p>
 </a>
 ))}
 </div>
 )}

 {/* 5분 시작 가이드 */}
 <section id="quick">
 <div className="flex items-center gap-2 mb-3">
 <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#3182F6] to-[#1B64DA] flex items-center justify-center shadow-sm">
 <Rocket size={14} className="text-white" strokeWidth={2.5} />
 </div>
 <h2 className="text-base md:text-lg font-bold text-[#191F28]">처음이신가요? 5분 시작 가이드</h2>
 </div>
 <div className="space-y-2">
 {(search ? filtered : QUICK_START).filter(g => g.category === '시작').map(g => (
 <GuideCard key={g.id} guide={g} open={openId === g.id} onToggle={() => setOpenId(openId === g.id ? null : g.id)} />
 ))}
 {search && filtered.filter(g => g.category === '시작').length === 0 && (
 <p className="text-xs text-[#8B95A1] text-center py-4">검색 결과 없음</p>
 )}
 </div>
 </section>

 {/* 기능별 사용법 */}
 <section id="features" className="scroll-mt-20">
 <div className="flex items-center gap-2 mb-3">
 <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#6D28D9] flex items-center justify-center shadow-sm">
 <BookOpen size={14} className="text-white" strokeWidth={2.5} />
 </div>
 <h2 className="text-base md:text-lg font-bold text-[#191F28]">기능별 사용법</h2>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 {(search ? filtered : FEATURE_GUIDES).filter(g => g.category !== '시작').map(g => (
 <GuideCard key={g.id} guide={g} open={openId === g.id} onToggle={() => setOpenId(openId === g.id ? null : g.id)} />
 ))}
 {search && filtered.filter(g => g.category !== '시작').length === 0 && (
 <p className="text-xs text-[#8B95A1] text-center py-4 col-span-2">검색 결과 없음</p>
 )}
 </div>
 </section>

 {/* FAQ */}
 {!search && (
 <section id="faq" className="scroll-mt-20">
 <div className="flex items-center gap-2 mb-3">
 <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center shadow-sm">
 <Lightbulb size={14} className="text-white" strokeWidth={2.5} />
 </div>
 <h2 className="text-base md:text-lg font-bold text-[#191F28]">자주 묻는 질문</h2>
 </div>
 <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-[#F2F4F6]">
 {FAQS.map((f, i) => {
 const isOpen = openFaq === i
 return (
 <div key={i}>
 <button onClick={() => setOpenFaq(isOpen ? null : i)}
 className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-[#FAFBFF] transition-colors">
 <span className="text-xs font-black text-[#3182F6] flex-shrink-0">Q.</span>
 <span className="flex-1 text-sm font-bold text-[#191F28]">{f.q}</span>
 {isOpen ? <ChevronDown size={14} className="text-[#8B95A1]" strokeWidth={2.5} />
 : <ChevronRight size={14} className="text-[#8B95A1]" strokeWidth={2.5} />}
 </button>
 {isOpen && (
 <div className="px-4 pb-3 pt-1 bg-[#FAFBFF]">
 <p className="text-xs md:text-sm text-[#4E5968] leading-relaxed pl-4">{f.a}</p>
 </div>
 )}
 </div>
 )
 })}
 </div>
 </section>
 )}

 {/* 1:1 문의 CTA */}
 {!search && (
 <section id="inquiry" className="scroll-mt-20">
 <div className="rounded-2xl shadow-sm bg-gradient-to-br from-[#EFF6FF] to-[#F5F3FF] border border-[#DBEAFE] p-5 flex items-start gap-4">
 <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#3182F6] to-[#7C3AED] flex items-center justify-center flex-shrink-0 shadow-sm">
 <Mail size={20} className="text-white" strokeWidth={2.5} />
 </div>
 <div className="flex-1">
 <h3 className="text-sm md:text-base font-bold text-[#191F28] mb-1">
 여기 없는 질문이 있으신가요?
 </h3>
 <p className="text-xs md:text-sm text-[#4E5968] mb-3 leading-relaxed">
 1:1 문의로 보내주시면 평일 24시간 이내 답변 드려요. 사용 중 막히는 부분, 새로 만들어주셨으면 하는 기능, 뭐든 환영합니다.
 </p>
 <Link href="/inquiry"
 className="inline-flex items-center gap-1.5 bg-[#3182F6] text-white text-xs md:text-sm font-bold px-4 py-2 rounded-xl hover:bg-[#1B64DA] transition-colors shadow-sm">
 1:1 문의 보내기
 <ArrowRight size={14} strokeWidth={2.5} />
 </Link>
 </div>
 </div>
 </section>
 )}

 </main>
 <Footer />
 <HarangMarketingPopup />
 </div>
 </div>
 )
}

function GuideCard({ guide, open, onToggle }: { guide: Guide; open: boolean; onToggle: () => void }) {
 return (
 <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-transparent hover:border-[#3182F6]/20 transition-colors">
 <button onClick={onToggle}
 className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-[#FAFBFF] transition-colors">
 <span className="text-[10px] font-bold text-[#3182F6] bg-[#EFF6FF] px-1.5 py-0.5 rounded-full flex-shrink-0">
 {guide.category}
 </span>
 <span className="flex-1 text-sm font-bold text-[#191F28] truncate">{guide.title}</span>
 {open ? <ChevronDown size={14} className="text-[#8B95A1]" strokeWidth={2.5} />
 : <ChevronRight size={14} className="text-[#8B95A1]" strokeWidth={2.5} />}
 </button>
 {open && (
 <div className="px-4 pb-4 pt-0 space-y-1.5">
 <ol className="space-y-1.5 text-xs md:text-sm text-[#4E5968] leading-relaxed list-decimal list-inside">
 {guide.steps.map((s, i) => <li key={i} className="leading-relaxed">{s}</li>)}
 </ol>
 {guide.link && (
 <Link href={guide.link.href}
 className="inline-flex items-center gap-1 text-xs font-bold text-[#3182F6] hover:text-[#1B64DA] mt-2">
 {guide.link.label}
 </Link>
 )}
 </div>
 )}
 </div>
 )
}
