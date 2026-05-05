// localStorage migration: useCustomers v2, Sidebar store sync, qr_codes (SQL+API+hook)
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
  const body = { message: 'feat(security): localStorage → DB migration — customers v2 + store sync + qr_codes infra', content: b64 }
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
  await pushFile('app/hooks/useCustomers.ts', 'app/hooks/useCustomers.ts')
  await pushFile('app/components/Sidebar.tsx', 'app/components/Sidebar.tsx')
  await pushFile('supabase/migrations/20260503_qr_codes.sql', 'supabase/migrations/20260503_qr_codes.sql')
  await pushFile('app/api/qr-codes/route.ts', 'app/api/qr-codes/route.ts')
  await pushFile('app/hooks/useQRCodes.ts', 'app/hooks/useQRCodes.ts')
  console.log('done')
}
main().catch(console.error)
