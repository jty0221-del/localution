# 로컬루션 개발 환경 설정 — 단계별 가이드

## 📌 현재 상황 (2026-05-05 기준)

배민 자동화 v1.6n 배포 대기 중. Railway Worker 가 v1.6l 까지 활성화 상태에서 ws polyfill 빌드 중.

**진행 상황 한눈에**:
- ✅ 배민 ID/PW 저장 + Worker 자동 fetch (16건 리뷰 정상 수집)
- ✅ 매일 KST 13시 자동 cron
- ✅ 30일 경과 안내 모달 + 배지
- ⏳ **답글 자동 발행** (v1.6n + 30일 이내 리뷰로 테스트 대기)

---

## 🛠️ 1단계: 로컬 npm install (1회만)

### Windows CMD 또는 PowerShell

```cmd
cd C:\Users\pc\Desktop\localution
```

### Vercel (Web) 의존성 설치

```cmd
npm install
```

설치되는 주요 패키지:
- `next` 14.0.0 (웹 프레임워크)
- `@supabase/supabase-js` (DB)
- `bullmq` + `ioredis` (큐)
- `undici` 5.28.4 (한국 프록시 fetch)
- `web-push`, `qrcode`, `jspdf` 등

### Railway Worker 의존성 설치 (선택)

Worker 코드 로컬 수정·테스트 시:

```cmd
cd worker
npm install
cd ..
```

또는 한 번에:

```cmd
npm run install:all
```

---

## 🚀 2단계: 빌드 검증 (배포 전 안전망)

```cmd
npm run build:check
```

- ❌ 에러 나면 → 코드 수정 후 재실행
- ✅ "✓ Compiled successfully" 보이면 푸시 OK

---

## 📤 3단계: 배포

### 방법 A: 우리가 만든 push 스크립트 (현재 사용 중)

GitHub API 로 직접 파일 업로드. 로컬 git 없이 가능:

```cmd
node scripts/push_baemin_v1_6n.js
```

해당 스크립트가 자동으로:
1. `.env.local` 에서 GITHUB_TOKEN 읽음
2. 변경된 파일만 GitHub repo 에 PUT
3. Vercel + Railway 가 commit 감지 → 자동 빌드

### 방법 B: 일반 git push (필요시)

```cmd
git add .
git commit -m "변경 내용"
git push origin main
```

---

## ✅ 4단계: 배민 답글 자동 발행 테스트 (지금 해야 할 것)

### 4-1. Worker v1.6n 활성화 대기

1. https://railway.app → localution → Worker
2. **Deployments** 탭에서 최신 deployment 가 **"Active"** 인지 확인
3. 만약 stuck → 우상단 **⋯ → Redeploy** 클릭
4. 1-3분 대기

### 4-2. 라이브 페이지 강력 새로고침

```
https://www.localution.co.kr/review-admin/baemin
```

**Ctrl + Shift + R** (캐시 무시)

### 4-3. 30일 이내 리뷰 찾기

스크롤하면서:
- ⏰ "30일 경과" 배지가 **없는** 리뷰 찾기
- 예: 2026-04-12 작성 (약 23일 전) — **김나니** 같은 리뷰
- 답변완료(✅) 가 아닌 미답변 리뷰 선택

### 4-4. AI 답글 생성

1. 리뷰 카드 안의 **"AI 답글 작성"** 버튼 클릭
2. 톤 선택 (따뜻한 / 전문적 / 유쾌한 / 심플)
3. AI 가 초안 생성 (10-20초)
4. 초안 확인 후 필요 시 수정

### 4-5. 자동 발행 클릭

1. **"⚡ 자동 발행"** 파란 버튼 클릭
2. "답글 발행 요청을 보냈어요!" 토스트 메시지
3. 1-2분 대기 (Worker 가 백그라운드 처리)

### 4-6. 결과 확인

페이지 새로고침 (Ctrl+Shift+R) 후:
- ✅ "답변완료" 녹색 배지
- 답글 본문이 리뷰 아래에 표시
- 배민 self-service 페이지 (https://self.baemin.com/shops/14637452/reviews) 에서도 답글 등록 확인

---

## 🔍 5단계: 문제 발생 시 진단

### Railway Worker 로그 확인

1. https://railway.app → localution → Worker → **Logs** 탭
2. 다운로드 (Download logs) → 파일을 공유

### 필수 체크 메시지

| 메시지 | 의미 |
|---|---|
| `worker ready` | Worker 정상 시작 |
| `BAEMIN_ADAPTER_VERSION_MARKER version=v1.6n` | v1.6n 적용 확인 |
| `cookies injected from save-login` | 쿠키 사용 정상 |
| `posting reply via in-browser fetch (v1.6l)` | 답글 발행 시도 |
| `reply attempts (v1.6l) attempts=[...]` | 3-variant 시도 결과 |
| `reply success ✓` | **성공!** |

### Vercel 빌드 로그 확인

1. https://vercel.com/dashboard → localution
2. 최신 deployment 클릭
3. Build Logs 확인

---

## 📚 6단계: 일상 운영 (배포 완료 후)

### 매일 자동 작동

- **KST 13:00**: 모든 배달 플랫폼 (배민/쿠팡/요기요) 자동 fetch
- **새 리뷰 시**: Web Push + 카카오톡 알림 (별점 1-2점 우선)
- **사장님 액션**: AI 답글 클릭 한 번 → 자동 발행 (12-30초)

### 사장님이 신경 쓸 것

- 배민은 **30일 이내** 리뷰만 답글 가능 (배민 정책)
- → 가급적 24시간 내 답글 권장
- 우리 알림 시스템이 즉시 알려드리니 놓치지 마시길

---

## 🆘 자주 막히는 곳

| 증상 | 해결 |
|---|---|
| Vercel 빌드 실패 | `npm run build:check` 로컬 먼저 |
| Worker stuck | Railway 대시보드 manual Redeploy |
| 답글 발행 실패 | 30일 초과 리뷰일 가능성 (배지 확인) |
| 캐시 문제 | Ctrl+Shift+R 강력 새로고침 |
| 쿠키 만료 | 모달의 「자동 로그인」 버튼 (개발자용) |

---

## 💾 자동 백업 메모리

다음 세션에서 자동 참조되는 메모리 파일:
- `~/.claude/.../memory/project_baemin_v1_6j_fix.md` — 배민 v1.6 시리즈 25+ 디버그 종합
- `~/.claude/.../memory/project_coupangeats_v76.md` — 쿠팡이츠 v76 (DO NOT BREAK)
- `~/.claude/.../memory/feedback_no_emojis_refined_design.md` — 디자인 절대 규칙
