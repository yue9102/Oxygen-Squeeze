"""
根据用户画像（身份/角色/关注方向）生成专属的知识框架：
先判断用户的知识问题类型，探索候选框架形态，再收敛为
4-5 个大类(anchor)，每个大类下 4-6 个固定子类(subtopic)。
框架在设置画像时生成一次，之后分析播客都用它来归类。
"""
import json
from analyzer import _get_client

FRAMEWORK_SYSTEM = """你是一个个人知识框架设计师。根据用户的身份、角色和关注方向，为TA设计一套**个人知识框架**，用于把日常听到的播客、学习材料、行业观察分门别类地沉淀下来。

核心原则：
- 不要从身份直接跳到分类。先判断用户正在解决哪类知识问题，再选择合适的框架形态。
- 框架要个人化，但也要稳定、低交叉、可长期使用。
- 一级大类(anchor)应是长期判断维度、反复出现的工作领域、决策视角或创作/研究流程，不是一条具体观点。

要求：
- 生成 4-5 个**大类(anchor)**：名字简洁（2-6字），抽象层级一致，彼此独立，合起来覆盖TA的角色、约束和关注面。
- 每个大类下 4-6 个**子类(subtopic)**：具体到能帮助后续播客洞察归类，但不要窄到只能服务一篇内容。
- 紧扣用户画像：不同身份的人框架应明显不同（投资人 vs 设计师 vs 医生 vs 学生）。
- 全部中文。"""


def _prompt(identity: str, role: str, focus: list) -> str:
    return f"""用户画像：
- 身份：{identity}
- 角色：{role}
- 关注方向：{'、'.join(focus) if focus else '（未填）'}

请在内部完成以下判断，但最终不要输出分析过程：
1. 提取用户的长期上下文：身份、职责、阶段、领域、关注点。
2. 判断关注点属于哪一到两种知识问题类型：
   - 领域地图型：理解行业、技术、学科或主题空间
   - 决策流程型：做选择、转型、资源配置、人生/职业/商业决策
   - 能力成长型：建立技能、习惯、专业能力或长期 expertise
   - 工作系统型：理解复杂角色、组织、流程或服务系统
   - 创作流程型：支持设计、内容、叙事、产品等创作工作
   - 研究问题型：围绕证据、假设、实验、政策或投资命题沉淀
   - 经营判断型：服务商业、品牌、社区、运营或资源系统
3. 探索 2-3 种候选框架形态（如领域地图、决策漏斗、能力栈、工作系统、创作流程、研究议程、经营飞轮）。
4. 比较候选方案的抽象性、独立性、贴合度、耐用性、行动性，选择或融合最适合的一套。
5. 输出前自检：
   - 大类是否足够抽象但不空泛？
   - 典型洞察能否只归入一个大类？
   - 是否贴合用户身份、角色责任、约束和关注点？
   - 听几十期播客后是否仍然够用？
   - 框架形态是否匹配用户的知识问题，而不是只罗列主题？

边界规则：
- 工具、技术、部门名不要过早成为一级大类，除非它正是用户的核心研究对象或创作媒介。
- 如果工具会穿透多个工作环节，应抽象成更高层的判断维度，例如“AI应用”“AI协作”“数据经营”。
- 避免泛泛的“职业成长”，除非用户明确只关注职业成长本身；优先使用更贴合角色的维度。
- 如果一条未来洞察能自然放进两个大类，请重命名或重划边界后再输出。

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
