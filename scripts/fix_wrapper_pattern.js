// Wrapper 패턴 자동 수정:
// 1) <div className="flex min-h-screen bg-[#XXX]">
//      <Sidebar />
//      <main className="flex-1 ml-0 md:ml-[220px] ...max-w-[1400px]...">
//      ...
//    </div>
// →
//    <div className="min-h-screen bg-[#F8F9FA]">
//      <Sidebar />
//      <main className="md:ml-[220px] flex flex-col min-h-screen ...max-w-6xl mx-auto">
//      ...
//    </div>
const fs = require('fs')
const path = require('path')

const TARGETS = [
  'app/community/page.tsx',
  'app/marketing/blog-index/page.tsx',
  'app/marketing/blog-post/page.tsx',
  'app/marketing/blog-tracking/page.tsx',
  'app/marketing/card-news/page.tsx',
  'app/marketing/keyword-score/page.tsx',
  'app/marketing/place/page.tsx',
  'app/marketing/reels/page.tsx',
  'app/marketing/threads/page.tsx',
  'app/marketing/threads/connect/page.tsx',
  'app/marketing/youtube-community/page.tsx',
  'app/marketing/page.tsx',
  'app/qr/page.tsx',
  'app/qr-admin/page.tsx',
  'app/reservations/page.tsx',
  'app/reviews/page.tsx',
  'app/settings/page.tsx',
  'app/settings/connect/page.tsx',
  'app/settings/profile/page.tsx',
  'app/settlement/page.tsx',
  'app/my/page.tsx',
  'app/my/platforms/page.tsx',
  'app/my/stamps/page.tsx',
  'app/my/subscription/page.tsx',
  'app/partner-points/page.tsx',
  'app/review-admin/page.tsx',
  'app/review-admin/coupang/page.tsx',
  'app/review-admin/google/page.tsx',
  'app/review-admin/kakao/page.tsx',
  'app/review-admin/naver/page.tsx',
  'app/review-admin/baemin/page.tsx',
  'app/review-admin/yogiyo/page.tsx',
  'app/review-admin/naver-health/page.tsx',
  'app/review-admin/naver/autoreply/page.tsx',
]

const ROOT = path.join(__dirname, '..')
let fixed = []
let skipped = []

for (const rel of TARGETS) {
  const full = path.join(ROOT, rel)
  if (!fs.existsSync(full)) { skipped.push(rel + ' (not found)'); continue }
  let content = fs.readFileSync(full, 'utf8')
  const orig = content

  // 1) flex min-h-screen 외부 div + main 내부 패턴 → standard
  content = content.replace(
    /<div className="flex min-h-screen bg-\[#F[28]F[490]F[A6]\]"[^>]*>\s*<Sidebar \/>\s*<main className="flex-1 ml-0 md:ml-\[220px\]([^"]*)"/g,
    '<div className="min-h-screen bg-[#F8F9FA]"><Sidebar /><main className="md:ml-[220px] flex flex-col min-h-screen$1"'
  )

  // 2) max-w-[1400px], max-w-[1200px] → max-w-6xl
  content = content.replace(/max-w-\[1400px\]/g, 'max-w-6xl mx-auto')
  content = content.replace(/max-w-\[1200px\]/g, 'max-w-6xl mx-auto')

  // 3) pt-14 md:pt-0 / pt-16 md:pt-0 (mobile top nav 보정 — 이제 PageHeader 가 처리)
  //   주의: 일부 페이지는 mobile 전용 TopNav 표시할 수 있어 단순 제거는 위험
  //   pt-14 / pt-16 만 띄어쓰기와 함께 제거 (단독 클래스로 있을 때만)
  content = content.replace(/\bpt-14 md:pt-0\b/g, 'pt-4 md:pt-0')
  content = content.replace(/\bpt-16 md:pt-0\b/g, 'pt-4 md:pt-0')

  if (content !== orig) {
    fs.writeFileSync(full, content, 'utf8')
    fixed.push(rel)
  } else {
    skipped.push(rel + ' (no changes)')
  }
}

console.log('=== FIXED', fixed.length, 'files ===')
fixed.forEach(f => console.log(' OK', f))
console.log('\n=== SKIPPED', skipped.length, 'files ===')
skipped.forEach(f => console.log(' --', f))
