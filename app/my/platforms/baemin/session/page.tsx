'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function BaeminSessionPage() {
  const [copied, setCopied] = useState(false)
  const [showCookie, setShowCookie] = useState(false)
  const [cookieStr, setCookieStr] = useState('')
  const [shopNo, setShopNo] = useState('14637452')
  const [status, setStatus] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  // 북마크릿: self.baemin.com 에서 __NEXT_DATA__ 읽어 로컬루션으로 전송
  const BK_PARTS = [
    '(function(){',
    'var parts=location.pathname.split("/");var sn="14637452";',
    'for(var j=0;j<parts.length;j++){if(parts[j]==="shops"&&parts[j+1]){sn=parts[j+1];break;}}',
    'var rvs=[];',
    'var el=document.getElementById("__NEXT_DATA__");',
    'if(el){try{',
    'var nd=JSON.parse(el.textContent);',
    'var pp=nd&&nd.props&&nd.props.pageProps||{};',
    'var ks=Object.keys(pp);',
    'for(var i=0;i<ks.length;i++){',
    'var v=pp[ks[i]];',
    'var a=Array.isArray(v)?v:(v&&(v.contents||v.list||v.reviews||v.reviewList||v.data));',
    'if(Array.isArray(a)&&a.length>0){rvs=a;break;}}',
    '}catch(e){alert("파싱오류: "+e.message);return;}}',
    'function send(rs){',
    'fetch("https://www.localution.co.kr/api/baemin/collect-reviews",',
    '{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",',
    'body:JSON.stringify({reviews:rs,shop_no:sn})})',
    '.then(function(r){return r.json()})',
    '.then(function(d){alert(d.ok?"리뷰 "+d.count+"개 가져왔어요! 로컬루션에서 확인하세요.":"오류: "+(d.error||"알수없음"))})',
    '.catch(function(e){alert("네트워크오류: "+e.message)});}',
    'if(rvs.length>0){send(rvs);return;}',
    'fetch("https://self-api.baemin.com/v1/review/shops/"+sn+"/reviews?pageNumber=1&pageSize=20",',
    '{credentials:"include",headers:{"Accept":"application/json"}})',
    '.then(function(r){return r.json()})',
    '.then(function(j){',
    'var a=Array.isArray(j)?j:(j.contents||j.list||j.data||[]);',
    'if(a.length>0){send(a);}else{',
    'alert("리뷰를 찾을 수 없어요.\n\n페이지 정보:\n"+JSON.stringify(Object.keys(pp)).slice(0,200));}})',
    '.catch(function(e){alert("self-api 오류: "+e.message);});',
    '})()'
  ]
  const bkHref = 'javascript:' + BK_PARTS.join('')

  function copyBk() {
    navigator.clipboard.writeText(bkHref).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  async function handleSaveCookie() {
    let cookie = cookieStr.trim()
    if (cookie.toLowerCase().startsWith('cookie:')) cookie = cookie.slice(7).trim()
    if (!cookie || cookie.length < 10) { setStatus('error'); setMsg('쿠키를 입력해주세요.'); return }
    setStatus('saving'); setMsg('')
    try {
      const res = await fetch('/api/platform-accounts/baemin-cookie', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookie_str: cookie, shop_no: shopNo || '14637452' }),
      })
      const data = await res.json()
      if (data.ok) { setStatus('ok'); setMsg('쿠키 저장 완료!'); setCookieStr('') }
      else { setStatus('error'); setMsg(data.error || '저장 실패') }
    } catch (e: any) { setStatus('error'); setMsg(e?.message || '오류') }
  }

  async function handleCollect() {
    setStatus('saving'); setMsg('서버에서 수집 중...')
    try {
      const res = await fetch('/api/baemin/collect-reviews', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_no: shopNo || '14637452' }),
      })
      const data = await res.json()
      if (data.ok) { setStatus('ok'); setMsg('리뷰 ' + (data.count || 0) + '개 완료!') }
      else { setStatus('error'); setMsg(data.error + (data.debug ? '\n\nDebug: ' + data.debug.slice(0, 200) : '')) }
    } catch (e: any) { setStatus('error'); setMsg(e?.message || '오류') }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <Link href="/review-admin/baemin" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4">
            ← 배민 리뷰 관리
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">배민 리뷰 가져오기</h1>
          <p className="mt-1 text-sm text-gray-500">북마크릿으로 실제 리뷰와 사진을 로컬루션에 가져올 수 있어요.</p>
        </div>

        {status === 'ok' && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
            <span className="text-xl">✅</span>
            <div>
              <p className="font-semibold text-green-800">{msg}</p>
              <Link href="/review-admin/baemin" className="text-sm text-green-700 underline mt-1 block">배민 리뷰 확인하기 →</Link>
            </div>
          </div>
        )}
        {status === 'error' && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-700 whitespace-pre-wrap">{msg}</p>
          </div>
        )}

        {/* ─── 북마크릿 섹션 ─── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-bold text-gray-900">🔖 북마크릿으로 가져오기</h2>
            <span className="text-xs bg-[#2AC1BC] text-white px-2 py-0.5 rounded-full font-medium">권장</span>
          </div>
          <p className="text-xs text-gray-400 mb-5">한 번만 설정하면 클릭 한 번으로 리뷰를 가져올 수 있어요</p>

          <ol className="space-y-4 mb-6">
            <li className="flex gap-3 text-sm">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#2AC1BC] text-white text-xs font-bold flex items-center justify-center">1</span>
              <div>
                <p className="font-medium text-gray-800">아래 버튼을 북마크바로 드래그해서 저장</p>
                <p className="text-xs text-gray-400 mt-0.5">북마크바 없으면 Ctrl+Shift+B 로 표시 / 또는 &quot;코드 복사&quot; 후 북마크 추가</p>
              </div>
            </li>
            <li className="flex gap-3 text-sm">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#2AC1BC] text-white text-xs font-bold flex items-center justify-center">2</span>
              <div>
                <p className="font-medium text-gray-800">
                  <a href="https://self.baemin.com/shops/14637452/reviews" target="_blank" rel="noreferrer" className="text-[#2AC1BC] underline">
                    self.baemin.com 리뷰 페이지
                  </a>에 로그인 후 접속
                </p>
              </div>
            </li>
            <li className="flex gap-3 text-sm">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#2AC1BC] text-white text-xs font-bold flex items-center justify-center">3</span>
              <div>
                <p className="font-medium text-gray-800">저장한 북마크 클릭 → 완료!</p>
                <p className="text-xs text-gray-400 mt-0.5">알림창에 가져온 리뷰 수가 표시돼요</p>
              </div>
            </li>
          </ol>

          <div className="flex gap-2">
            <a
              href={bkHref}
              draggable
              onClick={e => e.preventDefault()}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white text-sm cursor-grab active:cursor-grabbing"
              style={{ background: '#2AC1BC' }}
            >
              📥 배민 리뷰 가져오기
            </a>
            <button
              onClick={copyBk}
              className="px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {copied ? '✅ 복사됨' : '코드 복사'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">버튼을 북마크바로 드래그 · 또는 코드 복사 후 북마크 URL에 붙여넣기</p>
        </div>

        {/* ─── 쿠키 직접 입력 (보조) ─── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <button
            onClick={() => setShowCookie(!showCookie)}
            className="w-full flex items-center justify-between text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <span>🍪 쿠키 직접 입력 (보조 방법)</span>
            <span className="text-gray-400">{showCookie ? '▲ 접기' : '▼ 펼치기'}</span>
          </button>

          {showCookie && (
            <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-400">self.baemin.com Network 탭에서 Cookie 헤더를 복사한 경우</p>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">가게 번호</label>
                <input
                  type="text"
                  value={shopNo}
                  onChange={e => setShopNo(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2AC1BC]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Cookie 헤더 값</label>
                <textarea
                  value={cookieStr}
                  onChange={e => { setCookieStr(e.target.value); setStatus('idle') }}
                  rows={4}
                  placeholder="SESSION=xxxx; ..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-[#2AC1BC]"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveCookie}
                  disabled={status === 'saving'}
                  className="flex-1 py-2.5 rounded-xl bg-gray-700 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {status === 'saving' ? '저장 중...' : '쿠키 저장'}
                </button>
                <button
                  onClick={handleCollect}
                  disabled={status === 'saving'}
                  className="flex-1 py-2.5 rounded-xl bg-gray-500 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {status === 'saving' ? '수집 중...' : '서버에서 수집'}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
