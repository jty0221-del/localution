// Test bookmarklet syntax
const fs = require('fs')
const src = fs.readFileSync('C:/Users/pc/Desktop/localution/app/components/MenuBookmarkletDialog.tsx', 'utf8')

// Extract the array source between RAW_JS_TEMPLATE = [ ... ].join('\n')
const startMark = 'RAW_JS_TEMPLATE = ['
const endMark = "].join('\\n')"
const startIdx = src.indexOf(startMark)
const endIdx = src.indexOf(endMark, startIdx)
const arrSrc = src.slice(startIdx + 'RAW_JS_TEMPLATE = '.length, endIdx + 1)

const APP_ORIGIN = 'https://www.localution.co.kr'
const arr = eval(arrSrc)
const code = arr.join('\n').replace(/__TOKEN__/g, 'abc123')

console.log('Total length:', code.length)
console.log('Lines:', code.split('\n').length)

// Print first 800 chars to see
console.log('=== First 800 chars ===')
console.log(code.slice(0, 800))
console.log('=== End preview ===')

try {
  new Function(code)
  console.log('SYNTAX OK')
} catch (e) {
  console.log('SYNTAX ERROR:', e.message)
}
