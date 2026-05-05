// Phase 1: 디지털 스탬프 카드 시스템
const fs = require('fs')
const path = require('path')

const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const token = envContent.match(/GITHUB_TOKEN=([^\r\n]+)/)?.[1]?.trim()
if (!token) { console.error('No GITHUB_TOKEN'); process.exit(1) }
console.log('token:', token.slice(0, 10) + '...')

const REPO = 'jty0221-del/localution'

async function pushFile(repoPath, localPath) {
  const content = fs.readFileSync(path.join(__dirname, '..', localPath))
  const b64 = content.toString('base64')
  const shaRes = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + repoPath, {
    headers: { Authorization: 'token ' + token, Accept: 'application/vnd.github.v3+json' }
  })
  const shaJson = await shaRes.json()
  const sha = shaJson.sha
  const body = { message: 'feat: Phase 1 — digital stamp card system (owner setup + customer scan + my cards)', content: b64 }
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
  await pushFile('migrations/stamp_cards.sql', 'migrations/stamp_cards.sql')
  await pushFile('app/api/stamps/setup/route.ts', 'app/api/stamps/setup/route.ts')
  await pushFile('app/api/stamps/collect/route.ts', 'app/api/stamps/collect/route.ts')
  await pushFile('app/api/stamps/customers/route.ts', 'app/api/stamps/customers/route.ts')
  await pushFile('app/api/stamps/my/route.ts', 'app/api/stamps/my/route.ts')
  await pushFile('app/components/StampCardView.tsx', 'app/components/StampCardView.tsx')
  await pushFile('app/components/StampCardEditor.tsx', 'app/components/StampCardEditor.tsx')
  await pushFile('app/stamp/[slug]/page.tsx', 'app/stamp/[slug]/page.tsx')
  await pushFile('app/my/stamps/page.tsx', 'app/my/stamps/page.tsx')
  await pushFile('app/qr-admin/page.tsx', 'app/qr-admin/page.tsx')
  console.log('done')
}
main().catch(console.error)
