// push_admin_auth_fix.js — adminAuth 쿠키 파싱 버그 수정 배포
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
    message: 'fix: adminAuth verifyCookie for signed localution_user cookie',
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
  await pushFile('app/lib/adminAuth.ts', 'app/lib/adminAuth.ts')
  console.log('\n배포 완료. 1-2분 후 확인:')
  console.log('https://www.localution.co.kr/api/threads/admin/whoami')
})()
