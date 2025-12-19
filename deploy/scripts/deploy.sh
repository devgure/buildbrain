#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR"

# Build backend image
docker build -f backend/Dockerfile.prod -t buildbrain/backend:latest ./backend
# Build frontend image
docker build -f frontend/Dockerfile.prod -t buildbrain/frontend:latest ./frontend

echo "Images built: buildbrain/backend:latest buildbrain/frontend:latest"

echo "Stopping and recreating containers using docker-compose..."
if [ -f docker-compose.yml ]; then
  docker-compose pull || true
  docker-compose up -d --remove-orphans
else
  echo "No docker-compose.yml found at repo root; please deploy images to your host orchestrator or use the provided systemd units."
fi
