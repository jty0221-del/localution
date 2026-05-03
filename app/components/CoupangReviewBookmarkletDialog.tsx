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
  '    // 1. storeId 확보 — 다단계 fallback',
  '    var storeId = null;',
  '    var storeName = "";',
  '    // 1-A) whoami 호출',
  '    var who = await fetch("/api/v1/merchant/whoami", { credentials: "include" }).then(function(r){ return r.ok ? r.json() : null; }).catch(function(){ return null; });',
  '    console.log("로컬루션: whoami =", who);',
  '    if (who && who.data) {',
  '      storeId = who.data.responsibleStoreId || who.data.storeId || who.data.defaultStoreId || who.data.lastSelectedStoreId || null;',
  '      if (Array.isArray(who.data.stores) && who.data.stores.length > 0 && !storeId) {',
  '        storeId = who.data.stores[0].storeId || who.data.stores[0].id || null;',
  '        storeName = who.data.stores[0].name || who.data.stores[0].storeName || "";',
  '      }',
  '    }',
  '    // 1-B) URL 에서 추출 (홈 페이지일 때)',
  '    if (!storeId) {',
  '      var urlMatch = location.pathname.match(/\\/(\\d{4,12})(?:\\/|$)/);',
  '      if (urlMatch) storeId = urlMatch[1];',
  '    }',
  '    // 1-C) 매장 목록 API 호출 (4개 candidate endpoint)',
  '    if (!storeId) {',
  '      var endpoints = ["/api/v1/merchant/stores", "/api/v1/merchant/owner/stores", "/api/v1/merchant/store-list", "/api/v1/merchant/management/stores"];',
  '      for (var ei = 0; ei < endpoints.length; ei++) {',
  '        try {',
  '          var sl = await fetch(endpoints[ei], { credentials: "include" }).then(function(r){ return r.ok ? r.json() : null; });',
  '          if (sl && sl.data) {',
  '            var arr = Array.isArray(sl.data) ? sl.data : (Array.isArray(sl.data.content) ? sl.data.content : (Array.isArray(sl.data.stores) ? sl.data.stores : []));',
  '            if (arr && arr.length > 0) {',
  '              storeId = arr[0].storeId || arr[0].id || null;',
  '              storeName = arr[0].name || arr[0].storeName || "";',
  '              if (storeId) { console.log("로컬루션: storeId from " + endpoints[ei] + " = " + storeId); break; }',
  '            }',
  '          }',
  '        } catch(_) {}',
  '      }',
  '    }',
  '    if (!storeId) {',
  '      alert("매장 정보를 찾을 수 없어요.\\n\\n해결 방법:\\n1) 매장 관리 → 매장 홈 페이지로 한 번 이동\\n2) URL이 /merchant/management/home/숫자 형식인지 확인\\n3) 다시 리뷰 페이지로 와서 북마클릿 실행\\n\\n(F12 콘솔 로그를 사장님께 보내주시면 빠르게 해결 가능)");',
  '      return;',
  '    }',
  '    console.log("로컬루션: storeId=" + storeId + ", storeName=" + storeName);',
  '    // 2. 매장 이름 (없으면 fallback)',
  '    if (!storeName) {',
  '      try {',
  '        var s = await fetch("/api/v1/merchant/stores/" + storeId, { credentials: "include" }).then(function(r){ return r.ok ? r.json() : null; });',
  '        if (s && s.data) storeName = s.data.name || s.data.storeName || "";',
  '      } catch(_) {}',
  '    }',
  '    // 3. 리뷰 페이지네이션 — 다중 endpoint + 헤더 강화 (Akamai 세션 검증 통과)',
  '    // 53차 검증된 헤더 패턴 적용: x-request-meta + x-requested-with',
  '    function makeMeta(){',
  '      var meta = {',
  '        o: "https://store.coupangeats.com",',
  '        ua: navigator.userAgent,',
  '        r: location.href,',
  '        t: Date.now(),',
  '        sr: String(screen.width) + "x" + String(screen.height),',
  '        l: navigator.language || "ko-KR"',
  '      };',
  '      return btoa(unescape(encodeURIComponent(JSON.stringify(meta))));',
  '    }',
  '    function fetchHeaders(){',
  '      return {',
  '        "Accept": "application/json",',
  '        "Accept-Language": "ko-KR",',
  '        "x-request-meta": makeMeta(),',
  '        "x-requested-with": "XMLHttpRequest"',
  '      };',
  '    }',
  '    // 1년치 = 365일 전 (사장님 요구: 오늘 리뷰 없으면 1년치 긁기)',
  '    var yearAgo = new Date();',
  '    yearAgo.setDate(yearAgo.getDate() - 365);',
  '    var startDate = yearAgo.toISOString().slice(0, 10);',
  '    var today = new Date().toISOString().slice(0, 10);',
  '    // 정확한 endpoint (cURL 분석 결과): POST /api/v1/merchant/stores/{storeId}/reviews',
  '    var REVIEWS_URL = "/api/v1/merchant/stores/" + storeId + "/reviews";',
  '    function buildBody(p){',
  '      return JSON.stringify({',
  '        storeId: parseInt(storeId, 10),',
  '        page: p,',
  '        size: 30,',
  '        statusType: "ALL",',
  '        startDate: startDate,',
  '        endDate: today',
  '      });',
  '    }',
  '    var allReviews = [];',
  '    var page = 0;',
  '    var maxPages = 50;  // 50페이지 = 1500개까지 (1년치 모두)',
  '    var firstError = null;',
  '    var apiSucceeded = false;',
  '    while (page < maxPages) {',
  '      var json = null;',
  '      var lastStatus = 0;',
  '      var lastBody = "";',
  '      try {',
  '        var res = await fetch(REVIEWS_URL, {',
  '          method: "POST",',
  '          credentials: "include",',
  '          headers: Object.assign({ "Content-Type": "application/json;charset=UTF-8" }, fetchHeaders()),',
  '          body: buildBody(page)',
  '        });',
  '        lastStatus = res.status;',
  '        if (res.ok) {',
  '          json = await res.json();',
  '          if (!apiSucceeded) {',
  '            console.log("로컬루션: POST " + REVIEWS_URL + " 성공");',
  '            apiSucceeded = true;',
  '          }',
  '        } else {',
  '          try { lastBody = (await res.text()).slice(0, 200); } catch(_) {}',
  '        }',
  '      } catch(e) { lastStatus = 0; lastBody = String(e); }',
  '      if (!json) {',
  '        if (page === 0) {',
  '          // ── 마지막 폴백: React fiber 통해 DOM에서 리뷰 추출 ──',
  '          console.log("로컬루션: API 모두 실패 → React fiber DOM 추출 시도");',
  '          var domReviews = [];',
  '          var seen = {};',
  '          var allEls = document.querySelectorAll("div, article, li, section");',
  '          for (var ei = 0; ei < allEls.length; ei++) {',
  '            var el = allEls[ei];',
  '            var keys = Object.keys(el);',
  '            var fiberKey = null;',
  '            var propsKey = null;',
  '            for (var ki = 0; ki < keys.length; ki++) {',
  '              if (keys[ki].indexOf("__reactFiber$") === 0) fiberKey = keys[ki];',
  '              if (keys[ki].indexOf("__reactProps$") === 0) propsKey = keys[ki];',
  '            }',
  '            var data = null;',
  '            try {',
  '              if (propsKey && el[propsKey]) {',
  '                var p = el[propsKey];',
  '                data = p.review || p.reviewItem || p.item || p.data || (p.children && p.children.props ? p.children.props.review : null);',
  '              }',
  '              if (!data && fiberKey && el[fiberKey] && el[fiberKey].memoizedProps) {',
  '                var mp = el[fiberKey].memoizedProps;',
  '                data = mp.review || mp.reviewItem || mp.item || mp.data;',
  '              }',
  '            } catch(_) {}',
  '            if (data && (data.orderReviewId || data.reviewId || data.id) && (data.rating !== undefined || data.score !== undefined || data.content !== undefined)) {',
  '              var dId = String(data.orderReviewId || data.reviewId || data.id);',
  '              if (!seen[dId]) {',
  '                seen[dId] = true;',
  '                domReviews.push(data);',
  '              }',
  '            }',
  '          }',
  '          console.log("로컬루션: DOM 추출 " + domReviews.length + "개");',
  '          if (domReviews.length > 0) {',
  '            for (var di = 0; di < domReviews.length; di++) {',
  '              var dr = domReviews[di];',
  '              var dmenus = Array.isArray(dr.menus) ? dr.menus.map(function(m){ return typeof m === "string" ? m : (m.name || m.menuName || ""); }) : [];',
  '              var dphotos = [];',
  '              var dimgs = dr.reviewImages || dr.photos || dr.images || [];',
  '              if (Array.isArray(dimgs)) for (var pii = 0; pii < dimgs.length; pii++) { var pp = dimgs[pii]; dphotos.push(typeof pp === "string" ? pp : (pp.url || pp.imageUrl || pp.image || "")); }',
  '              allReviews.push({',
  '                id: String(dr.orderReviewId || dr.reviewId || dr.id),',
  '                rating: dr.rating || dr.score || dr.starRating || 0,',
  '                content: dr.content || dr.text || dr.body || dr.reviewContent || "",',
  '                author: dr.userName || dr.authorName || dr.nickname || dr.customerName || "",',
  '                createdAt: dr.createdAt || dr.orderedAt || dr.reviewedAt || null,',
  '                menus: dmenus.filter(Boolean),',
  '                photos: dphotos.filter(Boolean),',
  '                reply: (dr.replyContent || (dr.reply && (dr.reply.content || dr.reply.text))) ? { content: dr.replyContent || dr.reply.content || dr.reply.text } : null',
  '              });',
  '            }',
  '            console.log("로컬루션: DOM에서 " + allReviews.length + "개 추출 성공 — 페이지 스크롤로 더 많이 로드 가능");',
  '            break;  // DOM 추출은 페이지네이션 X',
  '          }',
  '          firstError = "HTTP " + lastStatus + " — " + lastBody;',
  '          alert("리뷰를 가져올 수 없어요.\\n\\n해결 방법:\\n1) F12 → Network 탭\\n2) 검색창에 \\"reviews\\" 입력\\n3) 페이지 새로고침\\n4) 첫번째 reviews 행 우클릭 → Copy as cURL\\n5) 사장님께 그 결과 전달\\n\\n또는: 페이지를 끝까지 스크롤한 후 다시 실행하면 DOM에서 추출 시도합니다.\\n\\n에러: " + firstError);',
  '          return;',
  '        }',
  '        break;',
  '      }',
  '      var list = (json && json.data && json.data.content) ? json.data.content : (Array.isArray(json && json.data) ? json.data : (json && json.data && json.data.reviews) ? json.data.reviews : []);',
  '      if (!list || list.length === 0) break;',
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
  '        var imgs = r.reviewImages || r.photos || r.images || [];',
  '        if (Array.isArray(imgs)) {',
  '          for (var pi = 0; pi < imgs.length; pi++) {',
  '            var p = imgs[pi];',
  '            photos.push(typeof p === "string" ? p : (p.url || p.imageUrl || p.image || ""));',
  '          }',
  '        }',
  '        allReviews.push({',
  '          id: String(r.orderReviewId || r.reviewId || r.id || ""),',
  '          rating: r.rating || r.score || r.starRating || 0,',
  '          content: r.content || r.text || r.body || r.reviewContent || "",',
  '          author: r.userName || r.authorName || r.nickname || r.customerName || r.reviewer || "",',
  '          createdAt: r.createdAt || r.orderedAt || r.reviewedAt || r.regDate || null,',
  '          menus: menus.filter(Boolean),',
  '          photos: photos.filter(Boolean),',
  '          reply: (r.replyContent || (r.reply && (r.reply.content || r.reply.text))) ? { content: r.replyContent || r.reply.content || r.reply.text } : null',
  '        });',
  '      }',
  '      console.log("로컬루션: page " + page + " — " + list.length + "개 / 누적 " + allReviews.length + "개");',
  '      if (list.length < 30) break;  // 마지막 페이지',
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
