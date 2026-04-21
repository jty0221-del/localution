# Railway Worker — Playwright + BullMQ
# 23차-3: 플랫폼 자동화 워커 (naver_place / baemin / yogiyo / coupangeats)

FROM mcr.microsoft.com/playwright:v1.47.0-jammy

WORKDIR /app

# 의존성 설치 (캐시 최적화)
COPY package.json package-lock.json* ./
RUN npm install --omit=optional && npm cache clean --force

# 소스 복사
COPY tsconfig.json ./
COPY src ./src

# TypeScript 빌드
RUN npx tsc

# 환경 변수는 Railway 에서 주입
ENV NODE_ENV=production
ENV PORT=3000

# BullMQ 워커 실행 (HTTP 서버 아님, 헬스체크용 포트는 선택)
CMD ["node", "dist/index.js"]
