from typing import Dict, List, TypedDict


class CategoryConfig(TypedDict):
    value: str
    label: str
    color: str


CATEGORY_CONFIG: List[CategoryConfig] = [
    {"value": "inheritor", "label": "传承人", "color": "#8B5CF6"},
    {"value": "technique", "label": "技艺", "color": "#10B981"},
    {"value": "work", "label": "作品", "color": "#F59E0B"},
    {"value": "pattern", "label": "纹样", "color": "#EF4444"},
    {"value": "region", "label": "地域", "color": "#06B6D4"},
    {"value": "period", "label": "时期", "color": "#6366F1"},
    {"value": "material", "label": "材料", "color": "#84CC16"},
]

CATEGORY_COLORS: Dict[str, str] = {c["value"]: c["color"] for c in CATEGORY_CONFIG}
CATEGORY_LABELS: Dict[str, str] = {c["value"]: c["label"] for c in CATEGORY_CONFIG}

RELATION_TYPES: List[Dict[str, str]] = [
    {"value": "传承", "label": "传承"},
    {"value": "创作", "label": "创作"},
    {"value": "包含", "label": "包含"},
    {"value": "产地", "label": "产地"},
    {"value": "时期", "label": "时期"},
    {"value": "使用", "label": "使用"},
    {"value": "相关", "label": "相关"},
    {"value": "属于", "label": "属于"},
    {"value": "材料", "label": "材料"},
]


def get_category_color(entity_type: str) -> str:
    return CATEGORY_COLORS.get(entity_type, "#8B5CF6")


def get_category_label(entity_type: str) -> str:
    return CATEGORY_LABELS.get(entity_type, entity_type)


def get_graph_categories() -> List[Dict]:
    return [
        {"name": c["label"], "itemStyle": {"color": c["color"]}}
        for c in CATEGORY_CONFIG
    ]
