'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import Footer from '../components/Footer'
import {
  ArrowLeft, ArrowRight, Star, RefreshCw, CheckCircle2,
  Loader2, Send, QrCode, Smartphone, MessageSquare,
  TrendingUp, Users, BarChart3, PenLine, Zap, Shield,
} from 'lucide-react'

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
    date: '2026-04-10',
    text: '해운대에서 태국 음식 찾다가 우연히 들어갔는데 정말 맛있었어요. 팟타이가 특히 인상적이었고 직원분들도 친절했습니다. 뷰도 너무 예쁘고 재방문 의사 200%입니다.',
  },
  {
    id: 'r2', platform: 'google', author: 'Sarah K.', rating: 4,
    date: '2026-04-08',
    text: 'Great Thai food in Haeundae. The green curry was amazing and the ocean view is beautiful. Staff were very friendly. Will definitely come back.',
  },
  {
    id: 'r3', platform: 'coupang', author: '박지현', rating: 5,
    date: '2026-04-06',
    text: '분위기도 너무 좋고 음식도 정말 맛있었어요. 망고스티키라이스가 최고. 해운대 뷰 보면서 먹으니까 더 맛있는 것 같아요.',
  },
]

const PLATFORMS = [
  { key: 'naver',   label: '네이버 플레이스', bg: '#03C75A', letter: 'N', text: '#FFFFFF' },
  { key: 'google',  label: '구글 맵',         bg: '#4285F4', letter: 'G', text: '#FFFFFF' },
  { key: 'coupang', label: '쿠팡이츠',        bg: '#FF3C3C', letter: 'C', text: '#FFFFFF' },
  { key: 'baemin',  label: '배달의민족',      bg: '#2AC1BC', letter: 'B', text: '#FFFFFF' },
  { key: 'yogiyo',  label: '요기요',          bg: '#FA0050', letter: 'Y', text: '#FFFFFF' },
]

const TONES = [
  { key: 'friendly', title: '따뜻한 사장님',  desc: '사장님이 직접 쓴 듯한 친근 구어체',           color: '#F59E0B' },
  { key: 'expert',   title: '전문업체',        desc: '정중하고 담백한 서면 톤. 이모티콘 없음',      color: '#1B64DA' },
  { key: 'witty',    title: '유쾌한',          desc: '위트 있고 밝은 톤. 살짝 장난스럽게',           color: '#8B5CF6' },
  { key: 'simple',   title: '심플',            desc: '짧고 깔끔한 담백 톤. 군더더기 없음',           color: '#10B981' },
  { key: 'emo',      title: '감성적',          desc: '잔잔하고 진심 담긴 편지 같은 톤',              color: '#EC4899' },
  { key: 'mz',       title: 'MZ 트렌디',       desc: '요즘 말투. 너무 과하지 않게 트렌디',           color: '#F43F5E' },
]

const GENDERS = [
  { key: 'none',   label: '선택 안 함' },
  { key: 'male',   label: '남자' },
  { key: 'female', label: '여자' },
]

const AGES = [
  { key: 'teen', label: '10대' },
  { key: '20s',  label: '20대' },
  { key: '30s',  label: '30대' },
  { key: '40s',  label: '40대' },
  { key: '50s',  label: '50대' },
  { key: '60s',  label: '60대+' },
]

// QR 시뮬레이션 단계
const QR_STEPS = [
  {
    step: 1, icon: '📱', label: 'QR 스캔',
    desc: '고객이 테이블 위 QR 코드를 스마트폰으로 찍습니다.',
    detail: '별도 앱 설치 없이 카메라만으로 진행됩니다.',
  },
  {
    step: 2, icon: '✍️', label: '경험 입력',
    desc: '방문 경험을 2~3개 키워드로 선택합니다.',
    detail: '"맛있어요", "친절해요", "뷰가 예뻐요" 등 버튼 터치만으로 끝.',
  },
  {
    step: 3, icon: '🤖', label: 'AI 리뷰 생성',
    desc: 'AI가 선택한 키워드로 자연스러운 리뷰 문장을 만들어 드립니다.',
    detail: '고객은 수정만 하면 됩니다. 직접 쓸 필요 없어요.',
  },
  {
    step: 4, icon: '🚀', label: '원클릭 등록',
    desc: '네이버·구글·카카오 중 원하는 플랫폼에 바로 게시합니다.',
    detail: '로그인 연동만 되면 버튼 하나로 리뷰가 올라갑니다.',
  },
]

