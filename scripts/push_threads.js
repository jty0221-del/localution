// push_threads.js — Threads 자동발행 시스템 전체 파일 GitHub 배포
const fs = require('fs')
const path = require('path')

const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const token = envContent.match(/GITHUB_TOKEN=([^\r\n]+)/)?.[1]?.trim()
if (!token) { console.error('No GITHUB_TOKEN'); process.exit(1) }

const REPO = 'jty0221-del/localution'

async function pushFile(repoPath, localPath) {
  const fullLocal = path.join(__dirname, '..', localPath)
  if (!fs.existsSync(fullLocal)) {
    console.warn('⚠️  파일 없음 (스킵):', localPath)
    return
  }
  const content = fs.readFileSync(fullLocal)
  const b64 = content.toString('base64')

  const shaRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${repoPath}`, {
    headers: { Authorization: 'token ' + token, Accept: 'application/vnd.github.v3+json' }
  })
  const shaJson = await shaRes.json()
  const sha = shaJson.sha  // 신규 파일이면 undefined

  const body = JSON.stringify({
    message: 'feat: Threads 자동발행 시스템 (OAuth + 예약발행 + Worker)',
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
    console.log('✅', repoPath)
  } else {
    console.error('❌', repoPath, res.status, json.message)
  }
}

const FILES = [
  // 마이그레이션
  ['supabase/migrations/20260505_threads.sql',               'supabase/migrations/20260505_threads.sql'],
  // 라이브러리
  ['app/lib/threads-token.ts',                               'app/lib/threads-token.ts'],
  ['app/lib/queue.ts',                                       'app/lib/queue.ts'],
  // OAuth
  ['app/api/oauth/threads/route.ts',                         'app/api/oauth/threads/route.ts'],
  ['app/api/oauth/threads/callback/route.ts',                'app/api/oauth/threads/callback/route.ts'],
  // API
  ['app/api/threads/account/route.ts',                       'app/api/threads/account/route.ts'],
  ['app/api/threads/posts/route.ts',                         'app/api/threads/posts/route.ts'],
  ['app/api/threads/posts/[id]/route.ts',                    'app/api/threads/posts/[id]/route.ts'],
  ['app/api/threads/posts/[id]/publish/route.ts',            'app/api/threads/posts/[id]/publish/route.ts'],
  ['app/api/threads/admin/setup-token/route.ts',             'app/api/threads/admin/setup-token/route.ts'],
  // Cron
  ['app/api/cron/threads-publish/route.ts',                  'app/api/cron/threads-publish/route.ts'],
  ['app/api/cron/threads-token-refresh/route.ts',            'app/api/cron/threads-token-refresh/route.ts'],
  // UI
  ['app/marketing/threads/page.tsx',                         'app/marketing/threads/page.tsx'],
  ['app/marketing/threads/connect/page.tsx',                 'app/marketing/threads/connect/page.tsx'],
  // 기존 파일 수정
  ['app/components/Sidebar.tsx',                             'app/components/Sidebar.tsx'],
  ['app/marketing/card-news/page.tsx',                       'app/marketing/card-news/page.tsx'],
  ['vercel.json',                                            'vercel.json'],
  // Worker
  ['worker/src/lib/threads-token.ts',                        'worker/src/lib/threads-token.ts'],
  ['worker/src/adapters/threads.ts',                         'worker/src/adapters/threads.ts'],
  ['worker/src/jobs/index.ts',                               'worker/src/jobs/index.ts'],
]

;(async () => {
  console.log(`📦 총 ${FILES.length}개 파일 배포 시작...\n`)
  for (const [repo, local] of FILES) {
    await pushFile(repo, local)
    await new Promise(r => setTimeout(r, 300))
  }
  console.log('\n🚀 완료! Vercel 빌드 시작됨 (1-2분 소요)')
  console.log('📋 배포 후 실행할 브라우저 콘솔 명령어:')
  console.log(`
fetch('/api/threads/admin/setup-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ access_token: 'THAAdOgRZCQDedBYll0emNHWDNDSUlHT1pMdnVnOFhfd2dzbnduME1wSVY1Vnk3RDdUWkxCSkdSb0t1NmswQkZApWkM1SnRTQ0dyVkE5RUhZAOFI1bGdJU1ZAIdHBZAaDZAxLThPVjJmWDFkZAmZARWlI4YWljelNMUFg2OGplMTFlWFAyYWFBcGMxNEVGWXk3djFKZA1EZD' })
}).then(r => r.json()).then(console.log)
`)
})()
