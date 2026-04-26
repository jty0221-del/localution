# 세션 로그 — 네이버 리뷰 자동답글 완성 (2026-04-27)

> 작업 시간: 2026-04-27 AM (약 3-4시간)
> 목표: 네이버 플레이스 리뷰 답글 완전 자동화 (Worker가 직접 SmartPlace에 등록)

---

## 📋 작업 전 상황

- "자동발행" 클릭 시 Worker가 Railway Tokyo에서 실행
- IP 차단으로 폼 로그인 실패 → "등록 실패" 반복
- 세션쿠키 방식 시도했으나 쿠키 저장이 안 됨 (Supabase URL 불일치)
- SmartPlace 리뷰 페이지 진입 후 `totalCards: 0`

---

## 🔧 수정한 파일 목록 및 커밋

| 파일 | 커밋 | 내용 |
|------|------|------|
| `worker/src/adapters/naver.ts` | `eda5fd0` | 특정 리뷰 URL로 직접 이동 (networkidle) |
| `worker/src/adapters/naver.ts` | `62530e7` | 2단계 이동: 대시보드 → reviews 페이지 명시 |
| `worker/src/adapters/naver.ts` | `d8171dd` | reviewCard 선택자 확장 + 직접 버튼 탐색 폴백 |
| `worker/src/adapters/naver.ts` | `4126532` | TypeScript 빌드 오류 수정 (evaluateHandle 제거) |
| `worker/src/adapters/naver.ts` | `526e4bb` | reply_content 컬럼 제거 (DB 스키마 불일치) |
| `worker/src/lib/credentials.ts` | `96c7f42` | loadCookieData: platform_credentials.extra_data 1순위 |
| `app/api/platform-accounts/naver-cookie/route.ts` | `c6f941f` | saveCookieJson: extra_data에 저장 |
| `app/my/platforms/naver_place/session/page.tsx` | `985032a` | 쿠키 붙여넣기 UI (NID_AUT/SES 자동 파싱) |
| `app/review-admin/components/PlatformReviewAdmin.tsx` | `794f450` | submitted 상태 처리 + 답글 내용 표시 |
| `app/api/stores/me/route.ts` | `d22ae8b` | 미답변 카운트: reply_status='submitted' 제외 |
| `app/api/place/reviews/route.ts` | `5757ee5` | unreplied_count: submitted 제외 |
| `app/dashboard/page.tsx` | `9d38eb4` | 대시보드 미답변/답변완료 표시 통일 |

---

## 🐛 발견 및 해결한 버그

### 1. Supabase URL 불일치 (핵심 원인)
- **증상**: `hasCookieData: false` — Worker가 쿠키를 못 읽음
- **원인**: Vercel은 `NEXT_PUBLIC_SUPABASE_URL`, Worker는 `SUPABASE_URL` (다른 인스턴스)
- **해결**: `naver_session_cookies` 테이블 대신 `platform_credentials.extra_data` 사용

### 2. detectLoginFailure 오탐 (false positive)
- **증상**: `login error text matched: 비밀번호` — 쿠키 로그인 성공했는데 실패 처리
- **원인**: "비밀번호"가 네이버 로그인 폼 라벨에 항상 존재
- **해결**: 오류 키워드를 `['일치하지', '잘못된', '실패', '오류', 'incorrect', 'invalid', '차단', '해외']`로 축소

### 3. totalCards: 0 (리뷰 카드 못 찾음)
- **증상**: SmartPlace 이동 후 리뷰 카드 0개
- **원인**: `/bizes/place/10441797/reviews/REVIEW_ID` → SmartPlace가 `/bizes/place/10441797` (대시보드)로 리다이렉트
- **해결**: 2단계 이동 — 대시보드 이동 후 actualPlaceId 추출 → `/bizes/place/{actualPlaceId}/reviews` 명시적 이동

### 4. Railway TypeScript 빌드 실패
- **증상**: `evaluateHandle` + `asElement` 타입 에러
- **해결**: 단순 `page.$('button:has-text(...)')` 체이닝으로 대체