const QR_SAMPLE_KEYWORDS = ['맛있어요', '친절해요', '뷰가 예뻐요', '가성비 최고', '재방문 의사 있어요', '주차 편해요']
const QR_GENERATED_REVIEW = '해운대에서 정말 기분 좋은 식사를 했습니다. 음식이 맛있고 직원분들도 친절하셔서 기분이 좋았어요. 창가 자리에서 바다 뷰를 보며 먹으니 더욱 특별했습니다. 가격 대비 퀄리티가 훌륭해서 다음에도 꼭 다시 오고 싶습니다. 주차도 편리해서 만족스러운 방문이었어요!'

// 더 많은 기능 목록
const MORE_FEATURES = [
  {
    icon: <TrendingUp size={22} strokeWidth={2} />,
    color: '#3182F6', bg: '#EFF6FF',
    title: '플레이스 키워드 순위 추적',
    desc: '내 가게가 네이버에서 몇 위인지 실시간 확인. 경쟁 키워드 분석까지.',
    tag: '마케팅',
  },
  {
    icon: <PenLine size={22} strokeWidth={2} />,
    color: '#8B5CF6', bg: '#F5F3FF',
    title: 'AI 블로그 포스팅',
    desc: '매장 정보만 입력하면 SEO 최적화 블로그 초안 자동 생성.',
    tag: '콘텐츠',
  },
  {
    icon: <Users size={22} strokeWidth={2} />,
    color: '#059669', bg: '#ECFDF5',
    title: 'CRM 고객 관리',
    desc: 'VIP·단골·신규 고객 자동 분류. 세그먼트별 메시지 발송.',
    tag: '고객',
  },
  {
    icon: <Smartphone size={22} strokeWidth={2} />,
    color: '#E1306C', bg: '#FDF2F8',
    title: '인스타 릴스·카드뉴스',
    desc: '숏폼 대본 AI 작성 + 인스타 카드뉴스 10장 자동 제작.',
    tag: 'SNS',
  },
  {
    icon: <BarChart3 size={22} strokeWidth={2} />,
    color: '#F59E0B', bg: '#FFFBEB',
    title: '매출·정산 자동화',
    desc: '배달앱·카드 매출 자동 집계. 월별 리포트·급여 계산.',
    tag: '정산',
    badge: '준비중',
  },
  {
    icon: <Zap size={22} strokeWidth={2} />,
    color: '#EA580C', bg: '#FFF7ED',
    title: '로컬 시너지',
    desc: '인근 매장과 교차 쿠폰·이벤트로 고객 상호 유치.',
    tag: '지역',
    badge: '준비중',
  },
]

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={15} strokeWidth={0}
          fill={i < n ? '#F59E0B' : '#E5E8EB'}
          className={i < n ? 'text-[#F59E0B]' : 'text-[#E5E8EB]'} />
      ))}
    </span>
  )
}

function PlatformMark({ keyName, size = 28 }: { keyName: string; size?: number }) {
  const p = PLATFORMS.find(x => x.key === keyName) || PLATFORMS[0]
  return (
    <span className="inline-flex items-center justify-center rounded-md font-black flex-shrink-0"
      style={{ width: size, height: size, background: p.bg, color: p.text, fontSize: size * 0.55 }}>
      {p.letter}
    </span>
  )
}

