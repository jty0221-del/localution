// 60차: account_id 마스킹 노출 (네이버/쿠팡 계정 혼동 진단)
//   · coupang-status API 응답에 account_id_mask 포함
//   · STEP 3 실패 화면에 "현재 등록된 ID + 쿠팡이츠 계정인지 확인" 안내
//   · STEP 2 입력 화면에 "쿠팡이츠는 별도 계정" 경고 박스
//   · 워커 로그에 마스킹된 account_id (다음 디버그)
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
    message: 'feat(coupang): 60차 — account_id 노출로 네이버/쿠팡 계정 혼동 진단',
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
  await pushFile('app/api/platform-accounts/coupang-status/route.ts', 'app/api/platform-accounts/coupang-status/route.ts')
  await pushFile('app/my/platforms/[platform]/connect/page.tsx', 'app/my/platforms/[platform]/connect/page.tsx')
  await pushFile('worker/src/adapters/coupangeats.ts', 'worker/src/adapters/coupangeats.ts')
  console.log('done')
}
main().catch(console.error)
