// 56차: Coupang Eats worker stealth 강화
//   · stealth helper (Canvas/WebGL/Audio fingerprint 마스킹)
//   · human-behavior helper (Akamai warming + humanType + mouseJiggle)
//   · form login 강화 + storeId auto-discovery
//   · Web Push 트리거 (Vercel internal API 경유)
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
    message: 'feat(coupang): 56차 stealth 강화 — Akamai warming + humanType + storeId auto-discovery + Web Push',
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
  // 워커 (Railway 자동 재배포)
  await pushFile('worker/src/lib/stealth.ts', 'worker/src/lib/stealth.ts')
  await pushFile('worker/src/lib/human-behavior.ts', 'worker/src/lib/human-behavior.ts')
  await pushFile('worker/src/lib/notify.ts', 'worker/src/lib/notify.ts')
  await pushFile('worker/src/adapters/coupangeats.ts', 'worker/src/adapters/coupangeats.ts')
  // Vercel
  await pushFile('app/api/internal/notify-new-reviews/route.ts', 'app/api/internal/notify-new-reviews/route.ts')
  await pushFile('app/api/platform-accounts/coupang-status/route.ts', 'app/api/platform-accounts/coupang-status/route.ts')
  console.log('done')
}
main().catch(console.error)
