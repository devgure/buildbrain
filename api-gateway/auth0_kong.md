Kong + Auth0 integration (dev)

This document shows how to configure Kong to validate Auth0-issued JWT access tokens for the `/ocr` route and how to call the protected endpoint.

Prereqs
- A running Kong (DB-less) using the provided `api-gateway/kong.yaml`.
- `kong-oidc` (OpenID Connect) plugin installed in your Kong runtime. If you use Kong Gateway Enterprise, use the built-in OIDC plugin. For OSS Kong you can install the community `kong-oidc` plugin.
- An Auth0 tenant with an API (set the API `Identifier` to your `AUTH0_AUDIENCE`).
- A Machine-to-Machine application in Auth0 with client credentials enabled.

Environment variables used in `kong.yaml`
- `AUTH0_DOMAIN` e.g. `your-tenant.us.auth0.com`
- `AUTH0_CLIENT_ID` (client id of your M2M app)
- `AUTH0_CLIENT_SECRET` (client secret)

How it works
1. Kong proxies requests to `/ocr/*` to the Donut service and strips the `/ocr` prefix (so `/ocr/extract` becomes `/extract`).
2. The `openid-connect` plugin validates incoming bearer tokens using the Auth0 discovery document (JWKS verification).

Generate an Auth0 access token (Client Credentials flow)

Replace placeholders below and run:

```bash
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_CLIENT_ID=YOUR_CLIENT_ID
AUTH0_CLIENT_SECRET=YOUR_CLIENT_SECRET
AUTH0_AUDIENCE=YOUR_API_IDENTIFIER

# Request an access token
TOKEN=$(curl -s --request POST \
  --url https://${AUTH0_DOMAIN}/oauth/token \
  --header 'content-type: application/json' \
  --data '{"client_id":"'${AUTH0_CLIENT_ID}'","client_secret":"'${AUTH0_CLIENT_SECRET}'","audience":"'${AUTH0_AUDIENCE}'","grant_type":"client_credentials"}' \
  | jq -r .access_token)

echo "ACCESS TOKEN: $TOKEN"
```

Call the Kong-proxied Donut endpoint

Assuming Kong is listening on `http://localhost:8000`:

```bash
# Upload a file to the Donut extract endpoint through Kong
curl -v -H "Authorization: Bearer ${TOKEN}" \
  -F "file=@./test/fixtures/blueprint.jpg" \
  http://localhost:8000/ocr/extract
```

Notes & Troubleshooting
- Ensure the `openid-connect` plugin is available in your Kong image. For OSS Kong you may need to install the plugin as a custom plugin and rebuild the image.
- If you prefer not to install third-party plugins, you can configure Kong to validate tokens using the `jwt` plugin and provide the Auth0 JWKS to Kong (enterprise workflows or custom scripts required).
- If Kong returns 401, check Kong admin logs and verify the `aud` claim in the token matches your API Identifier (Auth0 audience).
- For local dev, you can bypass Kong validation by setting `DISABLE_AUTH=true` for backend but that skips gateway-level security.

Automating JWKS import

This repo includes `import_jwks.py` which fetches your Auth0 JWKS and converts RSA keys to PEM files. It can also attempt to upload PEMs to Kong. Example usage:

```bash
python api-gateway/import_jwks.py --auth0-domain your-tenant.us.auth0.com --out-dir ./api-gateway/jwks_pems --kong-admin http://localhost:8001 --consumer auth0_clients
```

Notes on uploading to Kong: Kong's Admin API varies by version. The script will attempt a POST to `/consumers/{consumer}/jwt` with `{algorithm: 'RS256', key: <PEM>}` which works for some Kong versions/distributions. If your Kong requires a different endpoint or format, pass `--upload-endpoint some/path` to tailor the POST target, or manually import the PEM files produced in `./api-gateway/jwks_pems`.

Security
- Never commit `AUTH0_CLIENT_SECRET` into source control.
- For production, configure Kong admin API access control and use secure channels for client credentials.

References
- Auth0 Client Credentials: https://auth0.com/docs/flows/client-credentials
- Kong OIDC plugin (community): https://github.com/netsells/kong-oidc
- Kong Declarative Configuration: https://docs.konghq.com/gateway/latest/db-less-and-declarative-config/
