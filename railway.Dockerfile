# Railway Worker Dockerfile (루트 배치 — Railway 전용, Vercel 은 무시)
# 38차-6: package-lock.json 제외 → playwright 1.47.0 정확히 설치 (base image 일치)

FROM mcr.microsoft.com/playwright:v1.47.0-jammy

WORKDIR /app

# ★ npm install 이전에 선언: 브라우저 재다운로드 차단 + base 이미지 경로 지정 ★
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# package-lock.json 제외하고 package.json 만 복사 (lockfile 1.59.1 무시)
COPY worker/package.json ./
RUN npm install --omit=optional --no-audit --no-fund && npm cache clean --force

COPY worker/tsconfig.json ./
COPY worker/src ./src

# TypeScript 빌드 — 38차-6: cache 무효화 마커
RUN echo "build-marker: 38cha-6 pin-playwright-1.47.0-no-lockfile" && npx tsc --showConfig | head -5 && npx tsc

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "dist/index.js"]

