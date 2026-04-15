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
    id: 'r1', platform: 'google', author: '김민준', rating: 5,
    date: '2026-04-10',
    text: '해운대에서 태국 음식 찾다가 우연히 들어갔는데 정말 맛있었어요. 팟타이가 특히 인상적이었고 직원분들도 친절했습니다. 뷰도 너무 예쁘고 재방문 의사 200%입니다.',
  },
  {
    id: 'r2', platform: 'google', author: 'Sarah K.', rating: 4,
    date: '2026-04-08',
    text: 'Great Thai food in Haeundae. The green curry was amazing and the ocean view is beautiful. Staff were very friendly. Will definitely come back.',
  },
  {
    id: 'r3', platform: 'naver', author: '박지현', rating: 5,
    date: '2026-04-06',
    text: '분위기도 너무 좋고 음식도 정말 맛있었어요. 망고스티키라이스가 최고. 해운대 뷰 보면서 먹으니까 더 맛있는 것 같아요.',
  },
]

const STEPS = [
  { num: 1, icon: '1', title: '플랫폼 연동', desc: '구글 맵, 네이버 플레이스, 쿠팡이츠, 배민, 요기요 등 매장 URL이나 매장명을 입력하면 자동으로 매장 정보를 가져옵니다.' },
  { num: 2, icon: '2', title: '리뷰 목록 확인', desc: '연동된 플랫폼의 최신 리뷰를 한 화면에서 확인합니다. 별점·미답변 필터를 지원합니다.' },
  { num: 3, icon: '3', title: 'AI 답글 생성', desc: '리뷰 내용과 매장 특성을 분석해서 SEO 맞춤 답글을 만들어 줍니다. 따뜻한 사장님 톤과 전문업체 톤 중에서 고를 수 있어요.' },
  { num: 4, icon: '4', title: '검토 및 수정', desc: '생성된 답글을 직접 편집하고 다듬을 수 있습니다.' },
  { num: 5, icon: '5', title: '직접 게시', desc: '완성된 답글을 복사해서 각 플랫폼에 직접 게시합니다.' },
]

