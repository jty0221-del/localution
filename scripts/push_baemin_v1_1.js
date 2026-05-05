// 배민 v1.1: 30일 fetch + 이미지 화이트리스트 + Worker XHR shopId 필터
const fs = require('fs')
const path = require('path')

const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const token = envContent.match(/GITHUB_TOKEN=([^\r\n]+)/)?.[1]?.trim()
if (!token) { console.error('No GITHUB_TOKEN'); process.exit(1) }

const REPO = 'jty0221-del/localution'

const FILES = [
  ['app/api/baemin/collect-reviews/route.ts', 'fix(baemin): v1.1 — 30일 fetch + cutoff + 이미지 CDN 화이트리스트 (다른 업체 leak 차단)'],
  ['app/api/baemin/save-login/route.ts',      'fix(baemin): v1.1 — save-login 자동 fetch days_back 14 → 30'],
  ['worker/src/adapters/baemin.ts',           'fix(baemin): v1.1 — Worker XHR shopId 필터 + 이미지 화이트리스트 + 30일 cutoff'],
]

async function pushFile(repoPath, localPath, message) {
  const content = fs.readFileSync(path.join(__dirname, '..', localPath))
  const b64 = content.toString('base64')
  const shaRes = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + repoPath, {
    headers: { Authorization: 'token ' + token, Accept: 'application/vnd.github.v3+json' }
  })
  const shaJson = await shaRes.json()
  const sha = shaJson.sha
  const body = { message, content: b64 }
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
  for (const [repoPath, msg] of FILES) {
    await pushFile(repoPath, repoPath, msg)
    await new Promise(r => setTimeout(r, 800))
  }
  console.log('done — BAEMIN v1.1 deployed')
}
main().catch(console.error)
