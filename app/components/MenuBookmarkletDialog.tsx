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
// 콘솔에 붙여넣기용 raw JS (javascript: 프리픽스 없음)
function buildRawJs(token: string): string {
  return `(async function(){
  try {
    var TOKEN = '${token}';
    var APP = '${APP_ORIGIN}';
    var items = [];
    var html = document.documentElement.innerHTML;
    var s = html.indexOf('__APOLLO_STATE__');
    if (s !== -1) {
      try {
        var braceStart = html.indexOf('{', s);
        var depth = 0, end = -1, inStr = false, esc = false;
        for (var i = braceStart; i < html.length; i++) {
          var c = html[i];
          if (esc) { esc = false; continue; }
          if (c === '\\\\') { esc = true; continue; }
          if (c === '"') { inStr = !inStr; continue; }
          if (inStr) continue;
          if (c === '{') depth++;
          else if (c === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
        }
        if (end > braceStart) {
          var state = JSON.parse(html.slice(braceStart, end));
          for (var k in state) {
            var m = state[k];
            if (m && m.name && (m.price !== undefined || m.priceText)) {
              items.push({
                name_ko: String(m.name).slice(0, 80),
                price: parseInt(String(m.price || '0').replace(/[^0-9]/g, ''), 10) || 0,
                image_url: m.image || (m.images && m.images[0] && (m.images[0].url || m.images[0])) || null,
                desc_ko: m.description ? String(m.description).slice(0, 200) : null,
                is_signature: !!(m.recommend || m.featured),
              });
            }
          }
        }
      } catch(e){ console.warn('apollo parse error:', e); }
    }
    if (items.length === 0) {
      var allEls = Array.from(document.querySelectorAll('div, li, article, section'));
      var candidates = allEls.filter(function(n){
        var t = n.textContent || '';
        if (t.length > 800) return false;
        return /\\d{3,7}\\s?원/.test(t);
      });
      var smallest = candidates.filter(function(n){
        return !candidates.some(function(o){ return o !== n && o.contains(n); });
      });
      var seen = {};
      smallest.forEach(function(node){
        var nameEl = node.querySelector('[class*="name"], [class*="Name"], [class*="title"], [class*="Title"], strong, h3, h4, b');
        var priceMatch = (node.textContent || '').match(/(\\d{1,3}(?:,\\d{3})*|\\d+)\\s?원/);
        var imgEl = node.querySelector('img');
        var descEl = node.querySelector('[class*="desc"], [class*="Desc"], p');
        var name = (nameEl && nameEl.textContent) ? nameEl.textContent.trim() : null;
        if (!name) {
          var lines = (node.textContent || '').split('\\n').map(function(l){ return l.trim(); }).filter(Boolean);
          name = lines[0] && lines[0].slice(0, 60);
        }
        if (name && priceMatch && !seen[name]) {
          seen[name] = true;
          items.push({
            name_ko: name.slice(0, 80),
            price: parseInt(priceMatch[1].replace(/,/g, ''), 10) || 0,
            image_url: imgEl ? imgEl.src : null,
            desc_ko: descEl ? (descEl.textContent || '').trim().slice(0, 200) : null,
          });
        }
      });
    }
    console.log('extracted', items.length, 'items', items);
    if (items.length === 0) {
      alert('메뉴를 찾지 못했어요. 메뉴 페이지에서 실행하셨나요?');
      return;
    }
    var ok = confirm(items.length + '개 메뉴를 찾았어요.\\n로컬루션으로 전송할까요?');
    if (!ok) return;
    var res = await fetch(APP + '/api/menu/import-bookmarklet/submit', {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: TOKEN, items: items })
    });
    var json = await res.json();
    if (json.ok) alert('성공! ' + json.count + '개 메뉴 전송 완료.\\n로컬루션 페이지로 돌아가세요.');
    else alert('전송 실패: ' + (json.message || json.error));
  } catch(e) {
    console.error(e);
    alert('오류: ' + e.message);
  }
})();`
}

