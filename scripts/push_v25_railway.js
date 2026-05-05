// push v25 worker + railway.Dockerfile (Railway auto-deploy)
const fs = require('fs')
const path = require('path')

const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const token = envContent.match(/GITHUB_TOKEN=([^\r\n]+)/)?.[1]?.trim()
if (!token) { console.error('No GITHUB_TOKEN'); process.exit(1) }
console.log('token:', token.slice(0, 10) + '...')

const REPO = 'jty0221-del/localution'

async function pushFile(repoPath, localPath) {
  const content = fs.readFileSync(path.join(__dirname, '..', localPath))
  const b64 = content.toString('base64')

  const shaRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${repoPath}`, {
    headers: { Authorization: 'token ' + token, Accept: 'application/vnd.github.v3+json' }
  })
  const shaJson = await shaRes.json()
  const sha = shaJson.sha

  const body = JSON.stringify({
    message: 'fix: naver v25 deviceAdd 등록-priority + Railway 빌드 마커 갱신',
    content: b64,
    sha
  })
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${repoPath}`, {
    method: 'PUT',
    headers: {
      Authorization: 'token ' + token,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body
  })
  const json = await res.json()
  if (res.ok) {
    console.log('OK', repoPath, json.commit?.sha?.slice(0, 8))
  } else {
    console.error('ERR', repoPath, res.status, json.message)
  }
}

async function main() {
  await pushFile('worker/src/adapters/naver.ts', 'worker/src/adapters/naver.ts')
  await pushFile('worker/src/index.ts', 'worker/src/index.ts')
  await pushFile('worker/Dockerfile', 'worker/Dockerfile')
  await pushFile('railway.Dockerfile', 'railway.Dockerfile')
  console.log('done')
}
main().catch(console.error)
