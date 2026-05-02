'use client'

// ============================================================
// 2-D: 신규 사용자 onboarding checklist (4 step)
//   · 대시보드/홈 진입 시 가장 위에 큰 카드로 노출
//   · 각 step 완료 여부에 따라 ✅/⏸️ 표시
//   · 모든 step 완료 → 컴포넌트 자체가 숨김 (DB 기반 자동 판정)
// ============================================================
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Status = {
  store_registered: boolean      // step 1: 매장 정보 등록
  naver_connected: boolean       // step 2: 네이버 플레이스 연결 (자격증명)
  notify_configured: boolean     // step 3: 알림 채널 설정 (web push or kakao)
  qr_first_scan: boolean         // step 4: QR 첫 스캔 받음
}

export default function OnboardingChecklist() {
  const [status, setStatus] = useState<Status | null>(null)
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // 4가지 상태를 병렬 조회
        const [storesRes, prefsRes, kakaoRes, statsRes] = await Promise.all([
          fetch('/api/stores/me', { credentials: 'include', cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/notify/prefs', { credentials: 'include', cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/notify/kakao-status', { credentials: 'include', cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/qr/stats?days=30', { credentials: 'include', cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null),
        ])
        if (cancelled) return

        const store = storesRes?.store
        const platforms = storesRes?.platforms || []
        const naverConnected = platforms.some((p: any) => p.platform === 'naver_place' && p.connected)
        const prefs = prefsRes?.prefs
        const hasWebPush = !!(prefs?.has_web_push_sub && prefs?.channel_web_push)
        const hasKakao = !!(kakaoRes?.connected && prefs?.channel_kakao_talk)
        const firstScan = (statsRes?.funnel?.scan ?? 0) > 0

        setStatus({
          store_registered: !!(store && store.name),
          naver_connected: naverConnected,
          notify_configured: hasWebPush || hasKakao,
          qr_first_scan: firstScan,
        })

        // localStorage 에 dismiss 기록 — 사용자가 한 번 닫으면 그 세션엔 안 보임
        if (typeof window !== 'undefined' && sessionStorage.getItem('localution.onboarding_collapsed') === '1') {
          setCollapsed(true)
        }
      } catch (_) {}
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [])

  if (loading || !status) return null

  // 모두 완료 시 — 컴포넌트 자체 숨김
  const allDone = status.store_registered && status.naver_connected && status.notify_configured && status.qr_first_scan
  if (allDone) return null

  const doneCount = [status.store_registered, status.naver_connected, status.notify_configured, status.qr_first_scan]
    .filter(Boolean).length
  const pct = Math.round((doneCount / 4) * 100)

  if (collapsed) {
    return (
      <button
        onClick={() => {
          setCollapsed(false)
          try { sessionStorage.removeItem('localution.onboarding_collapsed') } catch {}
        }}
        className="fixed bottom-20 right-4 z-[45] px-4 py-2 rounded-full bg-[#3182F6] text-white text-xs font-bold shadow-lg hover:bg-[#1E40AF] flex items-center gap-2"
      >
        <span>🚀</span>
        <span>설정 {doneCount}/4 완료</span>
      </button>
    )
  }

  const STEPS = [
    {
      key: 'store_registered',
      done: status.store_registered,
      icon: '🏪',
      title: '매장 정보 등록',
      desc: '매장명, 주소, 카테고리 — 모든 페이지에 자동 반영',
      cta: '매장 등록하기',
      href: '/my/platforms/naver_place/connect',
    },
    {
      key: 'naver_connected',
      done: status.naver_connected,
      icon: '🟢',
      title: '네이버 플레이스 연결',
      desc: '답글 자동등록 + 매장 정보 자동 동기화',
      cta: '네이버 연결하기',
      href: '/my/platforms/naver_place/connect',
    },
    {
      key: 'notify_configured',
      done: status.notify_configured,
      icon: '🔔',
      title: '알림 받기 설정',
      desc: '새 리뷰가 오면 즉시 카카오톡 / 브라우저 알림',
      cta: '알림 켜기',
      href: '/settings?tab=notify',
    },
    {
      key: 'qr_first_scan',
      done: status.qr_first_scan,
      icon: '📱',
      title: 'QR 코드 만들기',
      desc: '손님이 영수증 + 사진 1장으로 리뷰 자동 작성',
      cta: 'QR 만들러 가기',
      href: '/qr-admin',
    },
  ]

  return (
    <div className="bg-gradient-to-br from-[#EFF6FF] via-[#F8FAFF] to-[#F3E8FF] rounded-2xl p-5 border border-[#BFDBFE] shadow-sm mb-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🚀</span>
          <div>
            <h3 className="font-black text-[#191F28] text-base">시작하기</h3>
            <p className="text-xs text-[#4E5968] mt-0.5">
              {doneCount}개 완료 · {4 - doneCount}개 남음 — 모두 끝나면 모든 기능 자동 작동
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setCollapsed(true)
            try { sessionStorage.setItem('localution.onboarding_collapsed', '1') } catch {}
          }}
          className="text-xs text-[#8B95A1] hover:text-[#191F28] px-2"
        >숨기기</button>
      </div>

      {/* 진행률 바 */}
      <div className="h-2 bg-white rounded-full overflow-hidden mb-5">
        <div
          className="h-full bg-gradient-to-r from-[#3182F6] to-[#7C3AED] transition-all"
          style={{ width: pct + '%' }}
        />
      </div>

      {/* 4 step 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {STEPS.map((s, i) => (
          <Link
            key={s.key}
            href={s.done ? '#' : s.href}
            onClick={s.done ? (e) => e.preventDefault() : undefined}
            className={`flex items-center gap-3 p-3.5 rounded-xl transition-colors ${
              s.done
                ? 'bg-[#F0FDF4] border-2 border-[#BBF7D0] cursor-default'
                : 'bg-white border-2 border-[#E5E8EB] hover:border-[#3182F6] hover:shadow-md cursor-pointer'
            }`}>
            <div className="flex-shrink-0 relative">
              <span className="text-2xl">{s.icon}</span>
              <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white ${
                s.done ? 'bg-[#059669] text-white' : 'bg-[#E5E8EB] text-[#8B95A1]'
              }`}>
                {s.done ? '✓' : i + 1}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold truncate ${s.done ? 'text-[#059669]' : 'text-[#191F28]'}`}>
                {s.title}
                {s.done && <span className="text-[10px] ml-1.5 font-medium">완료</span>}
              </p>
              <p className="text-[11px] text-[#8B95A1] truncate">
                {s.done ? '✅ 잘 되고 있어요' : s.desc}
              </p>
            </div>
            {!s.done && (
              <span className="text-xs text-[#3182F6] font-bold whitespace-nowrap">
                {s.cta} →
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
