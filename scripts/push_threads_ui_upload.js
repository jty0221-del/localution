// push_threads_ui_upload.js — UI 답글체인 + 이미지업로드 + worker 배포
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
      message: 'feat: threads reply chain + drag-drop image upload',
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
    ['app/marketing/threads/page.tsx',         'app/marketing/threads/page.tsx'],
    ['app/api/threads/upload/route.ts',         'app/api/threads/upload/route.ts'],
    ['app/api/threads/posts/route.ts',          'app/api/threads/posts/route.ts'],
    ['worker/src/adapters/threads.ts',          'worker/src/adapters/threads.ts'],
  ]
  console.log(`총 ${FILES.length}개 파일 배포 시작...\n`)
  for (const [repo, local] of FILES) {
    await pushFile(repo, local)
  }
  console.log('\n완료! Vercel + Railway 자동 빌드 시작됩니다.')
  console.log('- Vercel: 1-2분 후 적용')
  console.log('- Railway(워커): 3-5분 후 적용')
})()
