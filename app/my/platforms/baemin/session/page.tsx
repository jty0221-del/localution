'use client'
// app/my/platforms/baemin/session/page.tsx
// DevTools Network 탭 Cookie 헤더 붙여넣기 → 배민 API 인증 쿠키 저장
import { useState } from 'react'
import Link from 'next/link'

export default function BaeminSessionPage() {
  const [cookieStr, setCookieStr] = useState('')
  const [shopNo, setShopNo] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  async function handleSave() {
    let cookie = cookieStr.trim()
    if (cookie.toLowerCase().startsWith('cookie:')) cookie = cookie.slice(7).trim()
    if (!cookie || cookie.length < 10) {
      setStatus('error')
      setMsg('쿠키 값을 입력해주세요.')
      return
    }
    setStatus('saving')
    setMsg('')
    try {
      const res = await fetch('/api/platform-accounts/baemin-cookie', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookie_str: cookie, shop_no: shopNo.trim() || '14637452' }),
      })
      const data = await res.json()
      if (data.ok) {
        setStatus('ok')
        setMsg('배민 쿠키가 저장됐어요! 이제 리뷰를 가져올 수 있어요.')
        setCookieStr('')
      } else {
        setStatus('error')
        setMsg(data.error || '저장 실패. 다시 시도해주세요.')
      }
    } catch (e: any) {
      setStatus('error')
      setMsg(e?.message || '알 수 없는 오류')
    }
  }

  async function handleCollect() {
    setStatus('saving')
    setMsg('실제 리뷰를 가져오는 중...')
    try {
      const res = await fetch('/api/baemin/collect-reviews', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_no: shopNo.trim() || '14637452' }),
      })
      const data = await res.json()
      if (data.ok) {
        setStatus('ok')
        setMsg('리뷰 ' + (data.count || 0) + '개를 가져왔어요!')
      } else {
        setStatus('error')
        setMsg(data.error || '리뷰 수집 실패')
      }
    } catch (e: any) {
      setStatus('error')
      setMsg(e?.message || '알 수 없는 오류')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <Link href="/review-admin/baemin" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4">
            ← 배민 리뷰 관리
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">배민 실제 리뷰 연동</h1>
          <p className="mt-1 text-sm text-gray-500">
            배민 셀프서비스에서 쿠키를 복사하면 실제 리뷰와 사진을 가져올 수 있어요.
          </p>
        </div>

        {status === 'ok' && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-semibold text-green-800">완료!</p>
              <p className="text-sm text-green-700 mt-1">{msg}</p>
            </div>
          </div>
        )}
        {status === 'error' && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-700">{msg}</p>
          </div>
        )}

        {/* 1단계: 쿠키 가져오는 방법 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
          <h2 className="font-bold text-gray-900 mb-3">1단계. 배민 쿠키 복사하기</h2>
          <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
            <li>Chrome에서 <a href="https://self.baemin.com" target="_blank" rel="noreferrer" className="text-[#2AC1BC] underline">self.baemin.com</a>에 로그인하세요</li>
            <li><strong>F12</strong> 누르거나 우클릭 → 검사 → <strong>Network</strong> 탭 클릭</li>
            <li>리뷰 페이지를 새로고침 (F5)</li>
            <li>Network 목록에서 아무 요청이나 클릭</li>
            <li>오른쪽 Headers 섹션에서 <strong>Request Headers → cookie</strong> 찾기</li>
            <li>cookie 값 전체를 복사해서 아래에 붙여넣기</li>
          </ol>
          <div className="mt-3 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
            <strong>TIP:</strong> Network 탭에서 &quot;reviews&quot; 로 필터링하면 바로 찾을 수 있어요
          </div>
        </div>

        {/* 2단계: 쿠키 입력 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
          <h2 className="font-bold text-gray-900 mb-3">2단계. 정보 입력</h2>
          <div className="mb-3">
            <label className="text-sm font-medium text-gray-700 mb-1 block">가게 번호 (shopNo)</label>
            <input
              type="text"
              value={shopNo}
              onChange={e => setShopNo(e.target.value)}
              placeholder="14637452 (URL에서 확인)"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2AC1BC]"
            />
            <p className="text-xs text-gray-400 mt-1">self.baemin.com/shops/<strong>14637452</strong>/reviews 에서 숫자 부분</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Cookie 값 붙여넣기</label>
            <textarea
              value={cookieStr}
              onChange={e => setCookieStr(e.target.value)}
              placeholder="SESSION=xxxx; __cf_bm=yyyy; ..."
              rows={5}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2AC1BC] resize-none"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={status === 'saving'}
            className="mt-3 w-full py-3 rounded-xl font-bold text-white transition"
            style={{ background: status === 'saving' ? '#9CA3AF' : '#2AC1BC' }}
          >
            {status === 'saving' ? '저장 중...' : '쿠키 저장하기'}
          </button>
        </div>

        {/* 3단계: 리뷰 가져오기 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-bold text-gray-900 mb-2">3단계. 실제 리뷰 가져오기</h2>
          <p className="text-sm text-gray-500 mb-3">
            쿠키 저장 후 버튼을 누르면 배민에서 실제 리뷰(사진 포함)를 가져와요.
          </p>
          <button
            onClick={handleCollect}
            disabled={status === 'saving'}
            className="w-full py-3 rounded-xl font-bold text-white transition"
            style={{ background: status === 'saving' ? '#9CA3AF' : '#2AC1BC' }}
          >
            {status === 'saving' ? '수집 중...' : '실제 리뷰 가져오기'}
          </button>
          <p className="text-xs text-gray-400 mt-2 text-center">
            쿠키는 약 1~2주 후 만료돼요. 만료되면 다시 저장해주세요.
          </p>
        </div>
      </div>
    </div>
  )
}
