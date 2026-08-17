import json
import os
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse as _FileResponse
from pydantic import BaseModel

load_dotenv(Path(__file__).parent / ".env")

from analyzer import analyze_episode
from framework_gen import generate_framework
from models import Episode, EpisodeMeta
from reflection_skill import fallback_reflection, refine_reflection
from scraper import scrape_episode
from transcriber import check_transcription, submit_transcription, transcribe_short


# 语音回答只在转录的当前请求期间保存在系统临时目录，finally 中立即删除。
_TMP_AUDIO = Path(tempfile.gettempdir()) / "lili-answer-audio"
_TMP_AUDIO.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="哩哩 API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ProfileContext(BaseModel):
    identity: str = ""
    role: str = ""
    focus: list[str] = []
    anchors: dict[str, list[str]] = {}


class ProcessRequest(BaseModel):
    url: str
    context: Optional[ProfileContext] = None


class AdvanceRequest(BaseModel):
    task_id: str
    episode: EpisodeMeta
    context: Optional[ProfileContext] = None


class FrameworkRequest(BaseModel):
    identity: str
    role: str = ""
    focus: list[str] = []


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _context_data(context: Optional[ProfileContext]) -> Optional[dict]:
    return context.model_dump() if context else None


def _trim_form_text(value: str, limit: int) -> str:
    if not isinstance(value, str):
        return ""
    return " ".join(value.strip().split())[:limit].strip()


def _reflection_episode_context(
    episode_url: str,
    episode_summary: str,
    key_insights_json: str,
) -> dict:
    """Parse untrusted client context and assign server-controlled K1-K5 IDs."""
    raw_items = []
    if isinstance(key_insights_json, str) and len(key_insights_json) <= 50_000:
        try:
            candidate = json.loads(key_insights_json or "[]")
            if isinstance(candidate, list):
                raw_items = candidate
        except (TypeError, ValueError, json.JSONDecodeError):
            raw_items = []

    knowledge_points = []
    for item in raw_items:
        if not isinstance(item, dict):
            continue
        headline = _trim_form_text(item.get("headline", ""), 200)
        body = _trim_form_text(item.get("body", ""), 1500)
        if not headline and not body:
            continue
        knowledge_points.append({
            "source_id": f"K{len(knowledge_points) + 1}",
            "headline": headline,
            "body": body,
        })
        if len(knowledge_points) >= 5:
            break

    return {
        "episode_url": _trim_form_text(episode_url, 1000),
        "summary": _trim_form_text(episode_summary, 4000),
        "knowledge_points": knowledge_points,
        "context_level": "cards_only",
    }


def _processing_episode(url: str, meta: EpisodeMeta, task_id: str) -> Episode:
    return Episode(
        id=str(uuid.uuid4())[:8],
        url=url,
        created_at=_now_iso(),
        podcast_name=meta.podcast_name,
        title=meta.title,
        duration=meta.duration,
        description=meta.description,
        audio_url=meta.audio_url,
        task_id=task_id,
        status="transcribing",
    )


def _completed_episode(url: str, meta: EpisodeMeta, result) -> Episode:
    return Episode(
        id=str(uuid.uuid4())[:8],
        url=url,
        created_at=_now_iso(),
        description=meta.description,
        status="done",
        **result.model_dump(),
    )


def _retired_data_route() -> None:
    raise HTTPException(
        status_code=410,
        detail="此版本不再在服务器保存个人数据，请升级到最新版客户端。",
    )


# ── Health ──────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok", "storage": "device-local"}


# ── Stateless podcast processing ────────────────────────────

@app.post("/api/process")
async def process_episode(req: ProcessRequest):
    try:
        meta = await scrape_episode(req.url)
        if meta.audio_url:
            task_id = await submit_transcription(meta.audio_url)
            return {"ok": True, "episode": _processing_episode(req.url, meta, task_id).model_dump()}

        result = await analyze_episode(meta, context=_context_data(req.context))
        return {"ok": True, "episode": _completed_episode(req.url, meta, result).model_dump()}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/process/advance")
