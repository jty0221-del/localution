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
#     · 런타임 SA(<PROJECT_NUMBER>-compute@…) 에 roles/secretmanager.secretAccessor
#
#   본 스크립트는 위 항목을 사전 점검(preflight)하고 빠진 게 있으면
#   배포 전에 명확한 오류로 중단합니다.
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

REQUIRED_SECRETS=(encryption-kek-hex supabase-service-role-key supabase-url redis-url)
REQUIRED_APIS=(run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com)

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

# ------------------------------------------------------------
# 사전 점검 (preflight)
# ------------------------------------------------------------
fail() { echo "❌ $1" >&2; exit 1; }
ok()   { echo "  ✓ $1"; }

echo "▶︎ Preflight 검사"

command -v gcloud >/dev/null 2>&1 || fail "gcloud CLI 가 설치되어 있지 않습니다. https://cloud.google.com/sdk/docs/install"
ok "gcloud CLI 설치됨"

PROJECT_ID="$(gcloud config get-value project 2>/dev/null || true)"
[[ -n "$PROJECT_ID" ]] || fail "gcloud 프로젝트가 설정되지 않음. 'gcloud config set project <PROJECT_ID>' 실행"
ok "project = $PROJECT_ID"

ACTIVE_ACCOUNT="$(gcloud config get-value account 2>/dev/null || true)"
[[ -n "$ACTIVE_ACCOUNT" ]] || fail "gcloud auth login 으로 로그인 먼저"
ok "account = $ACTIVE_ACCOUNT"

# 활성화된 API 한 번에 조회 후 매칭 (개별 호출보다 빠름)
ENABLED_APIS="$(gcloud services list --enabled --format='value(config.name)' 2>/dev/null || true)"
for api in "${REQUIRED_APIS[@]}"; do
  if grep -q "^${api}$" <<<"$ENABLED_APIS"; then
    ok "api enabled: $api"
  else
    fail "API 미활성화: $api  →  gcloud services enable $api"
  fi
done

# 시크릿 존재 검사
EXISTING_SECRETS="$(gcloud secrets list --format='value(name)' 2>/dev/null || true)"
for s in "${REQUIRED_SECRETS[@]}"; do
  if grep -q "^${s}$" <<<"$EXISTING_SECRETS"; then
    ok "secret exists: $s"
  else
    fail "Secret Manager 에 '$s' 없음. GCP_DEPLOY.md 4단계 참고."
  fi
done

# 런타임 서비스 계정 IAM 점검 (compute default SA + secretAccessor)
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)' 2>/dev/null || true)"
[[ -n "$PROJECT_NUMBER" ]] || fail "projectNumber 조회 실패 — 프로젝트 권한 확인"
RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

IAM_ROLES="$(gcloud projects get-iam-policy "$PROJECT_ID" \
  --flatten='bindings[].members' \
  --filter="bindings.members:serviceAccount:${RUNTIME_SA}" \
  --format='value(bindings.role)' 2>/dev/null || true)"

if grep -q '^roles/secretmanager.secretAccessor$' <<<"$IAM_ROLES"; then
  ok "runtime SA has secretAccessor role"
else
  echo "⚠︎ 런타임 SA(${RUNTIME_SA}) 에 secretAccessor 역할이 없음 — 자동 부여 시도"
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${RUNTIME_SA}" \
    --role='roles/secretmanager.secretAccessor' \
    --condition=None \
    --quiet >/dev/null
  ok "secretAccessor 역할 부여 완료"
fi

# ------------------------------------------------------------
# 배포
# ------------------------------------------------------------
echo
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
  --service-account "$RUNTIME_SA" \
  --set-env-vars "$ENV_VARS_ARG" \
  --set-secrets "$SECRETS_ARG" \
  --allow-unauthenticated \
  --quiet

echo
echo "✅ 배포 완료"
URL="$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format='value(status.url)')"
echo "   URL: $URL"

# ------------------------------------------------------------
# 헬스체크 (자동 polling)
# ------------------------------------------------------------
echo
echo "▶︎ 헬스체크 자동 확인 (최대 30초)"
HEALTH_OK=0
for i in 1 2 3 4 5 6; do
  RESP="$(curl -sS -m 5 "${URL}/health" || true)"
  if grep -q '"redis":"connected"' <<<"$RESP"; then
    echo "   ✓ /health → $RESP"
    HEALTH_OK=1
    break
  fi
  echo "   ... 재시도 $i/6 (응답: ${RESP:-no-response})"
  sleep 5
done

if [[ "$HEALTH_OK" -eq 0 ]]; then
  echo "⚠︎ 헬스체크 실패 — 다음 명령으로 로그 확인:"
  echo "   gcloud run services logs tail $SERVICE_NAME --region $REGION"
  exit 1
fi

echo
echo "▶︎ 로그 보기"
echo "   gcloud run services logs tail $SERVICE_NAME --region $REGION"
