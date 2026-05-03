'use client'

// ============================================================
// ReviewPollingToast — review-admin 페이지에서 60초마다 새 리뷰 확인
//   · 직전 polling 이후 도착한 리뷰 발견 시 토스트 + 사운드
//   · cron 15분 주기 + 페이지 60초 polling = 거의 실시간 체감
// ============================================================
import { useEffect, useRef, useState } from 'react'
import { MessageSquare } from 'lucide-react'

type Props = {
  platform: 'naver_place' | 'baemin' | 'yogiyo' | 'coupangeats' | 'kakao_map'
}

export default function ReviewPollingToast({ platform }: Props) {
  const [toast, setToast] = useState<string | null>(null)
  const lastSeenRef = useRef<string | null>(null)
  const tickRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const POLL_MS = 60_000  // 1분 주기

    const tick = async () => {
      try {
        const res = await fetch(`/api/place/reviews/list?platform=${platform}&limit=1&order=desc`)
        if (!res.ok) return
        const j = await res.json().catch(() => null)
        const latest = j?.reviews?.[0]
        if (!latest) return
        const id = String(latest.platform_review_id || latest.id || '')
        if (!lastSeenRef.current) {
          lastSeenRef.current = id
          return  // 첫 polling — baseline 만 설정
        }
        if (id !== lastSeenRef.current) {
          // 새 리뷰 도착
          const ratingText = typeof latest.rating === 'number' ? `${latest.rating}점` : ''
          setToast(`새 리뷰 도착 ${ratingText}`)
          lastSeenRef.current = id
          setTimeout(() => setToast(null), 5000)
        }
      } catch {}
    }

    // 페이지 visible 일 때만 polling (배터리/CPU 절약)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        tick()
        if (!tickRef.current) tickRef.current = setInterval(tick, POLL_MS)
      } else {
        if (tickRef.current) {
          clearInterval(tickRef.current)
          tickRef.current = null
        }
      }
    }

    onVisibilityChange()  // 초기 실행
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [platform])

  if (!toast) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-full bg-[#191F28] text-white text-sm font-bold shadow-2xl animate-bounce-once flex items-center gap-2">
      <MessageSquare size={14} strokeWidth={2.5} />
      <span>{toast}</span>
    </div>
  )
}
