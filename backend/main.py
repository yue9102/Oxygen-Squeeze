import os
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from scraper import scrape_episode
from analyzer import analyze_episode
from storage import save_episode, get_episodes, get_episode, get_framework, get_framework_stats

app = FastAPI(title="播客认知沉淀 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ProcessRequest(BaseModel):
    url: str


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/process")
async def process_episode(req: ProcessRequest):
    """Scrape + analyze + save a 小宇宙 episode. Returns the full episode object."""
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


@app.get("/api/framework")
def read_framework():
    return get_framework()


@app.get("/api/framework/stats")
def framework_stats():
    return get_framework_stats()
