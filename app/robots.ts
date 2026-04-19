// ═══════════════════════════════════════════════════════════
//  app/robots.ts
//  Next.js 15 App Router - /robots.txt 자동 생성
//  검색엔진 크롤링 정책: 공개 페이지 허용 / 관리자·API 차단
// ═══════════════════════════════════════════════════════════

import type { MetadataRoute } from 'next'

const SITE_URL = 'https://www.localution.co.kr'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/admin-biz',
          '/qr-admin',
          '/my',
          '/settings/',
          '/dashboard',
          '/review-admin/',
          '/crm',
          '/reservations',
          '/reviews',
          '/settlement',
        ],
      },
      // 네이버·다음 크롤러는 한국 시장 대응이라 별도 허용
      { userAgent: 'Yeti',          allow: '/', disallow: ['/api/', '/admin/', '/admin-biz', '/my', '/settings/', '/dashboard'] },
      { userAgent: 'Googlebot',     allow: '/', disallow: ['/api/', '/admin/', '/admin-biz', '/my', '/settings/', '/dashboard'] },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
