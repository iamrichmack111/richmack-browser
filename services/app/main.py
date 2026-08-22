from __future__ import annotations

import os
import shlex
import subprocess
from pathlib import Path
from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

APP_NAME = "Richmack Browser Services"
DOWNLOAD_ROOT = Path(os.environ.get("RICHMACK_DOWNLOADS", "/downloads")).resolve()
WORK_ROOT = Path(os.environ.get("RICHMACK_WORKDIR", "/workspace")).resolve()
DOWNLOAD_ROOT.mkdir(parents=True, exist_ok=True)
WORK_ROOT.mkdir(parents=True, exist_ok=True)

app = FastAPI(title=APP_NAME, docs_url=None, redoc_url=None)

ALLOWED_COMMANDS: dict[str, list[str]] = {
    "pwd": ["pwd"],
    "ls": ["ls", "-la"],
    "whoami": ["whoami"],
    "git status": ["git", "status", "--short", "--branch"],
    "git log": ["git", "log", "--oneline", "-10"],
}

class TerminalRequest(BaseModel):
    command: str = Field(min_length=1, max_length=80)

class MediaRequest(BaseModel):
    url: str = Field(min_length=8, max_length=4096)

class DocumentRequest(BaseModel):
    relative_path: str = Field(min_length=1, max_length=512)


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


@app.get("/health")
def health():
    return {
        "app": APP_NAME,
        "status": "ok",
        "terminal": "allowlist",
        "download_root": str(DOWNLOAD_ROOT),
    }


@app.post("/terminal/run")
def terminal_run(req: TerminalRequest):
    argv = ALLOWED_COMMANDS.get(req.command.strip())
    if not argv:
        raise HTTPException(status_code=403, detail={
            "message": "Command is not allowlisted",
            "allowed": sorted(ALLOWED_COMMANDS),
        })
    try:
        proc = subprocess.run(
            argv,
            cwd=WORK_ROOT,
            capture_output=True,
            text=True,
            timeout=5,
            shell=False,
            env={"PATH": os.environ.get("PATH", "/usr/bin:/bin"), "HOME": str(WORK_ROOT)},
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Command timed out")
    output = (proc.stdout + proc.stderr)[-12000:]
    return {"ok": proc.returncode == 0, "returncode": proc.returncode, "output": output}


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
