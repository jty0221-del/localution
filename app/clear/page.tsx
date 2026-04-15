'use client'

import { useEffect, useState } from 'react'

export default function ClearPage() {
  const [done, setDone] = useState(false)

  useEffect(() => {
    // 1. 모든 쿠키 삭제
    document.cookie.split(';').forEach(function(c) {
      const name = c.trim().split('=')[0]
      if (name) {
        document.cookie = name + '=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        document.cookie = name + '=; path=/; domain=' + window.location.hostname + '; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      }
    })

    // 2. sessionStorage 전체 삭제
    try { sessionStorage.clear() } catch (_) {}

    // 3. localStorage 전체 삭제
    try { localStorage.clear() } catch (_) {}

    setDone(true)

    // 3초 후 로그인 페이지로
    const t = setTimeout(function() {
      window.location.href = '/login'
    }, 2000)

    return function() { clearTimeout(t) }
  }, [])

  return (
    <div style={{
      minHeight: '100vh', background: '#060D1A',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <div style={{ textAlign: 'center' }}>
        {done ? (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
              세션 초기화 완료
            </div>
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)' }}>
              2초 후 로그인 페이지로 이동합니다...
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>
              초기화 중...
            </div>
          </>
        )}
      </div>
    </div>
  )
}
