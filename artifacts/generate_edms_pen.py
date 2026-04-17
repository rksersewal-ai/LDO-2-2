import json
import sys
from pathlib import Path


DEFAULT_OUT = Path(r"C:\Users\Ravi\Downloads\LDO-2-local\artifacts\edms-webapp-pages.pen")
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_OUT
OUT.parent.mkdir(parents=True, exist_ok=True)


VARS = {
    "--background": {"type": "color", "value": "#F1F4F9"},
    "--foreground": {"type": "color", "value": "#0F172A"},
    "--border": {"type": "color", "value": "#C8D1DD"},
    "--card": {"type": "color", "value": "#FFFFFF"},
    "--secondary": {"type": "color", "value": "#E2E7F0"},
    "--muted": {"type": "color", "value": "#EDF0F5"},
    "--muted-foreground": {"type": "color", "value": "#526380"},
    "--primary": {"type": "color", "value": "#0E7264"},
    "--primary-foreground": {"type": "color", "value": "#FFFFFF"},
    "--sidebar": {"type": "color", "value": "#E8ECF3"},
    "--sidebar-border": {"type": "color", "value": "#C2CCDA"},
    "--sidebar-foreground": {"type": "color", "value": "#0F172A"},
    "--sidebar-accent": {"type": "color", "value": "#E0F5F1"},
    "--sidebar-accent-foreground": {"type": "color", "value": "#0C6357"},
    "--accent": {"type": "color", "value": "#DFF2EE"},
    "--danger": {"type": "color", "value": "#B91C1C"},
    "--warning": {"type": "color", "value": "#B45309"},
    "--rose-surface": {"type": "color", "value": "#FEF2F2"},
    "--amber-surface": {"type": "color", "value": "#FFF7ED"},
    "--teal-surface": {"type": "color", "value": "#ECFDF5"},
    "--blue-surface": {"type": "color", "value": "#EFF6FF"},
    "--viewer": {"type": "color", "value": "#0F172A"},
    "--viewer-muted": {"type": "color", "value": "#1E293B"},
    "--viewer-border": {"type": "color", "value": "#334155"},
    "--viewer-foreground": {"type": "color", "value": "#E2E8F0"},
}


def compact(node):
    return {k: v for k, v in node.items() if v is not None}


def text(
    node_id,
    content,
    *,
    fill="$--foreground",
    font_size=14,
    font_weight=None,
    text_growth=None,
    width=None,
    line_height=None,
    font_family="IBM Plex Sans",
    name=None,
):
    return compact(
        {
            "type": "text",
            "id": node_id,
            "name": name,
            "content": content,
            "fill": fill,
            "fontFamily": font_family,
            "fontSize": font_size,
            "fontWeight": str(font_weight) if font_weight is not None else None,
            "textGrowth": text_growth,
            "width": width,
            "lineHeight": line_height,
        }
    )


def icon(node_id, icon_name, *, fill="$--foreground", width=16, height=16):
    return {
        "type": "icon_font",
        "id": node_id,
        "iconFontFamily": "lucide",
        "iconFontName": icon_name,
        "width": width,
        "height": height,
        "fill": fill,
    }


def frame(
    node_id,
    *,
    children=None,
    layout=None,
    width=None,
    height=None,
    fill=None,
    stroke=None,
    padding=None,
    gap=None,
    corner_radius=None,
    x=None,
    y=None,
    name=None,
    reusable=None,
    justify_content=None,
    align_items=None,
    clip=None,
):
    return compact(
        {
            "type": "frame",
            "id": node_id,
            "name": name,
            "x": x,
            "y": y,
            "layout": layout,
            "width": width,
            "height": height,
            "fill": fill,
            "stroke": stroke,
            "padding": padding,
            "gap": gap,
            "cornerRadius": corner_radius,
            "children": children,
            "reusable": reusable,
            "justifyContent": justify_content,
            "alignItems": align_items,
            "clip": clip,
        }
    )


def stroke(fill="$--border", thickness=1):
    return {"align": "inside", "fill": fill, "thickness": thickness}


def bottom_stroke(fill="$--border"):
    return {"align": "inside", "fill": fill, "thickness": {"bottom": 1}}


def logo_badge(prefix):
    return frame(
        prefix + "LogoBadge",
        layout="horizontal",
        width=42,
        height=42,
        justify_content="center",
        align_items="center",
        fill="$--card",
        stroke=stroke("$--sidebar-border"),
        corner_radius=16,
        children=[
            text(
                prefix + "LogoText",
                "L2",
                fill="$--primary",
                font_size=16,
                font_weight=700,
                font_family="IBM Plex Mono",
            )
        ],
    )


def sidebar_item(prefix, label, *, active=False):
    fill = "$--card" if active else None
    st = stroke("$--sidebar-border") if active else None
    text_fill = "$--foreground" if active else "$--muted-foreground"
    icon_fill = "$--primary" if active else "$--muted-foreground"
    return frame(
        prefix + "Item",
        layout="horizontal",
        width="fill_container",
        height="fit_content",
        gap=10,
        padding=[10, 14],
        align_items="center",
        fill=fill,
        stroke=st,
        corner_radius=12 if active else None,
        children=[
            icon(prefix + "Icon", "dot", fill=icon_fill, width=14, height=14),
            text(prefix + "Label", label, fill=text_fill, font_size=13, font_weight=600 if active else None),
        ],
    )


def sidebar(prefix):
    groups = [
        ("Core", ["Dashboard", "Search Explorer", "Document Hub"]),
        ("Engineering", ["BOM Explorer", "PL Knowledge Hub"]),
        ("Workflow", ["Work Ledger", "Cases", "Approvals"]),
        ("Tools", ["Alert Rules", "Doc Templates"]),
        ("Reports", ["Reports", "Ledger Reports"]),
        ("System", ["Admin", "Initial Run", "Users", "OCR Monitor", "System Health", "Audit Log", "Banners", "Settings"]),
    ]
    children = [
        frame(
            prefix + "Brand",
            layout="horizontal",
            width="fill_container",
            height="fit_content",
            gap=12,
            align_items="center",
            children=[
                logo_badge(prefix),
                frame(
                    prefix + "BrandText",
                    layout="vertical",
                    width="fill_container",
                    height="fit_content",
                    gap=2,
                    children=[
                        text(prefix + "BrandTitle", "LDO-2 EDMS", font_size=15, font_weight=700),
                        text(
                            prefix + "BrandSub",
                            "Industrial Control",
                            fill="$--muted-foreground",
                            font_size=10,
                            font_weight=700,
                        ),
                    ],
                ),
            ],
        )
    ]
    for i, (label, items) in enumerate(groups):
        group_children = [
            text(
                f"{prefix}Group{i}Label",
                label,
                fill="$--muted-foreground",
                font_size=10,
                font_weight=700,
            )
        ]
        for j, item in enumerate(items):
            group_children.append(
                sidebar_item(f"{prefix}Group{i}Item{j}", item, active=(i == 0 and j == 0))
            )
        children.append(
            frame(
                f"{prefix}Group{i}",
                layout="vertical",
                width="fill_container",
                height="fit_content",
                gap=8,
                children=group_children,
            )
        )
    return frame(
        prefix + "Sidebar",
        layout="vertical",
        width=284,
        height="fill_container",
        gap=16,
        padding=24,
        fill="$--sidebar",
        stroke=stroke("$--sidebar-border"),
        corner_radius=28,
        children=children,
    )


def topbar(prefix, breadcrumb, page_title):
    return frame(
        prefix + "TopbarWrap",
        layout="vertical",
        width="fill_container",
        height="fit_content",
        children=[
            frame(
                prefix + "Banner",
                layout="horizontal",
                width="fill_container",
                height="fit_content",
                justify_content="space_between",
                align_items="center",
                padding=[10, 16],
                fill="$--amber-surface",
                stroke=bottom_stroke("#F2D5A7"),
                children=[
                    frame(
                        prefix + "BannerLeft",
                        layout="horizontal",
                        width="fit_content",
                        height="fit_content",
                        gap=8,
                        align_items="center",
                        children=[
                            icon(prefix + "BannerIcon", "alert-triangle", fill="$--warning", width=14, height=14),
                            text(prefix + "BannerEyebrow", "Maintenance Window", fill="$--warning", font_size=11, font_weight=700),
                            text(
                                prefix + "BannerCopy",
                                "OCR engine restart scheduled at 03:00 UTC. Expect minor ingestion and preview delays.",
                                fill="$--warning",
                                font_size=11,
                            ),
                        ],
                    ),
                    frame(
                        prefix + "BannerActions",
                        layout="horizontal",
                        width="fit_content",
                        height="fit_content",
                        gap=8,
                        children=[
                            pill_button(prefix + "BannerBtnA", "OCR Monitor", variant="secondary"),
                            pill_button(prefix + "BannerBtnB", "System Health", variant="secondary"),
                        ],
                    ),
                ],
            ),
            frame(
                prefix + "Topbar",
                layout="horizontal",
                width="fill_container",
                height=64,
                justify_content="space_between",
                align_items="center",
                padding=[0, 20],
                fill="$--card",
                stroke=bottom_stroke(),
                children=[
                    frame(
                        prefix + "TopbarTitle",
                        layout="vertical",
                        width="fit_content",
                        height="fit_content",
                        gap=4,
                        children=[
                            text(prefix + "Breadcrumb", breadcrumb, fill="$--muted-foreground", font_size=11, font_weight=700),
                            frame(
                                prefix + "PageRow",
                                layout="horizontal",
                                width="fit_content",
                                height="fit_content",
                                gap=8,
                                align_items="center",
                                children=[
                                    text(prefix + "PageTitle", page_title, font_size=17, font_weight=600),
                                    pill(prefix + "Guide", "Workspace orientation"),
                                ],
                            ),
                        ],
                    ),
                    frame(
                        prefix + "TopbarRight",
                        layout="horizontal",
                        width="fit_content",
                        height="fit_content",
                        gap=8,
                        align_items="center",
                        children=[
                            pill(prefix + "Access", "admin access"),
                            pill(prefix + "Clock", "17 Apr 2026 · 19:05"),
                            search_trigger(prefix + "SearchTrigger"),
                            top_icon_button(prefix + "Help", "life-buoy"),
                            top_icon_button(prefix + "Theme", "moon"),
                            top_icon_button(prefix + "Type", "type"),
                            top_icon_button(prefix + "Bell", "bell"),
                            profile_chip(prefix + "Profile"),
                        ],
                    ),
                ],
            ),
        ],
    )


