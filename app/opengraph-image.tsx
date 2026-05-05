// ═══════════════════════════════════════════════════════════
// app/opengraph-image.tsx
// Next.js 14 App Router - OG 이미지 자동 생성 (1200×630)
// 23차-SEO: og:image 미설정 문제 해결 — SNS 공유 썸네일
// ═══════════════════════════════════════════════════════════
import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = '로컬루션 – 사장님 마케팅 플랫폼'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
 return new ImageResponse(
 (
 <div
 style={{
 background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 55%, #0ea5e9 100%)',
 width: '100%',
 height: '100%',
 display: 'flex',
 flexDirection: 'column',
 alignItems: 'center',
 justifyContent: 'center',
 fontFamily: 'sans-serif',
 padding: '60px 80px',
 position: 'relative',
 }}
 >
 {/* 배경 장식 원 */}
 <div style={{
 position: 'absolute', width: 500, height: 500,
 borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
 top: -120, right: -80,
 }} />
 <div style={{
 position: 'absolute', width: 300, height: 300,
 borderRadius: '50%', background: 'rgba(255,255,255,0.04)',
 bottom: -60, left: -40,
 }} />

 {/* 로고 텍스트 */}
 <div style={{
 color: 'rgba(255,255,255,0.95)',
 fontSize: 28,
 fontWeight: 700,
 letterSpacing: 2,
 marginBottom: 20,
 background: 'rgba(255,255,255,0.15)',
 padding: '8px 24px',
 borderRadius: 40,
 }}>
 localution.co.kr
 </div>

 {/* 메인 타이틀 */}
 <div style={{
 color: '#ffffff',
 fontSize: 72,
 fontWeight: 900,
 textAlign: 'center',
 lineHeight: 1.15,
 marginBottom: 24,
 }}>
 사장님 마케팅 플랫폼
 </div>

 {/* 서브 타이틀 */}
 <div style={{
 color: 'rgba(255,255,255,0.85)',
 fontSize: 30,
 textAlign: 'center',
 lineHeight: 1.5,
 maxWidth: 900,
 }}>
 네이버 · 구글 · 배민 리뷰 자동 답글
 블로그 · QR · 플레이스 · CRM
 </div>

 {/* 태그라인 */}
 <div style={{
 marginTop: 36,
 display: 'flex',
 gap: 16,
 }}>
 {[' 월 6,900원', '모든 플랫폼 리뷰답글', '12개 모듈'].map(tag => (
 <div key={tag} style={{
 color: '#ffffff',
 fontSize: 20,
 fontWeight: 600,
 background: 'rgba(255,255,255,0.2)',
 padding: '10px 24px',
 borderRadius: 40,
 border: '1px solid rgba(255,255,255,0.3)',
 }}>
 {tag}
 </div>
 ))}
 </div>
 </div>
 ),
 { ...size }
 )
}
