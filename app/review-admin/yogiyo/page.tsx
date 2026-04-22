'use client'

// ============================================================
// 30차-22 · /review-admin/yogiyo — 공통 컴포넌트 사용 wrapper
// ============================================================

export const dynamic = 'force-dynamic'

import PlatformReviewAdmin, { PlatformConfig } from '../components/PlatformReviewAdmin'

function YogiyoLogo() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <rect width="64" height="64" rx="16" fill="#E5007F"/>
      <text x="32" y="30" fontSize="14" fontWeight="900" fill="white"
        fontFamily="'Apple SD Gothic Neo','Noto Sans KR',sans-serif"
        textAnchor="middle">요기요</text>
      <circle cx="23" cy="42" r="6" fill="white"/>
      <circle cx="41" cy="42" r="6" fill="white"/>
      <path d="M17 54 Q23 50 29 54" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M35 54 Q41 50 47 54" stroke="white" strokeWidth="2.5" 