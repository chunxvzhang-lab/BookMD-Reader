from pathlib import Path
import math

from PIL import Image, ImageDraw, ImageFont


BASE = Path(__file__).resolve().parent / "charts"
FONT_REGULAR = r"C:\Windows\Fonts\msyh.ttc"
FONT_BOLD = r"C:\Windows\Fonts\msyhbd.ttc"

TITLE = ImageFont.truetype(FONT_BOLD, 34)
NODE = ImageFont.truetype(FONT_REGULAR, 22)
SMALL = ImageFont.truetype(FONT_REGULAR, 19)


def u(text):
    return text.encode("ascii").decode("unicode_escape")


def wrap_text(draw, text, font, max_width):
    lines = []
    for raw in text.split("\n"):
        line = ""
        for ch in raw:
            test = line + ch
            if draw.textbbox((0, 0), test, font=font)[2] <= max_width:
                line = test
            else:
                if line:
                    lines.append(line)
                line = ch
        if line:
            lines.append(line)
    return lines


def center_text(draw, box, text, font, fill=(30, 30, 30)):
    x1, y1, x2, y2 = box
    lines = wrap_text(draw, text, font, x2 - x1 - 20)
    sizes = []
    for line in lines:
        b = draw.textbbox((0, 0), line, font=font)
        sizes.append((b[2] - b[0], b[3] - b[1]))
    total = sum(h for _, h in sizes) + 7 * (len(lines) - 1)
    y = y1 + (y2 - y1 - total) / 2
    for line, (w, h) in zip(lines, sizes):
        draw.text((x1 + (x2 - x1 - w) / 2, y), line, font=font, fill=fill)
        y += h + 7


def arrow(draw, start, end, fill=(80, 80, 80)):
    draw.line([start, end], fill=fill, width=4)
    angle = math.atan2(end[1] - start[1], end[0] - start[0])
    length = 16
    points = [
        end,
        (
            end[0] - length * math.cos(angle - 0.45),
            end[1] - length * math.sin(angle - 0.45),
        ),
        (
            end[0] - length * math.cos(angle + 0.45),
            end[1] - length * math.sin(angle + 0.45),
        ),
    ]
    draw.polygon(points, fill=fill)


def draw_title(draw, width, text):
    box = draw.textbbox((0, 0), text, font=TITLE)
    draw.text(((width - (box[2] - box[0])) / 2, 34), text, font=TITLE, fill=(20, 20, 20))


def fig1():
    width, height = 1500, 820
    image = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(image)
    draw_title(draw, width, u(r"\u667a\u6167\u4ea4\u901a\u8c03\u5ea6\u6280\u672f\u6f14\u8fdb\u8def\u5f84"))
    boxes = [
        (70, 220, 300, 360, u(r"\u56fa\u5b9a\u914d\u65f6\n\u5386\u53f2\u6d41\u91cf\u4e0e\u4eba\u5de5\u89c4\u5219"), (238, 245, 249), (47, 111, 143)),
        (430, 220, 660, 360, u(r"\u611f\u5e94\u63a7\u5236\n\u68c0\u6d4b\u5668\u89e6\u53d1\u8c03\u6574"), (238, 245, 249), (47, 111, 143)),
        (790, 220, 1040, 360, u(r"\u5f3a\u5316\u5b66\u4e60\n\u72b6\u6001-\u52a8\u4f5c-\u5956\u52b1"), (247, 241, 226), (139, 111, 47)),
        (1170, 220, 1420, 360, u(r"\u5927\u6a21\u578b\u534f\u540c\n\u7406\u89e3\u3001\u89c4\u5212\u3001\u89e3\u91ca"), (237, 245, 239), (62, 124, 89)),
    ]
    for x1, y1, x2, y2, text, fill, outline in boxes:
        draw.rounded_rectangle((x1, y1, x2, y2), 12, fill=fill, outline=outline, width=4)
        center_text(draw, (x1, y1, x2, y2), text, NODE)
    arrow(draw, (300, 290), (430, 290))
    arrow(draw, (660, 290), (790, 290))
    arrow(draw, (1040, 290), (1170, 290))
    draw.rounded_rectangle((470, 560, 1030, 690), 12, fill=(237, 245, 239), outline=(62, 124, 89), width=4)
    center_text(draw, (470, 560, 1030, 690), u(r"\u8f66\u8def\u4e91\u534f\u540c\u73af\u5883\n\u8f66\u7aef\u6570\u636e + \u8def\u4fa7\u611f\u77e5 + \u4e91\u7aef\u63a8\u7406 + \u8fb9\u7f18\u6267\u884c"), NODE)
    arrow(draw, (910, 365), (830, 560))
    arrow(draw, (1295, 365), (1030, 625))
    note = u(r"\u8d44\u6599\u6765\u6e90\uff1a\u6839\u636e\u6587\u732e[1][2][3][5][11]\u6574\u7406")
    box = draw.textbbox((0, 0), note, font=SMALL)
    draw.text(((width - (box[2] - box[0])) / 2, 745), note, font=SMALL, fill=(90, 90, 90))
    image.save(BASE / "fig1_evolution.png")


