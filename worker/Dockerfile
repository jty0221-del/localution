# fly.io Worker - Playwright + BullMQ
# 42-3: Playwright 1.47 -> 1.59.1
# v29: Aggressive cache bust + structured rebuild (20260505T1545)

FROM mcr.microsoft.com/playwright:v1.59.1-jammy

# 모든 layer cache 무효화 - timestamp 가 매번 다르므로
ARG CACHE_BUST=20260505T1900-baemin-v1.6o
ENV BUILD_VERSION=$CACHE_BUST
RUN echo "=== FRESH BUILD: $CACHE_BUST ===" && date

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=optional --no-audit --no-fund && npm cache clean --force

COPY tsconfig.json ./

# 항상 fresh - 매 build 마다 dist/src 제거
RUN rm -rf /app/dist /app/src && echo "build-marker: v29-baemin-v1.6g-rev3-$CACHE_BUST"
COPY src ./src

# 컴파일
RUN rm -rf /app/dist && npx tsc && ls -la /app/dist/adapters/baemin.js && head -20 /app/dist/adapters/baemin.js

ENV NODE_ENV=production
ENV PORT=8080

CMD [ "node", "dist/index.js" ]
