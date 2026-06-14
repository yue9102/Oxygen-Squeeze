import json
import uuid
from datetime import datetime, date
from pathlib import Path
from typing import Optional, List

from models import Episode, AnalysisResult
from taxonomy import ANCHORS, LEGACY_CATEGORY_MAP, LEGACY_ANCHOR_RENAME, coerce

DATA_DIR = Path(__file__).parent.parent / "data"
EPISODES_FILE = DATA_DIR / "episodes.json"


def _resolve(ins: dict) -> tuple[str, str]:
    """把任意来源的 insight（新/旧 schema）规整为 (anchor, subtopic)。"""
    anchor = ins.get("anchor", "")
    # 旧数据 anchor 可能是 list
    if isinstance(anchor, list):
        anchor = anchor[0] if anchor else ""
    anchor = LEGACY_ANCHOR_RENAME.get(anchor, anchor)

    subtopic = ins.get("subtopic", "")

    # 没有有效 anchor → 尝试用旧的 category 映射
    if not anchor or not subtopic:
        cat = ins.get("category", "")
        if cat in LEGACY_CATEGORY_MAP:
            a2, s2 = LEGACY_CATEGORY_MAP[cat]
            anchor = anchor or a2
            subtopic = subtopic or s2
        # 旧的 topic_tag 没有用了，归到「其他」
        if not subtopic:
            subtopic = "其他"

    return coerce(anchor, subtopic)


def _init():
    DATA_DIR.mkdir(exist_ok=True)
    if not EPISODES_FILE.exists():
        EPISODES_FILE.write_text("[]", encoding="utf-8")


def _read(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def _write(path: Path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


# ── Episode CRUD ────────────────────────────────────────────

def save_episode(url: str, result: AnalysisResult) -> Episode:
    """直接保存一条已分析完成的 episode（无音频、走简介总结时用）。"""
    _init()
    episodes = _read(EPISODES_FILE)
    episode = Episode(
        id=str(uuid.uuid4())[:8],
        url=url,
        created_at=datetime.now().isoformat(),
        status="done",
        **result.model_dump(),
    )
    episodes.insert(0, episode.model_dump())
    _write(EPISODES_FILE, episodes)
    return episode


def create_processing_episode(url: str, meta, task_id: str) -> Episode:
    """创建一条「转录中」的占位 episode（有音频、走转录流程时用）。"""
    _init()
    episodes = _read(EPISODES_FILE)
    episode = Episode(
        id=str(uuid.uuid4())[:8],
        url=url,
        created_at=datetime.now().isoformat(),
        podcast_name=meta.podcast_name,
        title=meta.title,
        duration=meta.duration,
        description=meta.description,
        audio_url=meta.audio_url,
        task_id=task_id,
        status="transcribing",
    )
    episodes.insert(0, episode.model_dump())
    _write(EPISODES_FILE, episodes)
    return episode


def update_episode(episode_id: str, **fields) -> Optional[dict]:
    """更新某条 episode 的若干字段。"""
    _init()
    episodes = _read(EPISODES_FILE)
    hit = None
    for e in episodes:
        if e["id"] == episode_id:
            e.update(fields)
            hit = e
            break
    if hit:
        _write(EPISODES_FILE, episodes)
    return hit


def get_episodes(limit: int = 100) -> List[dict]:
    _init()
    return _read(EPISODES_FILE)[:limit]


def get_episode(episode_id: str) -> Optional[dict]:
    _init()
    return next((e for e in _read(EPISODES_FILE) if e["id"] == episode_id), None)


# ── Topics (derived from episodes) ──────────────────────────

def _days_ago(iso_date: str) -> int:
    try:
        d = datetime.fromisoformat(iso_date).date()
        return (date.today() - d).days
    except Exception:
        return 999


def get_topics() -> dict:
    """
    把所有 insight 按 (anchor, subtopic) 聚合成子类卡片。
    每条 insight 只归一个 anchor（不重复）。
    返回 { anchor: [ SubtopicCard, ... ] }，按最近更新排序。
    """
    _init()
    episodes = _read(EPISODES_FILE)

    # (anchor, subtopic) → bucket
    buckets: dict[tuple[str, str], dict] = {}

    for ep in episodes:
        ep_date = ep.get("created_at", "")[:10]
        for ins in ep.get("key_insights", []):
            anchor, subtopic = _resolve(ins)
            key = (anchor, subtopic)

            if key not in buckets:
                buckets[key] = {
                    "name": subtopic,
                    "anchor": anchor,
                    "insights": [],
                    "last_date": ep_date,
                }
            elif ep_date > buckets[key]["last_date"]:
                buckets[key]["last_date"] = ep_date

            buckets[key]["insights"].append({
                "episode_id": ep["id"],
                "episode_title": ep["title"],
                "podcast_name": ep["podcast_name"],
                "date": ep_date,
                "headline": ins["headline"],
                "body": ins["body"],
                "pm_relevance": ins.get("pm_relevance", ""),
            })

    result: dict[str, list] = {a: [] for a in ANCHORS}

    for bucket in buckets.values():
        anchor = bucket["anchor"]
        if anchor not in result:
            continue
        days = _days_ago(bucket["last_date"])
        result[anchor].append({
            "name": bucket["name"],
            "anchor": anchor,
            "insight_count": len(bucket["insights"]),
            "episode_count": len({i["episode_id"] for i in bucket["insights"]}),
            "last_date": bucket["last_date"],
            "days_since_active": days,
            "is_sleeping": days > 30,
            "preview": bucket["insights"][0]["headline"] if bucket["insights"] else "",
        })

    for a in ANCHORS:
        result[a].sort(key=lambda x: x["last_date"], reverse=True)

    return result


def get_topic_detail(anchor: str, subtopic: str) -> Optional[dict]:
    """返回某个 (大类, 子类) 下的全部 insight。"""
    _init()
    episodes = _read(EPISODES_FILE)

    insights = []
    for ep in episodes:
        ep_date = ep.get("created_at", "")[:10]
        for ins in ep.get("key_insights", []):
            a, s = _resolve(ins)
            if a == anchor and s == subtopic:
                insights.append({
                    "episode_id": ep["id"],
                    "episode_title": ep["title"],
                    "podcast_name": ep["podcast_name"],
                    "date": ep_date,
                    "headline": ins["headline"],
                    "body": ins["body"],
                    "pm_relevance": ins.get("pm_relevance", ""),
                })

    if not insights:
        return None

    insights.sort(key=lambda x: x["date"], reverse=True)
    return {"name": subtopic, "anchor": anchor, "insights": insights}


def reassign_insight(episode_id: str, headline: str, anchor: str, subtopic: str) -> bool:
    """手动把某条洞察重新归类到 (anchor, subtopic)。返回是否命中。"""
    anchor, subtopic = coerce(anchor, subtopic)
    _init()
    episodes = _read(EPISODES_FILE)
    hit = False
    for ep in episodes:
        if ep["id"] != episode_id:
            continue
        for ins in ep.get("key_insights", []):
            if ins.get("headline") == headline:
                ins["anchor"] = anchor
                ins["subtopic"] = subtopic
                hit = True
    if hit:
        _write(EPISODES_FILE, episodes)
    return hit


def delete_episode(episode_id: str) -> bool:
    """Delete an episode and all its insights. Returns True if found and deleted."""
    _init()
    episodes = _read(EPISODES_FILE)
    new_list = [e for e in episodes if e["id"] != episode_id]
    if len(new_list) == len(episodes):
        return False
    _write(EPISODES_FILE, new_list)
    return True
