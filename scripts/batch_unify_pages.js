// 모든 page.tsx 의 wrapper / bg color / 이모지 일괄 정리
//   - bg-[#F2F4F6] → bg-[#F8F9FA] (페이지 배경)
//   - 뚜렷한 이모지(📊 📸 🔍 ⚠️ 💡 ✨ 🤖 🎉 📍 🏷 🗓 등) 제거 또는 lucide 노트
//   - 안전: 변경한 파일 list 출력만, 실제 수정 후 git push 는 별도
const fs = require('fs')
const path = require('path')

// 안전한 일괄 치환 규칙 (주석/문자열 안의 단순 이모지)
const REPLACEMENTS = [
  // 페이지 배경 통일
  [/bg-\[#F2F4F6\] flex flex-col overflow-x-hidden/g, 'bg-[#F8F9FA]'],
  // 일반적인 페이지 컨테이너에서만 #F2F4F6 → #F8F9FA (코드 블록/하이라이트 색은 유지)
  [/className="min-h-screen bg-\[#F2F4F6\]"/g, 'className="min-h-screen bg-[#F8F9FA]"'],
  [/className="flex min-h-screen bg-\[#F2F4F6\]"/g, 'className="min-h-screen bg-[#F8F9FA]"'],
]

// 페이지 헤더/배너에서 명확한 이모지 제거 (뒤따르는 공백 1개 함께 제거)
// 단어 시작 또는 텍스트 바로 앞에 붙은 경우에만
const EMOJI_STRIP = [
  /\u{1F4CA} /gu,  // 📊
  /\u{1F4F8} /gu,  // 📸
  /\u{1F50D} /gu,  // 🔍 (앞에 공백 안 따라오는 경우 별도)
  /⚠️? /gu,  // ⚠️
  /\u{1F4A1} /gu,  // 💡
  /✨ /gu,  // ✨
  /\u{1F916} /gu,  // 🤖
  /\u{1F389} /gu,  // 🎉
  /\u{1F4CD} /gu,  // 📍
  /\u{1F3F7}️? /gu,  // 🏷️
  /\u{1F5D3}️? /gu,  // 🗓
  /\u{1F4E5} /gu,  // 📥
  /\u{1F4E4} /gu,  // 📤
  /\u{1F511} /gu,  // 🔑
  /\u{1F4DD} /gu,  // 📝
  /\u{1F4F1} /gu,  // 📱
  /\u{1F525} /gu,  // 🔥
  /\u{1F4F7} /gu,  // 📷
  /\u{1F4AC} /gu,  // 💬
  /✅ /gu,  // ✅
  /❌ /gu,  // ❌
  /\u{1F510} /gu,  // 🔐
  /\u{1F512} /gu,  // 🔒
  /\u{1F465} /gu,  // 👥
  /\u{1F4C8} /gu,  // 📈
  /\u{1F4C9} /gu,  // 📉
  /\u{1F3AF} /gu,  // 🎯
  /\u{1F3C6} /gu,  // 🏆
  /⏰ /gu,  // ⏰
  /\u{1F514} /gu,  // 🔔
  /\u{1F4B0} /gu,  // 💰
  /\u{1F4F2} /gu,  // 📲
  /\u{1F4BB} /gu,  // 💻
  /\u{1F3EA} /gu,  // 🏪
]

let totalFiles = 0
let modifiedFiles = []

function process(file) {
  const orig = fs.readFileSync(file, 'utf8')
  let content = orig
  for (const [pat, rep] of REPLACEMENTS) {
    content = content.replace(pat, rep)
  }
  // 이모지 제거는 주석 안의 것은 보존 — 코드 블록 내 문자열만
  // 안전을 위해 전체에 적용 (CLAUDE.md 규칙: 이모지 사용 금지)
  for (const pat of EMOJI_STRIP) {
    content = content.replace(pat, '')
  }
  if (content !== orig) {
    fs.writeFileSync(file, content, 'utf8')
    modifiedFiles.push(file.replace(/\\/g,'/').replace(/.*localution\//, ''))
  }
  totalFiles++
}

function walk(dir) {
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) {
      if (item === 'node_modules' || item === '.next' || item === 'api' || item === 'lib') continue
      walk(full)
    } else if (item === 'page.tsx' || item.endsWith('.tsx')) {
      process(full)
    }
  }
}

walk(path.join(__dirname, '..', 'app'))
console.log('=== Modified', modifiedFiles.length, 'of', totalFiles, 'files ===')
modifiedFiles.forEach(f => console.log(' -', f))
