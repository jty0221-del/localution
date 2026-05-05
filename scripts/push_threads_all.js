// push_threads_all.js — Threads 시스템 전체 파일 최종 배포
const fs = require('fs')
const path = require('path')

const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const token = envContent.match(/GITHUB_TOKEN=([^\r\n]+)/)?.[1]?.trim()
if (!token) { console.error('No GITHUB_TOKEN'); process.exit(1) }

const REPO = 'jty0221-del/localution'

async function pushFile(repoPath, localPath) {
  const fullLocal = path.join(__dirname, '..', localPath)
  if (!fs.existsSync(fullLocal)) { console.warn('스킵 (없음):', localPath); return }
  const content = fs.readFileSync(fullLocal)
  const b64 = content.toString('base64')

  const shaRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${repoPath}`, {
    headers: { Authorization: 'token ' + token, Accept: 'application/vnd.github.v3+json' }
  })
  const shaJson = await shaRes.json()
  const sha = shaJson.sha

  const body = JSON.stringify({
    message: 'feat: Threads 자동발행 전체 배포 (final)',
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
    console.log('OK ', repoPath)
  } else {
    console.error('FAIL', repoPath, res.status, json.message)
  }
  await new Promise(r => setTimeout(r, 200))
}

const FILES = [
  // Vercel 설정
  ['vercel.json',                                              'vercel.json'],
  // 라이브러리
  ['app/lib/threads-token.ts',                                'app/lib/threads-token.ts'],
  ['app/lib/adminAuth.ts',                                    'app/lib/adminAuth.ts'],
  // OAuth
  ['app/api/oauth/threads/route.ts',                          'app/api/oauth/threads/route.ts'],
  ['app/api/oauth/threads/callback/route.ts',                 'app/api/oauth/threads/callback/route.ts'],
  // Threads API 라우트
  ['app/api/threads/account/route.ts',                        'app/api/threads/account/route.ts'],
  ['app/api/threads/posts/route.ts',                          'app/api/threads/posts/route.ts'],
  ['app/api/threads/posts/[id]/route.ts',                     'app/api/threads/posts/[id]/route.ts'],
  ['app/api/threads/posts/[id]/publish/route.ts',             'app/api/threads/posts/[id]/publish/route.ts'],
  ['app/api/threads/admin/setup-token/route.ts',              'app/api/threads/admin/setup-token/route.ts'],
  ['app/api/threads/admin/whoami/route.ts',                   'app/api/threads/admin/whoami/route.ts'],
  // Cron
  ['app/api/cron/threads-publish/route.ts',                   'app/api/cron/threads-publish/route.ts'],
  ['app/api/cron/threads-token-refresh/route.ts',             'app/api/cron/threads-token-refresh/route.ts'],
  // UI
  ['app/marketing/threads/page.tsx',                          'app/marketing/threads/page.tsx'],
  ['app/marketing/threads/connect/page.tsx',                  'app/marketing/threads/connect/page.tsx'],
  ['app/components/Sidebar.tsx',                              'app/components/Sidebar.tsx'],
  ['app/marketing/card-news/page.tsx',                        'app/marketing/card-news/page.tsx'],
  // app/lib/queue.ts
  ['app/lib/queue.ts',                                        'app/lib/queue.ts'],
  // Worker
  ['worker/src/lib/threads-token.ts',                         'worker/src/lib/threads-token.ts'],
  ['worker/src/adapters/threads.ts',                          'worker/src/adapters/threads.ts'],
  ['worker/src/jobs/index.ts',                                'worker/src/jobs/index.ts'],
  // DB migration
  ['supabase/migrations/20260505_threads.sql',                'supabase/migrations/20260505_threads.sql'],
]

;(async () => {
  console.log(`총 ${FILES.length}개 파일 배포 시작...\n`)
  for (const [repo, local] of FILES) {
    await pushFile(repo, local)
  }
  console.log('\n완료! Vercel + Railway 자동 빌드 시작됩니다.')
  console.log('- Vercel: 1-2분 후 적용')
  console.log('- Railway(워커): 3-5분 후 적용')
})()
