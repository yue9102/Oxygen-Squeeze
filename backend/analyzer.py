import os
import json
from openai import AsyncOpenAI
from models import EpisodeMeta, AnalysisResult, Insight
from taxonomy import TAXONOMY, coerce


def _get_client() -> AsyncOpenAI:
    key = os.environ.get("DEEPSEEK_API_KEY", "").strip()
    if not key:
        raise RuntimeError("DEEPSEEK_API_KEY 未设置，请检查 backend/.env 文件")
    return AsyncOpenAI(api_key=key, base_url="https://api.deepseek.com")


def _taxonomy_menu() -> str:
    lines = []
    for anchor, subs in TAXONOMY.items():
        lines.append(f"- {anchor}：{ '、'.join(subs) }")
    return "\n".join(lines)


SYSTEM_PROMPT = f"""你是一个帮助 AI 产品经理提炼播客认知的智识助手。

用户画像：研二学生，工业设计转型 AI PM，具身智能实验室实习，熟悉 ASR/LLM/TTS 链路、Multi-Agent、多模态交互。目标是建立自己的 AI 认知框架，面向未来的产品方向（不只是具身智能）。

知识分类体系（固定的 4 大类，每类下有固定子类）——每条洞察必须归入「一个大类 + 一个子类」：
{_taxonomy_menu()}

归类原则：
- 每条洞察只归一个最主要的大类，不要重复归类。判断这条内容「主要」在讲什么：技术本身 → AI认知；某个行业/公司应用 → 行业知识；如何做产品 → 产品思维；宏观趋势或赚钱逻辑 → 趋势与商业
- 例：「具身智能公司的融资动向」归到 行业知识/具身智能；「大模型推理成本下降」归到 AI认知/训练与推理；「AI 产品该怎么设计交互」归到 产品思维/交互体验
- subtopic 必须从所属大类的固定子类里选，不要自创
- 如果实在无法归入任何子类，subtopic 填「其他」

分析原则：
- 洞察要有具体判断，不泛泛而谈
- 反思问题要触发真正的思考，结合用户实际工作场景"""


def _build_prompt(meta: EpisodeMeta) -> str:
    return f"""分析以下播客节目，生成结构化洞察。

播客：{meta.podcast_name}
标题：{meta.title}
内容描述：
{meta.description[:3000]}

请严格按以下 JSON 格式返回，不要有任何其他文字：

{{
  "summary": "一句话概括这期最核心的内容（20字以内）",
  "key_insights": [
    {{
      "headline": "洞察标题（15字以内，要有判断性）",
      "body": "展开说明（80字以内）",
      "pm_relevance": "对 AI PM 的具体意义（50字以内）",
      "anchor": "四个大类之一",
      "subtopic": "该大类下的固定子类之一"
    }}
  ],
  "reflection_questions": [
    "反思问题1（结合用户工作场景）",
    "反思问题2",
    "反思问题3"
  ]
}}

要求：
- key_insights 提炼 3-5 条
- 每条只归一个大类、一个子类
- anchor 和 subtopic 必须严格使用上面给定的固定值，不要自创新词
- 全部中文"""


async def analyze_episode(meta: EpisodeMeta) -> AnalysisResult:
    response = await _get_client().chat.completions.create(
        model="deepseek-chat",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": _build_prompt(meta)},
        ],
        temperature=0.7,
        max_tokens=2048,
    )

    raw = response.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]

    data = json.loads(raw)

    insights = []
    for i in data["key_insights"]:
        anchor, subtopic = coerce(i.get("anchor", ""), i.get("subtopic", ""))
        insights.append(Insight(
            headline=i["headline"],
            body=i["body"],
            pm_relevance=i.get("pm_relevance", ""),
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
        framework_updates={},  # deprecated, kept for compat
    )
