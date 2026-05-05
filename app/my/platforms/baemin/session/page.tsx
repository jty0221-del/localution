'use client'
// app/my/platforms/baemin/session/page.tsx
import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, AlertCircle, Link2, Lock } from 'lucide-react'

export default function BaeminSessionPage() {
 const [baeminId, setBaeminId] = useState('')
 const [baeminPw, setBaeminPw] = useState('')
 const [shopNo, setShopNo] = useState('')
 const [showPw, setShowPw] = useState(false)
 const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
 const [msg, setMsg] = useState('')

 async function handleConnect() {
 if (!baeminId.trim() || !baeminPw.trim()) {
 setStatus('error')
 setMsg('아이디와 비밀번호를 모두 입력해주세요.')
 return
 }
 setStatus('loading')
 setMsg('')
 try {
 const res = await fetch('/api/baemin/save-login', {
 method: 'POST',
 credentials: 'include',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ baemin_id: baeminId.trim(), baemin_pw: baeminPw.trim(), shop_no: shopNo.trim() }),
 })
 const data = await res.json()
 if (data.ok) {
 setStatus('ok')
 setMsg(data.message || '배민 연동이 완료됐어요!')
 setBaeminPw('')
 } else {
 setStatus('error')
 setMsg(data.error || '연동 실패. 아이디/비밀번호를 확인해주세요.')
 }
 } catch (e: any) {
 setStatus('error')
 setMsg(e?.message || '연결 오류가 발생했어요.')
 }
 }

 return (
 <div className="min-h-screen bg-gray-50 py-10 px-4">
 <div className="max-w-lg mx-auto">

 {/* 헤더 */}
 <div className="mb-8">
 <Link href="/review-admin/baemin" className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-4">
 ← 배민 리뷰 관리
 </Link>
 <div className="flex items-center gap-3 mb-2">
 <div className="w-10 h-10 rounded-xl bg-[#FFBE00] flex items-center justify-center text-white font-bold text-lg">B</div>
 <h1 className="text-2xl font-bold text-gray-900">배민 자동 연동</h1>
 </div>
 <p className="text-sm text-gray-500">
 배민 셀프서비스 로그인 정보를 저장하면 리뷰를 자동으로 수집하고 답글을 달 수 있어요.
 </p>
 </div>

 {/* 결과 메시지 */}
 {status === 'ok' && (
 <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl flex items-start gap-3">
 <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
 <CheckCircle2 size={18} className="text-green-600" strokeWidth={2.5} />
 </div>
 <div>
 <p className="font-semibold text-green-800">연동 완료!</p>
 <p className="text-sm text-green-700 mt-1">{msg}</p>
 <Link href="/review-admin/baemin" className="mt-3 inline-block text-sm font-medium text-green-700 underline">
 리뷰 관리로 이동 →
 </Link>
 </div>
 </div>
 )}
 {status === 'error' && (
 <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
 <p className="text-sm font-medium text-red-700 flex items-center gap-1.5"><AlertCircle size={14} strokeWidth={2.5} /> {msg}</p>
 </div>
 )}

 {/* 연동 폼 */}
 {status !== 'ok' && (
 <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 배민 셀프서비스 아이디
 </label>
 <input
 type="text"
 value={baeminId}
 onChange={e => setBaeminId(e.target.value)}
 placeholder="self.baemin.com 로그인 아이디"
 className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FFBE00] focus:border-transparent"
 disabled={status === 'loading'}
 autoComplete="username"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 비밀번호
 </label>
 <div className="relative">
 <input
 type={showPw ? 'text' : 'password'}
 value={baeminPw}
 onChange={e => setBaeminPw(e.target.value)}
 onKeyDown={e => { if (e.key === 'Enter') handleConnect() }}
 placeholder="배민 셀프서비스 비밀번호"
 className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FFBE00] focus:border-transparent pr-12"
 disabled={status === 'loading'}
 autoComplete="current-password"
 />
 <button
 type="button"
 onClick={() => setShowPw(v => !v)}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm px-1"
 >
 {showPw ? '숨김' : '표시'}
 </button>
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 매장 번호 <span className="text-gray-400 font-normal">(선택)</span>
 </label>
 <input
 type="text"
 value={shopNo}
 onChange={e => setShopNo(e.target.value)}
 placeholder="URL의 숫자 (예: 14637452) — 비워도 자동 감지"
 className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FFBE00] focus:border-transparent"
 disabled={status === 'loading'}
 />
 <p className="mt-1 text-xs text-gray-400">self.baemin.com/shops/<strong>숫자</strong>/reviews 에서 확인</p>
 </div>

 <button
 onClick={handleConnect}
 disabled={status === 'loading' || !baeminId.trim() || !baeminPw.trim()}
 className="w-full py-3 bg-[#FFBE00] hover:bg-[#f0b000] disabled:opacity-50 text-gray-900 font-semibold rounded-xl transition-colors text-sm"
 >
 {status === 'loading' ? '연동 중...' : (<span className="inline-flex items-center gap-1.5"><Link2 size={14} strokeWidth={2.5} /> 배민 연동 시작</span>)}
 </button>
 </div>
 )}

 {/* 안전 안내 */}
 <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
 <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1"><Lock size={11} strokeWidth={2.5} /> 보안 안내</p>
 <ul className="text-xs text-blue-600 space-y-1">
 <li>• 로그인 정보는 AES-256-GCM으로 암호화해 저장돼요</li>
 <li>• 비밀번호는 복호화 불가 형태로만 보관해요</li>
 <li>• 쿠키가 만료되면 자동으로 재로그인해요</li>
 </ul>
 </div>

 {/* 재연동 버튼 */}
 {status === 'ok' && (
 <button
 onClick={() => { setStatus('idle'); setMsg(''); }}
 className="mt-4 w-full py-2 text-sm text-gray-500 hover:text-gray-700 underline"
 >
 정보 변경 / 재연동
 </button>
 )}

 </div>
 </div>
 )
}
