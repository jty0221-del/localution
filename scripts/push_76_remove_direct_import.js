// 76차: '직접 가져오기' 기능 제거
//   · 75차까지 자동 연결 + 답글 자동 발행 완성 (12초 작동 확인)
//   · 일반 사장님에게 F12/Network/JSON paste 너무 기술적 → 혼란
//   · 장사닥터처럼 "ID/PW 입력 → 끝" 깔끔하게 유지
//   변경:
//     - 직접 가져오기 버튼 제거
//     - CoupangReviewBookmarkletDialog 사용 제거
//     - cpeBookmarklet 관련 상태/함수 제거
//   (Bookmarklet/paste API endpoint 자체는 보존 — 디버그용)
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
    message: 'fix(ui): 76차 — 쿠팡 직접 가져오기 기능 제거 (자동 연결로 대체)',
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
  await pushFile('app/review-admin/components/PlatformReviewAdmin.tsx', 'app/review-admin/components/PlatformReviewAdmin.tsx')
  console.log('done')
}
main().catch(console.error)
