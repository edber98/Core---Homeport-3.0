#!/usr/bin/env python3
"""Create a .pptx presentation from a JSON spec.

Spec format (stdin):
{
  "title": "Deck",
  "author": "...",
  "slides": [
    {
      "layout": "title" | "content" | "two_content" | "title_only" | "blank" | "section",
      "title": "Slide title",
      "subtitle": "optional (for title layout)",
      "body": [ {"text": "Bullet 1", "level": 0}, {"text": "Sub-bullet", "level": 1} ],
      "body2": [ ... ] // for two_content layout (right column)
      "notes": "Speaker notes",
      "images": [ {"path": "logo.png", "position": {"x": 1, "y": 1, "w": 3, "h": 2}} ],
      "tables": [ {"headers": [...], "rows": [[...]], "position": {"x":1,"y":2,"w":8,"h":3}} ]
    }
  ]
}
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from _common import (  # noqa: E402
    read_spec, die, build_out_path, emit_relative, check_size, resolve_optional_input,
)

try:
    from pptx import Presentation
    from pptx.util import Inches, Pt
    from pptx.enum.shapes import MSO_SHAPE
except ImportError as e:
    die(f"python-pptx not installed: {e}")


# Default built-in layout indexes for a fresh `Presentation()` (follows standard template)
LAYOUT_MAP = {
    "title": 0,         # Title Slide
    "content": 1,       # Title and Content
    "section": 2,       # Section Header
    "two_content": 3,   # Two Content
    "comparison": 4,    # Comparison
    "title_only": 5,    # Title Only
    "blank": 6,         # Blank
    "content_caption": 7,
    "picture_caption": 8,
}


def pick_layout(prs, key):
    idx = LAYOUT_MAP.get(key, 1)
    if idx >= len(prs.slide_layouts):
        idx = min(1, len(prs.slide_layouts) - 1)
    return prs.slide_layouts[idx]


def set_title(slide, text):
    if not text:
        return
    if slide.shapes.title is None:
        return
    slide.shapes.title.text = str(text)


def set_body(slide, body, placeholder_idx=1):
    if not body:
        return
    # Find a content placeholder (idx parameter)
    target = None
    for ph in slide.placeholders:
        if ph.placeholder_format.idx == placeholder_idx:
            target = ph
            break
    if target is None:
        # fallback: first non-title placeholder
        for ph in slide.placeholders:
            if ph.placeholder_format.idx != 0:
                target = ph
                break
    if target is None:
        return

    tf = target.text_frame
    tf.clear()

    for i, item in enumerate(body):
        if isinstance(item, str):
            text = item
            level = 0
        elif isinstance(item, dict):
            text = str(item.get("text", ""))
            level = int(item.get("level", 0) or 0)
        else:
            continue

        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.text = text
        if level:
            p.level = max(0, min(8, level))


def set_subtitle(slide, text):
    if not text:
        return
    # subtitle placeholder idx=1 on title slides
    for ph in slide.placeholders:
        if ph.placeholder_format.idx == 1:
            ph.text = str(text)
            return


def set_notes(slide, text):
    if not text:
        return
    try:
        notes_tf = slide.notes_slide.notes_text_frame
        notes_tf.text = str(text)
    except Exception:  # noqa: BLE001
        pass


def add_image(slide, img):
    path = resolve_optional_input(img.get("path"))
    if not path:
        return
    pos = img.get("position") or {}
    x = Inches(float(pos.get("x", 1)))
    y = Inches(float(pos.get("y", 1)))
    kwargs = {}
    if pos.get("w"):
        kwargs["width"] = Inches(float(pos["w"]))
    if pos.get("h"):
        kwargs["height"] = Inches(float(pos["h"]))
    try:
        slide.shapes.add_picture(path, x, y, **kwargs)
    except Exception as e:  # noqa: BLE001
        print(f"warning: failed to add image {path}: {e}", file=sys.stderr)


def add_table(slide, t):
    rows = t.get("rows") or []
    headers = t.get("headers") or []
    if not rows and not headers:
        return
    col_count = len(headers) if headers else (len(rows[0]) if rows else 0)
    if col_count == 0:
        return
    total_rows = (1 if headers else 0) + len(rows)

    pos = t.get("position") or {}
    x = Inches(float(pos.get("x", 0.5)))
    y = Inches(float(pos.get("y", 1.5)))
    w = Inches(float(pos.get("w", 9)))
    h = Inches(float(pos.get("h", 0.5 * total_rows + 0.5)))

    table_shape = slide.shapes.add_table(total_rows, col_count, x, y, w, h)
    table = table_shape.table

    row_idx = 0
    if headers:
        for i, val in enumerate(headers[:col_count]):
            cell = table.cell(0, i)
            cell.text = str(val)
            for para in cell.text_frame.paragraphs:
                for run in para.runs:
                    run.font.bold = True
                    run.font.size = Pt(12)
        row_idx = 1

    for r_i, row in enumerate(rows):
        for c_i in range(col_count):
            val = row[c_i] if c_i < len(row) else ""
            table.cell(row_idx + r_i, c_i).text = "" if val is None else str(val)


def main():
    spec = read_spec()
    if not isinstance(spec, dict):
        die("spec_must_be_object")

    title = spec.get("title") or "presentation"
    slides_spec = spec.get("slides") or []
    if not isinstance(slides_spec, list):
        die("slides_must_be_array")

    prs = Presentation()

    # Metadata
    try:
        prs.core_properties.title = str(title)
        if spec.get("author"):
            prs.core_properties.author = str(spec["author"])
    except Exception:  # noqa: BLE001
        pass

    # If no slides provided, add a single title slide
    if not slides_spec:
        slide = prs.slides.add_slide(pick_layout(prs, "title"))
        set_title(slide, title)
    else:
        for s in slides_spec:
            if not isinstance(s, dict):
                continue
            layout_key = s.get("layout") or "content"
            layout = pick_layout(prs, layout_key)
            slide = prs.slides.add_slide(layout)

            set_title(slide, s.get("title"))

            if layout_key == "title":
                set_subtitle(slide, s.get("subtitle"))
            else:
                set_body(slide, s.get("body"))
                if layout_key in ("two_content", "comparison"):
                    set_body(slide, s.get("body2"), placeholder_idx=2)

            for img in (s.get("images") or []):
                if isinstance(img, dict):
                    add_image(slide, img)
            for t in (s.get("tables") or []):
                if isinstance(t, dict):
                    add_table(slide, t)

            set_notes(slide, s.get("notes"))

    out_path = build_out_path(title, "pptx")
    try:
        prs.save(out_path)
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
