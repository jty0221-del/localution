#!/usr/bin/env node
// scripts/generate-vapid.js — VAPID 키 한 쌍 생성
// 실행: cd C:\Users\pc\Desktop\localution && npm install web-push --no-save && node scripts/generate-vapid.js
//
// 출력된 키를 .env.local 에 추가:
//   VAPID_PUBLIC_KEY=...
//   VAPID_PRIVATE_KEY=...
//   VAPID_SUBJECT=mailto:jty0221@gmail.com
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY=...   (브라우저 노출 — public 만)
//
// 그리고 Vercel Dashboard → Project → Environment Variables 에도 4개 모두 추가
let webpush
try {
  webpush = require('web-push')
} catch {
  console.error('\n❌ web-push 패키지가 설치 안 됐어요. 다음 명령으로 설치 후 재실행:')
  console.error('   npm install web-push --no-save\n')
  process.exit(1)
}

const keys = webpush.generateVAPIDKeys()
console.log('\n=== VAPID 키 생성 완료 ===\n')
console.log('아래 4줄을 .env.local 와 Vercel Environment Variables 에 추가하세요:\n')
console.log('VAPID_PUBLIC_KEY=' + keys.publicKey)
console.log('VAPID_PRIVATE_KEY=' + keys.privateKey)
console.log('VAPID_SUBJECT=mailto:jty0221@gmail.com')
console.log('NEXT_PUBLIC_VAPID_PUBLIC_KEY=' + keys.publicKey)
console.log('\n⚠️  PRIVATE_KEY 는 절대 git/공개 안되게 주의\n')
