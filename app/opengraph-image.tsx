import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = '로컬루션 | 사장님의 모든 업무, AI가 대신합니다'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Google Fonts API 에서 Noto Sans KR 900 weight 를 fetch
// 특정 텍스트만 요청해서 파일 크기 최소화 (edge 1MB 제한 회피)
async function loadKoreanFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const url =
      'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@900&text=' +
      encodeURIComponent(text)
    const cssRes = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    })
    if (!cssRes.ok) return null
    const css = await cssRes.text()
    // regex 없이 CSS url(...) 파싱
    const marker = 'src: url('
    const start = css.indexOf(marker)
    if (start < 0) return null
    const end = css.indexOf(')', start + marker.length)
    if (end < 0) return null
    const fontUrl = css.substring(start + marker.length, end)
    const fontRes = await fetch(fontUrl)
    if (!fontRes.ok) return null
    return await fontRes.arrayBuffer()
  } catch {
    return null
  }
}

export default async function Image() {
  // 이미지에 등장하는 모든 한글/영문/기호 (폰트 서브셋 요청용)
  const allText =
    '사장님 모든 업무를 AI가 대신합니다 로컬루션 Localution ' +
    '자영업자 소상공인 플랫폼 리뷰 답글 매출 정산 고객 CRM 통합 마케팅 ' +
    '월 9,900원부터 14일 무료 체험 www.localution.co.kr · ,'

  const fontData = await loadKoreanFont(allText)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '60px 72px',
          background:
            'linear-gradient(135deg, #0A2463 0%, #1B64DA 40%, #3182F6 100%)',
          color: 'white',
          position: 'relative',
          fontFamily: 'NotoSansKR, sans-serif',
        }}
      >
        {/* 배경 장식 블러 원 */}
        <div
          style={{
            position: 'absolute',
            top: -220,
            right: -220,
            width: 640,
            height: 640,
            borderRadius: 9999,
            background:
              'radial-gradient(circle, rgba(255,230,109,0.32) 0%, rgba(255,230,109,0) 70%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -180,
            left: -180,
            width: 520,
            height: 520,
            borderRadius: 9999,
            background:
              'radial-gradient(circle, rgba(77,163,255,0.35) 0%, rgba(77,163,255,0) 70%)',
            display: 'flex',
          }}
        />

        {/* 상단 브랜드 행 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            zIndex: 2,
          }}
        >
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: 22,
              background:
                'linear-gradient(135deg, #FFE66D 0%, #FFC93C 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 48,
              fontWeight: 900,
              color: '#1B64DA',
              boxShadow: '0 12px 40px rgba(255,201,60,0.45)',
            }}
          >
            L
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontSize: 36,
                fontWeight: 900,
                letterSpacing: -1,
                display: 'flex',
              }}
            >
              로컬루션
            </div>
            <div
              style={{
                fontSize: 17,
                opacity: 0.7,
                marginTop: 2,
                letterSpacing: 1,
                display: 'flex',
              }}
            >
              LOCALUTION
            </div>
          </div>
          <div
            style={{
              marginLeft: 18,
              padding: '9px 18px',
              background: 'rgba(255,255,255,0.14)',
              border: '1.5px solid rgba(255,255,255,0.3)',
              borderRadius: 9999,
              fontSize: 17,
              fontWeight: 700,
              display: 'flex',
            }}
          >
            자영업자 · 소상공인 AI 플랫폼
          </div>
        </div>

        {/* 중앙 헤드라인 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            justifyContent: 'center',
            zIndex: 2,
            marginTop: 20,
          }}
        >
          <div
            style={{
              fontSize: 44,
              fontWeight: 900,
              opacity: 0.92,
              marginBottom: 12,
              letterSpacing: -1,
              display: 'flex',
            }}
          >
            사장님,
          </div>
          <div
            style={{
              fontSize: 86,
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: -3,
              marginBottom: 6,
              display: 'flex',
            }}
          >
            모든 업무를
          </div>
          <div
            style={{
              fontSize: 86,
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: -3,
              color: '#FFE66D',
              display: 'flex',
            }}
          >
            AI가 대신합니다
          </div>
        </div>

        {/* 기능 칩 4개 */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginBottom: 22,
            marginTop: 8,
            zIndex: 2,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 20px',
              background: 'rgba(255,255,255,0.13)',
              border: '1.5px solid rgba(255,255,255,0.25)',
              borderRadius: 14,
              fontSize: 22,
              fontWeight: 800,
            }}
          >
            <div
              style={{
                width: 11,
                height: 11,
                borderRadius: 9999,
                background: '#FFE66D',
                display: 'flex',
              }}
            />
            <div style={{ display: 'flex' }}>AI 리뷰 답글</div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 20px',
              background: 'rgba(255,255,255,0.13)',
              border: '1.5px solid rgba(255,255,255,0.25)',
              borderRadius: 14,
              fontSize: 22,
              fontWeight: 800,
            }}
          >
            <div
              style={{
                width: 11,
                height: 11,
                borderRadius: 9999,
                background: '#12B76A',
                display: 'flex',
              }}
            />
            <div style={{ display: 'flex' }}>매출 정산</div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 20px',
              background: 'rgba(255,255,255,0.13)',
              border: '1.5px solid rgba(255,255,255,0.25)',
              borderRadius: 14,
              fontSize: 22,
              fontWeight: 800,
            }}
          >
            <div
              style={{
                width: 11,
                height: 11,
                borderRadius: 9999,
                background: '#FF6B9D',
                display: 'flex',
              }}
            />
            <div style={{ display: 'flex' }}>고객 CRM</div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 20px',
              background: 'rgba(255,255,255,0.13)',
              border: '1.5px solid rgba(255,255,255,0.25)',
              borderRadius: 14,
              fontSize: 22,
              fontWeight: 800,
            }}
          >
            <div
              style={{
                width: 11,
                height: 11,
                borderRadius: 9999,
                background: '#A78BFA',
                display: 'flex',
              }}
            />
            <div style={{ display: 'flex' }}>통합 마케팅</div>
          </div>
        </div>

        {/* 하단 URL + 무료 체험 배지 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 2,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                padding: '14px 28px',
                background: 'white',
                borderRadius: 9999,
                color: '#1B64DA',
                fontSize: 22,
                fontWeight: 900,
                display: 'flex',
                boxShadow: '0 8px 24px rgba(0,0,0,0.22)',
              }}
            >
              www.localution.co.kr
            </div>
            <div
              style={{
                fontSize: 20,
                opacity: 0.88,
                fontWeight: 700,
                display: 'flex',
              }}
            >
              월 9,900원부터
            </div>
          </div>
          <div
            style={{
              padding: '14px 24px',
              background:
                'linear-gradient(135deg, #FFE66D 0%, #FFC93C 100%)',
              color: '#1B64DA',
              borderRadius: 14,
              fontSize: 22,
              fontWeight: 900,
              display: 'flex',
              boxShadow: '0 10px 28px rgba(255,201,60,0.45)',
            }}
          >
            14일 무료 체험
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fontData
        ? [
            {
              name: 'NotoSansKR',
              data: fontData,
              style: 'normal',
              weight: 900,
            },
          ]
        : undefined,
    }
  )
}
