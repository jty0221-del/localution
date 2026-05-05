// 배민 v1.6k: 알림 통합 + post_reply in-browser fetch + chip 제거 + cron payload
const fs = require('fs')
const path = require('path')

const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const token = envContent.match(/GITHUB_TOKEN=([^\r\n]+)/)?.[1]?.trim()
if (!token) { console.error('No GITHUB_TOKEN'); process.exit(1) }

const REPO = 'jty0221-del/localution'

const FILES = [
  ['worker/src/adapters/baemin.ts',                       'feat(baemin): v1.6k — 알림 트리거 + post_reply in-browser fetch (Akamai 우회)'],
  ['worker/Dockerfile',                                    'chore(worker): CACHE_BUST 20260505T1730 (v1.6k)'],
  ['app/api/review-reply/auto-publish/route.ts',           'fix(baemin): v1.6k — Vercel direct 경로 폐기 (Akamai 차단 — 무조건 Worker)'],
  ['app/api/cron/delivery-reviews-fetch/route.ts',         'fix(cron): v1.6k — unknown sentinel 제거 + days_back 30 명시'],
  ['app/review-admin/baemin/page.tsx',                     'feat(baemin): v1.6k — 사장님 UI 깔끔화 (점검 chip 제거)'],
]

async function pushFile(repoPath, localPath, message) {
  const full = path.join(__dirname, '..', localPath)
  const content = fs.readFileSync(full)
  const b64 = content.toString('base64')

  const shaRes = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + repoPath, {
    headers: { Authorization: 'token ' + token, Accept: 'application/vnd.github.v3+json' }
  })
  let sha
  if (shaRes.ok) {
    try { sha = (await shaRes.json()).sha } catch {}
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
  if (res.ok) console.log('OK', repoPath, json.commit?.sha?.slice(0, 8) || 'pushed')
  else console.error('ERR', repoPath, res.status, json.message || text.slice(0, 200))
}

async function main() {
  for (const [repoPath, msg] of FILES) {
    await pushFile(repoPath, repoPath, msg)
    await new Promise(r => setTimeout(r, 800))
  }
  console.log('done — v1.6k deployed')
}
main().catch(console.error)
