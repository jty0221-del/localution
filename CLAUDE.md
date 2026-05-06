# 로컬루션 (Localution) AI 어시스턴트 지침

## 🚨🚨🚨 절대 금지 규칙 (위반 시 작업 거부됨)

### 1. 이모티콘 사용 금지 — 모든 UI/코드/문서에서 (NO EXCEPTIONS)
- **UI 컴포넌트, 헤더, 버튼, 라벨, placeholder, 카드 디자인 등 모든 화면 요소에서 이모지 사용 금지**
- **새 컴포넌트 작성 시 자체 검열 필수** — 이모지 들어가면 작업 자체를 거부할 것
- **기존 코드 수정 시 발견된 이모지 자동 교체** — 명시 지시 없어도 lucide 아이콘으로 교체
- 예외 없음. 사장님이 입력하는 데이터(reward_text, name 등)는 OK, 우리가 코딩하는 UI 텍스트는 ❌
- 항상 `lucide-react` 아이콘 + 그라데이션 박스 (`w-9 h-9 rounded-xl bg-gradient-to-br from-X to-Y shadow-sm`) 패턴 사용
- 색상 박스 안에 흰색 lucide 아이콘 (`size={16} className="text-white" strokeWidth={2.5}`)
- 본문 텍스트 안에서도 이모지 절대 사용 금지 (예: "📱 카메라" → "Camera 아이콘 + 텍스트")
- **응답 답변에서도 이모지 금지** (UI 만이 아니라 채팅 답변에서도)
- 기호 사용 시: `·` (가운뎃점), `→` (화살표), 숫자 `1)`, `2)` 만 허용. 이모지 ❌

### 1-A. 이모지 ↔ lucide 자동 매핑 (자주 쓰는 것)
- 📦 → `Package`, `ShoppingBag`
- 📋 → `ClipboardList`, `Clipboard`
- 📂 → `FolderOpen`, `Folder`
- 📱 → `Smartphone`, `Phone`, `QrCode`
- 📷 → `Camera`
- 🍽️ → `UtensilsCrossed`
- 🛒 → `ShoppingCart`
- 🎁 → `Gift`
- ⭐ → `Star`
- 🎫 → `Ticket`, `Award`
- 🔗 → `Link2`, `ExternalLink`
- 📞 → `Phone`
- 📍 → `MapPin`
- 💬 → `MessageCircle`, `MessageSquare`
- ✅ → `Check`, `CheckCircle2`
- ❌ → `X`, `XCircle`
- ⚠️ → `AlertTriangle`, `AlertCircle`
- 🔥 → `Flame`
- 💡 → `Lightbulb`
- 🎯 → `Target`
- 📊 → `BarChart3`
- 📈 → `TrendingUp`
- 📉 → `TrendingDown`
- 💰 → `Coins`, `DollarSign`
- 🏪 → `Store`
- ☕ → `Coffee`
- 🍕 → `Pizza`
- 🍰 → `Cake`
- 👥 → `Users`
- 👤 → `User`
- ⚙️ → `Settings`
- 🔍 → `Search`
- ✨ → `Sparkles`
- 🚀 → `Rocket`
- 🏆 → `Trophy`
- 📅 → `Calendar`
- ⏰ → `Clock`
- 📝 → `FileText`, `Edit3`
- 🔔 → `Bell`
- 📤 → `Upload`
- 📥 → `Download`
- 🌟 → `Sparkles`, `Star`
- 💯 → `CheckCircle2`

### 2. 모든 작업 = 세련된 디자인 필수
- 미니멀, 통일감, 현대적 디자인 표준 항상 적용
- 색상: 토스 스타일 #3182F6 (블루), #7C3AED (퍼플), #059669 (그린), #F59E0B (앰버), #DC2626 (레드)
- 그림자: `shadow-sm` 기본
- 라운드: `rounded-2xl` (카드), `rounded-xl` (버튼/입력), `rounded-lg` (작은 박스)
- 아이콘 박스: 항상 그라데이션 + ring + 흰색 lucide 아이콘
- 이미 통일된 PageHeader 컴포넌트 사용 (모든 페이지에 적용)
- 모바일 반응형 항상 고려 (`grid-cols-1 lg:grid-cols-2` 등)

