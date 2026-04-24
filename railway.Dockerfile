# Railway Worker Dockerfile
# 38차-7: node:20 베이스로 전환 + npx playwright install chromium
# → Playwright 이미지 버전 매칭 문제 근본 해결

FROM node:20-bookworm-slim

# Chromium 실행에 필요한 시스템 의존성
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libnss3 libnspr4 libdbus-1-3 \
    libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 \
    libxrandr2 libgbm1 libasound2 libpango-1.0-0 libcairo2 \
    fonts-noto-cjk wget ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# package.json 복사 (lockfile 제외 — 1.47.0 정확히 설치)
COPY worker/package.json ./
RUN npm install --omit=optional --no-audit --no-fund \
    && npx playwright install chromium \
    && npm cache clean --force

COPY worker/tsconfig.json ./
COPY worker/src ./src

RUN echo "build-marker: 38cha-7 node20-chromium-install" && npx tsc

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "dist/index.js"]

