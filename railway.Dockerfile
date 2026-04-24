# Railway Worker Dockerfile (루트 배치 — Railway 전용, Vercel 은 무시)
# 23차-3: worker/ 디렉토리만 빌드하는 Playwright 컨테이너
# 35차-2: cache invalidation — DOM lib 누락으로 tsc 실패한 build cache 무효화 (2026-04-22)

FROM mcr.microsoft.com/playwright:v1.47.0-jammy

WORKDIR /app

# worker/ 하위만 복사
COPY worker/package.json worker/package-lock.json* ./
RUN npm install --omit=optional --no-audit --no-fund && npm cache clean --force

COPY worker/tsconfig.json ./
COPY worker/src ./src

# TypeScript 빌드 — 35차-2: cache 무효화를 위한 echo 포함
RUN echo "build-marker: 38cha-2 baemin-collect-fix" && npx tsc --showConfig | head -5 && npx tsc

ENV NODE_ENV=production
ENV PORT=3000
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

CMD ["node", "dist/index.js"]
