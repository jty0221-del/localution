const fs   = require('fs')
const path = require('path')

const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const token = envContent.match(/GITHUB_TOKEN=([^\r\n]+)/)?.[1]?.trim()
if (!token) { console.error('No GITHUB_TOKEN'); process.exit(1) }

const REPO = 'jty0221-del/localution'
const HEADERS = {
  Authorization: `token ${token}`,
  Accept: 'application/vnd.github.v3+json',
  'Content-Type': 'application/json',
}

const FILES = [
  ['app/updates/page.tsx', 'app/updates/page.tsx', 'feat: 업데이트 내역 페이지 추가'],
]

async function getSHA(repoPath) {
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${repoPath}`, { headers: HEADERS })
  if (!res.ok) return null
  return (await res.json()).sha || null
}

async function pushFile(localPath, repoPath, message) {
  const content = fs.readFileSync(path.join(__dirname, '..', localPath))
  const b64 = content.toString('base64')
  const sha = await getSHA(repoPath)
  const body = { message, content: b64 }
  if (sha) body.sha = sha
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${repoPath}`, {
    method: 'PUT', headers: HEADERS, body: JSON.stringify(body),
  })
  const json = await res.json()
  if (res.ok) console.log(`  OK  ${repoPath}  (${json.commit?.sha?.slice(0, 8)})`)
  else console.error(`  ERR ${repoPath}  [${res.status}] ${json.message}`)
}

async function main() {
  console.log('업데이트 내역 페이지 배포 시작')
  for (const [lp, rp, msg] of FILES) {
    await pushFile(lp, rp, msg)
    await new Promise(r => setTimeout(r, 800))
  }
  console.log('완료 — https://localution.vercel.app/updates')
}
main().catch(console.error)
