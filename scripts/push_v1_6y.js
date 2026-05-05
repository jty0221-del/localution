// v1.6y: 5대 자체 진행 작업 푸시
//   1. 요기요 30일 차단 + 다중 매장 자동 감지
//   2. 답글 발행 통계 페이지 + API
//   3. AI 답글 톤 4종 추가 (감사·사과·미식·맞춤)
//   4. 사장님 맞춤 톤 UI 입력 필드
//   5. 사이드바 통계 메뉴 추가
const fs = require('fs')
const path = require('path')

const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const token = envContent.match(/GITHUB_TOKEN=([^\r\n]+)/)?.[1]?.trim()
const REPO = 'jty0221-del/localution'

const FILES = [
  // 1) 요기요 v1.6x
  ['worker/src/adapters/yogiyo.ts',                       'feat(yogiyo): v1.6x — 30일 정책 + 다중 매장 자동 감지'],
  ['worker/Dockerfile',                                   'chore(worker): CACHE_BUST 20260506T1100 (v1.6x)'],
  // 2) 답글 발행 통계
  ['app/api/reply-stats/route.ts',                        'feat(reply-stats): 답글 성공률·실패 원인 통계 API'],
  ['app/review-admin/stats/page.tsx',                     'feat(review-admin/stats): 답글 발행 통계 페이지'],
  // 3) AI 답글 톤 4종 + 맞춤
  ['app/api/ai-review-reply/route.ts',                    'feat(ai-review-reply): 톤 4종 추가 (감사·사과·미식·맞춤) + customPrompt 지원'],
  ['app/api/review-reply/draft/route.ts',                 'feat(review-reply/draft): VALID_TONES 확장'],
  ['app/review-admin/components/PlatformReviewAdmin.tsx', 'feat(PlatformReviewAdmin): 톤 4종 + 맞춤 톤 UI 입력 필드'],
  // 4) 사이드바
  ['app/components/Sidebar.tsx',                          'feat(Sidebar): 답글 발행 통계 메뉴 추가'],
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
  console.log('\ndone — v1.6y (5대 작업 완료)')
}
main().catch(console.error)
