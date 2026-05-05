// 79차: 대시보드 별점 + 최근 리뷰 복구
//   - 별점: p.rating != null 이면 리뷰 미수집 상태에서도 별표 노출
//   - 최근 리뷰: 실 데이터 없을 때 RECENT_REVIEWS 샘플 데모 복구
const fs = require('fs')
const path = require('path')

const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const token = envContent.match(/GITHUB_TOKEN=([^\r\n]+)/)?.[1]?.trim()
if (!token) { console.error('No GITHUB_TOKEN'); process.exit(1) }

const REPO = 'jty0221-del/localution'

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
  console.log('79차 대시보드 별점/최근리뷰 복구 배포 시작')
  await pushFile(
    'app/dashboard/page.tsx',
    'app/dashboard/page.tsx',
    'fix(dashboard): 79차 — 별점 미수집시도 노출 + 최근리뷰 샘플 데모 복구'
  )
  console.log('완료 — https://localution.vercel.app/dashboard')
}
main().catch(console.error)
