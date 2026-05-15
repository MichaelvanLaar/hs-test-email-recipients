#!/usr/bin/env python3
"""Generate minimal teal square PNG icons — no external dependencies."""
import struct
import zlib
import os

TEAL = (0, 164, 196)  # #00A4C4


def make_png(size, rgb):
    r, g, b = rgb

    def chunk(tag, data):
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)

    raw = b"".join(b"\x00" + bytes([r, g, b] * size) for _ in range(size))
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw))
        + chunk(b"IEND", b"")
    )


root = os.path.join(os.path.dirname(__file__), "..")
for size in [16, 48, 128]:
    path = os.path.join(root, "icons", f"icon{size}.png")
    with open(path, "wb") as f:
        f.write(make_png(size, TEAL))
    print(f"icons/icon{size}.png")
