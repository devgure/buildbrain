import pytest
pytest.skip('legacy/duplicate test; using *_clean.py variants instead', allow_module_level=True)
import importlib.util
import pathlib
from unittest.mock import patch, MagicMock
import os
import tempfile

# Load the import_jwks_auto module from the api-gateway folder by path
mod_path = pathlib.Path(__file__).resolve().parents[1] / "import_jwks_auto.py"
spec = importlib.util.spec_from_file_location("import_jwks_auto", str(mod_path))
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


def make_post_response(status=201, text='created'):
    r = MagicMock()
    r.status_code = status
    r.text = text
    return r


def test_upload_flow_with_mocked_kong(tmp_path, monkeypatch):
    # Create a fake PEM file to be returned by save_pems
    pem_file = tmp_path / 'fakekey.pem'
    pem_file.write_text('-----BEGIN PUBLIC KEY-----\nFAKEKEY\n-----END PUBLIC KEY-----')

    # Mock fetch_jwks to avoid network
    monkeypatch.setattr(importer, 'fetch_jwks', lambda domain: {'keys': []})

    # Mock save_pems to return our fake file path
    monkeypatch.setattr(importer, 'save_pems', lambda jwks, out_dir: [{'kid': 'fake', 'path': str(pem_file)}])

    # Mock detect_kong_version to return a string that selects oss-3 template
    monkeypatch.setattr(importer, 'detect_kong_version', lambda url: 'kong/3.2.0')

    # Mock requests.post to simulate Kong Admin accepting the first candidate
    import requests
    original_post = requests.post

    def fake_post(url, json=None, timeout=10):
        # Return success for consumer jwt path
        if '/consumers/' in url and '/jwt' in url:
            return make_post_response(201, 'created')
        return make_post_response(400, 'bad')

    monkeypatch.setattr('import_jwks_auto.requests.post', fake_post)

    # Run main with arguments to perform upload; use dry_run False and upload True
    args = [
        '--auth0-domain', 'example.auth0.com',
        '--out-dir', str(tmp_path),
        '--kong-admin', 'http://localhost:8001',
        '--consumer', 'test-consumer',
        '--upload'
    ]

    # Call main; it should complete without raising
    importer.main_args = args  # unused normally, but keep namespace clean
    importer.main()

    # Clean up monkeypatch
    monkeypatch.setattr('import_jwks_auto.requests.post', original_post)
import importlib.util
import pathlib
from unittest.mock import patch, MagicMock
import os
import tempfile

# Load the import_jwks_auto module from the api-gateway folder by path
mod_path = pathlib.Path(__file__).resolve().parents[1] / "import_jwks_auto.py"
spec = importlib.util.spec_from_file_location("import_jwks_auto", str(mod_path))
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


def make_post_response(status=201, text='created'):
    r = MagicMock()
    r.status_code = status
    r.text = text
    return r


def test_upload_flow_with_mocked_kong(tmp_path, monkeypatch):
    # Create a fake PEM file to be returned by save_pems
    pem_file = tmp_path / 'fakekey.pem'
    pem_file.write_text('-----BEGIN PUBLIC KEY-----\nFAKEKEY\n-----END PUBLIC KEY-----')

    # Mock fetch_jwks to avoid network
    monkeypatch.setattr(importer, 'fetch_jwks', lambda domain: {'keys': []})

    # Mock save_pems to return our fake file path
    monkeypatch.setattr(importer, 'save_pems', lambda jwks, out_dir: [{'kid': 'fake', 'path': str(pem_file)}])

    # Mock detect_kong_version to return a string that selects oss-3 template
    monkeypatch.setattr(importer, 'detect_kong_version', lambda url: 'kong/3.2.0')

    # Mock requests.post to simulate Kong Admin accepting the first candidate
    import requests
    original_post = requests.post

    def fake_post(url, json=None, timeout=10):
        # Return success for consumer jwt path
        if '/consumers/' in url and '/jwt' in url:
            return make_post_response(201, 'created')
        return make_post_response(400, 'bad')

    monkeypatch.setattr('import_jwks_auto.requests.post', fake_post)

    # Run main with arguments to perform upload; use dry_run False and upload True
    args = [
        '--auth0-domain', 'example.auth0.com',
        '--out-dir', str(tmp_path),
        '--kong-admin', 'http://localhost:8001',
        '--consumer', 'test-consumer',
        '--upload'
    ]

    # Call main; it should complete without raising
    importer.main_args = args  # unused normally, but keep namespace clean
    importer.main()

    # Clean up monkeypatch
    monkeypatch.setattr('import_jwks_auto.requests.post', original_post)
import import_jwks_auto as importer
from unittest.mock import patch, MagicMock
import os
import tempfile


def make_post_response(status=201, text='created'):
    r = MagicMock()
    r.status_code = status
    r.text = text
    return r


def test_upload_flow_with_mocked_kong(tmp_path, monkeypatch):
    # Create a fake PEM file to be returned by save_pems
    pem_file = tmp_path / 'fakekey.pem'
    pem_file.write_text('-----BEGIN PUBLIC KEY-----\nFAKEKEY\n-----END PUBLIC KEY-----')

    # Mock fetch_jwks to avoid network
    monkeypatch.setattr(importer, 'fetch_jwks', lambda domain: {'keys': []})

    # Mock save_pems to return our fake file path
    monkeypatch.setattr(importer, 'save_pems', lambda jwks, out_dir: [{'kid': 'fake', 'path': str(pem_file)}])

    # Mock detect_kong_version to return a string that selects oss-3 template
    monkeypatch.setattr(importer, 'detect_kong_version', lambda url: 'kong/3.2.0')

    # Mock requests.post to simulate Kong Admin accepting the first candidate
    import requests
    original_post = requests.post

    def fake_post(url, json=None, timeout=10):
        # Return success for consumer jwt path
        if '/consumers/' in url and '/jwt' in url:
            return make_post_response(201, 'created')
        return make_post_response(400, 'bad')

    monkeypatch.setattr('import_jwks_auto.requests.post', fake_post)

    # Run main with arguments to perform upload; use dry_run False and upload True
    args = [
        '--auth0-domain', 'example.auth0.com',
        '--out-dir', str(tmp_path),
        '--kong-admin', 'http://localhost:8001',
        '--consumer', 'test-consumer',
        '--upload'
    ]

    # Call main; it should complete without raising
    importer.main_args = args  # unused normally, but keep namespace clean
    importer.main()

    # Clean up monkeypatch
    monkeypatch.setattr('import_jwks_auto.requests.post', original_post)
