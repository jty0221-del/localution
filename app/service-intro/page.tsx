'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'

// 샘플 데이터
const SAMPLE_STORE = {
  name: '타이백스트릿 해운대점',
  category: '태국 음식점',
  address: '부산광역시 해운대구 우동 1468-1',
  rating: 4.3,
  reviewCount: 1675,
  placeId: 'ChIJobb671mhfDURrcE4SebLfyw',
}

const SAMPLE_REVIEWS = [
  {
    id: 'r1', platform: 'google', author: '김민준', rating: 5,
    date: '2026-04-10',
    text: '해운대에서 태국 음식 찾다가 우연히 들어갔는데 정말 맛있었어요! 팟타이가 특히 인상적이었고 직원분들도 친절했습니다. 뷰도 너무 예쁘고 재방문 의사 200%입니다 👍',
  },
  {
    id: 'r2', platform: 'google', author: 'Sarah K.', rating: 4,
    date: '2026-04-08',
    text: 'Great Thai food in Haeundae! The green curry was amazing and the ocean view is beautiful. Staff were very friendly. Will definitely come back.',
  },
  {
    id: 'r3', platform: 'google', author: '박지현', rating: 5,
    date: '2026-04-06',
    text: '분위기도 너무 좋고 음식도 정말 맛있었어요. 망고스티키라이스가 최고! 해운대 뷰 보면서 먹으니까 더 맛있는 것 같아요.',
  },
]

