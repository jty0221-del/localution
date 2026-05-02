'use client'

// ============================================================
// QR 제작 업체 광고 슬롯 (네이버 쇼핑 커넥트)
//   · AFFILIATE_PRODUCTS 배열 기반 — 5개 슬롯
//   · /api/affiliate/preview 호출하여 실시간 미리보기 자동 추출
//   · 5분 서버 캐시 + visible 시 fetch (lazy)
//   · 사장님 클릭 시 새 탭으로 affiliate URL 이동
//   · 하단 고지 문구: "이 포스팅은 네이버 쇼핑 커넥트 활동의 일환으로..."
// ============================================================
import { useEffect, useState } from 'react'
import { Star, ExternalLink, Tag } from 'lucide-react'
import { AFFILIATE_PRODUCTS, type AffiliateProduct } from '../lib/affiliate-config'

type Preview = {
  url?: string
  title?: string | null
  image?: string | null
  description?: string | null
  price?: string | null
  rating?: number | null
  reviewCount?: number | null
  brand?: string | null
  loading?: boolean
  error?: boolean
}

export default function AffiliateAdSlots() {
  const products = AFFILIATE_PRODUCTS.filter(p => p.enabled !== false)

  // products 가 0개면 컴포넌트 자체 숨김 (사용자가 아직 affiliate URL 등록 안 한 상태)
  if (products.length === 0) return null

  return (
    <div className="mt-8 mb-2">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h3 className="text-base font-black text-[#191F28]">📦 매장에 비치할 QR 인쇄물 추천</h3>
          <p className="text-[11px] text-[#8B95A1] mt-0.5">테이블 텐트, 스티커, 아크릴 스탠드 등 — 네이버 쇼핑에서 바로 주문</p>
        </div>
        <span className="text-[10px] text-[#C9CDD2] flex items-center gap-1">
          <Tag size={10} /> 광고
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {products.map(p => <AdCard key={p.slot} product={p} />)}
      </div>

      {/* 네이버 쇼핑 커넥트 의무 고지 — 작게 */}
      <p className="text-[10px] text-[#C9CDD2] text-center mt-3 leading-relaxed">
        이 포스팅은 네이버 쇼핑 커넥트 활동의 일환으로, 판매 발생 시 수수료를 제공받습니다.
      </p>
    </div>
  )
}

// URL 에서 mallName + productId 추출 — 메타 추출 실패 시 안내용 fallback
function extractFallback(sourceUrl: string): { mall: string; productId: string } {
  const m = sourceUrl.match(/smartstore\.naver\.com\/([^/]+)\/products\/(\d+)/)
  return m ? { mall: m[1], productId: m[2] } : { mall: '', productId: '' }
}

function AdCard({ product }: { product: AffiliateProduct }) {
  const [preview, setPreview] = useState<Preview>({ loading: true })

  // 모든 override 가 채워져 있으면 fetch 자체 skip (불필요한 API 호출 방지)
  const fullyOverridden = !!(product.overrideImage && product.overrideTitle)

  useEffect(() => {
    if (fullyOverridden) { setPreview({ loading: false }); return }
    const sourceUrl = product.previewSourceUrl || product.url
    let cancelled = false
    fetch('/api/affiliate/preview?url=' + encodeURIComponent(sourceUrl))
      .then(r => r.json())
      .then(j => {
        if (cancelled) return
        if (j?.ok) setPreview({ ...j, loading: false })
        else setPreview({ loading: false, error: true })
      })
      .catch(() => { if (!cancelled) setPreview({ loading: false, error: true }) })
    return () => { cancelled = true }
  }, [product.previewSourceUrl, product.url, fullyOverridden])

  // 우선순위: override > preview > fallback (mall name)
  const fallback = extractFallback(product.previewSourceUrl || '')
  const image = product.overrideImage || preview.image || null
  const title = product.overrideTitle || preview.title || (fallback.mall ? `${fallback.mall} 추천 상품` : '상품 보기')
  const price = product.overridePrice || preview.price || null
  const originalPrice = product.overrideOriginalPrice || null
  const discountRate = product.overrideDiscountRate ?? null
  const rating = product.overrideRating ?? preview.rating ?? null
  const reviewCount = product.overrideReviewCount ?? preview.reviewCount ?? null

  return (
    <a
      href={product.url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="group block bg-white rounded-xl overflow-hidden shadow-sm border border-[#E5E8EB] hover:border-[#3182F6] hover:shadow-md transition-all">
      {/* 이미지 */}
      <div className="aspect-square bg-gradient-to-br from-[#F8FAFB] to-[#EFF6FF] relative overflow-hidden">
        {preview.loading && !fullyOverridden ? (
          <div className="absolute inset-0 flex items-center justify-center text-[10px] text-[#C9CDD2] animate-pulse">불러오는 중…</div>
        ) : image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          // 이미지 추출 실패 시 — 큰 아이콘 + 가게명 placeholder
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-[#3182F6]">
            <span className="text-3xl">🛒</span>
            <span className="text-[9px] font-medium text-[#8B95A1] truncate max-w-[80%] text-center">
              {fallback.mall || 'naver shopping'}
            </span>
          </div>
        )}
        {product.badge && (
          <span
            className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-bold text-white shadow"
            style={{ background: product.badgeColor || '#DC2626' }}>
            {product.badge}
          </span>
        )}
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 flex items-center justify-center text-[#3182F6] opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
          <ExternalLink size={12} strokeWidth={2.5} />
        </div>
      </div>

      {/* 텍스트 */}
      <div className="p-2.5 space-y-1">
        <p className="text-[11px] font-semibold text-[#191F28] leading-snug line-clamp-2 min-h-[28px]">
          {title}
        </p>
        {price && (
          <div className="space-y-0.5">
            {originalPrice && (
              <p className="text-[10px] text-[#C9CDD2] line-through leading-none">{originalPrice}</p>
            )}
            <div className="flex items-baseline gap-1">
              {discountRate != null && discountRate > 0 && (
                <span className="text-xs font-black text-[#DC2626]">{discountRate}%</span>
              )}
              <span className="text-sm font-black text-[#191F28]">{price}</span>
            </div>
          </div>
        )}
        {(rating != null || reviewCount != null) && (
          <div className="flex items-center gap-1 text-[10px] text-[#4E5968]">
            {rating != null && (
              <span className="flex items-center gap-0.5">
                <Star size={10} fill="#F59E0B" stroke="#F59E0B" />
                <span className="font-bold">{rating.toFixed(1)}</span>
              </span>
            )}
            {reviewCount != null && (
              <span className="text-[#8B95A1]">리뷰 {reviewCount.toLocaleString('ko-KR')}</span>
            )}
          </div>
        )}
      </div>
    </a>
  )
}
