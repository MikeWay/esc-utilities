#!/bin/bash
# Deploy BoatManager to production server
set -e

SERVER="bitnami@ribmanager.exe-sailing-club.org"
SSH_KEY="$HOME/.ssh/LightsailDefaultKey-eu-west-2.pem"
REMOTE_DIR="BoatManager"

echo "==> Deploying to $SERVER..."

ssh -i "$SSH_KEY" "$SERVER" bash <<EOF
  set -e
  cd "$REMOTE_DIR"
  echo "==> Stopping service..."
  sudo systemctl stop boatmanager
  echo "==> Pulling latest code..."
  git fetch origin
  git checkout -f master
  git reset --hard origin/master
  echo "==> Building for production..."
  npm run build-all-prod
  echo "==> Starting service..."
  sudo systemctl start boatmanager
  echo "==> Done. Checking status..."
  sudo systemctl status boatmanager --no-pager
EOF

echo "==> Deployed successfully."
