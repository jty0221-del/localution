'use client'
import { useState } from 'react'

const todayReservations = [
  { id: 1, time: '11:30', name: '김정수', people: 4, phone: '010-****-1234', status: 'confirmed', note: 'VIP 고객 / 창가석 요청' },
  { id: 2, time: '12:00', name: '이수연', people: 2, phone: '010-****-5678', status: 'confirmed', note: '' },
  { id: 3, time: '12:30', name: '박민준', people: 6, phone: '010-****-9012', status: 'confirmed', note: '회식 / 코스요리' },
  { id: 4, time: '18:00', name: '최유진', people: 3, phone: '010-****-3456', status: 'pending', note: '어린이 동반' },
  { id: 5, time: '18:30', name: '정하늘', people: 8, phone: '010-****-7890', status: 'confirmed', note: '생일파티 / 케이크 반입' },
  { id: 6, time: '19:00', name: '한지민', people: 2, phone: '010-****-2345', status: 'cancelled', note: '노쇼 이력 1회' },
  { id: 7, time: '19:30', name: '송민호', people: 5, phone: '010-****-6789', status: 'pending', note: '' },
]

const statusMap: Record<string, { label: string; color: string; bg: string }> = {
  confirmed: { label: '확정', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  pending: { label: '대기', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  cancelled: { label: '취소', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
}

export default function ReservationsPage() {
  const [reservations] = useState(todayReservations)
  const confirmed = reservations.filter(r => r.status === 'confirmed').length
  const totalPeople = reservations.filter(r => r.status !== 'cancelled').reduce((s, r) => s + r.people, 0)

  return (
    <div style={{ padding: '32px', maxWidth: 960 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: '#fff' }}>예약 관리</h1>
      <p style={{ color: '#94a3b8', marginBottom: 24 }}>오늘의 예약 현황을 확인하고 관리하세요</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        {[
          { label: '오늘 예약', value: reservations.length + '건' },
          { label: '확정', value: confirmed + '건' },
          { label: '예상 방문객', value: totalPeople + '명' },
          { label: '노쇼 주의', value: '1건' },
        ].map((c, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 20,
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>{c.label}</p>
            <p style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>{c.value}</p>
          </div>
        ))}
      </div>

      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.06)' }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 20 }}>오늘 예약 목록</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reservations.map(r => {
            const st = statusMap[r.status]
            return (
              <div key={r.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.04)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ color: '#3b82f6', fontWeight: 700, fontSize: 16, width: 56 }}>{r.time}</span>
                  <div>
                    <p style={{ color: '#fff', fontWeight: 600, marginBottom: 4 }}>{r.name} · {r.people}명</p>
                    <p style={{ color: '#64748b', fontSize: 13 }}>{r.phone}{r.note ? ' · ' + r.note : ''}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ background: st.bg, color: st.color, padding: '4px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{st.label}</span>
                  {r.status === 'pending' && (
                    <button style={{ padding: '6px 14px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>확정</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
