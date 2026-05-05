'use client'
// app/my/platforms/naver_place/session/page.tsx
// ============================================================
// 네이버 세션쿠키 저장 페이지 (전체 쿠키 버전)
// new.smartplace.naver.com Network 탭 Cookie 헤더 붙여넣기
// → NID_AUT / NID_SES / nstore_session 등 전체 추출
// ============================================================
import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Key } from 'lucide-react'

function parseCookiePreview(str: string) {
  const clean = str.replace(/^cookie:\s*/i, '').trim()
  const get = (name: string) => {
    const m = clean.match(new RegExp(name + '=([^;\\s]+)'))
    return m ? m[1].slice(0, 10) + '…' : null
  }
  const countAll = clean.split(/;\s*/).filter(p => p.includes('=')).length
  return {
    nidAut: get('NID_AUT'),
    nidSes: get('NID_SES'),
    nstoreSession: get('nstore_session'),
    nstorePrsId: get('nstore_prs_id'),
    total: countAll,
  }
}

function buildCookieJson(str: string): string | null {
  const clean = str.replace(/^cookie:\s*/i, '').trim()
  const nowSec = Math.floor(Date.now() / 1000)
  const cookies: object[] = []
  for (const part of clean.split(/;\s*/)) {
    const eqIdx = part.indexOf('=')
    if (eqIdx < 0) continue
    const name = part.slice(0, eqIdx).trim()
    const value = part.slice(eqIdx + 1).trim()
    if (!name || !value) continue
    const isSmartPlace = name.startsWith('nstore_') || name === 'smart_biz_session'
    cookies.push({
      name, value,
      domain: isSmartPlace ? 'new.smartplace.naver.com' : '.naver.com',
      path: '/', httpOnly: false, secure: true,
      expires: nowSec + 86400 * 30,
    })
  }
  if (!cookies.some((c: any) => c.name === 'NID_AUT')) return null
  return JSON.stringify(cookies)
}

export default function NaverSessionPage() {
  const [cookieStr, setCookieStr] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  const preview = cookieStr.length > 10 ? parseCookiePreview(cookieStr) : null

  async function handleSave() {
    const cookieJson = buildCookieJson(cookieStr)
    if (!cookieJson) {
      setStatus('error')
      setMsg('NID_AUT 값을 찾을 수 없어요. new.smartplace.naver.com 에서 복사했는지 확인해주세요.')
      return
    }
    setStatus('saving')
    setMsg('')
    try {
      const res = await fetch('/api/platform-accounts/naver-cookie', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookie_json: cookieJson }),
      })
      const data = await res.json()
      if (data.ok) {
        const parsed = parseCookiePreview(cookieStr)
        const hasNstore = parsed?.nstoreSession
        setStatus('ok')
        setMsg(hasNstore
          ? `저장 완료! NID_AUT + NID_SES + nstore_session 포함 ${parsed.total}개 쿠키 저장됨.`
          : `저장 완료! ${parsed?.total ?? 0}개 쿠키 저장됨. (nstore_session 없음 → 리뷰 탭에서 재시도)`)
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
            자동발행 Worker가 SmartPlace에 로그인할 때 사용하는 쿠키예요.
          </p>
        </div>

        {/* 성공 배너 */}
        {status === 'ok' && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={18} className="text-green-600" strokeWidth={2.5} />
            </div>
            <div>
              <p className="font-semibold text-green-800">쿠키 저장 완료!</p>
              <p className="text-sm text-green-700 mt-0.5">{msg}</p>
              <Link href="/review-admin/naver" className="inline-block mt-2 text-sm font-medium text-green-700 underline">
                리뷰 관리로 돌아가기 →
              </Link>
            </div>
          </div>
        )}

        {/* nstore_session 필요 안내 */}
        <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-xs font-semibold text-blue-800 mb-1 flex items-center gap-1"><Key size={11} strokeWidth={2.5} /> SmartPlace 전용 쿠키가 필요해요</p>
          <p className="text-xs text-blue-700">
            기존에 <code className="bg-blue-100 px-1 rounded">naver.com</code>에서 복사했다면 다시 해주세요.{' '}
            <strong>리뷰 관리</strong>는 <code className="bg-blue-100 px-1 rounded">nstore_session</code> 쿠키가 있어야 동작해요.
          </p>
        </div>

        {/* 방법 안내 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-lg">📋</span> 쿠키 복사 방법
          </h2>
          <ol className="space-y-4">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center">1</span>
              <div>
                <p className="text-sm font-medium text-gray-800">크롬에서 SmartPlace 리뷰 탭 열기</p>
                <a
                  href="https://new.smartplace.naver.com/bizes"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 underline"
                >
                  new.smartplace.naver.com/bizes → 내 매장 선택 → 리뷰 탭
                </a>
                <p className="text-xs text-gray-500 mt-0.5">로그인된 상태 + 리뷰 탭까지 이동 필수</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center">2</span>
              <div>
                <p className="text-sm font-medium text-gray-800">F12 → Network 탭 → F5 새로고침</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center">3</span>
              <div>
                <p className="text-sm font-medium text-gray-800">목록에서 <code className="bg-gray-100 px-1 rounded text-xs">new.smartplace.naver.com</code> 클릭</p>
                <p className="text-xs text-gray-500 mt-0.5">첫 번째 항목 (HTML 문서) 선택</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center">4</span>
              <div>
                <p className="text-sm font-medium text-gray-800">Headers → Request Headers → Cookie</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  <code className="bg-gray-100 px-1 rounded text-xs">nstore_session=...</code>이 포함된 긴 문자열 전체 복사
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center">5</span>
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
            placeholder="NID_AUT=xxxxx; NID_SES=yyyyy; nstore_session=zzzzz; ..."
            rows={5}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-xs font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />

          {/* 유효성 미리보기 */}
          {preview && (
            <div className="mt-2 text-xs space-y-0.5">
              <p>
                NID_AUT:{' '}
                {preview.nidAut
                  ? <span className="text-green-600 font-medium">✓ 확인됨</span>
                  : <span className="text-red-500">✗ 없음 (필수)</span>}
              </p>
              <p>
                NID_SES:{' '}
                {preview.nidSes
                  ? <span className="text-green-600 font-medium">✓ 확인됨</span>
                  : <span className="text-orange-500">없음 (선택)</span>}
              </p>
              <p>
                nstore_session:{' '}
                {preview.nstoreSession
                  ? <span className="text-green-600 font-medium">✓ 확인됨 — 리뷰 관리 가능</span>
                  : <span className="text-red-500 font-medium">✗ 없음 — SmartPlace 리뷰 탭에서 다시 복사하세요</span>}
              </p>
              <p className="text-gray-400">총 {preview.total}개 쿠키 감지됨</p>
            </div>
          )}

          {status === 'error' && (
            <p className="mt-2 text-xs text-red-600">{msg}</p>
          )}

          <button
            onClick={handleSave}
            disabled={status === 'saving' || cookieStr.length < 10}
            className="mt-4 w-full py-3 rounded-xl font-semibold text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {status === 'saving' ? '저장 중...' : '쿠키 저장하기'}
          </button>
        </div>

        {/* 주의사항 */}
        <div className="mt-5 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-xs text-amber-700 font-medium mb-1">주의사항</p>
          <ul className="text-xs text-amber-600 space-y-1 list-disc list-inside">
            <li>쿠키는 암호화해서 저장돼요</li>
            <li><strong>반드시 SmartPlace 리뷰 탭</strong>에서 복사해야 nstore_session이 포함돼요</li>
            <li>약 2주마다 갱신이 필요해요 (비밀번호 변경 시 즉시 무효화)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
