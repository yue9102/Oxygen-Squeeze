"""
固定知识分类体系 —— 单一数据源。
4 个大类（anchor），每个大类下若干固定子类（subtopic）。
AI 分析时从这个菜单里选 1 个大类 + 1 个子类，不再自由生成细碎主题。
"""

TAXONOMY: dict[str, list[str]] = {
    "AI认知":    ["大模型", "Agent", "多模态", "训练与推理", "评测与对齐", "开源生态"],
    "行业知识":  ["具身智能", "教育", "医疗健康", "金融", "消费应用", "内容创作"],
    "产品思维":  ["产品设计", "交互体验", "PM方法论", "用户增长", "组织与协作"],
    "趋势与商业": ["技术趋势", "商业模式", "市场格局", "投资融资", "政策监管"],
}

ANCHORS: list[str] = list(TAXONOMY.keys())

# 每个大类的兜底子类（AI 无法明确归类时）
FALLBACK_SUBTOPIC = "其他"


def valid_anchor(a: str) -> bool:
    return a in TAXONOMY


def valid_subtopic(anchor: str, sub: str) -> bool:
    return anchor in TAXONOMY and sub in TAXONOMY[anchor]


def coerce(anchor: str, subtopic: str) -> tuple[str, str]:
    """把 AI 返回的 anchor/subtopic 规整到合法值。"""
    if anchor not in TAXONOMY:
        anchor = "AI认知"
    if subtopic not in TAXONOMY[anchor]:
        # 尝试在所有大类里找这个子类
        for a, subs in TAXONOMY.items():
            if subtopic in subs:
                return a, subtopic
        subtopic = FALLBACK_SUBTOPIC
    return anchor, subtopic


# ── 旧数据兼容：老的 5 分类 → 新的 (anchor, subtopic) ──
LEGACY_CATEGORY_MAP: dict[str, tuple[str, str]] = {
    "技术趋势": ("趋势与商业", "技术趋势"),
    "产品设计": ("产品思维", "产品设计"),
    "行业动态": ("趋势与商业", "市场格局"),
    "具身智能": ("行业知识", "具身智能"),
    "商业模式": ("趋势与商业", "商业模式"),
}

# 旧的 3/4 anchor 命名 → 新命名
LEGACY_ANCHOR_RENAME = {
    "行业视野": "行业知识",
}