def fig2():
    width, height = 1500, 920
    image = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(image)
    draw_title(draw, width, u(r"\u5927\u6a21\u578b\u53c2\u4e0e\u8f66\u8def\u4e91\u534f\u540c\u8c03\u5ea6\u7684\u5206\u5c42\u67b6\u6784"))
    for x1, y1, x2, y2, label in [
        (80, 120, 1420, 300, u(r"\u4e91\u7aef")),
        (80, 365, 1420, 545, u(r"\u8def\u4fa7")),
        (80, 615, 1420, 765, u(r"\u8f66\u7aef")),
    ]:
        draw.rounded_rectangle((x1, y1, x2, y2), 14, fill=(248, 250, 251), outline=(170, 183, 196), width=3)
        draw.text((115, y1 + 35), label, font=NODE, fill=(30, 30, 30))
    nodes = [
        (360, 160, 640, 260, u(r"\u5927\u6a21\u578b\u89c4\u5212\u5c42\n\u533a\u57df\u7b56\u7565\u3001\u89e3\u91ca\u3001\u5ba1\u8ba1"), (232, 241, 246), (47, 111, 143)),
        (850, 160, 1130, 260, u(r"\u4eff\u771f\u9a8c\u8bc1\u5c42\n\u51b2\u7a81\u68c0\u67e5\u3001\u6548\u679c\u8bc4\u4f30"), (232, 241, 246), (47, 111, 143)),
        (290, 405, 560, 505, u(r"\u8fb9\u7f18\u63a7\u5236\u5668\n\u4f4e\u5ef6\u8fdf\u6267\u884c"), (237, 245, 239), (62, 124, 89)),
        (720, 405, 990, 505, u(r"\u8def\u4fa7\u611f\u77e5\n\u6392\u961f\u3001\u884c\u4eba\u3001\u4e8b\u6545"), (237, 245, 239), (62, 124, 89)),
        (1130, 405, 1320, 505, u(r"\u4fe1\u53f7\u8bbe\u5907\n\u76f8\u4f4d\u4e0e\u7eff\u706f"), (237, 245, 239), (62, 124, 89)),
        (350, 650, 640, 720, u(r"\u8054\u7f51\u8f66\u8f86\u6570\u636e"), (247, 241, 226), (139, 111, 47)),
        (860, 650, 1150, 720, u(r"\u81ea\u52a8\u9a7e\u9a76\u53cd\u9988"), (247, 241, 226), (139, 111, 47)),
    ]
    for x1, y1, x2, y2, text, fill, outline in nodes:
        draw.rounded_rectangle((x1, y1, x2, y2), 10, fill=fill, outline=outline, width=4)
        center_text(draw, (x1, y1, x2, y2), text, NODE)
    arrow(draw, (640, 210), (850, 210))
    arrow(draw, (990, 260), (855, 405))
    arrow(draw, (855, 405), (640, 260))
    arrow(draw, (560, 455), (1130, 455))
    arrow(draw, (495, 650), (760, 505))
    arrow(draw, (1005, 650), (870, 505))
    note = u(r"\u8d44\u6599\u6765\u6e90\uff1a\u6839\u636e\u6587\u732e[7][10][11][14]\u6574\u7406")
    box = draw.textbbox((0, 0), note, font=SMALL)
    draw.text(((width - (box[2] - box[0])) / 2, 835), note, font=SMALL, fill=(90, 90, 90))
    image.save(BASE / "fig2_architecture.png")


