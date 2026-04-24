# fly.io Worker – Playwright + BullMQ
# 42차-3: Playwright 1.47 → 1.59.1 버전 업 (chromium 경�� 불일치 수정)

FROM mcr.microsoft.com/playwright:v1.59.1-jammy

WORKDIR /app

COPY worker/package.json worker/package-lock.json* ./
RUN npm install --omit=optional --no-audit --no-fund \
    && npm cache clean --force

COPY worker/tsconfig.json ./
RUN echo "build-marker: 42cha-3-playwright-version-fix"
COPY worker/src ./src

RUN npx tsc

ENV NODE_ENV=production
ENV PORT=8080

CMD [ "node", "dist/index.js" ]
