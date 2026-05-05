// 73차 fix: auto-publish 의 has_reply 차단 제거
//   · DB has_reply=true 면 무조건 409 차단 → 큐 enqueue 안 됨
//   · 사장님이 클릭한 review 가 이 검사에 막혀서 post_reply 큐 도달 안 함
//   · 수정: reply_status='submitted' 만 차단 (우리가 이미 발행 완료한 것)
//   · has_reply 검사는 워커 pre-check (66차/69차) 가 정확히 처리
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
    message: 'fix(auto-publish): 73차 — has_reply 차단 제거 (워커 pre-check 위임)',
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
  await pushFile('app/api/review-reply/auto-publish/route.ts', 'app/api/review-reply/auto-publish/route.ts')
  console.log('done')
}
main().catch(console.error)
