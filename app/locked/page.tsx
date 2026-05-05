/**
 * /locked — 미구독 모듈 클릭 시 이동하는 결제 유도 페이지
 *
 * Query param: ?m=<moduleId>
 * Phase 0: localStorage 기반 모의 결제
 * Phase 2: 토스페이먼츠 빌링키 발급 플로우
 */

'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState, Suspense } from 'react'
import {
 MODULES,
 getModule,
 calculateMonthlyTotal,
 type ModuleId,
} from '../lib/modules'
import { useEntitlements } from '../lib/entitlements'

function LockedPageInner() {
 const sp = useSearchParams()
 const router = useRouter()
 const { has, mockPurchase, loading } = useEntitlements()

 const initialModuleId = sp.get('m') as ModuleId | null
 const redirectTo = sp.get('redirect') || ''

 // 번들 선택 UI: 기본으로 요청받은 모듈 1개, 사용자가 체크박스로 더 추가 가능
 const [selected, setSelected] = useState<Set<ModuleId>>(
 new Set(initialModuleId && getModule(initialModuleId) ? [initialModuleId] : [])
 )
 const [processing, setProcessing] = useState(false)
 const [done, setDone] = useState(false)

 useEffect(() => {
 // 이미 구독 중이면 바로 리다이렉트
 if (!loading && initialModuleId && has(initialModuleId)) {
 router.replace(redirectTo || '/dashboard')
 }
 }, [loading, initialModuleId, has, redirectTo, router])

 const toggle = (id: ModuleId) => {
 const next = new Set(selected)
 if (next.has(id)) next.delete(id)
 else next.add(id)
 setSelected(next)
 }

 const selectedIds = Array.from(selected)
 const pricing = calculateMonthlyTotal(selectedIds)

 const handlePurchase = async () => {
 if (selectedIds.length === 0) return
 setProcessing(true)
 // 모의 결제 지연
 await new Promise(r => setTimeout(r, 800))
 selectedIds.forEach(id => mockPurchase(id))
 setDone(true)
 setProcessing(false)
 setTimeout(() => {
 router.replace(redirectTo || '/my/subscription')
 }, 1200)
 }

 const targetModule = initialModuleId ? getModule(initialModuleId) : null

 if (done) {
 return (
 <div
 style={{
 minHeight: '80vh',
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'center',
 padding: 24,
 }}
 >
 <div style={{ textAlign: 'center' }}>
 <div style={{ fontSize: 64, marginBottom: 12 }}></div>
 <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
 구독이 완료되었어요
 </h1>
 <p style={{ color: '#6b7280' }}>잠시 후 페이지로 이동합니다...</p>
 </div>
 </div>
 )
 }

 return (
 <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px' }}>
 {/* 상단 안내 */}
 <div
 style={{
 background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
 borderRadius: 16,
 padding: 24,
 color: '#fff',
 marginBottom: 24,
 }}
 >
 <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.9, marginBottom: 8 }}>
 구독이 필요한 기능이에요
 </div>
 <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
 {targetModule
 ? `${targetModule.name}을(를) 사용하려면 구독하세요`
 : '필요한 모듈을 선택하세요'}
 </h1>
 <p style={{ fontSize: 14, opacity: 0.95, lineHeight: 1.5 }}>
 필요한 것만 선택 · 월 단위 결제 · 언제든 해지 가능
 </p>
 </div>

 {/* 번들 할인 안내 */}
 <div
 style={{
 background: '#eef2ff',
 border: '1px solid #c7d2fe',
 borderRadius: 12,
 padding: 16,
 marginBottom: 20,
 fontSize: 14,
 color: '#3730a3',
 }}
 >
 <b>번들 할인:</b> 3개 구독 10% · 5개 구독 15% · 8개 이상 20% 할인
 </div>

 {/* 모듈 선택 리스트 */}
 <div style={{ marginBottom: 24 }}>
 <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: '#111827' }}>
 구독할 모듈 선택
 </div>
 <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
 {MODULES.filter(m => m.status === 'live' || m.status === 'beta').map(mod => {
 const isSelected = selected.has(mod.id)
 const alreadyOwned = has(mod.id)
 return (
 <label
 key={mod.id}
 style={{
 display: 'flex',
 alignItems: 'center',
 gap: 12,
 padding: 12,
 borderRadius: 10,
 border: `2px solid ${
 alreadyOwned ? '#d1d5db' : isSelected ? '#111827' : '#e5e7eb'
 }`,
 background: alreadyOwned ? '#f9fafb' : '#fff',
 cursor: alreadyOwned ? 'not-allowed' : 'pointer',
 opacity: alreadyOwned ? 0.6 : 1,
 }}
 >
 <input
 type="checkbox"
 checked={isSelected || alreadyOwned}
 disabled={alreadyOwned}
 onChange={() => !alreadyOwned && toggle(mod.id)}
 style={{ width: 18, height: 18, accentColor: '#111827' }}
 />
 <div style={{ flex: 1 }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
 <span style={{ fontWeight: 700, color: '#111827' }}>{mod.name}</span>
 {mod.popular && (
 <span
 style={{
 fontSize: 10,
 padding: '2px 6px',
 background: '#fef3c7',
 color: '#b45309',
 borderRadius: 4,
 fontWeight: 700,
 }}
 >
 인기
 </span>
 )}
 {alreadyOwned && (
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
 구독 중
 </span>
 )}
 </div>
 <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
 {mod.desc}
 </div>
 </div>
 <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
 {mod.price.toLocaleString('ko-KR')}원
 </div>
 </label>
 )
 })}
 </div>
 </div>

 {/* 요약 + 결제 */}
 <div
 style={{
 background: '#fff',
 border: '2px solid #111827',
 borderRadius: 16,
 padding: 20,
 position: 'sticky',
 bottom: 20,
 }}
 >
 <div
 style={{
 display: 'flex',
 justifyContent: 'space-between',
 marginBottom: 6,
 fontSize: 13,
 color: '#6b7280',
 }}
 >
 <span>선택한 모듈 {selectedIds.length}개</span>
 <span>{pricing.subtotal.toLocaleString('ko-KR')}원</span>
 </div>
 {pricing.discount > 0 && (
 <div
 style={{
 display: 'flex',
 justifyContent: 'space-between',
 marginBottom: 6,
 fontSize: 13,
 color: '#dc2626',
 }}
 >
 <span>번들 할인 ({Math.round(pricing.discountRate * 100)}%)</span>
 <span>-{pricing.discount.toLocaleString('ko-KR')}원</span>
 </div>
 )}
 <div
 style={{
 display: 'flex',
 justifyContent: 'space-between',
 alignItems: 'baseline',
 paddingTop: 8,
 borderTop: '1px solid #e5e7eb',
 marginBottom: 12,
 }}
 >
 <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
 월 결제 총액
 </span>
 <span style={{ fontSize: 24, fontWeight: 800, color: '#111827' }}>
 {pricing.total.toLocaleString('ko-KR')}원
 </span>
 </div>

 <button
 onClick={handlePurchase}
 disabled={selectedIds.length === 0 || processing}
 style={{
 width: '100%',
 padding: 14,
 borderRadius: 10,
 background: selectedIds.length === 0 ? '#d1d5db' : '#111827',
 color: '#fff',
 border: 'none',
 fontSize: 15,
 fontWeight: 700,
 cursor: selectedIds.length === 0 ? 'not-allowed' : 'pointer',
 }}
 >
 {processing
 ? '결제 처리 중...'
 : selectedIds.length === 0
 ? '모듈을 선택하세요'
 : `${pricing.total.toLocaleString('ko-KR')}원 결제하고 바로 사용하기`}
 </button>

 <div
 style={{
 marginTop: 10,
 textAlign: 'center',
 fontSize: 11,
 color: '#9ca3af',
 }}
 >
 현재 Phase 0 테스트 모드 · 실제 결제 없음 · localStorage에만 저장됩니다
 </div>

 <div style={{ marginTop: 12, textAlign: 'center' }}>
 <Link
 href="/pricing"
 style={{ fontSize: 13, color: '#6b7280', textDecoration: 'underline' }}
 >
 전체 가격표 보기
 </Link>
 </div>
 </div>
 </div>
 )
}

export default function LockedPage() {
 return (
 <Suspense
 fallback={
 <div style={{ padding: 48, textAlign: 'center', color: '#6b7280' }}>
 로딩 중...
 </div>
 }
 >
 <LockedPageInner />
 </Suspense>
 )
}
