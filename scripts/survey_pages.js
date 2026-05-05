// 모든 page.tsx 의 이모지 + 래퍼 패턴 점검
const fs = require('fs')
const path = require('path')

function scan(dir, results) {
  const items = fs.readdirSync(dir)
  for (const item of items) {
    const full = path.join(dir, item)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) {
      if (item === 'node_modules' || item === '.next' || item === 'api' || item === 'lib' || item === 'components') continue
      scan(full, results)
    } else if (item === 'page.tsx') {
      const content = fs.readFileSync(full, 'utf8')
      const emojiRegex = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2700}-\u{27BF}\u{2190}-\u{21FF}]/u
      const lines = content.split('\n')
      const hits = []
      lines.forEach((l, i) => {
        if (emojiRegex.test(l) && !l.trim().startsWith('//') && !l.trim().startsWith('*')) {
          hits.push({ line: i+1, text: l.trim().slice(0,120) })
        }
      })
      const wrapperOk = content.includes('bg-[#F8F9FA]') && content.includes('md:ml-[220px]')
      const oldPatterns = []
      if (content.includes('bg-[#F2F4F6]')) oldPatterns.push('bg-#F2F4F6')
      if (content.match(/className="flex min-h-screen/)) oldPatterns.push('flex-min-h-screen-outer')
      if (content.includes('max-w-[1400px]')) oldPatterns.push('max-w-1400')
      if (content.includes('max-w-[1200px]')) oldPatterns.push('max-w-1200')
      if (content.match(/pt-1[46] md:pt-0/)) oldPatterns.push('pt-1[46]-mobile')
      const hasMaxW6xl = content.includes('max-w-6xl')
      const relPath = full.replace(__dirname + path.sep, '').replace(/\\/g,'/')
      if (hits.length > 0 || oldPatterns.length > 0) {
        results.push({
          path: relPath,
          emojiCount: hits.length,
          firstEmojis: hits.slice(0,5),
          wrapperOk, oldPatterns, hasMaxW6xl,
        })
      }
    }
  }
}

const results = []
scan(path.join(__dirname, '..', 'app'), results)
console.log(JSON.stringify(results, null, 2))
