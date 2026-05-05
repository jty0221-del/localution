// push_threads_debug.js — 에러 진단 + 자동 테이블 생성 배포
const fs = require('fs'), path = require('path')
const env = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const token = env.match(/GITHUB_TOKEN=([^\r\n]+)/)?.[1]?.trim()
if (!token) { console.error('No GITHUB_TOKEN'); process.exit(1) }
const REPO = 'jty0221-del/localution'

async function push(repoPath, localPath) {
  const full = path.join(__dirname, '..', localPath)
  if (!fs.existsSync(full)) { console.warn('skip:', localPath); return }
  const b64 = fs.readFileSync(full).toString('base64')
  const shaRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${repoPath}`, {
    headers: { Authorization: 'token ' + token, Accept: 'application/vnd.github.v3+json' }
  })
  const sha = (await shaRes.json()).sha
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${repoPath}`, {
    method: 'PUT',
    headers: { Authorization: 'token ' + token, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'fix: threads error detail + auto table creation', content: b64, ...(sha ? { sha } : {}) })
  })
  const j = await res.json()
  console.log(res.ok ? 'OK ' : 'FAIL', repoPath, res.ok ? '' : j.message)
  await new Promise(r => setTimeout(r, 200))
}

;(async () => {
  for (const [r, l] of [
    ['app/api/oauth/threads/callback/route.ts', 'app/api/oauth/threads/callback/route.ts'],
    ['app/marketing/threads/page.tsx',          'app/marketing/threads/page.tsx'],
  ]) await push(r, l)
  console.log('\nVercel 1-2분 후 적용. 다시 Threads 연결 시도 후 빨간 박스에 나오는 에러 알려주세요.')
})()
