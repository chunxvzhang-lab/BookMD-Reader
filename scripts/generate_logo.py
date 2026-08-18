import math
import os
from PIL import Image, ImageDraw, ImageFilter

def create_master_logo(size=1024):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = size / 2, size / 2

    # 1. Base Squircle Badge with vibrant BookMD Orange Gradient (#FF4500 -> #FF8C00)
    sq_padding = int(size * 0.06)
    sq_rect = [sq_padding, sq_padding, size - sq_padding, size - sq_padding]
    corner_radius = int(size * 0.22)

    # Rounded rectangle mask
    mask = Image.new("L", (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle(sq_rect, radius=corner_radius, fill=255)

    # Background gradient fill (Deep energetic orange to sunrise amber)
    bg_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bg_draw = ImageDraw.Draw(bg_layer)
    for y in range(sq_padding, size - sq_padding):
        t = (y - sq_padding) / (size - 2 * sq_padding)
        r = int(255 * (1 - t) + 255 * t)
        g = int(60 * (1 - t) + 120 * t)
        b = int(0 * (1 - t) + 20 * t)
        bg_draw.line([(sq_padding, y), (size - sq_padding, y)], fill=(r, g, b, 255))

    img.paste(bg_layer, (0, 0), mask)

    # Subtle glossy border & inner ring
    border_mask = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    b_draw = ImageDraw.Draw(border_mask)
    b_draw.rounded_rectangle(sq_rect, radius=corner_radius, outline=(255, 255, 255, 90), width=int(size * 0.012))
    img.alpha_composite(border_mask)

    # 2. Geometric Open Book Symbol (Pure crisp white with subtle depth)
    book_w = int(size * 0.68)
    book_h = int(size * 0.46)
    book_top = int(size * 0.27)
    spine_x = cx
    left_x = cx - book_w / 2
    right_x = cx + book_w / 2
    bottom_y = book_top + book_h

    # Page polygons
    left_poly = [
        (spine_x - int(size * 0.015), book_top + int(size * 0.04)),
        (left_x + int(size * 0.04), book_top),
        (left_x, bottom_y - int(size * 0.04)),
        (spine_x - int(size * 0.015), bottom_y),
    ]
    right_poly = [
        (spine_x + int(size * 0.015), book_top + int(size * 0.04)),
        (right_x - int(size * 0.04), book_top),
        (right_x, bottom_y - int(size * 0.04)),
        (spine_x + int(size * 0.015), bottom_y),
    ]

    # Drop shadows under the book
    shadow_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow_layer)
    s_draw.polygon([(p[0], p[1] + int(size * 0.02)) for p in left_poly], fill=(0, 0, 0, 70))
    s_draw.polygon([(p[0], p[1] + int(size * 0.02)) for p in right_poly], fill=(0, 0, 0, 70))
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(radius=int(size * 0.02)))
    img.alpha_composite(shadow_layer)

    # Draw White Pages
    draw.polygon(left_poly, fill=(245, 248, 252, 255))
    draw.polygon(right_poly, fill=(255, 255, 255, 255))

    # Left Page: Code / Markdown Document Lines
    line_col = (200, 100, 60, 200)
    head_col = (255, 77, 0, 255)
    draw.line(
        [(left_x + int(size * 0.07), book_top + int(size * 0.09)), (spine_x - int(size * 0.06), book_top + int(size * 0.11))],
        fill=head_col,
        width=int(size * 0.02),
    )
    for i, dy_frac in enumerate([0.16, 0.22, 0.28, 0.34]):
        w_factor = 0.8 if i % 2 == 1 else 1.0
        lx1 = left_x + int(size * 0.06)
        lx2 = lx1 + int((spine_x - int(size * 0.06) - lx1) * w_factor)
        draw.line([(lx1, book_top + int(size * dy_frac)), (lx2, book_top + int(size * dy_frac) + int(size * 0.014))], fill=line_col, width=int(size * 0.013))

    # Right Page: Bold Markdown 'M' + Down Arrow Emblem (#1E293B Dark Slate)
    md_center_x = (spine_x + right_x) / 2
    md_center_y = book_top + int(size * 0.18)
    m_w = int(size * 0.18)
    m_h = int(size * 0.12)
    m_left = md_center_x - m_w / 2
    m_top = md_center_y - m_h / 2
    emblem_color = (30, 41, 59, 255)

    m_points = [
        (m_left, m_top + m_h),
        (m_left, m_top),
        (md_center_x, m_top + int(m_h * 0.55)),
        (m_left + m_w, m_top),
        (m_left + m_w, m_top + m_h),
    ]
    draw.line(m_points, fill=emblem_color, width=int(size * 0.024), joint="round")

    arr_top = m_top + m_h + int(size * 0.022)
    arr_w = int(size * 0.045)
    arr_points = [
        (md_center_x - arr_w, arr_top),
        (md_center_x, arr_top + int(size * 0.04)),
        (md_center_x + arr_w, arr_top),
    ]
    draw.line(arr_points, fill=(255, 77, 0, 255), width=int(size * 0.022), joint="round")

    # 3. Center Spine Golden Accent Ribbon
    ribbon_w = int(size * 0.075)
    ribbon_top = book_top - int(size * 0.04)
    ribbon_bottom = book_top + int(size * 0.16)
    rx = cx - ribbon_w / 2
    ribbon_poly = [
        (rx, ribbon_top),
        (rx + ribbon_w, ribbon_top),
        (rx + ribbon_w, ribbon_bottom),
        (cx, ribbon_bottom - int(size * 0.025)),
        (rx, ribbon_bottom),
    ]
    draw.polygon(ribbon_poly, fill=(255, 215, 0, 255))
    draw.line(ribbon_poly + [(rx, ribbon_top)], fill=(255, 245, 180, 255), width=int(size * 0.005))

    return img

def main():
    master = create_master_logo(1024)
    final_512 = master.resize((512, 512), Image.Resampling.LANCZOS)

    # Save all PNGs
    png_paths = [
        "C:/Users/chunxvzhang/Desktop/codex/src/assets/icon.png",
        "C:/Users/chunxvzhang/Desktop/codex/public/icon.png",
        "C:/Users/chunxvzhang/Desktop/codex/electron/icon.png",
        "C:/Users/chunxvzhang/Desktop/codex/icon.png",
        "C:/Users/chunxvzhang/Desktop/codex/build/icon.png",
        "C:/Users/chunxvzhang/Desktop/codex/release/BookMD-Reader-win-x64/assets/icon.png",
    ]
    for p in png_paths:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        final_512.save(p, format="PNG")
        print(f"Saved PNG: {p}")

    # Generate multi-resolution Windows ICO using explicit multi-frame approach
    ico_sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (24, 24), (16, 16)]

    ico_paths = [
        "C:/Users/chunxvzhang/Desktop/codex/electron/icon.ico",
        "C:/Users/chunxvzhang/Desktop/codex/icon.ico",
        "C:/Users/chunxvzhang/Desktop/codex/build/icon.ico",
    ]
    for ip in ico_paths:
        os.makedirs(os.path.dirname(ip), exist_ok=True)
        # Build each frame as RGBA PNG in memory, then save as proper multi-res ICO
        frames = []
        for sz in ico_sizes:
            frame = master.resize(sz, Image.Resampling.LANCZOS).convert("RGBA")
            frames.append(frame)
        # Save using first frame with append_images — each already correct size
        frames[0].save(
            ip,
            format="ICO",
            append_images=frames[1:],
            sizes=[(f.width, f.height) for f in frames],
        )
        print(f"Saved Multi-res ICO ({len(frames)} frames): {ip}")

if __name__ == "__main__":
    main()
