'use client'

/**
 * app/global-error.tsx
 *
 * Next.js 14 루트 레이아웃(root layout) 자체가 throw할 때 Next.js가 이 파일을 렌더링한다.
 * app/error.tsx는 layout 하위 에러만 잡기 때문에, 루트 layout.tsx 내부에서 예외가 터지면
 * global-error.tsx가 없을 경우 Vercel 기본 흰 화면이 표출된다.
 *
 * 본 파일은 <html>/<body>까지 포함해서 자체 렌더링해야 한다 (layout이 동작 불능 상태 가정).
 */

import { useEffect } from 'react'
import { reportError } from './lib/telemetry'

export default function GlobalError({
 error,
 reset,
}: {
 error: Error & { digest?: string }
 reset: () => void
}) {
 useEffect(() => {
 // 루트 레이아웃 에러 — fatal 레벨로 리포팅
 reportError(error, {
 level: 'fatal',
 digest: error.digest,
 route: typeof window !== 'undefined' ? window.location.pathname : undefined,
 tags: { boundary: 'global-error' },
 })
 }, [error])

 return (
 <html lang="ko">
 <body style={{ margin: 0, padding: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Noto Sans KR", sans-serif' }}>
 <div
 style={{
 minHeight: '100vh',
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'center',
 background: '#F8F9FB',
 padding: 24,
 }}
 >
 <div
 style={{
 maxWidth: 480,
 width: '100%',
 background: '#fff',
 borderRadius: 24,
 padding: '40px 28px',
 boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
 textAlign: 'center',
 }}
 >
 <div
 style={{
 width: 72,
 height: 72,
 borderRadius: '50%',
 background: '#FEE2E2',
 margin: '0 auto 20px',
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'center',
 fontSize: 36,
 }}
 aria-hidden="true"
 >
 
 </div>
 <h1 style={{ fontSize: 22, fontWeight: 900, color: '#191F28', margin: '0 0 8px' }}>
 시스템 오류가 발생했어요
 </h1>
 <p style={{ fontSize: 14, color: '#4E5968', lineHeight: 1.6, margin: '0 0 8px' }}>
 로컬루션 앱의 최상위 레이아웃에서 문제가 감지되었습니다.
 <br />잠시 후 다시 시도해주세요.
 </p>
 {error.digest && (
 <p style={{ fontSize: 11, color: '#B0B8C1', fontFamily: 'monospace', margin: '0 0 24px' }}>
 ref: {error.digest}
 </p>
 )}

 <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
 <button
 onClick={() => reset()}
 style={{
 padding: '14px 20px',
 borderRadius: 12,
 background: '#3182F6',
 color: '#fff',
 border: 'none',
 fontSize: 14,
 fontWeight: 800,
 cursor: 'pointer',
 }}
 >
 다시 시도
 </button>
 <a
 href="/"
 style={{
 padding: '14px 20px',
 borderRadius: 12,
 background: '#F2F4F6',
 color: '#4E5968',
 textDecoration: 'none',
 fontSize: 14,
 fontWeight: 800,
 }}
 >
 홈으로 돌아가기
 </a>
 </div>

 <p style={{ fontSize: 11, color: '#8B95A1', marginTop: 24, lineHeight: 1.6 }}>
 문제가 계속되면 하단 문의 또는 hello@localution.co.kr로 연락주세요.
 </p>
 </div>
 </div>
 </body>
 </html>
 )
}
