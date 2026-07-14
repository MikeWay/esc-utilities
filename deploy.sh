#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_DEFAULT_REGION:-eu-west-2}"
SERVICE="exe-sc-tools"
DEPLOY_JSON="exe-sc-tools-deploy.json"

# ── mealstock app ──────────────────────────────────────────────
echo "==> Building mealstock..."
docker build -t mealstock-app .

echo "==> Pushing mealstock..."
APP_TAG=$(aws lightsail push-container-image \
  --region "$REGION" --service-name "$SERVICE" \
  --label app --image mealstock-app \
  | grep -oP '(?<=as "):[^"]+')
echo "    mealstock image: $APP_TAG"

# ── scm-tools ──────────────────────────────────────────────────
echo "==> Building scm-tools..."
docker build -t scm-tools ./scm-tools

echo "==> Pushing scm-tools..."
SCM_TAG=$(aws lightsail push-container-image \
  --region "$REGION" --service-name "$SERVICE" \
  --label scm-tools --image scm-tools \
  | grep -oP '(?<=as "):[^"]+')
echo "    scm-tools image: $SCM_TAG"

# ── postgres-s3 ────────────────────────────────────────────────
echo "==> Building postgres-s3..."
docker build -t postgres-s3 ./postgres-s3

echo "==> Pushing postgres-s3..."
PG_TAG=$(aws lightsail push-container-image \
  --region "$REGION" --service-name "$SERVICE" \
  --label postgres --image postgres-s3 \
  | grep -oP '(?<=as "):[^"]+')
echo "    postgres-s3 image: $PG_TAG"

# ── update deploy JSON ─────────────────────────────────────────
echo "==> Updating $DEPLOY_JSON..."
python3 - "$DEPLOY_JSON" "$APP_TAG" "$SCM_TAG" "$PG_TAG" <<'EOF'
import sys, json
path, app_tag, scm_tag, pg_tag = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
with open(path) as f: d = json.load(f)
d["containers"]["app"]["image"]        = app_tag
d["containers"]["scm-tools"]["image"]  = scm_tag
d["containers"]["postgres"]["image"]   = pg_tag
with open(path, "w") as f: json.dump(d, f, indent=2)
print(f"  app       -> {app_tag}")
print(f"  scm-tools -> {scm_tag}")
print(f"  postgres  -> {pg_tag}")
EOF

# ── deploy ─────────────────────────────────────────────────────
echo "==> Deploying to Lightsail ($SERVICE)..."
aws lightsail create-container-service-deployment \
  --region "$REGION" --service-name "$SERVICE" \
  --cli-input-json "file://$DEPLOY_JSON"

echo "==> Done. Deployment in progress."
