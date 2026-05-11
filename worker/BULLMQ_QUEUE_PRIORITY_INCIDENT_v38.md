# BullMQ 큐 우선순위 이슈 + dedup 회귀 방지 가이드 (v38)

작성일: 2026-05-12
영향: 네이버 답글 자동 발행 (post_reply 잡)
심각도: HIGH (사장님 1버튼 발행이 1시간+ 지연)

---

## 사고 요약

사장님이 [답글 발행] 버튼을 51번 반복 클릭 → 같은 리뷰가 BullMQ `prioritized` 큐에 51회 중복 enqueue 됨. 큐가 적체되고 워커가 priority 1 잡을 picking up 못 하는 이중 문제 발생.

### 발견된 3가지 근본 원인

#### 1. 같은 리뷰 51회 중복 enqueue
- `auto-publish`, `retry-queued-replies`, `force-publish-reply` 모두 `enqueuePlatformJob` 호출 시 jobId 안 줌
- BullMQ 가 매번 새 numeric jobId 발행 → 같은 리뷰가 N번 큐에 들어감
- 사장님이 버튼 N번 클릭 = N개 잡 enqueue

#### 2. BullMQ `prioritized` hidden state
- `priority` 옵션으로 enqueue 된 잡은 `waiting` 이 아닌 `prioritized` 상태로 들어감
- 기존 `queue-job-inspect` 코드는 `getWaiting/getActive/getCompleted/getFailed/getDelayed` 만 검사
- `prioritized` 상태 잡 = "큐에 없음"으로 잘못 보임
- 진단 시 "큐 비어있는데 답글 안 달림?" 의 원인

#### 3. 워커가 `prioritized` 우선순위 안 봄
- 이론상 BullMQ 워커는 priority 1 잡을 waiting 보다 먼저 pickup
- 실측: 워커가 cron 의 fetch_reviews (waiting 리스트) 를 prioritized priority 1 post_reply 보다 먼저 pickup
- 원인 추정: BullMQ 버전 mismatch (Vercel @latest vs Worker 구버전), 또는 lockDuration 5분으로 active 슬롯이 계속 점유됨

---

## 적용된 영구 수정

### 1. `app/lib/queue.ts` — Deterministic jobId 자동 부여

post_reply 잡은 `pr_{platform}_{userId8}_{reviewId32}` jobId 사용:

```ts
let jobId = opts.jobId
if (!jobId && data.action === 'post_reply') {
  const reviewId = String((data.payload as any)?.platform_review_id || 'unknown')
  jobId = `pr_${data.platform}_${data.userId.slice(0, 8)}_${reviewId.slice(0, 32)}`
}
```

효과: 사장님이 [답글 발행] 100번 클릭해도 큐에는 1개만 enqueue. BullMQ 가 같은 jobId 무시.

### 2. 관리자 진단/복구 엔드포인트 6개

| 엔드포인트 | 목적 |
|-----------|------|
| `/api/admin/queue-job-inspect?platform=naver_place` | **prioritized** 상태 포함 큐 가시화 |
| `/api/admin/queue-emergency-cleanup?dry=0&clean_fetch=1` | 중복 dedup + 적체 fetch_reviews 청소 |
| `/api/admin/queue-remove-stale?max_age_hours=3` | 묵은 priority 1 잡 제거 |
| `/api/admin/queue-force-release-active?action_filter=fetch_reviews` | hang 된 active 잡 강제 해제 |
| `/api/admin/queue-promote-to-waiting?platform=naver_place` | prioritized → waiting 변환 (워커 priority 미적용 우회) |
| `/api/admin/queue-enqueue-test` | BullMQ silent drop 진단 |

---

## 회귀 방지 체크리스트

### 코드 작업 시 반드시 지킬 것

#### A) `enqueuePlatformJob` 직접 호출하는 코드
- ❌ jobId 안 줘도 됨 (post_reply 는 자동 dedup)
- ❌ `priority` 옵션 명시적으로 1 줘서 `prioritized` 보낼 필요 없음 → 워커가 안 보니까
- ✅ `auto-publish`, `retry-queued-replies`, `force-publish-reply` 는 그대로 두면 됨 — queue.ts 가 자동 처리

#### B) 새 큐 작업 추가 시
- `post_reply` 외 다른 action 도 중복 차단 필요하면 queue.ts 에 추가
- 패턴: `${action_prefix}_${platform}_${userId8}_{unique_key}`

