/**
 * LockedBanner — 미구독 모듈 접근 시 표시되는 결제 유도 배너
 *
 * /locked 페이지로 이동 또는 인라인으로 사용 가능.
 */

'use client'

import Link from 'next/link'
import { getModule, type ModuleId } from '../lib/modules'

interface LockedBannerProps {
  moduleId: ModuleId
  additionalIds?: ModuleId[]
  /** 인라인 모드 (전체 화면 대신 좁은 배너) */
  inline?: boolean
}

export default function LockedBanner({
  moduleId,
  additionalIds = [],
  inline = false,
}: LockedBannerProps) {
  const mod = getModule(moduleId)
  if (!mod) return null

  const formatPrice = (p: number) => p.toLocaleString('ko-KR')

  if (inline) {
    return (
      <div
        style={{
          padding: '12px 16px',
          background: '#fef3c7',
          border: '1px solid #fcd34d',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ fontSize: 14, color: '#92400e' }}>
          <b>{mod.name}</b> 모듈 구독이 필요해요 (월 {formatPrice(mod.price)}원)
        </div>
        <Link
          href={`/locked?m=${mod.id}`}
          style={{
            background: '#f59e0b',
            color: '#fff',
            padding: '6px 12px',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          구독하기
        </Link>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 200px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: '#f9fafb',
      }}
    >
      <div
        style={{
          maxWidth: 520,
          width: '100%',
          background: '#fff',
          borderRadius: 16,
          padding: 32,
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          border: '1px solid #e5e7eb',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 8 }}>🔒</div>
        <div
          style={{
            display: 'inline-block',
            padding: '4px 10px',
            background: '#eef2ff',
            color: '#4338ca',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 12,
          }}
        >
          {mod.category} · 월 {formatPrice(mod.price)}원
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
          {mod.name}
        </h1>
        <p style={{ color: '#6b7280', fontSize: 15, lineHeight: 1.6, marginBottom: 20 }}>
          {mod.desc}
        </p>

        <div
          style={{
            background: '#f9fafb',
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#6b7280',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            이 모듈로 할 수 있는 것
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {mod.bullets.map(b => (
              <li
                key={b}
                style={{
                  padding: '6px 0',
                  fontSize: 14,
                  color: '#374151',
                  display: 'flex',
                  gap: 8,
                }}
              >
                <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
          <Link
            href={`/locked?m=${mod.id}`}
            style={{
              background: '#111827',
              color: '#fff',
              padding: '14px 20px',
              borderRadius: 10,
              textAlign: 'center',
              fontWeight: 700,
              fontSize: 15,
              textDecoration: 'none',
            }}
          >
            월 {formatPrice(mod.price)}원 구독하고 사용하기
          </Link>
          <Link
            href="/pricing"
            style={{
              background: '#fff',
              color: '#374151',
              padding: '12px 20px',
              borderRadius: 10,
              textAlign: 'center',
              fontWeight: 600,
              fontSize: 14,
              textDecoration: 'none',
              border: '1px solid #e5e7eb',
            }}
          >
            전체 모듈 가격 보기
          </Link>
        </div>

        {additionalIds.length > 0 && (
          <div style={{ marginTop: 16, fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
            또는 {additionalIds.map(id => getModule(id)?.name).filter(Boolean).join(', ')} 중
            하나를 구독해도 접근 가능합니다.
          </div>
        )}
      </div>
    </div>
  )
}
