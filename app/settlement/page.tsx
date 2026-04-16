'use client'
import { useState } from 'react'

const weekDays = ['월', '화', '수', '목', '금', '토', '일']
const weekData = [
  { day: '월', amount: 142, card: 98, cash: 44 },
  { day: '화', amount: 168, card: 121, cash: 47 },
  { day: '수', amount: 195, card: 145, cash: 50 },
  { day: '목', amount: 178, card: 130, cash: 48 },
  { day: '금', amount: 247, card: 190, cash: 57 },
  { day: '토', amount: 312, card: 245, cash: 67 },
  { day: '일', amount: 228, card: 175, cash: 53 },
]

const recentTx = [
  { id: 1, date: '04/16 14:32', type: '카드', amount: 45000, method: '신한카드', status: 'done' },
  { id: 2, date: '04/16 13:15', type: '카드', amount: 32000, method: 'KB국민', status: 'done' },
  { id: 3, date: '04/16 12:48', type: '현금', amount: 28000, method: '현금', status: 'done' },
  { id: 4, date: '04/16 12:02', type: '카드', amount: 67000, method: '삼성카드', status: 'done' },
  { id: 5, date: '04/16 11:30', type: '배민', amount: 35000, method: '배달의민족', status: 'pending' },
  { id: 6, date: '04/16 10:45', type: '요기요', amount: 28000, method: '요기요', status: 'pending' },
]

export default function SettlementPage() {
  const [tab, setTab] = useState('daily')
  const maxAmount = Math.max(...weekData.map(d => d.amount))
  const totalWeek = weekData.reduce((sum, d) => sum + d.amount, 0)

  return (
    <div style={{ padding: '32px', maxWidth: 960 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: '#fff' }}>정산 · 매출 관리</h1>
      <p style={{ color: '#94a3b8', marginBottom: 24 }}>매출 현황을 한눈에 확인하고 세금계산서를 간편하게 발행하세요</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        {[
          { label: '이번 주 매출', value: totalWeek + '만원', change: '+18%', positive: true },
          { label: '이번 달 매출', value: '5,840만원', change: '+12%', positive: true },
          { label: '미정산 금액', value: '63만원', change: '2건', positive: false },
          { label: '세금계산서', value: '이번 달 3건', change: '발행완료', positive: true },
        ].map((card, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 16,
            padding: 20,
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>{card.label}</p>
            <p style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{card.value}</p>
            <p style={{ color: card.positive ? '#22c55e' : '#f59e0b', fontSize: 13 }}>{card.change}</p>
          </div>
        ))}
      </div>

      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 24, marginBottom: 24, border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>이번 주 매출 추이</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            {['daily', 'weekly', 'monthly'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '6px 14px', borderRadius: 8, border: 'none', fontSize: 13, cursor: 'pointer',
                background: tab === t ? '#3b82f6' : 'rgba(255,255,255,0.06)',
                color: tab === t ? '#fff' : '#94a3b8',
              }}>{t === 'daily' ? '일별' : t === 'weekly' ? '주별' : '월별'}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 200 }}>
          {weekData.map((d, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>
              <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{d.amount}만</p>
              <div style={{
                height: (d.amount / maxAmount) * 160,
                background: 'linear-gradient(180deg, #3b82f6, #8b5cf6)',
                borderRadius: '8px 8px 4px 4px',
                minHeight: 20,
              }} />
              <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 8 }}>{d.day}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.06)' }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 20 }}>최근 거래 내역</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {recentTx.map(tx => (
            <div key={tx.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 0',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ color: '#64748b', fontSize: 13, width: 100 }}>{tx.date}</span>
                <span style={{
                  background: tx.type === '카드' ? 'rgba(59,130,246,0.15)' : tx.type === '현금' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                  color: tx.type === '카드' ? '#3b82f6' : tx.type === '현금' ? '#22c55e' : '#f59e0b',
                  padding: '3px 10px', borderRadius: 6, fontSize: 12,
                }}>{tx.type}</span>
                <span style={{ color: '#94a3b8', fontSize: 14 }}>{tx.method}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>{tx.amount.toLocaleString()}원</span>
                <span style={{
                  background: tx.status === 'done' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
                  color: tx.status === 'done' ? '#22c55e' : '#f59e0b',
                  padding: '3px 10px', borderRadius: 6, fontSize: 12,
                }}>{tx.status === 'done' ? '정산완료' : '정산대기'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <button style={{
          padding: '14px 28px',
          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer',
          fontSize: 15, fontWeight: 600,
        }}>홈택스 세금계산서 발행</button>
      </div>
    </div>
  )
}
