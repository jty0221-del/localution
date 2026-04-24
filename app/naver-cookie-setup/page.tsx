'use client'
// app/naver-cookie-setup/page.tsx
// 41차-15: 네이버 SmartPlace 세션 쿠키 추출 도우미 (관리자 전용)
import { useState, useEffect } from 'react'

export const dynamic = 'force-dynamic'

export default function NaverCookieSetupPage() {
  const [cookieStr, setCookieStr] = useState('')
  const [status, setStatus] = useState<'idle'|'saving'|'ok'|'err'>('idle')
  const [msg, setMsg] = useState('')
  const [iframeLoaded, setIframeLoaded] = useState(false)

  // iframe postMessage로 쿠키 받기
  useEffect(() => {
    function handler(e: MessageEvent) {
      if (e.data?.type === 'NAVER_COOKIES' && e.data?.cookies) {
        setCookieStr(e.data.cookies)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  async function save() {
    if (!cookieStr.trim()) { setMsg('쿠키가 비어있어요'); setStatus('err'); return }
    setStatus('saving')
    try {
      const res = await fetch('/api/platform-accounts/cookies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'naver_place', cookie_string: cookieStr.trim() }),
      })
      const data = await res.json()
      if (data.ok) {
        setStatus('ok')
        setMsg(`완료! ${data.saved_count}개 쿠키 저장됨. Worker가 자동 사용해요.`)
      } else {
        setStatus('err')
        setMsg(data.error || '저장 실패')
      }
    } catch(e: any) {
      setStatus('err')
      setMsg(e?.message || '에러')
    }
  }

  return (
    <main className="min-h-screen bg-[#F9FAFB] p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-[#03C75A] text-white rounded-2xl p-5 mb-6">
          <h1 className="text-xl font-black mb-1">네이버 SmartPlace 쿠키 등록</h1>
          <p className="text-sm opacity-90">Worker가 네이버 로그인 우회에 사용할 세션 쿠키를 등록해요</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 mb-4">
          <h2 className="font-bold text-[#191F28] mb-3">📋 SmartPlace 바로 접속</h2>
          <p className="text-sm text-[#4E5968] mb-3">
            아래 버튼을 클릭하면 SmartPlace가 <strong>새 창</strong>으로 열려요.<br/>
            이미 네이버 로그인이 되어있다면 바로 SmartPlace가 열립니다.
          </p>
          <a
            href="https://smartplace.naver.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-[#03C75A] text-white px-5 py-3 rounded-xl font-bold text-sm hover:opacity-90 transition mb-4"
          >
            SmartPlace 새 창으로 열기 →
          </a>

          <div className="bg-[#F0FDF4] border border-[#A7F3D0] rounded-xl p-4 text-[13px] text-[#065F46] leading-loose">
            <div className="font-bold mb-2">SmartPlace 창에서 쿠키 복사하는 방법:</div>
            <div className="space-y-1">
              <div>1. SmartPlace 창이 열리면 <kbd className="bg-white border border-[#D1FAE5] px-2 py-0.5 rounded font-mono text-xs">F12</kbd> 키 누르기</div>
              <div>2. 상단 탭에서 <strong>Network</strong> 클릭</div>
              <div>3. 브라우저 주소창에서 <kbd className="bg-white border border-[#D1FAE5] px-2 py-0.5 rounded font-mono text-xs">F5</kbd> (새로고침)</div>
              <div>4. Network 목록에서 <strong>제일 위 항목</strong> 클릭 (smartplace.naver.com)</div>
              <div>5. 오른쪽 <strong>Headers</strong> 탭 → <strong>Request Headers</strong> 아래</div>
              <div>6. <strong>cookie</strong> 항목 찾아서 값 전체 복사</div>
              <div>7. 아래 칸에 붙여넣기</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 mb-4">
          <h2 className="font-bold text-[#191F28] mb-3">쿠키 붙여넣기</h2>
          <textarea
            value={cookieStr}
            onChange={e => setCookieStr(e.target.value)}
            placeholder="NID_AUT=xxx; NID_SES=yyy; nid_inf=zzz; ..."
            rows={6}
            className="w-full px-4 py-3 rounded-xl bg-[#F5F6F8] border border-transparent text-[12px] font-mono placeholder-[#B0B8C1] focus:outline-none focus:border-[#03C75A] resize-none mb-3"
          />
          {cookieStr && (
            <div className="text-[12px] text-[#4E5968] mb-3">
              감지된 쿠키: <strong>{cookieStr.split(';').filter(s=>s.trim()).length}개</strong>
            </div>
          )}

          {msg && (
            <div className={`mb-3 p-3 rounded-lg text-[13px] ${status==='ok' ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-[#FEF2F2] text-[#DC2626]'}`}>
              {status==='ok' ? '✓ ' : '⚠ '}{msg}
            </div>
          )}

          <button
            onClick={save}
            disabled={status==='saving' || !cookieStr.trim() || status==='ok'}
            className="w-full py-4 bg-[#03C75A] text-white rounded-xl font-bold text-[15px] disabled:opacity-50 transition hover:opacity-90"
          >
            {status==='saving' ? '저장 중…' : status==='ok' ? '✓ 등록 완료!' : '쿠키 등록하기'}
          </button>
        </div>

        {status === 'ok' && (
          <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl p-5 text-[14px] text-[#1E40AF]">
            <div className="font-bold mb-1">🎉 이제 자동 발행이 돼요!</div>
            <div>리뷰 관리 페이지에서 <strong>자동발행</strong> 버튼을 누르면 Worker가 SmartPlace에 자동으로 답글을 달아요.</div>
            <div className="mt-2 text-[12px] opacity-70">쿠키는 보통 1~4주 유효해요. 만료되면 이 페이지에서 다시 등록해주세요.</div>
          </div>
        )}
      </div>
    </main>
  )
}
