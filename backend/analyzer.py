import os
import json
from openai import AsyncOpenAI
from models import EpisodeMeta, AnalysisResult, Insight

def _get_client() -> AsyncOpenAI:
    key = os.environ.get("DEEPSEEK_API_KEY", "").strip()
    if not key:
        raise RuntimeError("DEEPSEEK_API_KEY 未设置，请检查 backend/.env 文件")
    return AsyncOpenAI(api_key=key, base_url="https://api.deepseek.com")

SYSTEM_PROMPT = """你是一个帮助AI产品经理深度提炼播客认知的智识助手。

用户背景：研二学生，工业设计背景转型AI PM，目前在具身智能实验室实习（自研端到端语音大模型，应用于机器人/机器狗），熟悉ASR/LLM/TTS链路、Multi-Agent（ReAct框架）、多模态交互。目标是建立自己的AI内容认知框架。

分析原则：
- 洞察要有具体判断，不要泛泛而谈
- AI PM 视角要结合用户的真实工作场景（语音大模型、具身智能、机器人交互）
- 反思问题要能触发真正的思考，不是内容复述
- 框架更新条目要是一个可以被记住的原则或判断"""


def _build_prompt(meta: EpisodeMeta) -> str:
    return f"""分析以下播客节目，生成结构化洞察。

播客：{meta.podcast_name}
标题：{meta.title}
内容描述：
{meta.description[:3000]}

请严格按以下JSON格式返回，不要有任何其他文字：

{{
  "summary": "一句话概括这期最核心的内容（20字以内）",
  "key_insights": [
    {{
      "headline": "洞察标题（15字以内，要有判断性）",
      "body": "展开说明（80字以内）",
      "pm_relevance": "对AI PM的具体意义（50字以内）",
      "category": "技术趋势|产品设计|行业动态|具身智能|商业模式"
    }}
  ],
  "reflection_questions": [
    "反思问题1（结合用户工作场景）",
    "反思问题2",
    "反思问题3"
  ],
  "framework_updates": {{
    "技术趋势": [],
    "产品设计": [],
    "行业动态": [],
    "具身智能": [],
    "商业模式": []
  }}
}}

要求：key_insights 提炼 3-5 条；framework_updates 只填有实质内容的类别，其余保持空数组；全部中文。"""


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

    return AnalysisResult(
        podcast_name=meta.podcast_name,
        title=meta.title,
        duration=meta.duration,
        summary=data["summary"],
        key_insights=[Insight(**i) for i in data["key_insights"]],
        reflection_questions=data["reflection_questions"],
        framework_updates=data["framework_updates"],
    )
