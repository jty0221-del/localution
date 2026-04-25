# GCP Cloud Run 배포 가이드 (워커)

도쿄 Fly.io → 서울 GCP Cloud Run + Upstash Redis 마이그레이션.

> 한국 IP 가 잡혀야 네이버 SmartPlace / 쿠팡이츠 / 배민 / 요기요 자동화의 캡차·차단 빈도가 크게 줄어듭니다. NCP 는 이용약관 충돌 위험이 있어 GCP Seoul (asia-northeast3) 을 선택.

---

## 0. 사전 준비 — 결제수단

GCP·Upstash 둘 다 무료 티어가 있지만 결제수단(신용카드 또는 Apple Pay) 등록이 필요합니다.
GCP 는 **신규 가입 시 $300 / 90일 무료 크레딧** 을 줍니다 → 사실상 첫 3개월은 0원.

---

## 1. GCP 계정 + 프로젝트 생성 (10분)

1. https://console.cloud.google.com 접속 → **무료로 시작하기**
2. Google 계정으로 로그인 → 국가 한국, 결제수단 등록
3. 가입 완료 후 상단 헤더의 **프로젝트 선택** → **새 프로젝트**
   - 이름: `localution-worker` (자유)
   - 위치: 조직 없음
   - **프로젝트 ID** 가 자동 생성되니 (예: `localution-worker-1234`) 메모해 두세요
4. 좌측 메뉴 → **결제** → 만든 프로젝트에 결제 계정 연결
5. 좌측 메뉴 → **API 및 서비스 → 라이브러리** 에서 4개 API 차례로 사용 설정:
   - Cloud Run API
   - Cloud Build API
   - Artifact Registry API
   - Secret Manager API

> 위 4개를 한 번에 켜는 명령(아래 4번 단계에서 사용):
> ```
> gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com
> ```

---

## 2. gcloud CLI 설치 + 로그인 (5분)

### macOS
```
brew install --cask google-cloud-sdk
```

### Windows / Linux
https://cloud.google.com/sdk/docs/install 안내 따라 설치.

### 인증
```
gcloud auth login
gcloud config set project <PROJECT_ID>      # 1단계에서 메모한 프로젝트 ID
gcloud config set run/region asia-northeast3 # Seoul
```

---

## 3. Upstash Redis (Seoul) 생성 (5분)

1. https://upstash.com 가입 (Google 로그인 가능)
2. **Create Database**
   - Name: `localution-bullmq`
   - Type: **Regional**
   - Region: **AP-Northeast-2 (Seoul, South Korea)**
   - Eviction: Disabled (BullMQ 는 데이터 유실되면 안 됨)
   - TLS: Enabled (기본)
3. 생성되면 상세 페이지에서 **REST URL / Endpoint / Password** 가 보입니다.
   BullMQ 는 일반 Redis 프로토콜이 필요하니 **`Endpoint`** 와 **`Password`** 가 합쳐진 URL 을 복사:
   - 우측 상단 `Connect to your database` → **Node.js / ioredis** 탭
   - `redis://default:<PASSWORD>@<HOST>:<PORT>` 또는 TLS 면 `rediss://...` 형태가 표시됨
4. 이 값을 **`REDIS_URL_SEOUL`** 로 임시 메모 (다음 단계에서 사용)

> Free tier: 256MB, 일 10K 명령. 워커 처리량 작으면 무료. 부족해지면 $0.2/GB-hour Pro Plan.

---

## 4. Secret Manager 에 비밀값 등록 (5분)

기존 Fly.io secrets (`flyctl secrets list -a localution-worker-kr`) 에서 그대로 가져오면 됩니다.

```
# 한 줄씩 실행. 값은 프롬프트에서 붙여넣기 후 Ctrl+D
echo -n "<KEK_HEX 64자>" | gcloud secrets create encryption-kek-hex --data-file=-
echo -n "<SUPABASE_SERVICE_ROLE_KEY>" | gcloud secrets create supabase-service-role-key --data-file=-
echo -n "<SUPABASE_URL>" | gcloud secrets create supabase-url --data-file=-
echo -n "<REDIS_URL_SEOUL>" | gcloud secrets create redis-url --data-file=-
```

확인:
```
gcloud secrets list
```

---

## 5. 첫 배포 (10분)

리포지토리 루트에서:
```
cd worker
bash deploy-gcp.sh
```

`deploy-gcp.sh` 는 다음을 수행:
1. `gcloud run deploy` 로 현재 디렉터리 Dockerfile 을 Cloud Build 에 업로드 → 컨테이너 빌드 → 서울 리전 Cloud Run 에 배포
2. min instances 1 + 항상 켜진 CPU + 메모리 2Gi + 시크릿 4개 마운트
3. 헬스체크는 워커가 8080 포트에서 자동으로 들고 있는 `/health`

성공 시 출력 마지막에 서비스 URL 이 표시됩니다 (예: `https://localution-worker-xxx-an.a.run.app`).

### 5-1) 헬스체크 확인
```
curl <서비스URL>/health
# {"status":"ok","queue":"platform-jobs","redis":"connected","ts":"..."}
```
`redis: disconnected` 가 뜨면 5단계 시크릿(redis-url) 값을 다시 확인.

