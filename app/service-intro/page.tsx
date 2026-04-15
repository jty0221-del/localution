'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import TopNav from '../components/TopNav'

const SAMPLE_STORE = {
  name: '타이백스트릿 해운대점',
  category: '태국 음식점',
  address: '부산광역시 해운대구 우동 1468-1',
  rating: 4.3,
  reviewCount: 1675,
}

const SAMPLE_REVIEWS = [
  { id: 'r1', platform: 'google', author: '김민준', rating: 5, date: '2026-04-10', text: '해운대에서 태국 음식 찾다가 우연히 들어갔는데 정말 맛있었어요! 팟타이가 특히 인상적이었고 직원분들도 친절했습니다. 뷰도 너무 예쁘고 재방문 의사 200%입니다 👍' },
  { id: 'r2', platform: 'google', author: 'Sarah K.', rating: 4, date: '2026-04-08', text: 'Great Thai food in Haeundae! The green curry was amazing and the ocean view is beautiful. Staff were very friendly. Will definitely come back.' },
  { id: 'r3', platform: 'naver',  author: '박지현', rating: 5, date: '2026-04-06', text: '분위기도 너무 좋고 음식도 정말 맛있었어요. 망고스티키라이스가 최고! 해운대 뷰 보면서 먹으니까 더 맛있는 것 같아요.' },
]

const STEPS = [
  { num: 1, icon: '🔗', title: '플랫폼 연동',  desc: '구글 맵 URL 또는 매장명을 입력하면 자동으로 매장 정보를 가져옵니다.' },
  { num: 2, icon: '📋', title: '리뷰 목록 확인', desc: '연동된 플랫폼의 최신 리뷰가 자동으로 표시됩니다. 별점·미답변 필터 지원.' },
  { num: 3, icon: '✨', title: 'AI 답글 생성',  desc: 'AI가 리뷰 내용과 매장 특성을 분석해 SEO 최적화 맞춤 답글을 생성합니다.' },
  { num: 4, icon: '✏️', title: '검토 및 수정',  desc: '생성된 답글을 직접 편집하고 다듬을 수 있습니다.' },
  { num: 5, icon: '📤', title: '직접 게시',     desc: '완성된 답글을 복사해 네이버·구글 플랫폼에 직접 게시합니다.' },
]

const TONES = [
  { key: 'warm',    label: '따뜻한 사장님',  desc: '감사하고 따뜻하게' },
  { key: 'pro',     label: '전문 업체',      desc: '신뢰감 있고 격식있게' },
  { key: 'fun',     label: '유쾌·친근',      desc: '재미있고 친근하게' },
  { key: 'simple',  label: '심플',           desc: '짧고 깔끔하게' },
]

