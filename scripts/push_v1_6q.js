// v1.6q: httpOnly cookie + dashboard 로그인 인식 + writableComment + 요기요 알림
const fs = require('fs')
const path = require('path')

const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const token = envContent.match(/GITHUB_TOKEN=([^\r\n]+)/)?.[1]?.trim()
const REPO = 'jty0221-del/localution'

const FILES = [
  ['app/api/me/route.ts',                                  'fix(auth): /api/me — signed cookie verify (Naver/Kakao OAuth 호환)'],
  ['app/settings/profile/page.tsx',                        'fix(profile): httpOnly 쿠키 → /api/me 사용 (네이버 로그인 인식 정상화)'],
  ['app/dashboard/page.tsx',                               'fix(dashboard): isLoggedIn — /api/me 사용 (리뷰 로딩 정상화)'],
  ['app/partner-points/page.tsx',                          'fix(partner): /api/me 사용 (httpOnly 쿠키 호환)'],
  ['app/review-admin/components/PlatformReviewAdmin.tsx',  'feat(baemin): writableComment 필드로 30일 차단 강화'],
  ['worker/src/adapters/baemin.ts',                        'chore(baemin): v1.6q VERSION_MARKER bump'],
  ['worker/Dockerfile',                                    'chore(worker): CACHE_BUST 20260506T0700 (v1.6q)'],
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
  console.log('done — v1.6q deployed')
}
main().catch(console.error)
