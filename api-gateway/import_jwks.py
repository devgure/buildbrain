#!/usr/bin/env python3
"""
Fetch Auth0 JWKS, convert RSA keys to PEM files, and optionally upload to Kong Admin API.

Usage:
  python import_jwks.py --auth0-domain your-tenant.us.auth0.com --out-dir ./jwks_pems [--kong-admin http://localhost:8001 --consumer my-consumer]

Notes:
- Requires `requests` and `cryptography` packages.
- Upload behavior depends on your Kong version. The script will attempt a sensible POST to /consumers/{consumer}/jwt with the PEM in the `key` field and algorithm=RS256.
- If your Kong Admin endpoints differ, use the `--upload-endpoint` option to specify the exact path to POST to.
"""

import argparse
import requests
import os
import json
from base64 import urlsafe_b64decode

try:
    from cryptography.hazmat.primitives.asymmetric.rsa import RSAPublicNumbers
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.backends import default_backend
except Exception as e:
    print('Missing cryptography library. Install with: pip install cryptography')
    raise


def int_from_base64(b64: str) -> int:
    # Add padding
    b64 += '=='
    data = urlsafe_b64decode(b64 + '==' )
    return int.from_bytes(data, 'big')


def jwk_to_pem(jwk: dict) -> bytes:
    kty = jwk.get('kty')
    if kty != 'RSA':
        raise ValueError('Only RSA keys supported in this script')
    n_b64 = jwk.get('n')
    e_b64 = jwk.get('e')
    n = int_from_base64(n_b64)
    e = int_from_base64(e_b64)
    pub_nums = RSAPublicNumbers(e, n)
    pub_key = pub_nums.public_key(default_backend())
    pem = pub_key.public_bytes(encoding=serialization.Encoding.PEM, format=serialization.PublicFormat.SubjectPublicKeyInfo)
    return pem


def fetch_jwks(auth0_domain: str):
    url = f'https://{auth0_domain}/.well-known/jwks.json'
    r = requests.get(url, timeout=10)
    r.raise_for_status()
    return r.json()


def save_pems(jwks: dict, out_dir: str):
    os.makedirs(out_dir, exist_ok=True)
    saved = []
    for key in jwks.get('keys', []):
        kid = key.get('kid') or key.get('alg')
        try:
            pem = jwk_to_pem(key)
        except Exception as e:
            print(f'Skipping key {kid}: {e}')
            continue
        path = os.path.join(out_dir, f'{kid}.pem')
        with open(path, 'wb') as f:
            f.write(pem)
        print(f'Wrote {path}')
        saved.append({'kid': kid, 'path': path})
    return saved


def kong_create_consumer(kong_admin: str, consumer: str):
    url = kong_admin.rstrip('/') + '/consumers'
    r = requests.post(url, json={'username': consumer})
    if r.status_code in (200,201):
        print('Created consumer or already exists')
    elif r.status_code == 409:
        print('Consumer already exists')
    else:
        print('Create consumer response:', r.status_code, r.text)


def kong_upload_pem(kong_admin: str, consumer: str, pem_path: str, upload_endpoint: str = None):
    # Default: try POST /consumers/{consumer}/jwt with {algorithm: 'RS256', key: PEM}
    if upload_endpoint:
        url = kong_admin.rstrip('/') + '/' + upload_endpoint.lstrip('/')
        data = {'pem_file': open(pem_path, 'rb')}
        r = requests.post(url, files=data)
        return r

    url = kong_admin.rstrip('/') + f'/consumers/{consumer}/jwt'
    with open(pem_path, 'r') as f:
        pem = f.read()
    payload = {'algorithm': 'RS256', 'key': pem}
    r = requests.post(url, json=payload)
    return r


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--auth0-domain', required=True, help='Auth0 tenant domain, e.g. tenant.us.auth0.com')
    p.add_argument('--out-dir', default='./api-gateway/jwks_pems', help='Directory to save PEM files')
    p.add_argument('--kong-admin', help='Kong Admin API base URL, e.g. http://localhost:8001')
    p.add_argument('--consumer', help='Kong consumer name to attach the keys to')
    p.add_argument('--upload-endpoint', help='If Kong Admin uses nonstandard endpoint, provide the path to POST the keys to')
    args = p.parse_args()

    jwks = fetch_jwks(args.auth0_domain)
    saved = save_pems(jwks, args.out_dir)
    print(f'Saved {len(saved)} PEM files to {args.out_dir}')

    if args.kong_admin and args.consumer:
        print('Attempting to upload PEMs to Kong...')
        kong_create_consumer(args.kong_admin, args.consumer)
        for s in saved:
            print('Uploading', s['path'])
            r = kong_upload_pem(args.kong_admin, args.consumer, s['path'], args.upload_endpoint)
            print('Response:', r.status_code, r.text[:300])


if __name__ == '__main__':
    main()
