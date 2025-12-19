import pytest
pytest.skip('legacy/duplicate test; using *_clean.py variants instead', allow_module_level=True)
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


def make_response(headers=None, text='', json_data=None, status_code=200):
    mock = MagicMock()
    mock.status_code = status_code
    mock.headers = headers or {}
    mock.text = text
    if json_data is not None:
        mock.json.return_value = json_data
        mock.headers['Content-Type'] = 'application/json'
    else:
        mock.json.side_effect = ValueError('no json')
    mock.ok = status_code == 200
    return mock


@patch('import_jwks_auto.requests.get')
def test_detect_kong_version_root_header(mock_get):
    # simulate root returning Server header
    resp = make_response(headers={'Server': 'kong/2.4.0'}, text='')
    mock_get.return_value = resp
    info = importer.detect_kong_version('http://localhost:8001')
    assert 'kong' in info.lower()


@patch('import_jwks_auto.requests.get')
def test_detect_kong_version_status_json(mock_get):
    # simulate root failing then /status returns json
    def side_effect(url, timeout=5):
        if url.endswith('/'):
            raise Exception('conn fail')
        return make_response(json_data={'version': '3.1.0'}, status_code=200)
    mock_get.side_effect = side_effect
    info = importer.detect_kong_version('http://localhost:8001')
    assert '3.1.0' in str(info)


def test_select_template_oss2():
    sel, candidates = importer.select_template('kong/2.1.0', 'test-consumer')
    assert sel == 'oss-2'
    assert any('/consumers/test-consumer/jwt' in c['path'] for c in candidates)


def test_select_template_oss3():
    sel, candidates = importer.select_template('kong/3.2.0', 'c')
    assert sel == 'oss-3'
    assert any('/plugins' in c['path'] for c in candidates)


def test_select_template_enterprise():
    sel, candidates = importer.select_template('Kong Gateway Enterprise 3.0', 'c')
    assert sel.startswith('enterprise')
    assert any('keys' in c['path'] or 'jwt' in c['path'] for c in candidates)
import import_jwks_auto as importer
from unittest.mock import patch, MagicMock


def make_response(headers=None, text='', json_data=None, status_code=200):
    mock = MagicMock()
    mock.status_code = status_code
    mock.headers = headers or {}
    mock.text = text
    if json_data is not None:
        mock.json.return_value = json_data
        mock.headers['Content-Type'] = 'application/json'
    else:
        mock.json.side_effect = ValueError('no json')
    mock.ok = status_code == 200
    return mock


@patch('import_jwks_auto.requests.get')
def test_detect_kong_version_root_header(mock_get):
    # simulate root returning Server header
    resp = make_response(headers={'Server': 'kong/2.4.0'}, text='')
    mock_get.return_value = resp
    info = importer.detect_kong_version('http://localhost:8001')
    assert 'kong' in info.lower()


@patch('import_jwks_auto.requests.get')
def test_detect_kong_version_status_json(mock_get):
    # simulate root failing then /status returns json
    def side_effect(url, timeout=5):
        import importlib.util
        import pathlib
        from unittest.mock import patch, MagicMock

        # Load the import_jwks_auto module from the api-gateway folder by path
        mod_path = pathlib.Path(__file__).resolve().parents[1] / "import_jwks_auto.py"
        spec = importlib.util.spec_from_file_location("import_jwks_auto", str(mod_path))
        importer = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(importer)


        def make_response(headers=None, text='', json_data=None, status_code=200):
            mock = MagicMock()
            mock.status_code = status_code
            mock.headers = headers or {}
            mock.text = text
            if json_data is not None:
                mock.json.return_value = json_data
                mock.headers['Content-Type'] = 'application/json'
            else:
                mock.json.side_effect = ValueError('no json')
            mock.ok = status_code == 200
            return mock


        @patch('import_jwks_auto.requests.get')
        def test_detect_kong_version_root_header(mock_get):
            # simulate root returning Server header
            resp = make_response(headers={'Server': 'kong/2.4.0'}, text='')
            mock_get.return_value = resp
            info = importer.detect_kong_version('http://localhost:8001')
            assert 'kong' in info.lower()


        @patch('import_jwks_auto.requests.get')
        def test_detect_kong_version_status_json(mock_get):
            # simulate root failing then /status returns json
            def side_effect(url, timeout=5):
                if url.endswith('/'):
                    raise Exception('conn fail')
                return make_response(json_data={'version': '3.1.0'}, status_code=200)
            mock_get.side_effect = side_effect
            info = importer.detect_kong_version('http://localhost:8001')
            assert '3.1.0' in str(info)


        def test_select_template_oss2():
            sel, candidates = importer.select_template('kong/2.1.0', 'test-consumer')
            assert sel == 'oss-2'
            assert any('/consumers/test-consumer/jwt' in c['path'] for c in candidates)


        def test_select_template_oss3():
            sel, candidates = importer.select_template('kong/3.2.0', 'c')
            assert sel == 'oss-3'
            assert any('/plugins' in c['path'] for c in candidates)


        def test_select_template_enterprise():
            sel, candidates = importer.select_template('Kong Gateway Enterprise 3.0', 'c')
            assert sel.startswith('enterprise')
            assert any('keys' in c['path'] or 'jwt' in c['path'] for c in candidates)
