// push_threads_final_fix.js — 최종 수정 전체 배포
// 수정 내용:
//   1. ENCRYPTION_KEK_HEX 불필요 — SUPABASE_SERVICE_ROLE_KEY 파생 키 사용
//   2. user_id 필터 제거 — 단일 사용자 앱 (threads_accounts 최신 행 조회)
//   3. saveThreadsToken 저장 실패 감지 (throw)
//   4. 발행 버튼 disabled 조건 수정
//   5. /updates 페이지 DB 연동 + Threads 내역 추가
const fs = require('fs')
const path = require('path')

const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const token = envContent.match(/GITHUB_TOKEN=([^\r\n]+)/)?.[1]?.trim()
if (!token) { console.error('No GITHUB_TOKEN'); process.exit(1) }

const REPO = 'jty0221-del/localution'

async function pushFile(repoPath, localPath) {
  const fullLocal = path.join(__dirname, '..', localPath)
  if (!fs.existsSync(fullLocal)) { console.warn('스킵 (없음):', localPath); return }
  const b64 = fs.readFileSync(fullLocal).toString('base64')

  const shaRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${repoPath}`, {
    headers: { Authorization: 'token ' + token, Accept: 'application/vnd.github.v3+json' }
  })
  const shaJson = await shaRes.json()
  const sha = shaJson.sha

  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${repoPath}`, {
    method: 'PUT',
    headers: { Authorization: 'token ' + token, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'fix: threads SUPABASE_SERVICE_ROLE_KEY encryption + updates page DB',
      content: b64,
      ...(sha ? { sha } : {}),
    })
  })
  const json = await res.json()
  console.log(res.ok ? 'OK ' : 'FAIL', repoPath, res.ok ? '' : json.message)
  await new Promise(r => setTimeout(r, 200))
}

;(async () => {
  const FILES = [
    // 핵심 수정: 암호화 방식 변경
    ['app/lib/threads-token.ts',                        'app/lib/threads-token.ts'],
    ['worker/src/lib/threads-token.ts',                 'worker/src/lib/threads-token.ts'],
    // 계정 조회: user_id 필터 제거
    ['app/api/threads/account/route.ts',                'app/api/threads/account/route.ts'],
    ['app/api/threads/posts/route.ts',                  'app/api/threads/posts/route.ts'],
    ['app/api/oauth/threads/callback/route.ts',         'app/api/oauth/threads/callback/route.ts'],
    // UI 수정: 버튼 disabled 조건
    ['app/marketing/threads/page.tsx',                  'app/marketing/threads/page.tsx'],
    // 업데이트 페이지
    ['app/updates/page.tsx',                            'app/updates/page.tsx'],
    // 마이그레이션
    ['supabase/migrations/20260505_app_updates.sql',    'supabase/migrations/20260505_app_updates.sql'],
    // Worker
    ['worker/src/adapters/threads.ts',                  'worker/src/adapters/threads.ts'],
  ]
  console.log(`총 ${FILES.length}개 파일 배포 시작...\n`)
  for (const [repo, local] of FILES) {
    await pushFile(repo, local)
  }
  console.log('\n완료! Vercel + Railway 자동 빌드 시작됩니다.')
  console.log('- Vercel: 1-2분 후 적용')
  console.log('- Railway(워커): 3-5분 후 적용')
  console.log('\n일어난 후 해야 할 일:')
  console.log('1. Supabase SQL 에디터에서 20260505_app_updates.sql 실행')
  console.log('2. /marketing/threads/connect 에서 Threads 계정 재연결')
  console.log('3. /marketing/threads 에서 발행 테스트')
})()
