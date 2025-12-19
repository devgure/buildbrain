#!/usr/bin/env python3
"""
Enhanced JWKS importer and Kong uploader.

Features:
- Fetches Auth0 JWKS and converts RSA keys to PEM files.
- Tries multiple Kong Admin API endpoints and payload formats to upload public keys, to support different Kong versions/distributions.
- Saves PEM files under `out_dir` for manual review.

Usage:
  python import_jwks_auto.py --auth0-domain your-tenant.us.auth0.com --out-dir ./api-gateway/jwks_pems --kong-admin http://localhost:8001 --consumer auth0_clients

Options:
  --upload           Attempt automatic upload to Kong
  --upload-endpoint  Specify a single upload endpoint (overrides auto endpoint list)
  --dry-run          Don't perform uploads; just fetch and write PEMs

The script will try endpoints in this order (unless overridden):
  1) POST /consumers/{consumer}/jwt with JSON {algorithm: 'RS256', key: <PEM>} (works on some Kong variants)
  2) POST /consumers/{consumer}/keys with JSON {key: <PEM>, type: 'rsa_public_key'}
  3) POST /plugins (create a jwt-key provider) -- uses plugin-specific endpoint; best-effort

Note: Kong Admin API paths and payloads differ by version. This script attempts common variants and prints server responses for debugging.
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
    padding = '=' * ((4 - len(b64) % 4) % 4)
    data = urlsafe_b64decode(b64 + padding)
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


# Try various upload strategies
def try_uploads(kong_admin: str, consumer: str, pem_path: str, upload_endpoint: str = None):
    with open(pem_path, 'r') as f:
        pem = f.read()

    candidates = []
    if upload_endpoint:
        candidates.append({'path': upload_endpoint, 'type': 'custom'})
    # if callers pass in candidates via environment detection, use them; otherwise use common endpoints
    if len(candidates) == 0:
        candidates = [
            {'path': f'/consumers/{consumer}/jwt', 'method': 'json', 'payload': {'algorithm': 'RS256', 'key': pem}},
            {'path': f'/consumers/{consumer}/keys', 'method': 'json', 'payload': {'key': pem, 'type': 'rsa_public_key'}},
            {'path': f'/plugins', 'method': 'json', 'payload': {'name': 'jwt-key', 'config': {'public_key': pem}}},
        ]

    results = []
    for c in candidates:
        url = kong_admin.rstrip('/') + c['path']
        print(f'Trying upload to {url} (method={c.get("method")})')
        try:
            if c.get('method') == 'json':
                r = requests.post(url, json=c.get('payload'), timeout=10)
            else:
                r = requests.post(url, files={'file': open(pem_path, 'rb')}, timeout=10)
            print(f'--> {r.status_code} {r.text[:400]}')
            results.append({'url': url, 'status': r.status_code, 'text': r.text})
            if r.status_code in (200,201):
                print('Upload succeeded')
                break
        except Exception as e:
            print('Upload attempt failed:', str(e))
            results.append({'url': url, 'error': str(e)})
    return results


def detect_kong_version(kong_admin_url: str):
    """Return a brief string describing Kong admin info (version/header/text)."""
    try:
        r = requests.get(kong_admin_url.rstrip('/') + '/', timeout=5)
        server = r.headers.get('Server', '')
        if server:
            return server
    except Exception:
        pass
    try:
        r = requests.get(kong_admin_url.rstrip('/') + '/status', timeout=5)
        if r.ok and r.headers.get('Content-Type', '').startswith('application/json'):
            data = r.json()
            if isinstance(data, dict):
                return data.get('version') or json.dumps(data)
        return r.text[:200]
    except Exception as e:
        return str(e)


def select_template(kong_version_info: str, consumer: str):
    """Select a candidate template set name and return the candidate list."""
    # Explicit endpoint payload templates for known Kong versions
    templates = {
        'oss-2': [
            {'path': f'/consumers/{consumer}/jwt', 'method': 'json', 'payload': {'algorithm': 'RS256', 'key': None}},
            {'path': f'/consumers/{consumer}/keys', 'method': 'json', 'payload': {'key': None, 'type': 'rsa_public_key'}},
        ],
        'oss-3': [
            {'path': f'/consumers/{consumer}/jwt', 'method': 'json', 'payload': {'algorithm': 'RS256', 'key': None}},
            {'path': f'/consumers/{consumer}/keys', 'method': 'json', 'payload': {'key': None, 'type': 'rsa_public_key'}},
            {'path': f'/plugins', 'method': 'json', 'payload': {'name': 'jwt-key', 'config': {'public_key': None}}},
        ],
        'enterprise-2': [
            {'path': f'/keys', 'method': 'json', 'payload': {'key': None, 'name': f'auth0-{consumer}', 'type': 'rsa_public_key'}},
            {'path': f'/consumers/{consumer}/jwt', 'method': 'json', 'payload': {'algorithm': 'RS256', 'key': None}},
        ],
        'enterprise-3': [
            {'path': f'/keys', 'method': 'json', 'payload': {'key': None, 'name': f'auth0-{consumer}', 'type': 'rsa_public_key'}},
            {'path': f'/consumers/{consumer}/keys', 'method': 'json', 'payload': {'key': None, 'type': 'rsa_public_key'}},
        ],
        'generic': [
            {'path': f'/consumers/{consumer}/jwt', 'method': 'json', 'payload': {'algorithm': 'RS256', 'key': None}},
            {'path': f'/consumers/{consumer}/keys', 'method': 'json', 'payload': {'key': None, 'type': 'rsa_public_key'}},
            {'path': f'/plugins', 'method': 'json', 'payload': {'name': 'jwt-key', 'config': {'public_key': None}}},
        ]
    }

    info = (kong_version_info or '').lower()
    selected = 'generic'
    if 'kong/2.' in info or ('oss' in info and '2.' in info):
        selected = 'oss-2'
    elif 'kong/3.' in info or ('oss' in info and '3.' in info):
        selected = 'oss-3'
    elif 'enterprise' in info and '2.' in info:
        selected = 'enterprise-2'
    elif 'enterprise' in info and '3.' in info:
        selected = 'enterprise-3'
    else:
        if 'enterprise' in info or 'kong gateway' in info:
            selected = 'enterprise-3'

    return selected, templates.get(selected, templates['generic'])


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--auth0-domain', required=True, help='Auth0 tenant domain, e.g. tenant.us.auth0.com')
    p.add_argument('--out-dir', default='./api-gateway/jwks_pems', help='Directory to save PEM files')
    p.add_argument('--kong-admin', help='Kong Admin API base URL, e.g. http://localhost:8001')
    p.add_argument('--consumer', help='Kong consumer name to attach the keys to')
    p.add_argument('--upload', action='store_true', help='Attempt uploads to Kong')
    p.add_argument('--upload-endpoint', help='Specify a single upload endpoint to try (overrides auto list)')
    p.add_argument('--dry-run', action='store_true', help='Only fetch and write PEMs; do not upload')
    args = p.parse_args()

    jwks = fetch_jwks(args.auth0_domain)
    saved = save_pems(jwks, args.out_dir)
    print(f'Saved {len(saved)} PEM files to {args.out_dir}')

    if args.upload and args.kong_admin and args.consumer and not args.dry_run:
        print('Attempting to upload PEMs to Kong...')
        # Create consumer if necessary
        try:
            resp = requests.post(args.kong_admin.rstrip('/') + '/consumers', json={'username': args.consumer}, timeout=10)
            print('Create consumer response:', resp.status_code, resp.text[:300])
        except Exception as e:
            print('Create consumer failed:', e)

        # Detect Kong version and decide candidate endpoints
        def detect_kong_version(kong_admin_url: str):
            try:
                r = requests.get(kong_admin_url.rstrip('/') + '/', timeout=5)
                server = r.headers.get('Server','')
                if server:
                    return server
            except Exception:
                pass
            try:
                r = requests.get(kong_admin_url.rstrip('/') + '/status', timeout=5)
                if r.ok and r.headers.get('Content-Type','').startswith('application/json'):
                    data = r.json()
                    # Kong Gateway Enterprise/OSS may include version info
                    if isinstance(data, dict):
                        return data.get('version') or json.dumps(data)
                return r.text[:200]
            except Exception as e:
                return str(e)

        kong_version_info = detect_kong_version(args.kong_admin)
        print('Detected Kong admin info:', kong_version_info)

        # Explicit endpoint payload templates for known Kong versions
        templates = {
            'oss-2': [
                {'path': f'/consumers/{args.consumer}/jwt', 'method': 'json', 'payload': {'algorithm': 'RS256', 'key': None}},
                {'path': f'/consumers/{args.consumer}/keys', 'method': 'json', 'payload': {'key': None, 'type': 'rsa_public_key'}},
            ],
            'oss-3': [
                {'path': f'/consumers/{args.consumer}/jwt', 'method': 'json', 'payload': {'algorithm': 'RS256', 'key': None}},
                {'path': f'/consumers/{args.consumer}/keys', 'method': 'json', 'payload': {'key': None, 'type': 'rsa_public_key'}},
                {'path': f'/plugins', 'method': 'json', 'payload': {'name': 'jwt-key', 'config': {'public_key': None}}},
            ],
            'enterprise-2': [
                {'path': f'/keys', 'method': 'json', 'payload': {'key': None, 'name': f'auth0-{args.consumer}', 'type': 'rsa_public_key'}},
                {'path': f'/consumers/{args.consumer}/jwt', 'method': 'json', 'payload': {'algorithm': 'RS256', 'key': None}},
            ],
            'enterprise-3': [
                {'path': f'/keys', 'method': 'json', 'payload': {'key': None, 'name': f'auth0-{args.consumer}', 'type': 'rsa_public_key'}},
                {'path': f'/consumers/{args.consumer}/keys', 'method': 'json', 'payload': {'key': None, 'type': 'rsa_public_key'}},
            ],
            'generic': [
                {'path': f'/consumers/{args.consumer}/jwt', 'method': 'json', 'payload': {'algorithm': 'RS256', 'key': None}},
                {'path': f'/consumers/{args.consumer}/keys', 'method': 'json', 'payload': {'key': None, 'type': 'rsa_public_key'}},
                {'path': f'/plugins', 'method': 'json', 'payload': {'name': 'jwt-key', 'config': {'public_key': None}}},
            ]
        }

        info = (kong_version_info or '').lower()
        selected = 'generic'
        if 'kong/2.' in info or ('oss' in info and '2.' in info):
            selected = 'oss-2'
        elif 'kong/3.' in info or ('oss' in info and '3.' in info):
            selected = 'oss-3'
        elif 'enterprise' in info and '2.' in info:
            selected = 'enterprise-2'
        elif 'enterprise' in info and '3.' in info:
            selected = 'enterprise-3'
        else:
            # additional heuristics
            if 'enterprise' in info or 'kong gateway' in info:
                selected = 'enterprise-3'

        candidate_list = templates.get(selected, templates['generic'])
        print(f'Selected template set: {selected}')

        for s in saved:
            print('Uploading', s['path'])
            # Try candidate_list in order, injecting PEM content
            upload_results = []
            for c in candidate_list:
                # build full payload
                payload = c.get('payload') or {}
                # inject pem into known keys
                if 'key' in payload:
                    payload['key'] = open(s['path']).read()
                if 'public_key' in (payload.get('config') or {}):
                    payload['config']['public_key'] = open(s['path']).read()
                try:
                    url = args.kong_admin.rstrip('/') + c['path']
                    print('Trying', url)
                    r = requests.post(url, json=payload, timeout=10)
                    upload_results.append({'url': url, 'status': r.status_code, 'text': r.text})
                    print('-->', r.status_code)
                    if r.status_code in (200,201):
                        print('Upload succeeded to', url)
                        break
                except Exception as e:
                    upload_results.append({'url': c['path'], 'error': str(e)})
                    print('Error uploading to', c['path'], e)
            print('Upload attempts result:', json.dumps(upload_results, indent=2)[:2000])


if __name__ == '__main__':
    main()
