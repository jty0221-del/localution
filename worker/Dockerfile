# fly.io Worker â€“ Playwright + BullMQ
# 42ì°¨-3: Playwright 1.47 â†’ 1.59.1 ë²„ì „ ì—… (chromium ê²½ë¡Ü ë¶ˆì¼ì¹˜ ìˆ˜ì •)

FROM mcr.microsoft.com/playwright:v1.59.1-jammy

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=optional --no-audit --no-fund \
    && npm cache clean --force

COPY tsconfig.json ./
# v26 FRESH BUILD — anchor onclick + form-submit triple-fallback
RUN echo "build-marker: v26-anchor-onclick-formSubmit-fallback-20260502T1600" && rm -rf /app/dist /app/src
COPY src ./src

# 컴파일 전 dist 강제 제거 (cache 우회) — grep 마커 검증은 push 순서 race fail 유발 → 제거
# 버전 확인은 런타임 /build-info 의 versionValue 로 함
RUN rm -rf /app/dist && npx tsc && ls -la /app/dist/adapters/naver.js

ENV NODE_ENV=production
ENV PORT=8080

CMD [ "node", "dist/index.js" ]
