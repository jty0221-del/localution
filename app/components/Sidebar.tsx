'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

interface UserInfo {
  name: string
  email: string
  avatar?: string
  provider?: string
}

const NAV = [
  { href: '/dashboard',   icon: '🏠', label: '대시보드' },
  { href: '/review',      icon: '⭐', label: 'AI 리뷰·마케팅' },
  { href: '/qr',          icon: '📱', label: 'QR 리뷰 자동화' },
  { href: '/crm',         icon: '👥', label: 'CRM 고객관리' },
  { href: '/settlement',  icon: '💰', label: '정산·행정' },
  { href: '/community',   icon: '💬', label: '커뮤니티' },
  { href: '/pricing',     icon: '💎', label: '요금제' },
]

const PROTECTED = [
  '/dashboard', '/review', '/qr', '/crm',
  '/settlement', '/community', '/pricing', '/settings', '/inquiry',
]

export default function Sidebar() {
  const [user, setUser]     = useState<UserInfo | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen]     = useState(false)
  const [imgOk, setImgOk]   = useState(true)
  const pathname = usePathname()
  const router   = useRouter()
  const popRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // sessionStorage 캐시 먼저 확인
    try {
      const cached = sessionStorage.getItem('localution_user')
      if (cached) {
        const u = JSON.parse(cached)
        if (u && u.name) { setUser(u); setLoaded(true); return }
      }
    } catch (_) {}

    fetch('/api/me')
      .then(function(r) { return r.json() })
      .then(function(data) {
        if (data && data.user && data.user.name) {
          setUser(data.user)
          try { sessionStorage.setItem('localution_user', JSON.stringify(data.user)) } catch (_) {}
        }
        setLoaded(true)
      })
      .catch(function() { setLoaded(true) })
  }, [])

  useEffect(() => {
    function onOut(e: MouseEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOut)
    return function() { document.removeEventListener('mousedown', onOut) }
  }, [])

  function handleLogout() {
    setOpen(false)
    // 쿠키 즉시 삭제
    document.cookie = 'localution_session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    // sessionStorage 삭제 (홈페이지 자동 리다이렉트 방지)
    try { sessionStorage.removeItem('localution_user') } catch (_) {}
    try { sessionStorage.clear() } catch (_) {}
    // API 로그아웃 (fire-and-forget)
    fetch('/api/auth/logout', { method: 'POST' }).catch(function() {})
    // 즉시 로그인 페이지로
    router.push('/login')
  }

  // pathname null 안전 체크
  const pn = pathname || ''
  const show = PROTECTED.some(function(p) { return pn === p || pn.startsWith(p + '/') })
  if (!show) return null

  return (
    <div style={{
      position: 'fixed', left: 0, top: 0, bottom: 0, width: '220px',
      background: '#0F172A',
      borderRight: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', flexDirection: 'column',
      zIndex: 50,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>

      {/* ── 상단 로고 ── */}
      <div style={{
        padding: '22px 18px 18px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
          {imgOk ? (
            <img
              src="/logo.png"
              alt="로컬루션"
              style={{ height: '32px', width: 'auto', flexShrink: 0 }}
              onError={function() { setImgOk(false) }}
            />
          ) : (
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
              background: 'linear-gradient(135deg, #3182F6 0%, #6366F1 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 12px rgba(49,130,246,0.4)',
            }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: '15px' }}>L</span>
            </div>
          )}
          <div>
            <div style={{
              fontSize: '20px', fontWeight: 800, color: '#ffffff',
              letterSpacing: '-0.6px', lineHeight: '1.1',
            }}>로컬루션</div>
            <div style={{
              fontSize: '10px', color: 'rgba(255,255,255,0.35)',
              marginTop: '1px', letterSpacing: '0.02em',
            }}>AI 마케팅 자동화</div>
          </div>
        </div>
      </div>

      {/* ── 네비게이션 ── */}
      <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
        {NAV.map(function(item) {
          const active = pn === item.href || pn.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 12px', borderRadius: '10px', marginBottom: '2px',
                background: active ? 'rgba(49,130,246,0.16)' : 'transparent',
                color: active ? '#60A5FA' : 'rgba(255,255,255,0.6)',
                textDecoration: 'none', fontSize: '13px',
                fontWeight: active ? 600 : 400,
                borderLeft: active ? '3px solid #3182F6' : '3px solid transparent',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={function(e) {
                if (!active) {
                  (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.05)'
                  ;(e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.85)'
                }
              }}
              onMouseLeave={function(e) {
                if (!active) {
                  (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.6)'
                }
              }}
            >
              <span style={{ fontSize: '15px', flexShrink: 0 }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* ── 유저 프로필 ── */}
      <div style={{ padding: '8px', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <div ref={popRef} style={{ position: 'relative' }}>

          {/* 팝업 */}
          {open && (
            <div style={{
              position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, right: 0,
              background: '#1E293B',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px', padding: '6px',
              boxShadow: '0 -12px 32px rgba(0,0,0,0.5)',
              zIndex: 10,
            }}>
              {[
                { icon: '⚙️', label: '설정', href: '/settings' },
                { icon: '💬', label: '1:1 문의', href: '/inquiry' },
              ].map(function(item) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={function() { setOpen(false) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 12px', borderRadius: '8px',
                      color: 'rgba(255,255,255,0.78)', textDecoration: 'none',
                      fontSize: '13px', fontWeight: 500,
                    }}
                    onMouseEnter={function(e) {
                      (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.07)'
                    }}
                    onMouseLeave={function(e) {
                      (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'
                    }}
                  >
                    <span>{item.icon}</span><span>{item.label}</span>
                  </Link>
                )
              })}
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '4px 2px' }} />
              <button
                onClick={handleLogout}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  width: '100%', padding: '10px 12px', borderRadius: '8px',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: '#F87171', fontSize: '13px', fontWeight: 500, textAlign: 'left',
                }}
                onMouseEnter={function(e) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(248,113,113,0.1)'
                }}
                onMouseLeave={function(e) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                }}
              >
                <span>🚪</span><span>로그아웃</span>
              </button>
            </div>
          )}

          {/* 프로필 버튼 */}
          <button
            onClick={function() { setOpen(function(v) { return !v }) }}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              width: '100%', padding: '10px 12px', borderRadius: '10px',
              background: open ? 'rgba(255,255,255,0.07)' : 'transparent',
              border: '1px solid rgba(255,255,255,0.07)',
              cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s',
            }}
            onMouseEnter={function(e) {
              if (!open) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'
            }}
            onMouseLeave={function(e) {
              if (!open) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
            }}
          >
            <div style={{
              width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #3182F6 0%, #6366F1 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            }}>
              {user && user.avatar ? (
                <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>
                  {user ? user.name.charAt(0) : '?'}
                </span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '13px', fontWeight: 600, color: '#ffffff',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {loaded ? (user ? user.name : '사용자') : '···'}
              </div>
              <div style={{
                fontSize: '11px', color: 'rgba(255,255,255,0.38)', marginTop: '1px',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user ? (user.provider ? user.provider + ' 로그인' : user.email) : ''}
              </div>
            </div>
            <span style={{
              color: 'rgba(255,255,255,0.25)', fontSize: '10px', flexShrink: 0,
              transform: open ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s',
            }}>▲</span>
          </button>
        </div>
      </div>
    </div>
  )
}
