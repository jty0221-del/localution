'use client'

// ============================================================
// 쿠팡이츠 리뷰 북마클릿 다이얼로그
//   · 사장님 브라우저에서 store.coupangeats.com 로그인 상태로 실행
//   · /api/v1/merchant/reviews/search 직접 호출 → 모든 리뷰 수집
//   · Akamai 봇 차단 100% 우회 (브라우저 자체 세션 사용)
// ============================================================
import { useState } from 'react'
import { Bookmark, Copy, Check, X, ExternalLink, ArrowRight, Smartphone } from 'lucide-react'

const APP_ORIGIN = 'https://www.localution.co.kr'

// 쿠팡이츠 리뷰 추출 북마클릿 (template literal regex 금지 규칙 준수 — 배열 join)
const RAW_JS_TEMPLATE = [
  '(async function(){',
  '  try {',
  '    var T = "__TOKEN__";',
  '    var APP = "' + APP_ORIGIN + '";',
  '    if (location.hostname.indexOf("coupangeats.com") < 0) {',
  '      alert("store.coupangeats.com 페이지에서 실행해주세요.\\n\\n현재 페이지: " + location.hostname);',
  '      return;',
  '    }',
  '    // 1. whoami → storeId',
  '    var who = await fetch("/api/v1/merchant/whoami", { credentials: "include" }).then(function(r){ return r.ok ? r.json() : null; });',
  '    if (!who || !who.data) {',
  '      alert("로그인 상태를 확인할 수 없어요.\\n쿠팡이츠 사장님 포털에 로그인 후 다시 시도해주세요.");',
  '      return;',
  '    }',
  '    var storeId = who.data.responsibleStoreId;',
  '    if (!storeId) {',
  '      alert("매장 정보를 찾을 수 없어요.\\n매장 관리 페이지로 이동 후 다시 시도해주세요.\\n(예: store.coupangeats.com/merchant/management/home/12345)");',
  '      return;',
  '    }',
  '    console.log("로컬루션: storeId=" + storeId);',
  '    // 2. 매장 이름',
  '    var storeName = "";',
  '    try {',
  '      var s = await fetch("/api/v1/merchant/stores/" + storeId, { credentials: "include" }).then(function(r){ return r.ok ? r.json() : null; });',
  '      if (s && s.data) storeName = s.data.name || s.data.storeName || "";',
  '    } catch(_) {}',
  '    // 3. 리뷰 페이지네이션 (최대 20페이지 = 600개)',
  '    var allReviews = [];',
  '    var page = 0;',
  '    var size = 30;',
  '    var maxPages = 20;',
  '    var fetchedAtLeastOnce = false;',
  '    while (page < maxPages) {',
  '      var url = "/api/v1/merchant/reviews/search?storeId=" + storeId + "&page=" + page + "&size=" + size + "&statusType=ALL";',
  '      var res = await fetch(url, { credentials: "include" });',
  '      if (!res.ok) {',
  '        if (!fetchedAtLeastOnce) {',
  '          alert("리뷰를 가져올 수 없어요. (HTTP " + res.status + ")\\n\\n쿠팡이츠 리뷰 관리 페이지에서 다시 시도해주세요.");',
  '          return;',
  '        }',
  '        break;',
  '      }',
  '      var json = await res.json();',
  '      var list = (json && json.data && json.data.content) ? json.data.content : (Array.isArray(json && json.data) ? json.data : []);',
  '      if (!list || list.length === 0) break;',
  '      fetchedAtLeastOnce = true;',
  '      for (var i = 0; i < list.length; i++) {',
  '        var r = list[i];',
  '        var menus = [];',
  '        if (Array.isArray(r.menus)) {',
  '          for (var mi = 0; mi < r.menus.length; mi++) {',
  '            var m = r.menus[mi];',
  '            menus.push(typeof m === "string" ? m : (m.name || m.menuName || ""));',
  '          }',
  '        }',
  '        var photos = [];',
  '        if (Array.isArray(r.reviewImages || r.photos)) {',
  '          var imgs = r.reviewImages || r.photos;',
  '          for (var pi = 0; pi < imgs.length; pi++) {',
  '            var p = imgs[pi];',
  '            photos.push(typeof p === "string" ? p : (p.url || p.imageUrl || ""));',
  '          }',
  '        }',
  '        allReviews.push({',
  '          id: String(r.orderReviewId || r.reviewId || r.id || ""),',
  '          rating: r.rating || r.score || 0,',
  '          content: r.content || r.text || r.body || "",',
  '          author: r.userName || r.authorName || r.nickname || r.customerName || "",',
  '          createdAt: r.createdAt || r.orderedAt || r.reviewedAt || null,',
  '          menus: menus.filter(Boolean),',
  '          photos: photos.filter(Boolean),',
  '          reply: r.replyContent ? { content: r.replyContent } : (r.reply || null)',
  '        });',
  '      }',
  '      if (list.length < size) break;',
  '      page++;',
  '    }',
  '    console.log("로컬루션: 추출 " + allReviews.length + "개");',
  '    if (allReviews.length === 0) {',
  '      alert("리뷰가 0개입니다.\\n매장에 리뷰가 없거나, 리뷰 페이지를 먼저 한번 열어주세요.");',
  '      return;',
  '    }',
  '    // 4. 서버 전송',
  '    var sub = await fetch(APP + "/api/review-import/coupang/submit", {',
  '      method: "POST",',
  '      mode: "cors",',
  '      headers: { "Content-Type": "application/json" },',
  '      body: JSON.stringify({ token: T, reviews: allReviews, store_id: String(storeId), store_name: storeName })',
  '    });',
  '    var sj = await sub.json();',
  '    if (sj.ok) {',
  '      alert("쿠팡이츠 리뷰 가져오기 완료\\n\\n총 " + allReviews.length + "개 수집\\n" + sj.inserted + "개 신규 / " + sj.updated + "개 갱신\\n\\n로컬루션 페이지에서 확인하세요.");',
  '    } else {',
  '      alert("전송 실패: " + (sj.message || sj.error || "unknown"));',
  '    }',
  '  } catch(e) {',
  '    console.error("로컬루션 북마클릿 오류:", e);',
  '    alert("오류: " + e.message);',
  '  }',
  '})();',
].join('\n')

