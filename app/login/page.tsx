'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Particle {
  top: string
  left: string
  size: number
  delay: string
  dur: string
}

export default function LoginPage() {
  const router = useRouter()
  const [errMsg, setErrMsg]         = useState('')
  const [reviewCount, setReviewCount] = useState(0)
  const [newCustomer, setNewCustomer] = useState(0)
  const [liveDot, setLiveDot]       = useState(true)
  const [tiltX, setTiltX]           = useState(0)
  const [tiltY, setTiltY]           = useState(0)
  const [imgOk, setImgOk]           = useState(true)

  useEffect(function() {
    try {
      const hasCookie = document.cookie.split(';').some(function(c) {
        const t = c.trim()
        return t.indexOf('localution_session=') === 0 && t.length > 'localution_session='.length
      })
      if (hasCookie) { window.location.href = '/dashboard'; return }
    } catch (_) {}

    try {
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
        else if (errVal === 'token_failed')  setErrMsg('인증 토큰 발급에 실패했습니다. 다시 시도해주세요.')
        else if (errVal)                     setErrMsg('로그인 중 오류가 발생했습니다. 다시 시도해주세요.')
      }
    } catch (_) {}
  }, [])

  const handleMouseMove = function(e) {
    if (typeof window === 'undefined') return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const rotX = (y - centerY) / 20
    const rotY = (centerX - x) / 20
    setTiltX(rotX)
    setTiltY(rotY)
  }

  const handleMouseLeave = function() {
    setTiltX(0)
    setTiltY(0)
  }

  const particles = []
  for (let i = 0; i < 30; i++) {
    particles.push({
      top: Math.random() * 100 + '%',
      left: Math.random() * 100 + '%',
      size: Math.random() * 3 + 1,
      delay: (Math.random() * 5) + 's',
      dur: (Math.random() * 20 + 10) + 's'
    })
  }

  return (
    <div className='loginContainer' onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes orbitGrad {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes floatParticle {
          0% { opacity: 0; transform: translateY(100vh) translateX(0); }
          5% { opacity: 1; }
          95% { opacity: 1; }
          100% { opacity: 0; transform: translateY(-100vh) translateX(100px); }
        }
        @keyframes shimmerSweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes scanLine {
          0% { transform: translateY(-100%); opacity: 0; }
          20% { opacity: 0.8; }
          80% { opacity: 0.8; }
          100% { transform: translateY(100%); opacity: 0; }
        }
        @keyframes dashboardFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes chatBubbleTyping {
          0%, 60% { width: 0; }
          100% { width: 60px; }
        }
        @keyframes metricPulse {
          0%, 100% { transform: scale(1) translateY(0); }
          50% { transform: scale(1.05) translateY(-10px); }
        }
        @keyframes fadeInUp {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes buttonHover {
          0% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
          100% { transform: translateY(0); }
        }

        body, html {
          margin: 0;
          padding: 0;
          background: #060D1A;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          overflow: hidden;
        }

        .loginContainer {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #060D1A 0%, #0f1e3c 50%, #060D1A 100%);
          background-size: 200% 200%;
          animation: orbitGrad 15s ease infinite;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .particleContainer {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .particle {
          position: absolute;
          background: rgba(59, 130, 246, 0.6);
          border-radius: 50%;
          pointer-events: none;
        }

        .mainWrapper {
          display: flex;
          gap: 0;
          width: 100%;
          max-width: 1400px;
          height: 100vh;
          max-height: 100vh;
          position: relative;
          z-index: 10;
        }

        .leftSide {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          perspective: 1200px;
          min-height: 100vh;
        }

        .dashboardScene {
          position: relative;
          width: 400px;
          height: 500px;
          perspective: 1000px;
          animation: dashboardFloat 6s ease-in-out infinite;
        }

        .isometricCard {
          position: absolute;
          width: 280px;
          height: 320px;
          background: linear-gradient(135deg, rgba(30, 58, 138, 0.3) 0%, rgba(59, 130, 246, 0.1) 100%);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 20px;
          backdrop-filter: blur(10px);
          box-shadow: 0 20px 60px rgba(59, 130, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          transform: rotateX(5deg) rotateY(-15deg) rotateZ(2deg);
          padding: 24px;
          color: #fff;
        }

        .cardHeader {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
        }

        .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .dot-red { background: #ef4444; }
        .dot-yellow { background: #eab308; }
        .dot-green { background: #22c55e; animation: metricPulse 2s ease-in-out infinite; }

        .cardTitle {
          font-size: 13px;
          font-weight: 600;
          color: #94a3b8;
          margin-bottom: 16px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .dashboardContent {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .metricRow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid rgba(59, 130, 246, 0.1);
          animation: metricPulse 3s ease-in-out infinite;
        }

        .metricRow:nth-child(2) { animation-delay: 0.3s; }
        .metricRow:nth-child(3) { animation-delay: 0.6s; }

        .metricLabel {
          font-size: 12px;
          color: #cbd5e1;
        }

        .metricValue {
          font-size: 14px;
          font-weight: 700;
          color: #38bdf8;
        }

        .scanLineEffect {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: rgba(56, 189, 248, 0.8);
          animation: scanLine 4s linear infinite;
        }

        .chatBubble {
          position: absolute;
          bottom: 20px;
          right: 20px;
          background: rgba(15, 30, 60, 0.8);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 12px;
          color: #cbd5e1;
          max-width: 150px;
          animation: fadeInUp 0.8s ease 0.5s backwards;
        }

        .rightSide {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 20px;
        }

        .loginCard {
          width: 100%;
          max-width: 380px;
          background: linear-gradient(135deg, rgba(30, 58, 138, 0.2) 0%, rgba(59, 130, 246, 0.05) 100%);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 24px;
          backdrop-filter: blur(20px);
          padding: 40px 32px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          animation: fadeInUp 0.8s ease;
          transform: perspective(1200px) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg));
          transition: transform 0.1s ease-out;
        }

        .logoSection {
          text-align: center;
          margin-bottom: 32px;
        }

        .logo {
          width: 48px;
          height: 48px;
          margin: 0 auto 16px;
          display: block;
          filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.3));
        }

        .logoFallback {
          width: 48px;
          height: 48px;
          margin: 0 auto 16px;
          background: linear-gradient(135deg, #3b82f6 0%, #0ea5e9 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: #fff;
          font-size: 20px;
        }

        .tagline {
          font-size: 14px;
          color: #94a3b8;
          margin-top: 12px;
          letter-spacing: 0.3px;
        }

        .loginTitle {
          font-size: 24px;
          font-weight: 700;
          color: #fff;
          text-align: center;
          margin-bottom: 24px;
        }

        .socialButtonsContainer {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 24px;
        }

        .socialButton {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 12px 16px;
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          text-decoration: none;
          color: #fff;
        }

        .socialButton:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(59, 130, 246, 0.2);
          border-color: rgba(59, 130, 246, 0.4);
        }

        .socialButton:active {
          transform: translateY(0);
        }

        .kakaoButton {
          background: #FEE500;
          color: #000;
          border: 1px solid #FEE500;
          font-weight: 600;
        }

        .kakaoButton:hover {
          background: #fdd537;
          box-shadow: 0 8px 20px rgba(254, 229, 0, 0.3);
        }

        .naverButton {
          background: #03C75A;
          color: #fff;
          border: 1px solid #03C75A;
          font-weight: 600;
        }

        .naverButton:hover {
          background: #02a84a;
          box-shadow: 0 8px 20px rgba(3, 199, 90, 0.3);
        }

        .googleButton {
          background: rgba(59, 130, 246, 0.1);
          color: #cbd5e1;
          border: 1px solid rgba(59, 130, 246, 0.3);
        }

        .googleButton:hover {
          background: rgba(59, 130, 246, 0.2);
          box-shadow: 0 8px 20px rgba(59, 130, 246, 0.2);
          border-color: rgba(59, 130, 246, 0.5);
        }

        .socialIcon {
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .errorMessage {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #fca5a5;
          padding: 12px;
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 20px;
          text-align: center;
          animation: fadeInUp 0.4s ease;
        }

        .footer {
          margin-top: 24px;
          text-align: center;
          font-size: 12px;
          color: #64748b;
          line-height: 1.6;
        }

        .footer a {
          color: #3b82f6;
          text-decoration: none;
          transition: color 0.2s;
        }

        .footer a:hover {
          color: #0ea5e9;
        }

        @media (max-width: 1200px) {
          .mainWrapper {
            flex-direction: column;
            height: auto;
          }

          .leftSide {
            display: none;
          }

          .rightSide {
            width: 100%;
            min-height: 100vh;
          }
        }

        @media (max-width: 640px) {
          .loginCard {
            max-width: 100%;
            padding: 32px 20px;
            margin: 0 16px;
          }

          .loginTitle {
            font-size: 20px;
          }

          .socialButton {
            padding: 10px 12px;
            font-size: 13px;
          }

          .socialIcon {
            width: 16px;
            height: 16px;
          }
        }
      `}} />

      <div className='particleContainer'>
        {particles.map(function(p, idx) {
          return (
            <div
              key={idx}
              className='particle'
              style={{
                top: p.top,
                left: p.left,
                width: p.size + 'px',
                height: p.size + 'px',
                animation: `floatParticle ${p.dur} linear ${p.delay} infinite`
              }}
            />
          )
        })}
      </div>

      <div className='mainWrapper'>
        <div className='leftSide'>
          <div className='dashboardScene'>
            <div className='isometricCard'>
              <div className='cardHeader'>
                <div className='dot dot-red' />
                <div className='dot dot-yellow' />
                <div className='dot dot-green' />
              </div>
              <div className='cardTitle'>Dashboard</div>
              <div className='dashboardContent'>
                <div className='metricRow'>
                  <span className='metricLabel'>Reviews</span>
                  <span className='metricValue'>{reviewCount}</span>
                </div>
                <div className='metricRow'>
                  <span className='metricLabel'>New Customers</span>
                  <span className='metricValue'>{newCustomer}</span>
                </div>
                <div className='metricRow'>
                  <span className='metricLabel'>Status</span>
                  <span className='metricValue' style={{color: liveDot ? '#22c55e' : '#94a3b8'}}>
                    {liveDot ? 'Active' : 'Idle'}
                  </span>
                </div>
              </div>
              <div className='scanLineEffect' />
              <div className='chatBubble'>
                AI가 자동으로 처리 중...
              </div>
            </div>
          </div>
        </div>

        <div className='rightSide'>
          <div
            className='loginCard'
            style={{
              '--tilt-x': tiltX + 'deg',
              '--tilt-y': tiltY + 'deg'
            } as any}
          >
            <div className='logoSection'>
              <img
                src='/logo.png'
                alt='Localution'
                className='logo'
                onError={function() { setImgOk(false) }}
                style={{display: imgOk ? 'block' : 'none'}}
              />
              {!imgOk && <div className='logoFallback'>로</div>}
              <div className='tagline'>
                AI가 사장님의 비즈니스를 관리합니다
              </div>
            </div>

            <h1 className='loginTitle'>로그인</h1>

            {errMsg && <div className='errorMessage'>{errMsg}</div>}

            <div className='socialButtonsContainer'>
              <a href='/api/oauth/kakao' className='socialButton kakaoButton'>
                <svg className='socialIcon' viewBox='0 0 24 24' fill='currentColor'>
                  <path d='M12 2C6.48 2 2 5.58 2 10c0 2.54 1.19 4.85 3.15 6.37L4.24 22l4.37-2.29c1.53.3 3.15.46 4.82.46 5.52 0 10-3.58 10-8s-4.48-8-10-8z'/>
                </svg>
                카카오로 시작
              </a>
              <a href='/api/oauth/naver' className='socialButton naverButton'>
                <svg className='socialIcon' viewBox='0 0 24 24' fill='currentColor'>
                  <rect width='24' height='24' rx='4'/>
                  <text x='50%' y='50%' textAnchor='middle' dy='.3em' fill='white' fontSize='16' fontWeight='700'>N</text>
                </svg>
                네이버로 시작
              </a>
              <a href='/api/oauth/google' className='socialButton googleButton'>
                <svg className='socialIcon' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                  <circle cx='12' cy='12' r='10'/>
                  <path d='M12 8v8M8 12h8'/>
                </svg>
                Google로 시작
              </a>
            </div>

            <div className='footer'>
              © 2025 Localution<br/>
              Powered by 하랑마케팅
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
