const fs = require('fs')
const path = require('path')
const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const token = envContent.match(/GITHUB_TOKEN=([^\r\n]+)/)?.[1]?.trim()
const REPO = 'jty0221-del/localution'
async function pushFile(repoPath, localPath) {
  const content = fs.readFileSync(path.join(__dirname, '..', localPath))
  const b64 = content.toString('base64')
  const shaRes = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + repoPath, { headers: { Authorization: 'token ' + token, Accept: 'application/vnd.github.v3+json' } })
  const sha = (await shaRes.json()).sha
  const body = { message: 'fix(coupang-bookmarklet): multi-fallback storeId resolution', content: b64 }
  if (sha) body.sha = sha
  const res = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + repoPath, { method: 'PUT', headers: { Authorization: 'token ' + token, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const json = await res.json()
  console.log(res.ok ? 'OK' : 'ERR', repoPath, res.ok ? json.commit?.sha?.slice(0, 8) : json.message)
}
;(async()=>{ await pushFile('app/components/CoupangReviewBookmarkletDialog.tsx', 'app/components/CoupangReviewBookmarkletDialog.tsx'); console.log('done') })()