function buildRawJs(token: string): string {
  return RAW_JS_TEMPLATE.split('__TOKEN__').join(token)
}
function buildBookmarkletJs(token: string): string {
  const code = buildRawJs(token).split('\n').join(' ')
  return 'javascript:' + encodeURIComponent(code)
}

export default function CoupangReviewBookmarkletDialog({
  open,
  onClose,
  token,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  token: string | null
  onSuccess?: () => void
}) {
  const [copiedRaw, setCopiedRaw] = useState(false)
  const [copiedBmk, setCopiedBmk] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [mode, setMode] = useState<'console' | 'bookmark'>('console')

  if (!open || !token) return null

  const bookmarkletUrl = buildBookmarkletJs(token)
  const rawJs = buildRawJs(token)

  function handleCopyRaw() {
    navigator.clipboard.writeText(rawJs)
    setCopiedRaw(true)
    setTimeout(() => setCopiedRaw(false), 2500)
  }
  function handleCopyBmk() {
    navigator.clipboard.writeText(bookmarkletUrl)
    setCopiedBmk(true)
    setTimeout(() => setCopiedBmk(false), 2500)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-5 max-w-2xl w-full max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D70530] to-[#A30024] flex items-center justify-center shadow-sm">
              <Bookmark size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-black text-[#191F28]">쿠팡이츠 리뷰 직접 가져오기</h3>
              <p className="text-[10px] text-[#8B95A1]">사장님 브라우저에서 직접 추출 (Akamai 차단 우회)</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#8B95A1] hover:text-[#191F28]">
            <X size={20} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-5 px-1">
          {[1, 2, 3].map(n => (
            <div key={n} className="flex-1 flex items-center gap-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                step >= n ? 'bg-[#D70530] text-white' : 'bg-[#F2F4F6] text-[#8B95A1]'
              }`}>{n}</div>
              {n < 3 && <div className={`flex-1 h-1 rounded-full ${step > n ? 'bg-[#D70530]' : 'bg-[#F2F4F6]'}`} />}
            </div>
          ))}
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex gap-2 p-1 bg-[#F2F4F6] rounded-xl">
              <button onClick={() => setMode('console')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-colors ${
                  mode === 'console' ? 'bg-white text-[#D70530] shadow-sm' : 'text-[#8B95A1]'
                }`}>
                콘솔 모드 (추천)
              </button>
              <button onClick={() => setMode('bookmark')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-colors ${
                  mode === 'bookmark' ? 'bg-white text-[#D70530] shadow-sm' : 'text-[#8B95A1]'
                }`}>
                북마크 모드
              </button>
            </div>

            {mode === 'console' && (
              <>
                <div className="bg-[#FFF8F8] border-2 border-[#FECACA] rounded-xl p-4">
                  <p className="text-sm font-bold text-[#191F28] mb-2">1) 코드 복사하기</p>
                  <p className="text-xs text-[#4E5968] mb-3">아래 버튼 누르면 토큰 포함된 추출 코드가 복사돼요.</p>
                  <button onClick={handleCopyRaw}
                    className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 ${
                      copiedRaw ? 'bg-green-500 text-white' : 'bg-[#D70530] text-white hover:bg-[#A30024]'
                    }`}>
                    {copiedRaw ? <><Check size={14} strokeWidth={3} /> 복사됨</> : <><Copy size={14} strokeWidth={2.5} /> 코드 복사하기</>}
                  </button>
                </div>
                <div className="bg-white border border-[#E5E8EB] rounded-xl p-3">
                  <p className="text-xs font-bold text-[#4E5968] mb-1.5">방법 (콘솔 모드)</p>
                  <ol className="text-[11px] text-[#4E5968] space-y-1.5 leading-relaxed">
                    <li><strong>1.</strong> 위에서 코드 복사</li>
                    <li><strong>2.</strong> 새 탭에서 <a href="https://store.coupangeats.com" target="_blank" rel="noopener noreferrer" className="text-[#D70530] font-bold underline">store.coupangeats.com</a> 로그인</li>
                    <li><strong>3.</strong> 매장 관리 → <strong>리뷰 관리</strong> 페이지 클릭</li>
                    <li><strong>4.</strong> <strong>F12</strong> 키 누르기 → 상단 <strong>Console</strong> 탭</li>
                    <li><strong>5.</strong> 콘솔에 붙여넣기 (Ctrl+V) → Enter</li>
                    <li><strong>6.</strong> 자동으로 모든 리뷰 수집 + 로컬루션에 저장</li>
                  </ol>
                </div>
              </>
            )}

            {mode === 'bookmark' && (
              <>
                <div className="bg-[#FFF8F8] border-2 border-[#FECACA] rounded-xl p-4">
                  <p className="text-sm font-bold text-[#191F28] mb-2">1) 북마크에 추가</p>
                  <p className="text-xs text-[#4E5968] mb-3">아래 버튼을 <strong>북마크바로 드래그</strong>하거나 우클릭 → 북마크 추가</p>
                  <a href={bookmarkletUrl}
                    onClick={(e) => e.preventDefault()}
                    draggable
                    className="block w-full py-3 rounded-xl text-sm font-bold bg-[#D70530] text-white text-center hover:bg-[#A30024] cursor-grab active:cursor-grabbing">
                    로컬루션-쿠팡리뷰 (드래그해서 북마크)
                  </a>
                  <button onClick={handleCopyBmk}
                    className={`mt-2 w-full py-2 rounded-xl text-xs font-bold ${
                      copiedBmk ? 'bg-green-500 text-white' : 'bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB]'
                    }`}>
                    {copiedBmk ? '북마크 URL 복사됨' : '북마크 URL 복사 (수동 추가용)'}
                  </button>
                </div>
                <div className="bg-white border border-[#E5E8EB] rounded-xl p-3">
                  <p className="text-xs font-bold text-[#4E5968] mb-1.5">방법 (북마크 모드)</p>
                  <ol className="text-[11px] text-[#4E5968] space-y-1.5 leading-relaxed">
                    <li><strong>1.</strong> 위 빨간 버튼을 북마크바로 드래그</li>
                    <li><strong>2.</strong> <a href="https://store.coupangeats.com" target="_blank" rel="noopener noreferrer" className="text-[#D70530] font-bold underline">store.coupangeats.com</a> 로그인 → 리뷰 관리 페이지로 이동</li>
                    <li><strong>3.</strong> 북마크바의 "로컬루션-쿠팡리뷰" 클릭</li>
                    <li><strong>4.</strong> 자동 수집 + 저장 알림 확인</li>
                  </ol>
                </div>
              </>
            )}

            <button onClick={() => setStep(2)}
              className="w-full py-3 rounded-xl bg-[#191F28] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#333D4B]">
              다음 단계 <ArrowRight size={14} strokeWidth={2.5} />
            </button>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-4">
              <p className="text-sm font-bold text-[#1E40AF] mb-2 flex items-center gap-1.5">
                <Smartphone size={14} /> 쿠팡이츠 페이지에서 실행
              </p>
              <p className="text-xs text-[#1E40AF] leading-relaxed">
                {mode === 'console'
                  ? '새 탭에서 store.coupangeats.com 로그인 → 리뷰 관리 페이지 → F12 콘솔에 붙여넣기'
                  : '새 탭에서 store.coupangeats.com 로그인 → 리뷰 관리 페이지 → 북마크 클릭'}
              </p>
            </div>
            <a href="https://store.coupangeats.com" target="_blank" rel="noopener noreferrer"
              className="block w-full py-3 rounded-xl bg-[#D70530] text-white text-sm font-bold text-center flex items-center justify-center gap-2 hover:bg-[#A30024]">
              store.coupangeats.com 새 탭으로 열기 <ExternalLink size={14} strokeWidth={2.5} />
            </a>
            <div className="bg-[#F2F4F6] rounded-xl p-3">
              <p className="text-xs font-bold text-[#4E5968] mb-2">자주 묻는 문제</p>
              <ul className="text-[11px] text-[#4E5968] space-y-1.5 leading-relaxed">
                <li>· "store.coupangeats.com 페이지에서 실행하세요" → 새 탭이 쿠팡이츠 페이지인지 확인</li>
                <li>· "매장 정보를 찾을 수 없어요" → 매장 관리 → 리뷰 관리 페이지로 먼저 이동</li>
                <li>· 리뷰 0개 → 리뷰 페이지를 한 번 열어보고 다시 실행</li>
              </ul>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-xl bg-[#F2F4F6] text-[#4E5968] text-sm font-bold hover:bg-[#E5E8EB]">
                이전
              </button>
              <button onClick={() => { setStep(3); onSuccess?.() }}
                className="flex-1 py-3 rounded-xl bg-[#191F28] text-white text-sm font-bold hover:bg-[#333D4B]">
                실행 완료, 다음 →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="space-y-4 text-center py-6">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <Check size={32} className="text-green-600" strokeWidth={3} />
            </div>
            <p className="text-base font-black text-[#191F28]">전송 완료</p>
            <p className="text-xs text-[#4E5968] leading-relaxed">
              쿠팡이츠에서 추출한 리뷰가 로컬루션에 저장되었어요.<br />
              아래 닫기 버튼 누르고 리뷰 목록을 새로고침해주세요.
            </p>
            <button onClick={onClose}
              className="w-full py-3 rounded-xl bg-[#D70530] text-white text-sm font-bold hover:bg-[#A30024]">
              닫기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
