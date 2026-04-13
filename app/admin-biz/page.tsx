'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import Sidebar from '../components/Sidebar'

const expenses = [
  { date: '04/13', category: '식재료', desc: '○○유통 식자재', amount: '-320,000', type: 'expense' },
  { date: '04/12', category: '매출', desc: '카드 매출 정산', amount: '+1,240,000', type: 'income' },
  { date: '04/11', category: '인건비', desc: '주말 알바 급여', amount: '-180,000', type: 'expense' },
  { date: '04/10', category: '매출', desc: '카드 매출 정산', amount: '+980,000', type: 'income' },
  { date: '04/09', category: '공과금', desc: '전기요금', amount: '-87,000', type: 'expense' },
  { date: '04/08', category: '매출', desc: '배달 플랫폼 정산', amount: '+420,000', type: 'income' },
]

export default function AdminBizPage() {
  const [tab, setTab] = useState<'summary' | 'expense' | 'tax'>('summary')

  return (
    <div className="min-h-screen bg-[#F2F4F6]">
      <Sidebar />
      <div className="md:ml-[220px] p-4 md:p-8 max-w-4xl">
        <div className="pt-14 md:pt-0 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">정산·행정</h1>
          <p className="text-sm text-gray-400 mt-1">매출, 비용, 세금계산서를 한눈에 관리하세요</p>
        </div>

        {/* 이번 달 요약 */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[{ label: '이번달 매출', value: '4,820,000', unit: '원', color: 'text-blue-500', bg: 'bg-blue-50', icon: '📈' },
            { label: '이번달 지출', value: '1,840,000', unit: '원', color: 'text-red-400', bg: 'bg-red-50', icon: '📉' },
            { label: '순이익', value: '2,980,000', unit: '원', color: 'text-green-500', bg: 'bg-green-50', icon: '💰' }].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center text-lg mb-2`}>{s.icon}</div>
              <div className="text-xs text-gray-400 mb-1">{s.label}</div>
              <div className={`text-lg font-bold ${s.color}`}>{s.value}<span className="text-sm font-normal text-gray-400">{s.unit}</span></div>
            </div>
          ))}
        </div>

        {/* 탭 */}
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
            <div className="grid grid-cols-4 px-4 py-3 text-xs font-semibold text-gray-400 border-b border-gray-100">
              <span>날짜</span><span>분류</span><span>내용</span><span className="text-right">금액</span>
            </div>
            {expenses.map((e, i) => (
              <div key={i} className="grid grid-cols-4 px-4 py-4 border-b border-gray-50 items-center hover:bg-gray-50 transition-colors">
                <span className="text-sm text-gray-500">{e.date}</span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full w-fit font-medium">{e.category}</span>
                <span className="text-sm text-gray-700">{e.desc}</span>
                <span className={`text-sm font-bold text-right ${e.type === 'income' ? 'text-blue-500' : 'text-red-400'}`}>{e.amount}</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'tax' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
            <div className="text-5xl mb-4">📄</div>
            <h3 className="font-bold text-gray-900 mb-2">세금계산서 발행</h3>
            <p className="text-gray-500 text-sm mb-6">사업자번호, 공급가액만 입력하면 AI가 자동으로 세금계산서를 생성합니다.</p>
            <button className="bg-blue-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-blue-600 transition-colors shadow-sm shadow-blue-200">새 세금계산서 발행</button>
          </div>
        )}

        {tab === 'expense' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">경비 등록</h3>
            <div className="space-y-3">
              {['날짜', '분류', '내용', '금액'].map(label => (
                <div key={label}>
                  <label className="text-sm text-gray-600 font-medium block mb-1">{label}</label>
                  <input placeholder={label + ' 입력'} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-all" />
                </div>
              ))}
              <button className="w-full py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-colors shadow-sm shadow-blue-200 mt-2">등록하기</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
