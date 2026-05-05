// 71차: DAYS_BACK 180 → 60 + 큐 상태 진단 endpoint
//   · fetch 시간 7분 → 2-3분 (post_reply 처리 보장)
//   · /api/admin/queue-status 호출로 사장님 화면에서 큐 상태 확인 가능
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
    message: 'fix(coupang): 71차 — DAYS_BACK 180→60 + 큐 진단 endpoint',
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
  await pushFile('app/api/admin/queue-status/route.ts', 'app/api/admin/queue-status/route.ts')
  console.log('done')
}
main().catch(console.error)
