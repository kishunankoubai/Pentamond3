"""P形のベクター座標からPWAアイコン・共有画像を生成する（Pillowが必要）。"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "icon"
SCALE = 4
TRIANGLES = [
    [(0, 0), (60, 0), (30, 51.9615)],
    [(60, 0), (30, 51.9615), (90, 51.9615)],
    [(60, 0), (120, 0), (90, 51.9615)],
    [(30, 51.9615), (90, 51.9615), (60, 103.923)],
    [(90, 51.9615), (60, 103.923), (120, 103.923)],
]


def emblem(draw, x, y, width):
    scale = width / 120
    for triangle in TRIANGLES:
        points = [((x + px * scale) * SCALE, (y + py * scale) * SCALE) for px, py in triangle]
        draw.polygon(points, fill="#ffff00")
        draw.line(points + [points[0]], fill="#a8a34b", width=max(1, round(1.5 * scale * SCALE)), joint="curve")


for name, size, fraction in [
    ("icon-192.png", 192, .75), ("icon-512.png", 512, .75),
    ("icon-maskable-512.png", 512, .60), ("apple-touch-icon.png", 180, .75),
]:
    image = Image.new("RGB", (size * SCALE, size * SCALE), "#edf7fc")
    width = size * fraction
    emblem(ImageDraw.Draw(image), (size - width) / 2, (size - width * 103.923 / 120) / 2, width)
    image.resize((size, size), Image.Resampling.LANCZOS).save(OUT / name, optimize=True)

image = Image.new("RGB", (1200 * SCALE, 630 * SCALE), "#edf7fc")
draw = ImageDraw.Draw(image)
emblem(draw, 450, 110, 300)
font_path = ROOT / "assets/fonts/rocknrollone/RocknRollOne-Regular.ttf"
font = ImageFont.truetype(str(font_path), 94 * SCALE)
text = "Pentamond"
length = draw.textlength(text, font=font)
x = (1200 * SCALE - length) / 2
colors = ["#b69e20", "#b040aa", "#417ac4", "#318a51", "#d07628", "#c84d58"]
for i, letter in enumerate(text):
    draw.text((x, 380 * SCALE), letter, font=font, fill=colors[i % len(colors)], stroke_width=1 * SCALE, stroke_fill="#ffffff")
    x += draw.textlength(letter, font=font)
image.resize((1200, 630), Image.Resampling.LANCZOS).save(OUT / "share.png", optimize=True)
