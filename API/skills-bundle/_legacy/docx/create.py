#!/usr/bin/env python3
"""Create a .docx document from a JSON spec.

Spec format (read from stdin):
{
  "title": "My Document",
  "author": "Optional author",
  "margins": {"top": 1, "bottom": 1, "left": 1, "right": 1},  // inches
  "paragraphs": [
    {"text": "Hello", "style": "Normal", "bold": false, "italic": false, "align": "left"}
  ],
  "headings": [ {"level": 1, "text": "Intro"} ],
  "tables": [ {"headers": ["A", "B"], "rows": [["1", "2"]]} ],
  "images": [ {"path": "logo.png", "widthInches": 2} ],
  "pageBreak": false
}

Output: /workspace/out/<slug>.docx
"""
import os
import sys

# allow importing sibling _common.py whatever cwd is used
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from _common import (  # noqa: E402
    read_spec, die, build_out_path, emit_relative, check_size, resolve_optional_input,
)

try:
    from docx import Document
    from docx.shared import Inches, Pt
    from docx.enum.text import WD_ALIGN_PARAGRAPH
except ImportError as e:
    die(f"python-docx not installed: {e}")


ALIGN_MAP = {
    "left": WD_ALIGN_PARAGRAPH.LEFT,
    "center": WD_ALIGN_PARAGRAPH.CENTER,
    "right": WD_ALIGN_PARAGRAPH.RIGHT,
    "justify": WD_ALIGN_PARAGRAPH.JUSTIFY,
}


def apply_margins(doc, margins):
    if not isinstance(margins, dict):
        return
    for section in doc.sections:
        if "top" in margins:
            section.top_margin = Inches(float(margins["top"]))
        if "bottom" in margins:
            section.bottom_margin = Inches(float(margins["bottom"]))
        if "left" in margins:
            section.left_margin = Inches(float(margins["left"]))
        if "right" in margins:
            section.right_margin = Inches(float(margins["right"]))


def add_paragraph(doc, p):
    text = p.get("text", "")
    style = p.get("style")
    align = p.get("align")

    # If style is "Heading 1..9" or "Title" use add_heading/paragraph with style.
    try:
        if style and style != "Normal":
            para = doc.add_paragraph(style=style)
        else:
            para = doc.add_paragraph()
    except KeyError:
        # Unknown style → fallback to Normal
        para = doc.add_paragraph()

    run = para.add_run(text)
    if p.get("bold"):
        run.bold = True
    if p.get("italic"):
        run.italic = True
    if p.get("underline"):
        run.underline = True
    if p.get("fontSize"):
        try:
            run.font.size = Pt(float(p["fontSize"]))
        except (TypeError, ValueError):
            pass
    if align and align in ALIGN_MAP:
        para.alignment = ALIGN_MAP[align]


def add_heading(doc, h):
    level = int(h.get("level", 1) or 1)
    if level < 0:
        level = 0
    if level > 9:
        level = 9
    text = str(h.get("text", ""))
    doc.add_heading(text, level=level)


def add_table(doc, t):
    rows = t.get("rows") or []
    headers = t.get("headers") or []
    if not rows and not headers:
        return

    col_count = len(headers) if headers else (len(rows[0]) if rows else 0)
    if col_count == 0:
        return

    total_rows = (1 if headers else 0) + len(rows)
    table = doc.add_table(rows=total_rows, cols=col_count)
    try:
        table.style = t.get("style") or "Light Grid Accent 1"
    except KeyError:
        pass

    row_idx = 0
    if headers:
        hdr = table.rows[0].cells
        for i, h in enumerate(headers[:col_count]):
            hdr[i].text = str(h)
            # bold headers
            for para in hdr[i].paragraphs:
                for r in para.runs:
                    r.bold = True
        row_idx = 1

    for r_i, row in enumerate(rows):
        cells = table.rows[row_idx + r_i].cells
        for c_i in range(col_count):
            val = row[c_i] if c_i < len(row) else ""
            cells[c_i].text = "" if val is None else str(val)


def add_image(doc, img):
    path = resolve_optional_input(img.get("path"))
    if not path:
        return
    kwargs = {}
    if img.get("widthInches"):
        try:
            kwargs["width"] = Inches(float(img["widthInches"]))
        except (TypeError, ValueError):
            pass
    try:
        doc.add_picture(path, **kwargs)
    except Exception as e:  # noqa: BLE001
        # don't abort entire build on a single image failure
        print(f"warning: failed to add image {path}: {e}", file=sys.stderr)


def main():
    spec = read_spec()
    if not isinstance(spec, dict):
        die("spec_must_be_object")

    title = spec.get("title") or "document"

    doc = Document()

    # Core metadata
    try:
        core = doc.core_properties
        core.title = str(title)
        if spec.get("author"):
            core.author = str(spec["author"])
    except Exception:  # noqa: BLE001
        pass

    apply_margins(doc, spec.get("margins"))

    # Optional top title heading
    if spec.get("renderTitleHeading", True) and title:
        try:
            doc.add_heading(str(title), level=0)
        except Exception:  # noqa: BLE001
            doc.add_paragraph(str(title))

    # Render blocks in declarative order if provided
    blocks = spec.get("blocks")
    if isinstance(blocks, list) and blocks:
        for b in blocks:
            if not isinstance(b, dict):
                continue
            btype = b.get("type")
            if btype == "paragraph":
                add_paragraph(doc, b)
            elif btype == "heading":
                add_heading(doc, b)
            elif btype == "table":
                add_table(doc, b)
            elif btype == "image":
                add_image(doc, b)
            elif btype == "pageBreak":
                doc.add_page_break()
    else:
        # Legacy fields
        for h in spec.get("headings") or []:
            if isinstance(h, dict):
                add_heading(doc, h)
        for p in spec.get("paragraphs") or []:
            if isinstance(p, dict):
                add_paragraph(doc, p)
            elif isinstance(p, str):
                add_paragraph(doc, {"text": p})
        for t in spec.get("tables") or []:
            if isinstance(t, dict):
                add_table(doc, t)
        for img in spec.get("images") or []:
            if isinstance(img, dict):
                add_image(doc, img)
        if spec.get("pageBreak"):
            doc.add_page_break()

    out_path = build_out_path(title, "docx")
    try:
        doc.save(out_path)
    except Exception as e:  # noqa: BLE001
        die(f"save_failed: {e}")

    check_size(out_path)
    emit_relative(out_path)


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as e:  # noqa: BLE001
        die(f"unhandled_error: {e}")
