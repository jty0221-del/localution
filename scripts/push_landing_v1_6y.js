// 메인 홈 (app/page.tsx) v1.6y 업그레이드 푸시
//   · FEATURES 4개 추가 (답글 통계 / 실시간 알림 / 스레드 / 유튜브 커뮤니티)
//   · 멀티플랫폼 리뷰 관리 카드 갱신 (AI 답글 11종)
//   · "최근 업데이트 (5월 신기능)" 섹션 신설
//   · FAQ 8개로 확장 (AI 톤 11종 / 실시간 알림 / 6플랫폼 자동 등록 / 보안)
//   · JSON-LD + FAQPage schema 최신화
//   · After 카드 갱신 (말투 11종 + 통계 + 실시간 알림)
const fs = require('fs')
const path = require('path')

const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const token = envContent.match(/GITHUB_TOKEN=([^\r\n]+)/)?.[1]?.trim()
const REPO = 'jty0221-del/localution'

const FILES = [
  ['app/page.tsx', 'feat(landing): v1.6y — FEATURES 확장 (답글 통계·실시간 알림·스레드·유튜브) + 5월 신기능 섹션 + FAQ/JSON-LD 최신화'],
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
  }
  console.log('\ndone — 메인 홈 v1.6y 업그레이드')
}
main().catch(console.error)
