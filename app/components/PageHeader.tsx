// app/components/PageHeader.tsx
// ============================================================
// 공용 페이지 헤더 — 로컬루션 통일 히어로 배너
// 사용 예:
//   <PageHeader
//     icon="🫶"
//     title="고객 관리"
//     subtitle="단골을 데이터로 키운다"
//     variant="warn"
//     right={<button>...</button>}
//   />
// ============================================================
import type { ReactNode } from 'react'
import { BRAND_GRAD, type BrandGradientKey } from '../lib/brand-colors'

export type PageHeaderVariant = BrandGradientKey

export interface PageHeaderProps {
  icon: string          // 이모지 1~2자
  title: string
  subtitle?: string
  variant?: PageHeaderVariant  // 기본 'primary'
  right?: ReactNode           // 오른쪽 우측(데스크톱) 액션
  badge?: string              // 오른쪽 기본 배지 (default: '로컬루션')
  className?: string
}

export default function PageHeader({
  icon,
  title,
  subtitle,
  variant = 'primary',
  right,
  badge = '로컬루션',
  className = '',
}: PageHeaderProps) {
  return (
    <section className={`${BRAND_GRAD[variant]} text-white ${className}`}>
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-10 flex items-center gap-3 md:gap-4">
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl md:text-4xl flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-black tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-white/85 text-xs md:text-sm mt-1 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
        {right ? (
          <div className="hidden md:flex items-center gap-2 flex-shrink-0">{right}</div>
        ) : badge ? (
          <div className="hidden md:flex items-center gap-1.5 text-[11px] font-bold text-white/90 bg-white/15 backdrop-blur px-3 py-1.5 rounded-full border border-white/20 flex-shrink-0">
            {badge}
          </div>
        ) : null}
      </div>
    </section>
  )
}
