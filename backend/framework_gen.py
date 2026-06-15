"""
根据用户画像（身份/角色/关注方向）生成专属的知识框架：
4-5 个大类(anchor)，每个大类下 4-6 个固定子类(subtopic)。
框架在设置画像时生成一次，之后分析播客都用它来归类。
"""
import json
from analyzer import _get_client

FRAMEWORK_SYSTEM = """你是一个知识架构师。根据用户的身份、角色和关注方向，为TA设计一套**个人知识框架**，用于把日常听到的播客内容分门别类地沉淀下来。

要求：
- 生成 4-5 个**大类(anchor)**：它们是该用户思考问题的主要维度，名字简洁（2-6字），彼此独立、合起来能覆盖TA的关注面。
- 每个大类下 4-6 个**子类(subtopic)**：更具体的话题方向，贴合该用户的领域。
- 大类是"思维维度/领域板块"，不是某一条具体观点。
- 紧扣用户画像：不同身份的人框架应明显不同（投资人 vs 设计师 vs 医生）。
- 全部中文。"""


def _prompt(identity: str, role: str, focus: list) -> str:
    return f"""用户画像：
- 身份：{identity}
- 角色：{role}
- 关注方向：{'、'.join(focus) if focus else '（未填）'}

请为TA设计知识框架，严格返回 JSON，不要任何额外文字：
{{
  "anchors": {{
    "大类1": ["子类a", "子类b", "子类c", "子类d"],
    "大类2": ["..."],
    "大类3": ["..."],
    "大类4": ["..."]
  }}
}}
要求：4-5 个大类，每类 4-6 个子类；名字简洁；贴合该用户。"""


async def generate_framework(identity: str, role: str, focus: list) -> dict:
    """返回 {anchor: [subtopics]}。"""
    resp = await _get_client().chat.completions.create(
        model="deepseek-chat",
        messages=[
            {"role": "system", "content": FRAMEWORK_SYSTEM},
            {"role": "user", "content": _prompt(identity, role, focus)},
        ],
        temperature=0.6,
        max_tokens=1024,
    )
    raw = resp.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
    data = json.loads(raw)
    anchors = data.get("anchors", {})
    # 规整
    clean = {}
    for a, subs in anchors.items():
        if isinstance(subs, list):
            ss = [s.strip() for s in subs if isinstance(s, str) and s.strip()]
            if ss:
                clean[a.strip()] = ss
    if not clean:
        raise RuntimeError("框架生成失败")
    return clean
