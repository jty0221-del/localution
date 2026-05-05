// 배민 v1.6: Worker fresh login + save-login fail-open + 다중 login URL + 자동 cookie 저장
const fs = require('fs')
const path = require('path')

const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const token = envContent.match(/GITHUB_TOKEN=([^\r\n]+)/)?.[1]?.trim()
if (!token) { console.error('No GITHUB_TOKEN'); process.exit(1) }

const REPO = 'jty0221-del/localution'

const FILES = [
  ['worker/src/adapters/baemin.ts',          'fix(baemin): v1.6 Worker — 다중 login URL + ERR_ABORTED 견고성 + fresh 쿠키 자동 저장 + extra_data PW fallback'],
  ['app/api/baemin/save-login/route.ts',     'fix(baemin): v1.6 — RSA 실패해도 ID/PW 저장 + Worker 위임 (Akamai 우회)'],
  ['app/api/baemin/auto-login/route.ts',     'fix(baemin): v1.6 — RSA 실패 시 Worker fallback (Playwright 로그인 위임)'],
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
  console.log('done — BAEMIN v1.6 (Vercel + Railway) deployed')
}
main().catch(console.error)
