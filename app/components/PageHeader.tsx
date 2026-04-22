// app/components/PageHeader.tsx
// ============================================================
// 공용 페이지 헤더 — 로컬루션 통일 히어로 배너 (고급화 버전)
// · logoNode prop 지원: SVG 로고 컴포넌트가 있으면 icon 이모지 대신 표시
// ============================================================
import type { ReactNode } from 'react'
import { BRAND_GRAD, type BrandGradientKey } from '../lib/brand-colors'

export type PageHeaderVariant = BrandGradientKey

export interface PageHeaderProps {
  icon: string          // 이모지 1~2자 또는 심볼 (logoNode 없을 때 폴백)
  logoNode?: ReactNode  // SVG 로고 — 있으면 icon 대신 렌더
  title: string
  subtitle?: string
  variant?: PageHeaderVariant  // 기본 'primary'
  right?: ReactNode           // 오른쪽 우측(데스크톱) 액션
  badge?: string              // 오른쪽 기본 배지 (default: '로컬루션')
  className?: string
}

export default function PageHeader({
  icon,
  logoNode,
  title,
  subtitle,
  variant = 'primary',
  right,
  badge = '로컬루션',
  className = '',
}: PageHeaderProps) {
  return (
    <section className={`${BRAND_GRAD[variant]} text-white relative overflow-hidden ${className}`}>
      {/* 배경 highlight */}
      <div className="pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" style={{
        background: 'radial-gradient(800px 240px at 20% -20%, rgba(255,255,255,0.22), transparent 60%)',
      }} />
      <div className="relative max-w-5xl mx-auto px-4 md:px-8 py-9 md:py-12 flex items-center gap-3.5 md:gap-5">
        {/* 아이콘 뱃지 */}
        {logoNode ? (
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl overflow-hidden flex-shrink-0 ring-1 ring-white/30 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)] flex items-center justify-center">
            {logoNode}
          </div>
        ) : (
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl md:text-4xl flex-shrink-0 ring-1 ring-white/30 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)]">
            <span className="drop-shadow-sm leading-none">{icon}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-[22px] md:text-[28px] font-black tracking-tight leading-tight">{title}</h1>
          {subtitle && (
            <p className="text-white/85 text-[12px] md:text-sm mt-1.5 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
        {right ? (
          <div className="hidden md:flex items-center gap-2 flex-shrink-0">{right}</div>
        ) : badge ? (
          <div className="hidden md:flex items-center gap-1.5 text-[11px] font-bold text-white/95 bg-whi