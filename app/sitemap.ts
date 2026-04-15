import { MetadataRoute } from 'next'

const BASE = 'https://www.localution.co.kr'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    {
      url: BASE,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: BASE + '/service-intro',
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: BASE + '/pricing',
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: BASE + '/qr',
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: BASE + '/community',
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: BASE + '/inquiry',
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ]
}
