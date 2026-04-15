'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface Particle {
  top: string
  left: string
  size: number
  delay: string
  dur: string
}

export default function LoginPage() {
  const router = useRouter()
  const [errMsg, setErrMsg] = useState('')
  const [reviewCount, setReviewCount] = useState(0)
  const [newCustomer, setNewCustomer] = useState(0)
  const [liveDot, setLiveDot] = useState(true)
  const [tiltX, setTiltX] = useState(0)
  const [tiltY, setTiltY] = useState(0)
  const [imgOk, setImgOk] = useState(true)

  useEffect(() => {
    // 이미 로그인된 경우 대시보드로
    const hasCookie = document.cookie.split(';').some(function(c) {
      return c.trim().indexOf('localution_session=') === 0 && c.trim().length > 'localution_session='.length
    })
    if (hasCookie) {
      router.replace('/dashboard')
      return
    }

    // URL 에러 파라미터 파싱
    const search = window.location.search
    if (search.indexOf('error=') >= 0) {
      const pairs = search.slice(1).split('&')
      let errVal = ''
      pairs.forEach(function(p) {
        if (p.indexOf('error=') === 0) errVal = decodeURIComponent(p.slice(6))
      })
      if (errVal === 'kakao_denied')       setErrMsg('카카오 로그인이 취소되었습니다.')
      else if (errVal === 'google_denied') setErrMsg('구글 로그인이 취소되었습니다.')
      else if (errVal === 'naver_denied')  setErrMsg('네이버 로그인이 취소되었습니다.')
      else if (errVal === 'kakao_config')  setErrMsg('카카오 설정 오류입니다. 관리자에게 문의하세요.')
      else if (errVal === 'google_config') setErrMsg('구글 설정 오류입니다. 관리자에게 문의하세요.')
      else if (errVal === 'token_failed')  setErrMsg('인증 토큰 발급에 실패했습니다. 다시 시도해주세요.')
      else if (errVal)                     setErrMsg('로그인 중 오류가 발생했습니다. 다시 시도해주세요.')
    }

    // 카운터 애니메이션
    let rv = 0, nc = 0
    const iv = setInterval(function() {
      let done = true
      if (rv < 1284) { rv = rv + 43 > 1284 ? 1284 : rv + 43; setReviewCount(rv); done = false }
      if (nc < 34)   { nc = nc + 1  >   34 ?    34 : nc + 1;  setNewCustomer(nc); done = false }
      if (done) clearInterval(iv)
    }, 25)

    // LIVE 점멸
    const tv = setInterval(function() {
      setLiveDot(function(v) { return !v })
    }, 900)

    return function() { clearInterval(iv); clearInterval(tv) }
  }, [router])

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const cx = e.clientX - rect.left - rect.width / 2
    const cy = e.clientY - rect.top  - rect.height / 2
    setTiltX(cy / rect.height * 10)
    setTiltY(cx / rect.width  * (-10))
  }

  function handleMouseLeave() { setTiltX(0); setTiltY(0) }

  const tiltTransform  = 'perspective(900px) rotateX(' + tiltX + 'deg) rotateY(' + tiltY + 'deg)'
  const tiltTransition = (tiltX === 0 && tiltY === 0)
    ? 'transform 0.5s cubic-bezier(0.23,1,0.32,1)'
    : 'transform 0.1s linear'

  const particles: Particle[] = [
    { top: '12%', left: '7%',  size: 3, delay: '0s',   dur: '8s'  },
    { top: '22%', left: '91%', size: 2, delay: '1.8s', dur: '10s' },
    { top: '38%', left: '14%', size: 4, delay: '3.2s', dur: '7s'  },
    { top: '55%', left: '82%', size: 2, delay: '0.6s', dur: '11s' },
    { top: '68%', left: '23%', size: 3, delay: '2.4s', dur: '9s'  },
    { top: '78%', left: '68%', size: 4, delay: '4.1s', dur: '8s'  },
    { top: '8%',  left: '52%', size: 2, delay: '1.1s', dur: '12s' },
    { top: '48%', left: '96%', size: 3, delay: '3.7s', dur: '9s'  },
  ]

  return (
    <>
      <style>{`
        @keyframes orbMove1 {
          0%,100% { transform: translate(0px,0px) scale(1); }
          33%      { transform: translate(70px,-55px) scale(1.12); }
          66%      { transform: translate(-38px,72px) scale(0.9); }
        }
        @keyframes orbMove2 {
          0%,100% { transform: translate(0px,0px) scale(1.08); }
          33%      { transform: translate(-92px,38px) scale(0.88); }
          66%      { transform: translate(52px,-82px) scale(1.18); }
        }
        @keyframes orbMove3 {
          0%,100% { transform: translate(0px,0px); }
          50%      { transform: translate(48px,52px); }
        }
        @keyframes floatParticle {
          0%   { transform: translateY(0px) translateX(0px); opacity: 0; }
          15%  { opacity: 0.9; }
          80%  { opacity: 0.3; }
          100% { transform: translateY(-115px) translateX(14px); opacity: 0; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0px); }
        }
        @keyframes scanLine {
          0%   { top: -1px; }
          100% { top: 101%; }
        }
        @keyframes shimmerSweep {
          0%   { transform: translateX(-100%) skewX(-15deg); }
          100% { transform: translateX(350%) skewX(-15deg); }
        }
        @keyframes logoGlow {
          0%,100% { filter: drop-shadow(0 0 8px rgba(49,130,246,0.3)); }
          50%      { filter: drop-shadow(0 0 20px rgba(49,130,246,0.65)); }
        }
        @keyframes countGlow {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.75; text-shadow: 0 0 8px currentColor; }
        }
        .login-btn { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .login-btn:hover { transform: translateY(-2px) !important; }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: '#060D1A',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px', position: 'relative', overflow: 'hidden',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}>

        {/* ── 배경 레이어 ── */}
        <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
          <div style={{
            position: 'absolute', width: '660px', height: '660px', borderRadius: '50%',
            top: '-220px', left: '-130px',
            background: 'radial-gradient(circle, rgba(49,130,246,0.17) 0%, transparent 60%)',
            animationName: 'orbMove1', animationDuration: '13s',
            animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite',
          }} />
          <div style={{
            position: 'absolute', width: '560px', height: '560px', borderRadius: '50%',
            bottom: '-170px', right: '-130px',
            background: 'radial-gradient(circle, rgba(99,102,241,0.13) 0%, transparent 60%)',
            animationName: 'orbMove2', animationDuration: '16s',
            animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite',
          }} />
          <div style={{
            position: 'absolute', width: '420px', height: '420px', borderRadius: '50%',
            top: '35%', left: '32%',
            background: 'radial-gradient(circle, rgba(14,165,233,0.09) 0%, transparent 60%)',
            animationName: 'orbMove3', animationDuration: '11s',
            animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite',
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: [
              'linear-gradient(rgba(49,130,246,0.032) 1px, transparent 1px)',
              'linear-gradient(90deg, rgba(49,130,246,0.032) 1px, transparent 1px)',
            ].join(', '),
            backgroundSize: '58px 58px',
          }} />
          {particles.map(function(p, i) {
            return (
              <div key={i} style={{
                position: 'absolute', top: p.top, left: p.left,
                width: String(p.size) + 'px', height: String(p.size) + 'px', borderRadius: '50%',
                background: 'rgba(49,130,246,0.85)',
                boxShadow: '0 0 ' + String(p.size * 3) + 'px rgba(49,130,246,0.5)',
                animationName: 'floatParticle', animationDuration: p.dur,
                animationDelay: p.delay, animationTimingFunction: 'ease-in-out',
                animationIterationCount: 'infinite',
              }} />
            )
          })}
        </div>

        {/* ── 메인 콘텐츠 ── */}
        <div style={{
          width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1,
          animationName: 'fadeInUp', animationDuration: '0.65s',
          animationTimingFunction: 'cubic-bezier(0.23,1,0.32,1)', animationFillMode: 'both',
        }}>

          {/* 로고 */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            {imgOk ? (
              <img
                src="/logo.png" alt="로컬루션"
                style={{
                  height: '56px', width: 'auto', display: 'block', margin: '0 auto',
                  animationName: 'logoGlow', animationDuration: '3s',
                  animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite',
                }}
                onError={function() { setImgOk(false) }}
              />
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '10px', marginBottom: '4px',
              }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #3182F6 0%, #6366F1 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 24px rgba(49,130,246,0.5)',
                }}>
                  <span style={{ color: '#fff', fontWeight: 900, fontSize: '22px' }}>L</span>
                </div>
                <div>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: '#fff', letterSpacing: '-1px' }}>로컬루션</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '1px' }}>AI 마케팅 자동화</div>
                </div>
              </div>
            )}
          </div>

          {/* AI 상태 패널 */}
          <div style={{
            background: 'rgba(49,130,246,0.06)',
            border: '1px solid rgba(49,130,246,0.18)',
            borderRadius: '14px', padding: '14px 16px', marginBottom: '20px',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', left: 0, right: 0, height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(49,130,246,0.5), transparent)',
              animationName: 'scanLine', animationDuration: '3s',
              animationTimingFunction: 'linear', animationIterationCount: 'infinite',
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: liveDot ? '#22D3EE' : 'rgba(34,211,238,0.2)',
                boxShadow: liveDot ? '0 0 7px rgba(34,211,238,0.9)' : 'none',
                transition: 'all 0.3s',
              }} />
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#22D3EE', letterSpacing: '0.08em' }}>LIVE</span>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginLeft: '4px' }}>AI 실시간 현황</span>
            </div>
            <div style={{ display: 'flex', gap: '20px' }}>
              <div>
                <div style={{
                  fontSize: '20px', fontWeight: 800, color: '#60A5FA',
                  animationName: 'countGlow', animationDuration: '2s',
                  animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite',
                }}>
                  {reviewCount >= 1000 ? Math.floor(reviewCount / 1000) + ',' + String(reviewCount % 1000).padStart(3, '0') : String(reviewCount)}
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>오늘 AI 답글</div>
              </div>
              <div style={{ width: '1px', background: 'rgba(255,255,255,0.07)' }} />
              <div>
                <div style={{
                  fontSize: '20px', fontWeight: 800, color: '#34D399',
                  animationName: 'countGlow', animationDuration: '2.3s',
                  animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite',
                }}>
                  +{newCustomer}
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>신규 고객</div>
              </div>
            </div>
          </div>

          {/* 로그인 카드 */}
          <div
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ transform: tiltTransform, transition: tiltTransition }}
          >
            <div style={{
              position: 'relative', overflow: 'hidden',
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
              borderRadius: '24px', padding: '28px 24px',
              border: '1px solid rgba(255,255,255,0.09)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)',
            }}>
              <div style={{
                position: 'absolute', top: 0, bottom: 0, width: '40%',
                background: 'linear-gradient(105deg, transparent, rgba(255,255,255,0.04), transparent)',
                animationName: 'shimmerSweep', animationDuration: '4s', animationDelay: '1.5s',
                animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite',
                pointerEvents: 'none',
              }} />

              <h2 style={{
                fontSize: '17px', fontWeight: 700, color: 'rgba(255,255,255,0.92)',
                textAlign: 'center', marginBottom: '6px', letterSpacing: '-0.2px',
              }}>
                SNS 계정으로 간편하게 로그인
              </h2>
              <p style={{
                fontSize: '13px', color: 'rgba(255,255,255,0.36)',
                textAlign: 'center', marginBottom: '22px',
              }}>
                기존 계정으로 바로 시작하세요
              </p>

              {errMsg !== '' && (
                <div style={{
                  background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: '10px', padding: '12px 14px', marginBottom: '16px',
                  fontSize: '13px', color: '#FCA5A5',
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  <span>⚠️</span><span>{errMsg}</span>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <a href="/api/oauth/kakao" className="login-btn" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  padding: '14px 16px', borderRadius: '14px',
                  background: '#FEE500', color: '#191F28',
                  fontWeight: 700, fontSize: '15px', textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(254,229,0,0.25)',
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#191F28">
                    <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.7 1.62 5.1 4.08 6.6L5.04 21l4.44-2.94C10.26 18.3 11.1 18.42 12 18.42c5.52 0 10-3.48 10-7.8S17.52 3 12 3z"/>
                  </svg>
                  카카오로 로그인
                </a>

                <a href="/api/oauth/google" className="login-btn" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  padding: '14px 16px', borderRadius: '14px',
                  background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.88)',
                  fontWeight: 600, fontSize: '15px', textDecoration: 'none',
                  border: '1px solid rgba(255,255,255,0.12)',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  구글로 로그인
                </a>

                <a href="/api/oauth/naver" className="login-btn" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  padding: '14px 16px', borderRadius: '14px',
                  background: '#03C75A', color: '#ffffff',
                  fontWeight: 700, fontSize: '15px', textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(3,199,90,0.25)',
                }}>
                  <span style={{ fontWeight: 900, fontSize: '16px', letterSpacing: '-1px' }}>N</span>
                  네이버로 로그인
                </a>
              </div>

              <p style={{
                marginTop: '20px', fontSize: '11px', color: 'rgba(255,255,255,0.2)',
                textAlign: 'center', lineHeight: '1.7',
              }}>
                로그인 시 이용약관 및 개인정보처리방침에 동의합니다
              </p>
            </div>
          </div>

          <p style={{ textAlign: 'center', marginTop: '22px', fontSize: '11px', color: 'rgba(255,255,255,0.15)' }}>
            © 2025 Localution · Powered by 하랑마케팅
          </p>
        </div>
      </div>
    </>
  )
}
