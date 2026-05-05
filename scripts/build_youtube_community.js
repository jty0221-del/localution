// build_youtube_community.js
// YouTube 커뮤니티 업로드 페이지 + 사이드바 수정 → GitHub 배포
//
// 실행 방법:
//   cd C:\Users\pc\Desktop\localution
//   node scripts/build_youtube_community.js

const fs   = require('fs')
const path = require('path')

// .env.local 에서 GITHUB_TOKEN 읽기
const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const token = envContent.match(/GITHUB_TOKEN=([^\r\n]+)/)?.[1]?.trim()
if (!token) {
  console.error('GITHUB_TOKEN 이 .env.local 에 없습니다.')
  process.exit(1)
}

const REPO = 'jty0221-del/localution'
const HEADERS = {
  Authorization: `token ${token}`,
  Accept: 'application/vnd.github.v3+json',
  'Content-Type': 'application/json',
}

// 배포할 파일 목록: [로컬 경로, GitHub 경로, 커밋 메시지]
const FILES = [
  [
    'app/marketing/youtube-community/page.tsx',
    'app/marketing/youtube-community/page.tsx',
    'feat: YouTube 커뮤니티 자동 업로드 페이지 추가',
  ],
  [
    'app/components/Sidebar.tsx',
    'app/components/Sidebar.tsx',
    'feat: 사이드바에 유튜브 커뮤니티 업로드 메뉴 추가',
  ],
]

async function getSHA(repoPath) {
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${repoPath}`, {
    headers: HEADERS,
  })
  if (!res.ok) return null  // 새 파일이면 SHA 없음
  const json = await res.json()
  return json.sha || null
}

async function pushFile(localPath, repoPath, message) {
  const content = fs.readFileSync(path.join(__dirname, '..', localPath))
  const b64 = content.toString('base64')

  const sha = await getSHA(repoPath)

  const body = { message, content: b64 }
  if (sha) body.sha = sha  // 기존 파일 수정 시 SHA 필수

  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${repoPath}`, {
    method: 'PUT',
    headers: HEADERS,
    body: JSON.stringify(body),
  })

  const json = await res.json()
  if (res.ok) {
    console.log(`  ✓  ${repoPath}  (${json.commit?.sha?.slice(0, 8)})`)
  } else {
    console.error(`  ✗  ${repoPath}  [${res.status}] ${json.message}`)
  }
}

async function main() {
  console.log('')
  console.log('YouTube 커뮤니티 업로드 — GitHub 배포 시작')
  console.log('─'.repeat(50))

  for (const [localPath, repoPath, msg] of FILES) {
    await pushFile(localPath, repoPath, msg)
    await new Promise(r => setTimeout(r, 800))  // API 레이트 리밋 방지
  }

  console.log('─'.repeat(50))
  console.log('완료 — Vercel 자동 빌드가 시작됩니다 (1~2분 소요)')
  console.log('확인: https://localution.vercel.app/marketing/youtube-community')
  console.log('')
}

main().catch(err => {
  console.error('배포 중 오류:', err.message)
  process.exit(1)
})
