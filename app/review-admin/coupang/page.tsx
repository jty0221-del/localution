'use client'

// ============================================================
// 30차-22 · /review-admin/coupang — 공통 컴포넌트 사용 wrapper
// ============================================================

import PlatformReviewAdmin, { PlatformConfig } from '../components/PlatformReviewAdmin'

export const dynamic = 'force-dynamic'

function CoupangEatsLogo() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <rect width="64" height="64" rx="16" fill="white" stroke="#E5E7EB" strokeWidth="1"/>
      <text x="8" y="32" fontSize="12" fontWeight="800" fontFamily="Arial,sans-serif" letterSpacing="0.3">
        <tspan fill="#E31837">c</tspan><tspan fill="#F4A900">o</tspan><tspan fill="#E31837">u</tspan><tspan fill="#5BAD48">p</tspan><tspan fill="#3B79BE">a</tspan><tspan fill="#E31837">n</tspan><tspan fill="#F4A900">g</tspan>
      </text>
      <text x="8" y="50" fontSize="17" fontWeight="900" fill="#4A2C0A" fontFamily="Arial,sans-serif">e