### 5. reply_content 컬럼 없음
- **증상**: `PGRST204: Could not find the 'reply_content' column`
- **해결**: updateReviewStatus에서 `reply_content` 필드 제거

### 6. "등록 실패" 표시 / "초안 이어서 편집" 오표시
- **증상**: 실제 등록됐는데 UI에 "등록 실패" + "초안 이어서 편집"
- **원인**: `isSubmitted = reply_status === 'submitted' && has_reply === true` (AND 조건) — DB 업데이트 실패한 이전 케이스
- **해결**: `isSubmitted = reply_status === 'submitted'` (has_reply 무관)

---

## ✅ 최종 완성 상태

### Worker 동작 (Railway Tokyo)
```
[loadCookieData] hasCred: true, hasCookieInExtra: true  ✅
naver: session cookie login OK  ✅
naver: navigating to store dashboard first  ✅
naver: actual place ID from redirect: 10441797  ✅
naver: navigating to reviews page  ✅
naver: total review cards found: 23  ✅
naver: using first unanswered card  ✅
naver: reply submitted  ✅
[updateReviewStatus] SUCCESS rows: [{"reply_status":"submitted"}]  ✅
job done: result: ok  ✅
```

### UI 상태
- 리뷰 관리: `submitted` → "✅ 등록 완료" + 답글 내용 녹색 박스
- 대시보드: 미답변 카운트 정확 (submitted 제외)
- 대시보드 최근 리뷰: "답변완료" 뱃지 정상 표시

---

## 📁 주요 파일 현재 역할

### Worker
| 파일 | 역할 |
|------|------|
| `worker/src/adapters/naver.ts` | SmartPlace 자동답글 핵심 로직 |
| `worker/src/lib/credentials.ts` | `loadCookieData()` — extra_data 우선 |
| `worker/src/lib/diagnostics.ts` | `dumpPageDiagnostics()` — 실패 시 페이지 상태 로깅 |

### Vercel API
| 파일 | 역할 |
|------|------|
| `app/api/platform-accounts/naver-cookie/route.ts` | 쿠키 저장 (GET/POST) |
| `app/api/review-reply/auto-publish/route.ts` | 자동발행 큐 등록 |
| `app/api/stores/me/route.ts` | 플랫폼별 통계 (미답변 카운트) |
| `app/api/place/reviews/route.ts` | 리뷰 목록 + 요약 |

### UI
| 파일 | 역할 |
|------|------|
| `app/my/platforms/naver_place/session/page.tsx` | 쿠키 붙여넣기 페이지 |
| `app/review-admin/components/PlatformReviewAdmin.tsx` | 리뷰 관리 공통 컴포넌트 |
| `app/dashboard/page.tsx` | 대시보드 미답변/최근리뷰 |

---

## ⚠️ 향후 개선 사항 (현재 한계)

1. **리뷰 매칭 정확도**: SmartPlace DOM에 `data-review-id` 없음 → 현재 "첫 번째 미답변 카드" 방식
   - 개선: SmartPlace 내부 API 엔드포인트 발견 시 `/api/bizes/{placeId}/reviews/{reviewId}/reply` 직접 호출
2. **쿠키 만료 알림**: 약 2주마다 갱신 필요 → 만료 시 자동 알림 발송 기능 추가 예정
3. **has_reply 동기화**: Worker가 `has_reply=true` 설정하지만 SmartPlace에서 실제 답글 여부를 주기적으로 재수집해서 동기화하면 더 정확

---

## 🔑 중요 설정값 (변경 시 여기에 기록)

| 항목 | 값 | 위치 |
|------|----|----|
| bizId | `10441797` | `platform_credentials.platform_store_id` |
| actualPlaceId | `10441797` | SmartPlace 리다이렉트 후 URL에서 추출 |
| BullMQ 큐 이름 | `platform-jobs` | Railway Worker |
| Railway Supabase URL | `https://agmjplxyviyaspnokbjs.supabase.co` | Railway Variables > SUPABASE_URL |
| 쿠키 저장 경로 | `platform_credentials.extra_data.naver_session_cookie` | Supabase DB |
