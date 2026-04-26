'use client'
// app/my/platforms/naver_place/session/page.tsx
// ============================================================
// 네이버 세션쿠키 저장 페이지 (간단 버전)
// Network 탭 Cookie 헤더 전체 붙여넣기 → NID_AUT / NID_SES 자동 추출
// ============================================================
import { useState } from 'react'
import Link from 'next/link'

export default function NaverSessionPage() {
  const [cookieStr, setCookieStr] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  function parseCookieString(str: string): { aut: string; ses: string } | null {
    const clean = str.replace(/^cookie:\s*/i, '').trim()
    const aut = (clean.match(/NID_AUT=([^;]+)/) || [])[1]?.trim()
    const ses = (clean.match(/NID_SES=([^;]+)/) || [])[1]?.trim()
    if (!aut) return null
    return { aut, ses: ses || '' }
  }

  async function handleSave() {
    const parsed = parseCookieString(cookieStr)
    if (!parsed) {
      setStatus('error')
      setMsg('NID_AUT 값을 찾을 수 없어요. 쿠키 문자열에 NID_AUT=... 가 포함돼 있어야 해요.')
      return
    }
    setStatus('saving')
    setMsg('')
    try {
      const nowSec = Math.floor(Date.now() / 1000)
      const cookieArr: any[] = [
        { name: 'NID_AUT', value: parsed.aut, domain: '.naver.com', path: '/', httpOnly: true, secure: true, expires: nowSec + 86400 * 30 },
      ]
      if (parsed.ses) {
        cookieArr.push({ name: 'NID_SES', value: parsed.ses, domain: '.naver.com', path: '/', httpOnly: true, secure: true, expires: nowSec + 86400 * 7 })
      }
      const res = await fetch('/api/platform-accounts/naver-cookie', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookie_json: JSON.stringify(cookieArr) }),
      })
      const data = await res.json()
      if (data.ok) {
        setStatus('ok')
        setMsg(`저장 완료! NID_AUT${parsed.ses ? ' + NID_SES' : ''} 쿠키가 저장됐어요.`)
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

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <Link href="/review-admin/naver" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4">
            ← 네이버 리뷰 관리
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">네이버 세션쿠키 저장</h1>
          <p className="mt-1 text-sm text-gray-500">
            Worker가 네이버 로그인할 때 사용하는 쿠키예요. 2주마다 갱신이 필요해요.
          </p>
        </div>

        {/* 성공 배너 */}
        {status === 'ok' && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-semibold text-green-800">쿠키 저장 완료!</p>
              <p className="text-sm text-green-700 mt-0.5">{msg}</p>
              <Link href="/review-admin/naver" className="inline-block mt-2 text-sm font-medium text-green-700 underline">
                리뷰 관리로 돌아가기 →
              </Link>
            </div>
          </div>
        )}

        {/* 방법 안내 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-lg">📋</span> 쿠키 복사 방법
          </h2>
          <ol className="space-y-4">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">1</span>
              <div>
                <p className="text-sm font-medium text-gray-800">크롬에서 naver.com 열기</p>
                <p className="text-xs text-gray-500 mt-0.5">로그인된 상태여야 해요</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">2</span>
              <div>
                <p className="text-sm font-medium text-gray-800">F12 → Network 탭 클릭</p>
                <p className="text-xs text-gray-500 mt-0.5">개발자 도구가 열려요</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">3</span>
              <div>
                <p className="text-sm font-medium text-gray-800">목록에서 <code className="bg-gray-100 px-1 rounded text-xs">www.naver.com</code> 클릭</p>
                <p className="text-xs text-gray-500 mt-0.5">없으면 F5로 새로고침 후 클릭</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">4</span>
              <div>
                <p className="text-sm font-medium text-gray-800">Headers 탭 → Request Headers → Cookie</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  <code className="bg-gray-100 px-1 rounded text-xs">Cookie:</code> 옆의 긴 문자열 전체 복사
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">5</span>
              <div>
                <p className="text-sm font-medium text-gray-800">아래 칸에 붙여넣기 후 저장</p>
              </div>
            </li>
          </ol>
        </div>

        {/* 입력 폼 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cookie 문자열 붙여넣기
          </label>
          <textarea
            value={cookieStr}
            onChange={(e) => { setCookieStr(e.target.value); setStatus('idle'); setMsg('') }}
            placeholder="NID_AUT=xxxxx; NID_SES=yyyyy; ..."
            rows={5}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-xs font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />

          {/* 유효성 미리보기 */}
          {cookieStr.length > 10 && (
            <div className="mt-2 text-xs text-gray-500 space-y-0.5">
              <p>
                NID_AUT:{' '}
                {cookieStr.includes('NID_AUT=')
                  ? <span className="text-green-600 font-medium">확인됨</span>
                  : <span className="text-red-500">없음</span>}
              </p>
              <p>
                NID_SES:{' '}
                {cookieStr.includes('NID_SES=')
                  ? <span className="text-green-600 font-medium">확인됨</span>
                  : <span className="text-orange-500">없음 (선택)</span>}
              </p>
            </div>
          )}

          {status === 'error' && (
            <p className="mt-2 text-xs text-red-600">{msg}</p>
          )}

          <button
            onClick={handleSave}
            disabled={status === 'saving' || cookieStr.length < 10}
            className="mt-4 w-full py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {status === 'saving' ? '저장 중...' : '쿠키 저장하기'}
          </button>
        </div>

        {/* 주의사항 */}
        <div className="mt-5 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-xs text-amber-700 font-medium mb-1">⚠️ 주의사항</p>
          <ul className="text-xs text-amber-600 space-y-1 list-disc list-inside">
            <li>쿠키는 암호화해서 저장돼요</li>
            <li>네이버 쿠키는 약 2주 후 만료돼요 — 주기적으로 갱신해주세요</li>
            <li>네이버 비밀번호를 변경하면 기존 쿠키는 무효화돼요</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
