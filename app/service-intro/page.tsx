'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'

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

// 플랫폼 순서: 네이버가 가장 좌측
const PLATFORMS = [
  { key: 'naver',   label: '네이버 플레이스', bg: '#03C75A', letter: 'N', text: '#FFFFFF' },
  { key: 'google',  label: '구글 맵',         bg: '#4285F4', letter: 'G', text: '#FFFFFF' },
  { key: 'coupang', label: '쿠팡이츠',        bg: '#FF3C3C', letter: 'C', text: '#FFFFFF' },
  { key: 'baemin',  label: '배달의민족',      bg: '#2AC1BC', letter: 'B', text: '#FFFFFF' },
  { key: 'yogiyo',  label: '요기요',          bg: '#FA0050', letter: 'Y', text: '#FFFFFF' },
]

// 6종 톤
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

const STEPS = [
  { num: 1, title: '플랫폼 연동', desc: '네이버 플레이스, 구글 맵, 쿠팡이츠, 배달의민족, 요기요 등 매장 URL이나 매장명을 입력하면 자동으로 가져옵니다.' },
  { num: 2, title: '리뷰 목록 확인', desc: '연동된 플랫폼의 최신 리뷰를 한 화면에서 확인합니다. 별점·미답변 필터 지원.' },
  { num: 3, title: 'AI 답글 생성', desc: '리뷰 내용과 매장 특성, 고객 프로필(성별·연령대)을 반영해 SEO 맞춤 답글을 만들어 줍니다. 톤은 6가지 중 선택.' },
  { num: 4, title: '검토 및 수정', desc: '생성된 답글을 직접 편집하고 다듬을 수 있습니다.' },
  { num: 5, title: '원클릭 자동 게시', desc: '연동된 플랫폼에 버튼 한 번으로 답글이 자동 게시됩니다. 복사·붙여넣기 불필요.' },
]

