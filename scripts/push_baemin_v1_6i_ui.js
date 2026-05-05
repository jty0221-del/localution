// review-admin UI 푸시 (단독)
const fs = require('fs')
const path = require('path')

const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const token = envContent.match(/GITHUB_TOKEN=([^\r\n]+)/)?.[1]?.trim()
if (!token) { console.error('No GITHUB_TOKEN'); process.exit(1) }

const REPO = 'jty0221-del/localution'

async function pushFile(repoPath, localPath, message) {
  const full = path.join(__dirname, '..', localPath)
  const content = fs.readFileSync(full)
  const b64 = content.toString('base64')

  const shaRes = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + repoPath, {
    headers: { Authorization: 'token ' + token, Accept: 'application/vnd.github.v3+json' }
  })
  let sha = undefined
  if (shaRes.ok) {
    try {
      const j = await shaRes.json()
      sha = j.sha
    } catch (e) {
      console.warn('sha parse failed, using no sha')
    }
  }

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
  if (res.ok) console.log('OK', repoPath, (json.commit && json.commit.sha) ? json.commit.sha.slice(0, 8) : 'pushed')
  else console.error('ERR', repoPath, res.status, json.message || text.slice(0, 200))
}

async function main() {
  await pushFile(
    'app/review-admin/baemin/page.tsx',
    'app/review-admin/baemin/page.tsx',
    'feat(baemin): 모달에 14637452 매장 설정 버튼 + setRealShop 핸들러'
  )
  console.log('done')
}
main().catch(console.error)
