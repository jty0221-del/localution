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
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: 'linear-gradient(160deg, #0F172A 0%, #1E3A5F 50%, #0F172A 100%)' }}>

      {/* CSS 애니메이션 키프레임 */}
      <style dangerouslySetInnerHTML={{ __html: [
        '@keyframes float3d {',
        '  0%,100% { transform: perspective(900px) rotateX(6deg) rotateY(-10deg) translateY(0px); }',
        '  33%     { transform: perspective(900px) rotateX(-4deg) rotateY(12deg) translateY(-10px); }',
        '  66%     { transform: perspective(900px) rotateX(8deg) rotateY(6deg) translateY(-6px); }',
        '}',
        '@keyframes pulseGreen {',
        '  0%,100% { box-shadow: 0 0 0 0 rgba(74,222,128,0.6); }',
        '  50%      { box-shadow: 0 0 0 6px rgba(74,222,128,0); }',
        '}',
        '@keyframes shimmer {',
        '  0%   { background-position: -200% center; }',
        '  100% { background-position: 200% center; }',
        '}',
        '@keyframes fadeUp {',
        '  from { opacity:0; transform:translateY(20px); }',
        '  to   { opacity:1; transform:translateY(0); }',
        '}',
      ].join(' ') }} />

      <div className="w-full max-w-sm" style={{ animation: 'fadeUp 0.6s ease both' }}>

        {/* 로고 */}
        <div className="text-center mb-6">
          <img src="/logo.png" alt="로컬루션" style={{ height: '48px', width: 'auto', margin: '0 auto', filter: 'brightness(0) invert(1)' }} />
        </div>

        {/* 3D 플로팅 애니메이션 카드 */}
        <div style={{ marginBottom: '20px', animation: 'float3d 7s ease-in-out infinite', transformStyle: 'preserve-3d' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(49,130,246,0.9) 0%, rgba(27,100,218,0.95) 100%)',
            borderRadius: '20px', padding: '20px 22px 18px', color: 'white',
            position: 'relative', overflow: 'hidden',
            boxShadow: '0 25px 50px rgba(49,130,246,0.35), 0 0 0 1px rgba(255,255,255,0.1)',
            backdropFilter: 'blur(20px)',
          }}>
            <div style={{ position:'absolute', top:'-30px', right:'-20px', width:'130px', height:'130px', background:'rgba(255,255,255,0.07)', borderRadius:'50%', pointerEvents:'none' }} />
            <div style={{ position:'absolute', bottom:'-40px', left:'-15px', width:'100px', height:'100px', background:'rgba(255,255,255,0.04)', borderRadius:'50%', pointerEvents:'none' }} />

            <p style={{ fontSize:'11px', opacity:0.8, marginBottom:'14px', fontWeight:700, letterSpacing:'0.05em', textTransform:'uppercase' }}>
              AI 자동 운영 현황 · 이번 달
            </p>

            <div style={{ display:'flex', alignItems:'center', gap:'0', marginBottom:'14px' }}>
              {[
                { val:'98%',  label:'리뷰 답글률' },
                { val:'+34%', label:'신규 고객' },
                { val:'+23%', label:'매출 증가' },
              ].map(function(item, i) { return (
                <div key={item.label} style={{ flex:1, textAlign:'center', position:'relative' }}>
                  {i > 0 && <div style={{ position:'absolute', left:0, top:'10%', height:'80%', width:'1px', background:'rgba(255,255,255,0.2)' }} />}
                  <div style={{ fontSize:'26px', fontWeight:900, lineHeight:1, letterSpacing:'-0.02em' }}>{item.val}</div>
                  <div style={{ fontSize:'10px', opacity:0.75, marginTop:'4px', fontWeight:600 }}>{item.label}</div>
                </div>
              )})}
            </div>

            <div style={{
              display:'flex', alignItems:'center', gap:'8px',
              background:'rgba(0,0,0,0.25)', borderRadius:'10px', padding:'8px 12px',
            }}>
              <div style={{
                width:'8px', height:'8px', borderRadius:'50%', background:'#4ADE80', flexShrink:0,
                animation: 'pulseGreen 1.8s ease-in-out infinite',
              }} />
              <span style={{ fontSize:'11px', fontWeight:700, opacity:0.95 }}>AI가 지금 이 순간도 운영 중</span>
              <span style={{
                marginLeft:'auto', fontSize:'10px', fontWeight:800, padding:'2px 8px',
                background: 'linear-gradient(90deg, #60A5FA, #A78BFA, #60A5FA)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'shimmer 2.5s linear infinite',
              }}>LIVE</span>
            </div>
          </div>
        </div>

        {/* 로그인 카드 */}
        <div style={{ background:'rgba(255,255,255,0.05)', backdropFilter:'blur(20px)', borderRadius:'24px', padding:'28px', border:'1px solid rgba(255,255,255,0.1)', boxShadow:'0 20px 40px rgba(0,0,0,0.3)' }}>

          <h2 style={{ fontSize:'18px', fontWeight:900, color:'white', textAlign:'center', marginBottom:'4px' }}>시작하기</h2>
          <p style={{ fontSize:'13px', color:'rgba(255,255,255,0.5)', textAlign:'center', marginBottom:'22px' }}>SNS 계정으로 간편하게 로그인</p>

          {errMsg && (
            <div style={{ marginBottom:'16px', padding:'12px', borderRadius:'12px', background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', fontSize:'13px', color:'#FCA5A5', textAlign:'center' }}>
              {errMsg}
            </div>
          )}

          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>

            {/* 카카오 */}
            <a href="/api/oauth/kakao" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', padding:'14px', borderRadius:'14px', background:'#FEE500', color:'#191F28', fontWeight:800, fontSize:'14px', textDecoration:'none', transition:'opacity 0.2s', boxShadow:'0 4px 15px rgba(254,229,0,0.3)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#191F28">
                <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.717 1.643 5.112 4.132 6.548l-1.05 3.888c-.09.337.303.606.595.399l4.6-3.057c.569.078 1.147.12 1.723.12 5.523 0 10-3.477 10-7.8C22 6.477 17.523 3 12 3z"/>
              </svg>
              카카오로 로그인
            </a>

            {/* 구글 */}
            <a href="/api/oauth/google" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', padding:'14px', borderRadius:'14px', background:'white', color:'#191F28', fontWeight:800, fontSize:'14px', textDecoration:'none', boxShadow:'0 4px 15px rgba(0,0,0,0.2)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              구글로 로그인
            </a>

            {/* 네이버 */}
            <a href="/api/oauth/naver" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', padding:'14px', borderRadius:'14px', background:'#03C75A', color:'white', fontWeight:800, fontSize:'14px', textDecoration:'none', boxShadow:'0 4px 15px rgba(3,199,90,0.3)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z"/>
              </svg>
              네이버로 로그인
            </a>

          </div>

          <p style={{ marginTop:'20px', paddingTop:'20px', borderTop:'1px solid rgba(255,255,255,0.08)', fontSize:'11px', color:'rgba(255,255,255,0.3)', textAlign:'center', lineHeight:'1.7' }}>
            로그인 시{' '}
            <a href="#" style={{ color:'rgba(99,179,237,0.8)' }}>이용약관</a>{' '}및{' '}
            <a href="#" style={{ color:'rgba(99,179,237,0.8)' }}>개인정보처리방침</a>에
            동의하는 것으로 간주됩니다.
          </p>
        </div>

      </div>
    </div>
  )
}
