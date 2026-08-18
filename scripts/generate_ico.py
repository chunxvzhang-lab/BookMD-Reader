"""
Regenerate a proper Windows multi-resolution ICO using struct-based approach.
This ensures all frames (256, 128, 64, 48, 32, 24, 16) are correctly embedded.
"""
import io
import os
import struct
from PIL import Image

def make_ico_bytes(pil_image, sizes):
    """
    Build a proper ICO file with multiple sizes from a master PIL image.
    ICO format: header (6 bytes) + directory (16 bytes per image) + image data (PNG chunks)
    """
    entries = []
    png_blobs = []

    for (w, h) in sizes:
        frame = pil_image.resize((w, h), Image.Resampling.LANCZOS).convert("RGBA")
        buf = io.BytesIO()
        # Windows ICO stores 256x256 as PNG (compressed), smaller ones as BMP
        # Best compatibility: store all as PNG
        frame.save(buf, format="PNG")
        png_data = buf.getvalue()
        entries.append((w, h, len(png_data)))
        png_blobs.append(png_data)

    # ICO header: RESERVED=0, TYPE=1 (ICO), COUNT=n
    header = struct.pack("<HHH", 0, 1, len(entries))

    # Directory entries (16 bytes each)
    # Offset = 6 (header) + 16 * n_entries + sum of previous blob sizes
    data_offset = 6 + 16 * len(entries)
    dir_entries = b""
    for i, (w, h, blob_size) in enumerate(entries):
        w_byte = 0 if w == 256 else w  # 0 = 256 in ICO format
        h_byte = 0 if h == 256 else h
        dir_entries += struct.pack(
            "<BBBBHHII",
            w_byte,    # Width
            h_byte,    # Height
            0,         # Color count (0 for true color)
            0,         # Reserved
            1,         # Planes
            32,        # Bit count
            blob_size, # SizeInBytes
            data_offset + sum(entries[j][2] for j in range(i)),  # Offset
        )

    return header + dir_entries + b"".join(png_blobs)


def main():
    # Load existing master PNG
    master_path = "C:/Users/chunxvzhang/Desktop/codex/build/icon.png"
    master = Image.open(master_path).convert("RGBA")
    print(f"Master image: {master.size}")

    sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (24, 24), (16, 16)]
    ico_data = make_ico_bytes(master, sizes)

    ico_paths = [
        "C:/Users/chunxvzhang/Desktop/codex/build/icon.ico",
        "C:/Users/chunxvzhang/Desktop/codex/icon.ico",
        "C:/Users/chunxvzhang/Desktop/codex/electron/icon.ico",
    ]
    for path in ico_paths:
        with open(path, "wb") as f:
            f.write(ico_data)
        size_kb = len(ico_data) / 1024
        print(f"Saved ICO ({size_kb:.1f} KB, {len(sizes)} frames): {path}")


if __name__ == "__main__":
    main()
