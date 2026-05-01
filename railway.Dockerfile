# Railway Worker Dockerfile
# 39차-2: build-marker를 COPY src 앞으로 이동 → 캐시 강제 무효화

FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libnss3 libnspr4 libdbus-1-3 \
    libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 \
    libxrandr2 libgbm1 libasound2 libpango-1.0-0 libcairo2 \
    fonts-noto-cjk wget ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY worker/package.json ./
RUN npm install --omit=optional --no-audit --no-fund \
    && npx playwright install chromium \
    && npm cache clean --force

COPY worker/tsconfig.json ./

# build-marker: COPY src 앞에 위치 — 이 줄 변경 시 이후 레이어 전체 캐시 무효화
RUN echo "build-marker: 46cha-2 chromeTLS-httpOnly-token-param"

COPY worker/src ./src
RUN npx tsc

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "dist/index.js"]