async def advance_processing(req: AdvanceRequest):
    """查询一次第三方转录任务；不保存任务、转录或分析结果。"""
    try:
        status, transcript = await check_transcription(req.task_id)
    except Exception:
        # 网络偶发错误不改变本机任务状态，客户端会稍后重试。
        return {"status": "running"}

    if status == "running":
        return {"status": "running"}
    if status == "error" or not transcript:
        return {"status": "error", "error": "转录失败"}

    try:
        result = await analyze_episode(req.episode, transcript=transcript, context=_context_data(req.context))
        return {
            "status": "done",
            "analysis": {
                "summary": result.summary,
                "key_insights": [item.model_dump() for item in result.key_insights],
                "reflection_questions": result.reflection_questions,
                "framework_updates": result.framework_updates,
            },
        }
    except Exception as exc:
        return {"status": "error", "error": str(exc)[:200]}


# ── Voice reflection: temporary audio -> compute -> return ──

@app.get("/api/answer-audio/{name}")
def serve_answer_audio(name: str):
    safe = Path(name).name
    path = _TMP_AUDIO / safe
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Not found")
    return _FileResponse(path, media_type="audio/mp4")


@app.post("/api/reflections")
async def create_reflection(
    request: Request,
    audio: UploadFile = File(...),
    episode_id: str = Form(...),
    episode_title: str = Form(""),
    podcast_name: str = Form(""),
    question: str = Form(...),
    episode_url: str = Form(""),
    episode_summary: str = Form(""),
    key_insights_json: str = Form("[]"),
):
    safe_episode_id = _trim_form_text(episode_id, 100)
    safe_episode_title = _trim_form_text(episode_title, 300)
    safe_podcast_name = _trim_form_text(podcast_name, 200)
    safe_question = _trim_form_text(question, 600)
    episode_context = _reflection_episode_context(episode_url, episode_summary, key_insights_json)
    ext = (audio.filename or "rec").split(".")[-1][:5] or "m4a"
    token = f"{uuid.uuid4().hex}.{ext}"
    path = _TMP_AUDIO / token
    try:
        path.write_bytes(await audio.read())
        host = os.environ.get("PUBLIC_HOST") or request.headers.get("host", "")
        audio_url = f"https://{host}/api/answer-audio/{token}"
        raw_text = await transcribe_short(audio_url)
        if not raw_text.strip():
            raise HTTPException(status_code=422, detail="没听清你的回答，再说一次试试")
        try:
            refined = await refine_reflection(
                safe_question,
                raw_text,
                safe_podcast_name,
                safe_episode_title,
                episode_context,
            )
        except Exception:
            # The user's completed answer should survive an independent AI
            # formatting/provider failure; no server-side reflection is kept.
            refined = fallback_reflection(raw_text, episode_context)
        reflection = {
            "id": str(uuid.uuid4())[:8],
            "episode_id": safe_episode_id,
            "episode_title": safe_episode_title,
            "question": safe_question,
            "raw_text": raw_text,
            "conclusion": refined["conclusion"],
            "points": refined["points"],
            "open_questions": refined["open_questions"],
            "guidance_version": 1,
            "guidance": refined["guidance"],
            "created_at": _now_iso(),
        }
        return {"ok": True, "reflection": reflection}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        try:
            path.unlink(missing_ok=True)
        except Exception:
            pass


# ── Framework generation: compute only ──────────────────────

@app.post("/api/framework")
async def framework(req: FrameworkRequest):
    try:
        anchors = await generate_framework(req.identity, req.role, req.focus)
        return {"ok": True, "anchors": anchors}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# Old data endpoints intentionally remain explicit so outdated clients cannot
# accidentally read or write the legacy shared server JSON files.
@app.get("/api/episodes")
@app.get("/api/episodes/{episode_id}")
@app.delete("/api/episodes/{episode_id}")
@app.get("/api/reflections")
@app.delete("/api/reflections/{reflection_id}")
@app.get("/api/profile")
@app.post("/api/profile")
@app.get("/api/stats")
@app.get("/api/topics")
@app.get("/api/topics/detail")
@app.get("/api/taxonomy")
@app.post("/api/insights/reassign")
def retired_data_routes():
    _retired_data_route()


# ── Serve built frontend (PWA) when present ──────────────────
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

_DIST = Path(__file__).parent.parent / "frontend" / "dist"

if _DIST.exists():
    app.mount("/assets", StaticFiles(directory=_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def spa(full_path: str):
        candidate = _DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(_DIST / "index.html")
