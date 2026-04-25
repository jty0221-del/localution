'use client'

export const dynamic = 'force-dynamic'

import { useSearchParams } from 'next/navigation'
import { useState } from 'react'

interface Props {
  params: { slug: string }
}

export default function ReviewLandingPage({ params }: Props) {
  const searchParams = useSearchParams()
  const nameParam  = searchParams.get('n')
  const naverParam = searchParams.get('naver') || ''
  const storeName  = nameParam
    ? decodeURIComponent(nameParam)
    : decodeURIComponent(params.slug.replace(/-/g, ' '))

  const [selected, setSelected] = useState<string | null>(null)

  const naverUrl  = naverParam
    ? decodeURIComponent(naverParam)
    : `https://map.naver.com/v5/search/${encodeURIComponent(storeName)}`
  const googleUrl = `https://www.google.com/maps/search/${encodeURIComponent(storeName)}`
  const kakaoUrl  = `https://map.kakao.com/?q=${encodeURIComponent(storeName)}`

  const platforms = [
    {
      id: 'naver',
      name: '네이버 리뷰',
      desc: '네이버 플레이스에 리뷰 남기기',
      href: naverUrl,
      bg: '#3FBE12',
      badge: 'N',
      badgeColor: '#fff',
      border: '#3FBE12',
    },
    {
      id: 'google',
      name: '구글 리뷰',
      desc: 'Google Maps에 리뷰 남기기',
      href: googleUrl,
      bg: '#4285F4',
      badge: 'G',
      badgeColor: '#fff',
      border: '#4285F4',
    },
    {
      id: 'kakao',
      name: '카카오 리뷰',
      desc: '카카오맵에 리뷰 남기기',
      href: kakaoUrl,
      bg: '#FEE500',
      badge: 'K',
      badgeColor: '#191F28',
      border: '#FEE500',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EFF6FF] via-[#F8FBFF] to-[#F0FDF4] flex flex-col">
      {/* 상단 브랜드 */}
      <div className="w-full flex justify-center pt-6 pb-2">
        <span className="text-xs font-bold text-[#3182F6] tracking-widest uppercase opacity-70">로컬루션</span>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-10">
        <div className="w-full max-w-sm">

          {/* 헤더 */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-lg border border-[#E5E8EB]">
              <span className="text-4xl">⭐</span>
            </div>
            <h1 className="text-2xl font-bold text-[#191F28] mb-2 leading-tight">{storeName}</h1>
            <p className="text-[#4E5968] text-base leading-relaxed">
              방문해 주셔서 감사합니다!<br />
              <span className="font-semibold text-[#191F28]">솔직한 리뷰</span>가 큰 힘이 돼요 😊
            </p>
          </div>

          {/* 플랫폼 선택 */}
          <p className="text-xs font-semibold text-[#8B95A1] text-center mb-3 tracking-wide uppercase">리뷰 플랫폼 선택</p>
          <div className="space-y-3">
            {platforms.map(p => (
              <a
                key={p.id}
                href={p.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setSelected(p.id)}
                className={`flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-all border-2 ${
                  selected === p.id ? 'border-current shadow-md' : 'border-transparent hover:border-[#E5E8EB] hover:shadow-md'
                }`}
                style={selected === p.id ? { borderColor: p.border } : {}}>
                {/* 배지 */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl flex-shrink-0"
                  style={{ background: p.bg, color: p.badgeColor }}>
                  {p.badge}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-[#191F28] text-base">{p.name}</p>
                  <p className="text-sm text-[#8B95A1]">{p.desc}</p>
                </div>
                <svg className="w-5 h-5 text-[#C9CDD2] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            ))}
          </div>

          {/* 안내 문구 */}
          <div className="mt-6 p-4 bg-white/70 rounded-2xl border border-[#E5E8EB] text-center">
            <p className="text-xs text-[#8B95A1] leading-relaxed">
              리뷰는 다른 고객들에게 큰 도움이 됩니다.<br />
              <span className="font-semibold text-[#4E5968]">진솔한 경험</span>을 공유해주세요 🙏
            </p>
          </div>
        </div>
      </div>

      {/* 하단 브랜드 */}
      <div className="w-full flex flex-col items-center pb-6 gap-1">
        <p className="text-[11px] text-[#C9CDD2]">Powered by</p>
        <a href="https://www.localution.co.kr" className="text-xs font-bold text-[#3182F6] hover:underline">
          로컬루션 (Localution)
        </a>
      </div>
    </div>
  )
}
