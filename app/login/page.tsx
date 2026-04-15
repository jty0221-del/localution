'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [errMsg, setErrMsg] = useState('')

  useEffect(() => {
    const hasCookie = document.cookie.split(';').some(function(c) {
      return c.trim().indexOf('localution_session=') === 0
    })
    if (hasCookie) { router.replace('/'); return; }

    const search = window.location.search
    if (search.indexOf('error=') >= 0) {
      const pairs = search.slice(1).split('&')
      let errVal = ''
      pairs.forEach(function(p) {
        if (p.indexOf('error=') === 0) errVal = decodeURIComponent(p.slice(6))
      })
      if (errVal === 'kakao_denied')   setErrMsg('카카오 로그인이 취소되었습니다.')
      else if (errVal === 'google_denied')  setErrMsg('구글 로그인이 취소되었습니다.')
      else if (errVal === 'naver_denied')   setErrMsg('네이버 로그인이 취소되었습니다.')
      else if (errVal === 'kakao_config')   setErrMsg('카카오 설정 오류입니다. 관리자에게 문의하세요.')
      else if (errVal === 'google_config')  setErrMsg('구글 설정 오류입니다. 관리자에게 문의하세요.')
      else if (errVal === 'token_failed')   setErrMsg('인증 토큰 발급에 실패했습니다. 다시 시도해주세요.')
      else if (errVal)                      setErrMsg('로그인 중 오류가 발생했습니다. 다시 시도해주세요.')
    }
  }, [router])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #EEF3FF 0%, #F0F7FF 40%, #EAF4FF 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: 'inherit',
    }}>

      {/* 배경 장식 원 */}
      <div style={{ position: 'fixed', top: '-120px', right: '-120px', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(49,130,246,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-80px', left: '-80px', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(49,130,246,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '400px', position: 'relative', zIndex: 1 }}>

        {/* 로고 영역 */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <img
            src="/logo.png"
            alt="로컬루션"
            style={{ height: '52px', width: 'auto', margin: '0 auto', display: 'block' }}
            onError={function(e) {
              (e.target as HTMLImageElement).style.display = 'none'
              const el = document.getElementById('logo-fallback')
              if (el) el.style.display = 'flex'
            }}
          />
          <div id="logo-fallback" style={{ display: 'none', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#3182F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: '18px' }}>L</span>
            </div>
            <span style={{ fontWeight: 900, fontSize: '20px', color: '#191F28', letterSpacing: '-0.5px' }}>LOCALUTION</span>
          </div>
          <p style={{ marginTop: '8px', fontSize: '13px', color: '#6B7684', fontWeight: 500 }}>사장님의 모든 업무, AI가 대신합니다</p>
        </div>

        {/* AI 통계 미니 카드 */}
        <div style={{
          background: 'linear-gradient(135deg, #1A4FBB 0%, #3182F6 100%)',
          borderRadius: '16px',
          padding: '16px 20px',
          marginBottom: '20px',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 8px 24px rgba(49,130,246,0.25)',
        }}>
          <div>
            <div style={{ fontSize: '11px', opacity: 0.75, fontWeight: 500, marginBottom: '4px' }}>AI 자동 운영 중 · 이번 달</div>
            <div style={{ fontSize: '13px', fontWeight: 700 }}>리뷰 답글률 98% · 신규고객 +34%</div>
          </div>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', flexShrink: 0,
          }}>⚡</div>
        </div>

        {/* 로그인 카드 */}
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '28px 24px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
          border: '1px solid rgba(49,130,246,0.08)',
        }}>
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#191F28', textAlign: 'center', marginBottom: '6px' }}>
            SNS 계정으로 간편하게 로그인
          </h2>
          <p style={{ fontSize: '13px', color: '#8B95A1', textAlign: 'center', marginBottom: '24px' }}>
            기존 계정으로 바로 시작하세요
          </p>

          {errMsg && (
            <div style={{
              background: '#FFF1F2', border: '1px solid #FCA5A5',
              borderRadius: '10px', padding: '12px 14px',
              marginBottom: '16px', fontSize: '13px', color: '#E11D48',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <span>⚠️</span><span>{errMsg}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

            {/* 카카오 */}
            <a href="/api/oauth/kakao" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              padding: '13px 16px', borderRadius: '12px',
              background: '#FEE500', color: '#191F28',
              fontWeight: 700, fontSize: '15px',
              textDecoration: 'none', border: 'none', cursor: 'pointer',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={function(e){(e.currentTarget as HTMLAnchorElement).style.opacity='0.88'}}
            onMouseLeave={function(e){(e.currentTarget as HTMLAnchorElement).style.opacity='1'}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#191F28">
                <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.7 1.62 5.1 4.08 6.6L5.04 21l4.44-2.94C10.26 18.3 11.1 18.42 12 18.42c5.52 0 10-3.48 10-7.8S17.52 3 12 3z"/>
              </svg>
              카카오로 로그인
            </a>

            {/* 구글 */}
            <a href="/api/oauth/google" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              padding: '13px 16px', borderRadius: '12px',
              background: '#ffffff', color: '#191F28',
              fontWeight: 600, fontSize: '15px',
              textDecoration: 'none', border: '1.5px solid #E5E8EB', cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={function(e){(e.currentTarget as HTMLAnchorElement).style.background='#F8F9FA'}}
            onMouseLeave={function(e){(e.currentTarget as HTMLAnchorElement).style.background='#ffffff'}}>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              구글로 로그인
            </a>

            {/* 네이버 */}
            <a href="/api/oauth/naver" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              padding: '13px 16px', borderRadius: '12px',
              background: '#03C75A', color: '#ffffff',
              fontWeight: 700, fontSize: '15px',
              textDecoration: 'none', border: 'none', cursor: 'pointer',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={function(e){(e.currentTarget as HTMLAnchorElement).style.opacity='0.88'}}
            onMouseLeave={function(e){(e.currentTarget as HTMLAnchorElement).style.opacity='1'}}>
              <span style={{ fontWeight: 900, fontSize: '16px', letterSpacing: '-1px' }}>N</span>
              네이버로 로그인
            </a>

          </div>

          <p style={{ marginTop: '20px', fontSize: '11px', color: '#B0B8C1', textAlign: 'center', lineHeight: 1.5 }}>
            로그인 시 <span style={{ color: '#3182F6' }}>이용약관</span> 및 <span style={{ color: '#3182F6' }}>개인정보처리방침</span>에<br/>동의하는 것으로 간주됩니다.
          </p>
        </div>

        {/* 하단 카피 */}
        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: '#B0B8C1' }}>
          © 2025 Localution · Powered by 하랑마케팅
        </p>
      </div>
    </div>
  )
}
