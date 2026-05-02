'use client'

// ============================================================
// 북마클릿 가이드 + 토큰 발급 UI
//   · 사장님 브라우저에서 직접 추출 → 100% 성공률
//   · 프록시/CAPTCHA/봇 차단 우회
// ============================================================
import { useState } from 'react'
import { Bookmark, Copy, Check, X, ExternalLink, ArrowRight, Smartphone } from 'lucide-react'

const APP_ORIGIN = 'https://www.localution.co.kr'

// 북마클릿 JS 코드 — 사장님이 네이버 페이지에서 클릭 시 실행됨
// 콘솔에 붙여넣기용 raw JS — template literal 안에 정규식 사용 금지 (CLAUDE.md 규칙)
// 정규식 대신 string methods + new RegExp() 사용
function buildRawJs(token: string): string {
  // JS 코드를 배열로 분리 후 join — template literal 정규식 회피
  const lines = [
    "(async function(){",
    "  try {",
    "    var TOKEN = " + JSON.stringify(token) + ";",
    "    var APP = " + JSON.stringify(APP_ORIGIN) + ";",
    "    var items = [];",
    "    function digitsOnly(s){ return String(s).replace(new RegExp('[^0-9]','g'), ''); }",
    "    function hasWonPrice(t){",
    "      var idx = t.indexOf('원');",
    "      if (idx < 1) return false;",
    "      var i = idx - 1;",
    "      while (i >= 0 && (t[i] === ' ' || t[i] === ',')) i--;",
    "      var hasDigit = false, count = 0;",
    "      while (i >= 0 && (t[i] >= '0' && t[i] <= '9' || t[i] === ',')) { if (t[i] !== ',') hasDigit = true; count++; i--; if (count > 12) break; }",
    "      return hasDigit && count >= 3;",
    "    }",
    "    function extractPrice(t){",
    "      var idx = t.indexOf('원');",
    "      if (idx < 1) return 0;",
    "      var end = idx;",
    "      while (end > 0 && t[end-1] === ' ') end--;",
    "      var start = end;",
    "      while (start > 0 && ((t[start-1] >= '0' && t[start-1] <= '9') || t[start-1] === ',')) start--;",
    "      var num = t.slice(start, end).replace(new RegExp(',','g'), '');",
    "      var n = parseInt(num, 10);",
    "      return isNaN(n) ? 0 : n;",
    "    }",
    "    var html = document.documentElement.innerHTML;",
    "    var s = html.indexOf('__APOLLO_STATE__');",
    "    if (s !== -1) {",
    "      try {",
    "        var braceStart = html.indexOf('{', s);",
    "        var depth = 0, end = -1, inStr = false, esc = false;",
    "        for (var i = braceStart; i < html.length; i++) {",
    "          var c = html[i];",
    "          if (esc) { esc = false; continue; }",
    "          if (c === String.fromCharCode(92)) { esc = true; continue; }",
    "          if (c === '\"') { inStr = !inStr; continue; }",
    "          if (inStr) continue;",
    "          if (c === '{') depth++;",
    "          else if (c === '}') { depth--; if (depth === 0) { end = i + 1; break; } }",
    "        }",
    "        if (end > braceStart) {",
    "          var state = JSON.parse(html.slice(braceStart, end));",
    "          for (var k in state) {",
    "            var m = state[k];",
    "            if (m && m.name && (m.price !== undefined || m.priceText)) {",
    "              items.push({",
    "                name_ko: String(m.name).slice(0, 80),",
    "                price: parseInt(digitsOnly(m.price || '0'), 10) || 0,",
    "                image_url: m.image || (m.images && m.images[0] && (m.images[0].url || m.images[0])) || null,",
    "                desc_ko: m.description ? String(m.description).slice(0, 200) : null,",
    "                is_signature: !!(m.recommend || m.featured),",
    "              });",
    "            }",
    "          }",
    "        }",
    "      } catch(e){ console.warn('apollo parse error:', e); }",
    "    }",
    "    if (items.length === 0) {",
    "      var allEls = Array.from(document.querySelectorAll('div, li, article, section'));",
    "      var candidates = allEls.filter(function(n){",
    "        var t = n.textContent || '';",
    "        if (t.length > 800) return false;",
    "        return hasWonPrice(t);",
    "      });",
    "      var smallest = candidates.filter(function(n){",
    "        return !candidates.some(function(o){ return o !== n && o.contains(n); });",
    "      });",
    "      var seen = {};",
    "      smallest.forEach(function(node){",
    "        var nameEl = node.querySelector('[class*=\"name\"], [class*=\"Name\"], [class*=\"title\"], [class*=\"Title\"], strong, h3, h4, b');",
    "        var t = node.textContent || '';",
    "        var priceVal = extractPrice(t);",
    "        var imgEl = node.querySelector('img');",
    "        var descEl = node.querySelector('[class*=\"desc\"], [class*=\"Desc\"], p');",
    "        var name = (nameEl && nameEl.textContent) ? nameEl.textContent.trim() : null;",
    "        if (!name) {",
    "          var lines = t.split(String.fromCharCode(10)).map(function(l){ return l.trim(); }).filter(Boolean);",
    "          name = lines[0] && lines[0].slice(0, 60);",
    "        }",
    "        if (name && priceVal > 0 && !seen[name]) {",
    "          seen[name] = true;",
    "          items.push({",
    "            name_ko: name.slice(0, 80),",
    "            price: priceVal,",
    "            image_url: imgEl ? imgEl.src : null,",
    "            desc_ko: descEl ? (descEl.textContent || '').trim().slice(0, 200) : null,",
    "          });",
    "        }",
    "      });",
    "    }",
    "    console.log('extracted', items.length, 'items', items);",
    "    if (items.length === 0) {",
    "      alert('메뉴를 찾지 못했어요. 메뉴 페이지에서 실행하셨나요?');",
    "      return;",
    "    }",
    "    var newline = String.fromCharCode(10);",
    "    var ok = confirm(items.length + '개 메뉴를 찾았어요.' + newline + '로컬루션으로 전송할까요?');",
    "    if (!ok) return;",
    "    var res = await fetch(APP + '/api/menu/import-bookmarklet/submit', {",
    "      method: 'POST',",
    "      mode: 'cors',",
    "      headers: { 'Content-Type': 'application/json' },",
    "      body: JSON.stringify({ token: TOKEN, items: items })",
    "    });",
    "    var json = await res.json();",
    "    if (json.ok) alert('성공! ' + json.count + '개 메뉴 전송 완료.' + newline + '로컬루션 페이지로 돌아가세요.');",
    "    else alert('전송 실패: ' + (json.message || json.error));",
    "  } catch(e) {",
    "    console.error(e);",
    "    alert('오류: ' + e.message);",
    "  }",
    "})();",
  ]
  return lines.join('\n')
}

