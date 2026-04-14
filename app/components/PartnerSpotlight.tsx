'use client'

import { useState } from 'react'
import Link from 'next/link'

const PARTNERS = [
  {
    id: 1, name: '오가닉브런치', category: '카페', location: '서울 마포',
    rating: 4.9, reviews: 312, badge: '이달의 우수매장',
    desc: '로컬루션 AI 리뷰 답변으로 별점 4.5→4.9 달성!',
    tags: ['#브런치', '#비건', '#감성카페'], color: '#3182F6',
  },
  {
    id: 2, name: '강남헤어살롱', category: '미용실', location: '서울 강남',
    rating: 4.8, reviews: 287, badge: '리뷰 마스터',
    desc: 'QR 리뷰 유도로 3개월 만에 리뷰 200개 돌파!',
    tags: ['#헤어', '#펌', '#강남미용'], color: '#00C471',
  },
  {
    id: 3, name: '부산고기창고', category: '식당', location: '부산 해운대',
    rating: 4.7, reviews: 445, badge: 'CRM 챔피언',
    desc: 'CRM 단골 관리로 재방문율 65% 달성한 고깃집',
    tags: ['#고기', '#회식', '#부산맛집'], color: '#FF8C00',
  },
]

interface PartnerSpotlightProps {
  variant?: 'banner' | 'popup' | 'card'
}

export default function PartnerSpotlight({ variant = 'card' }: PartnerSpotlightProps) {
  const [current, setCurrent] = useState(0)
  const [closed, setClosed] = useState(false)
  const partner = PARTNERS[current]

  if (closed) return null

  // ── 팝업 형태 ──────────────────────────────────────────────────
  if (variant === 'popup') {
    return (
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="h-2" style={{ backgroundColor: partner.color }} />
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="text-xs font-semibold px-2 py-1 rounded-full text-white mb-2 inline-block"
                style={{ backgroundColor: partner.color }}>
                {partner.badge}
              </span>
              <h3 className="text-xl font-bold text-[#191F28] mt-2">{partner.name}</h3>
              <p className="text-sm text-[#8B95A1]">{partner.category} · {partner.location}</p>
            </div>
          </div>
          <div className="bg-[#F2F4F6] rounded-xl p-4 mb-4">
            <p className="text-sm text-[#4E5968] leading-relaxed">"{partner.desc}"</p>
          </div>
          <div className="flex items-center gap-4 mb-5">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#191F28]">⭐ {partner.rating}</div>
              <div className="text-xs text-[#8B95A1]">평균 별점</div>
            </div>
            <div className="w-px h-10 bg-[#E5E8EB]" />
            <div className="text-center">
              <div className="text-2xl font-bold text-[#191F28]">{partner.reviews}</div>
              <div className="text-xs text-[#8B95A1]">총 리뷰 수</div>
            </div>
            <div className="w-px h-10 bg-[#E5E8EB]" />
            <div className="flex flex-wrap gap-1 flex-1">
              {partner.tags.map(t => (
                <span key={t} className="text-xs text-[#4E5968] bg-[#F2F4F6] px-2 py-0.5 rounded-full">{t}</span>
              ))}
            </div>
          </div>
          <div className="flex gap-1 mb-4">
            {PARTNERS.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className={`flex-1 h-1.5 rounded-full transition-colors ${i === current ? 'bg-[#3182F6]' : 'bg-[#E5E8EB]'}`} />
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setCurrent((current + 1) % PARTNERS.length)}
              className="flex-1 py-2.5 border border-[#E5E8EB] rounded-xl text-sm text-[#4E5968] font-medium hover:bg-[#F2F4F6] transition-colors">
              다음 매장 보기
            </button>
            <Link href="/inquiry"
              className="flex-1 py-2.5 rounded-xl text-sm text-white font-semibold text-center transition-opacity hover:opacity-90"
              style={{ backgroundColor: partner.color }}>
              1:1 문의하기
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── 배너 형태 ──────────────────────────────────────────────────
  if (variant === 'banner') {
    return (
      <div className="rounded-2xl overflow-hidden shadow-sm"
        style={{ background: `linear-gradient(135deg, ${partner.color}15, ${partner.color}05)`,
                 border: `1px solid ${partner.color}30` }}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: partner.color }}>{partner.badge}</span>
            <button onClick={() => setClosed(true)} className="text-[#8B95A1] text-lg leading-none">×</button>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ backgroundColor: partner.color + '20' }}>
              {partner.category === '카페' ? '☕' : partner.category === '미용실' ? '✂️' : '🍖'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[#191F28] text-sm">{partner.name}
                <span className="text-[#8B95A1] font-normal"> · {partner.location}</span>
              </div>
              <p className="text-xs text-[#4E5968] mt-0.5 truncate">"{partner.desc}"</p>
            </div>
            <Link href="/inquiry"
              className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: partner.color }}>
              문의하기
            </Link>
          </div>
          <div className="flex items-center gap-2 mt-3">
            {PARTNERS.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className={`h-1 rounded-full transition-all ${i === current ? 'w-6' : 'w-2 bg-[#E5E8EB]'}`}
                style={i === current ? { backgroundColor: partner.color } : {}} />
            ))}
            <button onClick={() => setCurrent((current + 1) % PARTNERS.length)}
              className="ml-auto text-xs font-medium" style={{ color: partner.color }}>
              다음 →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── 카드 형태 ──────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="h-1.5" style={{ backgroundColor: partner.color }} />
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-[#8B95A1] uppercase tracking-wide">🏆 이달의 우수매장</span>
          <button onClick={() => setClosed(true)} className="text-[#8B95A1] text-base leading-none">×</button>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
            style={{ backgroundColor: partner.color + '15' }}>
            {partner.category === '카페' ? '☕' : partner.category === '미용실' ? '✂️' : '🍖'}
          </div>
          <div>
            <div className="font-bold text-[#191F28] text-sm">{partner.name}</div>
            <div className="text-xs text-[#8B95A1]">{partner.category} · {partner.location}</div>
          </div>
        </div>
        <div className="bg-[#F2F4F6] rounded-xl p-3 mb-3">
          <p className="text-xs text-[#4E5968] leading-relaxed">"{partner.desc}"</p>
        </div>
        <div className="flex justify-between text-center mb-3">
          <div><div className="font-bold text-sm text-[#191F28]">⭐ {partner.rating}</div><div className="text-xs text-[#8B95A1]">별점</div></div>
          <div><div className="font-bold text-sm text-[#191F28]">{partner.reviews}</div><div className="text-xs text-[#8B95A1]">리뷰</div></div>
          <div><div className="font-bold text-sm" style={{ color: partner.color }}>사례</div><div className="text-xs text-[#8B95A1]">파트너</div></div>
        </div>
        <div className="flex gap-1.5 mb-3">
          {PARTNERS.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className="flex-1 h-1 rounded-full"
              style={{ backgroundColor: i === current ? partner.color : '#E5E8EB' }} />
          ))}
        </div>
        <Link href="/inquiry"
          className="block w-full py-2 rounded-xl text-xs font-semibold text-center text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: partner.color }}>
          1:1 문의하기
        </Link>
      </div>
    </div>
  )
}
