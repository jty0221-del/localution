// 60차: 쿠팡 Vercel save-login 패턴 (배민과 동일)
//   · /api/coupang/save-login 라우트
//   · /api/platform-accounts POST 시 자동 시도
//   · 성공 → cookies 저장 → 워커는 그 cookies 사용
//   · 실패 → 기존 워커 Playwright fallback
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
    message: 'feat(coupang): 60차 — Vercel save-login 패턴 (배민과 동일, Vercel raw HTTP + 한국 proxy)',
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
  await pushFile('app/lib/coupang-login.ts', 'app/lib/coupang-login.ts')
  await pushFile('app/api/coupang/save-login/route.ts', 'app/api/coupang/save-login/route.ts')
  await pushFile('app/api/platform-accounts/route.ts', 'app/api/platform-accounts/route.ts')
  console.log('done')
}
main().catch(console.error)
