#!/usr/bin/env bash
# Run this on the VPS after each git pull:
#   bash deploy.sh
set -e

echo "==> Installing dependencies..."
npm ci --omit=dev

echo "==> Generating Prisma client..."
npm run db:generate

echo "==> Running DB migrations..."
npx prisma migrate deploy

echo "==> Building Next.js..."
npm run build

echo "==> Restarting app..."
pm2 reload ecosystem.config.js --env production

echo "==> Done."
pm2 status
