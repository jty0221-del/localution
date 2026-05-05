// v1.6z 푸시:
//   1. 통계 페이지 — 실패 원인 카테고리 14개로 세분화 + 샘플 에러 메시지
//   2. 통계 UI — 카테고리 클릭 시 무엇/어떻게 + 실제 에러 메시지 펼치기
//   3. 요기요 — postReply 다단계 fallback + 30일 DB-기반 fallback + DB 실패 사유 기록
const fs = require('fs')
const path = require('path')

const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const token = envContent.match(/GITHUB_TOKEN=([^\r\n]+)/)?.[1]?.trim()
const REPO = 'jty0221-del/localution'

const FILES = [
  // 통계 개선
  ['app/api/reply-stats/route.ts',         'feat(reply-stats): 실패 원인 14종 세분화 + 카테고리별 샘플 에러 메시지'],
  ['app/review-admin/stats/page.tsx',      'feat(stats UI): 카테고리 아코디언 + 무엇/어떻게 안내 + 실제 에러 메시지 펼치기'],
  // 요기요
  ['worker/src/adapters/yogiyo.ts',        'feat(yogiyo): v1.6z — postReply 다단계 fallback + 30일 DB fallback + DB 실패 사유 기록'],
  ['worker/Dockerfile',                    'chore(worker): CACHE_BUST 20260506T1200 (v1.6z yogiyo)'],
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
  if (res.ok) console.log('OK ', repoPath, json.commit?.sha?.slice(0, 8) || 'pushed')
  else console.error('ERR', repoPath, res.status, json.message || text.slice(0, 200))
}

async function main() {
  for (const [repoPath, msg] of FILES) {
    await pushFile(repoPath, repoPath, msg)
    await new Promise(r => setTimeout(r, 800))
  }
  console.log('\ndone — v1.6z (통계 개선 + 요기요 강화)')
}
main().catch(console.error)
