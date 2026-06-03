"""Generate the GitHub social preview image (1280x640 PNG) for MCP Hub.

Output: frontend/public/social-preview.png

The image is hand-designed to look good both at full size and as a
small thumbnail in GitHub's social card slot.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

WIDTH, HEIGHT = 1280, 640
OUT_PATH = Path(__file__).resolve().parent.parent / "frontend" / "public" / "social-preview.png"


BRAND = {
    "indigo": (99, 102, 241),
    "purple": (139, 92, 246),
    "pink": (236, 72, 153),
    "teal": (45, 212, 191),
    "bg_top": (13, 17, 23),
    "bg_mid": (22, 27, 34),
    "bg_bot": (10, 14, 20),
    "ink": (245, 247, 250),
    "ink_dim": (180, 188, 204),
    "ink_faint": (110, 118, 135),
    "grid": (40, 48, 64),
}


def lerp(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def make_gradient_bg() -> Image.Image:
    """Dark vertical gradient + subtle grid lines + soft accent glow."""
    img = Image.new("RGB", (WIDTH, HEIGHT), BRAND["bg_top"])
    px = img.load()

    for y in range(HEIGHT):
        t = y / (HEIGHT - 1)
        if t < 0.55:
            color = lerp(BRAND["bg_top"], BRAND["bg_mid"], t / 0.55)
        else:
            color = lerp(BRAND["bg_mid"], BRAND["bg_bot"], (t - 0.55) / 0.45)
        for x in range(WIDTH):
            px[x, y] = color

    draw = ImageDraw.Draw(img)
    grid_step = 40
    for x in range(0, WIDTH, grid_step):
        draw.line([(x, 0), (x, HEIGHT)], fill=BRAND["grid"], width=1)
    for y in range(0, HEIGHT, grid_step):
        draw.line([(0, y), (WIDTH, y)], fill=BRAND["grid"], width=1)

    glow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse([(180, -120), (640, 340)], fill=(99, 102, 241, 95))
    gdraw.ellipse([(820, 320), (1280, 760)], fill=(139, 92, 246, 90))
    gdraw.ellipse([(560, 280), (980, 700)], fill=(45, 212, 191, 55))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=110))
    img = Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB")
    return img


def find_font(candidates: list[str], size: int) -> ImageFont.FreeTypeFont:
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                continue
    return ImageFont.load_default()


def font_paths() -> dict[str, list[str]]:
    return {
        "black": [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        ],
        "bold": [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        ],
        "regular": [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        ],
        "mono": [
            "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationMono-Bold.ttf",
        ],
    }


def draw_logo_mark(draw: ImageDraw.ImageDraw, cx: int, cy: int, size: int) -> None:
    """Hexagonal badge with stylized 'M' mark, indigo->purple gradient."""
    import math

    r = size // 2
    pts = []
    for i in range(6):
        angle = math.radians(60 * i - 30)
        pts.append((cx + r * math.cos(angle), cy + r * math.sin(angle)))

    grad = Image.new("RGB", (size, size), BRAND["indigo"])
    gpx = grad.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * size)
            gpx[x, y] = lerp(BRAND["indigo"], BRAND["purple"], t)
    grad_rgba = grad.convert("RGBA")
    mask = Image.new("L", (size, size), 0)
    mdraw = ImageDraw.Draw(mask)
    min_x = min(p[0] for p in pts) - cx + r
    min_y = min(p[1] for p in pts) - cy + r
    max_x = max(p[0] for p in pts) - cx + r
    max_y = max(p[1] for p in pts) - cy + r
    mdraw.polygon(
        [(p[0] - cx + r, p[1] - cy + r) for p in pts],
        fill=255,
    )
    bg = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    bg.paste(grad_rgba, (cx - r, cy - r), mask)

    ring_layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    rdraw = ImageDraw.Draw(ring_layer)
    rdraw.polygon(pts, outline=(255, 255, 255, 60), width=3)

    final = Image.alpha_composite(bg, ring_layer)
    img_draw = ImageDraw.Draw(final)
    img_draw.polygon(pts, fill=None, outline=(255, 255, 255, 220), width=4)

    inner_pts = []
    for i in range(6):
        angle = math.radians(60 * i - 30)
        inner_pts.append((cx + (r - 10) * math.cos(angle), cy + (r - 10) * math.sin(angle)))
    img_draw.polygon(inner_pts, outline=(255, 255, 255, 60), width=2)

    text_layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    tdraw = ImageDraw.Draw(text_layer)
    f_mark = find_font(font_paths()["black"], int(size * 0.55))
    bbox = f_mark.getbbox("M")
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tdraw.text(
        (cx - tw / 2 - bbox[0], cy - th / 2 - bbox[1] - 4),
        "M",
        font=f_mark,
        fill=(255, 255, 255, 255),
    )

    final = Image.alpha_composite(final, text_layer)
    draw._image.paste(final, (0, 0), final)


def draw_text_centered(
    draw: ImageDraw.ImageDraw, y: int, text: str, font: ImageFont.FreeTypeFont, fill
) -> None:
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    draw.text(((WIDTH - tw) // 2 - bbox[0], y - bbox[1]), text, font=font, fill=fill)


def draw_feature_pill(draw: ImageDraw.ImageDraw, x: int, y: int, text: str, font, accent) -> None:
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    pad_x, pad_y = 18, 10
    w = tw + pad_x * 2
    h = th + pad_y * 2
    r = h // 2
    draw.rounded_rectangle(
        [x, y, x + w, y + h], radius=r, fill=(255, 255, 255, 14), outline=accent, width=2
    )
    draw.text((x + pad_x - bbox[0], y + pad_y - bbox[1]), text, font=font, fill=BRAND["ink"])


def render() -> None:
    img = make_gradient_bg()
    draw = ImageDraw.Draw(img, "RGBA")

    f_black = find_font(font_paths()["black"], 132)
    f_bold_lg = find_font(font_paths()["bold"], 44)
    f_bold_md = find_font(font_paths()["bold"], 28)
    f_regular = find_font(font_paths()["regular"], 26)
    f_mono = find_font(font_paths()["mono"], 22)

    draw_logo_mark(draw, cx=240, cy=320, size=280)

    title_y = 130
    draw_text_centered(draw, title_y, "MCP Hub", f_black, BRAND["ink"])

    subtitle_y = 280
    draw_text_centered(
        draw,
        subtitle_y,
        "The Universal Model Context Protocol Tool Market",
        f_bold_md,
        BRAND["ink_dim"],
    )

    tagline_y = 330
    draw_text_centered(
        draw,
        tagline_y,
        "Browse · Search · Download · 4,407+ curated MCP servers",
        f_regular,
        BRAND["ink_faint"],
    )

    draw_text_centered(
        draw,
        410,
        "Built for Claude  ·  Cursor  ·  ChatGPT  ·  DeepSeek  ·  and every AI agent",
        f_mono,
        BRAND["teal"],
    )

    pills = [
        ("REST API", BRAND["indigo"]),
        ("Web UI", BRAND["purple"]),
        ("AI-Agent Friendly", BRAND["teal"]),
        ("MIT Licensed", BRAND["pink"]),
    ]
    pill_w = 220
    gap = 18
    total_w = pill_w * len(pills) + gap * (len(pills) - 1)
    start_x = (WIDTH - total_w) // 2
    pill_y = 490
    for i, (label, accent) in enumerate(pills):
        draw_feature_pill(draw, start_x + i * (pill_w + gap), pill_y, label, f_bold_md, accent)

    bar_h = 6
    bar = Image.new("RGB", (WIDTH, bar_h), BRAND["indigo"])
    bpx = bar.load()
    for x in range(WIDTH):
        t = x / (WIDTH - 1)
        bpx[x, 0] = lerp(BRAND["indigo"], BRAND["purple"], t)
        bpx[x, 1] = lerp(BRAND["indigo"], BRAND["purple"], t)
        bpx[x, 2] = lerp(BRAND["indigo"], BRAND["purple"], t)
    img.paste(bar, (0, 0))
    img.paste(bar, (0, HEIGHT - bar_h))

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT_PATH, "PNG", optimize=True)
    print(f"wrote {OUT_PATH} ({OUT_PATH.stat().st_size} bytes)")


if __name__ == "__main__":
    render()
