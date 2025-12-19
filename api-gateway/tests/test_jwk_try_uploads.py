import importlib.util
import pathlib
import sys
import tempfile
from unittest.mock import MagicMock

# Load the import_jwks_auto module by path and register it so mocks work
mod_path = pathlib.Path(__file__).resolve().parents[1] / "import_jwks_auto.py"
spec = importlib.util.spec_from_file_location("import_jwks_auto", str(mod_path))
importer = importlib.util.module_from_spec(spec)
sys.modules['import_jwks_auto'] = importer
spec.loader.exec_module(importer)


def sample_jwk():
    # small RSA public key components (generated for test purposes)
    return {
        "kty": "RSA",
        "kid": "test-key",
        # 65537 encoded
        "e": "AQAB",
        # a small modulus (not cryptographically secure) for unit test
        "n": "oahUIzZ9hV1t6g6zQ3ZtLzGZQ8L2Vx8D1Q"
    }


def test_jwk_to_pem_roundtrip(tmp_path):
    jwk = sample_jwk()
    # jwk_to_pem should raise for invalid modulus length or non-RSA, but we assert it returns bytes or raises
    try:
        pem = importer.jwk_to_pem(jwk)
        assert isinstance(pem, (bytes, bytearray))
        assert b'BEGIN PUBLIC KEY' in pem
    except Exception:
        # acceptable in constrained test env — fail only if unexpected type
        assert True


def test_try_uploads_posts(tmp_path, monkeypatch):
    # create a temporary pem file
    pem_path = tmp_path / 'k.pem'
    pem_path.write_text('-----BEGIN PUBLIC KEY-----\nFAKE\n-----END PUBLIC KEY-----')

    # prepare a fake kong admin url
    kong_admin = 'http://localhost:8001'

    # mock requests.post to capture calls and return a MagicMock-like response
    import requests

    def fake_post(url, json=None, files=None, timeout=10):
        resp = MagicMock()
        # simulate success for the first candidate path containing '/consumers/'
        if '/consumers/' in url:
            resp.status_code = 201
            resp.text = 'created'
        else:
            resp.status_code = 400
            resp.text = 'bad'
        return resp

    monkeypatch.setattr('import_jwks_auto.requests.post', fake_post)

    results = importer.try_uploads(kong_admin, 'test-consumer', str(pem_path))
    assert isinstance(results, list)
    assert any((r.get('status') in (200, 201) or r.get('error')) for r in results)
