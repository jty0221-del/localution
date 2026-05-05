// Hardcode cleanup batch 1: page/login/dashboard/service-intro/TopBar/PartnerSpotlight/community
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
  const body = { message: 'fix: hardcode cleanup — remove fake stats/testimonials/notifications/partners (BETA honest)', content: b64 }
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
  await pushFile('app/dashboard/page.tsx', 'app/dashboard/page.tsx')
  await pushFile('app/service-intro/page.tsx', 'app/service-intro/page.tsx')
  await pushFile('app/components/TopBar.tsx', 'app/components/TopBar.tsx')
  await pushFile('app/components/PartnerSpotlight.tsx', 'app/components/PartnerSpotlight.tsx')
  await pushFile('app/community/page.tsx', 'app/community/page.tsx')
  console.log('done')
}
main().catch(console.error)
