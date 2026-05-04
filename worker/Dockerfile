# fly.io Worker â€“ Playwright + BullMQ
# 42ì°¨-3: Playwright 1.47 â†’ 1.59.1 ë²„ì „ ì—… (chromium ê²½ë¡Ü ë¶ˆì¼ì¹˜ ìˆ˜ì •)

FROM mcr.microsoft.com/playwright:v1.59.1-jammy

# v28 cache-bust 20260504T1430 — Railway docker layer cache 강제 우회
ARG CACHE_BUST=20260505T1530-baemin-v1.6g
RUN echo "CACHE_BUST: $CACHE_BUST"

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=optional --no-audit --no-fund \
    && npm cache clean --force

COPY tsconfig.json ./
# v28 FRESH BUILD — baemin v1.6e_rev2 (VERSION_MARKER log + cache bust)
RUN echo "build-marker: v28-baemin-v1.6e-rev2-20260504T1430" && rm -rf /app/dist /app/src
COPY src ./src

# 컴파일 전 dist 강제 제거 (cache 우회) — grep 마커 검증은 push 순서 race fail 유발 → 제거
# 버전 확인은 런타임 /build-info 의 versionValue 로 함
RUN rm -rf /app/dist && npx tsc && ls -la /app/dist/adapters/naver.js

ENV NODE_ENV=production
ENV PORT=8080

CMD [ "node", "dist/index.js" ]