def search_trigger(prefix):
    return frame(
        prefix,
        layout="horizontal",
        width=238,
        height=38,
        gap=8,
        padding=[0, 14],
        align_items="center",
        fill="$--card",
        stroke=stroke("$--border"),
        corner_radius=999,
        children=[
            icon(prefix + "Icon", "search", fill="$--muted-foreground", width=14, height=14),
            text(prefix + "Label", "Search records, PLs, work items...", fill="$--muted-foreground", font_size=12),
            pill(prefix + "Kbd", "⌘K"),
        ],
    )


def top_icon_button(prefix, icon_name):
    return frame(
        prefix,
        layout="horizontal",
        width=36,
        height=36,
        justify_content="center",
        align_items="center",
        fill="$--card",
        stroke=stroke("$--border"),
        corner_radius=12,
        children=[icon(prefix + "Icon", icon_name, fill="$--muted-foreground", width=14, height=14)],
    )


def profile_chip(prefix):
    return frame(
        prefix,
        layout="horizontal",
        width="fit_content",
        height=36,
        gap=10,
        padding=[0, 10],
        align_items="center",
        fill="$--card",
        stroke=stroke("$--border"),
        corner_radius=12,
        children=[
            frame(
                prefix + "Avatar",
                layout="horizontal",
                width=24,
                height=24,
                justify_content="center",
                align_items="center",
                fill="$--accent",
                corner_radius=8,
                children=[text(prefix + "Initials", "RA", fill="$--primary", font_size=11, font_weight=700)],
            ),
            frame(
                prefix + "Text",
                layout="vertical",
                width="fit_content",
                height="fit_content",
                gap=1,
                children=[
                    text(prefix + "Name", "Ravi", font_size=12, font_weight=600),
                    text(prefix + "Role", "admin", fill="$--muted-foreground", font_size=10),
                ],
            ),
        ],
    )


def pill(prefix, label, *, fill="$--card", text_fill="$--muted-foreground"):
    return frame(
        prefix,
        layout="horizontal",
        width="fit_content",
        height="fit_content",
        padding=[6, 10],
        fill=fill,
        stroke=stroke("$--border"),
        corner_radius=999,
        children=[text(prefix + "Label", label, fill=text_fill, font_size=10, font_weight=700)],
    )


def pill_button(prefix, label, *, variant="primary"):
    if variant == "primary":
        fill = "$--primary"
        text_fill = "$--primary-foreground"
        st = None
    else:
        fill = "$--card"
        text_fill = "$--foreground"
        st = stroke("$--border")
    return frame(
        prefix,
        layout="horizontal",
        width="fit_content",
        height="fit_content",
        padding=[8, 12],
        fill=fill,
        stroke=st,
        corner_radius=999,
        children=[text(prefix + "Label", label, fill=text_fill, font_size=11, font_weight=600)],
    )


def page_header(prefix, title, subtitle, *, action_labels=None):
    actions = []
    for i, label in enumerate(action_labels or []):
        actions.append(pill_button(prefix + f"Action{i}", label, variant="secondary" if i < len(action_labels or []) - 1 else "primary"))
    return frame(
        prefix,
        layout="horizontal",
        width="fill_container",
        height="fit_content",
        justify_content="space_between",
        align_items="center",
        children=[
            frame(
                prefix + "Copy",
                layout="vertical",
                width="fill_container",
                height="fit_content",
                gap=4,
                children=[
                    text(prefix + "Title", title, font_size=28, font_weight=600),
                    text(
                        prefix + "Subtitle",
                        subtitle,
                        fill="$--muted-foreground",
                        font_size=14,
                        text_growth="fixed-width",
                        width="fill_container",
                    ),
                ],
            ),
            frame(
                prefix + "Actions",
                layout="horizontal",
                width="fit_content",
                height="fit_content",
                gap=8,
                children=actions,
            )
            if actions
            else frame(prefix + "Actions", layout="horizontal", width="fit_content", height="fit_content", gap=8, children=[]),
        ],
    )


def stat_tile(prefix, label, value, note=None, *, accent=None, compact=False):
    return frame(
        prefix,
        layout="horizontal" if compact else "vertical",
        width="fill_container",
        height="fit_content",
        gap=12 if compact else 6,
        align_items="center" if compact else None,
        padding=16 if compact else 14,
        fill="$--card",
        stroke=stroke("$--border"),
        corner_radius=16 if compact else 12,
        children=[
            frame(
                prefix + "IconWrap",
                layout="horizontal",
                width=32 if compact else 36,
                height=32 if compact else 36,
                justify_content="center",
                align_items="center",
                fill=accent or "$--secondary",
                corner_radius=10 if compact else 12,
                children=[text(prefix + "IconGlyph", "•", fill="$--primary", font_size=18)],
            ),
            frame(
                prefix + "Copy",
                layout="vertical",
                width="fill_container" if compact else "fit_content",
                height="fit_content",
                gap=2,
                children=[
                    text(prefix + "Label", label, fill="$--muted-foreground", font_size=10, font_weight=700),
                    text(prefix + "Value", value, font_size=22 if compact else 24, font_weight=700, font_family="IBM Plex Mono"),
                    text(prefix + "Note", note, fill="$--muted-foreground", font_size=11, text_growth="fixed-width", width="fill_container")
                    if note
                    else None,
                ],
            ),
        ],
    )


def table_card(prefix, title, search_placeholder, headers, rows):
    header_row = frame(
        prefix + "HeaderRow",
        layout="horizontal",
        width="fill_container",
        height="fit_content",
        gap=12,
        padding=[12, 16],
        fill="$--muted",
        corner_radius=12,
        children=[text(prefix + f"H{i}", h, fill="$--muted-foreground", font_size=11, font_weight=700) for i, h in enumerate(headers)],
    )
    row_nodes = []
    for i, row in enumerate(rows):
        row_nodes.append(
            frame(
                prefix + f"Row{i}",
                layout="horizontal",
                width="fill_container",
                height="fit_content",
                gap=12,
                padding=[12, 16],
                fill="$--card",
                stroke=stroke("$--border"),
                corner_radius=12,
                children=[text(prefix + f"R{i}C{j}", value, fill="$--foreground", font_size=12) for j, value in enumerate(row)],
            )
        )
    return frame(
        prefix,
        layout="vertical",
        width="fill_container",
        height="fit_content",
        gap=12,
        padding=16,
        fill="$--card",
        stroke=stroke("$--border"),
        corner_radius=20,
        children=[
            frame(
                prefix + "Toolbar",
                layout="horizontal",
                width="fill_container",
                height="fit_content",
                gap=12,
                children=[
                    frame(
                        prefix + "Search",
                        layout="horizontal",
                        width="fill_container",
                        height=40,
                        gap=8,
                        padding=[0, 14],
                        align_items="center",
                        fill="$--secondary",
                        stroke=stroke("$--border"),
                        corner_radius=12,
                        children=[
                            icon(prefix + "SearchIcon", "search", fill="$--muted-foreground", width=14, height=14),
                            text(prefix + "SearchLabel", search_placeholder, fill="$--muted-foreground", font_size=12),
                        ],
                    ),
                    pill_button(prefix + "Filter", "Filters", variant="secondary"),
                    pill_button(prefix + "Export", "Export", variant="secondary"),
                ],
            ),
            text(prefix + "Title", title, font_size=14, font_weight=600),
            header_row,
            *row_nodes,
        ],
    )


