# Railway Worker Dockerfile (루트 배치 — Railway 전용, Vercel 은 무시)
# 39차-1: baemin auth fix + XHR capture

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
COPY worker/src ./src
RUN echo "build-marker: 39cha-1 baemin-auth-xhr-capture" && npx tsc

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "dist/index.js"]
