const fs = require('fs')
const path = require('path')
const envContent = fs.readFileSync('./.env.local', 'utf8')
const token = envContent.match(/GITHUB_TOKEN=([^\r\n]+)/)?.[1]?.trim()
const REPO = 'jty0221-del/localution'
async function pushFile(repoPath, localPath, message) {
  const content = fs.readFileSync(localPath)
  const b64 = content.toString('base64')
  const shaRes = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + repoPath, {
    headers: { Authorization: 'token ' + token, Accept: 'application/vnd.github.v3+json' }
  })
  let sha = undefined
  if (shaRes.ok) {
    const j = await shaRes.json()
    sha = j.sha
  }
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
pushFile('app/review-admin/baemin/page.tsx', './app/review-admin/baemin/page.tsx', 'feat(baemin): 14637452 매장 설정 버튼 추가')