def hero_panel(prefix, eyebrow, title, subtitle, metric_items, ctas):
    metric_cards = []
    for i, (label, value, hint) in enumerate(metric_items):
        metric_cards.append(
            frame(
                prefix + f"Metric{i}",
                layout="vertical",
                width="fill_container",
                height="fit_content",
                gap=4,
                padding=14,
                fill="$--card",
                stroke=stroke("$--border"),
                corner_radius=16,
                children=[
                    text(prefix + f"Metric{i}Label", label, fill="$--muted-foreground", font_size=10, font_weight=700),
                    text(prefix + f"Metric{i}Value", value, font_size=24, font_weight=700, font_family="IBM Plex Mono"),
                    text(prefix + f"Metric{i}Hint", hint, fill="$--muted-foreground", font_size=11, text_growth="fixed-width", width="fill_container"),
                ],
            )
        )
    cta_nodes = [
        pill_button(prefix + f"Cta{i}", label, variant="primary" if i == 0 else "secondary")
        for i, label in enumerate(ctas)
    ]
    return frame(
        prefix,
        layout="vertical",
        width="fill_container",
        height="fit_content",
        gap=16,
        padding=20,
        fill="$--card",
        stroke=stroke("$--primary"),
        corner_radius=24,
        children=[
            frame(
                prefix + "Top",
                layout="horizontal",
                width="fill_container",
                height="fit_content",
                gap=20,
                children=[
                    frame(
                        prefix + "Copy",
                        layout="vertical",
                        width="fill_container",
                        height="fit_content",
                        gap=6,
                        children=[
                            text(prefix + "Eyebrow", eyebrow, fill="$--primary", font_size=11, font_weight=700),
                            text(prefix + "Title", title, font_size=22, font_weight=600, text_growth="fixed-width", width="fill_container"),
                            text(
                                prefix + "Subtitle",
                                subtitle,
                                fill="$--muted-foreground",
                                font_size=14,
                                text_growth="fixed-width",
                                width="fill_container",
                                line_height=1.35,
                            ),
                        ],
                    ),
                    frame(
                        prefix + "Metrics",
                        layout="vertical",
                        width=340,
                        height="fit_content",
                        gap=12,
                        children=[
                            frame(
                                prefix + "MetricGridA",
                                layout="horizontal",
                                width="fill_container",
                                height="fit_content",
                                gap=12,
                                children=metric_cards[:2],
                            ),
                            frame(
                                prefix + "MetricGridB",
                                layout="horizontal",
                                width="fill_container",
                                height="fit_content",
                                gap=12,
                                children=metric_cards[2:4],
                            ),
                        ],
                    ),
                ],
            ),
            frame(
                prefix + "Ctas",
                layout="horizontal",
                width="fit_content",
                height="fit_content",
                gap=8,
                children=cta_nodes,
            ),
        ],
    )


def metric_panel(prefix, title, helper, action):
    return frame(
        prefix,
        layout="vertical",
        width="fill_container",
        height="fit_content",
        gap=14,
        padding=20,
        fill="$--card",
        stroke=stroke("$--border"),
        corner_radius=24,
        children=[
            frame(
                prefix + "Top",
                layout="horizontal",
                width="fill_container",
                height="fit_content",
                justify_content="space_between",
                align_items="center",
                children=[
                    frame(
                        prefix + "Icon",
                        layout="horizontal",
                        width=40,
                        height=40,
                        justify_content="center",
                        align_items="center",
                        fill="$--accent",
                        corner_radius=14,
                        children=[text(prefix + "IconGlyph", "•", fill="$--primary", font_size=20)],
                    ),
                    icon(prefix + "Arrow", "arrow-right", fill="$--muted-foreground", width=14, height=14),
                ],
            ),
            text(prefix + "Value", "148", font_size=34, font_weight=700, font_family="IBM Plex Mono"),
            text(prefix + "Title", title, font_size=14, font_weight=600),
            text(prefix + "Helper", helper, fill="$--muted-foreground", font_size=13, text_growth="fixed-width", width="fill_container"),
            text(prefix + "Action", action, fill="$--primary", font_size=11, font_weight=700),
        ],
    )


def summary_row(prefix, items):
    return frame(
        prefix,
        layout="horizontal",
        width="fill_container",
        height="fit_content",
        gap=12,
        children=[
            frame(
                prefix + f"Item{i}",
                layout="vertical",
                width="fill_container",
                height="fit_content",
                gap=6,
                padding=18,
                fill="$--card",
                stroke=stroke("$--border"),
                corner_radius=20,
                children=[
                    text(prefix + f"Item{i}Label", label, fill="$--muted-foreground", font_size=11, font_weight=700),
                    text(prefix + f"Item{i}Value", value, font_size=26, font_weight=700, font_family="IBM Plex Mono"),
                    text(prefix + f"Item{i}Note", note, fill="$--muted-foreground", font_size=12, text_growth="fixed-width", width="fill_container"),
                ],
            )
            for i, (label, value, note) in enumerate(items)
        ],
    )


def list_card(prefix, title, items, *, highlight_fill="$--muted"):
    children = [
        frame(
            prefix + "Header",
            layout="horizontal",
            width="fill_container",
            height="fit_content",
            justify_content="space_between",
            align_items="center",
            children=[
                text(prefix + "Title", title, fill="$--muted-foreground", font_size=11, font_weight=700),
                pill_button(prefix + "ViewAll", "View all", variant="secondary"),
            ],
        )
    ]
    for i, (main, meta, badge) in enumerate(items):
        children.append(
            frame(
                prefix + f"Item{i}",
                layout="horizontal",
                width="fill_container",
                height="fit_content",
                gap=12,
                align_items="center",
                padding=16,
                fill=highlight_fill,
                stroke=stroke("$--border"),
                corner_radius=18,
                children=[
                    frame(
                        prefix + f"Item{i}Icon",
                        layout="horizontal",
                        width=36,
                        height=36,
                        justify_content="center",
                        align_items="center",
                        fill="$--accent",
                        corner_radius=12,
                        children=[text(prefix + f"Item{i}Glyph", "•", fill="$--primary", font_size=18)],
                    ),
                    frame(
                        prefix + f"Item{i}Copy",
                        layout="vertical",
                        width="fill_container",
                        height="fit_content",
                        gap=2,
                        children=[
                            text(prefix + f"Item{i}Main", main, font_size=13, font_weight=600),
                            text(prefix + f"Item{i}Meta", meta, fill="$--muted-foreground", font_size=11),
                        ],
                    ),
                    pill(prefix + f"Item{i}Badge", badge, fill="$--card", text_fill="$--foreground"),
                ],
            )
        )
    return frame(
        prefix,
        layout="vertical",
        width="fill_container",
        height="fit_content",
        gap=12,
        padding=18,
        fill="$--card",
        stroke=stroke("$--border"),
        corner_radius=24,
        children=children,
    )


def chart_card(prefix, title, *, height=180):
    bars = []
    for i, h in enumerate([48, 86, 72, 110, 68, 92]):
        bars.append(
            frame(
                prefix + f"Bar{i}",
                layout="vertical",
                width="fill_container",
                height=h,
                fill="$--accent",
                corner_radius=12,
            )
        )
    return frame(
        prefix,
        layout="vertical",
        width="fill_container",
        height="fit_content",
        gap=14,
        padding=18,
        fill="$--card",
        stroke=stroke("$--border"),
        corner_radius=20,
        children=[
            text(prefix + "Title", title, fill="$--muted-foreground", font_size=11, font_weight=700),
            frame(
                prefix + "Plot",
                layout="horizontal",
                width="fill_container",
                height=height,
                gap=10,
                align_items="end",
                fill="$--muted",
                corner_radius=16,
                padding=16,
                children=bars,
            ),
        ],
    )


def shell_page(prefix, name, x, y, content_children, *, width=1440, height=1024, breadcrumb="Home / Dashboard", page_title="Dashboard"):
    return frame(
        prefix,
        name=name,
        x=x,
        y=y,
        layout="horizontal",
        width=width,
        height=height,
        padding=16,
        gap=16,
        fill="$--background",
        children=[
            sidebar(prefix),
            frame(
                prefix + "Main",
                layout="vertical",
                width="fill_container",
                height="fill_container",
                fill="$--card",
                stroke=stroke("$--border"),
                corner_radius=30,
                children=[
                    topbar(prefix, breadcrumb, page_title),
                    frame(
                        prefix + "Scroll",
                        layout="vertical",
                        width="fill_container",
                        height="fill_container",
                        gap=24,
                        padding=24,
                        children=content_children,
                    ),
                ],
            ),
        ],
    )


