// 배민 v1.6b: 'unknown' shopId sentinel 제거 + reviewContents 추출 + auto-save platform_store_id
const fs = require('fs')
const path = require('path')

const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const token = envContent.match(/GITHUB_TOKEN=([^\r\n]+)/)?.[1]?.trim()
if (!token) { console.error('No GITHUB_TOKEN'); process.exit(1) }

const REPO = 'jty0221-del/localution'

const FILES = [
  ['worker/src/adapters/baemin.ts',          'fix(baemin): v1.6b — unknown shopId sentinel 제거 + auto platform_store_id 저장 + reviewContents 추출'],
  ['app/api/baemin/auto-login/route.ts',     'fix(baemin): v1.6b — Worker enqueue 시 unknown 문자열 대신 empty (Worker 가 자동 감지)'],
  ['app/api/baemin/save-login/route.ts',     'fix(baemin): v1.6b — Worker enqueue 시 unknown 문자열 대신 empty (자동 감지)'],
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
  console.log('done — BAEMIN v1.6b deployed')
}
main().catch(console.error)
