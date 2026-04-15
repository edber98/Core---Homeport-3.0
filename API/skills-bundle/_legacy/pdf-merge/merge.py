#!/usr/bin/env python3
"""Merge / split / rotate PDF files using pypdf.

Actions (stdin):
  merge:   { "action": "merge", "sources": ["a.pdf", "b.pdf"], "outputName": "out" }
  extract: { "action": "extract", "source": "a.pdf", "pages": [1, 2, "5-8"], "outputName": "out" }
  rotate:  { "action": "rotate", "source": "a.pdf",
             "rotations": [{"page": 1, "degrees": 90}], "outputName": "out" }
Output: /workspace/out/<slug>.pdf
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from _common import (  # noqa: E402
    read_spec, die, build_out_path, emit_relative, check_size, resolve_input,
)

try:
    from pypdf import PdfReader, PdfWriter
except ImportError as e:
    die(f"pypdf not installed: {e}")


def _parse_pages(spec_pages, total):
    """Return zero-based page indexes (list of ints). Accepts ints and 'a-b' strings (1-based)."""
    if not isinstance(spec_pages, list) or not spec_pages:
        die("pages_required")
    out = []
    for it in spec_pages:
        if isinstance(it, int):
            idx = it - 1
            if idx < 0 or idx >= total:
                die(f"invalid_page_range: {it}")
            out.append(idx)
        elif isinstance(it, str):
            parts = it.split("-")
            if len(parts) != 2:
                die(f"invalid_page_range: {it}")
            try:
                a = int(parts[0])
                b = int(parts[1])
            except ValueError:
                die(f"invalid_page_range: {it}")
            if a < 1 or b < a or b > total:
                die(f"invalid_page_range: {it}")
            out.extend(range(a - 1, b))
        else:
            die(f"invalid_page_range: {it}")
    return out


def _merge(sources, output_path):
    if not isinstance(sources, list) or len(sources) < 2:
        die("merge_requires_at_least_two_sources")
    writer = PdfWriter()
    for name in sources:
        path = resolve_input(name)
        try:
            reader = PdfReader(path)
        except Exception as e:  # noqa: BLE001
            die(f"read_failed:{name}:{e}")
        for page in reader.pages:
            writer.add_page(page)
    with open(output_path, "wb") as f:
        writer.write(f)


def _extract(source, pages, output_path):
    path = resolve_input(source)
    try:
        reader = PdfReader(path)
    except Exception as e:  # noqa: BLE001
        die(f"read_failed:{source}:{e}")
    indexes = _parse_pages(pages, len(reader.pages))
    writer = PdfWriter()
    for idx in indexes:
        writer.add_page(reader.pages[idx])
    with open(output_path, "wb") as f:
        writer.write(f)


def _rotate(source, rotations, output_path):
    path = resolve_input(source)
    try:
        reader = PdfReader(path)
    except Exception as e:  # noqa: BLE001
        die(f"read_failed:{source}:{e}")
    if not isinstance(rotations, list):
        die("rotations_required")
    rot_map = {}
    for r in rotations:
        if not isinstance(r, dict):
            continue
        page_num = r.get("page")
        degrees = r.get("degrees")
        if not isinstance(page_num, int) or not isinstance(degrees, int):
            die("invalid_rotation")
        if degrees % 90 != 0:
            die(f"invalid_rotation_degrees:{degrees}")
        rot_map[page_num - 1] = degrees
    writer = PdfWriter()
    for i, page in enumerate(reader.pages):
        if i in rot_map:
            page.rotate(rot_map[i])
        writer.add_page(page)
    with open(output_path, "wb") as f:
        writer.write(f)


def main():
    spec = read_spec()
    if not isinstance(spec, dict):
        die("spec_must_be_object")
    action = (spec.get("action") or "").lower()
    out_name = spec.get("outputName") or "result"
    out_path = build_out_path(out_name, "pdf")
    try:
        if action == "merge":
            _merge(spec.get("sources") or [], out_path)
        elif action == "extract":
            _extract(spec.get("source"), spec.get("pages"), out_path)
        elif action == "rotate":
            _rotate(spec.get("source"), spec.get("rotations"), out_path)
        else:
            die(f"invalid_action:{action}")
    except SystemExit:
        raise
    except Exception as e:  # noqa: BLE001
        die(f"save_failed: {e}")
    check_size(out_path)
    emit_relative(out_path)


if __name__ == "__main__":
    main()