def dashboard_body(prefix):
    hero = hero_panel(
        prefix + "Hero",
        "Operations Command",
        "One disciplined surface for documents, approvals, PL control, and release risk.",
        "The workspace is tuned for compact scanning, contrast-safe decision making, and fast movement across the engineering control loop.",
        [
            ("Release-ready", "87%", "Based on approvals, OCR exceptions, and controlled documents."),
            ("Repository savings", "8.4", "Potential GB recovered from duplicate review."),
            ("Approval lane", "12", "Items awaiting sign-off before release."),
            ("OCR queue", "7", "Jobs processing or blocked."),
        ],
        ["Open Document Hub", "Review Pending Approvals", "Search Workspace"],
    )
    metric_row = frame(
        prefix + "MetricRow",
        layout="horizontal",
        width="fill_container",
        height="fit_content",
        gap=16,
        children=[
            metric_panel(prefix + "MetricA", "Documents under control", "Approved and active documents ready for downstream use.", "Go to Document Hub"),
            metric_panel(prefix + "MetricB", "Approval load", "Pending sign-offs clustered by due date and release pressure.", "Open Approvals"),
            metric_panel(prefix + "MetricC", "Open case pressure", "High-severity investigations remain unresolved.", "View Cases"),
            metric_panel(prefix + "MetricD", "OCR attention lane", "Failed OCR jobs and previews needing intervention.", "Open OCR Monitor"),
        ],
    )
    release_lane = frame(
        prefix + "ReleaseLane",
        layout="horizontal",
        width="fill_container",
        height="fit_content",
        gap=16,
        children=[
            list_card(
                prefix + "DocsList",
                "Recent controlled documents",
                [
                    ("GA-PL-042 Release Package", "DOC-10021 · Rev R17 · Planning · 14 Apr 2026", "In Review"),
                    ("Motor Assembly Drawing", "DOC-10011 · Rev R05 · Engineering · 13 Apr 2026", "Approved"),
                    ("Archive Migration Set", "DOC-09440 · Rev R03 · Records · 11 Apr 2026", "Queued"),
                ],
            ),
            list_card(
                prefix + "ApprovalsList",
                "Pending sign-off queue",
                [
                    ("Approval chain for GA-PL-042", "APR-91 · Due 18 Apr 2026 · A. Kowalski", "Pending"),
                    ("Package release review", "APR-88 · Due 19 Apr 2026 · M. Chen", "In Review"),
                    ("Archive disposition request", "APR-83 · Due 21 Apr 2026 · Records", "Open"),
                ],
            ),
        ],
    )
    ops_snapshot = frame(
        prefix + "OpsSnapshot",
        layout="horizontal",
        width="fill_container",
        height="fit_content",
        gap=16,
        children=[
            list_card(
                prefix + "QuickAccess",
                "Primary work areas",
                [
                    ("Document Hub", "Release, archive, OCR, and preview control in one lane.", "Open"),
                    ("BOM Explorer", "Review assemblies, product structures, and change lineage.", "Open"),
                    ("Work Ledger", "Track verified records and linked PL activity.", "Open"),
                ],
            ),
            frame(
                prefix + "OpsSummary",
                layout="vertical",
                width="fill_container",
                height="fit_content",
                gap=12,
                padding=18,
                fill="$--card",
                stroke=stroke("$--border"),
                corner_radius=24,
                children=[
                    text(prefix + "OpsSummaryTitle", "Operations snapshot", fill="$--muted-foreground", font_size=11, font_weight=700),
                    summary_row(
                        prefix + "OpsSummaryRow",
                        [
                            ("PL coverage", "1,248", "Production products mapped to controlled PLs."),
                            ("Reporting readiness", "842", "Approved documents available for report packs."),
                            ("Deduplication impact", "18", "Pending groups remain in review."),
                        ],
                    ),
                ],
            ),
        ],
    )
    return [hero, metric_row, release_lane, ops_snapshot]


def workbench_body(prefix, title, subtitle, hero_eyebrow, hero_title, hero_subtitle):
    return [
        page_header(prefix + "PageHeader", title, subtitle, action_labels=["CSV", "Excel", "Bulk Upload", "Primary Action"]),
        hero_panel(
            prefix + "Workbench",
            hero_eyebrow,
            hero_title,
            hero_subtitle,
            [
                ("Release-ready", "184", "Approved documents in active circulation"),
                ("Review lane", "36", "Files currently awaiting sign-off"),
                ("OCR queue", "12", "Processing and failed OCR items"),
                ("Unlinked PL", "7", "Docs missing part linkage or evidence chain"),
            ],
            ["Focus Review Queue", "OCR Processing", "Templates"],
        ),
        summary_row(
            prefix + "Stats",
            [
                ("Total Documents", "1,824", "All records in scope"),
                ("In Review", "36", "Awaiting sign-off"),
                ("OCR Exceptions", "5", "Manual attention required"),
                ("Unlinked PL", "7", "Metadata incomplete"),
            ],
        ),
        table_card(
            prefix + "Table",
            "Operator surface",
            "Search by name, ID, PL number, author, or tags...",
            ["Reference", "Owner", "Revision", "Status"],
            [
                ("DOC-10021", "Planning", "R17", "In Review"),
                ("DOC-10011", "Engineering", "R05", "Approved"),
                ("DOC-09440", "Records", "R03", "Queued"),
            ],
        ),
    ]


def search_body(prefix):
    centered = frame(
        prefix + "Centered",
        layout="vertical",
        width=1040,
        height="fit_content",
        gap=24,
        children=[
            frame(
                prefix + "Heading",
                layout="vertical",
                width="fill_container",
                height="fit_content",
                gap=6,
                children=[
                    frame(
                        prefix + "TitleRow",
                        layout="horizontal",
                        width="fit_content",
                        height="fit_content",
                        gap=10,
                        align_items="center",
                        children=[
                            frame(
                                prefix + "Spark",
                                layout="horizontal",
                                width=32,
                                height=32,
                                justify_content="center",
                                align_items="center",
                                fill="$--accent",
                                stroke=stroke("$--primary"),
                                corner_radius=12,
                                children=[icon(prefix + "SparkIcon", "sparkles", fill="$--primary", width=14, height=14)],
                            ),
                            text(prefix + "Title", "Search Explorer", font_size=28, font_weight=700),
                        ],
                    ),
                    text(
                        prefix + "Subtitle",
                        "Full-text search across documents, PL records, work entries, and cases — including OCR-extracted text.",
                        fill="$--muted-foreground",
                        font_size=14,
                        text_growth="fixed-width",
                        width="fill_container",
                    ),
                ],
            ),
            hero_panel(
                prefix + "Hero",
                "Operator Search Console",
                "Move from one query to the exact document, work record, or case without rebuilding context on the destination page.",
                "Search context now deep-links into document previews and opens focused records in the ledger and case consoles.",
                [
                    ("Indexed domains", "4", "Docs, PL, work, cases"),
                    ("Saved playbooks", "6", "Reusable operator queries"),
                    ("Recent queries", "9", "Session recall"),
                    ("Search focus", "Ready", "Waiting for query"),
                ],
                ["Run Example Search", "Document-Only Mode", "Open Document Hub"],
            ),
            frame(
                prefix + "FilterCard",
                layout="vertical",
                width="fill_container",
                height="fit_content",
                gap=12,
                padding=16,
                fill="$--card",
                stroke=stroke("$--border"),
                corner_radius=20,
                children=[
                    frame(
                        prefix + "SearchInput",
                        layout="horizontal",
                        width="fill_container",
                        height=44,
                        gap=8,
                        padding=[0, 16],
                        align_items="center",
                        fill="$--secondary",
                        stroke=stroke("$--border"),
                        corner_radius=12,
                        children=[
                            icon(prefix + "SearchInputIcon", "search", fill="$--muted-foreground", width=14, height=14),
                            text(prefix + "SearchInputText", "Search documents, PL records, work items, or cases...", fill="$--muted-foreground", font_size=13),
                        ],
                    ),
                    frame(
                        prefix + "FilterTags",
                        layout="horizontal",
                        width="fit_content",
                        height="fit_content",
                        gap=8,
                        children=[
                            pill(prefix + "TagA", "Documents"),
                            pill(prefix + "TagB", "PL"),
                            pill(prefix + "TagC", "Work"),
                            pill(prefix + "TagD", "Cases"),
                            pill_button(prefix + "FilterBtn", "Reset Filters", variant="secondary"),
                        ],
                    ),
                ],
            ),
            frame(
                prefix + "ResultsGrid",
                layout="horizontal",
                width="fill_container",
                height="fit_content",
                gap=16,
                children=[
                    list_card(
                        prefix + "ResultsPrimary",
                        "Top results",
                        [
                            ("DOC-10021 · GA-PL-042 Release Package", "Document hit from OCR and metadata search", "Document"),
                            ("PL-2042 · Pump Assembly", "PL record with linked controlled documents", "PL"),
                            ("WL-812 · Release verification", "Open work record with matching description", "Work"),
                        ],
                    ),
                    list_card(
                        prefix + "ResultsSecondary",
                        "Saved playbooks",
                        [
                            ("Pending approvals with OCR failures", "Saved by Ravi · compliance lane", "Saved"),
                            ("Release blockers for PL families", "Saved by Supervisor · weekly review", "Saved"),
                            ("High-severity case bundle", "Saved by Review · issue desk", "Saved"),
                        ],
                    ),
                ],
            ),
        ],
    )
    return [frame(prefix + "CenterWrap", layout="vertical", width="fill_container", height="fit_content", gap=0, align_items="center", children=[centered])]


def workflow_body(prefix, title, subtitle):
    return [
        page_header(prefix + "Header", title, subtitle, action_labels=["Filters", "Analytics", "New Record"]),
        summary_row(
            prefix + "Stats",
            [
                ("Total Records", "612", "Full ledger population"),
                ("Open Items", "94", "Still in flight"),
                ("Overdue", "7", "Need immediate intervention"),
                ("On-time Rate", "97%", "Completion trend"),
            ],
        ),
        chart_card(prefix + "Analytics", "Work Ledger Analytics", height=150),
        table_card(
            prefix + "Table",
            "Main table",
            "Search ID, description, type, PL, eOffice, tender, officer...",
            ["Record", "Owner", "PL", "Status"],
            [
                ("WL-812", "A. Kowalski", "PL-2042", "Open"),
                ("WL-781", "S. Patel", "PL-2038", "Verified"),
                ("WL-744", "M. Chen", "PL-1984", "Closed"),
            ],
        ),
    ]