function Stars({ n }: { n: number }) {
  return <span className="text-yellow-400 text-lg">{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>
}

function PlatformBadge({ p }: { p: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    google: { label: '구글', bg: 'bg-blue-100', color: 'text-blue-700' },
    naver:  { label: '네이버', bg: 'bg-green-100', color: 'text-green-700' },
    coupang:{ label: '쿠팡이츠', bg: 'bg-red-100', color: 'text-red-700' },
    baemin: { label: '배민', bg: 'bg-teal-100', color: 'text-teal-700' },
    yogiyo: { label: '요기요', bg: 'bg-pink-100', color: 'text-pink-700' },
  }
  const m = map[p] || map.google
  return <span className={`text-xs px-2.5 py-1 rounded-full ${m.bg} ${m.color} font-bold`}>{m.label}</span>
}

export default function ServiceIntro() {
  const [activeStep, setActiveStep] = useState(1)
  const [selectedReview, setSelectedReview] = useState<string | null>(null)
  const [aiReplies, setAiReplies] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [storeName, setStoreName] = useState(SAMPLE_STORE.name)
  const [region, setRegion] = useState('해운대')
  const [bizType, setBizType] = useState('태국 음식점')
  const [tone, setTone] = useState<'friendly' | 'expert'>('friendly')

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
            tone,
            length: 'medium',
            includes: { thanks: true, revisit: true, mention: true, personalize: true, improve: true, keyword: true },
            closing: tone === 'expert' ? '' : '해운대에서 또 만나요',
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

      {/* 헤더 */}
      <div style={{ background: 'linear-gradient(135deg, #1B3FD8 0%, #3182F6 100%)' }} className="text-white">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <div className="flex items-center gap-3 mb-8">
            <Link href="/" className="text-white/70 text-base hover:text-white transition-colors">← 대시보드</Link>
          </div>
          <div className="inline-block bg-white/15 border border-white/30 text-white/90 text-sm font-bold px-5 py-2 rounded-full mb-5">
            서비스 소개 · 이용 흐름
          </div>
          <h1 className="text-5xl font-black mb-5 leading-tight">AI 리뷰 답글 자동화 서비스</h1>
          <p className="text-white/85 text-xl leading-relaxed max-w-3xl">
            네이버 플레이스, 구글, 쿠팡이츠, 배달의민족, 요기요 리뷰를<br/>
            한 곳에서 확인하고 매장에 맞는 SEO 답글을 만들어 드립니다.
          </p>
          <div className="flex gap-10 mt-8">
            {[['5개+', '연동 플랫폼'], ['Claude', 'AI 엔진'], ['5개 언어', '다국어 지원']].map(([v, l]) => (
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
                <div className="w-14 h-14 rounded-xl bg-[#3182F6] flex items-center justify-center text-white font-black text-2xl">{s.icon}</div>
                <div>
                  <p className="text-sm text-[#3182F6] font-bold">Step {s.num}</p>
                  <h3 className="text-2xl font-black text-[#191F28]">{s.title}</h3>
                </div>
              </div>
              <p className="text-lg text-[#4E5968] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* 매장 정보 설정 */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#E5E8EB] mb-8">
          <h2 className="text-2xl font-black text-[#191F28] mb-2">Step 1 · 연동된 매장 정보</h2>
          <p className="text-base text-[#8B95A1] mb-6">실제 사용 시 구글 맵, 네이버 플레이스, 쿠팡이츠, 배민, 요기요 등 URL이나 매장명을 입력하면 자동으로 가져옵니다.</p>

          {/* 지원 플랫폼 칩 */}
          <div className="flex flex-wrap gap-2 mb-5">
            {['구글 맵', '네이버 플레이스', '쿠팡이츠', '배달의민족', '요기요'].map(name => (
              <span key={name} className="text-sm px-4 py-2 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[#1B64DA] font-bold">{name}</span>
            ))}
          </div>

          <div className="flex items-start gap-5 p-5 bg-[#F0F9FF] rounded-xl border border-[#BAE6FD] mb-5">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-black text-2xl flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #4285F4, #1A73E8)' }}>타</div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-xl font-black text-[#191F28]">{SAMPLE_STORE.name}</h3>
                <span className="text-sm px-3 py-1 rounded-full bg-green-100 text-green-700 font-bold">구글 연동됨</span>
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

        {/* 톤 선택 */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#E5E8EB] mb-8">
          <h2 className="text-2xl font-black text-[#191F28] mb-2">답글 톤 선택</h2>
          <p className="text-base text-[#8B95A1] mb-5">매장 성격에 맞춰서 답글 분위기를 고르세요.</p>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setTone('friendly')}
              className={`text-left p-6 rounded-xl border-2 transition-all ${
                tone === 'friendly'
                  ? 'border-[#3182F6] bg-[#EFF6FF]'
                  : 'border-[#E5E8EB] bg-white hover:border-[#BFDBFE]'
              }`}>
              <div className="text-lg font-black text-[#191F28] mb-1">따뜻한 사장님</div>
              <div className="text-sm text-[#4E5968] leading-relaxed">사장님이 직접 쓴 듯한 친근한 톤. 카페, 식당 같은 동네 가게에 잘 어울립니다.</div>
            </button>
            <button
              onClick={() => setTone('expert')}
              className={`text-left p-6 rounded-xl border-2 transition-all ${
                tone === 'expert'
                  ? 'border-[#3182F6] bg-[#EFF6FF]'
                  : 'border-[#E5E8EB] bg-white hover:border-[#BFDBFE]'
              }`}>
              <div className="text-lg font-black text-[#191F28] mb-1">전문업체</div>
              <div className="text-sm text-[#4E5968] leading-relaxed">정중하고 전문적인 톤. 이모티콘과 과장 표현 없이 담백하게 나갑니다.</div>
            </button>
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
                    <p className="text-sm font-black text-[#3182F6] mb-3">AI 생성 답글 · 편집 후 플랫폼에 직접 게시</p>
                    <textarea defaultValue={aiReplies[r.id]} rows={5}
                      className="w-full border border-[#93C5FD] rounded-xl px-4 py-3 text-base outline-none focus:border-[#3182F6] resize-none bg-white leading-relaxed" />
                    <div className="flex gap-2 justify-between mt-3">
                      <button onClick={() => generateReply(r.id, r.text)}
                        className="text-sm px-4 py-2 border border-[#3182F6] text-[#3182F6] rounded-lg hover:bg-[#EFF6FF] font-bold">
                        재생성
                      </button>
                      <div className="flex items-center gap-2 text-sm text-[#8B95A1]">
                        <span>복사 후 네이버/구글/쿠팡이츠/배민/요기요에 직접 게시</span>
                      </div>
                    </div>
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
              { title: '자동 게시 없음', desc: '로컬루션은 사용자 계정으로 답글을 자동 게시하지 않습니다. 생성된 답글은 사업자가 직접 플랫폼에 등록합니다.', color: '#F0FDF4', border: '#BBF7D0', titleColor: '#166534' },
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
          <Link href="/" className="inline-flex items-center gap-2 px-8 py-4 bg-[#3182F6] text-white text-lg font-bold rounded-xl hover:bg-[#1B64DA] transition-colors">
            대시보드로 이동 →
          </Link>
        </div>
      </div>
    </div>
  )
}
