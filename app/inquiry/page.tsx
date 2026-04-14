'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import Sidebar from '../components/Sidebar'

const CATEGORIES = [
  { value: '서비스문의',   label: '서비스 문의',    icon: '💬' },
  { value: '기능요청',     label: '기능 요청',      icon: '✨' },
  { value: '요금/결제',    label: '요금 / 결제',    icon: '💳' },
  { value: '파트너신청',   label: '파트너 신청',    icon: '🤝' },
  { value: '오류신고',     label: '오류 신고',      icon: '🔧' },
  { value: '기타',         label: '기타',           icon: '📌' },
]

const LS_INQUIRIES = 'localution.my_inquiries'

interface MyInquiry {
  id: string; name: string; category: string; message: string;
  status: string; createdAt: string; reply?: string
}

export default function InquiryPage() {
  const [tab, setTab] = useState<'new' | 'history'>('new')
  const [form, setForm] = useState({ name: '', contact: '', category: '서비스문의', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText('harangmarketing@naver.com')
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // fallback
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
  const [copied, setCopied] = useState(false)

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText('harangmarketing@naver.com')
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // fallback
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
  const [copied, setCopied] = useState(false)

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText('harangmarketing@naver.com')
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // fallback
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
  const [myInquiries, setMyInquiries] = useState<MyInquiry[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem(LS_INQUIRIES) || '[]') } catch { return [] }
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.message.trim()) {
      setError('이름과 문의 내용을 입력해 주세요.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '오류')

      const newItem: MyInquiry = {
        id: data.id,
        name: form.name,
        category: form.category,
        message: form.message,
        status: 'new',
        createdAt: new Date().toISOString(),
      }
      const updated = [newItem, ...myInquiries]
      setMyInquiries(updated)
      localStorage.setItem(LS_INQUIRIES, JSON.stringify(updated))

      setDone(true)
      setForm({ name: '', contact: '', category: '서비스문의', message: '' })
    } catch (e: any) {
      setError(e.message || '오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  function statusLabel(s: string) {
    if (s === 'replied') return { text: '답변완료', cls: 'bg-green-100 text-green-700' }
    if (s === 'read')    return { text: '확인중',   cls: 'bg-blue-100 text-blue-700' }
    return                      { text: '접수됨',   cls: 'bg-gray-100 text-gray-600' }
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
      <main className="flex-1 md:ml-[220px] p-4 md:p-8 pt-16 md:pt-8">

        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#E5E8EB] transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4E5968" strokeWidth="2.5" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#191F28]">1:1 문의</h1>
            <p className="text-sm text-[#8B95A1] mt-0.5">로컬루션 운영팀이 직접 답변드립니다</p>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm mb-6 w-fit">
          {([['new', '문의하기'], ['history', `내 문의 내역${myInquiries.length ? ` (${myInquiries.length})` : ''}`]] as const).map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === t ? 'bg-[#3182F6] text-white' : 'text-[#8B95A1] hover:bg-[#F2F4F6]'}`}>
              {l}
            </button>
          ))}
        </div>

        <div className="max-w-2xl">

          {/* ── 문의하기 탭 ── */}
          {tab === 'new' && (
            <>
              {done ? (
                <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl mx-auto mb-4">✅</div>
                  <h2 className="text-xl font-black text-[#191F28] mb-2">문의가 접수되었습니다!</h2>
                  <p className="text-sm text-[#8B95A1] mb-6 leading-relaxed">
                    영업일 기준 1~2일 내에 답변드립니다.<br/>
                    긴급 문의는 카카오톡 채널을 이용해 주세요.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button onClick={() => setDone(false)}
                      className="px-5 py-2.5 border border-[#E5E8EB] rounded-xl text-sm font-semibold text-[#4E5968] hover:bg-[#F2F4F6] transition-colors">
                      추가 문의하기
                    </button>
                    <button onClick={() => setTab('history')}
                      className="px-5 py-2.5 bg-[#3182F6] text-white rounded-xl text-sm font-semibold hover:bg-[#1B64DA] transition-colors">
                      내 문의 내역 보기
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* 분류 선택 */}
                  <div className="bg-white rounded-2xl p-5 shadow-sm">
                    <label className="text-sm font-bold text-[#191F28] block mb-3">문의 분류</label>
                    <div className="grid grid-cols-3 gap-2">
                      {CATEGORIES.map(c => (
                        <button type="button" key={c.value} onClick={() => setForm(f => ({ ...f, category: c.value }))}
                          className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                            form.category === c.value
                              ? 'border-[#3182F6] bg-[#EFF6FF] text-[#3182F6]'
                              : 'border-[#E5E8EB] text-[#4E5968] hover:border-[#B0B8C1]'
                          }`}>
                          <span className="text-base">{c.icon}</span>
                          <span className="text-xs">{c.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 기본 정보 */}
                  <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
                    <label className="text-sm font-bold text-[#191F28] block">기본 정보</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-[#8B95A1] font-semibold block mb-1">이름 <span className="text-red-500">*</span></label>
                        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                          placeholder="홍길동" required
                          className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#3182F6] transition-colors" />
                      </div>
                      <div>
                        <label className="text-xs text-[#8B95A1] font-semibold block mb-1">연락처 (이메일 또는 전화번호)</label>
                        <input value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))}
                          placeholder="email@example.com"
                          className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#3182F6] transition-colors" />
                      </div>
                    </div>
                  </div>

                  {/* 문의 내용 */}
                  <div className="bg-white rounded-2xl p-5 shadow-sm">
                    <label className="text-sm font-bold text-[#191F28] block mb-3">
                      문의 내용 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={form.message}
                      onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                      placeholder="문의하실 내용을 자세히 작성해 주세요.&#10;&#10;예) 어떤 기능을 언제부터 원하시는지, 어떤 오류가 발생했는지 등..."
                      rows={6} required
                      className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#3182F6] transition-colors resize-none"
                    />
                    <p className="text-xs text-[#B0B8C1] mt-1.5">{form.message.length}자</p>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
                  )}

                  <button type="submit" disabled={submitting}
                    className="w-full py-4 bg-[#3182F6] text-white font-bold rounded-2xl hover:bg-[#1B64DA] disabled:opacity-50 transition-colors text-sm">
                    {submitting ? '접수 중...' : '문의 접수하기'}
                  </button>

                  {/* 빠른 연락처 */}
                  <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <p className="text-xs font-bold text-[#8B95A1] mb-3">⚡ 빠른 연락</p>
                    <div className="flex gap-2">
                      <a href="https://open.kakao.com/o/gSC9jrqi" target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#FEE500] text-[#191F28] rounded-xl text-xs font-bold hover:opacity-90 transition-opacity">
                        <span>💬</span> 카카오톡 채널
                      </a>
                      <button onClick={copyEmail}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${copied ? 'bg-green-100 text-green-700' : 'bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB]'}`}>
                        <span>{copied ? '✅' : '✉️'}</span>
                        {copied ? '복사됨!' : '이메일 문의'}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </>
          )}

          {/* ── 내 문의 내역 탭 ── */}
          {tab === 'history' && (
            <div className="space-y-3">
              {myInquiries.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="font-bold text-[#191F28] mb-1">문의 내역이 없습니다</p>
                  <p className="text-sm text-[#8B95A1] mb-4">궁금한 점이 있으시면 문의해 주세요.</p>
                  <button onClick={() => setTab('new')}
                    className="px-5 py-2 bg-[#3182F6] text-white text-sm font-semibold rounded-xl hover:bg-[#1B64DA] transition-colors">
                    문의하기
                  </button>
                </div>
              ) : (
                myInquiries.map(item => {
                  const sl = statusLabel(item.status)
                  const cat = CATEGORIES.find(c => c.value === item.category)
                  return (
                    <div key={item.id} className="bg-white rounded-2xl p-5 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{cat?.icon || '📌'}</span>
                          <span className="text-sm font-bold text-[#191F28]">{item.category}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${sl.cls}`}>{sl.text}</span>
                        </div>
                        <span className="text-xs text-[#B0B8C1]">
                          {new Date(item.createdAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-sm text-[#4E5968] bg-[#F8F9FA] rounded-xl px-4 py-3 mb-3">{item.message}</p>
                      {item.reply && (
                        <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl px-4 py-3">
                          <p className="text-[11px] font-bold text-[#3182F6] mb-1">💬 로컬루션 운영팀 답변</p>
                          <p className="text-sm text-[#1E40AF]">{item.reply}</p>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>

        <div className="h-8" />
      </main>
    </div>
  )
}