def detail_body(prefix, title, subtitle, *, dark_inner=False):
    base_fill = "$--viewer" if dark_inner else "$--card"
    base_fore = "$--viewer-foreground" if dark_inner else "$--foreground"
    base_muted = "$--muted-foreground" if not dark_inner else "#94A3B8"
    base_stroke = "$--viewer-border" if dark_inner else "$--border"
    action_row = frame(
        prefix + "ActionRow",
        layout="horizontal",
        width="fill_container",
        height="fit_content",
        gap=8,
        padding=[10, 12],
        fill=base_fill,
        stroke=stroke(base_stroke),
        corner_radius=16,
        children=[
            pill_button(prefix + "Back", "Hub", variant="secondary"),
            pill_button(prefix + "OpenAnother", "Open Another", variant="secondary"),
            pill_button(prefix + "Download", "Download", variant="secondary"),
            pill_button(prefix + "Preview", "Preview", variant="secondary"),
            pill_button(prefix + "Edit", "Edit Metadata", variant="secondary"),
            pill_button(prefix + "Approve", "Route for Approval", variant="primary"),
        ],
    )
    main_panels = frame(
        prefix + "Panels",
        layout="horizontal",
        width="fill_container",
        height="fill_container",
        gap=12,
        children=[
            frame(
                prefix + "LeftRail",
                layout="vertical",
                width=176,
                height="fill_container",
                gap=10,
                padding=12,
                fill=base_fill,
                stroke=stroke(base_stroke),
                corner_radius=18,
                children=[
                    pill(prefix + "PagesTab", "Pages", fill="$--accent", text_fill="$--primary"),
                    pill(prefix + "OcrTab", "OCR"),
                    frame(prefix + "ThumbA", layout="vertical", width="fill_container", height=140, fill="$--muted", corner_radius=14),
                    frame(prefix + "ThumbB", layout="vertical", width="fill_container", height=140, fill="$--muted", corner_radius=14),
                ],
            ),
            frame(
                prefix + "Canvas",
                layout="vertical",
                width="fill_container",
                height="fill_container",
                gap=12,
                padding=16,
                fill=base_fill,
                stroke=stroke(base_stroke),
                corner_radius=20,
                children=[
                    frame(
                        prefix + "CanvasHeader",
                        layout="horizontal",
                        width="fill_container",
                        height="fit_content",
                        justify_content="space_between",
                        align_items="center",
                        children=[
                            frame(
                                prefix + "CanvasTitleCol",
                                layout="vertical",
                                width="fit_content",
                                height="fit_content",
                                gap=2,
                                children=[
                                    text(prefix + "CanvasTitle", title, fill=base_fore, font_size=20, font_weight=600),
                                    text(prefix + "CanvasSub", subtitle, fill=base_muted, font_size=12),
                                ],
                            ),
                            pill(prefix + "CanvasBadge", "Preview minimized", fill="$--secondary", text_fill=base_muted),
                        ],
                    ),
                    frame(prefix + "CanvasSurface", layout="vertical", width="fill_container", height="fill_container", fill="$--secondary", stroke=stroke(base_stroke), corner_radius=18),
                ],
            ),
            frame(
                prefix + "Inspector",
                layout="vertical",
                width=320,
                height="fill_container",
                gap=14,
                padding=16,
                fill=base_fill,
                stroke=stroke(base_stroke),
                corner_radius=20,
                children=[
                    text(prefix + "InspectorTitle", "Document summary", fill=base_fore, font_size=14, font_weight=700),
                    summary_row(
                        prefix + "InspectorStats",
                        [
                            ("Document ID", "DOC-10021", "Controlled record"),
                            ("Status", "In Review", "Awaiting disposition"),
                            ("Revision", "R17", "Latest captured revision"),
                        ],
                    ),
                    chart_card(prefix + "InspectorIntelligence", "Intelligence status", height=120),
                ],
            ),
        ],
    )
    return [action_row, main_panels]


def preview_review_body(prefix, title, subtitle):
    return [
        page_header(prefix + "Header", title, subtitle, action_labels=["Cancel", "Reset rollback", "Save PL Record"]),
        frame(
            prefix + "Columns",
            layout="horizontal",
            width="fill_container",
            height="fit_content",
            gap=16,
            children=[
                frame(
                    prefix + "MainCol",
                    layout="vertical",
                    width="fill_container",
                    height="fit_content",
                    gap=16,
                    children=[
                        frame(
                            prefix + "Summary",
                            layout="vertical",
                            width="fill_container",
                            height="fit_content",
                            gap=14,
                            padding=20,
                            fill="$--card",
                            stroke=stroke("$--border"),
                            corner_radius=24,
                            children=[
                                text(prefix + "SummaryEyebrow", "Preview summary", fill="$--muted-foreground", font_size=11, font_weight=700),
                                text(prefix + "SummaryTitle", "PL-2042 · Pump Assembly", font_size=22, font_weight=700),
                                text(prefix + "SummarySub", "Prepared by Ravi on 17 Apr 2026 · New record", fill="$--muted-foreground", font_size=13),
                                summary_row(
                                    prefix + "SummaryFields",
                                    [
                                        ("PL Number", "2042", "Captured identifier"),
                                        ("Category", "Mechanical", "Current grouping"),
                                        ("Lifecycle", "Production", "Operating state"),
                                    ],
                                ),
                            ],
                        ),
                        list_card(
                            prefix + "ChangeLog",
                            "User change log",
                            [
                                ("Description", "Previous: Legacy pump assembly · Proposed: Updated safety note", "Changed"),
                                ("Linked drawings", "Previous: 2 docs · Proposed: 3 docs", "Changed"),
                                ("Safety critical", "Previous: No · Proposed: Yes", "Changed"),
                            ],
                        ),
                    ],
                ),
                frame(
                    prefix + "SideCol",
                    layout="vertical",
                    width=420,
                    height="fit_content",
                    gap=16,
                    children=[
                        list_card(
                            prefix + "Rollback",
                            "Rollback history",
                            [
                                ("Rev R17", "Saved 14 Apr 2026 · Document Control", "Current"),
                                ("Rev R16", "Saved 07 Apr 2026 · Engineering", "Saved"),
                                ("Rev R15", "Saved 02 Apr 2026 · Supervisor", "Saved"),
                            ],
                        ),
                        list_card(
                            prefix + "SaveChecklist",
                            "Save checklist",
                            [
                                ("Metadata validated", "Required fields are populated", "Ready"),
                                ("Linked documents", "Three controlled files attached", "Ready"),
                                ("Change review", "Field-level diff available", "Ready"),
                            ],
                        ),
                    ],
                ),
            ],
        ),
    ]


def analytics_body(prefix, title, subtitle, chart_titles):
    return [
        page_header(prefix + "Header", title, subtitle, action_labels=["Refresh", "Export"]),
        summary_row(
            prefix + "Stats",
            [
                ("Services Online", "12/12", "Healthy endpoints"),
                ("CPU Usage", "42%", "Current rolling average"),
                ("Memory", "61%", "Current consumption"),
                ("Disk Usage", "58%", "Primary storage"),
            ],
        ),
        frame(
            prefix + "Charts",
            layout="horizontal",
            width="fill_container",
            height="fit_content",
            gap=16,
            children=[chart_card(prefix + f"Chart{i}", label) for i, label in enumerate(chart_titles)],
        ),
        table_card(
            prefix + "Table",
            "Service status",
            "Filter service, host, region, or status...",
            ["Service", "Host", "Status", "Latency"],
            [
                ("OCR API", "ocr-01", "Healthy", "182 ms"),
                ("EDMS API", "api-04", "Healthy", "92 ms"),
                ("Indexer", "idx-02", "Warning", "380 ms"),
            ],
        ),
    ]


def admin_body(prefix, title, subtitle):
    return [
        page_header(prefix + "Header", title, subtitle, action_labels=["Open Audit Log", "Open OCR", "Settings"]),
        summary_row(
            prefix + "TopTiles",
            [
                ("OCR Engine Status", "Operational", "Throughput nominal"),
                ("Database", "Healthy", "Replication within SLA"),
                ("Security", "Nominal", "No blocking events"),
                ("Active Alerts", "1 Warning", "One banner currently active"),
            ],
        ),
        frame(
            prefix + "Grid",
            layout="horizontal",
            width="fill_container",
            height="fit_content",
            gap=16,
            children=[
                list_card(
                    prefix + "Events",
                    "Recent system events",
                    [
                        ("OCR pipeline restarted", "15:14 UTC · system", "Event"),
                        ("User permission updated", "14:52 UTC · admin", "Event"),
                        ("Backup replication completed", "14:31 UTC · system", "Event"),
                    ],
                ),
                frame(
                    prefix + "RightCol",
                    layout="vertical",
                    width="fill_container",
                    height="fit_content",
                    gap=16,
                    children=[
                        list_card(
                            prefix + "QuickLinks",
                            "Quick links",
                            [
                                ("System Health", "Review service metrics and host load.", "Open"),
                                ("OCR Monitor", "Investigate failures and throughput dips.", "Open"),
                                ("User Management", "Provision and retire workspace users.", "Open"),
                            ],
                        ),
                        frame(
                            prefix + "Warning",
                            layout="vertical",
                            width="fill_container",
                            height="fit_content",
                            gap=6,
                            padding=18,
                            fill="$--amber-surface",
                            stroke=stroke("#F2D5A7"),
                            corner_radius=20,
                            children=[
                                text(prefix + "WarningTitle", "OCR Engine Maintenance", fill="$--warning", font_size=14, font_weight=700),
                                text(
                                    prefix + "WarningBody",
                                    "Scheduled restart at 03:00 AM UTC. 45 minutes of reduced throughput expected.",
                                    fill="$--warning",
                                    font_size=12,
                                    text_growth="fixed-width",
                                    width="fill_container",
                                ),
                            ],
                        ),
                    ],
                ),
            ],
        ),
    ]


