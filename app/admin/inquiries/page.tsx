'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'

const ADMIN_KEY_LOCAL = 'localution.admin_key'

interface Inquiry {
  id: string; name: string; contact: string; category: string; message: string;
  status: 'new' | 'read' | 'replied'; createdAt: string; reply?: string; repliedAt?: string
}

const STATUS_MAP = {
  new:     { label: '신규',   cls: 'bg-red-100 text-red-700' },
  read:    { label: '확인중', cls: 'bg-blue-100 text-blue-700' },
  replied: { label: '답변완료', cls: 'bg-green-100 text-green-700' },
}

export default function AdminInquiries() {
  const [secret, setSecret] = useState('')
  const [authed, setAuthed] = useState(false)
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Inquiry | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    const saved = localStorage.getItem(ADMIN_KEY_LOCAL)
    if (saved) { setSecret(saved); loadInquiries(saved) }
  }, [])

  async function loadInquiries(key?: string) {
    const k = key || secret
    if (!k) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/inquiry', {
        headers: { 'x-admin-secret': k }
      })
      if (res.status === 401) { setError('인증 실패. 비밀번호를 확인해 주세요.'); setLoading(false); return }
      const data = await res.json()
      setInquiries(data.inquiries || [])
      setAuthed(true)
      localStorage.setItem(ADMIN_KEY_LOCAL, k)
    } catch {
      setError('불러오기 실패')
    } finally {
      setLoading(false)
    }
  }

  async function sendReply() {
    if (!selected || !replyText.trim()) return
    setReplying(true)
    try {
      await fetch('/api/inquiry', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
        body: JSON.stringify({ id: selected.id, reply: replyText }),
      })
      setInquiries(prev => prev.map(i => i.id === selected.id
        ? { ...i, reply: replyText, status: 'replied', repliedAt: new Date().toISOString() }
        : i
      ))
      setSelected(null)
      setReplyText('')
    } catch { alert('오류 발생') }
    finally { setReplying(false) }
  }

  async function updateStatus(id: string, status: string) {
    await fetch('/api/inquiry', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
      body: JSON.stringify({ id, status }),
    })
    setInquiries(prev => prev.map(i => i.id === id ? { ...i, status: status as any } : i))
  }

  const filtered = inquiries.filter(i => filterStatus === 'all' || i.status === filterStatus)
  const newCount  = inquiries.filter(i => i.status === 'new').length

  // ── 로그인 화면 ──────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen bg-[#F2F4F6] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#3182F6] to-[#1B64DA] flex items-center justify-center mx-auto mb-3 shadow-lg">
              <span className="text-white font-black text-xl">L</span>
            </div>
            <h1 className="text-xl font-black text-[#191F28]">관리자 문의 관리</h1>
            <p className="text-sm text-[#8B95A1] mt-1">ADMIN_SECRET을 입력해 주세요</p>
          </div>
          <input
            type="password"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadInquiries()}
            placeholder="관리자 비밀번호"
            className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#3182F6] transition-colors mb-3"
          />
          {error && <p className="text-sm text-red-500 mb-3 text-center">{error}</p>}
          <button onClick={() => loadInquiries()} disabled={loading}
            className="w-full py-3 bg-[#3182F6] text-white font-bold rounded-xl hover:bg-[#1B64DA] disabled:opacity-50 transition-colors">
            {loading ? '확인 중...' : '로그인'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F2F4F6]">
      <div className="bg-white border-b border-[#E5E8EB] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#3182F6] to-[#1B64DA] flex items-center justify-center">
            <span className="text-white font-black text-sm">L</span>
          </div>
          <h1 className="text-lg font-black text-[#191F28]">문의 관리</h1>
          {newCount > 0 && (
            <span className="text-xs font-bold text-white bg-red-500 rounded-full px-2.5 py-1">
              신규 {newCount}
            </span>
          )}
        </div>
        <button onClick={() => loadInquiries()}
          className="px-4 py-2 bg-[#F2F4F6] text-sm font-semibold text-[#4E5968] rounded-xl hover:bg-[#E5E8EB] transition-colors">
          새로고침
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* 필터 */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm mb-5 w-fit">
          {[['all', '전체'], ['new', '신규'], ['read', '확인중'], ['replied', '답변완료']].map(([v, l]) => (
            <button key={v} onClick={() => setFilterStatus(v)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filterStatus === v ? 'bg-[#3182F6] text-white' : 'text-[#8B95A1] hover:bg-[#F2F4F6]'}`}>
              {l} {v === 'all' ? inquiries.length : inquiries.filter(i => i.status === v).length}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="bg-white rounded-2xl p-8 text-center text-sm text-[#8B95A1]">
              {filterStatus === 'all' ? '문의가 없습니다.' : '해당 상태의 문의가 없습니다.'}
            </div>
          )}

          {filtered.map(item => {
            const sm = STATUS_MAP[item.status]
            return (
              <div key={item.id} className={`bg-white rounded-2xl p-5 shadow-sm border-l-4 ${
                item.status === 'new' ? 'border-red-400' : item.status === 'replied' ? 'border-green-400' : 'border-blue-400'
              }`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-[#191F28]">{item.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${sm.cls}`}>{sm.label}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold">{item.category}</span>
                    {item.contact && <span className="text-xs text-[#8B95A1]">{item.contact}</span>}
                  </div>
                  <span className="text-xs text-[#B0B8C1] flex-shrink-0">
                    {new Date(item.createdAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <p className="text-sm text-[#4E5968] bg-[#F8F9FA] rounded-xl px-4 py-3 mb-3 leading-relaxed">{item.message}</p>

                {item.reply && (
                  <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl px-4 py-3 mb-3">
                    <p className="text-xs font-bold text-[#3182F6] mb-1">내 답변</p>
                    <p className="text-sm text-[#1E40AF] leading-relaxed">{item.reply}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  {item.status === 'new' && (
                    <button onClick={() => updateStatus(item.id, 'read')}
                      className="px-3 py-1.5 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors font-semibold">
                      확인 처리
                    </button>
                  )}
                  {!item.reply && (
                    <button onClick={() => { setSelected(item); setReplyText('') }}
                      className="px-3 py-1.5 text-xs bg-[#3182F6] text-white rounded-lg hover:bg-[#1B64DA] transition-colors font-semibold">
                      답변하기
                    </button>
                  )}
                  {item.reply && (
                    <button onClick={() => { setSelected(item); setReplyText(item.reply || '') }}
                      className="px-3 py-1.5 text-xs text-[#8B95A1] border border-[#E5E8EB] rounded-lg hover:bg-[#F2F4F6] transition-colors font-semibold">
                      답변 수정
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* 답변 모달 */}
        {selected && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[#191F28]">답변 작성</h2>
                <button onClick={() => setSelected(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F2F4F6] text-xl">✕</button>
              </div>
              <div className="bg-[#F8F9FA] rounded-xl px-4 py-3 mb-4">
                <p className="text-xs text-[#8B95A1] font-semibold mb-1">{selected.name} · {selected.category}</p>
                <p className="text-sm text-[#4E5968]">{selected.message}</p>
              </div>
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="답변 내용을 입력하세요..."
                rows={5}
                className="w-full border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#3182F6] transition-colors resize-none mb-4"
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setSelected(null)}
                  className="px-4 py-2 text-sm text-[#8B95A1] hover:text-[#4E5968] font-medium">취소</button>
                <button onClick={sendReply} disabled={replying || !replyText.trim()}
                  className="px-5 py-2 bg-[#3182F6] text-white text-sm font-semibold rounded-xl hover:bg-[#1B64DA] disabled:opacity-50 transition-colors">
                  {replying ? '전송 중...' : '답변 전송'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
