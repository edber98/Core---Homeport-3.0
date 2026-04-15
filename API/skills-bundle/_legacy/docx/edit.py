#!/usr/bin/env python3
"""Edit an existing .docx document.

Spec format (stdin):
{
  "sourceFileName": "original.docx",
  "outputTitle": "edited" (optional),
  "edits": [
    {"action": "replace_text", "query": "foo", "value": "bar"},
    {"action": "append_paragraph", "value": "New line", "style": "Normal"},
    {"action": "insert_after", "query": "Introduction", "value": "Added paragraph"},
    {"action": "set_heading", "query": "Old heading", "value": "New heading", "level": 1}
  ]
}

Output: /workspace/out/<slug>.docx
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from _common import (  # noqa: E402
    read_spec, die, build_out_path, emit_relative, check_size, resolve_input,
)

try:
    from docx import Document
    from docx.oxml.ns import qn
    from copy import deepcopy
except ImportError as e:
    die(f"python-docx not installed: {e}")


def replace_text_everywhere(doc, query, value):
    if not query:
        return 0
    count = 0
    # Paragraphs
    for para in doc.paragraphs:
        count += _replace_in_paragraph(para, query, value)
    # Tables
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for para in cell.paragraphs:
                    count += _replace_in_paragraph(para, query, value)
    return count


def _replace_in_paragraph(para, query, value):
    # Simpler approach: if query in full text, rewrite by reassembling runs.
    full = "".join(run.text or "" for run in para.runs)
    if query not in full:
        return 0
    new_full = full.replace(query, value)
    if not para.runs:
        para.add_run(new_full)
        return 1
    # Put all text in first run, clear others
    para.runs[0].text = new_full
    for r in para.runs[1:]:
        r.text = ""
    return 1


def append_paragraph(doc, value, style=None):
    try:
        if style and style != "Normal":
            doc.add_paragraph(str(value), style=style)
        else:
            doc.add_paragraph(str(value))
    except KeyError:
        doc.add_paragraph(str(value))


def insert_after(doc, query, value, style=None):
    """Insert a new paragraph after the first paragraph containing <query>."""
    if not query:
        return 0
    for idx, para in enumerate(doc.paragraphs):
        if query in (para.text or ""):
            # Append at end then rearrange: we use XML-level insertion.
            new_p = doc.add_paragraph(str(value), style=style) if style else doc.add_paragraph(str(value))
            # Move last element to right after <para>
            body = para._element.getparent()
            body.remove(new_p._element)
            para._element.addnext(new_p._element)
            return 1
    return 0


def set_heading(doc, query, value, level=1):
    for para in doc.paragraphs:
        if query and query in (para.text or ""):
            # Clear runs and rebuild as heading
            for run in para.runs:
                run.text = ""
            if para.runs:
                para.runs[0].text = str(value)
            else:
                para.add_run(str(value))
            try:
                para.style = f"Heading {int(level)}"
            except (KeyError, ValueError):
                pass
            return 1
    return 0


ACTIONS = {
    "replace_text": lambda doc, e: replace_text_everywhere(doc, e.get("query", ""), str(e.get("value", ""))),
    "append_paragraph": lambda doc, e: append_paragraph(doc, e.get("value", ""), e.get("style")) or 1,
    "insert_after": lambda doc, e: insert_after(doc, e.get("query", ""), e.get("value", ""), e.get("style")),
    "set_heading": lambda doc, e: set_heading(doc, e.get("query", ""), e.get("value", ""), e.get("level", 1)),
}


def main():
    spec = read_spec()
    if not isinstance(spec, dict):
        die("spec_must_be_object")

    src_name = spec.get("sourceFileName")
    src_path = resolve_input(src_name)

    try:
        doc = Document(src_path)
    except Exception as e:  # noqa: BLE001
        die(f"open_failed: {e}")

    edits = spec.get("edits") or []
    if not isinstance(edits, list):
        die("edits_must_be_array")

    for idx, edit in enumerate(edits):
        if not isinstance(edit, dict):
            continue
        action = edit.get("action")
        fn = ACTIONS.get(action)
        if not fn:
            die(f"unknown_action: {action} (at index {idx})")
        try:
            fn(doc, edit)
        except Exception as e:  # noqa: BLE001
            die(f"edit_failed[{idx}]: {e}")

    title = spec.get("outputTitle") or os.path.splitext(os.path.basename(src_name))[0] + "-edited"
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
