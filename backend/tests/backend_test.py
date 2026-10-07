"""Backend API tests for OllieStreamy (LiveTV + Sports + Replays + Admin)."""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
API = f"{BASE_URL}/api"
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "H2T0-d9oq6NpjTeKVSt4xysxiq0zEk59")


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="module")
def admin():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json", "X-Admin-Token": ADMIN_TOKEN})
    return sess


# ---------- Base ----------
def test_root(s):
    r = s.get(f"{API}/", timeout=30)
    assert r.status_code == 200
    assert r.json().get("message") == "Hello World"


# ---------- LiveTV ----------
def test_livetv_countries(s):
    r = s.get(f"{API}/livetv/countries", timeout=120)
    assert r.status_code == 200
    assert isinstance(r.json().get("items"), list)


def test_livetv_countries_status_offline(s):
    r = s.get(f"{API}/livetv/countries", params={"status": "offline"}, timeout=120)
    assert r.status_code == 200
    assert "items" in r.json()


def test_livetv_categories(s):
    r = s.get(f"{API}/livetv/categories", timeout=120)
    assert r.status_code == 200
    assert isinstance(r.json().get("items"), list)


def test_livetv_channels_paginated(s):
    r = s.get(f"{API}/livetv/channels", params={"page": 1, "page_size": 10}, timeout=120)
    assert r.status_code == 200
    data = r.json()
    assert "items" in data and len(data["items"]) <= 10


def test_livetv_channels_filter_status_live(s):
    r = s.get(f"{API}/livetv/channels", params={"status": "live", "page_size": 5}, timeout=120)
    assert r.status_code == 200


def test_livetv_channels_filter_sport_pcat(s):
    r = s.get(f"{API}/livetv/channels", params={"status": "live", "sport": "Football", "pcat": "News", "page_size": 5}, timeout=120)
    assert r.status_code == 200


def test_livetv_facets_live(s):
    r = s.get(f"{API}/livetv/facets", params={"status": "live"}, timeout=120)
    assert r.status_code == 200
    data = r.json()
    # expect keys like counts/countries/categories/sports/pcats
    assert isinstance(data, dict) and len(data) > 0


def test_livetv_facets_bad_status(s):
    r = s.get(f"{API}/livetv/facets", params={"status": "bogus"}, timeout=30)
    assert r.status_code in (400, 422)


def test_livetv_probe_status(s):
    r = s.get(f"{API}/livetv/probe-status", timeout=60)
    assert r.status_code == 200
    for k in ("alive", "dead", "unchecked"):
        assert k in r.json()


def test_livetv_channel_detail_or_404(s):
    r = s.get(f"{API}/livetv/channels", params={"page": 1, "page_size": 5}, timeout=120)
    items = r.json().get("items", [])
    if not items:
        pytest.skip("no channels")
    cid = items[0].get("id") or items[0].get("_id")
    r2 = s.get(f"{API}/livetv/channel/{cid}", params={"fresh": "false"}, timeout=60)
    assert r2.status_code in (200, 404)


def test_livetv_channel_404(s):
    r = s.get(f"{API}/livetv/channel/__nope__", params={"fresh": "false"}, timeout=30)
    assert r.status_code == 404


def test_livetv_proxy_missing_param(s):
    r = s.get(f"{API}/livetv/proxy", timeout=30)
    assert r.status_code in (400, 422)


def test_livetv_sync_no_force_public(s):
    r = s.get(f"{API}/livetv/sync", timeout=120)
    assert r.status_code == 200


def test_livetv_sync_force_requires_token(s):
    r = s.get(f"{API}/livetv/sync", params={"force": "true"}, timeout=30)
    assert r.status_code == 401


# ---------- Sports fixtures ----------
def test_sports_fixtures_soccer(s):
    r = s.get(f"{API}/sports/fixtures", params={"sport": "Soccer"}, timeout=60)
    assert r.status_code == 200
    data = r.json()
    # typically {"items": [...]} or list
    assert isinstance(data, (dict, list))


def test_sports_fixtures_unknown_sport_400(s):
    r = s.get(f"{API}/sports/fixtures", params={"sport": "Quidditch"}, timeout=30)
    assert r.status_code == 400


# ---------- Replays ----------
def test_replays_list(s):
    r = s.get(f"{API}/replays", timeout=120)
    assert r.status_code == 200
    data = r.json()
    assert "items" in data
    assert "updated_at" in data or "counts" in data


def test_replays_filter_football(s):
    r = s.get(f"{API}/replays", params={"sport": "Football"}, timeout=120)
    assert r.status_code == 200
    assert "items" in r.json()


# ---------- Admin auth guard (no token = 401) ----------
@pytest.mark.parametrize("method,path", [
    ("GET", "/admin/stats"),
    ("GET", "/admin/playlists"),
    ("POST", "/admin/playlists"),
    ("DELETE", "/admin/playlists"),
    ("POST", "/admin/replays/rescan"),
    ("POST", "/admin/reannotate"),
    ("POST", "/admin/test-stream"),
])
def test_admin_requires_token(s, method, path):
    kwargs = {"timeout": 30}
    if method == "DELETE":
        kwargs["params"] = {"url": "https://example.com/x.m3u8"}
    else:
        kwargs["json"] = {"url": "https://example.com/x.m3u8"}
    r = s.request(method, f"{API}{path}", **kwargs)
    assert r.status_code == 401, f"{method} {path} -> {r.status_code}"


# ---------- Admin happy paths with token ----------
def test_admin_stats_ok(admin):
    r = admin.get(f"{API}/admin/stats", timeout=60)
    assert r.status_code == 200
    data = r.json()
    for k in ("channels", "visible_channels", "countries", "streams"):
        assert k in data


def test_admin_playlists_crud(admin):
    url = "https://example.com/TEST_playlist.m3u8"
    # create
    r = admin.post(f"{API}/admin/playlists", json={"url": url}, timeout=30)
    assert r.status_code == 200 and r.json().get("ok") is True
    # list
    r = admin.get(f"{API}/admin/playlists", timeout=30)
    assert r.status_code == 200
    urls = [i["url"] for i in r.json().get("items", [])]
    assert url in urls
    # delete
    r = admin.delete(f"{API}/admin/playlists", params={"url": url}, timeout=30)
    assert r.status_code == 200
    r = admin.get(f"{API}/admin/playlists", timeout=30)
    urls = [i["url"] for i in r.json().get("items", [])]
    assert url not in urls


def test_admin_playlists_bad_url_400(admin):
    r = admin.post(f"{API}/admin/playlists", json={"url": "notaurl"}, timeout=30)
    assert r.status_code == 400


def test_admin_test_stream_ok(admin):
    r = admin.post(f"{API}/admin/test-stream", json={"url": "https://example.com/404.m3u8"}, timeout=60)
    assert r.status_code == 200
    data = r.json()
    assert "alive" in data and "reason" in data and "proxy_url" in data


def test_admin_wrong_token_401(s):
    r = s.get(f"{API}/admin/stats", headers={"X-Admin-Token": "wrong"}, timeout=30)
    assert r.status_code == 401
