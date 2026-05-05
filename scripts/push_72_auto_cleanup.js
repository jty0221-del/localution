// 72차: 큐 적체 영구 방지
//   1) cron 에서 last_login_status='failed/credentials_invalid/locked/captcha' 매장 skip
//   2) cron jobId 시간(시간 단위) 기반 → BullMQ deduplication (중복 enqueue 방지)
//   3) auto-publish enqueue 전에 사장님 fetch_reviews 자동 cleanup → post_reply 즉시 처리
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
  const body = {
    message: 'fix(queue): 72차 — cron failed 매장 skip + jobId dedupe + auto-publish 자동 cleanup',
    content: b64
  }
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
  await pushFile('app/api/cron/delivery-reviews-fetch/route.ts', 'app/api/cron/delivery-reviews-fetch/route.ts')
  await pushFile('app/api/review-reply/auto-publish/route.ts', 'app/api/review-reply/auto-publish/route.ts')
  console.log('done')
}
main().catch(console.error)
