from pydantic import BaseModel
from typing import Optional, List, Dict


class EpisodeMeta(BaseModel):
    url: str
    podcast_name: str
    title: str
    description: str
    duration: Optional[str] = None


class Insight(BaseModel):
    headline: str
    body: str
    pm_relevance: str
    category: str = ""        # kept for backward compat
    anchor: str = "AI认知"    # 大类，固定 4 选 1
    subtopic: str = "其他"    # 子类，从该大类的固定列表里选
    topic_tag: str = ""       # kept for backward compat (old free-form tag)


class AnalysisResult(BaseModel):
    podcast_name: str
    title: str
    duration: Optional[str] = None
    summary: str
    key_insights: List[Insight]
    reflection_questions: List[str]
    framework_updates: Dict[str, List[str]]


class FrameworkEntry(BaseModel):
    text: str
    date: str
    source: str
    episode_id: str
    episode_title: str


class Episode(BaseModel):
    id: str
    url: str
    created_at: str
    podcast_name: str
    title: str
    duration: Optional[str] = None
    summary: str
    key_insights: List[Insight]
    reflection_questions: List[str]
    framework_updates: Dict[str, List[str]]
