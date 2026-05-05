// 5 menu template components + theme/public API + slug page + editor
const fs = require('fs')
const path = require('path')

const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const token = envContent.match(/GITHUB_TOKEN=([^\r\n]+)/)?.[1]?.trim()
if (!token) { console.error('No GITHUB_TOKEN'); process.exit(1) }
console.log('token:', token.slice(0, 10) + '...')

const REPO = 'jty0221-del/localution'

async function pushFile(repoPath, localPath) {
  const content = fs.readFileSync(path.join(__dirname, '..', localPath))
  const b64 = content.toString('base64')
  const shaRes = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + repoPath, {
    headers: { Authorization: 'token ' + token, Accept: 'application/vnd.github.v3+json' }
  })
  const shaJson = await shaRes.json()
  const sha = shaJson.sha
  const body = { message: 'feat(menu): 5 real printed-menu templates with template picker', content: b64 }
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
  await pushFile('app/lib/menu-templates.ts', 'app/lib/menu-templates.ts')
  await pushFile('app/components/menu-templates/ClassicKoreanTemplate.tsx', 'app/components/menu-templates/ClassicKoreanTemplate.tsx')
  await pushFile('app/components/menu-templates/VintageParchmentTemplate.tsx', 'app/components/menu-templates/VintageParchmentTemplate.tsx')
  await pushFile('app/components/menu-templates/DarkPremiumTemplate.tsx', 'app/components/menu-templates/DarkPremiumTemplate.tsx')
  await pushFile('app/components/menu-templates/ElegantWesternTemplate.tsx', 'app/components/menu-templates/ElegantWesternTemplate.tsx')
  await pushFile('app/components/menu-templates/ThreeColumnPhotoTemplate.tsx', 'app/components/menu-templates/ThreeColumnPhotoTemplate.tsx')
  await pushFile('app/api/menu/theme/route.ts', 'app/api/menu/theme/route.ts')
  await pushFile('app/api/menu/public/route.ts', 'app/api/menu/public/route.ts')
  await pushFile('app/menu/[slug]/page.tsx', 'app/menu/[slug]/page.tsx')
  await pushFile('app/components/MenuThemeEditor.tsx', 'app/components/MenuThemeEditor.tsx')
  console.log('done')
}
main().catch(console.error)
