import math
import os
from PIL import Image, ImageDraw, ImageFilter

def create_bookmd_logo():
    # 1. Supersampled canvas (1024x1024)
    size = 1024
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Center & radius
    cx, cy = size / 2, size / 2

    # Background Squircle with subtle gradient
    sq_padding = 64
    sq_rect = [sq_padding, sq_padding, size - sq_padding, size - sq_padding]
    corner_radius = 210

    # Draw gradient squircle (Deep modern slate-navy: #0B0F19 to #1E293B)
    # Using a mask for perfect rounded rectangle gradient
    mask = Image.new("L", (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle(sq_rect, radius=corner_radius, fill=255)

    # Squircle background fill
    bg_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bg_draw = ImageDraw.Draw(bg_layer)
    for y in range(sq_padding, size - sq_padding):
        t = (y - sq_padding) / (size - 2 * sq_padding)
        r = int(14 * (1 - t) + 24 * t)
        g = int(20 * (1 - t) + 36 * t)
        b = int(32 * (1 - t) + 54 * t)
        bg_draw.line([(sq_padding, y), (size - sq_padding, y)], fill=(r, g, b, 255))

    # Composite squircle with mask
    img.paste(bg_layer, (0, 0), mask)

    # Subtle inner glow / border around squircle
    border_mask = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    b_draw = ImageDraw.Draw(border_mask)
    b_draw.rounded_rectangle(sq_rect, radius=corner_radius, outline=(255, 255, 255, 38), width=6)
    img.alpha_composite(border_mask)

    # 2. Draw Book Geometry (Left & Right open book wings)
    book_w = 640
    book_h = 420
    book_top = 310
    spine_x = cx
    left_x = cx - book_w / 2
    right_x = cx + book_w / 2
    bottom_y = book_top + book_h

    # Left Page Polygon (Slightly tilted 3D perspective)
    left_poly = [
        (spine_x - 10, book_top + 40),
        (left_x + 30, book_top + 10),
        (left_x, bottom_y - 30),
        (spine_x - 10, bottom_y),
    ]

    # Right Page Polygon
    right_poly = [
        (spine_x + 10, book_top + 40),
        (right_x - 30, book_top + 10),
        (right_x, bottom_y - 30),
        (spine_x + 10, bottom_y),
    ]

    # Draw Page Underlayers (Pages depth effect)
    left_under = [
        (spine_x - 10, book_top + 60),
        (left_x + 20, book_top + 30),
        (left_x - 8, bottom_y - 12),
        (spine_x - 10, bottom_y + 16),
    ]
    right_under = [
        (spine_x + 10, book_top + 60),
        (right_x - 20, book_top + 30),
        (right_x + 8, bottom_y - 12),
        (spine_x + 10, bottom_y + 16),
    ]
    draw.polygon(left_under, fill=(255, 255, 255, 60))
    draw.polygon(right_under, fill=(255, 255, 255, 60))

    # Left Page Main (Crisp pure frosted white)
    draw.polygon(left_poly, fill=(245, 247, 250, 250))
    draw.polygon(right_poly, fill=(255, 255, 255, 255))

    # Markdown Heading & Text Lines on Left Page
    line_color = (148, 163, 184, 220)
    accent_bar_color = (255, 77, 0, 240)

    # Header bar on left page
    draw.line([(left_x + 60, book_top + 90), (spine_x - 50, book_top + 105)], fill=accent_bar_color, width=16)
    # Paragraph lines on left page
    for i, dy in enumerate([145, 185, 225, 265, 305]):
        w_factor = 0.85 if i % 2 == 1 else 1.0
        lx1 = left_x + 55
        lx2 = lx1 + (spine_x - 50 - lx1) * w_factor
        draw.line([(lx1, book_top + dy), (lx2, book_top + dy + 12)], fill=line_color, width=10)

    # 3. Signature Radiant Markdown Badge on Right Page
    # Distinctive 'M' + Down Arrow markdown symbol in vibrant orange gradient
    md_center_x = (spine_x + right_x) / 2
    md_center_y = book_top + 190

    # Draw 'M' Monogram in glowing BookMD orange
    m_color = (255, 77, 0, 255)
    m_w = 140
    m_h = 100
    m_left = md_center_x - m_w / 2
    m_top = md_center_y - m_h / 2

    m_points = [
        (m_left, m_top + m_h),
        (m_left, m_top),
        (md_center_x, m_top + m_h * 0.55),
        (m_left + m_w, m_top),
        (m_left + m_w, m_top + m_h),
    ]
    draw.line(m_points, fill=m_color, width=20, joint="round")

    # Down arrow / chevron below 'M' (Classic Markdown down-arrow badge)
    arr_top = m_top + m_h + 18
    arr_points = [
        (md_center_x - 36, arr_top),
        (md_center_x, arr_top + 34),
        (md_center_x + 36, arr_top),
    ]
    draw.line(arr_points, fill=(255, 122, 0, 255), width=18, joint="round")

    # 4. Floating Ribbon / Bookmark hanging over the spine
    ribbon_w = 70
    ribbon_top = book_top - 40
    ribbon_bottom = book_top + 160
    rx = cx - ribbon_w / 2

    ribbon_poly = [
        (rx, ribbon_top),
        (rx + ribbon_w, ribbon_top),
        (rx + ribbon_w, ribbon_bottom),
        (cx, ribbon_bottom - 24),
        (rx, ribbon_bottom),
    ]
    # Draw glowing bookmark ribbon
    draw.polygon(ribbon_poly, fill=(255, 77, 0, 255))
    draw.line([(rx, ribbon_top), (rx + ribbon_w, ribbon_top), (rx + ribbon_w, ribbon_bottom), (cx, ribbon_bottom - 24), (rx, ribbon_bottom), (rx, ribbon_top)], fill=(255, 160, 100, 200), width=4)

    # 5. Anti-aliasing downsample to 512x512
    final_img = img.resize((512, 512), Image.Resampling.LANCZOS)
    return final_img

def main():
    logo = create_bookmd_logo()
    
    # Target file paths
    paths = [
        "C:/Users/chunxvzhang/Desktop/codex/src/assets/icon.png",
        "C:/Users/chunxvzhang/Desktop/codex/public/icon.png",
        "C:/Users/chunxvzhang/Desktop/codex/electron/icon.png",
        "C:/Users/chunxvzhang/Desktop/codex/icon.png",
        "C:/Users/chunxvzhang/Desktop/codex/release/BookMD-Reader-win-x64/assets/icon.png",
        "C:/Users/chunxvzhang/Desktop/codex/release/BookMD-Reader-win-x64/resources/app/icon.png",
        "C:/Users/chunxvzhang/Desktop/codex/release/BookMD-Reader-win-x64/resources/app/dist/icon.png",
    ]

    for p in paths:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        logo.save(p, format="PNG")
        print(f"Saved PNG icon: {p}")

    # Generate multi-res Windows ICO
    ico_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    ico_paths = [
        "C:/Users/chunxvzhang/Desktop/codex/electron/icon.ico",
        "C:/Users/chunxvzhang/Desktop/codex/icon.ico",
        "C:/Users/chunxvzhang/Desktop/codex/release/BookMD-Reader-win-x64/resources/app/electron/icon.ico",
    ]

    for ip in ico_paths:
        os.makedirs(os.path.dirname(ip), exist_ok=True)
        logo.save(ip, format="ICO", sizes=ico_sizes)
        print(f"Saved multi-res ICO icon: {ip}")

if __name__ == "__main__":
    main()
