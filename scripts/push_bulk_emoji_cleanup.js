// 이모지 제거 일괄 푸시 — Git Tree API 로 단일 커밋 생성 (수백 파일 효율적)
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const env = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const token = env.match(/GITHUB_TOKEN=([^\r\n]+)/)[1].trim()
const REPO = 'jty0221-del/localution'
const BRANCH = 'main'

async function gh(p, opts = {}) {
  const res = await fetch(`https://api.github.com/repos/${REPO}${p}`, {
    ...opts,
    headers: {
      Authorization: 'token ' + token,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  })
  const text = await res.text()
  let json = {}
  try { json = text ? JSON.parse(text) : {} } catch {}
  if (!res.ok) {
    console.error('GH ERR', res.status, p, json.message || text.slice(0, 200))
    throw new Error(`GitHub ${res.status}: ${json.message || ''}`)
  }
  return json
}

async function main() {
  // 1) 변경된 파일 목록 (git status -- M, untracked .tsx 포함)
  const out = execSync('git status --short', { cwd: path.join(__dirname, '..'), encoding: 'utf8' })
  const lines = out.split('\n').filter(Boolean)
  const files = []
  for (const line of lines) {
    const status = line.slice(0, 2).trim()
    const file = line.slice(3).trim()
    // M, A, ?? 모두 처리, D 제외
    if (status === 'D' || file.startsWith('_backups/')) continue
    if (file.startsWith('"') && file.endsWith('"')) continue
    if (!file.endsWith('.tsx') && !file.endsWith('.ts') && !file.endsWith('.jsx') && !file.endsWith('.js')) continue
    files.push(file)
  }
  console.log('Total files to push:', files.length)
  if (files.length === 0) return

  // 2) 현재 main HEAD SHA 가져오기
  const ref = await gh(`/git/ref/heads/${BRANCH}`)
  const baseSha = ref.object.sha
  console.log('Base SHA:', baseSha)

  // 3) 베이스 커밋의 트리 SHA
  const baseCommit = await gh(`/git/commits/${baseSha}`)
  const baseTreeSha = baseCommit.tree.sha
  console.log('Base tree:', baseTreeSha)

  // 4) 각 파일을 blob 으로 만들기 (한꺼번에 — concurrent 8)
  const blobs = []
  let done = 0
  const queue = [...files]
  async function worker() {
    while (queue.length > 0) {
      const file = queue.shift()
      if (!file) return
      const full = path.join(__dirname, '..', file)
      if (!fs.existsSync(full)) continue
      const content = fs.readFileSync(full, 'utf8')
      const blob = await gh('/git/blobs', {
        method: 'POST',
        body: JSON.stringify({ content, encoding: 'utf-8' }),
      })
      blobs.push({ path: file.replace(/\\/g, '/'), mode: '100644', type: 'blob', sha: blob.sha })
      done++
      if (done % 25 === 0) console.log(`  blobs ${done}/${files.length}`)
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker))
  console.log('Blobs created:', blobs.length)

  // 5) 새 트리 생성 (base_tree 위에 변경분만 추가)
  const newTree = await gh('/git/trees', {
    method: 'POST',
    body: JSON.stringify({ base_tree: baseTreeSha, tree: blobs }),
  })
  console.log('New tree:', newTree.sha)

  // 6) 새 커밋 생성
  const commit = await gh('/git/commits', {
    method: 'POST',
    body: JSON.stringify({
      message: 'chore(ui): 모든 페이지 이모지·이모티콘 일괄 제거 (CLAUDE.md 규칙 준수, 화살표·체크·별 등 기본 기호 보존)',
      tree: newTree.sha,
      parents: [baseSha],
    }),
  })
  console.log('New commit:', commit.sha)

  // 7) 브랜치 ref 업데이트
  await gh(`/git/refs/heads/${BRANCH}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: commit.sha }),
  })
  console.log('Branch updated. Done.')
}

main().catch(e => { console.error(e); process.exit(1) })