const STEPS = [
  { num: 1, icon: '🔗', title: '플랫폼 연동', desc: '구글 맵 URL 또는 매장명을 입력하면 자동으로 매장 정보를 가져옵니다.' },
  { num: 2, icon: '📋', title: '리뷰 목록 확인', desc: '연동된 플랫폼의 최신 리뷰가 자동으로 표시됩니다. 별점·미답변 필터 지원.' },
  { num: 3, icon: '✨', title: 'AI 답글 생성', desc: 'AI가 리뷰 내용과 매장 특성을 분석해 SEO 최적화 맞춤 답글을 생성합니다.' },
  { num: 4, icon: '✏️', title: '검토 및 수정', desc: '생성된 답글을 직접 편집하고 다듬을 수 있습니다.' },
  { num: 5, icon: '📤', title: '직접 게시', desc: '완성된 답글을 복사해 네이버·구글 플랫폼에 직접 게시합니다.' },
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
  const [activeStep, setActiveStep] = useState(1)
  const [selectedReview, setSelectedReview] = useState<string | null>(null)
  const [aiReplies, setAiReplies] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [storeName, setStoreName] = useState(SAMPLE_STORE.name)
  const [region, setRegion] = useState('해운대')
  const [bizType, setBizType] = useState('태국 음식점')

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
          platform: '구글',
          storeName,
          region,
          bizType,
          aiSettings: {
            tone: 'friendly', length: 'medium',
            includes: { thanks: true, revisit: true, mention: true, personalize: true, improve: true, keyword: true },
            closing: '해운대에서 또 만나요!',
            excludes: '',
          },
        }),
      })
      const data = await res.json()
      setAiReplies(prev => ({ ...prev, [reviewId]: data.reply || '답글 생성 실패' }))
      setActiveStep(4)
    } catch {
      setAiReplies(prev => ({ ...prev, [reviewId]: '⚠ 네트워크 오류' }))
    }
    setLoading(prev => ({ ...prev, [reviewId]: false }))
  }

  return (
    <div className="min-h-screen bg-[#F2F4F6]">

      {/* 헤더 */}
      <div style={{ background: 'linear-gradient(135deg, #1B3FD8 0%, #3182F6 100%)' }} className="text-white">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/" className="text-white/70 text-sm hover:text-white transition-colors">← 대시보드</Link>
          </div>
          <div className="inline-block bg-white/15 border border-white/30 text-white/90 text-xs font-bold px-4 py-1.5 rounded-full mb-4">
            서비스 소개 · 이용 흐름
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
            <div key={s.num} className="bg-white rounded-2xl p-6 shadow-sm border border-[#E5E8EB]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#3182F6] flex items-center justify-center text-white font-black text-lg">{s.icon}</div>
                <div>
                  <p className="text-xs text-[#3182F6] font-bold">Step {s.num}</p>
                  <h3 className="text-lg font-black text-[#191F28]">{s.title}</h3>
                </div>
              </div>
              <p className="text-sm text-[#4E5968] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* 매장 정보 설정 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E5E8EB] mb-6">
          <h2 className="text-lg font-black text-[#191F28] mb-1">🔗 Step 1 · 연동된 매장 정보</h2>
          <p className="text-xs text-[#8B95A1] mb-4">실제 사용 시 구글 맵 URL을 입력하면 자동으로 가져옵니다.</p>
          <div className="flex items-start gap-4 p-4 bg-[#F0F9FF] rounded-xl border border-[#BAE6FD] mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xl flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #4285F4, #1A73E8)' }}>타</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-[#191F28]">{SAMPLE_STORE.name}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">구글 연동됨</span>
              </div>
              <p className="text-xs text-[#8B95A1] mt-0.5">{SAMPLE_STORE.category} · {SAMPLE_STORE.address}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <Stars n={4} />
                <span className="text-sm font-black text-[#191F28]">{SAMPLE_STORE.rating}</span>
                <span className="text-xs text-[#8B95A1]">리뷰 {SAMPLE_STORE.reviewCount.toLocaleString()}개</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-[#8B95A1] block mb-1">매장명</label>
              <input value={storeName} onChange={e => setStoreName(e.target.value)}
                className="w-full border border-[#E5E8EB] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3182F6]" />
            </div>
            <div>
              <label className="text-xs font-bold text-[#8B95A1] block mb-1">지역</label>
              <input value={region} onChange={e => setRegion(e.target.value)}
                className="w-full border border-[#E5E8EB] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3182F6]" />
            </div>
            <div>
              <label className="text-xs font-bold text-[#8B95A1] block mb-1">업종</label>
              <input value={bizType} onChange={e => setBizType(e.target.value)}
                className="w-full border border-[#E5E8EB] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3182F6]" />
            </div>
          </div>
        </div>

        {/* 리뷰 목록 + AI 답글 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E5E8EB] mb-6">
          <h2 className="text-lg font-black text-[#191F28] mb-1">📋 Step 2-4 · 리뷰 목록 및 AI 답글 생성</h2>
          <p className="text-xs text-[#8B95A1] mb-5">[✨ AI 답글 생성] 버튼을 눌러 실제 AI 답글을 생성해보세요.</p>

          <div className="space-y-4">
            {SAMPLE_REVIEWS.map(r => (
              <div key={r.id} className={`rounded-xl border-2 overflow-hidden transition-all ${
                selectedReview === r.id ? 'border-[#3182F6]' : 'border-[#E5E8EB]'
              }`}>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
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
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#3182F6] text-white text-xs font-bold rounded-xl hover:bg-[#1B64DA] disabled:opacity-50 transition-colors">
                      {loading[r.id] ? <span className="animate-pulse">AI 답글 생성 중...</span> : '✨ AI 답글 생성'}
                    </button>
                  )}
                </div>

                {aiReplies[r.id] && (
                  <div className="border-t border-[#E5E8EB] bg-[#F0F9FF] p-4">
                    <p className="text-xs font-black text-[#3182F6] mb-2">✨ AI 생성 답글 (편집 후 플랫폼에 직접 게시)</p>
                    <textarea defaultValue={aiReplies[r.id]} rows={4}
                      className="w-full border border-[#93C5FD] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#3182F6] resize-none bg-white" />
                    <div className="flex gap-2 justify-between mt-2">
                      <button onClick={() => generateReply(r.id, r.text)}
                        className="text-xs px-3 py-1.5 border border-[#3182F6] text-[#3182F6] rounded-lg hover:bg-[#EFF6FF] font-bold">
                        재생성
                      </button>
                      <div className="flex items-center gap-2 text-xs text-[#8B95A1]">
                        <span>✓ 복사 후 네이버/구글에 직접 게시</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 안내 박스 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E5E8EB]">
          <h2 className="text-lg font-black text-[#191F28] mb-4">📌 서비스 이용 안내</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { title: '자동 게시 없음', desc: '로컬루션은 사용자 계정으로 답글을 자동 게시하지 않습니다. 생성된 답글은 사업자가 직접 플랫폼에 등록합니다.', color: '#F0FDF4', border: '#BBF7D0', titleColor: '#166534' },
              { title: 'AI 처리 범위', desc: '공개된 리뷰 텍스트와 사업자가 입력한 매장 정보만 AI 처리에 사용됩니다. 고객 개인정보는 수집하지 않습니다.', color: '#EFF6FF', border: '#93C5FD', titleColor: '#1B64DA' },
              { title: '데이터 보관', desc: '매장 연동 정보는 사용자 브라우저에만 저장됩니다. 서버에 개인 식별 데이터를 저장하지 않습니다.', color: '#FFF7ED', border: '#FED7AA', titleColor: '#9A3412' },
              { title: '서비스 대상', desc: '카페·음식점·미용실 등 소상공인·자영업자와 여러 매장을 관리하는 마케팅 대행사를 위한 서비스입니다.', color: '#F5F3FF', border: '#C4B5FD', titleColor: '#5B21B6' },
            ].map(item => (
              <div key={item.title} className="rounded-xl p-4" style={{ background: item.color, border: `1px solid ${item.border}` }}>
                <h4 className="font-black text-sm mb-1" style={{ color: item.titleColor }}>{item.title}</h4>
                <p className="text-xs text-[#4E5968] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-[#3182F6] text-white font-bold rounded-xl hover:bg-[#1B64DA] transition-colors">
            대시보드로 이동 →
          </Link>
        </div>
      </div>
    </div>
  )
}
