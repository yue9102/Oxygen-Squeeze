import json
import os
from typing import Any, Optional

from openai import AsyncOpenAI

from models import AnalysisResult, EpisodeMeta, Insight
from taxonomy import DEFAULT_TAXONOMY


def _get_client() -> AsyncOpenAI:
    key = os.environ.get("DEEPSEEK_API_KEY", "").strip()
    if not key:
        raise RuntimeError("DEEPSEEK_API_KEY 未设置，请检查 backend/.env 文件")
    return AsyncOpenAI(api_key=key, base_url="https://api.deepseek.com")


def _clean_taxonomy(context: Optional[dict[str, Any]]) -> dict[str, list[str]]:
    """仅使用请求携带的画像，服务端不读取或保存任何用户框架。"""
    anchors = (context or {}).get("anchors", {})
    if not isinstance(anchors, dict):
        return DEFAULT_TAXONOMY

    clean: dict[str, list[str]] = {}
    for anchor, subtopics in anchors.items():
        if not isinstance(anchor, str) or not anchor.strip() or not isinstance(subtopics, list):
            continue
        items = [item.strip() for item in subtopics if isinstance(item, str) and item.strip()]
        if items:
            clean[anchor.strip()] = items
    return clean or DEFAULT_TAXONOMY


def _taxonomy_menu(taxonomy: dict[str, list[str]]) -> str:
    return "\n".join(f"- {anchor}：{'、'.join(subtopics)}" for anchor, subtopics in taxonomy.items())


def _build_system_prompt(context: Optional[dict[str, Any]], taxonomy: dict[str, list[str]]) -> str:
    profile = context or {}
    who = profile.get("identity") or "一位通过播客提升认知的学习者"
    role = profile.get("role") or ""
    focus_items = profile.get("focus") or []
    focus = "、".join(item for item in focus_items if isinstance(item, str))
    persona = f"用户画像：{who}" + (f"；角色：{role}" if role else "") + (f"；关注方向：{focus}" if focus else "") + "。"
    return f"""你是一个帮助用户从播客中提炼认知的智识助手。

{persona}请始终结合该用户的身份与关注点来提炼洞察、写“对TA的意义”和反思问题。

知识分类体系（为该用户定制的固定大类，每类下有固定子类）——每条洞察必须归入「一个大类 + 一个子类」：
{_taxonomy_menu(taxonomy)}

归类原则：
- 每条洞察只归一个最主要的大类，不重复归类；判断这条内容“主要”在讲什么
- subtopic 必须从所属大类给定的子类里选，不要自创

分析原则：
- 洞察要有具体判断，不泛泛而谈
- 反思问题要触发真正思考，结合用户的身份与关注点"""


def _build_prompt(meta: EpisodeMeta, transcript: Optional[str] = None) -> str:
    if transcript:
        content = f"以下是这期播客的**语音转录全文**，请基于真实讲述内容提炼：\n{transcript[:40000]}"
    else:
        content = f"内容描述（仅节目简介，信息有限）：\n{meta.description[:3000]}"

    return f"""分析以下播客节目，生成结构化洞察。

播客：{meta.podcast_name}
标题：{meta.title}
{content}

请严格按以下 JSON 格式返回，不要有任何其他文字：

{{
  "summary": "一句话概括这期最核心的内容（20字以内）",
  "key_insights": [
    {{
      "headline": "洞察标题（15字以内，要有判断性）",
      "body": "展开说明（80字以内）",
      "pm_relevance": "对该用户（结合其身份/关注）的具体意义（50字以内）",
      "anchor": "上面给定的大类之一",
      "subtopic": "该大类下给定的子类之一"
    }}
  ],
  "reflection_questions": [
    "反思问题1（结合用户的身份与关注）",
    "反思问题2",
    "反思问题3"
  ]
}}

要求：
- key_insights 提炼 3-5 条
- 每条只归一个大类、一个子类
- anchor 和 subtopic 必须严格使用上面给定的固定值，不要自创新词
- 全部中文"""


def _coerce(taxonomy: dict[str, list[str]], anchor: str, subtopic: str) -> tuple[str, str]:
    if anchor in taxonomy and subtopic in taxonomy[anchor]:
        return anchor, subtopic
    for candidate_anchor, subtopics in taxonomy.items():
        if subtopic in subtopics:
            return candidate_anchor, subtopic
    fallback_anchor = next(iter(taxonomy))
    return fallback_anchor, taxonomy[fallback_anchor][0]


async def analyze_episode(
    meta: EpisodeMeta,
    transcript: Optional[str] = None,
    context: Optional[dict[str, Any]] = None,
) -> AnalysisResult:
    taxonomy = _clean_taxonomy(context)
    response = await _get_client().chat.completions.create(
        model="deepseek-chat",
        messages=[
            {"role": "system", "content": _build_system_prompt(context, taxonomy)},
            {"role": "user", "content": _build_prompt(meta, transcript)},
        ],
        temperature=0.7,
        max_tokens=2048,
    )

    raw = response.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
    data = json.loads(raw)

    insights = []
    for item in data["key_insights"]:
        anchor, subtopic = _coerce(taxonomy, item.get("anchor", ""), item.get("subtopic", ""))
        insights.append(Insight(
            headline=item["headline"],
            body=item["body"],
            pm_relevance=item.get("pm_relevance", ""),
            anchor=anchor,
            subtopic=subtopic,
        ))

    return AnalysisResult(
        podcast_name=meta.podcast_name,
        title=meta.title,
        duration=meta.duration,
        summary=data["summary"],
        key_insights=insights,
        reflection_questions=data["reflection_questions"],
        framework_updates={},
    )