### 5-2) 로그 확인
```
gcloud run services logs tail localution-worker --region asia-northeast3
```
또는 Cloud Console → Cloud Run → localution-worker → 로그 탭.

---

## 6. Vercel `REDIS_URL` 동기화 (3분)

앱(Vercel) 도 같은 Upstash Seoul Redis 를 가리켜야 큐가 한 곳에서 처리됩니다.

1. Vercel 프로젝트 → Settings → Environment Variables
2. `REDIS_URL` 의 값을 **Upstash Seoul `REDIS_URL_SEOUL`** 로 교체
3. Production / Preview / Development 모두 적용
4. 다음 배포 시 반영 (혹은 Redeploy 트리거)

> 기존 Fly.io 와 함께 쓰던 Redis 가 Upstash Tokyo / Railway 등 어딘가에 있을 텐데, 모두 Seoul 로 통일해야 워커·앱이 같은 큐를 봅니다.

---

## 7. 컷오버 + Fly.io 정리 (10분)

1. Cloud Run 배포 직후 Vercel 환경변수까지 갈아끼우면 즉시 큐 처리는 GCP 워커가 받게 됩니다.
2. Fly.io 워커는 1주 정도 살려두고 (안전판), `gcloud run services logs tail` 로 정상 처리 확인
3. 1주 후 Fly.io 정리:
   ```
   flyctl scale count 0 -a localution-worker-kr
   # 한 달 더 두고 완전 삭제 시:
   flyctl apps destroy localution-worker-kr
   ```
4. fly.toml / fly.io 관련 시크릿 정리 (코드는 유지, 향후 fallback 가능성 위해)

---

## 8. 일상 배포 (이후)

워커 코드 수정 후:
```
cd worker
bash deploy-gcp.sh
```
약 2~3분 만에 새 리비전이 올라가고, 헬스 체크 통과 시 트래픽 전환.

롤백 (이전 리비전으로 즉시):
```
gcloud run services update-traffic localution-worker \
  --to-revisions <이전리비전>=100 \
  --region asia-northeast3
```

---

## 비용 가늠

| 항목 | 무료 한도 | 예상 청구 |
|---|---|---|
| Cloud Run (min=1, always-on CPU, 2Gi) | $0 무료크레딧 90일 | 이후 약 $30~45/월 |
| Cloud Build | 일 120분 무료 | 사용량 거의 없음 |
| Artifact Registry | 0.5GB 무료 | 사용량 거의 없음 |
| Upstash Redis Seoul | 256MB / 일 10K cmds | 무료 가능 |
| **합계** | | **첫 3개월 0원, 이후 $30~45/월** |

> Cloud Run 비용이 부담되면 향후 GCE e2-small (~$15/월) 또는 GKE Autopilot 으로 이동 가능. 현재 코드/Dockerfile 그대로 호환.

---

## 트러블슈팅

| 증상 | 확인 |
|---|---|
| `redis: disconnected` | Upstash 콘솔에서 IP 화이트리스트 비어 있는지(=모두 허용) 확인. Cloud Run 의 egress IP 는 가변이라 화이트리스트 쓰지 마세요. |
| 첫 배포 시 `Permission denied` | `gcloud auth login` 다시 + 결제 계정 연결 확인. |
| Chrome `--no-sandbox` 관련 SIGSEGV | Cloud Run 메모리 2Gi 미만이면 종종 발생. 배포 스크립트는 2Gi 로 설정되어 있음. |
| 잡이 처리 안 됨 (큐만 쌓임) | Vercel 의 `REDIS_URL` 과 Cloud Run 시크릿 `redis-url` 이 같은 인스턴스 가리키는지 확인. |
| 네이버 캡차 여전히 잡힘 | 한국 IP 라도 같은 IP 로 너무 빈번히 시도하면 잡혀요. `worker/src/index.ts:75` 의 `WORKER_CONCURRENCY=2` 는 유지하고, 사용자 단위 쓰로틀 추가 검토. |

---

## 체크리스트 (배포 직전 인쇄용)

- [ ] GCP 프로젝트 생성, ID 메모
- [ ] 결제 계정 연결, 무료 크레딧 활성화 확인
- [ ] 4개 API 활성화 (run / cloudbuild / artifactregistry / secretmanager)
- [ ] gcloud CLI 설치 + `gcloud auth login` + `gcloud config set project ...`
- [ ] Upstash Seoul Redis 생성, REDIS_URL 메모
- [ ] Secret Manager 에 4개 시크릿 등록 (encryption-kek-hex / supabase-service-role-key / supabase-url / redis-url)
- [ ] `bash worker/deploy-gcp.sh` 첫 배포
- [ ] `/health` 응답 확인 (`redis: connected`)
- [ ] Vercel `REDIS_URL` 을 Upstash Seoul 로 변경
- [ ] 24시간 모니터링 (Cloud Run 로그 + `/api/admin/worker-diagnostics`)
- [ ] 1주일 후 Fly.io 워커 scale 0