def fig3():
    width, height = 1500, 840
    image = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(image)
    draw_title(draw, width, u(r"\u5927\u6a21\u578b\u8f85\u52a9\u5f02\u5e38\u4ea4\u901a\u4e8b\u4ef6\u54cd\u5e94\u95ed\u73af"))
    nodes = [
        (120, 165, 370, 275, u(r"\u4e8b\u4ef6\u8bc6\u522b\n\u4e8b\u6545\u3001\u65bd\u5de5\u3001\u62e5\u5835")),
        (520, 165, 770, 275, u(r"\u5f71\u54cd\u8bc4\u4f30\n\u8303\u56f4\u3001\u5ef6\u8bef\u3001\u98ce\u9669")),
        (920, 165, 1230, 275, u(r"\u5927\u6a21\u578b\u751f\u6210\u65b9\u6848\n\u76f8\u4f4d\u3001\u7ed5\u884c\u3001\u8bf1\u5bfc")),
        (920, 420, 1230, 530, u(r"\u4eff\u771f\u4e0e\u89c4\u5219\u9a8c\u8bc1\n\u51b2\u7a81\u68c0\u67e5\u3001\u6548\u679c\u9884\u4f30")),
        (520, 420, 770, 530, u(r"\u4eba\u5de5\u5ba1\u6838\n\u9009\u62e9\u3001\u4fee\u6539\u3001\u6279\u51c6")),
        (120, 420, 370, 530, u(r"\u7b56\u7565\u4e0b\u53d1\n\u4fe1\u53f7\u3001\u8bf1\u5bfc\u3001\u63d0\u793a")),
        (520, 635, 770, 745, u(r"\u6548\u679c\u53cd\u9988\n\u6392\u961f\u3001\u901f\u5ea6\u3001\u6e05\u9664\u65f6\u95f4")),
    ]
    for index, (x1, y1, x2, y2, text) in enumerate(nodes):
        fill = (240, 244, 248) if index not in (2, 3, 4) else ((247, 241, 226) if index == 2 else (237, 245, 239))
        outline = (47, 111, 143) if index not in (2, 3, 4) else ((139, 111, 47) if index == 2 else (62, 124, 89))
        draw.rounded_rectangle((x1, y1, x2, y2), 10, fill=fill, outline=outline, width=4)
        center_text(draw, (x1, y1, x2, y2), text, NODE)
    for start, end in [
        ((370, 220), (520, 220)),
        ((770, 220), (920, 220)),
        ((1075, 275), (1075, 420)),
        ((920, 475), (770, 475)),
        ((520, 475), (370, 475)),
        ((245, 530), (520, 690)),
        ((770, 690), (1230, 475)),
    ]:
        arrow(draw, start, end)
    note = u(r"\u8d44\u6599\u6765\u6e90\uff1a\u6839\u636e\u6587\u732e[5][6][11]\u6574\u7406")
    box = draw.textbbox((0, 0), note, font=SMALL)
    draw.text(((width - (box[2] - box[0])) / 2, 790), note, font=SMALL, fill=(90, 90, 90))
    image.save(BASE / "fig3_incident_loop.png")


fig1()
fig2()
fig3()
print("charts regenerated")
