#!/usr/bin/env bash
# ============================================================
# 43차-6 · GCP Cloud Run 배포 스크립트 (서울 리전)
#
#   사용법: cd worker && bash deploy-gcp.sh
#
#   사전 조건 (worker/GCP_DEPLOY.md 1~4단계):
#     · gcloud 설치 + auth login
#     · 프로젝트 선택 (`gcloud config set project <ID>`)
#     · 4개 API 활성화 (run/cloudbuild/artifactregistry/secretmanager)
#     · 4개 Secret Manager 시크릿 등록
#         encryption-kek-hex / supabase-service-role-key / supabase-url / redis-url
# ============================================================
set -euo pipefail

SERVICE_NAME="localution-worker"
REGION="asia-northeast3"        # Seoul
MEMORY="2Gi"
CPU="1"
MIN_INSTANCES="1"               # BullMQ 컨슈머는 항상 떠 있어야 함
MAX_INSTANCES="3"               # 동시 처리 한계 (필요 시 조정)
TIMEOUT="3600"                  # 잡 처리 시간 상한 (초)
PORT="8080"

# 시크릿 매핑 (Secret Manager → 환경변수)
SECRETS=(
  "ENCRYPTION_KEK_HEX=encryption-kek-hex:latest"
  "SUPABASE_SERVICE_ROLE_KEY=supabase-service-role-key:latest"
  "SUPABASE_URL=supabase-url:latest"
  "REDIS_URL=redis-url:latest"
)
SECRETS_ARG=$(IFS=','; echo "${SECRETS[*]}")

# 일반 환경변수 (코드 동작 기본값)
ENV_VARS=(
  "NODE_ENV=production"
  "WORKER_CONCURRENCY=2"
  "LOG_LEVEL=info"
  "ENCRYPTION_KEK_VERSION=v1"
)
ENV_VARS_ARG=$(IFS=','; echo "${ENV_VARS[*]}")

PROJECT_ID="$(gcloud config get-value project 2>/dev/null)"
if [[ -z "$PROJECT_ID" ]]; then
  echo "❌ gcloud 프로젝트가 설정되어 있지 않습니다."
  echo "   gcloud config set project <PROJECT_ID> 먼저 실행"
  exit 1
fi

echo "▶︎ Cloud Run 배포 시작"
echo "   project : $PROJECT_ID"
echo "   service : $SERVICE_NAME"
echo "   region  : $REGION"
echo

gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --region "$REGION" \
  --port "$PORT" \
  --memory "$MEMORY" \
  --cpu "$CPU" \
  --min-instances "$MIN_INSTANCES" \
  --max-instances "$MAX_INSTANCES" \
  --timeout "$TIMEOUT" \
  --no-cpu-throttling \
  --set-env-vars "$ENV_VARS_ARG" \
  --set-secrets "$SECRETS_ARG" \
  --allow-unauthenticated \
  --quiet

echo
echo "✅ 배포 완료"
URL="$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format='value(status.url)')"
echo "   URL: $URL"
echo
echo "▶︎ 헬스체크"
echo "   curl $URL/health"
echo
echo "▶︎ 로그 보기"
echo "   gcloud run services logs tail $SERVICE_NAME --region $REGION"
