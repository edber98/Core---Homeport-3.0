#!/usr/bin/env python3
"""Generate a QR code PNG from a text/URL payload using the `qrcode` library.

Spec (stdin):
{
  "data": "https://...",
  "size": 10,                 # box size in px/module
  "border": 4,                # quiet zone in modules
  "errorCorrection": "M",     # L|M|Q|H
  "foreground": "#000000",
  "background": "#FFFFFF",
  "outputName": "qr"
}
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from _common import (  # noqa: E402
    read_spec, die, build_out_path, emit_relative, check_size,
)

try:
    import qrcode
    from qrcode.constants import (
        ERROR_CORRECT_L, ERROR_CORRECT_M, ERROR_CORRECT_Q, ERROR_CORRECT_H,
    )
except ImportError as e:
    die(f"qrcode not installed: {e}")


ERROR_MAP = {
    "L": ERROR_CORRECT_L,
    "M": ERROR_CORRECT_M,
    "Q": ERROR_CORRECT_Q,
    "H": ERROR_CORRECT_H,
}


def main():
    spec = read_spec()
    if not isinstance(spec, dict):
        die("spec_must_be_object")
    data = spec.get("data")
    if not isinstance(data, str) or not data:
        die("data_required")

    box_size = int(spec.get("size") or 10)
    border = int(spec.get("border") or 4)
    ec = ERROR_MAP.get(str(spec.get("errorCorrection") or "M").upper(), ERROR_CORRECT_M)
    fg = str(spec.get("foreground") or "#000000")
    bg = str(spec.get("background") or "#FFFFFF")
    out_name = spec.get("outputName") or "qr"

    try:
        qr = qrcode.QRCode(
            version=None,  # auto
            error_correction=ec,
            box_size=box_size,
            border=border,
        )
        qr.add_data(data)
        try:
            qr.make(fit=True)
        except qrcode.exceptions.DataOverflowError as e:  # type: ignore
            die(f"data_too_long:{e}")
        img = qr.make_image(fill_color=fg, back_color=bg)
    except Exception as e:  # noqa: BLE001
        die(f"generate_failed:{e}")

    out_path = build_out_path(out_name, "png")
    try:
        img.save(out_path)
    except Exception as e:  # noqa: BLE001
        die(f"save_failed:{e}")
    check_size(out_path)
    emit_relative(out_path)


if __name__ == "__main__":
    main()