def collection_body(prefix, title, subtitle):
    return [
        page_header(prefix + "Header", title, subtitle, action_labels=["Export", "New Item"]),
        summary_row(
            prefix + "Stats",
            [
                ("Products", "128", "Items in current scope"),
                ("Total Nodes", "3,486", "Aggregate structure size"),
                ("In Production", "81", "Active lifecycle"),
                ("Total Parts", "9,420", "Linked components"),
            ],
        ),
        frame(
            prefix + "FiltersCard",
            layout="vertical",
            width="fill_container",
            height="fit_content",
            gap=14,
            padding=16,
            fill="$--card",
            stroke=stroke("$--border"),
            corner_radius=20,
            children=[
                frame(
                    prefix + "FiltersTop",
                    layout="horizontal",
                    width="fill_container",
                    height="fit_content",
                    gap=14,
                    children=[
                        frame(
                            prefix + "SearchInput",
                            layout="horizontal",
                            width="fill_container",
                            height=42,
                            gap=8,
                            padding=[0, 16],
                            align_items="center",
                            fill="$--secondary",
                            stroke=stroke("$--border"),
                            corner_radius=12,
                            children=[
                                icon(prefix + "SearchIcon", "search", fill="$--muted-foreground", width=14, height=14),
                                text(prefix + "SearchLabel", "Search records, PL numbers, products, or owners...", fill="$--muted-foreground", font_size=13),
                            ],
                        ),
                        pill(prefix + "Category", "Category"),
                        pill(prefix + "Lifecycle", "Lifecycle"),
                        pill(prefix + "Status", "Status"),
                    ],
                ),
                text(prefix + "FiltersMeta", "Showing filtered operational records with active filters and quick reset support.", fill="$--muted-foreground", font_size=12),
            ],
        ),
        table_card(
            prefix + "Table",
            "Collection table",
            "Search current grid...",
            ["Entity", "Owner", "Category", "Status"],
            [
                ("PL-2042 · Pump Assembly", "Engineering", "Mechanical", "Production"),
                ("PL-1780 · Control Cabinet", "Records", "Electrical", "Review"),
                ("PL-1604 · Hydraulic Set", "Planning", "Hydraulic", "Draft"),
            ],
        ),
    ]


def simple_state_page(prefix, name, x, y, title, subtitle, *, danger=False):
    fill = "$--viewer" if danger else "$--background"
    text_fill = "$--viewer-foreground" if danger else "$--foreground"
    muted_fill = "#94A3B8" if danger else "$--muted-foreground"
    border_fill = "$--viewer-border" if danger else "$--border"
    surface_fill = "$--viewer-muted" if danger else "$--card"
    return frame(
        prefix,
        name=name,
        x=x,
        y=y,
        layout="vertical",
        width=1200,
        height=860,
        justify_content="center",
        align_items="center",
        fill=fill,
        children=[
            frame(
                prefix + "Panel",
                layout="vertical",
                width=620,
                height="fit_content",
                gap=16,
                padding=32,
                align_items="center",
                fill=surface_fill,
                stroke=stroke(border_fill),
                corner_radius=28,
                children=[
                    frame(
                        prefix + "IconWrap",
                        layout="horizontal",
                        width=72,
                        height=72,
                        justify_content="center",
                        align_items="center",
                        fill="$--rose-surface" if danger else "$--accent",
                        stroke=stroke("$--danger" if danger else "$--primary"),
                        corner_radius=999,
                        children=[icon(prefix + "StateIcon", "shield-off" if danger else "triangle-alert", fill="$--danger" if danger else "$--primary", width=28, height=28)],
                    ),
                    text(prefix + "Title", title, fill=text_fill, font_size=30, font_weight=700),
                    text(
                        prefix + "Subtitle",
                        subtitle,
                        fill=muted_fill,
                        font_size=14,
                        text_growth="fixed-width",
                        width="fill_container",
                        line_height=1.4,
                    ),
                    frame(
                        prefix + "Actions",
                        layout="horizontal",
                        width="fit_content",
                        height="fit_content",
                        gap=10,
                        children=[
                            pill_button(prefix + "Primary", "Go Back", variant="primary"),
                            pill_button(prefix + "Secondary", "Open Search", variant="secondary"),
                        ],
                    ),
                ],
            )
        ],
    )


def login_page(prefix, name, x, y):
    left = frame(
        prefix + "Hero",
        layout="vertical",
        width="fill_container",
        height="fill_container",
        gap=20,
        padding=32,
        fill="$--card",
        stroke=stroke("$--border"),
        corner_radius=28,
        children=[
            frame(
                prefix + "HeroCopy",
                layout="vertical",
                width="fill_container",
                height="fit_content",
                gap=8,
                children=[
                    text(prefix + "Eyebrow", "LDO-2 Document Control", fill="$--primary", font_size=11, font_weight=700),
                    text(
                        prefix + "Title",
                        "Production-grade document governance for high-density operations.",
                        font_size=36,
                        font_weight=700,
                        text_growth="fixed-width",
                        width=620,
                    ),
                    text(
                        prefix + "Subtitle",
                        "The workspace is tuned for engineering, records, workflow, and system-health teams working on the same operational spine.",
                        fill="$--muted-foreground",
                        font_size=15,
                        text_growth="fixed-width",
                        width=620,
                    ),
                ],
            ),
            frame(
                prefix + "MetricRow",
                layout="horizontal",
                width="fill_container",
                height="fit_content",
                gap=12,
                children=[
                    stat_tile(prefix + "M1", "Role-aware lanes", "12", "navigation groups aligned to real work", accent="$--accent"),
                    stat_tile(prefix + "M2", "Audit-safe actions", "AA", "contrast and workflow states tuned for clarity", accent="$--accent"),
                    stat_tile(prefix + "M3", "Fast restore", "<1m", "returns operators to the last workspace route", accent="$--accent"),
                ],
            ),
            list_card(
                prefix + "CredentialCard",
                "Demo credentials mapped to live workspace roles",
                [
                    ("Administrator · admin", "Password: admin123", "Role"),
                    ("Engineering · a.kowalski", "Password: ldo2pass", "Role"),
                    ("Review · m.chen", "Password: ldo2pass", "Role"),
                    ("Supervisor · s.patel", "Password: ldo2pass", "Role"),
                ],
            ),
        ],
    )
    right = frame(
        prefix + "Auth",
        layout="vertical",
        width=480,
        height="fill_container",
        justify_content="center",
        gap=18,
        padding=28,
        fill="$--card",
        stroke=stroke("$--border"),
        corner_radius=28,
        children=[
            frame(
                prefix + "AuthHeader",
                layout="horizontal",
                width="fill_container",
                height="fit_content",
                gap=14,
                align_items="center",
                children=[
                    logo_badge(prefix + "Login"),
                    frame(
                        prefix + "AuthText",
                        layout="vertical",
                        width="fill_container",
                        height="fit_content",
                        gap=3,
                        children=[
                            text(prefix + "AuthEyebrow", "Secure Access", fill="$--primary", font_size=11, font_weight=700),
                            text(prefix + "AuthTitle", "Sign in to the EDMS workspace", font_size=24, font_weight=700),
                            text(prefix + "AuthSub", "Continue to records, PLs, workflow queues, and reporting.", fill="$--muted-foreground", font_size=13, text_growth="fixed-width", width="fill_container"),
                        ],
                    ),
                ],
            ),
            frame(
                prefix + "Form",
                layout="vertical",
                width="fill_container",
                height="fit_content",
                gap=14,
                padding=24,
                fill="$--muted",
                stroke=stroke("$--border"),
                corner_radius=24,
                children=[
                    text(prefix + "FormTitle", "Workspace authentication", font_size=16, font_weight=700),
                    form_field(prefix + "User", "Username", "e.g. a.kowalski"),
                    form_field(prefix + "Password", "Password", "••••••••"),
                    frame(
                        prefix + "Submit",
                        layout="horizontal",
                        width="fill_container",
                        height=48,
                        justify_content="center",
                        align_items="center",
                        fill="$--primary",
                        corner_radius=18,
                        children=[text(prefix + "SubmitLabel", "Enter Workspace", fill="$--primary-foreground", font_size=14, font_weight=700)],
                    ),
                    text(prefix + "FormFoot", "Authentication restores the last active route and applies saved view, typography, and motion preferences.", fill="$--muted-foreground", font_size=12, text_growth="fixed-width", width="fill_container"),
                ],
            ),
        ],
    )
    return frame(
        prefix,
        name=name,
        x=x,
        y=y,
        layout="horizontal",
        width=1440,
        height=960,
        gap=20,
        padding=24,
        fill="$--background",
        children=[left, right],
    )


def form_field(prefix, label, placeholder):
    return frame(
        prefix,
        layout="vertical",
        width="fill_container",
        height="fit_content",
        gap=8,
        children=[
            text(prefix + "Label", label, fill="$--muted-foreground", font_size=11, font_weight=700),
            frame(
                prefix + "Input",
                layout="horizontal",
                width="fill_container",
                height=48,
                gap=8,
                padding=[0, 16],
                align_items="center",
                fill="$--card",
                stroke=stroke("$--border"),
                corner_radius=18,
                children=[text(prefix + "Placeholder", placeholder, fill="$--muted-foreground", font_size=13)],
            ),
        ],
    )


