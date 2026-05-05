// 유튜브 커뮤니티 페이지: 빨간 헤더 + 미연결 시 실행 안내 패널
// brand-colors.ts 에 youtube 그라데이션 추가
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
  console.log('유튜브 커뮤니티 업데이트 배포 시작')
  await pushFile(
    'app/lib/brand-colors.ts',
    'app/lib/brand-colors.ts',
    'feat(brand): youtube 레드 그라데이션 variant 추가'
  )
  await new Promise(r => setTimeout(r, 600))
  await pushFile(
    'app/marketing/youtube-community/page.tsx',
    'app/marketing/youtube-community/page.tsx',
    'feat(youtube-community): 빨간 헤더 + 미연결 시 실행 안내 패널'
  )
  console.log('완료 — https://www.localution.co.kr/marketing/youtube-community')
}
main().catch(console.error)
