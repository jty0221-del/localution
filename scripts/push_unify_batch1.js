// 통일성 배치 1: bg color 통일 + wrapper 패턴 수정 + 이모지 일부 제거
const fs = require('fs')
const path = require('path')

const env = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const token = env.match(/GITHUB_TOKEN=([^\r\n]+)/)[1].trim()
const REPO = 'jty0221-del/localution'

const FILES = [
  'app/(app)/layout.tsx',
  'app/community/page.tsx',
  'app/components/LockedBanner.tsx',
  'app/customers/page.tsx',
  'app/dashboard/page.tsx',
  'app/legal/platform-consent/page.tsx',
  'app/locked/page.tsx',
  'app/marketing/blog-index/page.tsx',
  'app/marketing/blog-post/page.tsx',
  'app/marketing/blog-tracking/page.tsx',
  'app/marketing/card-news/page.tsx',
  'app/marketing/keyword-rank/page.tsx',
  'app/marketing/keyword-score/page.tsx',
  'app/marketing/page.tsx',
  'app/marketing/place/page.tsx',
  'app/marketing/reels/page.tsx',
  'app/my/page.tsx',
  'app/my/platforms/naver_place/session/page.tsx',
  'app/partner-points/page.tsx',
  'app/privacy/page.tsx',
  'app/qr-admin/page.tsx',
  'app/review-admin/components/PlatformReviewAdmin.tsx',
  'app/review-admin/google/page.tsx',
  'app/review-admin/naver/autoreply/page.tsx',
  'app/review-admin/page.tsx',
  'app/service-intro/page.tsx',
  'app/settings/connect/page.tsx',
  'app/settings/page.tsx',
  'app/settings/profile/page.tsx',
  'app/terms/page.tsx',
  'app/whoami/page.tsx',
]

async function pushFile(repoPath) {
  const full = path.join(__dirname, '..', repoPath)
  if (!fs.existsSync(full)) { console.log('SKIP', repoPath, '(not found)'); return }
  const content = fs.readFileSync(full)
  const b64 = content.toString('base64')
  const shaRes = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + repoPath, {
    headers: { Authorization: 'token ' + token, Accept: 'application/vnd.github.v3+json' }
  })
  let sha
  if (shaRes.ok) { try { sha = (await shaRes.json()).sha } catch {} }
  const body = { message: 'chore(unify): bg color + wrapper pattern + emoji 일부 제거 (배치 1)', content: b64 }
  if (sha) body.sha = sha
  const res = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + repoPath, {
    method: 'PUT',
    headers: { Authorization: 'token ' + token, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const text = await res.text()
  let json = {}
  try { json = text ? JSON.parse(text) : {} } catch {}
  if (res.ok) console.log('OK ', repoPath, json.commit?.sha?.slice(0, 8) || 'pushed')
  else console.error('ERR', repoPath, res.status, json.message || text.slice(0, 200))
}

async function main() {
  for (const repoPath of FILES) {
    await pushFile(repoPath)
    await new Promise(r => setTimeout(r, 600))
  }
  console.log('\ndone — 배치 1 통일성 푸시')
}
main().catch(console.error)