def component_board(prefix, name, x, y):
    return frame(
        prefix,
        name=name,
        x=x,
        y=y,
        layout="vertical",
        width=1800,
        height="fit_content",
        gap=24,
        padding=40,
        fill="$--background",
        children=[
            text(prefix + "Title", "LDO-2 Component Library", font_size=34, font_weight=700),
            text(
                prefix + "Subtitle",
                "Shared surfaces and controls extracted from the live codebase: shell rail, topbar controls, page headers, stat tiles, filter cards, and workbench tables.",
                fill="$--muted-foreground",
                font_size=15,
                text_growth="fixed-width",
                width=920,
            ),
            frame(
                prefix + "GridA",
                layout="horizontal",
                width="fill_container",
                height="fit_content",
                gap=16,
                children=[
                    frame(
                        prefix + "Shell",
                        name="Component / Shell / Rail Slice",
                        reusable=True,
                        layout="vertical",
                        width=420,
                        height="fit_content",
                        gap=12,
                        padding=20,
                        fill="$--card",
                        stroke=stroke("$--border"),
                        corner_radius=24,
                        children=[
                            text(prefix + "ShellTitle", "Shell", font_size=16, font_weight=700),
                            sidebar(prefix + "ShellSample"),
                        ],
                    ),
                    frame(
                        prefix + "Header",
                        name="Component / Header / Page Header",
                        reusable=True,
                        layout="vertical",
                        width="fill_container",
                        height="fit_content",
                        gap=12,
                        padding=20,
                        fill="$--card",
                        stroke=stroke("$--border"),
                        corner_radius=24,
                        children=[
                            text(prefix + "HeaderTitle", "Page Header", font_size=16, font_weight=700),
                            page_header(prefix + "HeaderSample", "Document Hub", "Manage, search, and track all engineering documents linked to PL records.", action_labels=["Excel", "Bulk Upload", "Ingest Document"]),
                        ],
                    ),
                ],
            ),
            frame(
                prefix + "GridB",
                layout="horizontal",
                width="fill_container",
                height="fit_content",
                gap=16,
                children=[
                    frame(
                        prefix + "Buttons",
                        name="Component / Controls / Buttons",
                        reusable=True,
                        layout="vertical",
                        width=360,
                        height="fit_content",
                        gap=12,
                        padding=20,
                        fill="$--card",
                        stroke=stroke("$--border"),
                        corner_radius=24,
                        children=[
                            text(prefix + "ButtonsTitle", "Buttons & pills", font_size=16, font_weight=700),
                            frame(prefix + "ButtonsRow", layout="horizontal", width="fit_content", height="fit_content", gap=10, children=[
                                pill_button(prefix + "BtnPrimary", "Primary Action"),
                                pill_button(prefix + "BtnSecondary", "Secondary", variant="secondary"),
                                pill(prefix + "Pill", "Workspace orientation"),
                            ]),
                        ],
                    ),
                    frame(
                        prefix + "Badges",
                        name="Component / Feedback / Badges",
                        reusable=True,
                        layout="vertical",
                        width=360,
                        height="fit_content",
                        gap=12,
                        padding=20,
                        fill="$--card",
                        stroke=stroke("$--border"),
                        corner_radius=24,
                        children=[
                            text(prefix + "BadgesTitle", "Status badges", font_size=16, font_weight=700),
                            frame(prefix + "BadgesRow", layout="horizontal", width="fit_content", height="fit_content", gap=10, children=[
                                pill(prefix + "BadgeA", "Approved", fill="$--teal-surface", text_fill="$--primary"),
                                pill(prefix + "BadgeB", "Pending", fill="$--amber-surface", text_fill="$--warning"),
                                pill(prefix + "BadgeC", "Blocked", fill="$--rose-surface", text_fill="$--danger"),
                            ]),
                        ],
                    ),
                    frame(
                        prefix + "Stats",
                        name="Component / Data / Stat Tile",
                        reusable=True,
                        layout="vertical",
                        width="fill_container",
                        height="fit_content",
                        gap=12,
                        padding=20,
                        fill="$--card",
                        stroke=stroke("$--border"),
                        corner_radius=24,
                        children=[
                            text(prefix + "StatsTitle", "Stats & tables", font_size=16, font_weight=700),
                            summary_row(prefix + "StatsRow", [("Total Documents", "1,824", "All records"), ("In Review", "36", "Awaiting sign-off"), ("OCR Exceptions", "5", "Operator attention")]),
                            table_card(prefix + "StatsTable", "Workbench table", "Search current grid...", ["Reference", "Owner", "Status"], [("DOC-10021", "Planning", "Review"), ("DOC-10011", "Engineering", "Approved")]),
                        ],
                    ),
                ],
            ),
        ],
    )


def route_inventory(x, y):
    groups = [
        (
            "Core + Workflow",
            ["/", "/search", "/documents", "/documents/ingest", "/documents/:id", "/documents/:id/preview", "/ledger", "/cases", "/approvals", "/notifications"],
        ),
        (
            "Engineering",
            ["/bom", "/bom/new", "/bom/:productId", "/pl", "/pl/preview/:draftId", "/pl/:id", "/templates"],
        ),
        (
            "Reports + Admin",
            ["/reports", "/reports/:reportId", "/ledger-reports", "/admin", "/admin/initial-run", "/admin/users", "/admin/deduplication", "/ocr", "/audit", "/health", "/settings", "/banners", "/design-system", "/restricted", "*"],
        ),
    ]
    cards = []
    for i, (label, routes) in enumerate(groups):
        cards.append(
            frame(
                f"inventoryCard{i}",
                layout="vertical",
                width="fill_container",
                height="fit_content",
                gap=12,
                padding=18,
                fill="$--card",
                stroke=stroke("$--border"),
                corner_radius=20,
                children=[
                    text(f"inventoryCard{i}Title", label, font_size=16, font_weight=700),
                    text(
                        f"inventoryCard{i}List",
                        "\n".join(routes),
                        fill="$--muted-foreground",
                        font_size=13,
                        text_growth="fixed-width",
                        width="fill_container",
                        line_height=1.35,
                        font_family="IBM Plex Mono",
                    ),
                ],
            )
        )
    return frame(
        "routeInventory",
        name="Page Inventory",
        x=x,
        y=y,
        layout="vertical",
        width=1200,
        height="fit_content",
        gap=20,
        padding=40,
        fill="$--background",
        children=[
            text("routeInventoryTitle", "Page Inventory", font_size=34, font_weight=700),
            text(
                "routeInventorySubtitle",
                "All route-level pages and subpages represented as standalone frames below, rebuilt around the actual LDO-2 light-theme shell and page archetypes.",
                fill="$--muted-foreground",
                font_size=15,
                text_growth="fixed-width",
                width=760,
            ),
            frame("routeInventoryGrid", layout="horizontal", width="fill_container", height="fit_content", gap=16, children=cards),
        ],
    )


children = []

# Template band
children.append(login_page("templateLogin", "Template / Login", 0, 0))
children.append(shell_page("templateDashboard", "Template / Dashboard", 1560, 0, dashboard_body("templateDashboard"), breadcrumb="Home / Dashboard", page_title="Dashboard"))
children.append(shell_page("templateWorkbench", "Template / Workbench", 3120, 0, workbench_body("templateWorkbench", "Document Hub", "Manage, search, and track all engineering documents linked to PL records.", "Document Control Workbench", "Keep release-ready files, OCR exceptions, archive moves, and PL linkage inside one operator surface.", "Bulk actions update live workspace state, queue approvals, and move records into controlled archive or category lanes."), breadcrumb="Home / Document Hub", page_title="Document Hub"))
children.append(shell_page("templateSearch", "Template / Search", 4680, 0, search_body("templateSearch"), breadcrumb="Home / Search Explorer", page_title="Search Explorer"))
children.append(shell_page("templateWorkflow", "Template / Workflow", 0, 1160, workflow_body("templateWorkflow", "Work Ledger", "Record a new work item in the Work Ledger with full audit trail."), breadcrumb="Home / Work Ledger", page_title="Work Ledger"))
children.append(shell_page("templateDetail", "Template / Detail", 1560, 1160, detail_body("templateDetail", "GA-PL-042 Release Package", "DOC-10021 · In Review"), breadcrumb="Home / Document Hub / Detail", page_title="Document Detail"))
children.append(shell_page("templateAnalytics", "Template / Analytics", 3120, 1160, analytics_body("templateAnalytics", "System Health", "Real-time service metrics, performance indicators, and backup status.", ["CPU Usage %", "Memory Usage %", "Disk Usage %"]), breadcrumb="Home / System Health", page_title="System Health"))
children.append(shell_page("templateAdmin", "Template / Admin", 4680, 1160, admin_body("templateAdmin", "Admin & System Health", "OCR Pipeline Monitor, Audit Visibility, and System Diagnostics."), breadcrumb="Home / Administration", page_title="Administration"))
children.append(shell_page("templateViewer", "Template / Viewer", 0, 2320, detail_body("templateViewer", "GA-PL-042 Release Package", "Preview minimized", dark_inner=True), breadcrumb="Home / Document Hub / Preview", page_title="Document Preview"))
children.append(shell_page("templateReview", "Template / Review Preview", 1560, 2320, preview_review_body("templateReview", "PL Record Review Preview", "Review proposed PL metadata changes, inspect the user change log, and save or cancel from this dedicated preview page."), breadcrumb="Home / PL Knowledge Hub / Preview", page_title="PL Review Preview"))
children.append(simple_state_page("templateState", "Template / State", 3120, 2320, "Access Restricted", "You do not have the required permissions to view this page. Contact your administrator if you believe this is an error.", danger=True))
children.append(route_inventory(4680, 2320))
children.append(component_board("componentBoard", "Components / LDO-2 UI", 6400, 0))

