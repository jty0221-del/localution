'use client'
// app/my/platforms/naver_place/session/page.tsx
// 43차: 네이버 세션 쿠키 입력 페이지
import { useState, useEffect } from 'react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function NaverSessionPage() {
  const [mode, setMode] = useState<'simple' | 'json'>('simple')
  const [nidAut, setNidAut] = useState('')
  const [nidSes, setNidSes] = useState('')
  const [cookieJson, setCookieJson] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [hasCookie, setHasCookie] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/platform-accounts/naver-cookie', { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.ok) { setHasCookie(d.has_cookie); setSavedAt(d.updated_at) } })
      .catch(() => {})
  }, [])

  const save = async () => {
    setMsg(null); setSaving(true)
    try {
      const body = mode === 'json'
        ? { cookie_json: cookieJson.trim() }
        : { nid_aut: nidAut.trim(), nid_ses: nidSes.trim() }
      const res = await fetch('/api/platform-accounts/naver-cookie', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await res.json()
      if (d.ok) {
        setMsg({ type: 'ok', text: '✅ 쿠키가 암호화되어 저장됐어요! 다음 자동 발행부터 적용됩니다.' })
        setHasCookie(true); setSavedAt(d.updated_at)
        setNidAut(''); setNidSes(''); setCookieJson('')
      } else {
        setMsg({ type: 'err', text: d.error || '저장 실패' })
      }
    } catch (e: any) {
      setMsg({ type: 'err', text: e?.message || '네트워크 오류' })
    } finally { setSaving(false) }
  }

  const isValid = mode === 'json' ? cookieJson.trim().startsWith('[') : (nidAut.trim().length > 10 && nidSes.trim().length > 10)

  return (
    <main className="min-h-screen bg-[#F9FAFB] py-10">
      <div className="max-w-2xl mx-auto px-4">
        {/* 브레드크럼 */}
        <div className="flex items-center gap-2 text-sm text-[#6B7280] mb-6">
          <Link href="/dashboard" className="hover:text-[#3182F6]">대시보드</Link>
          <span>/</span>
          <Link href="/my/platforms" className="hover:text-[#3182F6]">플랫폼 연결</Link>
          <span>/</span>
          <span className="text-[#191F28]">네이버 세션 쿠키</span>
        </div>

        {/* 헤더 */}
        <div className="rounded-xl p-6 mb-6 border bg-[#03C75A15] border-[#03C75A40]">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-black bg-[#03C75A] text-white">N</div>
            <div>
              <div className="text-[11px] font-bold mb-0.5 text-[#03C75A]">보안 강화</div>
              <h1 className="text-xl font-black text-[#191F28]">네이버 세션 쿠키 설정</h1>
            </div>
          </div>
          <p className="text-xs text-[#4E5968] leading-relaxed mt-2">
            Cloud Run 서버 IP가 네이버에서 차단될 때, 브라우저 세션 쿠키를 등록하면
            로그인 없이 답글을 자동으로 등록할 수 있어요.
          </p>
          {hasCookie && savedAt && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ECFDF5] text-[#059669] text-[11px] font-semibold">
              ✅ 쿠키 등록됨 · 마지막 저장: {new Date(savedAt).toLocaleDateString('ko-KR')}
            </div>
          )}
        </div>

        {/* 입력 모드 탭 */}
        <div className="flex gap-1 mb-4 bg-[#F2F4F6] rounded-xl p-1">
          <button onClick={() => setMode('simple')}
            className={'flex-1 py-2 rounded-lg text-sm font-semibold transition ' + (mode === 'simple' ? 'bg-white shadow text-[#191F28]' : 'text-[#6B7280] hover:text-[#4E5968]')}>
            🔑 간단 입력 (NID_AUT + NID_SES)
          </button>
          <button onClick={() => setMode('json')}
            className={'flex-1 py-2 rounded-lg text-sm font-semibold transition ' + (mode === 'json' ? 'bg-white shadow text-[#191F28]' : 'text-[#6B7280] hover:text-[#4E5968]')}>
            📋 JSON 전체 붙여넣기
          </button>
        </div>

        {/* 쿠키 추출 방법 안내 */}
        <div className="bg-white border border-[#E5E8EB] rounded-2xl p-5 mb-4">
          <h3 className="text-sm font-bold text-[#191F28] mb-3">
            {mode === 'simple' ? '🔍 NID_AUT, NID_SES 찾는 방법' : '🔍 Cookie-Editor로 JSON 내보내는 방법'}
          </h3>
          {mode === 'simple' ? (
            <ol className="space-y-2 text-xs text-[#4E5968] leading-relaxed">
              <li className="flex gap-2"><span className="font-bold text-[#03C75A] flex-shrink-0">1.</span> Chrome에서 <a href="https://new.smartplace.naver.com/" target="_blank" rel="noopener noreferrer" className="text-[#3182F6] underline">스마트플레이스</a>에 로그인되어 있는지 확인</li>
              <li className="flex gap-2"><span className="font-bold text-[#03C75A] flex-shrink-0">2.</span> 키보드 <strong>F12</strong> → <strong>Application</strong> 탭 클릭</li>
              <li className="flex gap-2"><span className="font-bold text-[#03C75A] flex-shrink-0">3.</span> 왼쪽 Cookies → <strong>https://naver.com</strong> 클릭</li>
              <li className="flex gap-2"><span className="font-bold text-[#03C75A] flex-shrink-0">4.</span> <strong>NID_AUT</strong> 행 클릭 → Value 열 값을 복사해서 아래 붙여넣기</li>
              <li className="flex gap-2"><span className="font-bold text-[#03C75A] flex-shrink-0">5.</span> 같은 방법으로 <strong>NID_SES</strong> 도 복사</li>
            </ol>
          ) : (
            <ol className="space-y-2 text-xs text-[#4E5968] leading-relaxed">
              <li className="flex gap-2"><span className="font-bold text-[#03C75A] flex-shrink-0">1.</span> Chrome 웹 스토어에서 <strong>"Cookie-Editor"</strong> 확장 프로그램 설치</li>
              <li className="flex gap-2"><span className="font-bold text-[#03C75A] flex-shrink-0">2.</span> <a href="https://naver.com" target="_blank" rel="noopener noreferrer" className="text-[#3182F6] underline">naver.com</a>에서 확장 프로그램 아이콘 클릭</li>
              <li className="flex gap-2"><span className="font-bold text-[#03C75A] flex-shrink-0">3.</span> 하단 <strong>Export</strong> 버튼 → <strong>Export as JSON</strong></li>
              <li className="flex gap-2"><span className="font-bold text-[#03C75A] flex-shrink-0">4.</span> 복사된 JSON을 아래에 붙여넣기</li>
            </ol>
          )}
          <div className="mt-3 rounded-lg bg-[#FFF7ED] border border-[#FED7AA] px-3 py-2 text-[11px] text-[#92400E]">
            ⚠️ 쿠키는 민감한 정보예요. 로컬루션 외부에 공유하지 마세요. 서버에 AES-256-GCM으로 암호화되어 저장됩니다.
          </div>
        </div>

        {/* 입력 영역 */}
        <div className="bg-white border border-[#E5E8EB] rounded-2xl p-5 mb-4">
          {msg && (
            <div className={'mb-4 rounded-lg px-3 py-2 text-sm ' + (msg.type === 'ok' ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-[#FEF2F2] text-[#DC2626]')}>
              {msg.text}
            </div>
          )}
          {mode === 'simple' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#4E5968] mb-1">NID_AUT 값</label>
                <input type="password" value={nidAut} onChange={e => setNidAut(e.target.value)} placeholder="NID_AUT 쿠키 값 붙여넣기"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#F5F6F8] border border-transparent text-sm placeholder-[#B0B8C1] focus:outline-none focus:border-[#03C75A] focus:bg-white font-mono" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#4E5968] mb-1">NID_SES 값</label>
                <input type="password" value={nidSes} onChange={e => setNidSes(e.target.value)} placeholder="NID_SES 쿠키 값 붙여넣기"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#F5F6F8] border border-transparent text-sm placeholder-[#B0B8C1] focus:outline-none focus:border-[#03C75A] focus:bg-white font-mono" />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-[#4E5968] mb-1">Cookie-Editor JSON 붙여넣기</label>
              <textarea value={cookieJson} onChange={e => setCookieJson(e.target.value)}
                placeholder={'[\n  { "name": "NID_AUT", "value": "...", ... },\n  ...\n]'}
                rows={8}
                className="w-full px-3 py-2.5 rounded-xl bg-[#F5F6F8] border border-transparent text-xs placeholder-[#B0B8C1] focus:outline-none focus:border-[#03C75A] focus:bg-white font-mono resize-none" />
            </div>
          )}
          <button onClick={save} disabled={saving || !isValid}
            className="mt-4 w-full py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-50 transition bg-[#03C75A] hover:opacity-90">
            {saving ? '암호화 저장 중...' : '쿠키 저장하기'}
          </button>
        </div>

        {/* 만료 안내 */}
        <div className="bg-white border border-[#E5E8EB] rounded-2xl p-4 text-xs text-[#4E5968] space-y-1.5">
          <p className="font-semibold text-[#191F28]">🔄 쿠키 갱신 주기</p>
          <p>• 네이버 세션 쿠키는 보통 <strong>30~90일</strong> 후 만료돼요</p>
          <p>• 만료되면 자동 답글이 실패하고 "쿠키 만료됨" 오류가 표시됩니다</p>
          <p>• 이 페이지에서 새 쿠키를 등록하면 바로 복구됩니다</p>
        </div>

        <div className="mt-4 flex gap-3">
          <Link href="/my/platforms" className="flex-1 text-center py-3 rounded-xl border border-[#E5E8EB] text-sm text-[#4E5968] hover:bg-[#F9FAFB]">← 플랫폼 허브</Link>
          <Link href="/review-admin/naver-place" className="flex-1 text-center py-3 rounded-xl border border-[#E5E8EB] text-sm text-[#4E5968] hover:bg-[#F9FAFB]">리뷰 관리 →</Link>
        </div>
      </div>
    </main>
  )
}
