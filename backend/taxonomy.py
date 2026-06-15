"""
知识分类体系 —— 现在按用户画像「动态生成」，不再写死。
- 若 data/profile.json 里有用户生成的 anchors，则用它
- 否则回退到 DEFAULT_TAXONOMY（通用框架）
每个大类(anchor)下若干子类(subtopic)；AI 分析时从菜单里选 1 大类 + 1 子类。
"""
import json
from pathlib import Path

_PROFILE_FILE = Path(__file__).parent.parent / "data" / "profile.json"

# 通用兜底框架（未设置画像时使用）
DEFAULT_TAXONOMY: dict[str, list[str]] = {
    "AI认知":    ["大模型", "Agent", "多模态", "训练与推理", "评测与对齐", "开源生态"],
    "行业知识":  ["具身智能", "教育", "医疗健康", "金融", "消费应用", "内容创作"],
    "产品思维":  ["产品设计", "交互体验", "PM方法论", "用户增长", "组织与协作"],
    "趋势与商业": ["技术趋势", "商业模式", "市场格局", "投资融资", "政策监管"],
}

FALLBACK_SUBTOPIC = "其他"


def current_taxonomy() -> dict:
    """读取当前生效的分类体系：优先用户画像里生成的，否则默认。"""
    try:
        if _PROFILE_FILE.exists():
            prof = json.loads(_PROFILE_FILE.read_text(encoding="utf-8"))
            anchors = prof.get("anchors")
            if isinstance(anchors, dict) and anchors:
                # 规整成 {str: [str]}
                clean = {a: [s for s in subs if isinstance(s, str)]
                         for a, subs in anchors.items() if isinstance(subs, list)}
                if clean:
                    return clean
    except Exception:
        pass
    return DEFAULT_TAXONOMY


def anchors() -> list[str]:
    return list(current_taxonomy().keys())


def coerce(anchor: str, subtopic: str) -> tuple:
    """把 AI 返回的 anchor/subtopic 规整到当前体系的合法值。"""
    tax = current_taxonomy()
    if anchor not in tax:
        # 尝试按子类反查大类
        for a, subs in tax.items():
            if subtopic in subs:
                return a, subtopic
        anchor = next(iter(tax))  # 第一个大类兜底
    if subtopic not in tax[anchor]:
        for a, subs in tax.items():
            if subtopic in subs:
                return a, subtopic
        subtopic = FALLBACK_SUBTOPIC
    return anchor, subtopic


# ── 旧数据兼容 ──
LEGACY_CATEGORY_MAP: dict = {
    "技术趋势": ("趋势与商业", "技术趋势"),
    "产品设计": ("产品思维", "产品设计"),
    "行业动态": ("趋势与商业", "市场格局"),
    "具身智能": ("行业知识", "具身智能"),
    "商业模式": ("趋势与商业", "商业模式"),
}
LEGACY_ANCHOR_RENAME = {"行业视野": "行业知识"}
