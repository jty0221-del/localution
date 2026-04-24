# Railway Worker Dockerfile (루트 배치 — Railway 전용, Vercel 은 무시)
# 23차-3: worker/ 디렉토리만 빌드하는 Playwright 컨테이너
# 38차-4: PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD + PLAYWRIGHT_BROWSERS_PATH 를 npm install 이전으로 이동

FROM mcr.microsoft.com/playwright:v1.47.0-jammy

WORKDIR /app

# ★ Playwright 브라우저 경로/다운로드 설정을 npm install 이전에 선언 ★
# - PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 : npm install 시 브라우저 재다운로드 차단
# - PLAYWRIGHT_BROWSERS_PATH=/ms-playwright : base 이미지 브라우저 경로 지정
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# worker/ 하위만 복사
COPY worker/package.json worker/package-lock.json* ./
RUN npm install --omit=optional --no-audit --no-fund && npm cache clean --force

COPY worker/tsconfig.json ./
COPY worker/src ./src

# TypeScript 빌드 — 38차-4: cache 무효화 마커
RUN echo "build-marker: 38cha-4 playwright-env-before-install" && npx tsc --showConfig | head -5 && npx tsc

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "dist/index.js"]

