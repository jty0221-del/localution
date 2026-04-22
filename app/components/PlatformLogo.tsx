// app/components/PlatformLogo.tsx
// ============================================================
// 35차-4: 플랫폼 로고 공통 SVG 컴포넌트 (2026-04-22)
//
//   · /my/platforms, /my/platforms/[platform]/connect, /dashboard 에서 공통 사용
//   · 5개 플랫폼(naver_place, baemin, yogiyo, coupangeats, kakao_map) + 이니셜 폴백
//   · size prop 으로 크기 조절 (기본 48px) — viewBox 0 0 48 48 고정
// ============================================================
import type { CSSProperties } from 'react'

export type PlatformLogoSlug =
  | 'naver_place'
  | 'baemin'
  | 'yogiyo'
  | 'coupangeats'
  | 'kakao_map'

interface Props {
  platform: PlatformLogoSlug | string
  size?: number
  className?: string
  style?: CSSProperties
  rounded?: number // viewBox 기준 rx (기본 12)
}

export default function PlatformLogo({
  platform,
  size = 48,
  className,
  style,
  rounded,
}: Props) {
  const rx = rounded ?? 12
  const commonStyle: CSSProperties = { flexShrink: 0, display: 'block', ...style }

  switch (platform) {
    // 네이버 플레이스 — 초록 배경 + 흰 N
    case 'naver_place':
    case 'naver':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          className={className}
          style={commonStyle}
          aria-label="네이버 플레이스"
          role="img"
        >
          <rect width="48" height="48" rx={rx} fill="#03C75A" />
          <path d="M10 39V9h8.3L31 27V9h7v30h-8.3L17 21v18H10Z" fill="#FFFFFF" />
        </svg>
      )

    // 배달의민족 — 민트 배경 + 검은 "배민"
    case 'baemin':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          className={className}
          style={commonStyle}
          aria-label="배달의민족"
          role="img"
        >
          <rect width="48" height="48" rx={rx} fill="#2AC1BC" />
          <text
            x="24"
            y="31.5"
            fontSize="17"
            fontWeight="900"
            fill="#111111"
            fontFamily="'Apple SD Gothic Neo','Noto Sans KR',system-ui,sans-serif"
            textAnchor="middle"
            letterSpacing="-0.6"
          >
            배민
          </text>
        </svg>
      )

    // 요기요 — 핫핑크 배경 + 흰 "요기요"
    case 'yogiyo':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          className={className}
          style={commonStyle}
          aria-label="요기요"
          role="img"
        >
          <rect width="48" height="48" rx={rx} fill="#FA0050" />
          <text
            x="24"
            y="30"
            fontSize="12"
            fontWeight="900"
            fill="#FFFFFF"
            fontFamily="'Apple SD Gothic Neo','Noto Sans KR',system-ui,sans-serif"
            textAnchor="middle"
            letterSpacing="-0.4"
          >
            요기요
          </text>
        </svg>
      )

    // 쿠팡이츠 — 흰 배경 + 컬러 "coupang" + 주황 "eats"
    case 'coupangeats':
    case 'coupang':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          className={className}
          style={commonStyle}
          aria-label="쿠팡이츠"
          role="img"
        >
          <rect
            width="48"
            height="48"
            rx={rx}
            fill="#FFFFFF"
            stroke="#E5E7EB"
            strokeWidth="1"
          />
          <text
            x="24"
            y="21"
            fontSize="8"
            fontWeight="900"
            fontFamily="Arial,Helvetica,sans-serif"
            textAnchor="middle"
            letterSpacing="-0.1"
          >
            <tspan fill="#F2622B">c</tspan>
            <tspan fill="#3BA94A">o</tspan>
            <tspan fill="#F2C22B">u</tspan>
            <tspan fill="#2E79D0">p</tspan>
            <tspan fill="#F2622B">a</tspan>
            <tspan fill="#F2C22B">n</tspan>
            <tspan fill="#3BA94A">g</tspan>
          </text>
          <text
            x="24"
            y="38"
            fontSize="13"
            fontWeight="900"
            fill="#F2622B"
            fontFamily="Arial,Helvetica,sans-serif"
            textAnchor="middle"
            letterSpacing="-0.3"
          >
            eats
          </text>
        </svg>
      )

    // 카카오맵 — 노란 배경 + 검은 말풍선
    case 'kakao_map':
    case 'kakao':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          className={className}
          style={commonStyle}
          aria-label="카카오맵"
          role="img"
        >
          <rect width="48" height="48" rx={rx} fill="#FEE500" />
          <path
            d="M24 11c-7 0-12.5 4.4-12.5 10 0 3.7 2.5 7 6.3 8.9l-1.5 5.3c-.1.3.3.5.5.3l6.2-4.3c.3 0 .7.1 1 .1 7 0 12.5-4.4 12.5-10S31 11 24 11Z"
            fill="#191919"
          />
        </svg>
      )

    // 폴백 — 알 수 없는 플랫폼은 단색 배경 + 첫 글자
    default:
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          className={className}
          style={commonStyle}
          aria-label={platform}
          role="img"
        >
          <rect width="48" height="48" rx={rx} fill="#8B95A1" />
          <text
            x="24"
            y="31"
            fontSize="20"
            fontWeight="900"
            fill="#FFFFFF"
            fontFamily="system-ui,sans-serif"
            textAnchor="middle"
          >
            {String(platform).charAt(0).toUpperCase()}
          </text>
        </svg>
      )
  }
}
