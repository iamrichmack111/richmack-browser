from __future__ import annotations

import importlib
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def service(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    downloads = tmp_path / "downloads"
    workspace = tmp_path / "workspace"
    downloads.mkdir()
    workspace.mkdir()
    monkeypatch.setenv("RICHMACK_DOWNLOADS", str(downloads))
    monkeypatch.setenv("RICHMACK_WORKDIR", str(workspace))
    root = Path(__file__).resolve().parents[2]
    service_dir = root / "services"
    sys.path.insert(0, str(service_dir))
    try:
        sys.modules.pop("app.main", None)
        module = importlib.import_module("app.main")
        module = importlib.reload(module)
        yield module, TestClient(module.app), downloads
    finally:
        sys.path = [p for p in sys.path if p != str(service_dir)]


def test_health(service):
    _, client, _ = service
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["suite"] == "0.6.1"
    assert body["feeds"] is True


def test_feed_generation_deduplicates_and_is_valid_rss(service):
    _, client, downloads = service
    payload = {
        "source_url": "https://example.com/jobs?q=cloud",
        "title": "Cloud Jobs",
        "page_type": "jobs",
        "items": [
            {"title": "Cloud Engineer", "url": "https://example.com/job/123", "summary": "Atlanta, GA", "id": "job-123", "category": "cloud"},
            {"title": "Duplicate", "url": "https://example.com/job/123", "summary": "duplicate", "id": "duplicate", "category": "cloud"},
            {"title": "SRE", "url": "https://example.com/job/456", "summary": "Remote", "id": "job-456", "category": "sre"},
        ],
    }
    response = client.post("/feeds/generate", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["items"] == 2
    feed_file = downloads / "feeds" / body["name"]
    root = ET.fromstring(feed_file.read_text(encoding="utf-8"))
    items = root.findall("./channel/item")
    assert len(items) == 2
    assert items[0].findtext("guid") == "job-123"
    assert items[0].find("guid").attrib["isPermaLink"] == "false"


def test_generated_feed_can_be_read_back(service):
    _, client, _ = service
    generated = client.post("/feeds/generate", json={
        "source_url": "https://example.com/news",
        "title": "Example News",
        "page_type": "news",
        "items": [{"title": "Story", "url": "https://example.com/story"}],
    }).json()
    response = client.get(f"/feeds/{generated['name']}")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/rss+xml")
    ET.fromstring(response.text)


def test_rejects_unsafe_urls(service):
    _, client, _ = service
    response = client.post("/feeds/generate", json={
        "source_url": "file:///etc/passwd",
        "title": "Bad",
        "items": [{"title": "x", "url": "https://example.com/x"}],
    })
    assert response.status_code == 400


def test_document_path_traversal_is_blocked(service):
    module, _, _ = service
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc:
        module.inside_downloads("../../etc/passwd")
    assert exc.value.status_code == 403


def test_picked_state_round_trip(service):
    _, client, _ = service
    payload = {"selector": "button.follow", "text": "Follow", "url": "https://example.com"}
    assert client.post("/state/picked", json=payload).status_code == 200
    assert client.get("/state/picked").json()["picked"] == payload
    assert client.delete("/state/picked").status_code == 200
    assert client.get("/state/picked").json()["picked"] is None
