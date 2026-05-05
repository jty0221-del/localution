// push_threads_ai_features.js — 페르소나, 템플릿, AI 초안, Daily brief cron
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
    headers: { Authorization: 'token ' + token, 'Content-Type': 'application/json', Accept: 'application/vnd.github.v3+json' },
    body: JSON.stringify({ message: 'feat: threads AI draft, persona, template, daily brief cron', content: b64, ...(sha ? { sha } : {}) })
  })
  const j = await res.json()
  console.log(res.ok ? 'OK  ' : 'FAIL', repoPath, res.ok ? '' : j.message)
  await new Promise(r => setTimeout(r, 300))
}

;(async () => {
  for (const [r, l] of [
    ['app/marketing/threads/page.tsx',                  'app/marketing/threads/page.tsx'],
    ['app/api/threads/generate/route.ts',               'app/api/threads/generate/route.ts'],
    ['app/api/cron/threads-daily-brief/route.ts',       'app/api/cron/threads-daily-brief/route.ts'],
    ['vercel.json',                                     'vercel.json'],
  ]) await push(r, l)
  console.log('\n배포 완료. Vercel 빌드 1-2분 소요.')
  console.log('Daily brief: 매일 KST 08:00 자동 발행 (UTC 23:00)')
})()
