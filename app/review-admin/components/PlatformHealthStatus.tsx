'use client'
// app/review-admin/components/PlatformHealthStatus.tsx
// 플랫폼 자가점검 상태 위젯

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Zap } from 'lucide-react'

const PLATFORM_LABEL: Record<string, string> = {
  naver_place: '네이버',
  baemin: '배민',
  yogiyo: '요기요',
  coupangeats: '쿠팡이츠',
  kakao_map: '카카오맵',
}

const PLATFORM_COLOR: Record<string, string> = {
  naver_place: '#03C75A',
  baemin: '#2AC1BC',
  yogiyo: '#FA1F59',
  coupangeats: '#FFCD00',
  kakao_map: '#FEE500',
}

type PlatformStatus = {
  platform: string
  storeId: string | null
  storeName: string | null
  lastCheckedAt: string | null
  status: 'ok' | 'failed' | 'unknown'
  rawStatus: string | null
}

function timeAgo(iso: string | null): string {
  if (!iso) return '미확인'
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '방금'
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  return `${Math.floor(hr / 24)}일 전`
}

export default function PlatformHealthStatus() {
  const [platforms, setPlatforms] = useState<PlatformStatus[]>([])
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/platform-health')
      if (!res.ok) return
      const data = await res.json()
      setPlatforms(data.platforms || [])
      setLastRefresh(new Date().toLocaleTimeString('ko-KR'))
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 60000) // 1분마다 자동 갱신
    return () => clearInterval(interval)
  }, [fetchStatus])

  const runHealthCheck = async (platform?: string) => {
    setChecking(true)
    setMessage(null)
    try {
      const res = await fetch('/api/platform-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(platform ? { platform } : {}),
      })
      const data = await res.json()
      setMessage(data.message || '점검 시작됨')
      // 15초 후 상태 갱신 (worker 처리 시간 고려)
      setTimeout(() => { fetchStatus(); setMessage(null) }, 15000)
    } catch {
      setMessage('점검 요청 실패')
    } finally {
      setChecking(false)
    }
  }

  if (platforms.length === 0 && !loading) return null

  return (
    <div style={{
      background: '#0f1117',
      border: '1px solid #1e2130',
      borderRadius: 12,
      padding: '16px 20px',
      marginBottom: 20,
    }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={16} color="#6366f1" />
          <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 14 }}>플랫폼 연결 상태</span>
          {lastRefresh && (
            <span style={{ color: '#64748b', fontSize: 11 }}>· {lastRefresh} 기준</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => fetchStatus()}
            disabled={loading}
            style={{
              background: 'transparent',
              border: '1px solid #2d3748',
              borderRadius: 6,
              padding: '4px 10px',
              color: '#94a3b8',
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            새로고침
          </button>
          <button
            onClick={() => runHealthCheck()}
            disabled={checking}
            style={{
              background: checking ? '#312e81' : '#4f46e5',
              border: 'none',
              borderRadius: 6,
              padding: '4px 12px',
              color: '#fff',
              fontSize: 12,
              cursor: checking ? 'not-allowed' : 'pointer',
              fontWeight: 600,
            }}
          >
            {checking ? '점검 중...' : '전체 점검 실행'}
          </button>
        </div>
      </div>

      {/* 메시지 */}
      {message && (
        <div style={{
          background: '#1e1b4b',
          border: '1px solid #4f46e5',
          borderRadius: 6,
          padding: '6px 12px',
          marginBottom: 12,
          color: '#a5b4fc',
          fontSize: 12,
        }}>
          {message} (약 15초 후 결과 반영)
        </div>
      )}

      {/* 플랫폼 카드 그리드 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: 10,
      }}>
        {platforms.map((p) => (
          <div
            key={p.platform}
            style={{
              background: '#141824',
              border: `1px solid ${p.status === 'ok' ? '#166534' : p.status === 'failed' ? '#7f1d1d' : '#374151'}`,
              borderRadius: 8,
              padding: '10px 12px',
              position: 'relative',
            }}
          >
            {/* 플랫폼명 + 상태 아이콘 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: PLATFORM_COLOR[p.platform] || '#6b7280',
                }} />
                <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>
                  {PLATFORM_LABEL[p.platform] || p.platform}
                </span>
              </div>
              {p.status === 'ok'
                ? <CheckCircle size={14} color="#4ade80" />
                : p.status === 'failed'
                ? <XCircle size={14} color="#f87171" />
                : <AlertCircle size={14} color="#fbbf24" />
              }
            </div>

            {/* 매장명 */}
            {p.storeName && (
              <div style={{ color: '#64748b', fontSize: 11, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.storeName}
              </div>
            )}

            {/* 상태 텍스트 */}
            <div style={{
              color: p.status === 'ok' ? '#4ade80' : p.status === 'failed' ? '#f87171' : '#fbbf24',
              fontSize: 11,
              fontWeight: 500,
              marginBottom: 4,
            }}>
              {p.status === 'ok' ? '정상' : p.status === 'failed' ? '오류' : '미확인'}
            </div>

            {/* 마지막 확인 시간 */}
            <div style={{ color: '#475569', fontSize: 10 }}>
              {timeAgo(p.lastCheckedAt)}
            </div>

            {/* 개별 점검 버튼 */}
            <button
              onClick={() => runHealthCheck(p.platform)}
              disabled={checking}
              style={{
                marginTop: 8,
                width: '100%',
                background: '#1e2130',
                border: '1px solid #2d3748',
                borderRadius: 4,
                padding: '3px 0',
                color: '#94a3b8',
                fontSize: 10,
                cursor: checking ? 'not-allowed' : 'pointer',
              }}
            >
              점검
            </button>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
