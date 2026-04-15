import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = '로컬루션 | 사장님의 모든 업무, AI가 대신합니다'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: 'linear-gradient(135deg, #3182F6 0%, #1B64DA 50%, #0A3B8F 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: 'white',
          position: 'relative',
        }}
      >
        {/* 장식용 큰 원 (우측 상단) */}
        <div
          style={{
            position: 'absolute',
            top: -180,
            right: -180,
            width: 520,
            height: 520,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -140,
            left: -140,
            width: 380,
            height: 380,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
            display: 'flex',
          }}
        />

        {/* 상단: 로고 영역 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, zIndex: 2 }}>
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: 22,
              background: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 54,
              fontWeight: 900,
              color: '#3182F6',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}
          >
            L
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: -1 }}>로컬루션</div>
            <div style={{ fontSize: 20, opacity: 0.85, marginTop: 4 }}>Localution</div>
          </div>
        </div>

        {/* 중앙: 메인 카피 */}
        <div style={{ display: 'flex', flexDirection: 'column', zIndex: 2 }}>
          <div
            style={{
              fontSize: 72,
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: -2,
              marginBottom: 24,
            }}
          >
            사장님의 모든 업무,
          </div>
          <div
            style={{
              fontSize: 72,
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: -2,
              color: '#FFE66D',
            }}
          >
            AI가 대신합니다
          </div>
          <div
            style={{
              fontSize: 26,
              marginTop: 28,
              opacity: 0.9,
              fontWeight: 500,
              display: 'flex',
            }}
          >
            리뷰 · 정산 · CRM · 마케팅 올인원 자동화
          </div>
        </div>

        {/* 하단: URL 배지 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            zIndex: 2,
          }}
        >
          <div
            style={{
              fontSize: 22,
              padding: '12px 24px',
              background: 'rgba(255,255,255,0.15)',
              border: '2px solid rgba(255,255,255,0.35)',
              borderRadius: 999,
              fontWeight: 700,
              backdropFilter: 'blur(8px)',
              display: 'flex',
            }}
          >
            www.localution.co.kr
          </div>
          <div
            style={{
              fontSize: 20,
              opacity: 0.75,
              display: 'flex',
            }}
          >
            월 9,900원부터
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
