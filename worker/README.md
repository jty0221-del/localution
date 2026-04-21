# localution-worker

23차-3: Railway 에 배포되는 Playwright 기반 플랫폼 자동화 워커.

## 지원 플랫폼
- `naver_place` — 네이버 플레이스
- `baemin` — 배달의민족
- `yogiyo` — 요기요
- `coupangeats` — 쿠팡이츠

## 구조
```
worker/
├── Dockerfile          # Playwright v1.47 base
├── railway.json        # Railway 빌드 힌트
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts        # BullMQ Worker 엔트리
    ├── jobs/
    │   └── index.ts    # 플랫폼 라우터
    └── adapters/
        ├── base.ts     # 공통 인터페이스
        ├── naver.ts    # 23차-4 예정
        ├── baemin.ts   # 23차-5 예정
        ├── yogiyo.ts   # 23차-5 예정
        └── coupangeats.ts # 23차-5 예정
```

## 필수 환경변수
- `REDIS_URL` — Railway Redis service
- `SUPABASE_URL` — localution Supabase URL
- `SUPABASE_SERVICE_ROLE_KEY` — 서비스 롤 키 (RLS 우회)
- `ENCRYPTION_KEK_HEX` — 32바이트 KEK (64 hex chars) — 세션 복호화
- `WORKER_CONCURRENCY` — 동시 처리 잡 수 (기본 2)
- `LOG_LEVEL` — pino 로그 레벨 (기본 info)

## 로컬 개발
```bash
cd worker
npm install
cp ../.env.local .env
npm run dev
```

## 배포
Railway 가 `main` 브랜치에 푸시되면 자동으로 `worker/Dockerfile` 기반 빌드.