function Stars({ n }: { n: number }) {
  return <span className="text-yellow-400 text-lg">{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>
}

function PlatformMark({ keyName, size = 28 }: { keyName: string; size?: number }) {
  const p = PLATFORMS.find(x => x.key === keyName) || PLATFORMS[0]
  return (
    <span
      className="inline-flex items-center justify-center rounded-md font-black flex-shrink-0"
      style={{ width: size, height: size, background: p.bg, color: p.text, fontSize: size * 0.55 }}>
      {p.letter}
    </span>
  )
}

function PlatformBadge({ p }: { p: string }) {
  const plat = PLATFORMS.find(x => x.key === p) || PLATFORMS[0]
  return (
    <span className="inline-flex items-center gap-1.5 text-sm px-2.5 py-1 rounded-full bg-[#F2F4F6] text-[#191F28] font-bold">
      <PlatformMark keyName={p} size={18} />
      {plat.label}
    </span>
  )
}

export default function ServiceIntro() {
  const [activeStep, setActiveStep] = useState(1)
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
    setActiveStep(3)
    try {
      const res = await fetch('/api/ai-review-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review: reviewText,
          platform: '네이버',
          storeName,
          region,
          bizType,
          customerProfile: { gender, age },
          aiSettings: {
            tone,
            length: 'medium',
            includes: { thanks: true, revisit: true, mention: true, personalize: true, improve: true, keyword: true },
            closing: tone === 'expert' ? '' : '',
            excludes: '',
          },
        }),
      })
      const data = await res.json()
      setAiReplies(prev => ({ ...prev, [reviewId]: data.reply || '답글 생성 실패' }))
      setActiveStep(4)
    } catch {
      setAiReplies(prev => ({ ...prev, [reviewId]: '네트워크 오류' }))
    }
    setLoading(prev => ({ ...prev, [reviewId]: false }))
  }

  return (
    <div className="min-h-screen bg-[#F2F4F6]">

      <div style={{ background: 'linear-gradient(135deg, #1B3FD8 0%, #3182F6 100%)' }} className="text-white">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <div className="flex items-center gap-3 mb-8">
            <Link href="/dashboard" className="text-white/70 text-base hover:text-white transition-colors">← 대시보드</Link>
          </div>
          <div className="inline-block bg-white/15 border border-white/30 text-white/90 text-sm font-bold px-5 py-2 rounded-full mb-5">
            서비스 소개 · 이용 흐름
          </div>
          <h1 className="text-5xl font-black mb-5 leading-tight">AI 리뷰 답글 자동화 서비스</h1>
          <p className="text-white/85 text-xl leading-relaxed max-w-3xl">
            네이버 플레이스, 구글, 쿠팡이츠, 배달의민족, 요기요 리뷰를<br/>
            한 곳에서 확인하고 매장과 고객 프로필에 맞는 답글을 만들어 드립니다.
          </p>
          <div className="flex gap-10 mt-8">
            {[['5개+', '연동 플랫폼'], ['6종', '답글 톤'], ['Claude', 'AI 엔진']].map(([v, l]) => (
              <div key={l}>
                <div className="text-3xl font-black">{v}</div>
                <div className="text-white/70 text-sm mt-1">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-14">

        {/* 이용 단계 */}
        <div className="mb-12">
          <h2 className="text-3xl font-black text-[#191F28] mb-8">서비스 이용 흐름</h2>
          <div className="flex gap-3 flex-wrap mb-8">
            {STEPS.map(s => (
              <button key={s.num} onClick={() => setActiveStep(s.num)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl border-2 text-base font-bold transition-all ${
                  activeStep === s.num
                    ? 'border-[#3182F6] bg-[#3182F6] text-white'
                    : 'border-[#E5E8EB] bg-white text-[#4E5968] hover:border-[#3182F6]'
                }`}>
                <span>Step {s.num}</span>
              </button>
            ))}
          </div>

          {STEPS.map(s => activeStep === s.num && (
            <div key={s.num} className="bg-white rounded-2xl p-8 shadow-sm border border-[#E5E8EB]">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl bg-[#3182F6] flex items-center justify-center text-white font-black text-2xl">{s.num}</div>
                <div>
                  <p className="text-sm text-[#3182F6] font-bold">Step {s.num}</p>
                  <h3 className="text-2xl font-black text-[#191F28]">{s.title}</h3>
                </div>
              </div>
              <p className="text-lg text-[#4E5968] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* 매장 정보 */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#E5E8EB] mb-8">
          <h2 className="text-2xl font-black text-[#191F28] mb-2">Step 1 · 연동된 매장 정보</h2>
          <p className="text-base text-[#8B95A1] mb-6">네이버 플레이스, 구글 맵, 쿠팡이츠, 배달의민족, 요기요 URL이나 매장명을 입력하면 자동으로 가져옵니다.</p>

          {/* 플랫폼 칩 (네이버가 가장 좌측) */}
          <div className="flex flex-wrap gap-2 mb-6">
            {PLATFORMS.map(p => (
              <span key={p.key}
                className="inline-flex items-center gap-2 text-base px-4 py-2.5 rounded-full bg-white border-2 border-[#E5E8EB] text-[#191F28] font-bold">
                <PlatformMark keyName={p.key} size={24} />
                {p.label}
              </span>
            ))}
          </div>

          <div className="flex items-start gap-5 p-5 bg-[#F0F9FF] rounded-xl border border-[#BAE6FD] mb-5">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-black text-2xl flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #4285F4, #1A73E8)' }}>타</div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-xl font-black text-[#191F28]">{SAMPLE_STORE.name}</h3>
                <span className="inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-full bg-[#E8F9EF] text-[#03C75A] font-bold">
                  <PlatformMark keyName="naver" size={18} /> 연동됨
                </span>
              </div>
              <p className="text-base text-[#8B95A1] mt-1">{SAMPLE_STORE.category} · {SAMPLE_STORE.address}</p>
              <div className="flex items-center gap-2 mt-2">
                <Stars n={4} />
                <span className="text-lg font-black text-[#191F28]">{SAMPLE_STORE.rating}</span>
                <span className="text-sm text-[#8B95A1]">리뷰 {SAMPLE_STORE.reviewCount.toLocaleString()}개</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-bold text-[#8B95A1] block mb-2">매장명</label>
              <input value={storeName} onChange={e => setStoreName(e.target.value)}
                className="w-full border border-[#E5E8EB] rounded-lg px-4 py-3 text-base outline-none focus:border-[#3182F6]" />
            </div>
            <div>
              <label className="text-sm font-bold text-[#8B95A1] block mb-2">지역</label>
              <input value={region} onChange={e => setRegion(e.target.value)}
                className="w-full border border-[#E5E8EB] rounded-lg px-4 py-3 text-base outline-none focus:border-[#3182F6]" />
            </div>
            <div>
              <label className="text-sm font-bold text-[#8B95A1] block mb-2">업종</label>
              <input value={bizType} onChange={e => setBizType(e.target.value)}
                className="w-full border border-[#E5E8EB] rounded-lg px-4 py-3 text-base outline-none focus:border-[#3182F6]" />
            </div>
          </div>
        </div>

        {/* 톤 선택 (6종) */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#E5E8EB] mb-8">
          <h2 className="text-2xl font-black text-[#191F28] mb-2">답글 톤 선택</h2>
          <p className="text-base text-[#8B95A1] mb-5">매장 성격과 분위기에 맞춰 6가지 중 하나를 고르세요.</p>
          <div className="grid grid-cols-3 gap-4">
            {TONES.map(t => (
              <button
                key={t.key}
                onClick={() => setTone(t.key)}
                className={`text-left p-5 rounded-xl border-2 transition-all ${
                  tone === t.key
                    ? 'border-[#3182F6] bg-[#EFF6FF]'
                    : 'border-[#E5E8EB] bg-white hover:border-[#BFDBFE]'
                }`}>
                <div className="w-10 h-10 rounded-lg mb-3 flex items-center justify-center text-white font-black text-lg"
                  style={{ background: t.color }}>
                  {t.title.slice(0, 1)}
                </div>
                <div className="text-lg font-black text-[#191F28] mb-1">{t.title}</div>
                <div className="text-sm text-[#4E5968] leading-relaxed">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 고객 프로필 (성별·연령대) */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#E5E8EB] mb-8">
          <h2 className="text-2xl font-black text-[#191F28] mb-2">고객 프로필</h2>
          <p className="text-base text-[#8B95A1] mb-6">리뷰를 남긴 고객의 성별과 연령대를 알려주시면, AI가 더 자연스러운 말투로 답글을 만들어 드립니다.</p>

          <div className="mb-6">
            <label className="text-base font-bold text-[#191F28] block mb-3">성별</label>
            <div className="flex gap-3">
              {GENDERS.map(g => (
                <button
                  key={g.key}
                  onClick={() => setGender(g.key)}
                  className={`px-6 py-3 rounded-xl border-2 text-base font-bold transition-all ${
                    gender === g.key
                      ? 'border-[#3182F6] bg-[#3182F6] text-white'
                      : 'border-[#E5E8EB] bg-white text-[#4E5968] hover:border-[#3182F6]'
                  }`}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-base font-bold text-[#191F28] block mb-3">연령대</label>
            <div className="flex gap-3 flex-wrap">
              {AGES.map(a => (
                <button
                  key={a.key}
                  onClick={() => setAge(a.key)}
                  className={`px-6 py-3 rounded-xl border-2 text-base font-bold transition-all ${
                    age === a.key
                      ? 'border-[#3182F6] bg-[#3182F6] text-white'
                      : 'border-[#E5E8EB] bg-white text-[#4E5968] hover:border-[#3182F6]'
                  }`}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 리뷰 목록 + AI 답글 */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#E5E8EB] mb-8">
          <h2 className="text-2xl font-black text-[#191F28] mb-2">Step 2-4 · 리뷰 목록 및 AI 답글 생성</h2>
          <p className="text-base text-[#8B95A1] mb-6">[AI 답글 생성] 버튼을 눌러 실제로 답글을 만들어 보세요.</p>

          <div className="space-y-5">
            {SAMPLE_REVIEWS.map(r => (
              <div key={r.id} className={`rounded-xl border-2 overflow-hidden transition-all ${
                selectedReview === r.id ? 'border-[#3182F6]' : 'border-[#E5E8EB]'
              }`}>
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3182F6] to-[#8B5CF6] flex items-center justify-center text-white text-sm font-black flex-shrink-0">
                      {r.author[0]}
                    </div>
                    <span className="font-bold text-base text-[#191F28]">{r.author}</span>
                    <PlatformBadge p={r.platform} />
                    <Stars n={r.rating} />
                    <span className="text-sm text-[#B0B8C1] ml-auto">{r.date}</span>
                  </div>
                  <p className="text-base text-[#4E5968] bg-[#F8F9FA] rounded-lg p-4 mb-4 leading-relaxed">{r.text}</p>

                  {!aiReplies[r.id] && (
                    <button onClick={() => generateReply(r.id, r.text)} disabled={loading[r.id]}
                      className="flex items-center gap-2 px-5 py-3 bg-[#3182F6] text-white text-base font-bold rounded-xl hover:bg-[#1B64DA] disabled:opacity-50 transition-colors">
                      {loading[r.id] ? <span className="animate-pulse">AI 답글 생성 중...</span> : 'AI 답글 생성'}
                    </button>
                  )}
                </div>

                {aiReplies[r.id] && (
                  <div className="border-t border-[#E5E8EB] bg-[#F0F9FF] p-5">
                    <p className="text-sm font-black text-[#3182F6] mb-3">AI 생성 답글 · 편집 후 원클릭으로 게시하세요</p>
                    <textarea defaultValue={aiReplies[r.id]} rows={5}
                      className="w-full border border-[#93C5FD] rounded-xl px-4 py-3 text-base outline-none focus:border-[#3182F6] resize-none bg-white leading-relaxed" />
                    <div className="flex gap-3 mt-4 flex-wrap">
                      <button onClick={() => generateReply(r.id, r.text)} disabled={loading[r.id] || postStatus[r.id] === 'posting'}
                        className="flex-1 min-w-[120px] text-base px-5 py-3.5 border-2 border-[#3182F6] text-[#3182F6] rounded-xl hover:bg-[#EFF6FF] font-black transition-colors disabled:opacity-50">
                        ↻ 재생성
                      </button>
                      <button onClick={() => autoPost(r.id, r.platform)} disabled={postStatus[r.id] === 'posting' || postStatus[r.id] === 'done'}
                        className="flex-[2] min-w-[220px] text-base px-5 py-3.5 bg-[#3182F6] text-white rounded-xl hover:bg-[#1B64DA] font-black disabled:opacity-70 transition-colors shadow-[0_4px_16px_rgba(49,130,246,0.35)]">
                        {postStatus[r.id] === 'posting' ? (
                          <span className="inline-flex items-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />게시 중...</span>
                        ) : postStatus[r.id] === 'done' ? (
                          <span>✓ 게시 완료</span>
                        ) : (
                          <span>원클릭 게시</span>
                        )}
                      </button>
                    </div>
                    {postStatus[r.id] === 'done' && (
                      <p className="text-sm text-[#12B76A] font-bold mt-3 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#12B76A]" />
                        {PLATFORMS.find(p => p.key === r.platform)?.label || r.platform}에 답글이 성공적으로 등록되었습니다
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 안내 박스 */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#E5E8EB]">
          <h2 className="text-2xl font-black text-[#191F28] mb-6">서비스 이용 안내</h2>
          <div className="grid grid-cols-2 gap-5">
            {[
              { title: '원클릭 자동 게시', desc: '매장 플랫폼 연동만 완료하면 버튼 한 번으로 답글이 자동 게시됩니다. 복사·붙여넣기 없이 5초 내 완료.', color: '#F0FDF4', border: '#BBF7D0', titleColor: '#166534' },
              { title: 'AI 처리 범위', desc: '공개된 리뷰 텍스트와 사업자가 입력한 매장 정보만 AI 처리에 사용됩니다. 고객 개인정보는 수집하지 않습니다.', color: '#EFF6FF', border: '#93C5FD', titleColor: '#1B64DA' },
              { title: '데이터 보관', desc: '매장 연동 정보는 사용자 브라우저에만 저장됩니다. 서버에 개인 식별 데이터를 저장하지 않습니다.', color: '#FFF7ED', border: '#FED7AA', titleColor: '#9A3412' },
              { title: '서비스 대상', desc: '카페, 음식점, 미용실 같은 소상공인과 여러 매장을 관리하는 마케팅 대행사를 위한 서비스입니다.', color: '#F5F3FF', border: '#C4B5FD', titleColor: '#5B21B6' },
            ].map(item => (
              <div key={item.title} className="rounded-xl p-5" style={{ background: item.color, border: `1px solid ${item.border}` }}>
                <h4 className="font-black text-lg mb-2" style={{ color: item.titleColor }}>{item.title}</h4>
                <p className="text-base text-[#4E5968] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-8 py-4 bg-[#3182F6] text-white text-lg font-bold rounded-xl hover:bg-[#1B64DA] transition-colors">
            대시보드로 이동 →
          </Link>
        </div>
      </div>
    </div>
  )
}
