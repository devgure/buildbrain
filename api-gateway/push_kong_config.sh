#!/usr/bin/env bash
# Push declarative Kong YAML to Kong Admin API (/config) for DB-less mode
# Usage: KONG_ADMIN=http://localhost:8001 ./push_kong_config.sh api-gateway/kong.yaml

set -euo pipefail
KONG_ADMIN=${KONG_ADMIN:-http://localhost:8001}
FILE=${1:-api-gateway/kong.yaml}

if [ ! -f "$FILE" ]; then
  echo "Config file not found: $FILE"
  exit 2
fi

echo "Pushing $FILE to Kong Admin at $KONG_ADMIN/config"

curl -s -X POST "$KONG_ADMIN/config" \
  -H "Content-Type: application/yaml" \
  --data-binary "@$FILE" \
  | jq .

echo "Done. Check Kong admin: $KONG_ADMIN/status"