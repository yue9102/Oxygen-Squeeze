import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional, List

from models import Episode, AnalysisResult

DATA_DIR = Path(__file__).parent.parent / "data"
EPISODES_FILE = DATA_DIR / "episodes.json"
FRAMEWORK_FILE = DATA_DIR / "framework.json"

CATEGORIES = ["技术趋势", "产品设计", "行业动态", "具身智能", "商业模式"]


def _init():
    DATA_DIR.mkdir(exist_ok=True)
    if not EPISODES_FILE.exists():
        EPISODES_FILE.write_text("[]", encoding="utf-8")
    if not FRAMEWORK_FILE.exists():
        FRAMEWORK_FILE.write_text(
            json.dumps({c: [] for c in CATEGORIES}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )


def _read(path: Path) -> any:
    return json.loads(path.read_text(encoding="utf-8"))


def _write(path: Path, data: any):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def save_episode(url: str, result: AnalysisResult) -> Episode:
    _init()
    episodes = _read(EPISODES_FILE)

    episode = Episode(
        id=str(uuid.uuid4())[:8],
        url=url,
        created_at=datetime.now().isoformat(),
        **result.model_dump(),
    )

    episodes.insert(0, episode.model_dump())
    _write(EPISODES_FILE, episodes)

    # Append framework entries
    framework = _read(FRAMEWORK_FILE)
    today = datetime.now().strftime("%Y-%m-%d")
    for cat, items in result.framework_updates.items():
        if cat in framework:
            for text in items:
                if text.strip():
                    framework[cat].append(
                        {
                            "text": text.strip(),
                            "date": today,
                            "source": result.podcast_name,
                            "episode_id": episode.id,
                            "episode_title": result.title,
                        }
                    )
    _write(FRAMEWORK_FILE, framework)
    return episode


def get_episodes(limit: int = 100) -> List[dict]:
    _init()
    return _read(EPISODES_FILE)[:limit]


def get_episode(episode_id: str) -> Optional[dict]:
    _init()
    return next((e for e in _read(EPISODES_FILE) if e["id"] == episode_id), None)


def get_framework() -> dict:
    _init()
    return _read(FRAMEWORK_FILE)


def get_framework_stats() -> dict:
    """Return per-category counts for shelf thickness visualization."""
    fw = get_framework()
    return {cat: len(items) for cat, items in fw.items()}
