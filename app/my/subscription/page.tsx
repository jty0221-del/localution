/**
 * /my/subscription — 내 구독 관리 페이지
 *
 * 구독 중인 모듈 / 미구독 모듈 / 월 결제 총액 / 해지 기능
 * Phase 0: localStorage 기반 / Phase 2: 토스페이먼츠 연동
 */

'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  MODULES,
  getModule,
  calculateMonthlyTotal,
  type Module,
} from '../../lib/modules'
import { useEntitlements } from '../../lib/entitlements'

export const dynamic = 'force-dynamic'

export default function MySubscriptionPage() {
  const { active, entitlements, cancel, loading, devUnlockAll, toggleDevUnlock } =
    useEntitlements()
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null)

  const activeModules = MODULES.filter(m => active.includes(m.id))
  const inactiveModules = MODULES.filter(
    m => !active.includes(m.id) && (m.status === 'live' || m.status === 'beta')
  )
  const pricing = calculateMonthlyTotal(activeModules.map(m => m.id))

  const formatKRW = (n: number) => n.toLocaleString('ko-KR') + '원'
  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  }

  if (loading) {
    // 15차-10 스켈레톤 로더 (요약카드 + 모듈카드 2개 placeholder)
    return (
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px 120px' }}>
        <div style={{ marginBottom: 24 }}>
          <div className="animate-pulse" style={{ height: 32, width: 120, background: '#E5E8EB', borderRadius: 8, marginBottom: 10 }} />
          <div className="animate-pulse" style={{ height: 14, width: 260, background: '#F2F4F6', borderRadius: 6 }} />
        </div>
        <div
          className="animate-pulse"
          style={{
            background: 'linear-gradient(135deg, #E0E7FF 0%, #C7D2FE 100%)',
            borderRadius: 20,
            padding: 24,
            marginBottom: 24,
            height: 140,
          }}
        />
        {[0, 1].map(i => (
          <div
            key={i}
            className="animate-pulse"
            style={{
              background: '#fff',
              border: '1px solid #F2F4F6',
              borderRadius: 16,
              padding: 20,
              marginBottom: 12,
              height: 96,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#F2F4F6' }} />
            <div style={{ flex: 1 }}>
              <div style={{ height: 14, width: '40%', background: '#F2F4F6', borderRadius: 6, marginBottom: 8 }} />
              <div style={{ height: 10, width: '65%', background: '#F2F4F6', borderRadius: 6 }} />
            </div>
            <div style={{ width: 70, height: 30, background: '#F2F4F6', borderRadius: 8 }} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px 120px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', marginBottom: 6 }}>
          내 구독
        </h1>
        <p style={{ color: '#6b7280', fontSize: 14 }}>
          필요한 모듈만 선택해 사용하세요 · 언제든 추가·해지 가능
        </p>
      </div>

      {/* 월 결제 요약 카드 */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)',
          borderRadius: 20,
          padding: 24,
          color: '#fff',
          marginBottom: 24,
          boxShadow: '0 8px 24px rgba(30,58,138,0.2)',
        }}
      >
        <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4, fontWeight: 600 }}>
          이번 달 결제 예정
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 40, fontWeight: 900 }}>
            {pricing.total.toLocaleString('ko-KR')}
          </span>
          <span style={{ fontSize: 18, fontWeight: 600, opacity: 0.9 }}>원/월</span>
        </div>
        {pricing.discountRate > 0 && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            🎉 번들 할인 {Math.round(pricing.discountRate * 100)}% 적용 중
          </div>
        )}
        <div style={{ fontSize: 13, opacity: 0.85 }}>
          활성 모듈 {activeModules.length}개 · 소계 {formatKRW(pricing.subtotal)}
          {pricing.discount > 0 && ` · 할인 -${formatKRW(pricing.discount)}`}
        </div>
      </div>

      {/* 개발 모드 토글 (Phase 0 전용) */}
      <div
        style={{
          background: '#fef3c7',
          border: '1px dashed #f59e0b',
          borderRadius: 10,
          padding: 12,
          marginBottom: 20,
          fontSize: 12,
          color: '#92400e',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>⚠️ Phase 0 테스트 모드 · 개발자 옵션: 모든 모듈 강제 언락</span>
        <button
          onClick={toggleDevUnlock}
          style={{
            padding: '4px 10px',
            borderRadius: 6,
            background: devUnlockAll ? '#10b981' : '#fff',
            color: devUnlockAll ? '#fff' : '#92400e',
            border: '1px solid ' + (devUnlockAll ? '#10b981' : '#f59e0b'),
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {devUnlockAll ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* 구독 중인 모듈 */}
      <section style={{ marginBottom: 32 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 12,
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
            구독 중인 모듈{' '}
            <span style={{ color: '#6b7280', fontWeight: 500 }}>
              ({activeModules.length})
            </span>
          </h2>
          {activeModules.length > 0 && (
            <Link
              href="/locked"
              style={{ fontSize: 13, color: '#3730a3', fontWeight: 600 }}
            >
              + 모듈 추가
            </Link>
          )}
        </div>

        {activeModules.length === 0 ? (
          <div
            style={{
              background: '#f9fafb',
              border: '2px dashed #e5e7eb',
              borderRadius: 12,
              padding: 32,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 8 }}>📦</div>
            <div style={{ fontWeight: 700, color: '#111827', marginBottom: 4 }}>
              아직 구독 중인 모듈이 없어요
            </div>
            <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 16 }}>
              필요한 기능만 선택해 시작하세요 (월 990원부터)
            </p>
            <Link
              href="/pricing"
              style={{
                display: 'inline-block',
                padding: '10px 20px',
                background: '#111827',
                color: '#fff',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              모듈 둘러보기
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeModules.map(mod => {
              const ent = entitlements.find(e => e.moduleId === mod.id)
              return (
                <div
                  key={mod.id}
                  style={{
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 12,
                    padding: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: '#eef2ff',
                      color: '#3730a3',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 14,
                      flexShrink: 0,
                    }}
                  >
                    {mod.shortName.slice(0, 2)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 700, color: '#111827' }}>
                        {mod.name}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          padding: '2px 6px',
                          background: '#d1fae5',
                          color: '#065f46',
                          borderRadius: 4,
                          fontWeight: 700,
                        }}
                      >
                        활성
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                      월 {formatKRW(mod.price)}
                      {ent && ` · 다음 결제일 ${formatDate(ent.renewsAt)}`}
                    </div>
                  </div>
                  <button
                    onClick={() => setConfirmCancelId(mod.id)}
                    style={{
                      padding: '6px 12px',
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      fontSize: 12,
                      color: '#6b7280',
                      cursor: 'pointer',
                    }}
                  >
                    해지
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* 추가할 수 있는 모듈 */}
      {inactiveModules.length > 0 && (
        <section>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 12 }}>
            추가할 수 있는 모듈
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 10,
            }}
          >
            {inactiveModules.map(mod => (
              <Link
                key={mod.id}
                href={`/locked?m=${mod.id}`}
                style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 12,
                  padding: 14,
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'block',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: '#111827', fontSize: 14 }}>
                    {mod.name}
                  </span>
                  {mod.popular && (
                    <span
                      style={{
                        fontSize: 9,
                        padding: '1px 5px',
                        background: '#fef3c7',
                        color: '#b45309',
                        borderRadius: 3,
                        fontWeight: 700,
                      }}
                    >
                      인기
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10, lineHeight: 1.4 }}>
                  {mod.desc}
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>
                    월 {formatKRW(mod.price)}
                  </span>
                  <span style={{ fontSize: 12, color: '#3730a3', fontWeight: 600 }}>
                    추가하기 →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 해지 확인 모달 */}
      {confirmCancelId && (() => {
        const mod = getModule(confirmCancelId as Module['id'])
        if (!mod) return null
        return (
          <div
            onClick={() => setConfirmCancelId(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: 16,
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: '#fff',
                borderRadius: 16,
                padding: 24,
                maxWidth: 400,
                width: '100%',
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
                {mod.name} 해지
              </h3>
              <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.5, marginBottom: 20 }}>
                이 모듈의 모든 기능에 즉시 접근할 수 없게 됩니다. 저장된 데이터는 30일간 보관 후 삭제됩니다.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setConfirmCancelId(null)}
                  style={{
                    flex: 1,
                    padding: 12,
                    background: '#f3f4f6',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  취소
                </button>
                <button
                  onClick={() => {
                    cancel(mod.id)
                    setConfirmCancelId(null)
                  }}
                  style={{
                    flex: 1,
                    padding: 12,
                    background: '#dc2626',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  해지하기
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
