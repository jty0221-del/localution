// ═══════════════════════════════════════════════════════════
//  app/sitemap.ts
//  Next.js 14 App Router - /sitemap.xml 자동 생성
//  공개 랜딩 페이지만 포함 (로그인 필수 페이지·관리자 제외)
//  15차-9: /about 누락 추가 + 주석 Next.js 14 정정
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
    { path: '',               priority: 1.0, freq: 'weekly'  },  // 홈
    { path: 'service-intro',  priority: 0.9, freq: 'monthly' },
    { path: 'pricing',        priority: 0.9, freq: 'monthly' },
    { path: 'about',          priority: 0.8, freq: 'monthly' },  // 15차-9 추가 (회사 소개)
    { path: 'marketing',      priority: 0.8, freq: 'weekly'  },
    { path: 'marketing/place',          priority: 0.7, freq: 'weekly'  },
    { path: 'marketing/blog-post',      priority: 0.7, freq: 'weekly'  },
    { path: 'marketing/reels',          priority: 0.7, freq: 'weekly'  },
    { path: 'marketing/keyword-rank',   priority: 0.6, freq: 'monthly' },
    { path: 'marketing/keyword-score',  priority: 0.6, freq: 'monthly' },
    { path: 'qr',             priority: 0.7, freq: 'monthly' },
    { path: 'community',      priority: 0.6, freq: 'weekly'  },
    { path: 'inquiry',        priority: 0.5, freq: 'monthly' },
    { path: 'login',          priority: 0.5, freq: 'yearly'  },
    { path: 'signup',         priority: 0.6, freq: 'yearly'  },
    { path: 'terms',          priority: 0.3, freq: 'yearly'  },
    { path: 'privacy',        priority: 0.3, freq: 'yearly'  },
  ]

  return routes.map(r => ({
    url: r.path ? `${SITE_URL}/${r.path}` : SITE_URL,
    lastModified: now,
    changeFrequency: r.freq,
    priority: r.priority,
  }))
}
