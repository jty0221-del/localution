# Localution Worker — Playwright + BullMQ
# 43차-6: GCP Cloud Run (asia-northeast3 / Seoul) 배포 호환

FROM mcr.microsoft.com/playwright:v1.59.1-jammy

WORKDIR /app

# 의존성 설치 — lockfile 일치 보장 (npm ci) + dev deps 포함 (tsc 빌드용)
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund \
    && npm cache clean --force

# 빌드 마커 (캐시 무효화용 — 변경 시 이 줄만 수정)
RUN echo "build-marker: 43cha-6-gcp-cloud-run"

COPY tsconfig.json ./
COPY src ./src

RUN npx tsc

# Cloud Run 은 PORT 환경변수를 주입함. 기본값 8080 으로 매칭.
ENV NODE_ENV=production
ENV PORT=8080

CMD [ "node", "dist/index.js" ]
