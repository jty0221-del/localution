'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Sidebar from '../components/Sidebar'

const CATEGORIES = [
  { value: '서비스문의',   label: '서비스 문의',    icon: '💬' },
  { value: '기술문의',     label: '기술 문의',      icon: '🔧' },
  { value: '요금결제',     label: '요금 · 결제',   icon: '💳' },
  { value: '기능요청',     label: '기능 요청',      icon: '✨' },
  { value: '기타',         label: '기타',           icon: '📝' },
]

export default function InquiryPage() {
  const [tab, setTab] = useState<'new' | 'history'>('new')
  const [form, setForm] = useState({ name: '', contact: '', category: '서비스문의', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError]   = useState('')
  const [myInquiries, setMyInquiries] = useState<any[]>([])
  const [copied, setCopied] = useState(false)

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText('harangmarketing@naver.com')
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      const el = document.createElement('textarea')
      el.value = 'harangmarketing@naver.com'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const handleSubmit = async () => {
    if (!form.name || !form.message) { setError('이름과 문의 내용을 입력해 주세요.'); return }
    setError(''); setSubmitting(true)
    try {
      const res = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const data = await res.json()
        setMyInquiries(prev => [{ ...form, id: data.id, status: '접수완료', createdAt: new Date().toISOString() }, ...prev])
        setSubmitted(true)
        setForm({ name: '', contact: '', category: '서비스문의', message: '' })
      } else { setError('접수 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.') }
    } catch { setError('네트워크 오류가 발생했습니다.') }
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex">
      {/* 클립보드 복사 토스트 */}
      {copied && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] animate-bounce">
          <div className="flex items-center gap-2.5 px-5 py-3 bg-[#191F28] text-white rounded-2xl shadow-2xl text-sm font-semibold">
            <span className="text-base">✅</span>
            <span>이메일 주소가 복사되었습니다</span>
            <span className="text-[#8B95A1] text-xs ml-1">harangmarketing@naver.com</span>
          </div>
        </div>
      )}
      <Sidebar />
      <main className="flex-1 md:ml-[220px] p-4 md:p-8 pt-16 md:pt-8 max-w-2xl">

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#191F28]">1:1 문의</h1>
          <p className="text-[#8B95A1] mt-1">빠른 답변을 원하시면 카카오톡 채널을 이용해 주세요</p>
        </div>

        {/* 빠른 연락 */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <a href="https://open.kakao.com/o/gSC9jrqi" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-[#FEE500] rounded-2xl shadow-sm hover:shadow-md transition-all group">
            <div className="w-10 h-10 rounded-xl bg-[#191F28] flex items-center justify-center flex-shrink-0">
              <span className="text-[#FEE500] font-black text-lg leading-none">K</span>
            </div>
            <div>
              <p className="font-bold text-[#191F28] text-sm">카카오톡 채널</p>
              <p className="text-[11px] text-[#78350F]">빠른 상담 가능</p>
            </div>
          </a>

          <button onClick={copyEmail}
            className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all text-left w-full group">
            <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
              <span className="text-[#3182F6] text-xl">✉️</span>
            </div>
            <div>
              <p className="font-bold text-[#191F28] text-sm">이메일 문의</p>
              <p className="text-[11px] text-[#8B95A1]">클릭해서 주소 복사</p>
            </div>
          </button>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 bg-white rounded-2xl p-1.5 shadow-sm mb-6 w-fit">
          {([['new', '문의하기'], ['history', `내 문의 내역${myInquiries.length ? ` (${myInquiries.length})` : ''}`]] as const).map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-colors ${tab === t ? 'bg-[#3182F6] text-white' : 'text-[#4E5968] hover:bg-[#F2F4F6]'}`}>{l}</button>
          ))}
        </div>

        {tab === 'new' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            {submitted ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">✅</div>
                <h2 className="text-xl font-black text-[#191F28] mb-2">문의가 접수되었습니다!</h2>
                <p className="text-[#4E5968] text-sm mb-6">영업일 기준 1-2일 내로 답변드립니다.</p>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => setSubmitted(false)} className="px-5 py-2.5 bg-[#F2F4F6] text-[#4E5968] font-semibold rounded-xl text-sm">추가 문의하기</button>
                  <button onClick={() => { setTab('history'); setSubmitted(false) }} className="px-5 py-2.5 bg-[#3182F6] text-white font-semibold rounded-xl text-sm">내 문의 내역 보기</button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <label className="text-sm font-bold text-[#191F28] block mb-3">문의 분류</label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => (
                      <button key={cat.value} onClick={() => setForm(p => ({ ...p, category: cat.value }))}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors border-2 ${form.category === cat.value ? 'border-[#3182F6] bg-[#EFF6FF] text-[#3182F6]' : 'border-[#E5E8EB] text-[#4E5968] hover:border-[#3182F6]'}`}>
                        <span>{cat.icon}</span>{cat.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-bold text-[#191F28] block mb-2">이름 <span className="text-red-500">*</span></label>
                    <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="홍길동" className="w-full border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#3182F6]" />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-[#191F28] block mb-2">연락처</label>
                    <input value={form.contact} onChange={e => setForm(p => ({ ...p, contact: e.target.value }))}
                      placeholder="010-0000-0000 또는 이메일" className="w-full border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#3182F6]" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-bold text-[#191F28] block mb-2">문의 내용 <span className="text-red-500">*</span></label>
                  <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                    rows={5} placeholder="문의하실 내용을 자세히 작성해 주세요."
                    className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3182F6] resize-none" />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button onClick={handleSubmit} disabled={submitting}
                  className={`w-full py-3.5 rounded-xl font-bold text-sm transition-colors ${submitting ? 'bg-[#93C5FD] cursor-not-allowed text-white' : 'bg-[#3182F6] text-white hover:bg-[#1B64DA]'}`}>
                  {submitting ? '접수 중...' : '문의 접수하기'}
                </button>
                <div className="pt-2 border-t border-[#F2F4F6] flex items-center justify-center gap-4 text-xs text-[#8B95A1]">
                  <span>✉️ 이메일 문의</span>
                  <button onClick={copyEmail} className="font-semibold text-[#3182F6] hover:underline">harangmarketing@naver.com 복사</button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            {myInquiries.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">📭</div>
                <p className="font-bold text-[#191F28] mb-1">문의 내역이 없습니다</p>
                <p className="text-sm text-[#8B95A1] mb-4">궁금한 점이 있으시면 문의해 주세요.</p>
                <button onClick={() => setTab('new')} className="px-5 py-2.5 bg-[#3182F6] text-white font-semibold rounded-xl text-sm">문의하기</button>
              </div>
            ) : (
              <div className="space-y-3">
                {myInquiries.map((inq, i) => (
                  <div key={i} className="p-4 rounded-xl border border-[#E5E8EB]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-[#4E5968]">{inq.category}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#3182F6] font-semibold">{inq.status}</span>
                    </div>
                    <p className="text-sm text-[#191F28] line-clamp-2">{inq.message}</p>
                    <p className="text-[11px] text-[#8B95A1] mt-1">{new Date(inq.createdAt).toLocaleDateString('ko-KR')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* 이메일 복사 토스트 */}
      {copied && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none">
          <div className="flex items-center gap-2.5 px-5 py-3 bg-[#191F28] text-white rounded-2xl shadow-2xl text-sm font-semibold">
            <span>✅</span>
            <span>이메일 주소가 복사되었습니다</span>
            <span className="text-[#8B95A1] text-xs">harangmarketing@naver.com</span>
          </div>
        </div>
      )}
    </div>
  )
}
