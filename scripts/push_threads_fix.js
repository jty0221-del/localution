// push_threads_fix.js — whoami 엔드포인트 배포 (userId 진단용)
const fs = require('fs')
const path = require('path')

const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const token = envContent.match(/GITHUB_TOKEN=([^\r\n]+)/)?.[1]?.trim()
if (!token) { console.error('No GITHUB_TOKEN'); process.exit(1) }

const REPO = 'jty0221-del/localution'

async function pushFile(repoPath, localPath) {
  const fullLocal = path.join(__dirname, '..', localPath)
  if (!fs.existsSync(fullLocal)) {
    console.warn('파일 없음 (스킵):', localPath)
    return
  }
  const content = fs.readFileSync(fullLocal)
  const b64 = content.toString('base64')

  const shaRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${repoPath}`, {
    headers: { Authorization: 'token ' + token, Accept: 'application/vnd.github.v3+json' }
  })
  const shaJson = await shaRes.json()
  const sha = shaJson.sha

  const body = JSON.stringify({
    message: 'fix: add whoami diagnostic endpoint',
    content: b64,
    ...(sha ? { sha } : {}),
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
    console.log('OK', repoPath)
  } else {
    console.error('FAIL', repoPath, res.status, json.message)
  }
}

;(async () => {
  await pushFile(
    'app/api/threads/admin/whoami/route.ts',
    'app/api/threads/admin/whoami/route.ts'
  )
  console.log('\n배포 완료. 1-2분 후 아래 URL 확인:')
  console.log('https://www.localution.co.kr/api/threads/admin/whoami')
})()
