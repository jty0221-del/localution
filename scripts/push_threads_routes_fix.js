// push_threads_routes_fix.js — 모든 Threads API 라우트 requireAdmin 제거
const fs = require('fs')
const path = require('path')

const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const token = envContent.match(/GITHUB_TOKEN=([^\r\n]+)/)?.[1]?.trim()
if (!token) { console.error('No GITHUB_TOKEN'); process.exit(1) }

const REPO = 'jty0221-del/localution'

async function pushFile(repoPath, localPath) {
  const fullLocal = path.join(__dirname, '..', localPath)
  if (!fs.existsSync(fullLocal)) { console.warn('파일 없음:', localPath); return }
  const content = fs.readFileSync(fullLocal)
  const b64 = content.toString('base64')

  const shaRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${repoPath}`, {
    headers: { Authorization: 'token ' + token, Accept: 'application/vnd.github.v3+json' }
  })
  const shaJson = await shaRes.json()
  const sha = shaJson.sha

  const body = JSON.stringify({
    message: 'fix: threads routes use stores userId instead of requireAdmin',
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
  console.log(res.ok ? 'OK' : 'FAIL', repoPath, res.ok ? '' : json.message)
}

;(async () => {
  await pushFile('app/api/threads/account/route.ts',              'app/api/threads/account/route.ts')
  await pushFile('app/api/threads/posts/route.ts',                'app/api/threads/posts/route.ts')
  await pushFile('app/api/threads/posts/[id]/route.ts',           'app/api/threads/posts/[id]/route.ts')
  await pushFile('app/api/threads/posts/[id]/publish/route.ts',   'app/api/threads/posts/[id]/publish/route.ts')
  console.log('\n배포 완료. 1-2분 후 페이지 새로고침하면 계정 연결 상태가 표시됩니다.')
})()
