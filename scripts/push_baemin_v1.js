// 배민 v1 통합 배포 — 5개 파일 일괄 push
const fs = require('fs')
const path = require('path')

const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const token = envContent.match(/GITHUB_TOKEN=([^\r\n]+)/)?.[1]?.trim()
if (!token) { console.error('No GITHUB_TOKEN'); process.exit(1) }

const REPO = 'jty0221-del/localution'

const FILES = [
  ['app/api/baemin/collect-reviews/route.ts', 'feat(baemin): v1 페이지네이션 + 14일 + has_reply dedupe + 401 retry'],
  ['app/api/baemin/post-reply/route.ts',      'feat(baemin): v1 응답 body 검증 + has_reply pre-check + 401 retry'],
  ['app/api/baemin/save-login/route.ts',      'feat(baemin): v1 save-login 후 자동 fetch enqueue'],
  ['worker/src/adapters/baemin.ts',           'feat(baemin): v1 post_reply APIRequestContext 전환 (74차 패턴)'],
  ['worker/BAEMIN_SYSTEM_v1.md',              'docs(baemin): BAEMIN_SYSTEM_v1.md — 6 fix 종합 가이드 (DO NOT BREAK)'],
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
  console.log('done — BAEMIN v1 deployed')
}
main().catch(console.error)
