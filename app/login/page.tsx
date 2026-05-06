'use client'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

export default function LoginPage() {
 const cardRef = useRef<HTMLDivElement>(null)
 const [error, setError] = useState('')
 const [counters, setCounters] = useState({ visitors: 0, reviews: 0, rank: 0 })
 // 회원가입 모드 여부 (/signup → /login?mode=signup 로 rewrite 되거나, 직접 쿼리로 접근)
 const [isSignup, setIsSignup] = useState(false)
 // 다른 계정으로 로그인 (네이버/카카오/구글에 reset 쿼리 전달 — 계정 선택/재로그인 강제)
 const [useDifferentAccount, setUseDifferentAccount] = useState(false)
 const oauthQuery = useDifferentAccount ? '?reset=1' : ''

 // 모바일 상단 — 실시간 데이터 (단조 증가, 영속, 절대 내려가지 않음)
 //   · 사장님 수: 142명에서 시작 (출시 시점), 매우 느린 자연 증가
 //   · 새로고침해도 localStorage 에 저장된 마지막 값 + 시간 경과분 합산 → 내려가지 않음
 //   · 다른 기기에서도 동일하게 보이도록 base 는 출시일 기준 deterministic 계산
 const LAUNCH_TS = new Date('2026-05-06T00:00:00+09:00').getTime()
 const STATS_KEY = 'localution.live_stats_v1'

 // 출시일 기준 시간 경과 → deterministic owners count
 //   하루에 평균 0.8명, 30분에 0.017명 ≒ 30분에 0~1명 (느린 자연 증가)
 function computeBaseOwners(now: number) {
 const minutesSinceLaunch = Math.max(0, (now - LAUNCH_TS) / 60000)
 // 하루 = 1440분, 하루 0.8명 → 분당 0.000556
 // floor 적용하면 ~28시간마다 +1 자연증가
 return 142 + Math.floor(minutesSinceLaunch / (1440 / 0.8))
 }
 function computeBaseReviews(now: number) {
 const minutesSinceLaunch = Math.max(0, (now - LAUNCH_TS) / 60000)
 // 하루 ~12건씩 — 분당 0.0083
 return 12 + Math.floor(minutesSinceLaunch * 0.0083)
 }
 function computeBaseTotalReplies(now: number) {
 const minutesSinceLaunch = Math.max(0, (now - LAUNCH_TS) / 60000)
 return 384 + Math.floor(minutesSinceLaunch * 0.5)
 }

 const [liveStats, setLiveStats] = useState(() => {
 // SSR 에서는 LAUNCH_TS 기준값만 (Date.now 차이로 hydration mismatch 방지)
 const baseTs = LAUNCH_TS
 return {
 owners: computeBaseOwners(baseTs),
 reviewsToday: computeBaseReviews(baseTs),
 avgRatingLift: 0.6,
 keywordRank: 3,
 monthlyReplies: computeBaseTotalReplies(baseTs),
 placesTracked: computeBaseOwners(baseTs),
 }
 })

 useEffect(() => {
 // 페이지 로드 시: localStorage 저장값 vs 현재 시간 기준값 중 큰 쪽 채택 (단조 증가 보장)
 function pullStats() {
 const now = Date.now()
 let saved: any = {}
 try { saved = JSON.parse(localStorage.getItem(STATS_KEY) || '{}') } catch {}
 const next = {
 owners: Math.max(saved.owners || 0, computeBaseOwners(now)),
 reviewsToday: Math.max(saved.reviewsToday || 0, computeBaseReviews(now)),
 avgRatingLift: 0.6,
 keywordRank: 3,
 monthlyReplies: Math.max(saved.monthlyReplies || 0, computeBaseTotalReplies(now)),
 placesTracked: Math.max(saved.placesTracked || 0, computeBaseOwners(now)),
 }
 setLiveStats(next)
 try { localStorage.setItem(STATS_KEY, JSON.stringify(next)) } catch {}
 }
 pullStats()
 // 매 30초마다 자연 증가분만 반영 (단조 증가만 — 절대 감소 X)
 //   사장님: ~28시간마다 +1, 답글: 30초마다 ~0.25 → 가끔 +1
 //   페이지를 오래 열어둬도 너무 자주 안 변하도록
 const t = setInterval(() => {
 setLiveStats(prev => {
 const now = Date.now()
 // 누적 답글은 약 2분에 +1 페이스 — 살아있는 느낌
 const nudgeReplies = Math.random() < 0.25 ? 1 : 0
 // 오늘 답글은 약 5분에 +1 페이스
 const nudgeToday = Math.random() < 0.1 ? 1 : 0
 const next = {
 ...prev,
 // 사장님은 base 가 시간으로 자연 증가하므로 별도 nudge 안 함 — 새로고침으로 갱신
 owners: Math.max(prev.owners, computeBaseOwners(now)),
 reviewsToday: Math.max(prev.reviewsToday + nudgeToday, computeBaseReviews(now)),
 monthlyReplies: Math.max(prev.monthlyReplies + nudgeReplies, computeBaseTotalReplies(now)),
 placesTracked: Math.max(prev.placesTracked, computeBaseOwners(now)),
 }
 try { localStorage.setItem(STATS_KEY, JSON.stringify(next)) } catch {}
 return next
 })
 }, 30000)
 return () => clearInterval(t)
 }, [])

 useEffect(function() {
 const params = new URLSearchParams(window.location.search)
 setIsSignup(params.get('mode') === 'signup')
 const err = params.get('error')
 if (err === 'naver_denied') setError('네이버 로그인이 취소되었습니다.')
 else if (err === 'kakao_denied') setError('카카오 로그인이 취소되었습니다.')
 else if (err === 'google_denied') setError('Google 로그인이 취소되었습니다.')
 else if (err) setError('로그인 중 오류가 발생했습니다. 다시 시도해 주세요.')
 }, [])

 useEffect(function() {
 const cookies = document.cookie
 if (cookies.indexOf('localution_session=') !== -1) {
 // Hotfix 2026-04-21: redirect 쿼리 파라미터를 우선 처리
 // · 기존: 무조건 /dashboard 로 보냄 → 카카오 OAuth 도중 /login 거치면 /dashboard 튕김
 // · 수정: ?redirect=<path> 가 있으면 거기로, 없으면 /dashboard
 const params = new URLSearchParams(window.location.search)
 const redirect = params.get('redirect')
 // 보안: open redirect 방지 — 같은 출처 path 만 허용
 const safe = redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/dashboard'
 window.location.href = safe
 }
 }, [])

 useEffect(function() {
 const targets = { visitors: 2847, reviews: 142, rank: 3 }
 const duration = 2000
 const steps = 60
 const interval = duration / steps
 let step = 0
 const timer = setInterval(function() {
 step++
 const progress = step / steps
 const eased = 1 - Math.pow(1 - progress, 3)
 setCounters({
 visitors: Math.round(targets.visitors * eased),
 reviews: Math.round(targets.reviews * eased),
 rank: Math.round(targets.rank * eased),
 })
 if (step >= steps) clearInterval(timer)
 }, interval)
 return function() { clearInterval(timer) }
 }, [])

 useEffect(function() {
 var card = cardRef.current
 if (!card) return
 function handleMove(e: MouseEvent) {
 if (!card) return
 var rect = card.getBoundingClientRect()
 var x = (e.clientX - rect.left) / rect.width - 0.5
 var y = (e.clientY - rect.top) / rect.height - 0.5
 card.style.setProperty('--tilt-x', (y * -6) + 'deg')
 card.style.setProperty('--tilt-y', (x * 6) + 'deg')
 }
 function handleLeave() {
 if (!card) return
 card.style.setProperty('--tilt-x', '0deg')
 card.style.setProperty('--tilt-y', '0deg')
 }
 card.addEventListener('mousemove', handleMove)
 card.addEventListener('mouseleave', handleLeave)
 return function() {
 if (!card) return
 card.removeEventListener('mousemove', handleMove)
 card.removeEventListener('mouseleave', handleLeave)
 }
 }, [])

 return (
 <div className='loginContainer'>
 <style>{`
 @keyframes orbitGrad { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
 @keyframes floatUp { 0% { opacity:0; transform: translateY(40px); } 100% { opacity:1; transform: translateY(0); } }
 @keyframes fadeInUp { 0% { opacity:0; transform: translateY(30px); } 100% { opacity:1; transform: translateY(0); } }
 @keyframes growBar { 0% { height: 0; } 100% { height: var(--bar-h); } }
 @keyframes drawLine { 0% { stroke-dashoffset: 800; } 100% { stroke-dashoffset: 0; } }
 @keyframes slideUp { 0% { transform: translateY(20px); opacity:0; } 100% { transform: translateY(0); opacity:1; } }
 @keyframes floatCard { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
 @keyframes countUp { 0% { opacity:0; transform: scale(0.8); } 100% { opacity:1; transform: scale(1); } }
 @keyframes arrowBounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
 @keyframes particleFloat { 0% { opacity:0; transform: translateY(100vh) translateX(0); } 10% { opacity:0.6; } 90% { opacity:0.6; } 100% { opacity:0; transform: translateY(-100vh) translateX(80px); } }
 @keyframes glowPulse { 0%,100% { box-shadow: 0 0 20px rgba(59,130,246,0.1); } 50% { box-shadow: 0 0 40px rgba(59,130,246,0.2); } }

 body, html { margin:0; padding:0; background:#060D1A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; overflow-x:hidden; }
 /* 데스크톱: 풀스크린 고정 / 모바일: 자연 스크롤 허용 (loginCard 가 길어도 안 잘림) */
 .loginContainer { position:fixed; top:0; left:0; width:100%; height:100%; background: linear-gradient(135deg, #060D1A 0%, #0f1e3c 50%, #060D1A 100%); background-size: 200% 200%; animation: orbitGrad 15s ease infinite; display:flex; align-items:center; justify-content:center; overflow:hidden; }
 @media (max-width: 1100px) {
 /* 모바일: 위→아래 column 으로 stacking, 자연 스크롤 + safe-area */
 .loginContainer { position:relative; height:auto; min-height:100vh; flex-direction:column; align-items:stretch; justify-content:flex-start; overflow-y:auto; overflow-x:hidden; padding:0; }
 }
 .particles { position:absolute; width:100%; height:100%; pointer-events:none; overflow:hidden; }
 .p { position:absolute; border-radius:50%; pointer-events:none; }

 .mainWrap { display:flex; gap:0; width:100%; max-width:1400px; height:100vh; position:relative; z-index:10; }
 .leftArea { flex:1; display:flex; align-items:center; justify-content:center; padding:40px; }
 .rightArea { flex:1; display:flex; align-items:center; justify-content:center; padding:20px; }

 .growthScene { width:100%; max-width:520px; animation: floatUp 1s ease 0.3s backwards; }
 .heroTitle { font-size:28px; font-weight:800; color:#fff; margin-bottom:6px; line-height:1.4; }
 .heroSub { font-size:15px; color:#94a3b8; margin-bottom:32px; line-height:1.7; }
 .heroHighlight { color:#3b82f6; }

 .graphCard { background: rgba(255,255,255,0.03); border:1px solid rgba(59,130,246,0.12); border-radius:20px; padding:28px; margin-bottom:20px; animation: floatCard 6s ease-in-out infinite, glowPulse 4s ease infinite; }
 .graphHeader { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
 .graphLabel { font-size:14px; color:#94a3b8; }
 .graphBadge { background:rgba(34,197,94,0.12); color:#22c55e; padding:4px 12px; border-radius:20px; font-size:13px; font-weight:600; display:flex; align-items:center; gap:4px; }
 .graphBadge svg { animation: arrowBounce 1.5s ease infinite; }

 .barChart { display:flex; align-items:flex-end; gap:8px; height:120px; margin-top:16px; }
 .bar { flex:1; border-radius:6px 6px 2px 2px; animation: growBar 1.2s ease forwards; height:0; position:relative; }
 .barLabel { position:absolute; bottom:-20px; left:50%; transform:translateX(-50%); font-size:10px; color:#64748b; white-space:nowrap; }

 .lineGraph { width:100%; height:100px; }

 .statCards { display:grid; grid-template-columns: repeat(3,1fr); gap:12px; margin-bottom:20px; }
 .statCard { background:rgba(255,255,255,0.03); border:1px solid rgba(59,130,246,0.08); border-radius:14px; padding:16px; text-align:center; animation: slideUp 0.6s ease backwards; }
 .statCard:nth-child(1) { animation-delay: 0.2s; }
 .statCard:nth-child(2) { animation-delay: 0.4s; }
 .statCard:nth-child(3) { animation-delay: 0.6s; }
 .statNum { font-size:22px; font-weight:800; color:#fff; margin-bottom:4px; animation: countUp 0.8s ease backwards; }
 .statLabel { font-size:12px; color:#64748b; }
 .statChange { font-size:11px; color:#22c55e; margin-top:4px; }

 .trustRow { display:flex; align-items:center; gap:12px; }
 .trustDots { display:flex; }
 .trustDot { width:28px; height:28px; border-radius:50%; border:2px solid #0f1e3c; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; color:#fff; margin-left:-8px; }
 .trustDot:first-child { margin-left:0; }
 .trustText { font-size:13px; color:#64748b; }
 .trustText strong { color:#3b82f6; }

 .loginCard { width:100%; max-width:400px; background: linear-gradient(135deg, rgba(30,58,138,0.2) 0%, rgba(59,130,246,0.05) 100%); border:1px solid rgba(59,130,246,0.2); border-radius:24px; backdrop-filter:blur(20px); padding:44px 36px; box-shadow: 0 20px 60px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1); animation: fadeInUp 0.8s ease; transform: perspective(1200px) rotateX(var(--tilt-x,0deg)) rotateY(var(--tilt-y,0deg)); transition: transform 0.1s ease-out; }
 .logoSection { text-align:center; margin-bottom:32px; }
 .logoImg { width:52px; height:52px; margin:0 auto 14px; display:block; filter: drop-shadow(0 0 10px rgba(59,130,246,0.3)); border-radius:12px; }
 .brandName { font-size:22px; font-weight:800; color:#fff; margin-bottom:4px; }
 .tagline { font-size:13px; color:#94a3b8; }
 .loginTitle { font-size:22px; font-weight:700; color:#fff; text-align:center; margin-bottom:28px; }

 .socialBtns { display:flex; flex-direction:column; gap:12px; margin-bottom:24px; }
 .sBtn { display:flex; align-items:center; justify-content:center; gap:10px; padding:14px 16px; border-radius:12px; font-size:15px; font-weight:600; cursor:pointer; transition:all 0.3s cubic-bezier(0.4,0,0.2,1); text-decoration:none; border:none; }
 .sBtn:hover { transform:translateY(-2px); }
 .sBtn:active { transform:translateY(0); }

 .kakaoBtn { background:#FEE500; color:#191919; }
 .kakaoBtn:hover { background:#fdd835; box-shadow: 0 8px 24px rgba(254,229,0,0.25); }
 .naverBtn { background:#03C75A; color:#fff; }
 .naverBtn:hover { background:#02b050; box-shadow: 0 8px 24px rgba(3,199,90,0.25); }
 .googleBtn { background:#fff; color:#333; border:1px solid #dadce0; }
 .googleBtn:hover { background:#f8f9fa; box-shadow: 0 8px 24px rgba(0,0,0,0.1); }

 .sIcon { width:20px; height:20px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }

 .errMsg { background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); color:#fca5a5; padding:12px; border-radius:10px; font-size:13px; margin-bottom:20px; text-align:center; animation: fadeInUp 0.4s ease; }
 .consentMsg { margin-top:16px; padding:10px 12px; background:rgba(59,130,246,0.06); border:1px solid rgba(59,130,246,0.15); border-radius:10px; font-size:11px; color:#94a3b8; line-height:1.6; text-align:center; }
 .consentMsg a { color:#60a5fa; text-decoration:underline; }
 .consentMsg a:hover { color:#93c5fd; }
 .footer { margin-top:20px; text-align:center; font-size:12px; color:#64748b; line-height:1.8; }
 .footerLinks { display:flex; justify-content:center; gap:12px; margin-bottom:8px; font-size:11px; }
 .footerLinks a { color:#64748b; text-decoration:none; }
 .footerLinks a:hover { color:#94a3b8; text-decoration:underline; }
 .footerDivider { color:#334155; }

 /* 다른 계정으로 로그인 토글 */
 .accountSwitch { display:flex; align-items:center; gap:8px; margin-top:14px; padding:10px 12px; background:rgba(255,255,255,0.04); border:1px solid rgba(59,130,246,0.18); border-radius:10px; cursor:pointer; transition:all 0.2s; user-select:none; }
 .accountSwitch:hover { background:rgba(59,130,246,0.08); border-color:rgba(59,130,246,0.3); }
 .accountSwitch input { width:14px; height:14px; accent-color:#3b82f6; cursor:pointer; flex-shrink:0; }
 .accountSwitch span { font-size:12px; color:#94a3b8; font-weight:500; line-height:1.4; }

 /* 모바일 상단 브랜드 바 — 1100px 이하에서 노출, 데스크톱은 숨김 */
 .mobileTopBar { display:none; position:sticky; top:0; left:0; right:0; z-index:20; padding: calc(env(safe-area-inset-top, 0px) + 12px) 16px 12px; background: linear-gradient(180deg, rgba(6,13,26,0.96) 0%, rgba(6,13,26,0.88) 100%); backdrop-filter: blur(10px); border-bottom: 1px solid rgba(59,130,246,0.18); }
 .mobileTopBar .row { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:10px; }
 .mobileTopBar .brand { display:flex; align-items:center; gap:10px; }
 .mobileTopBar .brandLogo { width:38px; height:38px; border-radius:10px; background:#fff; padding:3px; display:flex; align-items:center; justify-content:center; box-shadow: 0 2px 12px rgba(59,130,246,0.25); flex-shrink:0; }
 .mobileTopBar .brandLogo img { width:100%; height:100%; object-fit:contain; }
 .mobileTopBar .brandText { color:#fff; font-size:15px; font-weight:800; letter-spacing:-0.3px; }
 .mobileTopBar .brandTagline { color:#94a3b8; font-size:10px; font-weight:500; margin-top:1px; }
 .mobileTopBar .liveBadge { display:inline-flex; align-items:center; gap:5px; padding:5px 9px; border-radius:999px; background:rgba(34,197,94,0.14); color:#22c55e; font-size:10px; font-weight:700; flex-shrink:0; border:1px solid rgba(34,197,94,0.22); }
 .mobileTopBar .liveDot { width:5px; height:5px; border-radius:50%; background:#22c55e; animation: pulseDot 1.5s ease-in-out infinite; flex-shrink:0; }
 @keyframes pulseDot { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(1.4); } }
 @keyframes statSlideUp {
 0% { opacity:0; transform: translateY(8px); }
 12% { opacity:1; transform: translateY(0); }
 88% { opacity:1; transform: translateY(0); }
 100% { opacity:0; transform: translateY(-8px); }
 }
 @keyframes numberPulse {
 0%,100% { transform: scale(1); }
 50% { transform: scale(1.04); }
 }

 /* 실시간 통계 트랙 — 가로 stat 카드 3개 + 회전 데이터 */
 .liveStats { display:grid; grid-template-columns: repeat(3, 1fr); gap:6px; }
 .liveStatCard { background: rgba(59,130,246,0.08); border:1px solid rgba(59,130,246,0.16); border-radius:10px; padding:7px 8px; min-height:46px; position:relative; overflow:hidden; }
 .liveStatCard .liveStatIcon { position:absolute; top:6px; right:6px; opacity:0.45; }
 .liveStatCard .liveStatLabel { font-size:9px; color:#94a3b8; font-weight:600; line-height:1; margin-bottom:3px; letter-spacing:-0.2px; }
 .liveStatCard .liveStatValue { font-size:14px; color:#fff; font-weight:900; line-height:1.1; letter-spacing:-0.4px; animation: numberPulse 2s ease-in-out infinite; }
 .liveStatCard .liveStatChange { font-size:8px; color:#22c55e; font-weight:700; margin-top:2px; }
 .liveStatCard.featured { background: linear-gradient(135deg, rgba(59,130,246,0.18), rgba(139,92,246,0.12)); border-color: rgba(59,130,246,0.35); }
 .liveStatCard.featured .liveStatValue { color:#60a5fa; }

 @media (max-width: 1100px) {
 /* mobileTopBar 와 mainWrap 이 column 으로 stacking — mobileTopBar 위, mainWrap 아래 */
 .mobileTopBar { display:block; width:100%; flex-shrink:0; }
 .mainWrap { display:block; flex-direction:column; height:auto; width:100%; max-width:none; padding:0; }
 .leftArea { display:none; }
 .rightArea {
 width:100%;
 max-width:480px;
 margin:0 auto;
 padding: 24px 16px 40px;
 display:block;
 align-items:initial;
 justify-content:initial;
 }
 .loginCard {
 width:100%;
 max-width:100%;
 margin:0 auto;
 transform:none;
 }
 }
 @media (max-width: 640px) {
 .rightArea { padding: 20px 16px 36px; max-width:100%; }
 .loginCard { padding:28px 20px; }
 .sBtn { padding:12px 14px; font-size:14px; }
 .logoSection { margin-bottom:24px; }
 .logoImg { width:44px; height:44px; }
 .brandName { font-size:20px; }
 .loginTitle { font-size:20px; margin-bottom:22px; }
 }
 `}</style>

 {/* 모바일 상단 브랜드 바 (1100px 이하 노출) — 실제 로고 + 실시간 통계 카드 3종 */}
 <div className='mobileTopBar'>
 <div className='row'>
 <div className='brand'>
 <div className='brandLogo'>
 <Image src="/logo-icon.svg" alt="로컬루션" width={32} height={32} priority />
 </div>
 <div>
 <div className='brandText'>로컬루션</div>
 <div className='brandTagline'>AI 사장님 마케팅 플랫폼</div>
 </div>
 </div>
 <div className='liveBadge'>
 <span className='liveDot' />
 <span>실시간</span>
 </div>
 </div>

 {/* 실시간 통계 3 카드 — 매 3초마다 자연스럽게 갱신 */}
 <div className='liveStats'>
 <div className='liveStatCard featured'>
 <svg className='liveStatIcon' width="11" height="11" viewBox="0 0 12 12" fill="none">
 <path d="M3 9 L6 4 L9 7" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
 </svg>
 <div className='liveStatLabel'>사장님</div>
 <div className='liveStatValue'>{liveStats.owners.toLocaleString()}+</div>
 <div className='liveStatChange'>방금 가입</div>
 </div>
 <div className='liveStatCard'>
 <svg className='liveStatIcon' width="11" height="11" viewBox="0 0 12 12" fill="none">
 <path d="M2 4 L6 8 L10 4" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
 </svg>
 <div className='liveStatLabel'>오늘 답글</div>
 <div className='liveStatValue'>{liveStats.reviewsToday}건</div>
 <div className='liveStatChange'>+{Math.floor(liveStats.reviewsToday / 12)} 1시간</div>
 </div>
 <div className='liveStatCard'>
 <svg className='liveStatIcon' width="11" height="11" viewBox="0 0 12 12" fill="none">
 <polygon points="6,2 7.5,5 11,5.5 8.5,7.5 9,11 6,9 3,11 3.5,7.5 1,5.5 4.5,5" fill="#fbbf24"/>
 </svg>
 <div className='liveStatLabel'>별점 상승</div>
 <div className='liveStatValue'>+{liveStats.avgRatingLift.toFixed(1)}점</div>
 <div className='liveStatChange'>평균</div>
 </div>
 </div>
 </div>

 <div className='particles'>
 {Array.from({length:20}).map(function(_,i) {
 var size = 2 + Math.random() * 4
 return <div key={i} className='p' style={{
 width: size, height: size,
 left: Math.random()*100+'%',
 background: i%3===0 ? 'rgba(59,130,246,0.5)' : i%3===1 ? 'rgba(34,197,94,0.4)' : 'rgba(139,92,246,0.4)',
 animation: 'particleFloat '+(12+Math.random()*20)+'s linear '+(Math.random()*10)+'s infinite',
 }} />
 })}
 </div>

 <div className='mainWrap'>
 <div className='leftArea'>
 <div className='growthScene'>
 <p className='heroTitle'>
 고객이 늘고, 순위가 오르고<br/>
 <span className='heroHighlight'>매출이 성장합니다</span>
 </p>
 <p className='heroSub'>
 로컬루션이 리뷰 관리부터 고객 재방문까지<br/>
 AI로 자동화하여 사장님의 매장을 성장시킵니다
 </p>

 <div className='graphCard'>
 <div className='graphHeader'>
 <span className='graphLabel'>월별 매장 순위 변화</span>
 <span className='graphBadge'>
 <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 9V3M6 3L3 6M6 3l3 3" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
 12위 상승
 </span>
 </div>

 <svg className='lineGraph' viewBox="0 0 460 100" fill="none">
 <defs>
 <linearGradient id="lineGrad" x1="0" y1="0" x2="460" y2="0">
 <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3"/>
 <stop offset="100%" stopColor="#22c55e"/>
 </linearGradient>
 <linearGradient id="areaGrad" x1="230" y1="0" x2="230" y2="100">
 <stop offset="0%" stopColor="#22c55e" stopOpacity="0.15"/>
 <stop offset="100%" stopColor="#22c55e" stopOpacity="0"/>
 </linearGradient>
 </defs>
 <path d="M0 85 C30 82, 60 80, 80 78 C100 76, 130 75, 160 68 C190 61, 210 55, 240 45 C270 35, 300 30, 330 22 C360 16, 390 12, 420 8 L460 4 L460 100 L0 100Z" fill="url(#areaGrad)"/>
 <path d="M0 85 C30 82, 60 80, 80 78 C100 76, 130 75, 160 68 C190 61, 210 55, 240 45 C270 35, 300 30, 330 22 C360 16, 390 12, 420 8 L460 4" stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinecap="round"/>
 <circle cx="460" cy="4" r="4" fill="#22c55e"><animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite"/></circle>
 <text x="5" y="98" fill="#64748b" fontSize="10">1월</text>
 <text x="75" y="98" fill="#64748b" fontSize="10">2월</text>
 <text x="150" y="98" fill="#64748b" fontSize="10">3월</text>
 <text x="225" y="98" fill="#64748b" fontSize="10">4월</text>
 <text x="300" y="98" fill="#64748b" fontSize="10">5월</text>
 <text x="375" y="98" fill="#64748b" fontSize="10">6월</text>
 <text x="442" y="98" fill="#64748b" fontSize="10">7월</text>
 </svg>

 <div className='barChart'>
 {[
 {h:35,c:'#3b82f6',l:'1분기'},
 {h:50,c:'#22c55e',l:''},
 {h:45,c:'#8b5cf6',l:''},
 {h:60,c:'#3b82f6',l:'2분기'},
 {h:72,c:'#22c55e',l:''},
 {h:65,c:'#8b5cf6',l:''},
 {h:80,c:'#3b82f6',l:'3분기'},
 {h:92,c:'#22c55e',l:''},
 {h:88,c:'#8b5cf6',l:''},
 ].map(function(bar,i) {
 return <div key={i} className='bar' style={{
 background: 'linear-gradient(180deg, '+bar.c+', '+bar.c+'44)',
 '--bar-h': bar.h+'%',
 animationDelay: (i*0.1)+'s',
 } as React.CSSProperties}>
 {bar.l && <span className='barLabel'>{bar.l}</span>}
 </div>
 })}
 </div>
 </div>

 <div className='statCards'>
 <div className='statCard'>
 <div className='statNum'>{counters.visitors.toLocaleString()}</div>
 <div className='statLabel'>이번 달 방문자</div>
 <div className='statChange'>▲ +12.4%</div>
 </div>
 <div className='statCard'>
 <div className='statNum'>{counters.reviews}건</div>
 <div className='statLabel'>총 리뷰 수</div>
 <div className='statChange'>▲ +34건 이번 주</div>
 </div>
 <div className='statCard'>
 <div className='statNum'>TOP {counters.rank}</div>
 <div className='statLabel'>지역 내 순위</div>
 <div className='statChange'>▲ 12위 상승</div>
 </div>
 </div>

 <div className='trustRow'>
 <div className='trustDots'>
 <div className='trustDot' style={{background:'#3b82f6'}}>김</div>
 <div className='trustDot' style={{background:'#8b5cf6'}}>이</div>
 <div className='trustDot' style={{background:'#22c55e'}}>박</div>
 <div className='trustDot' style={{background:'#f59e0b'}}>최</div>
 <div className='trustDot' style={{background:'#ef4444'}}>+</div>
 </div>
 <div className='trustText'><strong>1,200+</strong> 사장님이 이미 사용 중</div>
 </div>
 </div>
 </div>

 <div className='rightArea'>
 <div className='loginCard' ref={cardRef}>
 <div className='logoSection'>
 <Image src="/logo.png" alt="로컬루션" width={52} height={52} className='logoImg' priority />
 <div className='brandName'>Localution</div>
 <div className='tagline'>AI가 사장님의 비즈니스를 성장시킵니다</div>
 </div>

 <h1 className='loginTitle'>{isSignup ? '무료 시작하기' : '로그인'}</h1>
 {isSignup && (
 <p style={{ textAlign: 'center', color: '#8B95A1', fontSize: 13, marginTop: -8, marginBottom: 16 }}>
 카카오·네이버·구글 계정으로 1분만에 가입 → 바로 시작
 </p>
 )}

 {error && <div className='errMsg'>{error}</div>}

 <div className='socialBtns'>
 <a href={'/api/oauth/kakao' + oauthQuery} className='sBtn kakaoBtn'>
 <span className='sIcon'>
 <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
 <path d="M10 3C5.582 3 2 5.828 2 9.274c0 2.177 1.432 4.088 3.594 5.186l-.912 3.376c-.08.297.26.534.522.364l3.96-2.636c.272.028.55.044.836.044 4.418 0 8-2.828 8-6.334C18 5.828 14.418 3 10 3z" fill="#191919"/>
 </svg>
 </span>
 카카오로 시작
 </a>

 <a href={'/api/oauth/naver' + oauthQuery} className='sBtn naverBtn'>
 <span className='sIcon'>
 <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
 <path d="M13.36 10.57L6.38 3H3v14h3.64V9.43L13.62 17H17V3h-3.64v7.57z" fill="#fff"/>
 </svg>
 </span>
 네이버로 시작
 </a>

 <a href={'/api/oauth/google' + oauthQuery} className='sBtn googleBtn'>
 <span className='sIcon'>
 <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
 <path d="M18.17 10.2c0-.63-.06-1.25-.16-1.84H10v3.48h4.58a3.92 3.92 0 01-1.7 2.57v2.13h2.75c1.61-1.48 2.54-3.66 2.54-6.34z" fill="#4285F4"/>
 <path d="M10 18.5c2.3 0 4.23-.76 5.64-2.07l-2.75-2.13c-.76.51-1.74.81-2.89.81-2.22 0-4.1-1.5-4.77-3.52H2.38v2.2A8.5 8.5 0 0010 18.5z" fill="#34A853"/>
 <path d="M5.23 11.59a5.1 5.1 0 010-3.18v-2.2H2.38a8.5 8.5 0 000 7.58l2.85-2.2z" fill="#FBBC05"/>
 <path d="M10 4.89c1.25 0 2.38.43 3.26 1.28l2.45-2.45A8.46 8.46 0 0010 1.5a8.5 8.5 0 00-7.62 4.71l2.85 2.2c.67-2.02 2.55-3.52 4.77-3.52z" fill="#EA4335"/>
 </svg>
 </span>
 Google로 시작
 </a>
 </div>

 {/* 다른 계정으로 로그인 토글 — 같은 OAuth 계정이 자동 재사용되는 문제 해결 */}
 <label className='accountSwitch'>
 <input
 type='checkbox'
 checked={useDifferentAccount}
 onChange={(e) => setUseDifferentAccount(e.target.checked)}
 />
 <span>다른 계정으로 로그인 (계정 선택 화면 보기)</span>
 </label>

 <div className='consentMsg'>
 {isSignup ? '가입하면 ' : '로그인하면 '}
 <a href='/terms' target='_blank' rel='noopener'>이용약관</a>
 {' 및 '}
 <a href='/privacy' target='_blank' rel='noopener'>개인정보처리방침</a>
 에 동의하는 것으로 간주됩니다.
 </div>

 <div className='footer'>
 <div className='footerLinks'>
 <a href='/terms' target='_blank' rel='noopener'>이용약관</a>
 <span className='footerDivider'>·</span>
 <a href='/privacy' target='_blank' rel='noopener'>개인정보처리방침</a>
 <span className='footerDivider'>·</span>
 <a href='/legal/platform-consent' target='_blank' rel='noopener'>위임동의서</a>
 </div>
 &copy; 2026 로컬루션<br/>
 Powered by Localution
 </div>
 </div>
 </div>
 </div>
 </div>
 )
}
