// 배민 v1.2: 파서 강화 + 가비지 검증 + 진단/정리 endpoint + UI 버튼
const fs = require('fs')
const path = require('path')

const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const token = envContent.match(/GITHUB_TOKEN=([^\r\n]+)/)?.[1]?.trim()
if (!token) { console.error('No GITHUB_TOKEN'); process.exit(1) }

const REPO = 'jty0221-del/localution'

const FILES = [
  ['app/api/baemin/collect-reviews/route.ts',  'fix(baemin): v1.2 — 파서 강화 (필드 후보 확장, 가비지 검증, null 날짜)'],
  ['app/api/baemin/diagnose/route.ts',         'feat(baemin): v1.2 — API 진단 endpoint (응답 구조/필드명 자동 분석)'],
  ['app/api/baemin/cleanup-reviews/route.ts',  'feat(baemin): v1.2 — 잘못 수집된 데이터 정리 endpoint'],
  ['worker/src/adapters/baemin.ts',            'fix(baemin): v1.2 — Worker 파서 강화 (필드 후보 확장, ID prefix 통일, raw_snapshot)'],
  ['app/review-admin/baemin/page.tsx',         'feat(baemin): v1.2 — 모달에 데이터 초기화·API 진단 버튼 + 정상시에도 칩 노출'],
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
  console.log('done — BAEMIN v1.2 deployed')
}
main().catch(console.error)
