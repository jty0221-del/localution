'use client'

// /signup — 회원가입 전용 랜딩. 내부적으로는 /login?mode=signup 으로 rewrite.
// (OAuth 플로우는 동일하지만 URL 을 분리해 광고 전환/GA 추적을 구분한다)
import { useEffect } from 'react'

export default function SignupPage() {
  useEffect(() => {
    // 쿼리·해시 보존하면서 전환
    const qs = typeof window !== 'undefined' ? window.location.search : ''
    const sep = qs ? '&' : '?'
    window.location.replace(`/login${qs}${sep}mode=signup`)
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#F2F4F6',
      color: '#4E5968',
      fontSize: 14,
    }}>
      {/* 🔧 WCAG AA — 스크린리더용 h1 (시각적으로 숨김) */}
      <h1 className="sr-only">로컬루션 회원가입</h1>
      가입 페이지로 이동 중…
    </div>
  )
}
