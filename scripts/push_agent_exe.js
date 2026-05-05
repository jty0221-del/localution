// yt_community_agent.exe → public/downloads/ 업로드
// 파일이 크므로 시간이 걸릴 수 있습니다 (1~2분)
const fs = require('fs')
const path = require('path')

const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const token = envContent.match(/GITHUB_TOKEN=([^\r\n]+)/)?.[1]?.trim()
if (!token) { console.error('No GITHUB_TOKEN'); process.exit(1) }

const REPO = 'jty0221-del/localution'
const EXE_SRC = path.join('C:\\Users\\pc\\Desktop\\코워크\\dist\\yt_community_agent.exe')
const REPO_PATH = 'public/downloads/yt_community_agent.exe'

async function main() {
  console.log('exe 파일 읽는 중...')
  const content = fs.readFileSync(EXE_SRC)
  const sizeMB = (content.length / 1024 / 1024).toFixed(1)
  console.log(`파일 크기: ${sizeMB}MB — base64 인코딩 중...`)
  const b64 = content.toString('base64')
  console.log('GitHub SHA 조회 중...')

  const shaRes = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + REPO_PATH, {
    headers: { Authorization: 'token ' + token, Accept: 'application/vnd.github.v3+json' }
  })
  const shaJson = await shaRes.json()
  const sha = shaJson.sha

  const body = {
    message: 'feat(agent): yt_community_agent.exe v1.0.0 배포',
    content: b64,
  }
  if (sha) {
    body.sha = sha
    console.log('기존 파일 업데이트 중...')
  } else {
    console.log('신규 파일 업로드 중... (시간이 걸릴 수 있습니다)')
  }

  const res = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + REPO_PATH, {
    method: 'PUT',
    headers: {
      Authorization: 'token ' + token,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (res.ok) {
    console.log('OK', REPO_PATH, json.commit?.sha?.slice(0, 8))
    console.log('다운로드 주소: https://www.localution.co.kr/downloads/yt_community_agent.exe')
  } else {
    console.error('ERR', res.status, json.message)
  }
}
main().catch(console.error)
