Kong + Auth0 (JWT + JWKS) — Example workflow (no third-party plugin)

Goal
- Validate Auth0 RS256 JWTs at Kong for the `/ocr` route without installing third-party OIDC plugins.

Overview
- Auth0 exposes a JWKS endpoint at `https://<AUTH0_DOMAIN>/.well-known/jwks.json` containing RSA public keys.
- Kong's built-in `jwt` plugin can validate JWTs; however for RS256 you must provide Kong with the public key(s) corresponding to the issuer.
- This document shows an example declarative snippet and a recommended approach to import JWKS keys to Kong via the Admin API.

1) Example Kong declarative snippet (attach `jwt` plugin to the Donut service)

```yaml
_format_version: "2.1"

services:
  - name: donut-ocr
    url: http://donut-gpu:8000
    routes:
      - name: donut-ocr-route
        paths:
          - /ocr
        strip_path: true

plugins:
  - name: jwt
    service: donut-ocr
    enabled: true
    config:
      # verify specific claims if desired
      claims_to_verify:
        - exp
      run_on_preflight: false
```

Important: the `jwt` plugin validates signatures using keys that Kong has been configured with. Kong does not automatically fetch Auth0 JWKS for the OSS `jwt` plugin; you must import the keys into Kong.

2) Import Auth0 JWKS into Kong (recommended approach)

- Fetch JWKS from Auth0:

```bash
AUTH0_DOMAIN=your-tenant.us.auth0.com
curl -s https://${AUTH0_DOMAIN}/.well-known/jwks.json | jq .
```

- Each JWKS entry contains `kid`, `kty`, `n`, `e` (RSA). Convert each RSA JWK to a PEM public key. You can use `jwcrypto` (Python) or `node-jose` (Node) utilities to perform conversion.

- Create a Kong `consumer` (a placeholder representing your API clients), and attach the RSA public key to the consumer or to the global `jwt` plugin data as required by your Kong distribution. Example (pseudo-commands):

```bash
# create consumer
curl -s -X POST http://localhost:8001/consumers -d username=auth0_clients
# add JWT credential (this API varies across Kong versions - some expose /consumers/{consumer}/jwt)
# For RS256 you may need to create the public key material in Kong's key store; consult your Kong version docs.
```

Notes
- Kong Enterprise and later OSS versions may expose administrative endpoints to import JWKS or configure JWKS-based verification. Check Kong's specific Admin API docs for your version.
- If you cannot import RSA keys into Kong's `jwt` plugin, use the `openid-connect` plugin (recommended) which validates tokens using the Auth0 discovery document (JWKS) automatically.

3) Testing the flow
- Obtain an access token from Auth0 using Client Credentials (see `api-gateway/auth0_kong.md` for a sample curl).
- Call the Kong endpoint with `Authorization: Bearer <token>`:

```bash
curl -v -H "Authorization: Bearer ${TOKEN}" http://localhost:8000/ocr/extract
```

4) Summary of options
- Preferred (simple): use `openid-connect` plugin — automatic JWKS handling (already included in the `kong.yaml` default in this repo).
- Alternative: use `jwt` plugin + import JWKS into Kong via Admin API — supported but requires extra admin work and depends on Kong version.

References
- Auth0 JWKS: https://auth0.com/docs/security/tokens/json-web-tokens/json-web-key-sets
- Kong JWT plugin docs: https://docs.konghq.com/gateway/latest/plugin-development/plugin-configuration/#jwt
