// seed_app_updates.js — app_updates 테이블 초기 데이터 삽입
// 실행: node scripts/seed_app_updates.js
const fs = require('fs'), path = require('path')

const env = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const getVar = (k) => env.match(new RegExp(k + '=([^\r\n]+)'))?.[1]?.trim()

// Vercel/Railway 환경변수에서 읽거나 로컬 .env.local 폴백
const SUPABASE_URL = getVar('NEXT_PUBLIC_SUPABASE_URL') || process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = getVar('SUPABASE_SERVICE_ROLE_KEY') || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 없음')
  console.error('→ .env.local 에 추가하거나 환경변수로 설정해주세요')
  process.exit(1)
}

const UPDATES = [
  // 2026년 5월
  { title: '스레드(Threads) 자동 발행', summary: 'Meta Threads에 글을 즉시 발행하거나 예약 발행합니다. 이미지 드래그앤드롭, 답글 체인(최대 6개), 해시태그 자동 연동, 카드뉴스 연동 지원.', category: 'feature', released_at: '2026-05-05', sort_order: 10 },
  { title: '유튜브 커뮤니티 자동 업로드', summary: '유튜브 채널 커뮤니티 탭에 글을 자동으로 올리고 첫 번째 댓글까지 달고 고정합니다.', category: 'feature', released_at: '2026-05-04', sort_order: 9 },
  { title: '쿠팡이츠 리뷰 관리', summary: '쿠팡이츠 리뷰도 네이버·배민처럼 AI가 답글을 자동으로 만들어 드립니다.', category: 'feature', released_at: '2026-05-03', sort_order: 8 },
  { title: '업데이트 내역 페이지', summary: '새로 추가된 기능과 앞으로 나올 기능을 한눈에 볼 수 있는 페이지가 생겼습니다.', category: 'feature', released_at: '2026-05-02', sort_order: 7 },
  // 2026년 4월
  { title: '카드뉴스 자동 제작', summary: '인스타그램용 카드뉴스를 AI가 자동으로 만들어 드립니다. 업종과 주제만 넣으면 바로 완성됩니다.', category: 'feature', released_at: '2026-04-28', sort_order: 6 },
  { title: '릴스·숏폼 콘텐츠 제작', summary: '틱톡, 유튜브 쇼츠, 인스타 릴스에 올릴 영상 대본을 AI가 만들어 드립니다.', category: 'feature', released_at: '2026-04-25', sort_order: 5 },
  { title: '지역 커뮤니티', summary: '같은 지역 사장님들끼리 정보를 나누고 소통할 수 있는 공간입니다.', category: 'feature', released_at: '2026-04-22', sort_order: 4 },
  { title: 'QR 리뷰 자동화', summary: 'QR 스캔 → AI 리뷰 생성 → 네이버·구글 원터치 등록. 손님이 한 번 터치로 리뷰를 남길 수 있습니다.', category: 'feature', released_at: '2026-04-20', sort_order: 3 },
  { title: '블로그 순위 추적', summary: '내가 쓴 블로그 글이 네이버에서 몇 위에 뜨는지 주기적으로 확인합니다.', category: 'feature', released_at: '2026-04-15', sort_order: 2 },
  { title: '플레이스 실시간 순위 확인', summary: '내 가게가 네이버 플레이스 검색 결과에서 몇 위에 뜨는지 실시간으로 알 수 있습니다.', category: 'feature', released_at: '2026-04-10', sort_order: 1 },
  // 2026년 3월
  { title: '리뷰 통합 관리 (네이버·구글·카카오·배민·요기요)', summary: '여러 플랫폼 리뷰를 한 곳에서 관리하고 AI가 답글을 자동 생성합니다. 말투 4종 선택 가능.', category: 'feature', released_at: '2026-03-20', sort_order: 5 },
  { title: '블로그 글 자동 작성', summary: '가게 정보를 입력하면 네이버 블로그 글을 AI가 대신 써줍니다.', category: 'feature', released_at: '2026-03-15', sort_order: 4 },
  { title: '키워드 조회·분석', summary: '어떤 단어로 검색을 많이 하는지, 경쟁이 얼마나 치열한지 한눈에 볼 수 있습니다.', category: 'feature', released_at: '2026-03-12', sort_order: 3 },
  { title: '고객 관리(CRM)', summary: '단골·신규·VIP 손님을 구분해서 관리하고, 문자나 카카오 메시지를 한 번에 보낼 수 있습니다.', category: 'feature', released_at: '2026-03-08', sort_order: 2 },
  { title: '대시보드', summary: '매장의 리뷰·키워드·활동 현황을 한 화면에서 한눈에 볼 수 있습니다.', category: 'feature', released_at: '2026-03-01', sort_order: 1 },
]

async function upsertUpdate(item) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/app_updates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Prefer': 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({ ...item, active: true }),
  })
  const text = await res.text()
  if (!res.ok && res.status !== 409) {
    console.error('FAIL', item.title, res.status, text.slice(0, 200))
    return false
  }
  console.log('OK', item.title)
  return true
}

;(async () => {
  console.log(`${UPDATES.length}개 업데이트 내역 삽입 시작...\n`)
  let ok = 0
  for (const u of UPDATES) {
    if (await upsertUpdate(u)) ok++
    await new Promise(r => setTimeout(r, 100))
  }
  console.log(`\n완료: ${ok}/${UPDATES.length}개 삽입됨`)
})()
