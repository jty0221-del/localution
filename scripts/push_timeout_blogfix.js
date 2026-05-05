// External fetch timeouts + blog-post credentials fix
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
  const body = { message: 'fix: external fetch timeouts + blog-post credentials:include', content: b64 }
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
  await pushFile('app/api/ai/route.ts', 'app/api/ai/route.ts')
  await pushFile('app/api/captcha-solve/route.ts', 'app/api/captcha-solve/route.ts')
  await pushFile('app/api/qr-review-generate/route.ts', 'app/api/qr-review-generate/route.ts')
  await pushFile('app/api/naver-blog-post/route.ts', 'app/api/naver-blog-post/route.ts')
  await pushFile('app/api/video-script/route.ts', 'app/api/video-script/route.ts')
  await pushFile('app/marketing/blog-post/page.tsx', 'app/marketing/blog-post/page.tsx')
  console.log('done')
}
main().catch(console.error)
