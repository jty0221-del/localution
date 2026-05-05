// Phase 2 batch 4: naver_place + admin pages
const fs = require('fs')
const path = require('path')

const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const token = envContent.match(/GITHUB_TOKEN=([^\r\n]+)/)?.[1]?.trim()
if (!token) { console.error('No GITHUB_TOKEN'); process.exit(1) }

const REPO = 'jty0221-del/localution'

async function pushFile(repoPath, localPath) {
  const content = fs.readFileSync(path.join(__dirname, '..', localPath))
  const b64 = content.toString('base64')
  const shaRes = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + repoPath, {
    headers: { Authorization: 'token ' + token, Accept: 'application/vnd.github.v3+json' }
  })
  const shaJson = await shaRes.json()
  const sha = shaJson.sha
  const body = { message: 'fix(emoji): cleanup naver_place + admin pages (layout/dashboard/review-health/naver-check/updates)', content: b64 }
  if (sha) body.sha = sha
  const res = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + repoPath, {
    method: 'PUT',
    headers: { Authorization: 'token ' + token, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const json = await res.json()
  if (res.ok) console.log('OK', repoPath, json.commit?.sha?.slice(0, 8))
  else console.error('ERR', repoPath, res.status, json.message)
}

async function main() {
  await pushFile('app/my/platforms/naver_place/session/page.tsx', 'app/my/platforms/naver_place/session/page.tsx')
  await pushFile('app/admin/layout.tsx', 'app/admin/layout.tsx')
  await pushFile('app/admin/dashboard/page.tsx', 'app/admin/dashboard/page.tsx')
  await pushFile('app/admin/review-health/page.tsx', 'app/admin/review-health/page.tsx')
  await pushFile('app/admin/naver-check/page.tsx', 'app/admin/naver-check/page.tsx')
  await pushFile('app/admin/updates/page.tsx', 'app/admin/updates/page.tsx')
  console.log('done')
}
main().catch(console.error)