### 3. 위 규칙 위반 시
- 사용자가 매번 지적해야 함
- 반복 실수 = 신뢰도 하락
- 새 컴포넌트 만들 때 항상 이 두 규칙 먼저 체크

---

## 🎯 서비스 정의
로컬루션은 자영업자·소상공인·마케터·보험설계사 등 
1인 사업자와 소규모 비즈니스를 위한 
AI 기반 올인원 비즈니스 자동화 플랫폼이다.

---

## 👥 주요 사용자 그룹

### 1. 소상공인·자영업자
- 카페, 식당, 미용실, 네일샵, 학원 등
- 네이버 플레이스 상위 노출이 중요
- 리뷰 관리, 고객 응대, 정산이 주요 업무
- 디지털 도구에 익숙하지 않은 경우 많음
- 핵심 니즈: 시간 절약, 매출 증대, 귀찮음 해결

### 2. 마케터·마케팅 대행사
- 여러 클라이언트 매장을 동시 관리
- SEO, 콘텐츠, 리뷰 관리가 주 업무
- 성과 리포트, 키워드 분석 필요
- 핵심 니즈: 업무 자동화, 클라이언트 관리, 성과 증명

### 3. 보험설계사·금융 전문가
- 고객 관계 관리(CRM)가 핵심
- 정기적인 고객 연락, 일정 관리 필요
- 계약 문서, 일정 알림 자동화 필요
- 핵심 니즈: 고객 이탈 방지, 신규 고객 발굴

### 4. 1인 기업·프리랜서
- 세금계산서, 견적서 발행
- 클라이언트 관리
- 홍보·마케팅 자동화
- 핵심 니즈: 행정 자동화, 전문성 어필

---

## 🤖 AI 응답 원칙

### 말투와 톤
- 친근하고 따뜻하게, 하지만 전문적으로
- 어려운 용어는 쉽게 풀어서 설명
- 실행 가능한 답변 위주로
- 비개발자도 이해할 수 있게
- "~하세요" 보다 "~해보세요", "~하면 돼요"

### 답변 방식
- 바로 실행 가능한 내용 먼저
- 단계별로 순서 있게 안내
- 예시와 함께 설명
- 복잡한 내용은 표나 목록으로 정리

---

## 💼 핵심 기능 영역

### 1. AI 리뷰·마케팅 자동화
- 네이버/배민/구글 통합 리뷰 관리
- AI 답글 생성 (말투 4종: 따뜻한/전문/유쾌/심플)
- Vision AI 사진 분석 답글
- SEO 키워드 자동 주입
- 숏폼 퍼블리셔 (틱톡/쇼츠/릴스/클립)
- 메뉴 사진 업스케일링

### 2. QR 리뷰 자동화
- QR 스캔 → 고객 맞춤 리뷰 생성
- 4단계: 정보입력→사진업로드→AI생성→플랫폼등록
- 네이버/구글/카카오 원클릭 등록

### 3. CRM·고객관리
- 고객 태그 관리 (VIP/단골/신규/블랙리스트)
- 단체 메시지 발송 ({고객명} 치환)
- 예약 발송 스케줄러
- 블랙컨슈머 방어망 (부천 연합 공유)

### 4. 정산·행정 자동화
- 매출 캘린더
- 세금계산서 원클릭 발행 (홈택스 연동)
- 근태 관리·급여 계산
- 정부지원금 알림 봇

### 5. 로컬 시너지 (개발 예정)
- 하이퍼 로컬 콜라보 (인근 매장 크로스 쿠폰)
- 노쇼 타임세일 알림
- 사장님 커뮤니티·공동구매

---

## 📌 자주 묻는 질문 대응 방식

### 네이버 플레이스 관련
- 상위 노출: 키워드+리뷰수+답글률이 핵심
- 리뷰 답글은 24시간 내 달기를 권장
- 사진 리뷰가 텍스트 리뷰보다 효과적

### 마케팅 관련
- 로컬 키워드 (지역명+업종) 조합 중요
- 숏폼 콘텐츠는 일관성이 핵심
- 고객 재방문율 높이는 것이 신규 고객보다 비용 효율적

