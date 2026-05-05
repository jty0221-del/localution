// ═══════════════════════════════════════════════════════════
// app/sitemap.ts
// Next.js 14 App Router - /sitemap.xml 자동 생성
// 공개 랜딩 페이지만 포함 (로그인 필수 페이지·관리자 제외)
// 23차-SEO: /marketing/blog-tracking · /updates · /partner-points 추가
// 27차-4 SEO: /marketing/card-news · /legal/platform-consent 추가
// ═══════════════════════════════════════════════════════════

import type { MetadataRoute } from 'next'

const SITE_URL = 'https://www.localution.co.kr'

export default function sitemap(): MetadataRoute.Sitemap {
 const now = new Date()

 const routes: Array<{
 path: string
 priority: number
 freq: 'daily' | 'weekly' | 'monthly' | 'yearly'
 }> = [
 { path: '', priority: 1.0, freq: 'weekly' }, // 홈
 { path: 'service-intro', priority: 0.9, freq: 'monthly' },
 { path: 'pricing', priority: 0.9, freq: 'monthly' },
 { path: 'about', priority: 0.8, freq: 'monthly' },
 { path: 'marketing', priority: 0.8, freq: 'weekly' },
 { path: 'marketing/place', priority: 0.8, freq: 'weekly' },
 { path: 'marketing/blog-post', priority: 0.8, freq: 'weekly' },
 { path: 'marketing/reels', priority: 0.7, freq: 'weekly' },
 { path: 'marketing/blog-tracking', priority: 0.7, freq: 'weekly' }, // 23차-SEO
 { path: 'marketing/card-news', priority: 0.7, freq: 'weekly' }, // 27차-4 SEO (24차 카드뉴스)
 { path: 'marketing/keyword-rank', priority: 0.6, freq: 'monthly' },
 { path: 'marketing/keyword-score', priority: 0.6, freq: 'monthly' },
 { path: 'qr', priority: 0.7, freq: 'monthly' },
 { path: 'community', priority: 0.6, freq: 'weekly' },
 { path: 'updates', priority: 0.7, freq: 'weekly' }, // 23차-SEO
 { path: 'partner-points', priority: 0.6, freq: 'monthly' }, // 23차-SEO
 { path: 'inquiry', priority: 0.5, freq: 'monthly' },
 { path: 'login', priority: 0.5, freq: 'yearly' },
 { path: 'signup', priority: 0.6, freq: 'yearly' },
 { path: 'terms', priority: 0.3, freq: 'yearly' },
 { path: 'privacy', priority: 0.3, freq: 'yearly' },
 { path: 'legal/platform-consent', priority: 0.3, freq: 'yearly' }, // 27차-4 SEO (23차-7 플랫폼 위임동의서)
 ]

 return routes.map(r => ({
 url: r.path ? `${SITE_URL}/${r.path}` : SITE_URL,
 lastModified: now,
 changeFrequency: r.freq,
 priority: r.priority,
 }))
}
