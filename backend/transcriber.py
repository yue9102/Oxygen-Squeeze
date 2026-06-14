"""
阿里云 DashScope · Paraformer 录音文件识别（异步）。
传音频 URL → 服务端转录 → 取转录全文。

设计为「提交」与「检查」两步分离，配合按需轮询架构（抗 HF 休眠）：
后端不常驻后台任务，而是在客户端读取 episode 时顺带检查转录是否完成。
"""
import os
import asyncio
from typing import Optional, Tuple
import httpx

_SUBMIT_URL = "https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription"
_TASK_URL = "https://dashscope.aliyuncs.com/api/v1/tasks/{task_id}"


def _key() -> str:
    k = os.environ.get("DASHSCOPE_API_KEY", "").strip()
    if not k:
        raise RuntimeError("DASHSCOPE_API_KEY 未设置，请检查 backend/.env 文件")
    return k


async def submit_transcription(audio_url: str) -> str:
    """提交转录任务，返回 task_id。"""
    headers = {
        "Authorization": f"Bearer {_key()}",
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable",
    }
    payload = {
        "model": "paraformer-v2",
        "input": {"file_urls": [audio_url]},
        "parameters": {"language_hints": ["zh"]},
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.post(_SUBMIT_URL, headers=headers, json=payload)
        r.raise_for_status()
        out = r.json().get("output", {})
        task_id = out.get("task_id")
        if not task_id:
            raise RuntimeError(f"转录任务提交失败：{r.text[:200]}")
        return task_id


async def check_transcription(task_id: str) -> Tuple[str, Optional[str]]:
    """
    查询一次任务状态。
    返回 (status, text)：
      - status: 'running' | 'done' | 'error'
      - text: 仅当 done 时为转录全文，否则 None
    """
    headers = {"Authorization": f"Bearer {_key()}"}
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.get(_TASK_URL.format(task_id=task_id), headers=headers)
        r.raise_for_status()
        out = r.json().get("output", {})
        status = out.get("task_status", "")

        if status in ("PENDING", "RUNNING"):
            return "running", None
        if status != "SUCCEEDED":
            return "error", None

        # 成功：取结果文件 URL → 拉取转录 JSON → 拼全文
        results = out.get("results", [])
        if not results:
            return "error", None
        trans_url = results[0].get("transcription_url")
        if not trans_url:
            return "error", None

        tr = await client.get(trans_url)
        tr.raise_for_status()
        data = tr.json()
        parts = []
        for t in data.get("transcripts", []):
            text = (t.get("text") or "").strip()
            if not text:  # 兜底：拼接 sentences
                text = "".join(s.get("text", "") for s in t.get("sentences", []))
            if text:
                parts.append(text)
        full = "\n".join(parts).strip()
        return ("done", full) if full else ("error", None)


async def transcribe_short(audio_url: str, max_wait_s: int = 120) -> str:
    """短音频（用户语音回答）：提交并内联轮询直到完成，返回转录文本。"""
    task_id = await submit_transcription(audio_url)
    waited = 0
    while waited < max_wait_s:
        status, text = await check_transcription(task_id)
        if status == "done":
            return text or ""
        if status == "error":
            raise RuntimeError("语音转录失败")
        await asyncio.sleep(3)
        waited += 3
    raise RuntimeError("语音转录超时")
