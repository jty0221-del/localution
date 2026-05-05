// 68차 fix: ON CONFLICT DO UPDATE 모드 복원 + has_reply 우선 dedupe
//   · ignoreDuplicates:true → false (기존 row 도 has_reply/reply_content 갱신)
//   · dedupe 시 답글 있는 버전 우선 선택 (EXPOSE/UNEXPOSE 둘 다 잡혔을 때)
//   · 사장님이 직접 단 답글이 새 fetch 로 has_reply=true 로 갱신됨
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
    message: 'fix(reviews): 68차 — ignoreDuplicates:false 복원 + has_reply 우선 dedupe',
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
  await pushFile('worker/src/lib/reviews.ts', 'worker/src/lib/reviews.ts')
  console.log('done')
}
main().catch(console.error)
