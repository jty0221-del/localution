const fs = require('fs'), path = require('path')
const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const token = envContent.match(/GITHUB_TOKEN=([^\r\n]+)/)?.[1]?.trim()
if (!token) { console.error('No GITHUB_TOKEN'); process.exit(1) }
const REPO = 'jty0221-del/localution'

async function pushFile(repoPath, localPath) {
  const fullLocal = path.join(__dirname, '..', localPath)
  const b64 = fs.readFileSync(fullLocal).toString('base64')
  const shaRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${repoPath}`, {
    headers: { Authorization: 'token ' + token, Accept: 'application/vnd.github.v3+json' }
  })
  const sha = (await shaRes.json()).sha
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${repoPath}`, {
    method: 'PUT',
    headers: { Authorization: 'token ' + token, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'feat: threads page black header with logo', content: b64, ...(sha ? { sha } : {}) })
  })
  const json = await res.json()
  console.log(res.ok ? 'OK' : 'FAIL', repoPath, res.ok ? '' : json.message)
}

;(async () => {
  await pushFile('app/marketing/threads/page.tsx', 'app/marketing/threads/page.tsx')
  console.log('\n배포 완료. 1-2분 후 확인하세요.')
})()
