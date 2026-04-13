'use client'

import { useState } from 'react'

const PARTNERS = [
  { id: 1, name: '오가닉브런치', category: '카페', location: '서울 마포', emoji: '☕',
    rating: 4.9, reviews: 312, badge: '이달의 우수매장',
    desc: 'AI 리뷰 답변으로 별점 4.5→4.9 달성!', color: '#3182F6',
    tags: ['#브런치', '#비건', '#감성카페'] },
  { id: 2, name: '강남헤어살롱', category: '미용실', location: '서울 강남', emoji: '✂️',
    rating: 4.8, reviews: 287, badge: '리뷰 마스터',
    desc: 'QR로 3개월 만에 리뷰 200개 돌파!', color: '#00C471',
    tags: ['#헤어', '#펌', '#강남'] },
  { id: 3, name: '부산고기창고', category: '식당', location: '부산 해운대', emoji: '🍖',
    rating: 4.7, reviews: 445, badge: 'CRM 챔피언',
    desc: 'CRM 단골 관리로 재방문율 65% 달성!', color: '#FF8C00',
    tags: ['#고기', '#회식', '#부산'] },
]

interface Props { variant?: 'banner' | 'popup' | 'card' }

export default function PartnerSpotlight({ variant = 'card' }: Props) {
  const [current, setCurrent] = useState(0)
  const [closed, setClosed] = useState(false)
  const p = PARTNERS[current]
  if (closed) return null

  if (variant === 'popup') return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="h-2" style={{ backgroundColor: p.color }} />
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="text-xs font-bold px-2 py-1 rounded-full text-white inline-block" style={{ backgroundColor: p.color }}>{p.badge}</span>
              <h3 className="text-xl font-bold text-[#191F28] mt-2">{p.name}</h3>
              <p className="text-sm text-[#8B95A1]">{p.category} · {p.location}</p>
            </div>
            <button onClick={() => setClosed(true)} className="text-[#8B95A1] text-2xl leading-none">×</button>
          </div>
          <div className="bg-[#F2F4F6] rounded-xl p-4 mb-4">
            <p className="text-sm text-[#4E5968]">"{p.desc}"</p>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-center"><div className="text-xl font-bold">⭐ {p.rating}</div><div className="text-xs text-[#8B95A1]">별점</div></div>
            <div className="w-px h-8 bg-[#E5E8EB]" />
            <div className="text-center"><div className="text-xl font-bold">{p.reviews}</div><div className="text-xs text-[#8B95A1]">리뷰</div></div>
            <div className="flex flex-wrap gap-1 ml-2">{p.tags.map(t => <span key={t} className="text-xs bg-[#F2F4F6] text-[#4E5968] px-2 py-0.5 rounded-full">{t}</span>)}</div>
          </div>
          <div className="flex gap-1 mb-4">{PARTNERS.map((_, i) => <button key={i} onClick={() => setCurrent(i)} className="flex-1 h-1.5 rounded-full transition-colors" style={{ backgroundColor: i === current ? p.color : '#E5E8EB' }} />)}</div>
          <div className="flex gap-3">
            <button onClick={() => setCurrent((current+1)%PARTNERS.length)} className="flex-1 py-2.5 border border-[#E5E8EB] rounded-xl text-sm text-[#4E5968] font-medium hover:bg-[#F2F4F6]">다음 매장</button>
            <button onClick={() => setClosed(true)} className="flex-1 py-2.5 rounded-xl text-sm text-white font-semibold" style={{ backgroundColor: p.color }}>광고 신청하기</button>
          </div>
        </div>
      </div>
    </div>
  )

  if (variant === 'banner') return (
    <div className="rounded-2xl overflow-hidden shadow-sm mb-6" style={{ background: p.color + '0d', border: '1px solid ' + p.color + '30' }}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: p.color }}>{p.badge}</span>
          <button onClick={() => setClosed(true)} className="text-[#8B95A1] text-lg">×</button>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ backgroundColor: p.color + '20' }}>{p.emoji}</div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[#191F28] text-sm">{p.name} <span className="font-normal text-[#8B95A1]">· {p.location}</span></div>
            <p className="text-xs text-[#4E5968] truncate mt-0.5">"{p.desc}"</p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="font-bold text-sm" style={{ color: p.color }}>⭐ {p.rating}</div>
            <div className="text-xs text-[#8B95A1]">리뷰 {p.reviews}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          {PARTNERS.map((_, i) => <button key={i} onClick={() => setCurrent(i)} className="h-1 rounded-full transition-all" style={{ width: i === current ? 24 : 8, backgroundColor: i === current ? p.color : '#E5E8EB' }} />)}
          <button onClick={() => setCurrent((current+1)%PARTNERS.length)} className="ml-auto text-xs font-medium" style={{ color: p.color }}>다음 →</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="h-1.5" style={{ backgroundColor: p.color }} />
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-[#8B95A1] uppercase tracking-wide">🏆 이달의 우수매장</span>
          <button onClick={() => setClosed(true)} className="text-[#8B95A1] text-lg leading-none">×</button>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: p.color + '15' }}>{p.emoji}</div>
          <div><div className="font-bold text-[#191F28] text-sm">{p.name}</div><div className="text-xs text-[#8B95A1]">{p.category} · {p.location}</div></div>
        </div>
        <div className="bg-[#F2F4F6] rounded-xl p-3 mb-3"><p className="text-xs text-[#4E5968]">"{p.desc}"</p></div>
        <div className="flex justify-between text-center mb-3">
          <div><div className="font-bold text-sm text-[#191F28]">⭐ {p.rating}</div><div className="text-xs text-[#8B95A1]">별점</div></div>
          <div><div className="font-bold text-sm text-[#191F28]">{p.reviews}</div><div className="text-xs text-[#8B95A1]">리뷰</div></div>
          <div><div className="font-bold text-sm" style={{ color: p.color }}>AD</div><div className="text-xs text-[#8B95A1]">파트너</div></div>
        </div>
        <div className="flex gap-1 mb-3">{PARTNERS.map((_, i) => <button key={i} onClick={() => setCurrent(i)} className="flex-1 h-1 rounded-full" style={{ backgroundColor: i === current ? p.color : '#E5E8EB' }} />)}</div>
        <button onClick={() => setCurrent((current+1)%PARTNERS.length)} className="w-full py-2 rounded-xl text-xs font-semibold border transition-colors" style={{ borderColor: p.color, color: p.color }}>광고 문의하기</button>
      </div>
    </div>
  )
}
