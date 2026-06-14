"""
结构化思考整理师 —— 把用户对反思问题的「口述回答」整理成有逻辑、可沉淀的文本。

融合三套思维框架（已查证要点）：
- 金字塔原理(Barbara Minto)：结论先行 → 归类分组(一个中心思想下 2-4 个论点) → 逻辑递进
- MECE：论点之间相互独立、不重叠；合在一起尽量穷尽
- 批判性思维：审视隐含假设、检验证据、指出反例与缺口

核心约束：只重组和锐化用户的真实想法，不替用户编造内容、不替用户下结论；
保留第一人称口吻，让"说得散"变成"想得清"。
"""
import json
from analyzer import _get_client

REFINE_SYSTEM = """你是一位"结构化思考整理师"。用户刚听完一期播客，对一个反思问题做了**语音口述回答**（口语、可能零散、跳跃）。你的任务：在**完全忠于用户原意**的前提下，把它整理成有逻辑、可长期保存的思考笔记。

整理方法（融合金字塔原理 / MECE / 批判性思维）：
1. 结论先行：提炼用户这段话里**最核心的一个判断**，作为一句话结论（若用户没有明确结论，则忠实概括其倾向，不要替他编造立场）。
2. 归类分组 + MECE：把零散的话归并成 2-4 条支撑论点，彼此**不重叠**，每条是一个独立的点。
3. 逻辑递进：论点排列有内在顺序（因果/递进/并列）。
4. 批判性补充：基于用户说的内容，指出 1-2 个**他可能忽略的假设、反例或值得再追问的地方**。这部分是"启发"，不是否定。

铁律：
- 不新增用户没表达过的观点或事实；只做重组、归并、锐化措辞。
- 用第一人称（"我"），保持用户的语气。
- 如果口述内容太少/跑题，points 可以只有 1 条，open_questions 给出引导性追问。
- 全部中文，简洁。"""


def _build_refine_prompt(question: str, raw_answer: str, podcast: str, title: str) -> str:
    return f"""播客：{podcast}《{title}》
反思问题：{question}

用户的语音口述回答（原始转写）：
{raw_answer}

请整理成 JSON，不要任何额外文字：
{{
  "conclusion": "一句话核心观点（结论先行，≤30字）",
  "points": ["支撑论点1", "支撑论点2", "支撑论点3"],
  "open_questions": ["值得再追问自己的点1", "点2"]
}}
要求：points 2-4 条且互不重叠；open_questions 1-2 条；忠于原意不编造；全部中文。"""


async def refine_reflection(question: str, raw_answer: str, podcast: str, title: str) -> dict:
    """把口述回答整理成 {conclusion, points[], open_questions[]}。"""
    resp = await _get_client().chat.completions.create(
        model="deepseek-chat",
        messages=[
            {"role": "system", "content": REFINE_SYSTEM},
            {"role": "user", "content": _build_refine_prompt(question, raw_answer, podcast, title)},
        ],
        temperature=0.5,
        max_tokens=1024,
    )
    raw = resp.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
    data = json.loads(raw)
    return {
        "conclusion": data.get("conclusion", "").strip(),
        "points": [p.strip() for p in data.get("points", []) if p.strip()],
        "open_questions": [q.strip() for q in data.get("open_questions", []) if q.strip()],
    }
