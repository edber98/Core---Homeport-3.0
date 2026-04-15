#!/usr/bin/env python3
"""Extract text and tables from a PDF using pdfplumber (fallback pypdf).

Spec (stdin):
{
  "source": "rapport.pdf",
  "pages": [1, 2, "5-8"],          # optional: all pages if absent
  "includeTables": true,            # optional
  "outputName": "out"
}
Output JSON written to /workspace/out/<slug>.json
"""
import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from _common import (  # noqa: E402
    read_spec, die, build_out_path, emit_relative, check_size, resolve_input,
)


def _parse_pages(spec_pages, total):
    if spec_pages is None:
        return list(range(total))
    if not isinstance(spec_pages, list):
        die("pages_must_be_list")
    out = []
    for it in spec_pages:
        if isinstance(it, int):
            idx = it - 1
            if 0 <= idx < total:
                out.append(idx)
        elif isinstance(it, str):
            parts = it.split("-")
            if len(parts) != 2:
                die(f"invalid_page_range:{it}")
            try:
                a, b = int(parts[0]), int(parts[1])
            except ValueError:
                die(f"invalid_page_range:{it}")
            for i in range(a - 1, b):
                if 0 <= i < total:
                    out.append(i)
    return out


def main():
    spec = read_spec()
    if not isinstance(spec, dict):
        die("spec_must_be_object")
    src = spec.get("source")
    if not src:
        die("source_required")
    src_path = resolve_input(src)
    out_name = spec.get("outputName") or "extract"
    include_tables = bool(spec.get("includeTables"))

    result = {"metadata": {}, "pages": []}

    try:
        import pdfplumber  # type: ignore
    except ImportError:
        pdfplumber = None

    # Metadata + text via pypdf (lighter, always installed)
    try:
        from pypdf import PdfReader
        reader = PdfReader(src_path)
        info = reader.metadata or {}
        result["metadata"] = {
            "title": str(info.get("/Title") or "") or None,
            "author": str(info.get("/Author") or "") or None,
            "pages": len(reader.pages),
        }
    except Exception as e:  # noqa: BLE001
        die(f"read_failed:{e}")

    total = result["metadata"]["pages"]
    page_idxs = _parse_pages(spec.get("pages"), total)

    if pdfplumber is not None:
        try:
            with pdfplumber.open(src_path) as pdf:
                for i in page_idxs:
                    p = pdf.pages[i]
                    page_data = {"index": i + 1, "text": p.extract_text() or ""}
                    if include_tables:
                        try:
                            tables = p.extract_tables() or []
                            if tables:
                                page_data["tables"] = tables
                        except Exception:  # noqa: BLE001
                            pass
                    result["pages"].append(page_data)
        except Exception as e:  # noqa: BLE001
            die(f"pdfplumber_failed:{e}")
    else:
        # Fallback to pypdf text extraction (no tables)
        for i in page_idxs:
            try:
                txt = reader.pages[i].extract_text() or ""
            except Exception:  # noqa: BLE001
                txt = ""
            result["pages"].append({"index": i + 1, "text": txt})

    out_path = build_out_path(out_name, "json")
    try:
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
    except Exception as e:  # noqa: BLE001
        die(f"save_failed:{e}")
    check_size(out_path)
    emit_relative(out_path)


if __name__ == "__main__":
    main()
