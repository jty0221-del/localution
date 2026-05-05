// 64차: 쿠팡 'replies' 배열 매칭 + UI 메시지 플랫폼별 동적 처리
//   · 워커: r.replies = [{ comment, ... }] 인식
//   · UI: 토스트 "네이버에 등록 시도 중" → "${config.label}에 등록 시도 중"
//   · UI: fallback 메시지 "네이버에서 직접 확인" → "${config.label}에서 직접 확인"
const fs = require('fs')
const path = require('path')

const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const token = envContent.match(/GITHUB_TOKEN=([^\r\n]+)/)?.[1]?.trim()
if (!token) { console.error('No GITHUB_TOKEN'); process.exit(1) }

const REPO = 'jty0221-del/localution'

async function pushFile(repoPath, localPath) {
  const content = fs.readFileSync(path.join(__dirname, '..', localPath))
  const b64 = content.toString('base64')
  const shaRes = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + repoPath, {
    headers: { Authorization: 'token ' + token, Accept: 'application/vnd.github.v3+json' }
  })
  const shaJson = await shaRes.json()
  const sha = shaJson.sha
  const body = {
    message: 'fix(coupang+ui): 64차 — replies 배열 매칭 + 토스트 메시지 플랫폼별 동적',
    content: b64
  }
  if (sha) body.sha = sha
  const res = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + repoPath, {
    method: 'PUT',
    headers: { Authorization: 'token ' + token, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const json = await res.json()
  if (res.ok) console.log('OK', repoPath, json.commit?.sha?.slice(0, 8))
  else console.error('ERR', repoPath, res.status, json.message)
}

async function main() {
  await pushFile('worker/src/adapters/coupangeats.ts', 'worker/src/adapters/coupangeats.ts')
  await pushFile('app/review-admin/components/PlatformReviewAdmin.tsx', 'app/review-admin/components/PlatformReviewAdmin.tsx')
  console.log('done')
}
main().catch(console.error)
