'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import Footer from '../components/Footer'
import {
  ArrowLeft, ArrowRight, Star, RefreshCw, CheckCircle2,
  Loader2, Send, ScanLine, MessageSquare,
  TrendingUp, Users, BarChart3, PenLine, Zap, Shield,
} from 'lucide-react'

// ── 전역 keyframe 스타일 ─────────────────────────────────────
const GLOBAL_STYLES = `
  @keyframes qrscan {
    0%   { top: 6px; opacity: 1; }
    46%  { top: 86px; opacity: 1; }
    48%  { top: 86px; opacity: 0; }
    50%  { top: 6px; opacity: 0; }
    52%  { top: 6px; opacity: 1; }
    100% { top: 6px; opacity: 1; }
  }
  @keyframes float0 {
    0%,100% { transform: translateY(0px) rotate(-2deg); }
    50%     { transform: translateY(-12px) rotate(1deg); }
  }
  @keyframes float1 {
    0%,100% { transform: translateY(0px) rotate(2deg); }
    50%     { transform: translateY(-16px) rotate(-1deg); }
  }
  @keyframes float2 {
    0%,100% { transform: translateY(0px) rotate(-1deg); }
    50%     { transform: translateY(-10px) rotate(2deg); }
  }
  @keyframes riseFade {
    0%   { opacity: 0; transform: translateY(30px); }
    15%  { opacity: 1; transform: translateY(0); }
    75%  { opacity: 1; transform: translateY(-20px); }
    100% { opacity: 0; transform: translateY(-40px); }
  }
  @keyframes drawCircle {
    from { stroke-dashoffset: 170; }
    to   { stroke-dashoffset: 0; }
  }
  @keyframes drawCheck {
    from { stroke-dashoffset: 42; }
    to   { stroke-dashoffset: 0; }
  }
  @keyframes popIn {
    0%   { transform: scale(0.3); opacity: 0; }
    60%  { transform: scale(1.1); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes sparkle {
    0%,100% { transform: scale(0) rotate(0deg); opacity: 0; }
    50%      { transform: scale(1) rotate(180deg); opacity: 1; }
  }
`

// ── SVG: QR 스캔 애니메이션 ──────────────────────────────────
function QrScanSvg() {
  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
        {/* 좌상 코너 박스 */}
        <rect x="6" y="6" width="30" height="30" rx="4" stroke="#191F28" strokeWidth="3.5" fill="none"/>
        <rect x="13" y="13" width="16" height="16" rx="2" fill="#191F28"/>
        {/* 우상 코너 박스 */}
        <rect x="60" y="6" width="30" height="30" rx="4" stroke="#191F28" strokeWidth="3.5" fill="none"/>
        <rect x="67" y="13" width="16" height="16" rx="2" fill="#191F28"/>
        {/* 좌하 코너 박스 */}
        <rect x="6" y="60" width="30" height="30" rx="4" stroke="#191F28" strokeWidth="3.5" fill="none"/>
        <rect x="13" y="67" width="16" height="16" rx="2" fill="#191F28"/>
        {/* 데이터 셀들 */}
        <rect x="44" y="6"  width="8" height="8" rx="1.5" fill="#191F28"/>
        <rect x="44" y="18" width="8" height="8" rx="1.5" fill="#191F28"/>
        <rect x="6"  y="44" width="8" height="8" rx="1.5" fill="#191F28"/>
        <rect x="18" y="44" width="8" height="8" rx="1.5" fill="#191F28"/>
        <rect x="44" y="44" width="8" height="8" rx="1.5" fill="#191F28"/>
        <rect x="56" y="44" width="8" height="8" rx="1.5" fill="#191F28"/>
        <rect x="68" y="44" width="8" height="8" rx="1.5" fill="#191F28"/>
        <rect x="82" y="6"  width="8" height="8" rx="1.5" fill="#191F28"/>
        <rect x="82" y="18" width="8" height="8" rx="1.5" fill="#191F28"/>
        <rect x="82" y="30" width="8" height="8" rx="1.5" fill="#191F28"/>
        <rect x="44" y="56" width="8" height="8" rx="1.5" fill="#191F28"/>
        <rect x="68" y="56" width="8" height="8" rx="1.5" fill="#191F28"/>
        <rect x="56" y="68" width="8" height="8" rx="1.5" fill="#191F28"/>
        <rect x="44" y="80" width="8" height="8" rx="1.5" fill="#191F28"/>
        <rect x="68" y="80" width="8" height="8" rx="1.5" fill="#191F28"/>
        <rect x="82" y="68" width="8" height="8" rx="1.5" fill="#191F28"/>
        <rect x="82" y="80" width="8" height="8" rx="1.5" fill="#191F28"/>
      </svg>
      {/* 스캔 레이저 빔 */}
      <div
        className="absolute left-1 right-1 rounded-full"
        style={{
          height: '2px',
          background: 'linear-gradient(90deg, transparent 0%, #059669 20%, #34D399 50%, #059669 80%, transparent 100%)',
          boxShadow: '0 0 8px 2px rgba(5,150,105,0.7)',
          animation: 'qrscan 2.2s ease-in-out infinite',
          top: '6px',
        }}
      />
      {/* 스캔 영역 글로우 오버레이 */}
      <div className="absolute inset-0 rounded-lg pointer-events-none"
        style={{ boxShadow: 'inset 0 0 12px rgba(5,150,105,0.08)' }} />
    </div>
  )
}

