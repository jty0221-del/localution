# fly.io Worker â€“ Playwright + BullMQ
# 42ì°¨-3: Playwright 1.47 â†’ 1.59.1 ë²„ì „ ì—… (chromium ê²½ë¡Ü ë¶ˆì¼ì¹˜ ìˆ˜ì •)

FROM mcr.microsoft.com/playwright:v1.59.1-jammy

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=optional --no-audit --no-fund \
    && npm cache clean --force

COPY tsconfig.json ./
# v25 FRESH BUILD — post-CAPTCHA deviceAdd "등록" 우선 (실제 paaron 플로우 핸들러)
RUN echo "build-marker: v25-postCAPTCHA-register-priority-20260502T1400" && rm -rf /app/dist /app/src
COPY src ./src

# 컴파일 전 dist 강제 제거 (cache 우회) + v25 마커 검증
RUN rm -rf /app/dist && npx tsc && ls -la /app/dist/adapters/naver.js && grep -c "v25-postCAPTCHA-register-priority-20260502" /app/dist/adapters/naver.js

ENV NODE_ENV=production
ENV PORT=8080

CMD [ "node", "dist/index.js" ]