# Actual route pages
page_specs = [
    lambda: shell_page("pageDashboard", "Page / Dashboard", 0, 3560, dashboard_body("pageDashboard"), breadcrumb="Home / Dashboard", page_title="Dashboard"),
    lambda: shell_page("pageSearch", "Page / Search Explorer", 1560, 3560, search_body("pageSearch"), breadcrumb="Home / Search Explorer", page_title="Search Explorer"),
    lambda: shell_page("pageDocumentHub", "Page / Document Hub", 3120, 3560, workbench_body("pageDocumentHub", "Document Hub", "Manage, search, and track all engineering documents linked to PL records", "Document Control Workbench", "Keep release-ready files, OCR exceptions, archive moves, and PL linkage inside one operator surface.", "Bulk actions now update live workspace state, queue document approvals, and move records into archive or category lanes without leaving the grid."), breadcrumb="Home / Document Hub", page_title="Document Hub"),
    lambda: login_page("pageLogin", "Page / Login", 4680, 3560),
    lambda: shell_page("pageDocumentIngest", "Page / Document Ingestion", 0, 4720, collection_body("pageDocumentIngest", "Ingest Document", "Upload a document, set metadata, link to a PL record, and optionally trigger OCR."), breadcrumb="Home / Document Hub / Ingest", page_title="Document Ingestion"),
    lambda: shell_page("pageDocumentDetail", "Page / Document Detail", 1560, 4720, detail_body("pageDocumentDetail", "GA-PL-042 Release Package", "DOC-10021 · Rev R17 · In Review"), breadcrumb="Home / Document Hub / GA-PL-042", page_title="Document Detail"),
    lambda: shell_page("pageDocumentPreview", "Page / Document Preview", 3120, 4720, detail_body("pageDocumentPreview", "GA-PL-042 Release Package", "Preview minimized", dark_inner=True), breadcrumb="Home / Document Hub / Preview", page_title="Document Preview"),
    lambda: shell_page("pageBOMExplorer", "Page / BOM Explorer", 4680, 4720, collection_body("pageBOMExplorer", "BOM Explorer", "Select a product to explore its full Bill of Materials hierarchy."), breadcrumb="Home / BOM Explorer", page_title="BOM Explorer"),
    lambda: shell_page("pageBOMCreate", "Page / BOM Create", 0, 5880, collection_body("pageBOMCreate", "Create New BOM", "Start with a product name and one root PL, then build the hierarchy from there."), breadcrumb="Home / BOM Explorer / New BOM", page_title="Create BOM"),
    lambda: shell_page("pageBOMProduct", "Page / BOM Product View", 1560, 5880, detail_body("pageBOMProduct", "Pump Assembly", "PL Identity"), breadcrumb="Home / BOM Explorer / Product", page_title="BOM Product View"),
    lambda: shell_page("pagePLHub", "Page / PL Knowledge Hub", 3120, 5880, collection_body("pagePLHub", "PL Knowledge Hub", "Search documents by ID, name, category, and linked PL context while maintaining operator flow."), breadcrumb="Home / PL Knowledge Hub", page_title="PL Knowledge Hub"),
    lambda: shell_page("pagePLDetail", "Page / PL Detail", 4680, 5880, detail_body("pagePLDetail", "PL-2042 · Pump Assembly", "Controlled PL record"), breadcrumb="Home / PL Knowledge Hub / PL-2042", page_title="PL Detail"),
    lambda: shell_page("pagePLPreview", "Page / PL Preview", 0, 7040, preview_review_body("pagePLPreview", "PL Record Review Preview", "Review proposed PL metadata changes, inspect the user change log, and save or cancel from this dedicated PL preview page."), breadcrumb="Home / PL Knowledge Hub / Review Preview", page_title="PL Review Preview"),
    lambda: shell_page("pageWorkLedger", "Page / Work Ledger", 1560, 7040, workflow_body("pageWorkLedger", "Work Ledger", "Record a new work item in the Work Ledger with full audit trail."), breadcrumb="Home / Work Ledger", page_title="Work Ledger"),
    lambda: shell_page("pageLedgerReports", "Page / Ledger Reports", 3120, 7040, analytics_body("pageLedgerReports", "Work Ledger Reports", "Analytics and operational reporting for work records.", ["Record Types", "Timeliness", "Closure Trend"]), breadcrumb="Home / Ledger Reports", page_title="Ledger Reports"),
    lambda: shell_page("pageCases", "Page / Cases", 4680, 7040, detail_body("pageCases", "CASE-481 · Drawing mismatch", "Investigation updated 17 Apr 2026"), breadcrumb="Home / Cases / CASE-481", page_title="Cases"),
    lambda: shell_page("pageApprovals", "Page / Approvals", 0, 8200, workflow_body("pageApprovals", "Approvals", "Review and action pending approval requests."), breadcrumb="Home / Approvals", page_title="Approvals"),
    lambda: shell_page("pageNotifications", "Page / Notifications", 1560, 8200, admin_body("pageNotifications", "Notifications & Decision Inbox", "Review alerts, jump to the affected record, and close the items that still require an action."), breadcrumb="Home / Notifications", page_title="Notifications"),
    lambda: shell_page("pageReports", "Page / Reports", 3120, 8200, analytics_body("pageReports", "Reports", "Operational summaries, analytics, and exportable reports.", ["Document Status Distribution", "Work Records by Type", "Export Readiness"]), breadcrumb="Home / Reports", page_title="Reports"),
    lambda: shell_page("pageReportTable", "Page / Report Table", 4680, 8200, collection_body("pageReportTable", "Report Table", "Live report output with export controls and filter context."), breadcrumb="Home / Reports / Live Table", page_title="Report Table"),
    lambda: shell_page("pageAlertRules", "Page / Alert Rules", 0, 9360, collection_body("pageAlertRules", "Alert Rules", "Define conditions that trigger notifications to team members."), breadcrumb="Home / Alert Rules", page_title="Alert Rules"),
    lambda: shell_page("pageTemplates", "Page / Document Templates", 1560, 9360, collection_body("pageTemplates", "Document Templates", "Start a document from a reusable template, then continue into ingest with the captured context."), breadcrumb="Home / Document Templates", page_title="Doc Templates"),
    lambda: shell_page("pageAdmin", "Page / Admin Workspace", 3120, 9360, admin_body("pageAdmin", "Admin & System Health", "OCR Pipeline Monitor, Audit Visibility, and System Diagnostics."), breadcrumb="Home / Administration", page_title="Administration"),
    lambda: shell_page("pageAdminInitialRun", "Page / Admin Initial Run", 4680, 9360, admin_body("pageAdminInitialRun", "Initial Production Run", "Loading source inventory and backlog state."), breadcrumb="Home / Admin / Initial Run", page_title="Initial Run"),
    lambda: shell_page("pageUsers", "Page / User Management", 0, 10520, collection_body("pageUsers", "User Administration", "Create, update, and retire user accounts for the EDMS workspace without leaving the admin shell."), breadcrumb="Home / Admin / Users", page_title="Users"),
    lambda: shell_page("pageDedupe", "Page / Deduplication Console", 1560, 10520, admin_body("pageDedupe", "Document Deduplication Console", "Identify and resolve duplicate documents across the repository using metadata and content fingerprints."), breadcrumb="Home / Admin / Deduplication", page_title="Deduplication"),
    lambda: shell_page("pageOCR", "Page / OCR Monitor", 3120, 10520, collection_body("pageOCR", "OCR Monitor", "Pipeline monitoring, job tracking, and extraction oversight."), breadcrumb="Home / OCR Monitor", page_title="OCR Monitor"),
    lambda: shell_page("pageAudit", "Page / Audit Log", 4680, 10520, admin_body("pageAudit", "Audit Log", "System-wide event traceability and investigation workspace."), breadcrumb="Home / Audit Log", page_title="Audit Log"),
    lambda: shell_page("pageHealth", "Page / System Health", 0, 11680, analytics_body("pageHealth", "System Health", "Real-time service metrics, performance indicators, and backup status.", ["CPU Usage %", "Memory Usage %", "Disk Usage %"]), breadcrumb="Home / System Health", page_title="System Health"),
    lambda: shell_page("pageSettings", "Page / Settings", 1560, 11680, collection_body("pageSettings", "Settings", "System configuration and workspace preferences."), breadcrumb="Home / Settings", page_title="Settings"),
    lambda: shell_page("pageBanners", "Page / Banner Management", 3120, 11680, collection_body("pageBanners", "Announcement Management", "Create and manage running banner announcements visible to all users."), breadcrumb="Home / Banners", page_title="Banners"),
    lambda: shell_page("pageProfile", "Page / Profile", 4680, 11680, detail_body("pageProfile", "Profile & Personal Settings", "Maintain your operator identity and workspace behavior."), breadcrumb="Home / Profile", page_title="Profile"),
    lambda: simple_state_page("pageRestricted", "Page / Restricted Access", 0, 12840, "Access Restricted", "You do not have the required permissions to view this page. Contact your system administrator if you believe this is an error.", danger=True),
    lambda: simple_state_page("pageNotFound", "Page / Not Found", 1320, 12840, "Page Not Found", "The page you're looking for doesn't exist or you don't have permission to access it.", danger=False),
    lambda: component_board("pageDesignSystem", "Page / Design System", 2640, 12840),
]

for make_page in page_specs:
    children.append(make_page())

doc = {"version": "2.11", "variables": VARS, "children": children}

OUT.write_text(json.dumps(doc, indent=2), encoding="utf-8")
print(OUT)
print(f"children={len(children)}")
