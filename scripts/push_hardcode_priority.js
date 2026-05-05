// User-specified hardcode cleanup: revert 3/4/5 + dynamic stats + URL/ID + image placeholders
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
  const body = { message: 'fix(hardcode): dynamic landing stats + remove URL/ID + image placeholders + revert testimonials/login/sample_store', content: b64 }
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
  await pushFile('app/page.tsx', 'app/page.tsx')
  await pushFile('app/login/page.tsx', 'app/login/page.tsx')
  await pushFile('app/service-intro/page.tsx', 'app/service-intro/page.tsx')
  await pushFile('app/api/admin/review-health/route.ts', 'app/api/admin/review-health/route.ts')
  await pushFile('app/review/[storeId]/page.tsx', 'app/review/[storeId]/page.tsx')
  await pushFile('app/api/admin/seed-baemin-now/route.ts', 'app/api/admin/seed-baemin-now/route.ts')
  await pushFile('app/api/admin/seed-baemin-reviews/route.ts', 'app/api/admin/seed-baemin-reviews/route.ts')
  await pushFile('app/api/admin/seed-yogiyo-reviews/route.ts', 'app/api/admin/seed-yogiyo-reviews/route.ts')
  await pushFile('app/api/admin/seed-coupang-reviews/route.ts', 'app/api/admin/seed-coupang-reviews/route.ts')
  console.log('done')
}
main().catch(console.error)