### 정산·세금 관련
- 전문적인 세금 조언은 세무사 연결 권장
- 홈택스 연동 기능으로 간편화
- 미수금 관리는 월말 기준으로 정리 권장

### CRM 관련
- VIP 고객 기준: 월 3회 이상 방문 or 월 5만원 이상
- 재방문 유도 메시지는 마지막 방문 후 2주 이내
- 블랙리스트는 노쇼 3회 이상 또는 환불 분쟁

---

## 🚫 하지 말아야 할 것
- 확인되지 않은 법적·세무 조언 단정적으로 제공
- 개인정보 무단 수집·공유 권장
- 허위 리뷰 작성 도움
- 경쟁사 비방 콘텐츠 생성
- 스팸성 대량 메시지 발송 조장

---

## ✅ 우선순위 가치
1. 사장님 시간 절약
2. 매출 증대에 직접적 기여
3. 사용하기 쉽고 간단하게
4. 신뢰할 수 있는 정보 제공
5. 지역 상생과 커뮤니티 강화

---

## 🗺️ 서비스 로드맵
현재 완성:
- 메인 대시보드
- AI 리뷰·마케팅
- QR 리뷰 자동화
- 정산·행정
- CRM 고객관리

개발 중:
- 로컬 시너지
- 커뮤니티
- 보험설계사용 CRM 고도화
- 마케터용 멀티 매장 관리
- 프리랜서용 견적서·계약서

---

## 💡 핵심 메시지
"사장님, 이제 마케팅·정산·고객관리
전부 로컬루션 하나로 해결하세요.
복잡한 건 AI가 다 해드려요."

---

## ⚠️ 개발 환경 필수 지침 (실수 방지)

### Windows CMD 경로 규칙
- `~/Desktop` 은 **Windows CMD에서 절대 작동하지 않음** (macOS/Linux 전용)
- Windows CMD에서는 반드시 전체 경로 사용:
  ```
  cd C:\Users\pc\Desktop\localution
  ```
- 사용자에게 CMD 명령 안내 시 항상 `C:\Users\pc\Desktop\localution` 형식으로 제공

### GitHub 토큰 관리
- GitHub 토큰은 만료되면 빌드 스크립트에서 `Bad credentials (401)` 오류 발생
- 토큰 만료 확인: `build_*.js` 실행 시 `× Bad credentials` 메시지
- 토큰 갱신 경로: GitHub → Settings → Developer settings → Personal access tokens
- 갱신 후 `localution/.env.local` 의 `GITHUB_TOKEN=` 값 교체
- **주의**: `.env.local` 의 GITHUB_TOKEN 값은 토큰 문자열만 입력 (뒤에 `&& node ...` 등 명령어 절대 붙이면 안됨)

### 빌드 스크립트 실행 순서
- 반드시 `localution` 폴더 안에서 실행해야 함
- 올바른 실행 방법:
  ```
  cd C:\Users\pc\Desktop\localution
  node scripts/build_XXX.js
  ```
- `Cannot read properties of 'sha'` 오류 = 해당 파일이 GitHub 레포에 아직 없음 → `pushFile()` 로직에서 SHA 조회 실패. 신규 파일은 SHA 없이 PUT 요청해야 함

### 배포 확인 방법
- 빌드 스크립트 성공 후 Vercel 자동 빌드 시작 (1-2분 소요)
- 라이브 확인: https://localution.vercel.app
- 빌드 로그: https://vercel.com/dashboard

### .env.local 위치
- 경로: `C:\Users\pc\Desktop\localution\.env.local`
- 빌드 스크립트는 `localution/` 폴더에서 실행되므로 같은 폴더 내 `.env.local` 자동 로드됨

---

## 🚨 빌드 스크립트 필수 규칙 (Vercel 빌드 실패 예방)

### ❌ 절대 금지: template literal 안에 정규식 사용
- **원인**: JS `template literal` 안의 TypeScript 코드에 정규식이 있으면
  이스케이프가 2중으로 처리되어 Vercel TypeScript 컴파일 실패
- **실패 예시**:
  ```javascript
  const CODE = `
    function isUrl(s) {
      return /^https?:\\/\\//i.test(s)  // ← 이게 파일에서 깨짐
    }
  `
  ```
