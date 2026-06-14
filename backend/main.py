import os
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import uuid
from pathlib import Path as _Path
from fastapi import UploadFile, File, Form, Request
from fastapi.responses import FileResponse as _FileResponse

from scraper import scrape_episode
from analyzer import analyze_episode
from transcriber import submit_transcription, check_transcription, transcribe_short
from reflection_skill import refine_reflection
from storage import (
    save_episode, get_episodes, get_episode,
    create_processing_episode, update_episode,
    get_topics, get_topic_detail, reassign_insight, delete_episode,
    save_reflection, get_reflections, delete_reflection,
)
from models import EpisodeMeta
from taxonomy import TAXONOMY

# 用户语音回答的临时音频目录（供 DashScope 通过公网 URL 拉取）
_TMP_AUDIO = _Path(__file__).parent.parent / "data" / "tmp_audio"
_TMP_AUDIO.mkdir(parents=True, exist_ok=True)

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
        # 有音频 → 走「语音转录」异步流程，立即返回「转录中」占位
        if meta.audio_url:
            task_id = await submit_transcription(meta.audio_url)
            episode = create_processing_episode(req.url, meta, task_id)
            return {"ok": True, "episode": episode.model_dump()}
        # 无音频 → 退回基于简介的即时总结
        result = await analyze_episode(meta)
        episode = save_episode(req.url, result)
        return {"ok": True, "episode": episode.model_dump()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def _advance_if_processing(ep: dict) -> dict:
    """若 episode 处于转录中，查询一次任务；完成则转录→分析→落库（按需轮询，抗休眠）。"""
    if ep.get("status") != "transcribing" or not ep.get("task_id"):
        return ep
    try:
        status, transcript = await check_transcription(ep["task_id"])
    except Exception:
        return ep  # 网络抖动，下次再试
    if status == "running":
        return ep
    if status == "error":
        return update_episode(ep["id"], status="error", error="转录失败") or ep
    # 转录完成 → 用转录全文分析（保持 transcribing 直到落库，崩溃可自动重试恢复）
    meta = EpisodeMeta(
        url=ep["url"], podcast_name=ep["podcast_name"], title=ep["title"],
        description=ep.get("description", ""), duration=ep.get("duration"),
        audio_url=ep.get("audio_url"),
    )
    try:
        result = await analyze_episode(meta, transcript=transcript)
    except Exception as e:
        return update_episode(ep["id"], status="error", error=str(e)[:200]) or ep
    return update_episode(
        ep["id"], status="done",
        summary=result.summary,
        key_insights=[i.model_dump() for i in result.key_insights],
        reflection_questions=result.reflection_questions,
    ) or ep


@app.get("/api/episodes")
def list_episodes():
    return get_episodes()


@app.get("/api/episodes/{episode_id}")
async def get_ep(episode_id: str):
    ep = get_episode(episode_id)
    if not ep:
        raise HTTPException(status_code=404, detail="Not found")
    ep = await _advance_if_processing(ep)
    return ep


@app.delete("/api/episodes/{episode_id}")
def del_ep(episode_id: str):
    ok = delete_episode(episode_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


# ── Reflections（我的思考：语音回答 → 结构化沉淀） ──────────────

@app.get("/api/answer-audio/{name}")
def serve_answer_audio(name: str):
    """供 DashScope 拉取用户上传的语音回答音频。"""
    safe = _Path(name).name  # 防目录穿越
    f = _TMP_AUDIO / safe
    if not f.is_file():
        raise HTTPException(status_code=404, detail="Not found")
    return _FileResponse(f, media_type="audio/mp4")


@app.post("/api/reflections")
async def create_reflection(
    request: Request,
    audio: UploadFile = File(...),
    episode_id: str = Form(...),
    episode_title: str = Form(""),
    podcast_name: str = Form(""),
    question: str = Form(...),
):
    """用户语音回答 → 转录 → 结构化整理 → 保存。"""
    ext = (audio.filename or "rec").split(".")[-1][:5] or "m4a"
    token = f"{uuid.uuid4().hex}.{ext}"
    fpath = _TMP_AUDIO / token
    try:
        fpath.write_bytes(await audio.read())
        # 构造公网可达 URL 供 DashScope 拉取（强制 https + 用 Host 头，兼容 HF 反代）
        host = os.environ.get("PUBLIC_HOST") or request.headers.get("host", "")
        audio_url = f"https://{host}/api/answer-audio/{token}"
        raw_text = await transcribe_short(audio_url)
        if not raw_text.strip():
            raise HTTPException(status_code=422, detail="没听清你的回答，再说一次试试")
        refined = await refine_reflection(question, raw_text, podcast_name, episode_title)
        ref = save_reflection(episode_id, episode_title, question, raw_text, refined)
        return {"ok": True, "reflection": ref}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        try:
            fpath.unlink(missing_ok=True)
        except Exception:
            pass


@app.get("/api/reflections")
def list_reflections(episode_id: str = ""):
    return get_reflections(episode_id or None)


@app.delete("/api/reflections/{reflection_id}")
def del_reflection(reflection_id: str):
    ok = delete_reflection(reflection_id)
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
