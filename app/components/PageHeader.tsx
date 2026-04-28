// app/components/PageHeader.tsx
// ============================================================
// 공용 페이지 헤더 — 로컬루션 통일 히어로 배너 (고급화 버전)
// · 높이 일괄 통일 (py-9 md:py-12) + 아이콘 뱃지 확장 (w-14 h-14 md:w-16 md:h-16)
// · 이모지/아이콘 심볼에 subtle ring + drop-shadow + inner highlight
// · 가로폭 max-w-5xl 통일 · left/right 정렬 일관
// ============================================================
import type { ReactNode } from 'react'
import { BRAND_GRAD } from '../lib/brand-colors'
import type { BrandGradientKey } from '../lib/brand-colors'

export type PageHeaderVariant = BrandGradientKey

export interface PageHeaderProps {
  icon: ReactNode      // 이모지 문자열, SVG 컴포넌트, PlatformLogo 등
  title: string
  subtitle?: string
  variant?: PageHeaderVariant  // 기본 'primary'
  right?: ReactNode           // 오른쪽 우측(데스크톱) 액션
  badge?: string              // 오른쪽 기본 배지 (default: '로컬루션')
  className?: string
  textDark?: boolean          // 밝은 배경(카카오 옐로 등)에서 다크 텍스트
  logoNode?: ReactNode        // 아이콘 자리에 커스텀 SVG 삽입
}

export default function PageHeader({
  icon,
  title,
  subtitle,
  variant = 'primary',
  right,
  badge = '로컬루션',
  className = '',
  textDark = false,
  logoNode,
}: PageHeaderProps) {
  const titleColor  = textDark ? 'text-[#3C1E1E]' : 'text-white'
  const subColor    = textDark ? 'text-[#5C4A00]/90' : 'text-white/85'
  const badgeBg     = textDark ? 'bg-[#3C1E1E]/10 border-[#3C1E1E]/20 text-[#3C1E1E]' : 'text-white/95 bg-white/15 border-white/25'
  const iconBg      = textDark ? 'bg-[#3C1E1E]/10 ring-[#3C1E1E]/20' : 'bg-white/20 ring-white/30'

  return (
    <section className={`${BRAND_GRAD[variant]} relative overflow-hidden ${className}`}>
      {/* 배경 highlight */}
      <div className="pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" style={{
        background: textDark
          ? 'radial-gradient(800px 240px at 20% -20%, rgba(255,255,255,0.35), transparent 60%)'
          : 'radial-gradient(800px 240px at 20% -20%, rgba(255,255,255,0.22), transparent 60%)',
      }} />
      <div className="relative max-w-5xl mx-auto px-4 md:px-8 py-9 md:py-12 flex items-center gap-3.5 md:gap-5">
        {/* 아이콘 뱃지 */}
        <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl ${iconBg} backdrop-blur-md flex items-center justify-center text-3xl md:text-4xl flex-shrink-0 ring-1 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.2)] overflow-hidden`}>
          {logoNode
            ? logoNode
            : typeof icon === 'string'
              ? <span className="drop-shadow-sm leading-none">{icon}</span>
              : icon}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className={`text-[22px] md:text-[28px] font-black tracking-tight leading-tight ${titleColor}`}>{title}</h1>
          {subtitle && (
            <p className={`${subColor} text-[12px] md:text-sm mt-1.5 leading-relaxed`}>
              {subtitle}
            </p>
          )}
        </div>
        {right ? (
          <div className="hidden md:flex items-center gap-2 flex-shrink-0">{right}</div>
        ) : badge ? (
          <div className={`hidden md:flex items-center gap-1.5 text-[11px] font-bold ${badgeBg} backdrop-blur px-3 py-1.5 rounded-full border flex-shrink-0 shadow-sm`}>
            {badge}
          </div>
        ) : null}
      </div>
    </section>
  )
}