function buildBookmarkletJs(token: string): string {
  // 한 줄 압축 (북마크 URL 호환)
  const code = `
(async function(){
  try {
    var TOKEN = '${token}';
    var APP = '${APP_ORIGIN}';
    var items = [];

    // 1) Apollo State 시도 (m.place.naver.com)
    var html = document.documentElement.innerHTML;
    var apolloMatch = html.match(/__APOLLO_STATE__\\s*=\\s*(\\{[\\s\\S]*?\\})\\s*<\\/script/);
    if (apolloMatch) {
      try {
        var depth = 0, end = -1, inStr = false, esc = false;
        var s = html.indexOf('__APOLLO_STATE__');
        var braceStart = html.indexOf('{', s);
        for (var i = braceStart; i < html.length; i++) {
          var c = html[i];
          if (esc) { esc = false; continue; }
          if (c === '\\\\') { esc = true; continue; }
          if (c === '"') { inStr = !inStr; continue; }
          if (inStr) continue;
          if (c === '{') depth++;
          else if (c === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
        }
        if (end > braceStart) {
          var state = JSON.parse(html.slice(braceStart, end));
          for (var k in state) {
            var m = state[k];
            if (m && m.name && (m.price !== undefined || m.priceText)) {
              items.push({
                name_ko: String(m.name).slice(0, 80),
                price: parseInt(String(m.price || '0').replace(/[^0-9]/g, ''), 10) || 0,
                image_url: m.image || (m.images && m.images[0] && (m.images[0].url || m.images[0])) || null,
                desc_ko: m.description ? String(m.description).slice(0, 200) : null,
                is_signature: !!(m.recommend || m.featured),
              });
            }
          }
        }
      } catch(e){}
    }

    // 2) DOM 폴백 — 가격 패턴 가진 박스 추출
    if (items.length === 0) {
      var allEls = Array.from(document.querySelectorAll('div, li, article, section'));
      var candidates = allEls.filter(function(n){
        var t = n.textContent || '';
        if (t.length > 800) return false;
        return /\\d{3,7}\\s?원/.test(t) || /\\d{3,7}\\s?KRW/i.test(t);
      });
      var smallest = candidates.filter(function(n){
        return !candidates.some(function(o){ return o !== n && o.contains(n); });
      });
      var seen = {};
      smallest.forEach(function(node){
        var nameEl = node.querySelector('[class*="name"], [class*="Name"], [class*="title"], [class*="Title"], strong, h3, h4, b');
        var priceMatch = (node.textContent || '').match(/(\\d{1,3}(?:,\\d{3})*|\\d+)\\s?원/);
        var imgEl = node.querySelector('img');
        var descEl = node.querySelector('[class*="desc"], [class*="Desc"], p');
        var name = (nameEl && nameEl.textContent) ? nameEl.textContent.trim() : null;
        if (!name) {
          var lines = (node.textContent || '').split('\\n').map(function(l){ return l.trim(); }).filter(Boolean);
          name = lines[0] && lines[0].slice(0, 60);
        }
        if (name && priceMatch && !seen[name]) {
          seen[name] = true;
          items.push({
            name_ko: name.slice(0, 80),
            price: parseInt(priceMatch[1].replace(/,/g, ''), 10) || 0,
            image_url: imgEl ? imgEl.src : null,
            desc_ko: descEl ? (descEl.textContent || '').trim().slice(0, 200) : null,
          });
        }
      });
    }

    if (items.length === 0) {
      alert('메뉴를 찾지 못했어요.\\n\\n네이버 메뉴 페이지에서 클릭하셨는지 확인하고 다시 시도해주세요.\\n(예: smartplace.naver.com 메뉴 가격 페이지, 또는 m.place.naver.com 메뉴 페이지)');
      return;
    }

    var ok = confirm(items.length + '개 메뉴를 찾았어요.\\n로컬루션으로 전송할까요?');
    if (!ok) return;

    var res = await fetch(APP + '/api/menu/import-bookmarklet/submit', {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: TOKEN, items: items })
    });
    var json = await res.json();
    if (json.ok) {
      alert('성공! ' + json.count + '개 메뉴 전송 완료.\\n로컬루션 페이지로 돌아가세요.');
    } else {
      alert('전송 실패: ' + (json.message || json.error));
    }
  } catch(e) {
    alert('오류: ' + e.message);
  }
})();
`.replace(/\n\s+/g, ' ').trim()

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

              {/* 북마크바 켜기 안내 */}
              <div className="mb-3 p-3 rounded-xl bg-[#FEF3C7] border border-[#FCD34D]">
                <p className="text-[12px] font-black text-[#92400E] mb-1.5">먼저 북마크바를 켜세요</p>
                <p className="text-[11px] text-[#92400E] mb-2 leading-relaxed">
                  키보드 <strong className="bg-white px-1.5 py-0.5 rounded border border-[#92400E]/30 font-mono">Ctrl + Shift + B</strong> (Mac: <strong className="bg-white px-1.5 py-0.5 rounded border border-[#92400E]/30 font-mono">⌘ + Shift + B</strong>)
                </p>
                <p className="text-[10px] text-[#92400E]/80 leading-relaxed">
                  → 화면 위쪽에 즐겨찾기 막대가 나타나면 OK<br/>
                  지원: 크롬, 엣지, 웨일, 사파리, 파이어폭스 등 모든 브라우저
                </p>
              </div>

              {/* 시각적 안내 — 위치 표시 */}
              <div className="mb-3 p-3 rounded-xl bg-[#F2F4F6] border border-[#E5E8EB]">
                <p className="text-[11px] font-bold text-[#4E5968] mb-2">브라우저 화면 구조</p>
                <div className="bg-white rounded-lg border border-[#E5E8EB] p-2 font-mono text-[10px] leading-relaxed text-[#4E5968]">
                  <div className="px-2 py-1 border-b border-[#E5E8EB] bg-[#F8FAFB]">
                    {'<- ->  ⟳   '}<span className="bg-[#EFF6FF] px-1.5 py-0.5 rounded">https://...주소창...</span>
                  </div>
                  <div className="px-2 py-1 border-b border-[#3182F6] bg-[#EFF6FF] text-[#1E40AF] font-bold">
                    📁 ⭐네이버 ⭐유튜브 <span className="text-[#DC2626]">← 이게 "북마크바"</span>
                  </div>
                  <div className="px-2 py-3 text-center text-[#C9CDD2]">웹사이트 본문</div>
                </div>
              </div>

              <p className="text-[12px] font-bold text-[#191F28] mb-2">드래그 방법</p>
              <div className="bg-[#F8FAFB] rounded-xl p-4 border border-[#E5E8EB]">
                <a
                  href={bookmarkletUrl}
                  onClick={(e) => e.preventDefault()}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-br from-[#3182F6] to-[#7C3AED] text-white font-bold text-sm shadow-md hover:shadow-lg transition-shadow cursor-grab active:cursor-grabbing"
                  draggable>
                  <Bookmark size={14} strokeWidth={2.5} />
                  로컬루션 메뉴 가져오기
                </a>
                <ol className="text-[11px] text-[#4E5968] mt-3 space-y-1 leading-relaxed list-decimal list-inside">
                  <li>위 파란 버튼에 마우스 커서 올리기</li>
                  <li>마우스 <strong>왼쪽 버튼 누른 채로</strong> 화면 위쪽 북마크바로 끌어 올림</li>
                  <li>북마크바 영역에서 마우스 버튼 <strong>놓기</strong></li>
                  <li>→ 북마크바에 "로컬루션 메뉴 가져오기" 추가됨</li>
                </ol>
              </div>

              <details className="mt-3">
                <summary className="text-xs text-[#3182F6] cursor-pointer font-bold">
                  드래그가 안되면 - 직접 추가하는 방법 (클릭해서 펼치기)
                </summary>
                <div className="mt-2 p-3 bg-[#F2F4F6] rounded-lg text-[11px] text-[#4E5968] leading-relaxed space-y-1.5">
                  <ol className="list-decimal list-inside space-y-1">
                    <li>아래 <strong>"코드 복사"</strong> 버튼 클릭</li>
                    <li>키보드 <strong className="bg-white px-1.5 py-0.5 rounded border font-mono">Ctrl + D</strong> (Mac: <strong className="bg-white px-1.5 py-0.5 rounded border font-mono">⌘ + D</strong>) 누르기 → 북마크 추가 창</li>
                    <li>이름 칸: <code className="bg-white px-1.5 py-0.5 rounded">로컬루션 메뉴 가져오기</code></li>
                    <li>URL 칸 클릭 → 기존 내용 모두 지우기 → <strong className="bg-white px-1.5 py-0.5 rounded border font-mono">Ctrl + V</strong> 로 붙여넣기</li>
                    <li>폴더 선택: <strong>"북마크바"</strong> 또는 <strong>"즐겨찾기 모음"</strong></li>
                    <li>저장 버튼</li>
                  </ol>
                  <button
                    onClick={handleCopy}
                    className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#191F28] text-white text-[11px] font-bold">
                    {copied ? <><Check size={11} strokeWidth={3} /> 복사됨!</> : <><Copy size={11} strokeWidth={2.5} /> 코드 복사</>}
                  </button>
                </div>
              </details>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-3 rounded-xl bg-[#191F28] text-white font-bold text-sm flex items-center justify-center gap-2">
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
