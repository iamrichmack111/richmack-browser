from __future__ import annotations

import hashlib
import html
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

APP_NAME = "Richmack Browser Services"
DOWNLOAD_ROOT = Path(os.environ.get("RICHMACK_DOWNLOADS", "/downloads")).resolve()
WORK_ROOT = Path(os.environ.get("RICHMACK_WORKDIR", "/workspace")).resolve()
FEED_ROOT = (DOWNLOAD_ROOT / "feeds").resolve()
DOWNLOAD_ROOT.mkdir(parents=True, exist_ok=True)
FEED_ROOT.mkdir(parents=True, exist_ok=True)

app = FastAPI(title=APP_NAME, docs_url=None, redoc_url=None)

class MediaRequest(BaseModel):
    url: str = Field(min_length=8, max_length=4096)

class DocumentRequest(BaseModel):
    relative_path: str = Field(min_length=1, max_length=512)

class FeedItem(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    url: str = Field(min_length=8, max_length=4096)
    summary: str = Field(default="", max_length=2000)
    id: str = Field(default="", max_length=500)
    category: str = Field(default="", max_length=100)

class FeedRequest(BaseModel):
    source_url: str = Field(min_length=8, max_length=4096)
    title: str = Field(min_length=1, max_length=300)
    page_type: str = Field(default="generic", max_length=50)
    items: list[FeedItem] = Field(min_length=1, max_length=100)

class PickedState(BaseModel):
    selector: str = Field(min_length=1, max_length=1000)
    text: str = Field(default="", max_length=1000)
    url: str = Field(default="", max_length=4096)

PICKED_STATE: dict[str, str] = {}


def safe_http_url(value: str) -> str:
    u = urlparse(value)
    if u.scheme not in {"http", "https"} or not u.netloc:
        raise HTTPException(status_code=400, detail="Only HTTP/S URLs are allowed")
    if u.username or u.password:
        raise HTTPException(status_code=400, detail="Credentials in URLs are not allowed")
    return value


def inside_downloads(relative: str) -> Path:
    candidate = (DOWNLOAD_ROOT / relative).resolve()
    if candidate != DOWNLOAD_ROOT and DOWNLOAD_ROOT not in candidate.parents:
        raise HTTPException(status_code=403, detail="Path escapes download sandbox")
    return candidate


def xml_text(value: str) -> str:
    return html.escape(value or "", quote=False)


@app.get("/health")
def health():
    return {
        "app": APP_NAME,
        "status": "ok",
        "download_root": str(DOWNLOAD_ROOT),
        "feeds": True,
        "suite": "0.5.3",
        "shared_picker": True,
    }


@app.post("/state/picked")
def set_picked(req: PickedState):
    PICKED_STATE.clear()
    PICKED_STATE.update({"selector": req.selector, "text": req.text, "url": req.url})
    return {"ok": True}


@app.get("/state/picked")
def get_picked():
    return {"ok": True, "picked": PICKED_STATE or None}


@app.delete("/state/picked")
def clear_picked():
    PICKED_STATE.clear()
    return {"ok": True}


@app.post("/media/download")
def media_download(req: MediaRequest):
    url = safe_http_url(req.url)
    output_template = str(DOWNLOAD_ROOT / "%(title).120B-%(id)s.%(ext)s")
    argv = [
        "yt-dlp",
        "--no-playlist",
        "--no-exec",
        "--restrict-filenames",
        "--max-filesize", "2G",
        "--paths", str(DOWNLOAD_ROOT),
        "-o", output_template,
        "--print", "after_move:filepath",
        url,
    ]
    try:
        proc = subprocess.run(argv, capture_output=True, text=True, timeout=600, shell=False)
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Download timed out")
    if proc.returncode != 0:
        raise HTTPException(status_code=422, detail=(proc.stderr or "yt-dlp failed")[-4000:])
    paths = [line.strip() for line in proc.stdout.splitlines() if line.strip()]
    return {"ok": True, "files": paths[-10:]}


@app.post("/documents/analyze")
def analyze_document(req: DocumentRequest):
    path = inside_downloads(req.relative_path)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="File not found in download sandbox")
    ext = path.suffix.lower()
    text = ""
    if ext in {".txt", ".md", ".csv", ".json"}:
        text = path.read_text(errors="replace")
    elif ext == ".pdf":
        from pypdf import PdfReader
        reader = PdfReader(str(path))
        text = "\n\n".join((page.extract_text() or "") for page in reader.pages[:250])
    elif ext == ".epub":
        from ebooklib import epub, ITEM_DOCUMENT
        from bs4 import BeautifulSoup
        book = epub.read_epub(str(path))
        parts = []
        for item in book.get_items_of_type(ITEM_DOCUMENT):
            parts.append(BeautifulSoup(item.get_content(), "html.parser").get_text(" ", strip=True))
        text = "\n\n".join(parts)
    else:
        raise HTTPException(status_code=415, detail="Supported: PDF, EPUB, TXT, MD, CSV, JSON")
    return {
        "ok": True,
        "name": path.name,
        "characters": len(text),
        "preview": text[:20000],
    }


@app.post("/feeds/generate")
def generate_feed(req: FeedRequest):
    source = safe_http_url(req.source_url)
    cleaned = []
    seen = set()
    for item in req.items:
        url = safe_http_url(item.url)
        if url in seen:
            continue
        seen.add(url)
        cleaned.append((item.title.strip(), url, item.summary.strip(), item.id.strip(), item.category.strip()))
        if len(cleaned) >= 60:
            break
    if not cleaned:
        raise HTTPException(status_code=400, detail="No valid feed items")
    slug = hashlib.sha256(source.encode("utf-8")).hexdigest()[:16]
    filename = f"richmack-{slug}.xml"
    now = datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S +0000")
    items_xml = []
    for title, url, summary, item_id, category in cleaned:
        guid = item_id or url
        permalink = "false" if item_id else "true"
        category_xml = f"<category>{xml_text(category)}</category>" if category else ""
        items_xml.append(
            "<item>"
            f"<title>{xml_text(title)}</title>"
            f"<link>{xml_text(url)}</link>"
            f"<guid isPermaLink=\"{permalink}\">{xml_text(guid)}</guid>"
            f"<description>{xml_text(summary)}</description>"
            f"{category_xml}"
            f"<pubDate>{now}</pubDate>"
            "</item>"
        )
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<rss version="2.0"><channel>'
        f"<title>{xml_text(req.title)}</title>"
        f"<link>{xml_text(source)}</link>"
        f"<description>Generated locally by Richmack Browser from {xml_text(source)}</description>"
        f"<lastBuildDate>{now}</lastBuildDate>"
        + "".join(items_xml)
        + "</channel></rss>"
    )
    (FEED_ROOT / filename).write_text(xml, encoding="utf-8")
    return {
        "ok": True,
        "name": filename,
        "items": len(cleaned),
        "page_type": req.page_type,
        "feed_url": f"http://127.0.0.1:8765/feeds/{filename}",
    }


@app.get("/feeds/{filename}")
def read_feed(filename: str):
    if not filename.startswith("richmack-") or not filename.endswith(".xml") or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=404, detail="Feed not found")
    path = (FEED_ROOT / filename).resolve()
    if path.parent != FEED_ROOT or not path.is_file():
        raise HTTPException(status_code=404, detail="Feed not found")
    return Response(path.read_text(encoding="utf-8"), media_type="application/rss+xml; charset=utf-8")