function buildBookmarkletJs(token: string): string {
  // raw JS 를 한 줄로 압축 + javascript: 프리픽스
  const code = buildRawJs(token).split('\n').join(' ')
  return 'javascript:' + encodeURIComponent(code)
}


export default function MenuBookmarkletDialog({
  open,
  onClose,
  importId,
  token,
  pollSuccess,
}: {
  open: boolean
  onClose: () => void
  importId: string | null
  token: string | null
  pollSuccess: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [copiedRaw, setCopiedRaw] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [mode, setMode] = useState<'bookmark' | 'console'>('console')  // 콘솔 모드 기본 (더 안정적)

  if (!open || !token) return null

  const bookmarkletUrl = buildBookmarkletJs(token)
  const rawJs = buildRawJs(token)

  function handleCopyRaw() {
    navigator.clipboard.writeText(rawJs)
    setCopiedRaw(true)
    setTimeout(() => setCopiedRaw(false), 2500)
  }

  function handleCopy() {
    navigator.clipboard.writeText(bookmarkletUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-5 max-w-2xl w-full max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3182F6] to-[#7C3AED] flex items-center justify-center shadow-sm">
              <Bookmark size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-black text-[#191F28]">북마클릿으로 메뉴 가져오기</h3>
              <p className="text-[10px] text-[#8B95A1]">사장님 브라우저에서 직접 추출 - 거의 100% 성공</p>
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
                step >= n ? 'bg-[#3182F6] text-white' : 'bg-[#F2F4F6] text-[#8B95A1]'
              }`}>{n}</div>
              {n < 3 && <div className={`flex-1 h-1 rounded-full ${step > n ? 'bg-[#3182F6]' : 'bg-[#F2F4F6]'}`} />}
            </div>
          ))}
        </div>

        {/* STEP 1: 콘솔 또는 북마크 모드 */}
        {step === 1 && (
          <div className="space-y-4">
            {/* 모드 선택 */}
            <div className="flex gap-2 p-1 bg-[#F2F4F6] rounded-xl">
              <button
                onClick={() => setMode('console')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-colors ${
                  mode === 'console' ? 'bg-white text-[#3182F6] shadow-sm' : 'text-[#8B95A1]'
                }`}>
                콘솔 모드 (추천)
              </button>
              <button
                onClick={() => setMode('bookmark')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-colors ${
                  mode === 'bookmark' ? 'bg-white text-[#3182F6] shadow-sm' : 'text-[#8B95A1]'
                }`}>
                북마크 모드
              </button>
            </div>

            {/* CONSOLE 모드 — 더 안정적 */}
            {mode === 'console' && (
              <div>
                <p className="text-sm font-bold text-[#191F28] mb-1">1단계 - 코드 복사 (콘솔 모드)</p>
                <p className="text-xs text-[#8B95A1] leading-relaxed mb-3">
                  네이버 페이지가 북마클릿을 차단할 수 있어요. <strong>콘솔 모드는 100% 작동</strong>.<br/>
                  코드 복사 → 네이버 메뉴 페이지 F12 → Console 탭에 붙여넣기.
                </p>

                <div className="mb-3 p-3 rounded-xl bg-[#FEF3C7] border border-[#FCD34D]">
                  <p className="text-[12px] font-black text-[#92400E] mb-1.5">콘솔 모드 사용법</p>
                  <ol className="text-[11px] text-[#92400E] space-y-1 list-decimal list-inside leading-relaxed">
                    <li>아래 <strong>"코드 복사"</strong> 버튼 클릭</li>
                    <li>네이버 메뉴 페이지로 이동 (smartplace 또는 m.place)</li>
                    <li>키보드 <strong className="bg-white px-1.5 py-0.5 rounded border border-[#92400E]/30 font-mono">F12</strong> 누름 (개발자 도구 열림)</li>
                    <li>상단 탭 중 <strong>"Console"</strong> 또는 <strong>"콘솔"</strong> 클릭</li>
                    <li>경고 메시지 (붙여넣기 위험) 뜨면 <strong>"붙여넣기 허용"</strong> 입력 후 엔터</li>
                    <li>맨 아래 입력 칸에 <strong className="bg-white px-1.5 py-0.5 rounded border border-[#92400E]/30 font-mono">Ctrl + V</strong> 붙여넣기</li>
                    <li><strong className="bg-white px-1.5 py-0.5 rounded border border-[#92400E]/30 font-mono">Enter</strong> 누름</li>
                    <li>"N개 메뉴 찾았어요" 알림 → 확인 → 자동 전송</li>
                  </ol>
                </div>

                <button
                  onClick={handleCopyRaw}
                  className={`w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 ${
                    copiedRaw ? 'bg-green-500' : 'bg-gradient-to-br from-[#3182F6] to-[#7C3AED]'
                  }`}>
                  {copiedRaw ? (
                    <><Check size={14} strokeWidth={3} /> 복사됨!</>
                  ) : (
                    <><Copy size={14} strokeWidth={2.5} /> 콘솔 코드 복사</>
                  )}
                </button>

                <details className="mt-3">
                  <summary className="text-xs text-[#8B95A1] cursor-pointer">개발자 도구 (F12) 가 뭐예요?</summary>
                  <div className="mt-2 p-3 bg-[#F2F4F6] rounded-lg text-[11px] text-[#4E5968] leading-relaxed">
                    크롬/엣지/웨일/사파리 등 모든 브라우저에 내장된 개발자용 도구.<br/>
                    F12 키 누르면 화면 오른쪽이나 아래에 패널이 열림.<br/>
                    "Console" 탭이 그 안에 있는데, 거기에 JS 코드를 붙여넣어 실행할 수 있어요.<br/>
                    Mac 사파리는 먼저 환경설정 → 고급 → "메뉴 막대에 개발자용 메뉴 보기" 켜야 해요.
                  </div>
                </details>

                <button
                  onClick={() => setStep(2)}
                  className="w-full mt-3 py-3 rounded-xl bg-[#191F28] text-white font-bold text-sm flex items-center justify-center gap-2">
                  코드 복사했어요 <ArrowRight size={14} strokeWidth={2.5} />
                </button>
              </div>
            )}

            {/* BOOKMARK 모드 — 안되면 콘솔 모드 */}
            {mode === 'bookmark' && (
              <div>
                <p className="text-sm font-bold text-[#191F28] mb-1">1단계 - 북마크 등록</p>
                <p className="text-xs text-[#8B95A1] leading-relaxed mb-3">
                  네이버가 보안상 북마클릿을 차단하면 작동 안 할 수 있어요.<br/>
                  안되면 <strong>콘솔 모드</strong> 로 전환하세요.
                </p>
                <div className="mb-3 p-3 rounded-xl bg-[#FEF3C7] border border-[#FCD34D]">
                  <p className="text-[12px] font-black text-[#92400E] mb-1.5">먼저 북마크바를 켜세요</p>
                  <p className="text-[11px] text-[#92400E] leading-relaxed">
                    키보드 Ctrl + Shift + B (Mac: ⌘ + Shift + B) 눌러서 북마크바 표시
                  </p>
                </div>
                <div className="bg-[#F8FAFB] rounded-xl p-4 border border-[#E5E8EB]">
                  <a
                    href={bookmarkletUrl}
                    onClick={(e) => e.preventDefault()}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-br from-[#3182F6] to-[#7C3AED] text-white font-bold text-sm shadow-md cursor-grab"
                    draggable>
                    <Bookmark size={14} strokeWidth={2.5} />
                    로컬루션 메뉴 가져오기
                  </a>
                  <p className="text-[11px] text-[#4E5968] mt-2">↑ 이 버튼을 북마크바로 드래그</p>
                </div>
                <button
                  onClick={handleCopy}
                  className="mt-3 w-full py-2 rounded-lg bg-[#F2F4F6] text-[#4E5968] text-xs font-bold flex items-center justify-center gap-1">
                  {copied ? <><Check size={11} strokeWidth={3} /> 복사됨</> : <><Copy size={11} strokeWidth={2.5} /> 또는 코드 복사 (직접 북마크 추가)</>}
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="w-full mt-3 py-3 rounded-xl bg-[#191F28] text-white font-bold text-sm flex items-center justify-center gap-2">
                  북마크 등록 완료 <ArrowRight size={14} strokeWidth={2.5} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: 네이버 페이지 열고 실행 안내 */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-bold text-[#191F28] mb-1">2단계 - 네이버 메뉴 페이지에서 실행</p>
              <p className="text-xs text-[#8B95A1] leading-relaxed mb-3">
                {mode === 'console'
                  ? '네이버 메뉴 페이지에서 F12 → Console → 복사한 코드 붙여넣고 Enter.'
                  : '새 탭에서 네이버 메뉴 페이지를 연 후, 방금 등록한 북마크를 한 번 클릭하세요.'}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <a
                  href="https://new.smartplace.naver.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 rounded-xl bg-[#F0FDF4] border-2 border-[#BBF7D0] hover:bg-[#DCFCE7] transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <ExternalLink size={12} className="text-[#059669]" strokeWidth={2.5} />
                    <span className="text-xs font-black text-[#065F46]">사장님 view (smartplace)</span>
                  </div>
                  <p className="text-[10px] text-[#065F46] leading-relaxed">
                    smartplace 로그인 → 매장 → 메뉴 가격 페이지에서 클릭
                  </p>
                </a>
                <a
                  href="https://m.place.naver.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 rounded-xl bg-[#EFF6FF] border-2 border-[#BFDBFE] hover:bg-[#DBEAFE] transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <Smartphone size={12} className="text-[#3182F6]" strokeWidth={2.5} />
                    <span className="text-xs font-black text-[#1E40AF]">손님 view (m.place)</span>
                  </div>
                  <p className="text-[10px] text-[#1E40AF] leading-relaxed">
                    매장 검색 - 메뉴 탭 - 전체보기 - 북마크 클릭
                  </p>
                </a>
              </div>

              <div className="mt-3 p-3 rounded-xl bg-[#FEF3C7] border border-[#FCD34D]">
                <p className="text-[11px] text-[#92400E] leading-relaxed">
                  {mode === 'console' ? (
                    <>
                      <strong>F12 → Console → Ctrl+V → Enter</strong> 하면 자동으로:<br/>
                      1. 페이지에서 메뉴 추출<br/>
                      2. "N개 메뉴를 찾았어요. 전송할까요?" 확인 창<br/>
                      3. 확인 시 로컬루션으로 전송
                    </>
                  ) : (
                    <>
                      <strong>북마크 클릭</strong>하면 자동으로:<br/>
                      1. 페이지에서 메뉴 추출<br/>
                      2. "N개 메뉴를 찾았어요. 전송할까요?" 확인 창<br/>
                      3. 확인 시 로컬루션으로 전송
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setStep(1)}
                className="py-3 rounded-xl bg-[#F2F4F6] text-[#4E5968] font-bold text-sm">
                이전
              </button>
              <button
                onClick={() => { setStep(3); pollSuccess() }}
                className="py-3 rounded-xl bg-[#191F28] text-white font-bold text-sm flex items-center justify-center gap-2">
                {mode === 'console' ? '실행했어요' : '북마크 클릭했어요'} <ArrowRight size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: 데이터 도착 대기 */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#3182F6] to-[#7C3AED] flex items-center justify-center mx-auto mb-3 shadow-md">
                <div className="animate-spin w-6 h-6 border-3 border-white border-t-transparent rounded-full" />
              </div>
              <p className="text-sm font-bold text-[#191F28]">메뉴 데이터 수신 대기 중...</p>
              <p className="text-xs text-[#8B95A1] mt-1">
                북마크 클릭 후 "전송 완료" 알림이 뜨면<br/>이 페이지로 돌아오세요.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#F8FAFB] border border-[#E5E8EB]">
              <p className="text-[11px] text-[#4E5968] leading-relaxed">
                <strong>30분 안에 클릭하지 않으면</strong> 토큰이 만료됩니다.<br/>
                만료되면 이 창을 다시 열어 새로 시작하세요.
              </p>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-3 rounded-xl bg-[#F2F4F6] text-[#4E5968] font-bold text-sm">
              아직 안 했어요 - 이전으로
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
