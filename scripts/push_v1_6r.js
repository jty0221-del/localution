// v1.6r: 카카오맵 매장 변경 + 대시보드 라운드 로빈 + 배민 정렬 + 30일 아래로
const fs = require('fs')
const path = require('path')

const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const token = envContent.match(/GITHUB_TOKEN=([^\r\n]+)/)?.[1]?.trim()
const REPO = 'jty0221-del/localution'

const FILES = [
  ['app/api/place/kakao/set-place/route.ts',              'feat(kakao): set-place endpoint — 매장 ID 직접 변경 + 옛 리뷰 wipe'],
  ['app/settings/profile/page.tsx',                        'feat(profile): KakaoPlaceChanger UI — 카카오맵 매장 변경 폼'],
  ['app/dashboard/page.tsx',                               'fix(dashboard): mergedRealReviews 라운드 로빈 — 모든 플랫폼 골고루'],
  ['app/review-admin/components/PlatformReviewAdmin.tsx',  'fix(baemin): 30일 경과 아래로 + ID YYYYMMDD 기반 정확한 정렬'],
]

async function pushFile(repoPath, localPath, message) {
  const full = path.join(__dirname, '..', localPath)
  const content = fs.readFileSync(full)
  const b64 = content.toString('base64')
  const shaRes = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + repoPath, {
    headers: { Authorization: 'token ' + token, Accept: 'application/vnd.github.v3+json' }
  })
  let sha
  if (shaRes.ok) { try { sha = (await shaRes.json()).sha } catch {} }
  const body = { message, content: b64 }
  if (sha) body.sha = sha
  const res = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + repoPath, {
    method: 'PUT',
    headers: { Authorization: 'token ' + token, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const text = await res.text()
  let json = {}
  try { json = text ? JSON.parse(text) : {} } catch {}
  if (res.ok) console.log('OK', repoPath, json.commit?.sha?.slice(0, 8) || 'pushed')
  else console.error('ERR', repoPath, res.status, json.message || text.slice(0, 200))
}

async function main() {
  for (const [repoPath, msg] of FILES) {
    await pushFile(repoPath, repoPath, msg)
    await new Promise(r => setTimeout(r, 800))
  }
  console.log('done — v1.6r deployed')
}
main().catch(console.error)
