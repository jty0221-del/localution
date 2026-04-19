'use client'

import { useState, useEffect, useCallback } from 'react'
import { useConnections, setConnection as libSetConnection } from '../../lib/connections'
import Link from 'next/link'
import Sidebar from '../../components/Sidebar'
import Footer from '../../components/Footer'

interface Review {
  id: string
  rating: number
  author: string
  date: string
  text: string
  orderId?: string
  menuItems?: string[]
  replied: boolean
  replyText?: string
}

interface ReviewState extends Review {
  aiReply: string
  editReply: string
  aiLoading: boolean
  aiDone: boolean
  showEdit: boolean
}

const LS_CONNECTED = 'localution.baemin.connected'
const LS_STORE_ID  = 'localution.baemin.storeId'
const LS_TOKEN     = 'localution.baemin.token'

function Stars({ n }: { n: number }) {
  return (
    <span className="text-sm">
      {'★'.repeat(n)}<span className="text-[#E5E8EB]">{'★'.repeat(5 - n)}</span>
    </span>
  )
}

export default function ReviewPage() {
  const { isConnected } = useConnections()
  const connected = isConnected('baemin')

  const [storeId, setStoreId]     = useState('')
  const [token, setToken]         = useState('')
  const [reviews, setReviews]     = useState<ReviewState[]>([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [filterRating, setFilterRating] = useState(0)
  const [filterReplied, setFilterReplied] = useState<'all' | 'pending' | 'done'>('all')
  const [connectInput, setConnectInput] = useState({ storeId: '', token: '' })
  const [connectLoading, setConnectLoading] = useState(false)

  useEffect(() => {
    try {
      const sid = localStorage.getItem(LS_STORE_ID) || ''
      const tok = localStorage.getItem(LS_TOKEN) || ''
      setStoreId(sid); setToken(tok)
    } catch {}
  }, [connected])

  const handleConnect = async () => {
    if (!connectInput.storeId || !connectInput.token) {
      setError('매장 ID와 토큰을 모두 입력해주세요')
      return
    }
    setConnectLoading(true); setError('')
    try {
      const res = await fetch(`/api/baemin-reviews?storeId=${connectInput.storeId}&token=${encodeURIComponent(connectInput.token)}&test=true`)
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || '연동 실패')

      localStorage.setItem(LS_CONNECTED, 'true')
      localStorage.setItem(LS_STORE_ID, connectInput.storeId)
      localStorage.setItem(LS_TOKEN, connectInput.token)
      // 공통 훅으로도 동기화 → 허브·대시보드·설정 즉시 반영
      libSetConnection('baemin', { connected: true, externalId: connectInput.storeId })
      setStoreId(connectInput.storeId); setToken(connectInput.token)
    } catch (e: any) {
      setError(e.message || '연동 중 오류가 발생했습니다')
    } finally { setConnectLoading(false) }
  }

  const loadReviews = useCallback(async () => {
    if (!storeId || !token) return
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/baemin-reviews?storeId=${storeId}&token=${encodeURIComponent(token)}`)
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || '리뷰 로딩 실패')
      const items: Review[] = data.reviews || []
      setReviews(items.map(r => ({
        ...r, aiReply: '', editReply: '', aiLoading: false, aiDone: false, showEdit: false,
      })))
    } catch (e: any) {
      setError(e.message)
    } finally { setLoading(false) }
  }, [storeId, token])

  useEffect(() => { if (connected) loadReviews() }, [connected, loadReviews])

  async function generateAI(idx: number) {
    const r = reviews[idx]
    setReviews(prev => prev.map((x, i) => i === idx ? { ...x, aiLoading: true, aiDone: false } : x))
    try {
      let gs: any = {}
      try { const raw = localStorage.getItem('localution_store'); if (raw) gs = JSON.parse(raw) } catch {}
      const aiS: any = {}
      try {
        const keys = ['tone','length','gender','ageGroup','speechStyle','emoji']
        keys.forEach(k => { const v = localStorage.getItem('ai.' + k); if (v) aiS[k] = v })
      } catch {}

      const res = await fetch('/api/ai-review-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review: r.text || '', rating: r.rating,
          platform: '배달의민족',
          storeName: gs.name || '저희 매장',
          region: gs.region || '',
          bizType: gs.category || '',
          mainKeyword: gs.mainKeyword || '',
          subKeywords: gs.subKeywords || '',
          storeDesc: gs.desc || '',
          storeStrengths: gs.strengths || '',
          ownerMindset: gs.ownerMindset || '',
          aiSettings: aiS,
        }),
      })
      const d = await res.json()
      setReviews(prev => prev.map((x, i) =>
        i === idx ? { ...x, aiLoading: false, aiDone: true, aiReply: d.reply || '생성 실패', editReply: d.reply || '' } : x
      ))
    } catch {
      setReviews(prev => prev.map((x, i) => i === idx ? { ...x, aiLoading: false } : x))
    }
  }

  async function submitReply(idx: number) {
    const r = reviews[idx]
    const reply = r.editReply || r.aiReply
    if (!reply) return
    try {
      const res = await fetch('/api/baemin-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, token, reviewId: r.id, reply }),
      })
      const d = await res.json()
      if (d.ok) {
        setReviews(prev => prev.map((x, i) =>
          i === idx ? { ...x, replied: true, replyText: reply, showEdit: false } : x
        ))
        alert('✅ 답글이 등록되었습니다!')
      } else {
        alert('❌ 등록 실패: ' + (d.error || '알 수 없는 오류'))
      }
    } catch { alert('❌ 연결이 잠깐 불안정했어요. 다시 시도해주세요 🙏') }
  }

  const filtered = reviews.filter(r => {
    if (filterRating > 0 && r.rating !== filterRating) return false
    if (filterReplied === 'pending' && r.replied) return false
    if (filterReplied === 'done' && !r.replied) return false
    return true
  })

  const pendingCount = reviews.filter(r => !r.replied).length

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Sidebar />
      <main className="flex-1 md:ml-[220px] p-4 pt-20 md:p-8 md:pt-8 max-w-4xl mx-auto">

        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/review-admin" className="text-sm text-[#8B95A1] hover:text-[#4E5968]">← 리뷰 관리</Link>
          <span className="text-[#E5E8EB]">/</span>
          <div className="flex items-center gap-2">
            <span className="text-xl">🛵</span>
            <h1 className="text-lg font-bold text-[#191F28]">배달의민족 리뷰 관리</h1>
          </div>
          {connected && (
            <span className="ml-auto text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: '#E6F9F8', color: '#1A8E8B' }}>
              ● 연동됨
            </span>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* ── 미연동 상태 ── */}
        {!connected && (
          <div className="space-y-5">
            {/* API 신청 안내 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border-l-4" style={{ borderColor: '#2AC1BC' }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🛵</span>
                <h2 className="font-bold text-[#191F28]">배달의민족 API 연동 안내</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-[#F8FAFC] rounded-xl p-4">
                  <p className="text-xs font-bold text-[#4E5968] mb-2">📋 API 신청 방법</p>
                  <p className="text-xs text-[#8B95A1] leading-relaxed">배민사장님광장 → 개발자 등록 → API 신청</p>
                  <a href="https://developers.baemin.com" target="_blank" rel="noopener noreferrer"
                    className="mt-3 flex items-center gap-1 text-xs font-semibold hover:underline"
                    style={{ color: '#2AC1BC' }}>
                    개발자 포털 바로가기 →
                  </a>
                </div>
                <div className="bg-[#F8FAFC] rounded-xl p-4">
                  <p className="text-xs font-bold text-[#4E5968] mb-2">🔑 필요한 정보</p>
                  <ul className="text-xs text-[#8B95A1] space-y-1">
                    <li>• <strong>매장(Store) ID</strong> — 플랫폼 사장님 포털에서 확인</li>
                    <li>• <strong>API Token</strong> — 개발자 포털에서 발급</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 연동 입력 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-[#191F28] mb-4">🔗 연동 설정</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-[#4E5968] block mb-1">매장 ID (Store ID)</label>
                  <input
                    value={connectInput.storeId}
                    onChange={e => setConnectInput(p => ({ ...p, storeId: e.target.value }))}
                    placeholder="예: 12345678"
                    className="w-full border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#3182F6]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#4E5968] block mb-1">API Token</label>
                  <input
                    type="password"
                    value={connectInput.token}
                    onChange={e => setConnectInput(p => ({ ...p, token: e.target.value }))}
                    placeholder="발급받은 API 토큰 입력"
                    className="w-full border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#3182F6]"
                  />
                </div>
                <button
                  onClick={handleConnect}
                  disabled={connectLoading}
                  className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50"
                  style={{ background: '#2AC1BC' }}>
                  {connectLoading ? '연동 확인 중...' : '🛵 배달의민족 연동하기'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── 연동 후 리뷰 목록 ── */}
        {connected && (
          <div className="space-y-4">
            {/* 요약 바 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { label: '전체 리뷰', value: reviews.length, icon: '📋' },
                { label: '답글 대기', value: pendingCount, icon: '⏳', alert: pendingCount > 0 },
                { label: '답글 완료', value: reviews.length - pendingCount, icon: '✅' },
              ].map(s => (
                <div key={s.label} className={`bg-white rounded-2xl p-4 shadow-sm text-center ${s.alert ? 'border-2 border-orange-200' : ''}`}>
                  <div className="text-xl mb-1">{s.icon}</div>
                  <div className={`text-2xl font-bold ${s.alert ? 'text-orange-500' : 'text-[#191F28]'}`}>{s.value}</div>
                  <div className="text-xs text-[#8B95A1]">{s.label}</div>
                </div>
              ))}
            </div>

            {/* 필터 + 새로고침 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-3">
              <div className="flex gap-1.5">
                {[0,1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setFilterRating(n)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${filterRating === n ? 'text-white' : 'bg-[#F2F4F6] text-[#4E5968]'}`}
                    style={filterRating === n ? { background: '#2AC1BC' } : {}}>
                    {n === 0 ? '전체' : '★'.repeat(n)}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5">
                {(['all','pending','done'] as const).map(v => (
                  <button key={v} onClick={() => setFilterReplied(v)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${filterReplied === v ? 'text-white' : 'bg-[#F2F4F6] text-[#4E5968]'}`}
                    style={filterReplied === v ? { background: '#2AC1BC' } : {}}>
                    {v === 'all' ? '전체' : v === 'pending' ? '답글 대기' : '답글 완료'}
                  </button>
                ))}
              </div>
              <button onClick={loadReviews} disabled={loading}
                className="ml-auto text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB] disabled:opacity-50">
                {loading ? '불러오는 중...' : '🔄 새로고침'}
              </button>
            </div>

            {/* 리뷰 목록 */}
            {loading && (
              <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
                <div className="text-3xl mb-3 animate-spin">⏳</div>
                <p className="text-sm text-[#8B95A1]">배달의민족 리뷰를 불러오는 중...</p>
              </div>
            )}

            {!loading && filtered.length === 0 && (
              <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
                <div className="text-4xl mb-3">📭</div>
                <p className="font-bold text-[#191F28] mb-1">리뷰가 없습니다</p>
                <p className="text-sm text-[#8B95A1]">조건을 변경하거나 새로고침을 해보세요</p>
              </div>
            )}

            {!loading && filtered.map((r, idx) => (
              <div key={r.id} className={`bg-white rounded-2xl shadow-sm overflow-hidden ${!r.replied ? 'border-l-4' : ''}`}
                style={!r.replied ? { borderColor: '#2AC1BC' } : {}}>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-[#191F28]">{r.author}</span>
                        <Stars n={r.rating} />
                        {!r.replied && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white" style={{ background: '#2AC1BC' }}>
                            답글 대기
                          </span>
                        )}
                        {r.replied && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-green-100 text-green-700">
                            답글 완료
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#8B95A1]">{r.date}</p>
                    </div>
                    {!r.replied && !r.aiDone && (
                      <button onClick={() => generateAI(idx)} disabled={r.aiLoading}
                        className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50"
                        style={{ background: '#2AC1BC' }}>
                        {r.aiLoading ? 'AI 생성 중...' : '🤖 AI 답글'}
                      </button>
                    )}
                  </div>

                  {r.text ? (
                    <p className="text-sm text-[#191F28] leading-relaxed bg-[#F8FAFC] rounded-xl p-3">{r.text}</p>
                  ) : (
                    <p className="text-sm text-[#B0B8C1] italic bg-[#F8FAFC] rounded-xl p-3">텍스트 없는 별점 리뷰</p>
                  )}

                  {r.menuItems && r.menuItems.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {r.menuItems.map((m, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 bg-[#EFF6FF] text-[#3182F6] rounded-full">{m}</span>
                      ))}
                    </div>
                  )}

                  {/* AI 답글 영역 */}
                  {r.aiDone && !r.replied && (
                    <div className="mt-3 space-y-2">
                      <div className="p-3 rounded-xl text-sm text-[#191F28] leading-relaxed border-2" style={{ borderColor: '#2AC1BC20', background: '#E6F9F8' }}>
                        <p className="text-[10px] font-bold mb-1.5" style={{ color: '#2AC1BC' }}>AI 생성 답글</p>
                        <textarea
                          value={r.editReply || r.aiReply}
                          onChange={e => setReviews(prev => prev.map((x, i) => i === idx ? { ...x, editReply: e.target.value } : x))}
                          rows={4}
                          className="w-full bg-transparent resize-none outline-none text-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => generateAI(idx)}
                          className="flex-1 py-2 rounded-xl text-xs font-semibold bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB]">
                          🔄 재생성
                        </button>
                        <button onClick={() => submitReply(idx)}
                          className="flex-1 py-2 rounded-xl text-xs font-bold text-white"
                          style={{ background: '#2AC1BC' }}>
                          📤 배달의민족에 등록
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 기존 답글 */}
                  {r.replied && r.replyText && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-100 rounded-xl">
                      <p className="text-[10px] font-bold text-green-600 mb-1">사장님 답글</p>
                      <p className="text-xs text-[#4E5968] leading-relaxed">{r.replyText}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Footer ── */}
        <div className="-mx-4 md:-mx-8 mt-10">
          <Footer />
        </div>

      </main>

    </div>
  )
}
