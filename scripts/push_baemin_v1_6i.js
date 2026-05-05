// 배민 v1.6i: 14666661 default 제외 + 14637452 진짜 매장 + set-shop endpoint
const fs = require('fs')
const path = require('path')

const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const token = envContent.match(/GITHUB_TOKEN=([^\r\n]+)/)?.[1]?.trim()
if (!token) { console.error('No GITHUB_TOKEN'); process.exit(1) }

const REPO = 'jty0221-del/localution'

const FILES = [
  ['worker/src/adapters/baemin.ts',     'fix(baemin): v1.6i — 14666661 default landing 제외 + /v4/shops/search 추출 + diagnostic dump'],
  ['worker/Dockerfile',                 'chore(worker): CACHE_BUST 20260505T1620 (v1.6i)'],
  ['app/api/baemin/set-shop/route.ts',  'feat(baemin): set-shop endpoint — platform_store_id 직접 설정 + 자동 재수집'],
  ['app/review-admin/baemin/page.tsx',  'feat(baemin): 모달에 14637452 진짜 매장 설정 버튼 추가'],
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
  console.log('done — v1.6i deployed')
}
main().catch(console.error)
