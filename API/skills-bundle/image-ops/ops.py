#!/usr/bin/env python3
"""Image operations using Pillow: resize, convert, crop, thumbnail, watermark.

Spec (stdin): see SKILL.md.
Output: /workspace/out/<slug>.<outputFormat>
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from _common import (  # noqa: E402
    read_spec, die, build_out_path, emit_relative, check_size, resolve_input,
)

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError as e:
    die(f"Pillow not installed: {e}")


FORMAT_MAP = {
    "png": "PNG",
    "jpg": "JPEG",
    "jpeg": "JPEG",
    "webp": "WEBP",
    "gif": "GIF",
    "bmp": "BMP",
}


def _hex_to_rgba(color, opacity=1.0):
    c = str(color or "#FFFFFF").lstrip("#")
    if len(c) == 6:
        r, g, b = int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16)
    elif len(c) == 3:
        r, g, b = int(c[0]*2, 16), int(c[1]*2, 16), int(c[2]*2, 16)
    else:
        r, g, b = 255, 255, 255
    a = max(0, min(255, int(255 * float(opacity or 1.0))))
    return (r, g, b, a)


def _watermark(img, spec):
    wm = spec or {}
    text = str(wm.get("text") or "")
    if not text:
        return img
    position = (wm.get("position") or "bottom-right").lower()
    font_size = int(wm.get("fontSize") or 24)
    color_rgba = _hex_to_rgba(wm.get("color") or "#FFFFFF", wm.get("opacity", 0.7))

    base = img.convert("RGBA")
    overlay = Image.new("RGBA", base.size, (255, 255, 255, 0))
    draw = ImageDraw.Draw(overlay)

    try:
        font = ImageFont.truetype("DejaVuSans.ttf", font_size)
    except Exception:
        try:
            font = ImageFont.load_default()
        except Exception:
            font = None

    # Compute text box size
    try:
        bbox = draw.textbbox((0, 0), text, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    except Exception:
        tw, th = font_size * len(text) // 2, font_size

    w, h = base.size
    margin = 20
    if position == "top-left":
        xy = (margin, margin)
    elif position == "top-right":
        xy = (w - tw - margin, margin)
    elif position == "bottom-left":
        xy = (margin, h - th - margin)
    elif position == "center":
        xy = ((w - tw) // 2, (h - th) // 2)
    else:
        xy = (w - tw - margin, h - th - margin)

    draw.text(xy, text, fill=color_rgba, font=font)
    return Image.alpha_composite(base, overlay)


def main():
    spec = read_spec()
    if not isinstance(spec, dict):
        die("spec_must_be_object")
    action = (spec.get("action") or "").lower()
    src = spec.get("source")
    if not src:
        die("source_required")
    src_path = resolve_input(src)
    out_name = spec.get("outputName") or "image"
    out_fmt = str(spec.get("outputFormat") or os.path.splitext(src_path)[1].lstrip(".") or "png").lower()
    if out_fmt not in FORMAT_MAP:
        die(f"invalid_format:{out_fmt}")

    try:
        img = Image.open(src_path)
    except Exception as e:  # noqa: BLE001
        die(f"open_failed:{e}")

    try:
        if action == "resize":
            w = spec.get("width")
            h = spec.get("height")
            if w and h:
                img = img.resize((int(w), int(h)))
            elif w:
                ratio = int(w) / img.width
                img = img.resize((int(w), int(img.height * ratio)))
            elif h:
                ratio = int(h) / img.height
                img = img.resize((int(img.width * ratio), int(h)))
            else:
                die("resize_requires_width_or_height")
        elif action == "convert":
            pass  # just format change on save
        elif action == "crop":
            c = spec.get("crop") or {}
            x = int(c.get("x") or 0)
            y = int(c.get("y") or 0)
            cw = int(c.get("width") or 0)
            ch = int(c.get("height") or 0)
            if cw <= 0 or ch <= 0:
                die("invalid_crop")
            img = img.crop((x, y, x + cw, y + ch))
        elif action == "thumbnail":
            t = spec.get("thumbnail") or {}
            max_size = int(t.get("maxSize") or 256)
            img.thumbnail((max_size, max_size))
        elif action == "watermark":
            img = _watermark(img, spec.get("watermark"))
        else:
            die(f"invalid_action:{action}")
    except SystemExit:
        raise
    except Exception as e:  # noqa: BLE001
        die(f"action_failed:{e}")

    # JPEG doesn't support alpha — flatten
    pil_format = FORMAT_MAP[out_fmt]
    if pil_format == "JPEG" and img.mode in ("RGBA", "LA", "P"):
        bg = Image.new("RGB", img.size, (255, 255, 255))
        if img.mode == "P":
            img = img.convert("RGBA")
        bg.paste(img, mask=img.split()[-1] if img.mode in ("RGBA", "LA") else None)
        img = bg

    out_path = build_out_path(out_name, "jpg" if out_fmt == "jpeg" else out_fmt)
    try:
        save_kwargs = {}
        if pil_format == "JPEG":
            save_kwargs["quality"] = 90
        img.save(out_path, pil_format, **save_kwargs)
    except Exception as e:  # noqa: BLE001
        die(f"save_failed:{e}")
    check_size(out_path)
    emit_relative(out_path)


if __name__ == "__main__":
    main()
