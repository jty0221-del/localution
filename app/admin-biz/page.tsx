'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'

const expenses = [
  { date: '04/13', category: '식재료', desc: '○○유통 식자재', amount: '-320,000', type: 'out' },
  { date: '04/12', category: '매출', desc: '카드 매출 정산', amount: '+1,240,000', type: 'in' },
  { date: '04/11', category: '인건비', desc: '주말 알바 급여', amount: '-180,000', type: 'out' },
  { date: '04/10', category: '매출', desc: '카드 매출 정산', amount: '+980,000', type: 'in' },
  { date: '04/09', category: '공과금', desc: '전기요금', amount: '-87,000', type: 'out' },
  { date: '04/08', category: '매출', desc: '배달 플랫폼 정산', amount: '+420,000', type: 'in' },
]

export default function AdminBizPage() {
  const [tab, setTab] = useState<'summary' | 'tax' | 'expense'>('summary')

  return (
    <div className="p-4 md:p-8 pt-16 md:pt-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">정산·행정</h1>
        <p className="text-sm text-gray-400 mt-1">매출, 비용, 세금계산서를 한눈에 관리하세요</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: '이번달 매출', value: '4,820,000원', icon: '📈', color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: '이번달 지출', value: '1,840,000원', icon: '📉', color: 'text-red-400', bg: 'bg-red-50' },
          { label: '순이익', value: '2,980,000원', icon: '💰', color: 'text-green-500', bg: 'bg-green-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center text-lg mb-2`}>{s.icon}</div>
            <div className="text-xs text-gray-400 mb-1">{s.label}</div>
            <div className={`text-sm md:text-base font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        {[{ key: 'summary', label: '수입·지출' }, { key: 'tax', label: '세금계산서' }, { key: 'expense', label: '경비 등록' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${tab === t.key ? 'bg-blue-500 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'summary' && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="hidden md:grid grid-cols-4 px-5 py-3 text-xs font-semibold text-gray-400 border-b border-gray-100">
            <span>날짜</span><span>분류</span><span>내용</span><span className="text-right">금액</span>
          </div>
          {expenses.map((e, i) => (
            <div key={i} className={`px-5 py-4 ${i < expenses.length-1 ? 'border-b border-gray-50' : ''} hover:bg-gray-50 transition-colors`}>
              <div className="flex items-center justify-between md:grid md:grid-cols-4 md:items-center">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400 hidden md:block">{e.date}</span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{e.category}</span>
                  <span className="text-sm text-gray-700 hidden md:block">{e.desc}</span>
                </div>
                <div className="md:hidden text-xs text-gray-400">{e.date} · {e.desc}</div>
                <span className={`text-sm font-bold text-right ${e.type === 'in' ? 'text-blue-500' : 'text-red-400'}`}>{e.amount}원</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'tax' && (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <div className="text-5xl mb-4">📄</div>
          <h3 className="font-bold text-gray-900 mb-2">세금계산서 발행</h3>
          <p className="text-gray-500 text-sm mb-6">사업자번호, 공급가액 입력 시 AI가 자동으로 세금계산서를 생성합니다.</p>
          <button className="bg-blue-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-blue-600 transition-colors shadow-sm shadow-blue-200">
            새 세금계산서 발행
          </button>
        </div>
      )}

      {tab === 'expense' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4">경비 등록</h3>
          <div className="space-y-3">
            {[{ label: '날짜', type: 'date' }, { label: '분류', type: 'text' }, { label: '내용', type: 'text' }, { label: '금액 (원)', type: 'number' }].map(field => (
              <div key={field.label}>
                <label className="text-sm text-gray-600 font-medium block mb-1">{field.label}</label>
                <input type={field.type} placeholder={field.label + ' 입력'}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-all" />
              </div>
            ))}
            <button className="w-full py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-colors shadow-sm shadow-blue-200">
              등록하기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
