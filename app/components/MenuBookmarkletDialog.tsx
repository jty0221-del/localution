'use client'

// ============================================================
// 북마클릿 가이드 + 토큰 발급 UI
// · 사장님 브라우저에서 직접 추출 (100% 성공률)
// · 프록시/CAPTCHA/봇 차단 우회
// ============================================================
import { useState } from 'react'
import { Bookmark, Copy, Check, X, ExternalLink, ArrowRight, Smartphone } from 'lucide-react'

const APP_ORIGIN = 'https://www.localution.co.kr'

// 단순 JS 템플릿 (template literal regex 금지 규칙 준수)
// __TOKEN__ 자리는 실제 토큰으로 치환
const RAW_JS_TEMPLATE = [
 '(async function(){',
 ' try {',
 ' var T = "__TOKEN__";',
 ' var items = [];',
 ' var seen = {};',
 ' var nodes = document.querySelectorAll("li, div, article, section");',
 ' for (var n = 0; n < nodes.length; n++) {',
 ' var el = nodes[n];',
 ' var txt = (el.innerText || "").trim();',
 ' if (txt.length > 800 || txt.length < 3) continue;',
 ' var wonIdx = txt.indexOf("\\uC6D0");',
 ' if (wonIdx < 1) continue;',
 ' var hasDig = false;',
 ' for (var i = wonIdx - 1; i >= 0; i--) {',
 ' var c = txt[i];',
 ' if (c >= "0" && c <= "9") { hasDig = true; break; }',
 ' if (c !== " " && c !== ",") break;',
 ' }',
 ' if (!hasDig) continue;',
 ' var skipParent = false;',
 ' var children = el.querySelectorAll("li, div, article, section");',
 ' for (var j = 0; j < children.length; j++) {',
 ' if ((children[j].innerText || "").indexOf("\\uC6D0") >= 0) { skipParent = true; break; }',
 ' }',
 ' if (skipParent) continue;',
 ' var lines = txt.split("\\n").map(function(l){return l.trim()}).filter(Boolean);',
 ' var name = "";',
 ' for (var k = 0; k < lines.length; k++) {',
 ' if (lines[k].indexOf("\\uC6D0") < 0 && lines[k].length >= 2 && lines[k].length <= 80) {',
 ' name = lines[k]; break;',
 ' }',
 ' }',
 ' if (!name || seen[name]) continue;',
 ' seen[name] = true;',
 ' var priceStr = "";',
 ' for (var m = wonIdx - 1; m >= 0; m--) {',
 ' var ch = txt[m];',
 ' if ((ch >= "0" && ch <= "9") || ch === ",") priceStr = ch + priceStr;',
 ' else if (priceStr.length > 0) break;',
 ' }',
 ' var price = parseInt(priceStr.split(",").join(""), 10) || 0;',
 ' if (price < 100) continue;',
 ' var img = el.querySelector("img");',
 ' // 설명 추출: 메뉴명 다음 줄 + 가격 줄 아닌 텍스트',
 ' var desc = "";',
 ' var nameSeen = false;',
 ' for (var dl = 0; dl < lines.length; dl++) {',
 ' var ln = lines[dl];',
 ' if (!nameSeen && ln === name) { nameSeen = true; continue; }',
 ' if (nameSeen && ln !== name && ln.indexOf("\\uC6D0") < 0 && ln.length >= 5 && ln.length <= 200) {',
 ' desc = ln;',
 ' break;',
 ' }',
 ' }',
 ' // 또는 desc 클래스 가진 요소에서 추출',
 ' if (!desc) {',
 ' var descEl = el.querySelector("[class*=\\"desc\\"], [class*=\\"Desc\\"], [class*=\\"description\\"], [class*=\\"Description\\"]");',
 ' if (descEl) desc = (descEl.textContent || "").trim().slice(0, 200);',
 ' }',
 ' items.push({ name_ko: name, price: price, image_url: img ? img.src : null, desc_ko: desc || null });',
 ' }',
 ' console.log("로컬루션: 추출 결과", items);',
 ' if (items.length === 0) {',
 ' alert("메뉴를 찾지 못했어요.\\n\\n네이버 메뉴 페이지에서 실행하셨는지 확인해주세요.\\n(URL 에 menu=price 또는 #edit_price 포함)");',
 ' return;',
 ' }',
 ' var msg = items.length + "개 메뉴를 찾았어요.\\n\\n[확인] = 자동 동기화 (새 메뉴/변경된 가격만 반영, 추천)\\n[취소] = 미리보기 (로컬루션에서 직접 확인)";',
 ' var autoSync = confirm(msg);',
 ' var res = await fetch("' + APP_ORIGIN + '/api/menu/import-bookmarklet/submit", {',
 ' method: "POST",',
 ' mode: "cors",',
 ' headers: { "Content-Type": "application/json" },',
 ' body: JSON.stringify({ token: T, items: items, mode: autoSync ? "auto-sync" : "preview" })',
 ' });',
 ' var json = await res.json();',
 ' if (json.ok) {',
 ' if (json.mode === "auto-sync") {',
 ' alert("자동 동기화 완료\\n\\n" + json.added + "개 새 메뉴 추가\\n" + json.updated + "개 가격/이미지 변경\\n" + json.skipped + "개 동일 (건너뜀)\\n\\n로컬루션 페이지에 즉시 반영됩니다.");',
 ' } else {',
 ' alert("미리보기 전송 완료\\n" + json.count + "개 메뉴 - 로컬루션 페이지에서 확인하세요.");',
 ' }',
 ' } else alert("전송 실패: " + (json.message || json.error || "unknown"));',
 ' } catch(e) {',
 ' console.error("로컬루션 북마클릿 오류:", e);',
 ' alert("오류 발생: " + e.message);',
 ' }',
 '})();',
].join('\n')

