import importlib.util
import pathlib
from unittest.mock import patch, MagicMock

# Load the import_jwks_auto module from the api-gateway folder by path
mod_path = pathlib.Path(__file__).resolve().parents[1] / "import_jwks_auto.py"
spec = importlib.util.spec_from_file_location("import_jwks_auto", str(mod_path))
importer = importlib.util.module_from_spec(spec)
import sys
sys.modules['import_jwks_auto'] = importer
spec.loader.exec_module(importer)


def make_post_response(status=201, text='created'):
    r = MagicMock()
    r.status_code = status
    r.text = text
    return r


def test_upload_flow_with_mocked_kong(tmp_path, monkeypatch):
    pem_file = tmp_path / 'fakekey.pem'
    pem_file.write_text('-----BEGIN PUBLIC KEY-----\nFAKEKEY\n-----END PUBLIC KEY-----')

    monkeypatch.setattr(importer, 'fetch_jwks', lambda domain: {'keys': []})
    monkeypatch.setattr(importer, 'save_pems', lambda jwks, out_dir: [{'kid': 'fake', 'path': str(pem_file)}])
    monkeypatch.setattr(importer, 'detect_kong_version', lambda url: 'kong/3.2.0')

    import requests
    original_post = requests.post

    def fake_post(url, json=None, timeout=10):
        if '/consumers/' in url and '/jwt' in url:
            return make_post_response(201, 'created')
        return make_post_response(400, 'bad')

    monkeypatch.setattr('import_jwks_auto.requests.post', fake_post)

    args = [
        '--auth0-domain', 'example.auth0.com',
        '--out-dir', str(tmp_path),
        '--kong-admin', 'http://localhost:8001',
        '--consumer', 'test-consumer',
        '--upload'
    ]

    import sys
    sys.argv = ['import_jwks_auto'] + args
    importer.main()

    monkeypatch.setattr('import_jwks_auto.requests.post', original_post)