- **올바른 대안**: 정규식 대신 string 메서드로 교체
  ```javascript
  const CODE = `
    function isUrl(s) {
      const t = s.trim().toLowerCase()
      return t.startsWith('http://') || t.startsWith('https://')
    }
  `
  ```
- **규칙**: build_*.js 스크립트에서 template literal 안에 TypeScript 코드를 쓸 때,
  정규식(`/pattern/`) 사용을 원천 금지. `includes()`, `startsWith()`, `endsWith()` 로 대체.

### ❌ 절대 금지: 대형 파일 직접 수정 후 미검증 배포
- `app/page.tsx` 등 핵심 파일 수정 시 반드시 Vercel 빌드 로그 확인 후 다음 작업
- 빌드 실패 시: 즉시 `fix_page_syntax.js` 형태의 수정 스크립트 작성 → 우선 배포

### ✅ 빌드 스크립트 체크리스트
1. template literal 안 정규식 없는지 확인
2. TypeScript generics (`useState<Type>`) 올바른지 확인
3. JSX 속성에서 이중 따옴표 충돌 없는지 확인
4. 배포 후 1~2분 내 Vercel 빌드 로그 확인
5. 에러 시 해당 파일 · 라인 번호 메모 → 즉시 수정 배포

### 빌드 실패 시 긴급 대응 순서
1. Vercel 빌드 로그에서 에러 파일 · 라인 확인
2. `scripts/fix_파일명.js` 작성 (해당 부분만 교체)
3. `run_fix.bat` 으로 즉시 배포
4. QR 리뷰 등 신규 기능은 에러 수정 후 배포

---

## 📋 구현 완료 현황 (덮어쓰기 방지용)

> 빌드 에러 수정 시 아래 기능들이 덮어써지지 않도록 반드시 확인

### app/dashboard/page.tsx 핵심 기능
- **CommunityWidget** (지역 커뮤니티 위젯)
  - 위치: `function RankBadge` 바로 앞에 정의
  - lucide 아이콘: `MessageSquare, ThumbsUp, Flame, Users, RefreshCw` 필수
  - import: `import { COMMUNITY_REGIONS, haversineKm } from '../lib/regions-community'` 필수
  - JSX: `<CommunityWidget storeRegion={storeRegion} />` — ServiceRanking 위에 배치
  - 기능: 📍내 위치(GPS 자동감지) 버튼 + 🔄새로고침 + 전국/지역 토글
  - 데이터: `COMMUNITY_SAMPLE` (지역별 샘플 게시글 14개), `REGION_ID_MAP`, `CAT_STYLE`
- **keyword-rank 연동**
  - `syncKeywordsFromRank()` — `localution.krank_saved_v1` 에서 등록 키워드 로드
  - fallback: 프로필 기반 자동 생성
- **빠른 이동(QuickNav)** — 제거됨 (JSX에서 `<QuickNav />` 호출 없어야 함)

### 빌드 에러 수정 시 체크리스트
1. `CommunityWidget` 함수가 존재하는가?
2. `CommunityWidget`의 닫는 `}` 가 제대로 있는가?
3. lucide import에 `MessageSquare, ThumbsUp, Flame, Users, RefreshCw` 있는가?
4. `regions-community` import 있는가?
5. JSX에 `<CommunityWidget storeRegion={storeRegion} />` 있는가?

### 사이드바 (app/components/Sidebar.tsx) 현재 메뉴명
- `블로그 글 작성` (/marketing/blog-post)
- `블로그 지수조회/분석` (/marketing/blog-index)
- `키워드 조회/분석` (/marketing/naver-ads)
- `블로그 글 작성` (/marketing/blog-post)
- 플랫폼 연결 설명: "리뷰·마케팅" / "시작 전 필수" (두 줄)

### app/marketing/naver-ads/page.tsx
- 탭: `키워드 조회` / `분석` (volume/suggest)
- 제목: `키워드 조회/분석`
- 부제: `키워드별 검색량·트렌드·콘텐츠 포화도를 한눈에 — 소상공인 마케팅 인사이트 플랫폼`