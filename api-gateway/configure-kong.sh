#!/usr/bin/env bash
# Simple script to configure Kong JWT plugin to validate Auth0 tokens via OIDC/JWKS
# Usage: export AUTH0_DOMAIN=your-tenant.auth0.com; ./configure-kong.sh

if [ -z "$AUTH0_DOMAIN" ]; then
  echo "Set AUTH0_DOMAIN environment variable (e.g. your-tenant.auth0.com)"
  exit 1
fi
KONG_ADMIN=${KONG_ADMIN:-http://localhost:8001}

# enable jwt plugin globally (for demo purposes)
curl -s -X POST $KONG_ADMIN/plugins \
  -d "name=jwt" \
  -d "config.uri_param_names=authorization" \
  -d "config.claims_to_verify=exp" \
  | jq .

echo "Kong plugin creation response above. For Auth0 integration, use Kong's OIDC or custom validation against JWKS."
