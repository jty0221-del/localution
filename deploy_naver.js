// __LOCALUTION_ENV_BOOTSTRAP__
try { require('dotenv').config({ path: require('path').join(__dirname, '.env.local') }); } catch (_) {}
if (!process.env.GITHUB_TOKEN) { console.error('GITHUB_TOKEN 없음'); process.exit(1); }

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const TOKEN  = process.env.GITHUB_TOKEN;
const REPO   = 'jty0221-del/localution';
const BRANCH = 'main';

const FILES = [
  { local: 'worker/src/index.ts',              remote: 'worker/src/index.ts' },
  { local: 'worker/src/adapters/naver.ts',     remote: 'worker/src/adapters/naver.ts' },
  { local: 'worker/src/adapters/coupangeats.ts', remote: 'worker/src/adapters/coupangeats.ts' },
  { local: 'worker/src/adapters/baemin.ts',    remote: 'worker/src/adapters/baemin.ts' },
]

function encodePath(p) { return p.split('/').map(s => encodeURIComponent(s)).join('/'); }

function api(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com', path: urlPath, method,
      headers: {
        'Authorization': 'token ' + TOKEN,
        'User-Agent':    'localution-deploy',
        'Content-Type':  'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function fetchSha(remotePath) {
  const res = await api('GET', '/repos/' + REPO + '/contents/' + encodePath(remotePath) + '?ref=' + BRANCH);
  return (res && res.sha) ? res.sha : null;
}

async function pushFile(localRel, remotePath) {
  const localAbs = path.join(__dirname, localRel);
  if (!fs.existsSync(localAbs)) { console.error('파일 없음:', localAbs); return; }
  const content = fs.readFileSync(localAbs);
  const b64     = content.toString('base64');
  const sha     = await fetchSha(remotePath);
  const body    = {
    message: 'fix: proxy 기본 프로토콜 socks5로 변경 — Chromium 91+ HTTP Basic proxy auth 차단 우회',
    content: b64, branch: BRANCH
  };
  if (sha) body.sha = sha;
  const res = await api('PUT', '/repos/' + REPO + '/contents/' + encodePath(remotePath), body);
  if (res.content && res.content.name) {
    console.log('✓', remotePath);
  } else {
    console.error('✗', remotePath, JSON.stringify(res).slice(0, 200));
  }
}

async function main() {
  console.log('배포 중...');
  for (const f of FILES) await pushFile(f.local, f.remote);
  console.log('\n✅ GitHub 푸시 완료 — Railway 자동 재빌드 시작');
  console.log('');
  console.log('변경 내용:');
  console.log('  tryNaverReplyAPI 호출 제거 (항상 404)');
  console.log('  모든 에러 메시지에서 쿠키 언급 제거');
  console.log('  로그인 실패 → 아이디/비밀번호/프록시 안내');
  console.log('');
  console.log('Railway에 추가할 환경변수:');
  console.log('  PROXY_HOST     (예: geo.iproyal.com)');
  console.log('  PROXY_PORT     (예: 12321)');
  console.log('  PROXY_USER     (IPRoyal 계정명)');
  console.log('  PROXY_PASS     (IPRoyal 비밀번호)');
  console.log('  TWOCAPTCHA_API_KEY  (2captcha API 키)');
}

main().catch(e => { console.error(e); process.exit(1); });
