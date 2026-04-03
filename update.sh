#!/usr/bin/env bash
# Lightweight update — no npm ci (use when only source files changed, no new packages).
# Run on VPS: bash update.sh
set -e

echo "==> Pulling latest changes..."
git pull

echo "==> Building Next.js..."
npm run build

echo "==> Restarting app..."
pm2 reload ecosystem.config.js --env production

echo "==> Done."
pm2 status