function Stars({ n }: { n: number }) {
  return <span className="text-yellow-400">{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>
}

function PlatformBadge({ p }: { p: string }) {
  return p === 'google'
    ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">구글</span>
    : <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">네이버</span>
}

export default function ServiceIntro() {
  const [activeStep,    setActiveStep]    = useState(1)
  const [selectedReview, setSelectedReview] = useState<string | null>(null)
  const [aiReplies,     setAiReplies]     = useState<Record<string, string>>({})
  const [loading,       setLoading]       = useState<Record<string, boolean>>({})
  const [tone,          setTone]          = useState('warm')
  const [storeName,     setStoreName]     = useState(SAMPLE_STORE.name)

  async function generateReply(reviewId: string, reviewText: string) {
    setLoading(prev => ({ ...prev, [reviewId]: true }))
    setSelectedReview(reviewId)
    setActiveStep(3)
    try {
      const res = await fetch('/api/ai-review-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review: reviewText, platform: 'google',
          storeName, region: '해운대', bizType: SAMPLE_STORE.category,
          aiSettings: { tone, length: 'medium',
            includes: { thanks: true, revisit: true, mention: true, personalize: true, keyword: true },
            closing: '해운대에서 또 만나요!', excludes: '',
          },
        }),
      })
      const data = await res.json()
      const reply = data.reply || data.result ||
        '안녕하세요! 소중한 리뷰 남겨 주셔서 진심으로 감사드립니다. 저희 음식이 마음에 드셨다니 정말 기쁩니다. 다음 방문에는 더욱 맛있는 음식으로 보답하겠습니다. 꼭 다시 찾아 주세요!'
      setAiReplies(prev => ({ ...prev, [reviewId]: reply }))
      setActiveStep(4)
    } catch {
      setAiReplies(prev => ({ ...prev, [reviewId]: '죄송합니다, 잠시 후 다시 시도해 주세요.' }))
    } finally {
      setLoading(prev => ({ ...prev, [reviewId]: false }))
    }
  }

  return (
    <div className="min-h-screen bg-[#F2F4F6]">

            <TopNav />

      {/* 헤더 히어로 */}
      <div style={{ background: 'linear-gradient(135deg, #1B3FD8 0%, #3182F6 100%)' }} className="text-white pt-16">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="inline-block bg-white/15 border border-white/30 text-white/90 text-xs font-bold px-4 py-1.5 rounded-full mb-4">
            서비스 소개 · AI 리뷰 자동화 데모
          </div>
          <h1 className="text-3xl font-black mb-3">AI 리뷰 답글 자동화 서비스</h1>
          <p className="text-white/80 text-sm leading-relaxed max-w-xl">
            네이버 플레이스·구글 등 플랫폼의 고객 리뷰를 한 곳에서 확인하고,<br/>
            AI가 매장 특성에 맞는 SEO 최적화 답글을 자동 생성합니다.
          </p>
          <div className="flex gap-6 mt-6">
            {[['5개', '연동 플랫폼'], ['AI', 'Claude 기반'], ['다국어', '5개 언어']].map(([v, l]) => (
              <div key={l} className="text-center">
                <div className="text-2xl font-black">{v}</div>
                <div className="text-white/60 text-xs">{l}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            <Link href="/login" className="inline-flex items-center gap-2 bg-white text-[#3182F6] font-bold text-sm px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors shadow-sm">
              무료로 시작하기 →
            </Link>
            <Link href="/" className="inline-flex items-center gap-2 bg-white/15 text-white font-medium text-sm px-5 py-3 rounded-xl hover:bg-white/25 transition-colors">
              ← 홈으로
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* 이용 단계 */}
        <div className="mb-10">
          <h2 className="text-xl font-black text-[#191F28] mb-6">📌 서비스 이용 흐름</h2>
          <div className="flex gap-3 flex-wrap mb-8">
            {STEPS.map(s => (
              <button key={s.num} onClick={() => setActiveStep(s.num)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${
                  activeStep === s.num
                    ? 'border-[#3182F6] bg-[#3182F6] text-white'
                    : 'border-[#E5E8EB] bg-white text-[#4E5968] hover:border-[#3182F6]'
                }`}>
                <span>{s.icon}</span>
                <span>Step {s.num}</span>
              </button>
            ))}
          </div>

          {STEPS.map(s => activeStep === s.num && (
            <div key={s.num} className="bg-white rounded-2xl p-6 border border-[#E5E8EB]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-xl">{s.icon}</div>
                <div>
                  <div className="text-xs text-[#3182F6] font-bold">Step {s.num}</div>
                  <div className="font-black text-[#191F28]">{s.title}</div>
                </div>
              </div>
              <p className="text-sm text-[#4E5968] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* 라이브 데모 */}
        <div className="mb-10">
          <h2 className="text-xl font-black text-[#191F28] mb-2">🎯 라이브 데모 — AI 답글 생성</h2>
          <p className="text-sm text-[#8B95A1] mb-6">아래 리뷰에서 AI 답글 생성 버튼을 눌러보세요</p>

          {/* 매장 정보 */}
          <div className="bg-white rounded-2xl p-5 mb-5 border border-[#E5E8EB]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-[#3182F6] to-[#1B64DA] rounded-2xl flex items-center justify-center text-2xl">🍜</div>
              <div>
                <input
                  value={storeName}
                  onChange={e => setStoreName(e.target.value)}
                  className="text-base font-black text-[#191F28] bg-transparent border-b border-dashed border-[#E5E8EB] focus:border-[#3182F6] outline-none w-full mb-1"
                />
                <div className="text-xs text-[#8B95A1]">{SAMPLE_STORE.category} · {SAMPLE_STORE.address}</div>
                <div className="flex items-center gap-1 mt-1">
                  <Stars n={Math.round(SAMPLE_STORE.rating)} />
                  <span className="text-xs text-[#4E5968] font-bold">{SAMPLE_STORE.rating}</span>
                  <span className="text-xs text-[#8B95A1]">({SAMPLE_STORE.reviewCount.toLocaleString()}개)</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI 톤 선택 */}
          <div className="flex gap-2 flex-wrap mb-5">
            {TONES.map(t => (
              <button key={t.key} onClick={() => setTone(t.key)}
                className={`px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all ${
                  tone === t.key ? 'border-[#3182F6] bg-[#3182F6] text-white' : 'border-[#E5E8EB] bg-white text-[#4E5968] hover:border-[#3182F6]'
                }`}>
                {t.label}
                <span className="block text-[10px] font-normal opacity-70">{t.desc}</span>
              </button>
            ))}
          </div>

          {/* 리뷰 목록 */}
          <div className="space-y-4">
            {SAMPLE_REVIEWS.map(r => (
              <div key={r.id} className="bg-white rounded-2xl p-5 border border-[#E5E8EB]">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-[#191F28] text-sm">{r.author}</span>
                      <PlatformBadge p={r.platform} />
                      <span className="text-xs text-[#8B95A1]">{r.date}</span>
                    </div>
                    <Stars n={r.rating} />
                  </div>
                  <button
                    onClick={() => generateReply(r.id, r.text)}
                    disabled={loading[r.id]}
                    className="text-xs font-bold bg-[#3182F6] text-white px-4 py-2 rounded-xl hover:bg-[#1B64DA] disabled:opacity-60 transition-colors flex-shrink-0">
                    {loading[r.id] ? 'AI 생성 중...' : '✨ AI 답글'}
                  </button>
                </div>
                <p className="text-sm text-[#4E5968] leading-relaxed mb-3">{r.text}</p>

                {aiReplies[r.id] && (
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <div className="text-xs font-bold text-[#3182F6] mb-2">AI 생성 답글</div>
                    <p className="text-sm text-[#191F28] leading-relaxed">{aiReplies[r.id]}</p>
                    <button
                      onClick={() => { try { navigator.clipboard.writeText(aiReplies[r.id]); } catch {} setActiveStep(5) }}
                      className="mt-3 text-xs text-[#3182F6] font-bold hover:underline">
                      📋 복사하기
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-[#1B3FD8] to-[#3182F6] rounded-3xl p-8 text-white text-center">
          <h2 className="text-2xl font-black mb-3">지금 바로 시작해보세요</h2>
          <p className="text-white/80 mb-6">14일 무료 체험 · 신용카드 불필요</p>
          <Link href="/login" className="inline-flex items-center gap-2 bg-white text-[#3182F6] font-bold px-8 py-4 rounded-2xl hover:bg-blue-50 transition-colors shadow-lg text-sm">
            무료로 시작하기 →
          </Link>
        </div>
      </div>
    </div>
  )
}
