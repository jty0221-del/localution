// Option A: Worker infrastructure for naver menu import
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
  const body = { message: 'feat(menu): Option A — Worker fetch_menu via Playwright + sajangim auth', content: b64 }
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
  await pushFile('worker/src/adapters/naver-menu.ts', 'worker/src/adapters/naver-menu.ts')
  await pushFile('worker/src/jobs/index.ts', 'worker/src/jobs/index.ts')
  await pushFile('app/api/menu/import-naver/route.ts', 'app/api/menu/import-naver/route.ts')
  await pushFile('app/api/menu/import-status/route.ts', 'app/api/menu/import-status/route.ts')
  await pushFile('app/components/MenuBoardEditor.tsx', 'app/components/MenuBoardEditor.tsx')
  console.log('done')
}
main().catch(console.error)
