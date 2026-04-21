# Railway Worker Dockerfile (루트 배치 — Railway 전용, Vercel 은 무시)
# 23차-3: worker/ 디렉토리만 빌드하는 Playwright 컨테이너

FROM mcr.microsoft.com/playwright:v1.47.0-jammy

WORKDIR /app

# worker/ 하위만 복사
COPY worker/package.json worker/package-lock.json* ./
RUN npm install --omit=optional --no-audit --no-fund && npm cache clean --force

COPY worker/tsconfig.json ./
COPY worker/src ./src

# TypeScript 빌드
RUN npx tsc

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "dist/index.js"]
