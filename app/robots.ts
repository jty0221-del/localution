import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/settings',
          '/customers',
          '/store',
          '/review-admin',
          '/qr-admin',
          '/marketing',
          '/api/',
        ],
      },
      {
        // 네이버 크롤러 (Yeti) 명시 허용
        userAgent: 'Yeti',
        allow: '/',
        disallow: [
          '/dashboard',
          '/settings',
          '/api/',
        ],
      },
      {
        // 구글 크롤러 명시 허용
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/dashboard',
          '/settings',
          '/api/',
        ],
      },
    ],
    sitemap: 'https://www.localution.co.kr/sitemap.xml',
    host: 'https://www.localution.co.kr',
  }
}
