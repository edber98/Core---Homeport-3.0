"""Common helpers for Homeport skill scripts.

Convention: scripts read JSON spec from stdin, write file to /workspace/out/<slug>.<ext>,
and print the relative output path (e.g. "out/my-doc.docx") on stdout.
Errors are printed on stderr with sys.exit(1).
"""
import json
import os
import re
import sys
import unicodedata

WORKSPACE_ROOT = os.environ.get("HOMEPORT_WORKSPACE", "/workspace")
IN_DIR = os.path.join(WORKSPACE_ROOT, "in")
OUT_DIR = os.path.join(WORKSPACE_ROOT, "out")
MAX_OUTPUT_BYTES = 50 * 1024 * 1024  # 50 MB


def read_spec():
    """Read JSON spec from stdin."""
    try:
        raw = sys.stdin.read()
        if not raw or not raw.strip():
            die("empty_stdin: expected a JSON spec on stdin")
        return json.loads(raw)
    except json.JSONDecodeError as e:
        die(f"invalid_json: {e}")


def die(msg, code=1):
    print(msg, file=sys.stderr)
    sys.exit(code)


def slugify(text, fallback="document"):
    """Convert a title to a safe file-name slug."""
    if not text:
        return fallback
    # Strip accents
    text = unicodedata.normalize("NFKD", str(text))
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = text.strip("-")
    return text or fallback


def ensure_out_dir():
    os.makedirs(OUT_DIR, exist_ok=True)
    return OUT_DIR


def build_out_path(title, ext, fallback="document"):
    ensure_out_dir()
    slug = slugify(title, fallback=fallback)
    return os.path.join(OUT_DIR, f"{slug}.{ext}")


def emit_relative(abs_path):
    """Print the relative path to stdout."""
    rel = os.path.relpath(abs_path, WORKSPACE_ROOT)
    # normalize windows separators just in case
    rel = rel.replace(os.sep, "/")
    print(rel)


def check_size(path):
    try:
        size = os.path.getsize(path)
    except OSError as e:
        die(f"output_missing: {e}")
    if size > MAX_OUTPUT_BYTES:
        try:
            os.remove(path)
        except OSError:
            pass
        die(f"output_too_large: {size} bytes (max {MAX_OUTPUT_BYTES})")
    return size


def resolve_input(name):
    """Resolve a file name from /workspace/in/<name>."""
    if not name:
        die("missing_source_file")
    path = os.path.join(IN_DIR, name)
    if not os.path.isfile(path):
        die(f"source_not_found: {name}")
    return path


def resolve_optional_input(name):
    """Resolve an optional file path (for images etc.); returns None if missing."""
    if not name:
        return None
    # allow absolute paths only if they live under /workspace
    if os.path.isabs(name):
        if os.path.isfile(name) and name.startswith(WORKSPACE_ROOT):
            return name
        return None
    path = os.path.join(IN_DIR, name)
    if os.path.isfile(path):
        return path
    return None
