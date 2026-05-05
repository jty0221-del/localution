// 배민 v1.6p + 요기요 알림 + MD 문서 + UI 점검
const fs = require('fs')
const path = require('path')

const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const token = envContent.match(/GITHUB_TOKEN=([^\r\n]+)/)?.[1]?.trim()
const REPO = 'jty0221-del/localution'

const FILES = [
  ['worker/src/adapters/baemin.ts',           'fix(baemin): v1.6p — Variant 1 = reviewId+contents+shopNumber (정답 1순위, 1번에 성공)'],
  ['worker/src/adapters/yogiyo.ts',           'feat(yogiyo): 알림 트리거 통합 (배민 v1.6 패턴)'],
  ['worker/Dockerfile',                       'chore(worker): CACHE_BUST 20260505T2100 (v1.6p + yogiyo notify)'],
  ['worker/BAEMIN_SYSTEM_v1.6.md',            'docs(baemin): v1.6 종합 문서 — 30+ iteration 검증된 spec + 재발 방지 체크리스트'],
  ['app/settings/profile/page.tsx',           'fix(ui): max-w-[1400px] — 큰 모니터 가독성'],
]

async function pushFile(repoPath, localPath, message) {
  const full = path.join(__dirname, '..', localPath)
  const content = fs.readFileSync(full)
  const b64 = content.toString('base64')
  const shaRes = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + repoPath, {
    headers: { Authorization: 'token ' + token, Accept: 'application/vnd.github.v3+json' }
  })
  let sha
  if (shaRes.ok) { try { sha = (await shaRes.json()).sha } catch {} }
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
  console.log('done — v1.6p + yogiyo + MD + UI 배포')
}
main().catch(console.error)
