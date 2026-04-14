#!/usr/bin/env python3
"""Create a PDF document from a JSON spec using reportlab.

Spec (stdin):
{
  "title": "My Report",
  "author": "Homeport",
  "pageSize": "A4" | "LETTER",
  "margins": {"top": 20, "bottom": 20, "left": 20, "right": 20},  # mm
  "blocks": [
    {"type": "heading", "level": 1|2|3, "text": "..."},
    {"type": "paragraph", "text": "..."},
    {"type": "spacer", "height": 12},  # points
    {"type": "table", "headers": [...], "rows": [[...]]},
    {"type": "image", "path": "logo.png", "widthInches": 2.0},
    {"type": "pageBreak"}
  ]
}
Output: /workspace/out/<slug>.pdf
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from _common import (  # noqa: E402
    read_spec, die, build_out_path, emit_relative, check_size, resolve_optional_input,
)

try:
    from reportlab.lib.pagesizes import A4, LETTER
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm, inch
    from reportlab.lib import colors
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
        Image as RLImage, PageBreak,
    )
except ImportError as e:
    die(f"reportlab not installed: {e}")


PAGE_SIZES = {"A4": A4, "LETTER": LETTER}


def _heading_style(base_styles, level):
    key = {1: "Heading1", 2: "Heading2", 3: "Heading3"}.get(int(level or 1), "Heading1")
    return base_styles[key]


def _build_flowables(blocks, styles):
    flowables = []
    for block in blocks or []:
        if not isinstance(block, dict):
            continue
        btype = (block.get("type") or "").lower()
        if btype == "heading":
            text = str(block.get("text") or "")
            level = block.get("level") or 1
            flowables.append(Paragraph(text, _heading_style(styles, level)))
            flowables.append(Spacer(1, 6))
        elif btype == "paragraph":
            text = str(block.get("text") or "")
            flowables.append(Paragraph(text, styles["BodyText"]))
            flowables.append(Spacer(1, 4))
        elif btype == "spacer":
            h = float(block.get("height") or 12)
            flowables.append(Spacer(1, h))
        elif btype == "table":
            headers = block.get("headers") or []
            rows = block.get("rows") or []
            if not isinstance(headers, list) or not isinstance(rows, list):
                die("invalid_table: headers and rows must be lists")
            data = [list(map(str, headers))] + [list(map(str, r)) for r in rows]
            tbl = Table(data, repeatRows=1)
            tbl.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4472C4")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
                ("TOPPADDING", (0, 0), (-1, 0), 6),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F2F2F2")]),
            ]))
            flowables.append(tbl)
            flowables.append(Spacer(1, 8))
        elif btype == "image":
            p = resolve_optional_input(block.get("path"))
            if not p:
                die(f"source_not_found:{block.get('path')}")
            width = float(block.get("widthInches") or 3) * inch
            try:
                flowables.append(RLImage(p, width=width, height=width, kind="proportional"))
            except Exception as e:  # noqa: BLE001
                die(f"image_failed: {e}")
            flowables.append(Spacer(1, 6))
        elif btype == "pageBreak":
            flowables.append(PageBreak())
        else:
            # unknown block type → skip silently
            continue
    return flowables


def main():
    spec = read_spec()
    if not isinstance(spec, dict):
        die("spec_must_be_object")
    title = spec.get("title") or "document"
    author = spec.get("author") or "Homeport"
    size_key = str(spec.get("pageSize") or "A4").upper()
    page_size = PAGE_SIZES.get(size_key, A4)
    m = spec.get("margins") or {}
    left = float(m.get("left", 20)) * mm
    right = float(m.get("right", 20)) * mm
    top = float(m.get("top", 20)) * mm
    bottom = float(m.get("bottom", 20)) * mm

    out_path = build_out_path(title, "pdf")
    doc = SimpleDocTemplate(
        out_path,
        pagesize=page_size,
        leftMargin=left, rightMargin=right,
        topMargin=top, bottomMargin=bottom,
        title=str(title), author=str(author),
    )
    styles = getSampleStyleSheet()
    flowables = _build_flowables(spec.get("blocks") or [], styles)
    if not flowables:
        # empty doc: at least produce title paragraph
        flowables = [Paragraph(str(title), styles["Title"])]
    try:
        doc.build(flowables)
    except Exception as e:  # noqa: BLE001
        die(f"save_failed: {e}")
    check_size(out_path)
    emit_relative(out_path)


if __name__ == "__main__":
    main()
