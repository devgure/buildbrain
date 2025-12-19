#!/usr/bin/env bash
# Build and run only the Donut GPU service using docker compose
# Requires: NVIDIA Container Toolkit and host drivers
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR"

echo "Building donut-gpu image..."
docker compose build --no-cache donut-gpu

echo "Starting donut-gpu container (with GPUs)..."
docker compose up -d --no-deps --build donut-gpu

echo "Donut GPU service started. Check logs with: docker compose logs -f donut-gpu" 
