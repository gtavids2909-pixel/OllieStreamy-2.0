"""Backend API tests for OllieStreamy (LiveTV + base)."""
import os
import base64
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://rebuild-fresh-2.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ---------- Base health ----------
def test_root(s):
    r = s.get(f"{API}/", timeout=30)
    assert r.status_code == 200
    assert r.json().get("message") == "Hello World"


# ---------- LiveTV ----------
def test_livetv_countries(s):
    r = s.get(f"{API}/livetv/countries", timeout=120)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "items" in data
    assert isinstance(data["items"], list)
    assert len(data["items"]) > 0
    sample = data["items"][0]
    assert "code" in sample or "name" in sample


def test_livetv_categories(s):
    r = s.get(f"{API}/livetv/categories", timeout=120)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "items" in data
    assert isinstance(data["items"], list)


def test_livetv_channels_paginated(s):
    r = s.get(f"{API}/livetv/channels", params={"page": 1, "page_size": 10}, timeout=120)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "items" in data
    assert isinstance(data["items"], list)
    assert len(data["items"]) <= 10


def test_livetv_channels_filter_search(s):
    r = s.get(f"{API}/livetv/channels", params={"q": "news", "page": 1, "page_size": 5}, timeout=120)
    assert r.status_code == 200
    data = r.json()
    assert "items" in data


def test_livetv_probe_status(s):
    r = s.get(f"{API}/livetv/probe-status", timeout=60)
    assert r.status_code == 200
    data = r.json()
    for k in ("alive", "dead", "unchecked"):
        assert k in data


def test_livetv_channel_detail(s):
    # Fetch one channel id first
    r = s.get(f"{API}/livetv/channels", params={"page": 1, "page_size": 5}, timeout=120)
    assert r.status_code == 200
    items = r.json().get("items", [])
    if not items:
        pytest.skip("No channels available")
    cid = items[0].get("id") or items[0].get("_id") or items[0].get("channel_id")
    assert cid, f"No id in channel: {items[0]}"
    r2 = s.get(f"{API}/livetv/channel/{cid}", params={"fresh": "false"}, timeout=60)
    assert r2.status_code in (200, 404), r2.text


def test_livetv_channel_404(s):
    r = s.get(f"{API}/livetv/channel/__nonexistent__", params={"fresh": "false"}, timeout=60)
    assert r.status_code == 404


def test_livetv_proxy_missing_param(s):
    r = s.get(f"{API}/livetv/proxy", timeout=30)
    assert r.status_code in (400, 422)


def test_livetv_proxy_invalid_b64(s):
    r = s.get(f"{API}/livetv/proxy", params={"u": "!!!not-b64!!!"}, timeout=30)
    assert r.status_code in (400, 422)