function PlatformBadge({ p }: { p: string }) {
  const plat = PLATFORMS.find(x => x.key === p) || PLATFORMS[0]
  return (
    <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-[#F2F4F6] text-[#191F28] font-bold">
      <PlatformMark keyName={p} size={16} />
      {plat.label}
    </span>
  )
}

// ── QR 데모 컴포넌트 ─────────────────────────────────────
function QrDemo() {
  const [qrStep, setQrStep] = useState(0)
  const [selectedKws, setSelectedKws] = useState<string[]>([])
  const [generatedReview, setGeneratedReview] = useState('')
  const [generating, setGenerating] = useState(false)
  const [posted, setPosted] = useState(false)

  function toggleKw(kw: string) {
    setSelectedKws(prev => prev.includes(kw) ? prev.filter(k => k !== kw) : [...prev, kw])
  }

  async function handleGenerate() {
    setQrStep(3)
    setGenerating(true)
    await new Promise(r => setTimeout(r, 1400))
    setGeneratedReview(QR_GENERATED_REVIEW)
    setGenerating(false)
  }

  async function handlePost() {
    setQrStep(4)
    await new Promise(r => setTimeout(r, 1000))
    setPosted(true)
  }

  const stepLabels = ['QR 스캔', '경험 선택', 'AI 생성', '등록 완료']

  return (
    <div className="space-y-6">
      {/* 진행 스텝 바 */}
      <div className="flex items-center gap-0">
        {stepLabels.map((label, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-all ${
                qrStep >= i ? 'bg-[#3182F6] text-white' : 'bg-[#F2F4F6] text-[#B0B8C1]'
              }`}>{i + 1}</div>
              <span className={`text-[10px] mt-1 font-medium break-keep ${qrStep >= i ? 'text-[#3182F6]' : 'text-[#B0B8C1]'}`}>{label}</span>
            </div>
            {i < stepLabels.length - 1 && (
              <div className={`h-0.5 w-full mb-4 transition-all ${qrStep > i ? 'bg-[#3182F6]' : 'bg-[#E5E8EB]'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 0: QR 스캔 */}
      {qrStep === 0 && (
        <div className="bg-white rounded-2xl border border-[#E5E8EB] p-8 flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-[#F2F4F6] rounded-2xl flex items-center justify-center mb-4">
            <QrCode size={56} strokeWidth={1.5} className="text-[#191F28]" />
          </div>
          <h3 className="text-xl font-black text-[#191F28] mb-2">테이블 위 QR 코드</h3>
          <p className="text-sm text-[#8B95A1] mb-1">고객이 스마트폰 카메라로 QR을 찍으면</p>
          <p className="text-sm text-[#8B95A1] mb-6">앱 설치 없이 바로 리뷰 작성 화면이 열립니다</p>
          <div className="flex items-center gap-2 text-xs text-[#4E5968] bg-[#F8F9FA] rounded-xl px-4 py-2 mb-6">
            <span className="text-[#03C75A] font-bold">✓</span> 배치 비용 0원
            <span className="mx-2 text-[#E5E8EB]">|</span>
            <span className="text-[#03C75A] font-bold">✓</span> 전용 앱 없음
            <span className="mx-2 text-[#E5E8EB]">|</span>
            <span className="text-[#03C75A] font-bold">✓</span> 즉시 사용
          </div>
          <button onClick={() => setQrStep(1)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#3182F6] text-white font-bold rounded-xl hover:bg-[#1B64DA] transition-colors text-sm">
            고객 화면 체험하기 <ArrowRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* Step 1: 키워드 선택 */}
      {qrStep === 1 && (
        <div className="bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
          <div className="bg-[#03C75A] px-5 py-4">
            <p className="text-white font-black text-sm">📍 타이백스트릿 해운대점</p>
            <p className="text-white/75 text-xs mt-0.5">오늘 방문 경험을 알려주세요</p>
          </div>
          <div className="p-5">
            <p className="text-sm font-bold text-[#191F28] mb-3">어떤 점이 좋으셨나요? (복수 선택)</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {QR_SAMPLE_KEYWORDS.map(kw => (
                <button key={kw} onClick={() => toggleKw(kw)}
                  className={`px-3 py-1.5 rounded-full text-sm font-bold border-2 transition-all ${
                    selectedKws.includes(kw)
                      ? 'bg-[#03C75A] border-[#03C75A] text-white'
                      : 'bg-white border-[#E5E8EB] text-[#4E5968] hover:border-[#03C75A]'
                  }`}>
                  {kw}
                </button>
              ))}
            </div>
            <button
              onClick={handleGenerate}
              disabled={selectedKws.length === 0}
              className="w-full py-3 bg-[#3182F6] text-white font-bold rounded-xl hover:bg-[#1B64DA] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm">
              AI 리뷰 만들어줘 🤖
            </button>
            {selectedKws.length === 0 && (
              <p className="text-center text-xs text-[#B0B8C1] mt-2">키워드를 1개 이상 선택해 주세요</p>
            )}
          </div>
        </div>
      )}

      {/* Step 2: AI 생성 중 / 결과 */}
      {qrStep === 3 && (
        <div className="bg-white rounded-2xl border border-[#E5E8EB] p-5">
          {generating ? (
            <div className="flex flex-col items-center py-10">
              <Loader2 size={36} strokeWidth={2} className="text-[#3182F6] animate-spin mb-4" />
              <p className="text-sm font-bold text-[#191F28] mb-1">AI가 리뷰를 작성하고 있어요...</p>
              <p className="text-xs text-[#8B95A1]">선택하신 키워드로 자연스러운 문장을 만드는 중</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-[#3182F6] flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-[10px] font-black">AI</span>
                </div>
                <p className="text-sm font-bold text-[#3182F6]">AI 생성 리뷰 — 수정 후 바로 게시 가능</p>
              </div>
              <textarea
                defaultValue={generatedReview}
                rows={5}
                className="w-full border border-[#93C5FD] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#3182F6] resize-none bg-[#F0F9FF] leading-relaxed mb-4"
              />
              <p className="text-xs text-[#8B95A1] mb-4">어떤 플랫폼에 올릴까요?</p>
              <div className="flex gap-2 flex-wrap mb-4">
                {['naver', 'google', 'coupang'].map(p => (
                  <button key={p} onClick={handlePost}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-[#E5E8EB] hover:border-[#3182F6] transition-colors bg-white">
                    <PlatformMark keyName={p} size={20} />
                    <span className="text-xs font-bold text-[#4E5968]">{PLATFORMS.find(x => x.key === p)?.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 3: 게시 완료 */}
      {qrStep === 4 && (
        <div className="bg-white rounded-2xl border border-[#E5E8EB] p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-[#ECFDF5] flex items-center justify-center mb-4">
            <CheckCircle2 size={36} strokeWidth={2} className="text-[#059669]" />
          </div>
          <h3 className="text-xl font-black text-[#191F28] mb-2">리뷰 등록 완료!</h3>
          <p className="text-sm text-[#4E5968] mb-1">고객이 직접 작성한 것처럼 자연스러운 리뷰가</p>
          <p className="text-sm text-[#4E5968] mb-6">네이버 플레이스에 자동 게시되었습니다</p>
          <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-4 mb-6 text-left w-full">
            <p className="text-xs font-bold text-[#059669] mb-1.5">📝 게시된 리뷰</p>
            <p className="text-xs text-[#4E5968] leading-relaxed">{QR_GENERATED_REVIEW.slice(0, 80)}...</p>
          </div>
          <div className="grid grid-cols-3 gap-3 w-full mb-6">
            {[['리뷰 1건', '방금 등록'], ['별점 5점', 'AI 최적화'], ['소요 시간', '약 1분']].map(([v, l]) => (
              <div key={l} className="bg-[#F8F9FA] rounded-xl p-3 text-center">
                <p className="text-sm font-black text-[#191F28]">{v}</p>
                <p className="text-[10px] text-[#8B95A1] mt-0.5">{l}</p>
              </div>
            ))}
          </div>
          <button onClick={() => { setQrStep(0); setSelectedKws([]); setGeneratedReview(''); setPosted(false) }}
            className="text-sm text-[#3182F6] font-bold hover:underline">
            처음부터 다시 체험하기
          </button>
        </div>
      )}
    </div>
  )
}

// ── 리뷰 답글 데모 컴포넌트 ────────────────────────────────
function ReviewDemo() {
  const [selectedReview, setSelectedReview] = useState<string | null>(null)
  const [aiReplies, setAiReplies] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [storeName, setStoreName] = useState(SAMPLE_STORE.name)
  const [region, setRegion] = useState('해운대')
  const [bizType, setBizType] = useState('태국 음식점')
  const [tone, setTone] = useState<string>('friendly')
  const [gender, setGender] = useState<string>('none')
  const [age, setAge] = useState<string>('30s')
  const [postStatus, setPostStatus] = useState<Record<string, 'idle' | 'posting' | 'done'>>({})

  async function generateReply(reviewId: string, reviewText: string) {
    setLoading(prev => ({ ...prev, [reviewId]: true }))
    setSelectedReview(reviewId)
    try {
      const res = await fetch('/api/ai-review-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review: reviewText, platform: '네이버', storeName, region, bizType,
          customerProfile: { gender, age },
          aiSettings: {
            tone, length: 'medium',
            includes: { thanks: true, revisit: true, mention: true, personalize: true, improve: true, keyword: true },
            closing: '', excludes: '',
          },
        }),
      })
      const data = await res.json()
      setAiReplies(prev => ({ ...prev, [reviewId]: data.reply || '답글 생성 실패' }))
    } catch {
      setAiReplies(prev => ({ ...prev, [reviewId]: '네트워크 오류' }))
    }
    setLoading(prev => ({ ...prev, [reviewId]: false }))
  }

  async function autoPost(reviewId: string) {
    setPostStatus(prev => ({ ...prev, [reviewId]: 'posting' }))
    await new Promise(r => setTimeout(r, 1200))
    setPostStatus(prev => ({ ...prev, [reviewId]: 'done' }))
  }

  return (
    <div className="space-y-5">
      {/* 설정 바 */}
      <div className="bg-[#F8F9FA] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: '매장명', value: storeName, onChange: setStoreName },
          { label: '지역', value: region, onChange: setRegion },
          { label: '업종', value: bizType, onChange: setBizType },
        ].map(f => (
          <div key={f.label}>
            <label className="text-xs font-bold text-[#8B95A1] block mb-1">{f.label}</label>
            <input value={f.value} onChange={e => f.onChange(e.target.value)}
              className="w-full border border-[#E5E8EB] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3182F6] bg-white" />
          </div>
        ))}
      </div>

      {/* 톤 선택 */}
      <div>
        <p className="text-xs font-bold text-[#8B95A1] mb-2">답글 톤</p>
        <div className="flex gap-2 flex-wrap">
          {TONES.map(t => (
            <button key={t.key} onClick={() => setTone(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                tone === t.key ? 'border-[#3182F6] bg-[#EFF6FF] text-[#3182F6]' : 'border-[#E5E8EB] bg-white text-[#4E5968] hover:border-[#3182F6]'
              }`}>
              {t.title}
            </button>
          ))}
        </div>
      </div>

      {/* 고객 프로필 */}
      <div className="flex gap-4 flex-wrap">
        <div>
          <p className="text-xs font-bold text-[#8B95A1] mb-2">성별</p>
          <div className="flex gap-2">
            {GENDERS.map(g => (
              <button key={g.key} onClick={() => setGender(g.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                  gender === g.key ? 'border-[#3182F6] bg-[#3182F6] text-white' : 'border-[#E5E8EB] bg-white text-[#4E5968]'
                }`}>{g.label}</button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-[#8B95A1] mb-2">연령대</p>
          <div className="flex gap-2 flex-wrap">
            {AGES.map(a => (
              <button key={a.key} onClick={() => setAge(a.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                  age === a.key ? 'border-[#3182F6] bg-[#3182F6] text-white' : 'border-[#E5E8EB] bg-white text-[#4E5968]'
                }`}>{a.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* 리뷰 목록 */}
      {SAMPLE_REVIEWS.map(r => (
        <div key={r.id} className={`rounded-xl border-2 overflow-hidden transition-all ${
          selectedReview === r.id ? 'border-[#3182F6]' : 'border-[#E5E8EB]'
        }`}>
          <div className="p-4 bg-white">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3182F6] to-[#8B5CF6] flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                {r.author[0]}
              </div>
              <span className="font-bold text-sm text-[#191F28]">{r.author}</span>
              <PlatformBadge p={r.platform} />
              <Stars n={r.rating} />
              <span className="text-xs text-[#B0B8C1] ml-auto">{r.date}</span>
            </div>
            <p className="text-sm text-[#4E5968] bg-[#F8F9FA] rounded-lg p-3 mb-3 leading-relaxed">{r.text}</p>
            {!aiReplies[r.id] && (
              <button onClick={() => generateReply(r.id, r.text)} disabled={loading[r.id]}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#3182F6] text-white text-sm font-bold rounded-lg hover:bg-[#1B64DA] disabled:opacity-50 transition-colors">
                {loading[r.id]
                  ? <><Loader2 size={14} strokeWidth={2.5} className="animate-spin" /> 생성 중...</>
                  : <>AI 답글 생성 <ArrowRight size={14} strokeWidth={2.5} /></>}
              </button>
            )}
          </div>
          {aiReplies[r.id] && (
            <div className="border-t border-[#E5E8EB] bg-[#F0F9FF] p-4">
              <p className="text-xs font-black text-[#3182F6] mb-2">AI 생성 답글 · 편집 후 원클릭 게시</p>
              <textarea defaultValue={aiReplies[r.id]} rows={4}
                className="w-full border border-[#93C5FD] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#3182F6] resize-none bg-white leading-relaxed" />
              <div className="flex gap-2 mt-3 flex-wrap">
                <button onClick={() => generateReply(r.id, r.text)} disabled={loading[r.id] || postStatus[r.id] === 'posting'}
                  className="flex-1 min-w-[100px] inline-flex items-center justify-center gap-1.5 text-sm px-4 py-2.5 border-2 border-[#3182F6] text-[#3182F6] rounded-lg hover:bg-[#EFF6FF] font-bold transition-colors disabled:opacity-50">
                  <RefreshCw size={14} strokeWidth={2.5} /> 재생성
                </button>
                <button onClick={() => autoPost(r.id)} disabled={postStatus[r.id] === 'posting' || postStatus[r.id] === 'done'}
                  className="flex-[2] min-w-[160px] inline-flex items-center justify-center gap-1.5 text-sm px-4 py-2.5 bg-[#3182F6] text-white rounded-lg hover:bg-[#1B64DA] font-bold disabled:opacity-70 transition-colors">
                  {postStatus[r.id] === 'posting' ? (
                    <><Loader2 size={14} strokeWidth={2.5} className="animate-spin" /> 게시 중...</>
                  ) : postStatus[r.id] === 'done' ? (
                    <><CheckCircle2 size={14} strokeWidth={2.5} /> 게시 완료</>
                  ) : (
                    <><Send size={14} strokeWidth={2.5} /> 원클릭 게시</>
                  )}
                </button>
              </div>
              {postStatus[r.id] === 'done' && (
                <p className="text-xs text-[#12B76A] font-bold mt-2 inline-flex items-center gap-1">
                  <CheckCircle2 size={12} strokeWidth={2.5} />
                  {PLATFORMS.find(p => p.key === r.platform)?.label}에 답글이 등록되었습니다
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── 메인 페이지 ────────────────────────────────────────────
export default function ServiceIntro() {
  const [activeTab, setActiveTab] = useState<'reply' | 'qr'>('reply')

  return (
    <div className="min-h-screen bg-[#F2F4F6]">

      {/* 히어로 */}
      <div style={{ background: 'linear-gradient(135deg, #1B3FD8 0%, #3182F6 100%)' }} className="text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="mb-6">
            <Link href="/" className="inline-flex items-center gap-1.5 text-white/70 text-sm hover:text-white transition-colors">
              <ArrowLeft size={16} strokeWidth={2.25} /> 대시보드
            </Link>
          </div>
          <div className="inline-block bg-white/15 border border-white/30 text-white/90 text-xs sm:text-sm font-bold px-4 py-2 rounded-full mb-4">
            ⚡ 리뷰 관리 완전 자동화 — 답글 쓰기 + 리뷰 모으기
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black mb-4 leading-tight break-keep">
            리뷰는 AI가 모으고,<br/>
            <span className="text-[#FFE2A0]">답글도 AI가 달아드려요.</span>
          </h1>
          <p className="text-white/85 text-sm sm:text-base md:text-lg leading-relaxed max-w-3xl break-keep">
            QR 코드 하나로 고객 리뷰를 유도하고 — 쌓인 리뷰엔 AI가 매장 톤에 맞춘 답글을 3초 만에 만들어 원클릭으로 게시합니다.
          </p>
          <div className="flex gap-6 sm:gap-10 mt-6 flex-wrap">
            {[
              ['QR', '리뷰 수집 자동화'],
              ['6개', '연동 플랫폼'],
              ['6종', 'AI 답글 톤'],
              ['1분', '가입 → 첫 답글'],
            ].map(([v, l]) => (
              <div key={l}>
                <div className="text-2xl sm:text-3xl font-black">{v}</div>
                <div className="text-white/70 text-xs sm:text-sm mt-0.5">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">

        {/* 탭 전환 */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={() => setActiveTab('reply')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 sm:px-8 py-3.5 rounded-2xl border-2 font-bold text-sm transition-all ${
              activeTab === 'reply'
                ? 'border-[#3182F6] bg-[#3182F6] text-white shadow-[0_4px_20px_rgba(49,130,246,0.3)]'
                : 'border-[#E5E8EB] bg-white text-[#4E5968] hover:border-[#3182F6]'
            }`}>
            <MessageSquare size={16} strokeWidth={2.25} />
            AI 리뷰 답글
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 sm:px-8 py-3.5 rounded-2xl border-2 font-bold text-sm transition-all ${
              activeTab === 'qr'
                ? 'border-[#059669] bg-[#059669] text-white shadow-[0_4px_20px_rgba(5,150,105,0.3)]'
                : 'border-[#E5E8EB] bg-white text-[#4E5968] hover:border-[#059669]'
            }`}>
            <QrCode size={16} strokeWidth={2.25} />
            QR 리뷰 수집
          </button>
        </div>

        {/* 탭 설명 */}
        {activeTab === 'reply' && (
          <div className="bg-white rounded-2xl p-5 sm:p-8 shadow-sm border border-[#E5E8EB] mb-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                <MessageSquare size={20} strokeWidth={2} className="text-[#3182F6]" />
              </div>
              <div>
                <h2 className="text-lg sm:text-2xl font-black text-[#191F28]">AI 리뷰 답글 자동 생성</h2>
                <p className="text-xs sm:text-sm text-[#8B95A1] break-keep">리뷰를 클릭하면 AI가 3초 안에 답글을 만들어 드려요. 실제로 체험해 보세요.</p>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'qr' && (
          <div className="bg-white rounded-2xl p-5 sm:p-8 shadow-sm border border-[#E5E8EB] mb-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] flex items-center justify-center flex-shrink-0">
                <QrCode size={20} strokeWidth={2} className="text-[#059669]" />
              </div>
              <div>
                <h2 className="text-lg sm:text-2xl font-black text-[#191F28]">QR 리뷰 수집 자동화</h2>
                <p className="text-xs sm:text-sm text-[#8B95A1] break-keep">고객이 QR을 찍으면 AI가 리뷰를 대신 써주고 플랫폼에 바로 올려줍니다. 흐름을 체험해 보세요.</p>
              </div>
            </div>
          </div>
        )}

        {/* 데모 영역 */}
        <div className="mb-12">
          {activeTab === 'reply' ? <ReviewDemo /> : <QrDemo />}
        </div>

        {/* ── 더 많은 기능 섹션 ── */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <div className="inline-block bg-[#EFF6FF] text-[#3182F6] text-xs font-black px-4 py-1.5 rounded-full mb-3">
              이 외에도
            </div>
            <h2 className="text-xl sm:text-3xl font-black text-[#191F28] mb-3 break-keep">
              사장님이 필요한 것,<br className="sm:hidden" /> 로컬루션에 다 있어요
            </h2>
            <p className="text-sm text-[#8B95A1] max-w-lg mx-auto break-keep">
              리뷰·마케팅부터 고객 관리, 정산까지 — 하나의 플랫폼에서 모두 해결하세요.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {MORE_FEATURES.map(f => (
              <div key={f.title} className="bg-white rounded-2xl p-5 border border-[#F2F4F6] hover:border-[#E5E8EB] hover:shadow-sm transition-all">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: f.bg, color: f.color }}>
                    {f.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
                        style={{ background: f.bg, color: f.color }}>{f.tag}</span>
                      {f.badge && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-[#F2F4F6] text-[#8B95A1]">{f.badge}</span>
                      )}
                    </div>
                  </div>
                </div>
                <h3 className="text-sm font-black text-[#191F28] mb-1.5 break-keep">{f.title}</h3>
                <p className="text-xs text-[#8B95A1] leading-relaxed break-keep">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* 후킹 CTA */}
          <div className="bg-gradient-to-r from-[#1B3FD8] to-[#3182F6] rounded-2xl p-6 sm:p-8 text-white text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-3 py-1.5 text-xs font-bold mb-4">
              <Shield size={13} strokeWidth={2.5} /> 7일 무료 체험 · 카드 등록 불필요
            </div>
            <h3 className="text-xl sm:text-2xl font-black mb-2 break-keep">
              지금 시작하면<br className="sm:hidden" /> 오늘부터 리뷰가 쌓입니다
            </h3>
            <p className="text-white/80 text-sm mb-6 break-keep max-w-md mx-auto">
              QR 코드 배치부터 AI 답글 설정까지 — 가입 후 10분이면 완료됩니다.
            </p>
            <div className="flex gap-3 justify-center flex-col sm:flex-row">
              <Link href="/login"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-[#1B3FD8] font-black rounded-xl hover:bg-[#F0F4FF] transition-colors text-sm">
                무료로 시작하기 <ArrowRight size={16} strokeWidth={2.5} />
              </Link>
              <Link href="/pricing"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/15 text-white border border-white/30 font-bold rounded-xl hover:bg-white/25 transition-colors text-sm">
                요금제 보기
              </Link>
            </div>
          </div>
        </div>

        {/* 안내 박스 */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#E5E8EB]">
          <h2 className="text-lg sm:text-xl font-black text-[#191F28] mb-4">서비스 이용 안내</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { title: '원클릭 자동 게시', desc: '매장 플랫폼 연동만 완료하면 버튼 한 번으로 답글이 자동 게시됩니다.', color: '#F0FDF4', border: '#BBF7D0', titleColor: '#166534' },
              { title: 'AI 처리 범위', desc: '공개된 리뷰 텍스트와 사업자가 입력한 매장 정보만 AI 처리에 사용됩니다.', color: '#EFF6FF', border: '#93C5FD', titleColor: '#1B64DA' },
              { title: '데이터 보관', desc: '매장 연동 정보는 사용자 브라우저에만 저장됩니다. 서버에 개인 식별 데이터를 저장하지 않습니다.', color: '#FFF7ED', border: '#FED7AA', titleColor: '#9A3412' },
              { title: '서비스 대상', desc: '카페, 음식점, 미용실 같은 소상공인과 여러 매장을 관리하는 마케팅 대행사를 위한 서비스입니다.', color: '#F5F3FF', border: '#C4B5FD', titleColor: '#5B21B6' },
            ].map(item => (
              <div key={item.title} className="rounded-xl p-4" style={{ background: item.color, border: `1px solid ${item.border}` }}>
                <h4 className="font-black text-sm mb-1.5" style={{ color: item.titleColor }}>{item.title}</h4>
                <p className="text-sm text-[#4E5968] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-[#E5E8EB] text-[#4E5968] text-sm font-bold rounded-xl hover:bg-[#F8F9FA] transition-colors">
            <ArrowLeft size={16} strokeWidth={2.5} /> 대시보드로 돌아가기
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  )
}