#### C) BullMQ 버전 변경 시
- 워커 (`worker/package.json`) 와 Vercel (`package.json`) 의 bullmq 버전 일치 확인
- 다른 버전 사용 시 priority/prioritized 동작 불일치 가능

### 운영 중 모니터링

#### 매일 확인 (또는 알림 발생 시)
```
https://www.localution.co.kr/api/admin/queue-job-inspect?platform=naver_place
```

정상 상태:
- `prioritized` 0 또는 5건 이하 (처리 대기 중)
- `waiting` 200 이하 (cron 적체 아님)
- `active` 1~5 (워커 정상 작동)

이상 신호:
- `prioritized` 50+ → 중복 enqueue 의심. `queue-emergency-cleanup` 호출
- `active` 가 30+ 분 같은 잡 처리 중 → 워커 hang. `queue-force-release-active` 호출
- `waiting` 1000+ → cron 적체. cron 일시 중단 또는 워커 concurrency 상향

#### Worker hang 의심 시
```
https://www.localution.co.kr/api/admin/queue-job-inspect
```
응답의 `active` 배열에서 `processedOn` 확인 — 같은 timestamp 가 10분+ 이면 hang.

해결:
1. 1차: `queue-force-release-active?action_filter=fetch_reviews` — 강제 해제
2. 2차: Railway worker restart (대시보드 → Restart)

---

## 사고 당시 데이터 (참고)

### Before
- Prioritized: 86건 (대부분 같은 review_id 중복)
- Waiting: 1000+ (cron 적체)
- Active: 5 (모두 fetch_reviews hang 30분+)
- DB queued: 7건 (75분+ stuck)

### After 수정 적용
- Prioritized: 86 → 7 unique (dedup 효과)
- Waiting: 1000+ → 201 (cleanup)
- Active: 5 → 1 (force-release)
- DB: 또올 사장 1건 즉시 발행 성공 (verify OK)

### 복구 단계 순서
1. queue-emergency-cleanup (dedup 76건)
2. queue-remove-stale (4일 묵은 3건 제거)
3. queue-force-release-active (hang 5건 해제)
4. queue-promote-to-waiting (prioritized → waiting 변환)
5. 워커가 자연스럽게 pickup → 답글 발행 시작

---

## 차단 보장 (DO NOT BREAK)

### `app/lib/queue.ts` 수정 금지 영역
```ts
// 이 블록은 절대 제거하지 말 것:
let jobId = opts.jobId
if (!jobId && data.action === 'post_reply') {
  const reviewId = String((data.payload as any)?.platform_review_id || (data.payload as any)?.review_id || 'unknown')
  jobId = `pr_${data.platform}_${data.userId.slice(0, 8)}_${reviewId.slice(0, 32)}`
}
```

### enqueuePlatformJob 반환값에 추가된 필드
- `deduped: true` — 같은 jobId 이미 존재. 새 enqueue 안 일어남
- 호출자는 deduped 도 성공으로 처리 (재시도 무한 loop 방지)

### 향후 추가 액션 dedup 필요 시 추가 위치
```ts
// queue.ts 내부 — action 별 dedup 패턴 추가
if (!jobId && data.action === 'post_reply') { ... }
if (!jobId && data.action === 'fetch_menu') {
  jobId = `fm_${data.platform}_${data.userId.slice(0, 8)}_${data.storeId}`
}
// fetch_reviews 는 cron 이 다중 사이클 enqueue 해야 하므로 dedup 안 함
```

---

## 사장님 액션 가이드

### 1) 답글 발행 멈춤 신고 받았을 때
```
1. https://www.localution.co.kr/api/admin/queue-job-inspect?platform=naver_place 호출
2. prioritized + active 에 해당 review 가 있는지 확인
3. 있으면 → 처리 대기 중. 5분 더 기다리기
4. 없으면 → DB 의 reply_status 확인. queued 인데 큐에 없으면 retry-queued-replies 호출
```

### 2) salt8story 류 네이버 잠금 발생 시
- 워커 로그에 "회원님의 아이디(salt8story)가 ... 안전하지 않은 환경에서 로그인" 메시지
- 사장이 직접 `nid.naver.com` 로그인 후 "비정상적 로그인 시도" 해제
- 그 후 admin/review-health 에서 [답글 재시도] 클릭

### 3) Active 잡 hang 의심
- 워커 active 잡 처리 시간 > 5분 = 비정상
- `queue-force-release-active?action_filter=fetch_reviews` 호출
- 또는 Railway 워커 재시작

---

## 마지막 업데이트
- 2026-05-12: 초안 작성. 사장님 1버튼 답글 발행 정상 작동 확인.
