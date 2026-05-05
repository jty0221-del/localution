// CRITICAL security fixes: cookie HMAC + rate limit + SQL injection
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
  const body = { message: 'security: cookie HMAC + rate limit + SQL injection fix (CRITICAL)', content: b64 }
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
  await pushFile('app/lib/cookieSigning.ts', 'app/lib/cookieSigning.ts')
  await pushFile('app/lib/userAuth.ts', 'app/lib/userAuth.ts')
  await pushFile('app/lib/rateLimit.ts', 'app/lib/rateLimit.ts')
  await pushFile('app/api/oauth/google/callback/route.ts', 'app/api/oauth/google/callback/route.ts')
  await pushFile('app/api/oauth/kakao/callback/route.ts', 'app/api/oauth/kakao/callback/route.ts')
  await pushFile('app/api/oauth/naver/callback/route.ts', 'app/api/oauth/naver/callback/route.ts')
  await pushFile('app/api/auth/naver/callback/route.ts', 'app/api/auth/naver/callback/route.ts')
  await pushFile('app/api/qr-review-generate/route.ts', 'app/api/qr-review-generate/route.ts')
  await pushFile('app/api/naver-keyword-volume/route.ts', 'app/api/naver-keyword-volume/route.ts')
  await pushFile('app/api/menu/translate-public/route.ts', 'app/api/menu/translate-public/route.ts')
  await pushFile('app/api/stamps/collect/route.ts', 'app/api/stamps/collect/route.ts')
  await pushFile('app/api/stamps/my/route.ts', 'app/api/stamps/my/route.ts')
  console.log('done')
}
main().catch(console.error)