// ── SVG: 완료 체크마크 ────────────────────────────────────────
function AnimatedCheck() {
  return (
    <div style={{ animation: 'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="32" r="28" fill="#ECFDF5" />
        <circle cx="32" cy="32" r="27" fill="none" stroke="#059669" strokeWidth="3"
          strokeDasharray="170" strokeDashoffset="170"
          style={{ animation: 'drawCircle 0.55s ease-out 0.1s forwards' }} />
        <polyline points="19,33 28,42 46,24" fill="none" stroke="#059669" strokeWidth="4"
          strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray="42" strokeDashoffset="42"
          style={{ animation: 'drawCheck 0.35s ease-out 0.55s forwards' }} />
        {/* 반짝이 파티클 */}
        {[
          { x: 52, y: 14, delay: '0.8s', size: 8 },
          { x: 14, y: 20, delay: '0.95s', size: 6 },
          { x: 52, y: 50, delay: '0.9s', size: 7 },
        ].map((s, i) => (
          <text key={i} x={s.x} y={s.y} fontSize={s.size} textAnchor="middle"
            style={{ animation: `sparkle 0.6s ease-out ${s.delay} forwards`, opacity: 0 }}>✦</text>
        ))}
      </svg>
    </div>
  )
}

// ── 히어로 플로팅 카드 ────────────────────────────────────────
const FLOAT_CARDS = [
  { bg: '#03C75A', letter: 'N', label: '네이버', stars: 5, text: '정말 맛있었어요!', delay: '0s',   dur: '4.5s', anim: 'float0' },
  { bg: '#4285F4', letter: 'G', label: '구글',   stars: 4, text: 'Great experience!', delay: '1.5s', dur: '5s',   anim: 'float1' },
  { bg: '#2AC1BC', letter: 'B', label: '배민',   stars: 5, text: '재주문 했어요 😋',  delay: '0.8s', dur: '4s',   anim: 'float2' },
]

// ── 상수 ───────────────────────────────────────────────────
const SAMPLE_STORE = {
  name: '타이백스트릿 해운대점',
  category: '태국 음식점',
  address: '부산광역시 해운대구 우동 1468-1',
  rating: 4.3,
  reviewCount: 1675,
}

const SAMPLE_REVIEWS = [
  {
    id: 'r1', platform: 'naver', author: '김민준', rating: 5,
    date: '04.10',
    text: '해운대에서 태국 음식 찾다가 우연히 들어갔는데 정말 맛있었어요. 팟타이가 특히 인상적이었고 직원분들도 친절했습니다.',
  },
  {
    id: 'r2', platform: 'google', author: 'Sarah K.', rating: 4,
    date: '04.08',
    text: 'Great Thai food in Haeundae. The green curry was amazing and the ocean view is beautiful. Will definitely come back.',
  },
  {
    id: 'r3', platform: 'coupang', author: '박지현', rating: 5,
    date: '04.06',
    text: '분위기도 너무 좋고 음식도 정말 맛있었어요. 망고스티키라이스가 최고. 해운대 뷰 보면서 먹으니까 더 맛있는 것 같아요.',
  },
]

const PLATFORMS = [
  { key: 'naver',   label: '네이버',  bg: '#03C75A', letter: 'N', text: '#FFF' },
  { key: 'google',  label: '구글',    bg: '#4285F4', letter: 'G', text: '#FFF' },
  { key: 'coupang', label: '쿠팡이츠', bg: '#FF3C3C', letter: 'C', text: '#FFF' },
  { key: 'baemin',  label: '배민',    bg: '#2AC1BC', letter: 'B', text: '#FFF' },
  { key: 'yogiyo',  label: '요기요',  bg: '#FA0050', letter: 'Y', text: '#FFF' },
]

const TONES = [
  { key: 'friendly', title: '따뜻한',  color: '#F59E0B' },
  { key: 'expert',   title: '전문적',  color: '#1B64DA' },
  { key: 'witty',    title: '유쾌한',  color: '#8B5CF6' },
  { key: 'simple',   title: '심플',    color: '#10B981' },
  { key: 'emo',      title: '감성적',  color: '#EC4899' },
  { key: 'mz',       title: 'MZ',      color: '#F43F5E' },
]

const GENDERS = [
  { key: 'none', label: '무관' },
  { key: 'male', label: '남자' },
  { key: 'female', label: '여자' },
]

const AGES = ['10대','20대','30대','40대','50대','60대+']

const QR_KEYWORDS = ['맛있어요 😋', '친절해요 😊', '뷰가 예뻐요 🌊', '가성비 최고 💰', '재방문 할게요 🔄', '주차 편해요 🚗']
const QR_AI_REVIEW = '해운대에서 정말 기분 좋은 식사를 했습니다. 음식이 맛있고 직원분들도 친절하셔서 기분이 좋았어요. 창가 자리에서 바다 뷰를 보며 먹으니 더욱 특별했습니다. 가격 대비 퀄리티가 훌륭해서 다음에도 꼭 다시 오고 싶습니다!'

const MORE_FEATURES = [
  { icon: <TrendingUp size={20} strokeWidth={2} />, color: '#3182F6', bg: '#EFF6FF', tag: '마케팅', title: '플레이스 키워드 순위', desc: '내 가게가 네이버에서 몇 위인지 실시간 확인.' },
  { icon: <PenLine size={20} strokeWidth={2} />,    color: '#8B5CF6', bg: '#F5F3FF', tag: '콘텐츠', title: 'AI 블로그 포스팅', desc: '매장 정보만 입력하면 SEO 최적화 블로그 초안 자동 생성.' },
  { icon: <Users size={20} strokeWidth={2} />,      color: '#059669', bg: '#ECFDF5', tag: '고객', title: 'CRM 고객 관리', desc: 'VIP·단골·신규 고객 자동 분류. 세그먼트별 메시지 발송.' },
  { icon: <BarChart3 size={20} strokeWidth={2} />,  color: '#E1306C', bg: '#FDF2F8', tag: 'SNS', title: '인스타 릴스·카드뉴스', desc: '숏폼 대본 AI 작성 + 카드뉴스 10장 자동 제작.' },
  { icon: <Zap size={20} strokeWidth={2} />,        color: '#F59E0B', bg: '#FFFBEB', tag: '정산', title: '매출·정산 자동화', desc: '배달앱·카드 매출 자동 집계. 월별 리포트.', badge: '준비중' },
  { icon: <Shield size={20} strokeWidth={2} />,     color: '#EA580C', bg: '#FFF7ED', tag: '지역', title: '로컬 시너지', desc: '인근 매장과 교차 쿠폰·이벤트로 고객 상호 유치.', badge: '준비중' },
]

// ── 공통 유틸 ─────────────────────────────────────────────
function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={13} strokeWidth={0}
          fill={i < n ? '#F59E0B' : '#E5E8EB'}
          className={i < n ? 'text-[#F59E0B]' : 'text-[#E5E8EB]'} />
      ))}
    </span>
  )
}