function buildRawJs(token: string): string {
 return RAW_JS_TEMPLATE.split('__TOKEN__').join(token)
}

function buildBookmarkletJs(token: string): string {
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
 <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3182F6] to-[#7C3AED] flex items-center justify-center shadow-sm">
 <Bookmark size={16} className="text-white" strokeWidth={2.5} />
 </div>
 <div>
 <h3 className="font-black text-[#191F28]">북마클릿으로 메뉴 가져오기</h3>
 <p className="text-[10px] text-[#8B95A1]">사장님 브라우저에서 직접 추출</p>
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

 {/* STEP 1 */}
 {step === 1 && (
 <div className="space-y-4">
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

 {mode === 'console' && (
 <div>
 <p className="text-sm font-bold text-[#191F28] mb-1">1단계 - 코드 복사 (콘솔 모드)</p>
 <p className="text-xs text-[#8B95A1] leading-relaxed mb-3">
 네이버 페이지가 북마클릿을 차단할 수 있어 콘솔 모드 추천. 100% 작동.
 </p>
 <div className="mb-3 p-3 rounded-xl bg-[#FEF3C7] border border-[#FCD34D]">
 <p className="text-[12px] font-black text-[#92400E] mb-1.5">사용법</p>
 <ol className="text-[11px] text-[#92400E] space-y-1 list-decimal list-inside leading-relaxed">
 <li>아래 "코드 복사" 클릭</li>
 <li>네이버 메뉴 페이지로 이동 (URL 에 menu=price 포함)</li>
 <li>F12 누름 - 개발자 도구 열림</li>
 <li>"Console" 또는 "콘솔" 탭 클릭</li>
 <li>경고 뜨면 "붙여넣기 허용" 입력 후 엔터</li>
 <li>맨 아래 입력칸 클릭 - Ctrl+V 붙여넣기</li>
 <li>Enter 누름</li>
 <li>"N개 메뉴 찾았어요" 알림 - 확인 - 자동 전송</li>
 </ol>
 </div>
 <button
 onClick={handleCopyRaw}
 className={`w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 ${
 copiedRaw ? 'bg-green-500' : 'bg-gradient-to-br from-[#3182F6] to-[#7C3AED]'
 }`}>
 {copiedRaw ? <><Check size={14} strokeWidth={3} /> 복사됨!</> : <><Copy size={14} strokeWidth={2.5} /> 콘솔 코드 복사</>}
 </button>
 <button
 onClick={() => setStep(2)}
 className="w-full mt-3 py-3 rounded-xl bg-[#191F28] text-white font-bold text-sm flex items-center justify-center gap-2">
 코드 복사했어요 <ArrowRight size={14} strokeWidth={2.5} />
 </button>
 </div>
 )}

 {mode === 'bookmark' && (
 <div>
 <p className="text-sm font-bold text-[#191F28] mb-1">1단계 - 북마크 등록</p>
 <p className="text-xs text-[#8B95A1] leading-relaxed mb-3">
 Ctrl+Shift+B 로 북마크바 켜고 아래 버튼 드래그.
 </p>
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
 onClick={handleCopyBmk}
 className="mt-3 w-full py-2 rounded-lg bg-[#F2F4F6] text-[#4E5968] text-xs font-bold flex items-center justify-center gap-1">
 {copiedBmk ? <><Check size={11} strokeWidth={3} /> 복사됨</> : <><Copy size={11} strokeWidth={2.5} /> 북마크 URL 복사 (직접 추가용)</>}
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

 {/* STEP 2 */}
 {step === 2 && (
 <div className="space-y-4">
 <div>
 <p className="text-sm font-bold text-[#191F28] mb-1">2단계 - 네이버 메뉴 페이지에서 실행</p>
 <p className="text-xs text-[#8B95A1] leading-relaxed mb-3">
 {mode === 'console'
 ? '네이버 메뉴 페이지에서 F12 - Console - Ctrl+V - Enter'
 : '네이버 메뉴 페이지에서 등록한 북마크 클릭'}
 </p>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 <a
 href="https://new.smartplace.naver.com/"
 target="_blank"
 rel="noopener noreferrer"
 className="block p-4 rounded-xl bg-[#F0FDF4] border-2 border-[#BBF7D0] hover:bg-[#DCFCE7]">
 <div className="flex items-center gap-2 mb-1">
 <ExternalLink size={12} className="text-[#059669]" strokeWidth={2.5} />
 <span className="text-xs font-black text-[#065F46]">사장님 view</span>
 </div>
 <p className="text-[10px] text-[#065F46] leading-relaxed">smartplace 메뉴 가격 페이지 (URL 에 #edit_price 포함)</p>
 </a>
 <a
 href="https://m.place.naver.com/"
 target="_blank"
 rel="noopener noreferrer"
 className="block p-4 rounded-xl bg-[#EFF6FF] border-2 border-[#BFDBFE] hover:bg-[#DBEAFE]">
 <div className="flex items-center gap-2 mb-1">
 <Smartphone size={12} className="text-[#3182F6]" strokeWidth={2.5} />
 <span className="text-xs font-black text-[#1E40AF]">손님 view</span>
 </div>
 <p className="text-[10px] text-[#1E40AF] leading-relaxed">m.place 매장 메뉴 페이지 (전체보기)</p>
 </a>
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
 {mode === 'console' ? '실행했어요' : '클릭했어요'} <ArrowRight size={14} strokeWidth={2.5} />
 </button>
 </div>
 </div>
 )}

 {/* STEP 3 */}
 {step === 3 && (
 <div className="space-y-4">
 <div className="text-center py-4">
 <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#3182F6] to-[#7C3AED] flex items-center justify-center mx-auto mb-3 shadow-md">
 <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
 </div>
 <p className="text-sm font-bold text-[#191F28]">메뉴 데이터 수신 대기 중...</p>
 <p className="text-xs text-[#8B95A1] mt-1">전송 완료 알림 뜨면 이 페이지로 돌아오세요.</p>
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
