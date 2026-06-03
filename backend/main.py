import os
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from scraper import scrape_episode
from analyzer import analyze_episode
from storage import (
    save_episode, get_episodes, get_episode,
    get_topics, get_topic_detail, reassign_insight, delete_episode,
)
from taxonomy import TAXONOMY

app = FastAPI(title="氧气捏捏 API", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ProcessRequest(BaseModel):
    url: str


class ReassignRequest(BaseModel):
    episode_id: str
    headline: str
    anchor: str
    subtopic: str


# ── Health ──────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok"}


# ── Episodes ─────────────────────────────────────────────────

@app.post("/api/process")
async def process_episode(req: ProcessRequest):
    try:
        meta = await scrape_episode(req.url)
        result = await analyze_episode(meta)
        episode = save_episode(req.url, result)
        return {"ok": True, "episode": episode.model_dump()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/episodes")
def list_episodes():
    return get_episodes()


@app.get("/api/episodes/{episode_id}")
def get_ep(episode_id: str):
    ep = get_episode(episode_id)
    if not ep:
        raise HTTPException(status_code=404, detail="Not found")
    return ep


@app.delete("/api/episodes/{episode_id}")
def del_ep(episode_id: str):
    ok = delete_episode(episode_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


# ── Topics ───────────────────────────────────────────────────

@app.get("/api/taxonomy")
def taxonomy():
    """返回固定的 4 大类 + 各自子类列表。"""
    return TAXONOMY


@app.get("/api/topics")
def list_topics():
    """Returns { anchor: [subtopic cards] } for all 4 anchors."""
    return get_topics()


@app.get("/api/topics/detail")
def topic_detail(anchor: str, subtopic: str):
    """某个大类+子类下的全部洞察。Usage: ?anchor=AI认知&subtopic=大模型"""
    detail = get_topic_detail(anchor, subtopic)
    if not detail:
        raise HTTPException(status_code=404, detail="Topic not found")
    return detail


@app.post("/api/insights/reassign")
def reassign(req: ReassignRequest):
    """手动把某条洞察重新归类。"""
    ok = reassign_insight(req.episode_id, req.headline, req.anchor, req.subtopic)
    if not ok:
        raise HTTPException(status_code=404, detail="Insight not found")
    return {"ok": True}


# ── Serve built frontend (PWA) when present ──────────────────
# In production the Docker image builds frontend/dist; we serve it here so
# one deployment hosts both the API (/api/*) and the installable PWA (/).
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

_DIST = Path(__file__).parent.parent / "frontend" / "dist"

if _DIST.exists():
    app.mount("/assets", StaticFiles(directory=_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def spa(full_path: str):
        # Serve real files (icons, manifest, sw.js); otherwise SPA index.html.
        candidate = _DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(_DIST / "index.html")
