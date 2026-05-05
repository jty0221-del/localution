// push_threads_platform_creds.js
// platform_credentials 기반으로 전환 — threads_accounts 의존 완전 제거
const fs = require('fs'), path = require('path')
const env = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const token = env.match(/GITHUB_TOKEN=([^\r\n]+)/)?.[1]?.trim()
if (!token) { console.error('No GITHUB_TOKEN'); process.exit(1) }
const REPO = 'jty0221-del/localution'

async function push(repoPath, localPath) {
  const full = path.join(__dirname, '..', localPath)
  if (!fs.existsSync(full)) { console.warn('skip (not found):', localPath); return }
  const b64 = fs.readFileSync(full).toString('base64')
  const shaRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${repoPath}`, {
    headers: { Authorization: 'token ' + token, Accept: 'application/vnd.github.v3+json' }
  })
  const sha = (await shaRes.json()).sha
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${repoPath}`, {
    method: 'PUT',
    headers: { Authorization: 'token ' + token, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'fix: threads token → platform_credentials table (threads_accounts 의존 제거)', content: b64, ...(sha ? { sha } : {}) })
  })
  const j = await res.json()
  console.log(res.ok ? 'OK  ' : 'FAIL', repoPath, res.ok ? '' : j.message)
  await new Promise(r => setTimeout(r, 300))
}

;(async () => {
  const files = [
    // core token util (app side — already written)
    ['app/lib/threads-token.ts',                    'app/lib/threads-token.ts'],
    // api routes
    ['app/api/threads/account/route.ts',            'app/api/threads/account/route.ts'],
    ['app/api/threads/posts/route.ts',              'app/api/threads/posts/route.ts'],
    ['app/api/oauth/threads/callback/route.ts',     'app/api/oauth/threads/callback/route.ts'],
    // worker token util
    ['worker/src/lib/threads-token.ts',             'worker/src/lib/threads-token.ts'],
  ]

  for (const [r, l] of files) await push(r, l)

  console.log('\n배포 완료. Vercel 빌드 1-2분 후 Threads 계정 연결을 다시 시도해주세요.')
  console.log('연결 URL: https://localution.vercel.app/marketing/threads')
})()
