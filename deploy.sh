#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_DEFAULT_REGION:-eu-west-2}"
SERVICE="exe-sc-tools"
DEPLOY_JSON="exe-sc-tools-deploy.json"

# ── Pre-deploy backup ──────────────────────────────────────────
echo "==> Triggering pre-deploy S3 backup..."
SERVICE_URL=$(aws lightsail get-container-services \
  --region "$REGION" --service-name "$SERVICE" \
  --query 'containerServices[0].url' --output text 2>/dev/null || true)
BACKUP_TOKEN=$(python3 - "$DEPLOY_JSON" <<'EOF'
import sys, json, hashlib
try:
  d = json.load(open(sys.argv[1]))
  s = d['containers']['app']['environment'].get('SESSION_SECRET', '')
  print(hashlib.sha256((s + ':s3backup').encode()).hexdigest())
except Exception as e:
  print('')
EOF
)
if [ -n "$SERVICE_URL" ] && [ -n "$BACKUP_TOKEN" ]; then
  BACKUP_RESULT=$(curl -s -X POST \
    -H "Authorization: Bearer ${BACKUP_TOKEN}" \
    --max-time 40 \
    "${SERVICE_URL}mealstock/admin/backup" 2>/dev/null || echo '{"ok":false,"error":"curl failed"}')
  echo "    Result: $BACKUP_RESULT"
else
  echo "    Skipped (service not reachable or secret unavailable)"
fi

# ── nginx ──────────────────────────────────────────────────────
echo "==> Building nginx..."
docker build -t nginx-proxy ./nginx

echo "==> Pushing nginx..."
NGINX_TAG=$(aws lightsail push-container-image \
  --region "$REGION" --service-name "$SERVICE" \
  --label nginx --image nginx-proxy \
  | grep -oP '(?<=as "):[^"]+')
echo "    nginx image: $NGINX_TAG"

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

# ── boatmanager ────────────────────────────────────────────────
echo "==> Building boatmanager..."
docker build -t boatmanager ./boatmanager

echo "==> Pushing boatmanager..."
BM_TAG=$(aws lightsail push-container-image \
  --region "$REGION" --service-name "$SERVICE" \
  --label boatmanager --image boatmanager \
  | grep -oP '(?<=as "):[^"]+')
echo "    boatmanager image: $BM_TAG"

# ── update deploy JSON ─────────────────────────────────────────
echo "==> Updating $DEPLOY_JSON..."
python3 - "$DEPLOY_JSON" "$NGINX_TAG" "$APP_TAG" "$SCM_TAG" "$PG_TAG" "$BM_TAG" <<'EOF'
import sys, json
path, nginx_tag, app_tag, scm_tag, pg_tag, bm_tag = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5], sys.argv[6]
with open(path) as f: d = json.load(f)
d["containers"]["nginx"]["image"]       = nginx_tag
d["containers"]["app"]["image"]         = app_tag
d["containers"]["scm-tools"]["image"]   = scm_tag
d["containers"]["postgres"]["image"]    = pg_tag
d["containers"]["boatmanager"]["image"] = bm_tag
with open(path, "w") as f: json.dump(d, f, indent=2)
print(f"  nginx       -> {nginx_tag}")
print(f"  app         -> {app_tag}")
print(f"  scm-tools   -> {scm_tag}")
print(f"  postgres    -> {pg_tag}")
print(f"  boatmanager -> {bm_tag}")
EOF

# ── deploy ─────────────────────────────────────────────────────
echo "==> Deploying to Lightsail ($SERVICE)..."
# publicDomainNames is not accepted by create-container-service-deployment;
# strip it into a temp file for the deployment call.
DEPLOY_TMP=$(mktemp /tmp/deploy-XXXXXX.json)
python3 - "$DEPLOY_JSON" "$DEPLOY_TMP" <<'EOF'
import sys, json
d = json.load(open(sys.argv[1]))
d.pop('publicDomainNames', None)
json.dump(d, open(sys.argv[2], 'w'), indent=2)
EOF
aws lightsail create-container-service-deployment \
  --no-cli-pager \
  --region "$REGION" --service-name "$SERVICE" \
  --cli-input-json "file://$DEPLOY_TMP"
rm -f "$DEPLOY_TMP"

# ── custom domains ─────────────────────────────────────────────
PUB_DOMAINS=$(python3 - "$DEPLOY_JSON" <<'EOF'
import sys, json
d = json.load(open(sys.argv[1]))
print(json.dumps(d.get('publicDomainNames', {})))
EOF
)
if [ "$PUB_DOMAINS" != "{}" ] && [ -n "$PUB_DOMAINS" ]; then
  echo "==> Waiting for deployment to be ACTIVE before attaching custom domains..."
  until aws lightsail get-container-service-deployments \
      --no-cli-pager --region "$REGION" --service-name "$SERVICE" \
      --query 'deployments[0].state' --output text 2>/dev/null \
      | grep -qE '^(ACTIVE|FAILED)$'; do
    sleep 10
  done
  echo "==> Attaching custom domains..."
  aws lightsail update-container-service \
    --no-cli-pager \
    --region "$REGION" \
    --service-name "$SERVICE" \
    --public-domain-names "$PUB_DOMAINS"
fi

echo "==> Done. Deployment in progress."