function PlatformBadge({ pKey }: { pKey: string }) {
  const p = PLATFORMS.find(x => x.key === pKey) || PLATFORMS[0]
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-black"
      style={{ background: p.bg + '22', color: p.bg }}>
      <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded text-[8px] font-black"
        style={{ background: p.bg, color: p.text }}>{p.letter}</span>
      {p.label}
    </span>
  )
}

// ── QR 데모 ───────────────────────────────────────────────
function QrDemo() {
  const [step, setStep] = useState(0)
  const [selected, setSelected] = useState<string[]>([])
  const [aiText, setAiText] = useState('')
  const [generating, setGenerating] = useState(false)
  const [posted, setPosted] = useState(false)

  function toggle(kw: string) {
    setSelected(p => p.includes(kw) ? p.filter(k => k !== kw) : [...p, kw])
  }

  async function handleGenerate() {
    setStep(2)
    setGenerating(true)
    await new Promise(r => setTimeout(r, 1400))
    setAiText(QR_AI_REVIEW)
    setGenerating(false)
  }

  async function handlePost() {
    setStep(3)
    await new Promise(r => setTimeout(r, 900))
    setPosted(true)
  }

  function reset() {
    setStep(0); setSelected([]); setAiText(''); setPosted(false)
  }

  // 스텝 바
  const steps = ['QR 스캔', '경험 선택', 'AI 생성', '등록 완료']

  return (
    <div className="space-y-5">
      {/* 진행 바 */}
      <div className="flex items-start">
        {steps.map((label, i) => (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all shrink-0 ${
                step >= i ? 'bg-[#059669] text-white' : 'bg-[#F2F4F6] text-[#B0B8C1]'
              }`}>{i + 1}</div>
              <span className={`text-[9px] mt-1 font-medium whitespace-nowrap ${step >= i ? 'text-[#059669]' : 'text-[#B0B8C1]'}`}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 flex-1 mb-3.5 mx-0.5 transition-all ${step > i ? 'bg-[#059669]' : 'bg-[#E5E8EB]'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 0 — QR 스캔 */}
      {step === 0 && (
        <div className="bg-white rounded-2xl border border-[#E5E8EB] p-6 flex flex-col items-center text-center">
          <div className="mb-4">
            <QrScanSvg />
          </div>
          <p className="text-base font-black text-[#191F28] mb-1 break-keep">테이블 위 QR 코드 한 번이면</p>
          <p className="text-sm text-[#8B95A1] mb-5 break-keep leading-relaxed">
            앱 설치 없이 고객 리뷰를 유도하고<br/>AI가 자동으로 완성해 플랫폼에 올립니다
          </p>
          <div className="flex items-center gap-3 text-[11px] text-[#4E5968] bg-[#F8F9FA] rounded-xl px-4 py-2.5 mb-5 flex-wrap justify-center">
            <span><span className="text-[#059669] font-bold mr-1">✓</span>앱 설치 불필요</span>
            <span className="text-[#E5E8EB]">|</span>
            <span><span className="text-[#059669] font-bold mr-1">✓</span>배치 비용 0원</span>
            <span className="text-[#E5E8EB]">|</span>
            <span><span className="text-[#059669] font-bold mr-1">✓</span>즉시 사용</span>
          </div>
          <button onClick={() => setStep(1)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#059669] text-white font-bold rounded-xl hover:bg-[#047857] transition-colors text-sm">
            고객 화면 직접 체험하기 <ArrowRight size={15} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* Step 1 — 키워드 선택 */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
          <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg,#059669,#10B981)' }}>
            <p className="text-white font-black text-sm">📍 타이백스트릿 해운대점</p>
            <p className="text-white/75 text-xs mt-0.5">오늘 방문 경험을 알려주세요</p>
          </div>
          <div className="p-5">
            <p className="text-sm font-bold text-[#191F28] mb-3 break-keep">어떤 점이 좋으셨나요? <span className="text-[#8B95A1] font-normal">(복수 선택 가능)</span></p>
            <div className="flex flex-wrap gap-2 mb-5">
              {QR_KEYWORDS.map(kw => (
                <button key={kw} onClick={() => toggle(kw)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                    selected.includes(kw)
                      ? 'bg-[#059669] border-[#059669] text-white'
                      : 'bg-white border-[#E5E8EB] text-[#4E5968] hover:border-[#059669]'
                  }`}>
                  {kw}
                </button>
              ))}
            </div>
            <button onClick={handleGenerate} disabled={selected.length === 0}
              className="w-full py-3 bg-[#059669] text-white font-bold rounded-xl hover:bg-[#047857] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm break-keep">
              {selected.length === 0 ? '키워드를 선택해 주세요' : `AI 리뷰 만들어줘 🤖 (${selected.length}개 선택)`}
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — AI 생성 */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-[#E5E8EB] p-5">
          {generating ? (
            <div className="flex flex-col items-center py-10 gap-3">
              <Loader2 size={34} strokeWidth={2} className="text-[#059669] animate-spin" />
              <p className="text-sm font-bold text-[#191F28] break-keep">AI가 리뷰를 작성하고 있어요...</p>
              <p className="text-xs text-[#8B95A1]">선택한 키워드로 자연스러운 리뷰 생성 중</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full bg-[#059669] flex items-center justify-center shrink-0">
                  <span className="text-white text-[9px] font-black">AI</span>
                </div>
                <p className="text-xs font-black text-[#059669]">AI 생성 완료 · 직접 수정도 가능해요</p>
              </div>
              <textarea defaultValue={aiText} rows={4}
                className="w-full border border-[#6EE7B7] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#059669] resize-none bg-[#F0FDF4] leading-relaxed mb-4" />
              <p className="text-xs text-[#8B95A1] mb-3 break-keep">어느 플랫폼에 올릴까요?</p>
              <div className="grid grid-cols-3 gap-2">
                {['naver','google','coupang'].map(pk => {
                  const p = PLATFORMS.find(x => x.key === pk)!
                  return (
                    <button key={pk} onClick={handlePost}
                      className="flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 border-[#E5E8EB] hover:border-[#059669] transition-colors bg-white">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black"
                        style={{ background: p.bg, color: p.text }}>{p.letter}</span>
                      <span className="text-[10px] font-bold text-[#4E5968]">{p.label}</span>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 3 — 게시 완료 */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-[#E5E8EB] p-6 flex flex-col items-center text-center">
          <div className="mb-3">
            <AnimatedCheck />
          </div>
          <p className="text-base font-black text-[#191F28] mb-1">리뷰 등록 완료!</p>
          <p className="text-xs text-[#8B95A1] mb-5 break-keep leading-relaxed">
            고객이 직접 쓴 것처럼 자연스러운 리뷰가<br/>네이버 플레이스에 게시됐습니다
          </p>
          <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-4 mb-5 text-left w-full">
            <p className="text-[10px] font-bold text-[#059669] mb-1.5">📝 게시된 리뷰</p>
            <p className="text-xs text-[#4E5968] leading-relaxed break-keep">{QR_AI_REVIEW.slice(0, 70)}...</p>
          </div>
          <div className="grid grid-cols-3 gap-2 w-full mb-5">
            {[['리뷰 1건','방금 등록'],['별점 5점','AI 최적화'],['소요시간','약 1분']].map(([v,l]) => (
              <div key={l} className="bg-[#F8F9FA] rounded-xl p-2.5 text-center">
                <p className="text-xs font-black text-[#191F28]">{v}</p>
                <p className="text-[9px] text-[#8B95A1] mt-0.5">{l}</p>
              </div>
            ))}
          </div>
          <button onClick={reset} className="text-xs text-[#059669] font-bold hover:underline">처음부터 다시 체험</button>
        </div>
      )}
    </div>
  )
}

// ── 리뷰 답글 데모 ────────────────────────────────────────
function ReviewDemo() {
  const [aiReplies, setAiReplies]   = useState<Record<string, string>>({})
  const [loading, setLoading]       = useState<Record<string, boolean>>({})
  const [selected, setSelected]     = useState<string | null>(null)
  const [storeName, setStoreName]   = useState(SAMPLE_STORE.name)
  const [region, setRegion]         = useState('해운대')
  const [bizType, setBizType]       = useState('태국 음식점')
  const [tone, setTone]             = useState('friendly')
  const [gender, setGender]         = useState('none')
  const [age, setAge]               = useState('30대')
  const [postStatus, setPostStatus] = useState<Record<string, 'idle'|'posting'|'done'>>({})

  async function generate(id: string, text: string) {
    setLoading(p => ({ ...p, [id]: true }))
    setSelected(id)
    try {
      const res  = await fetch('/api/ai-review-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review: text, platform: '네이버', storeName, region, bizType,
          customerProfile: { gender, age },
          aiSettings: { tone, length: 'medium', includes: { thanks: true, revisit: true, mention: true, personalize: true, keyword: true }, closing: '', excludes: '' },
        }),
      })
      const data = await res.json()
      setAiReplies(p => ({ ...p, [id]: data.reply || '답글 생성 실패' }))
    } catch {
      setAiReplies(p => ({ ...p, [id]: '네트워크 오류' }))
    }
    setLoading(p => ({ ...p, [id]: false }))
  }

  async function post(id: string) {
    setPostStatus(p => ({ ...p, [id]: 'posting' }))
    await new Promise(r => setTimeout(r, 1200))
    setPostStatus(p => ({ ...p, [id]: 'done' }))
  }

  return (
    <div className="space-y-4">
      {/* 설정 */}
      <div className="bg-[#F8F9FA] rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[['매장명', storeName, setStoreName], ['지역', region, setRegion], ['업종', bizType, setBizType]].map(([label, val, fn]) => (
            <div key={label as string}>
              <label className="text-[10px] font-bold text-[#8B95A1] block mb-1">{label as string}</label>
              <input value={val as string} onChange={e => (fn as (v: string) => void)(e.target.value)}
                className="w-full border border-[#E5E8EB] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3182F6] bg-white" />
            </div>
          ))}
        </div>
        {/* 톤 */}
        <div>
          <p className="text-[10px] font-bold text-[#8B95A1] mb-1.5">답글 톤</p>
          <div className="flex gap-1.5 flex-wrap">
            {TONES.map(t => (
              <button key={t.key} onClick={() => setTone(t.key)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                  tone === t.key ? 'text-white border-transparent' : 'border-[#E5E8EB] bg-white text-[#4E5968] hover:border-[#3182F6]'
                }`}
                style={tone === t.key ? { background: t.color, borderColor: t.color } : {}}>
                {t.title}
              </button>
            ))}
          </div>
        </div>
        {/* 고객 프로필 */}
        <div className="flex gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-bold text-[#8B95A1] mb-1.5">성별</p>
            <div className="flex gap-1.5">
              {GENDERS.map(g => (
                <button key={g.key} onClick={() => setGender(g.key)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                    gender === g.key ? 'bg-[#3182F6] border-[#3182F6] text-white' : 'border-[#E5E8EB] bg-white text-[#4E5968]'
                  }`}>{g.label}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#8B95A1] mb-1.5">연령대</p>
            <div className="flex gap-1.5 flex-wrap">
              {AGES.map(a => (
                <button key={a} onClick={() => setAge(a)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                    age === a ? 'bg-[#3182F6] border-[#3182F6] text-white' : 'border-[#E5E8EB] bg-white text-[#4E5968]'
                  }`}>{a}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 리뷰 카드 */}
      {SAMPLE_REVIEWS.map(r => (
        <div key={r.id} className={`rounded-2xl border-2 overflow-hidden transition-all bg-white ${
          selected === r.id ? 'border-[#3182F6]' : 'border-[#E5E8EB]'
        }`}>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#3182F6] to-[#8B5CF6] flex items-center justify-center text-white text-[10px] font-black shrink-0">
                {r.author[0]}
              </div>
              <span className="font-bold text-sm text-[#191F28]">{r.author}</span>
              <PlatformBadge pKey={r.platform} />
              <Stars n={r.rating} />
              <span className="text-[10px] text-[#B0B8C1] ml-auto shrink-0">{r.date}</span>
            </div>
            <p className="text-sm text-[#4E5968] bg-[#F8F9FA] rounded-xl p-3 mb-3 leading-relaxed break-keep">{r.text}</p>
            {!aiReplies[r.id] && (
              <button onClick={() => generate(r.id, r.text)} disabled={loading[r.id]}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#3182F6] text-white text-sm font-bold rounded-xl hover:bg-[#1B64DA] disabled:opacity-50 transition-colors">
                {loading[r.id]
                  ? <><Loader2 size={13} strokeWidth={2.5} className="animate-spin" /> 생성 중...</>
                  : <>AI 답글 생성 <ArrowRight size={13} strokeWidth={2.5} /></>}
              </button>
            )}
          </div>
          {aiReplies[r.id] && (
            <div className="border-t border-[#E5E8EB] bg-[#F0F9FF] p-4">
              <p className="text-[10px] font-black text-[#3182F6] mb-2">✦ AI 생성 답글 — 수정 후 원클릭 게시</p>
              <textarea defaultValue={aiReplies[r.id]} rows={4}
                className="w-full border border-[#93C5FD] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#3182F6] resize-none bg-white leading-relaxed" />
              <div className="flex gap-2 mt-3">
                <button onClick={() => generate(r.id, r.text)} disabled={loading[r.id] || postStatus[r.id] === 'posting'}
                  className="flex-1 inline-flex items-center justify-center gap-1 text-sm px-3 py-2.5 border-2 border-[#3182F6] text-[#3182F6] rounded-xl hover:bg-[#EFF6FF] font-bold transition-colors disabled:opacity-50">
                  <RefreshCw size={13} strokeWidth={2.5} /> 재생성
                </button>
                <button onClick={() => post(r.id)} disabled={postStatus[r.id] === 'posting' || postStatus[r.id] === 'done'}
                  className="flex-[2] inline-flex items-center justify-center gap-1 text-sm px-3 py-2.5 bg-[#3182F6] text-white rounded-xl hover:bg-[#1B64DA] font-bold disabled:opacity-70 transition-colors">
                  {postStatus[r.id] === 'posting' ? (
                    <><Loader2 size={13} className="animate-spin" /> 게시 중...</>
                  ) : postStatus[r.id] === 'done' ? (
                    <><CheckCircle2 size={13} /> 게시 완료</>
                  ) : (
                    <><Send size={13} /> 원클릭 게시</>
                  )}
                </button>
              </div>
              {postStatus[r.id] === 'done' && (
                <p className="text-[11px] text-[#12B76A] font-bold mt-2 flex items-center gap-1">
                  <CheckCircle2 size={11} strokeWidth={2.5} />
                  {PLATFORMS.find(p => p.key === r.platform)?.label}에 답글이 등록됐습니다
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────
export default function ServiceIntro() {
  const [tab, setTab] = useState<'reply' | 'qr'>('qr')

  return (
    <div className="min-h-screen bg-[#F2F4F6]">
      <style>{GLOBAL_STYLES}</style>

      {/* ── 히어로 ─────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg,#1B3FD8 0%,#3182F6 100%)' }} className="text-white relative overflow-hidden">
        {/* 플로팅 리뷰 카드 (데스크탑 우측) */}
        <div className="hidden lg:block absolute right-8 top-0 bottom-0 w-64 pointer-events-none">
          {FLOAT_CARDS.map((c, i) => (
            <div key={i}
              className="absolute bg-white/15 backdrop-blur-sm border border-white/25 rounded-2xl p-3 w-52"
              style={{
                top: `${18 + i * 30}%`,
                right: `${i * 12}px`,
                animation: `${c.anim} ${c.dur} ease-in-out ${c.delay} infinite`,
              }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-[11px] font-black shrink-0"
                  style={{ background: c.bg, color: '#fff' }}>{c.letter}</span>
                <span className="text-white/90 text-[11px] font-bold">{c.label}</span>
                <span className="ml-auto text-yellow-300 text-[10px]">{'★'.repeat(c.stars)}</span>
              </div>
              <p className="text-white/80 text-[11px] leading-snug break-keep">{c.text}</p>
            </div>
          ))}
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-12 sm:pt-14 sm:pb-16 relative">
          <Link href="/" className="inline-flex items-center gap-1.5 text-white/65 text-xs sm:text-sm hover:text-white transition-colors mb-5 sm:mb-7">
            <ArrowLeft size={14} strokeWidth={2.25} /> 대시보드로
          </Link>

          <div className="inline-block bg-white/15 border border-white/25 text-white/90 text-[11px] sm:text-xs font-bold px-3 sm:px-4 py-1.5 rounded-full mb-3 sm:mb-4 tracking-wide">
            ⚡ 리뷰 관리 완전 자동화 — 답글 + 리뷰 수집
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black mb-3 sm:mb-4 leading-tight break-keep lg:max-w-xl">
            리뷰는 AI가 모으고,<br/>
            <span className="text-[#FFE2A0]">답글도 AI가 달아드려요.</span>
          </h1>

          <p className="text-white/80 text-sm sm:text-base leading-relaxed max-w-xl break-keep mb-6 sm:mb-8">
            QR 코드 하나로 고객 리뷰를 유도하고 — 쌓인 리뷰엔 AI가 매장 톤에 맞춘 답글을 3초 만에 만들어 원클릭으로 게시합니다.
          </p>

          <div className="grid grid-cols-2 sm:flex sm:gap-10 gap-x-6 gap-y-4">
            {[
              ['QR', '리뷰 수집 자동화'],
              ['6개', '연동 플랫폼'],
              ['6종', 'AI 답글 톤'],
              ['1분', '가입 → 첫 답글'],
            ].map(([v, l]) => (
              <div key={l}>
                <div className="text-xl sm:text-3xl font-black">{v}</div>
                <div className="text-white/65 text-[11px] sm:text-sm mt-0.5 break-keep">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 본문 ───────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {/* 탭 */}
        <div className="flex gap-2 sm:gap-3 mb-6 sm:mb-8">
          <button onClick={() => setTab('reply')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-8 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl border-2 font-bold text-xs sm:text-sm transition-all ${
              tab === 'reply'
                ? 'border-[#3182F6] bg-[#3182F6] text-white shadow-[0_4px_16px_rgba(49,130,246,0.3)]'
                : 'border-[#E5E8EB] bg-white text-[#4E5968] hover:border-[#3182F6]'
            }`}>
            <MessageSquare size={14} strokeWidth={2.25} />
            AI 리뷰 답글
          </button>
          <button onClick={() => setTab('qr')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-8 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl border-2 font-bold text-xs sm:text-sm transition-all ${
              tab === 'qr'
                ? 'border-[#059669] bg-[#059669] text-white shadow-[0_4px_16px_rgba(5,150,105,0.3)]'
                : 'border-[#E5E8EB] bg-white text-[#4E5968] hover:border-[#059669]'
            }`}>
            <ScanLine size={14} strokeWidth={2.25} />
            QR 리뷰 수집
          </button>
        </div>

        {/* 탭 헤더 설명 */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-[#E5E8EB] mb-5">
          {tab === 'reply' ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center shrink-0">
                <MessageSquare size={18} strokeWidth={2} className="text-[#3182F6]" />
              </div>
              <div>
                <p className="text-sm sm:text-base font-black text-[#191F28] break-keep">AI 리뷰 답글 자동 생성</p>
                <p className="text-xs text-[#8B95A1] break-keep mt-0.5">아래 리뷰 중 하나를 골라 [AI 답글 생성]을 눌러보세요. 3초 안에 답글이 완성됩니다.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#ECFDF5] flex items-center justify-center shrink-0">
                <ScanLine size={18} strokeWidth={2} className="text-[#059669]" />
              </div>
              <div>
                <p className="text-sm sm:text-base font-black text-[#191F28] break-keep">QR 리뷰 수집 자동화</p>
                <p className="text-xs text-[#8B95A1] break-keep mt-0.5">고객 입장에서 QR 체험 흐름을 직접 눌러보세요. 키워드 선택 → AI 리뷰 생성 → 플랫폼 등록까지 1분.</p>
              </div>
            </div>
          )}
        </div>

        {/* 데모 */}
        <div className="mb-10 sm:mb-14">
          {tab === 'reply' ? <ReviewDemo /> : <QrDemo />}
        </div>

        {/* ── 더 많은 기능 ────────────────────────────── */}
        <div className="mb-10 sm:mb-14">
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-block bg-[#EFF6FF] text-[#3182F6] text-[10px] sm:text-xs font-black px-3 sm:px-4 py-1.5 rounded-full mb-2 sm:mb-3 tracking-wide">
              이 외에도
            </div>
            <h2 className="text-lg sm:text-2xl md:text-3xl font-black text-[#191F28] mb-2 sm:mb-3 break-keep">
              사장님이 필요한 것,<br className="sm:hidden" /> 로컬루션에 다 있어요
            </h2>
            <p className="text-xs sm:text-sm text-[#8B95A1] max-w-sm sm:max-w-lg mx-auto break-keep leading-relaxed">
              리뷰·마케팅부터 고객 관리, 정산까지<br className="sm:hidden" /> 하나의 플랫폼에서 모두 해결하세요.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
            {MORE_FEATURES.map(f => (
              <div key={f.title} className="bg-white rounded-2xl p-4 sm:p-5 border border-[#F2F4F6] hover:border-[#E5E8EB] hover:shadow-sm transition-all">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: f.bg, color: f.color }}>
                    {f.icon}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
                      style={{ background: f.bg, color: f.color }}>{f.tag}</span>
                    {f.badge && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-[#F2F4F6] text-[#8B95A1]">{f.badge}</span>
                    )}
                  </div>
                </div>
                <p className="text-sm font-black text-[#191F28] mb-1 break-keep">{f.title}</p>
                <p className="text-xs text-[#8B95A1] leading-relaxed break-keep">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* 후킹 CTA */}
          <div className="rounded-2xl p-5 sm:p-8 text-white text-center"
            style={{ background: 'linear-gradient(135deg,#1B3FD8 0%,#3182F6 100%)' }}>
            <div className="inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1.5 text-[10px] sm:text-xs font-bold mb-3 sm:mb-4">
              <Shield size={11} strokeWidth={2.5} /> 7일 무료 체험 · 카드 등록 불필요
            </div>
            <h3 className="text-base sm:text-xl md:text-2xl font-black mb-2 break-keep">
              지금 시작하면<br className="sm:hidden" /> 오늘부터 리뷰가 쌓입니다
            </h3>
            <p className="text-white/75 text-xs sm:text-sm mb-5 sm:mb-6 break-keep max-w-xs sm:max-w-md mx-auto leading-relaxed">
              QR 코드 배치부터 AI 답글 설정까지<br className="sm:hidden" /> 가입 후 10분이면 완료됩니다.
            </p>
            <div className="flex gap-2 sm:gap-3 justify-center flex-col sm:flex-row">
              <Link href="/login"
                className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-white text-[#1B3FD8] font-black rounded-xl hover:bg-[#F0F4FF] transition-colors text-sm">
                무료로 시작하기 <ArrowRight size={15} strokeWidth={2.5} />
              </Link>
              <Link href="/pricing"
                className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-white/15 text-white border border-white/30 font-bold rounded-xl hover:bg-white/25 transition-colors text-sm">
                요금제 보기
              </Link>
            </div>
          </div>
        </div>

        {/* 안내 박스 */}
        <div className="bg-white rounded-2xl p-5 sm:p-8 shadow-sm border border-[#E5E8EB] mb-8">
          <h2 className="text-base sm:text-lg font-black text-[#191F28] mb-4">서비스 이용 안내</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { title: '원클릭 자동 게시', desc: '매장 플랫폼 연동만 완료하면 버튼 한 번으로 답글이 자동 게시됩니다.', color: '#F0FDF4', border: '#BBF7D0', tc: '#166534' },
              { title: 'AI 처리 범위', desc: '공개된 리뷰 텍스트와 사업자가 입력한 매장 정보만 AI 처리에 사용됩니다.', color: '#EFF6FF', border: '#93C5FD', tc: '#1B64DA' },
              { title: '데이터 보관', desc: '매장 연동 정보는 사용자 브라우저에만 저장됩니다. 서버에 개인 식별 데이터를 저장하지 않습니다.', color: '#FFF7ED', border: '#FED7AA', tc: '#9A3412' },
              { title: '서비스 대상', desc: '카페, 음식점, 미용실 같은 소상공인과 여러 매장을 관리하는 마케팅 대행사를 위한 서비스입니다.', color: '#F5F3FF', border: '#C4B5FD', tc: '#5B21B6' },
            ].map(item => (
              <div key={item.title} className="rounded-xl p-4" style={{ background: item.color, border: `1px solid ${item.border}` }}>
                <p className="font-black text-xs sm:text-sm mb-1" style={{ color: item.tc }}>{item.title}</p>
                <p className="text-xs sm:text-sm text-[#4E5968] leading-relaxed break-keep">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-[#E5E8EB] text-[#4E5968] text-sm font-bold rounded-xl hover:bg-[#F8F9FA] transition-colors">
            <ArrowLeft size={14} strokeWidth={2.5} /> 대시보드로 돌아가기
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  )
}
