#!/usr/bin/env python3
"""
Растеризатор записанных Canvas2D-команд (tools/snapshot.mjs) в PNG.
Нужен только для проверки картинки вне браузера: на вход подаются команды,
которые выдал НАСТОЯЩИЙ рендер игры.
"""
import json, math, re, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


def parse_color(c):
    if not isinstance(c, str):
        return (0, 0, 0, 255)
    c = c.strip()
    if c.startswith("rgba(") or c.startswith("rgb("):
        nums = re.findall(r"[-\d.]+", c)
        r, g, b = (int(float(nums[i])) for i in range(3))
        a = float(nums[3]) if len(nums) > 3 else 1.0
        return (r, g, b, int(max(0, min(1, a)) * 255))
    if c.startswith("#"):
        h = c[1:]
        if len(h) == 3:
            h = "".join(ch * 2 for ch in h)
        n = int(h, 16)
        return ((n >> 16) & 255, (n >> 8) & 255, n & 255, 255)
    names = {"white": (255, 255, 255, 255), "black": (0, 0, 0, 255), "transparent": (0, 0, 0, 0)}
    return names.get(c, (0, 0, 0, 255))


def apply_m(m, pts):
    a, b, c, d, e, f = m
    return [(a * x + c * y + e, b * x + d * y + f) for x, y in pts]


def scale_of(m):
    return max(0.05, math.sqrt(abs(m[0] * m[3] - m[1] * m[2])))


class GradientImg:
    """Кэш картинок градиентов"""
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.cache = {}

    def get(self, g, m):
        key = json.dumps([g["kind"], g["coords"], g["stops"], m])
        if key in self.cache:
            return self.cache[key]
        w, h = self.w, self.h
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        inv = invert(m)
        # переводим экранные пиксели в юзер-спейс градиента
        ux = inv[0] * xx + inv[2] * yy + inv[4]
        uy = inv[1] * xx + inv[3] * yy + inv[5]
        if g["kind"] == "linear":
            x0, y0, x1, y1 = g["coords"]
            dx, dy = x1 - x0, y1 - y0
            L2 = dx * dx + dy * dy or 1e-6
            t = ((ux - x0) * dx + (uy - y0) * dy) / L2
            r0, r1 = x0, x1
            rad = np.sqrt((ux - x0) ** 2 + (uy - y0) ** 2)
        else:
            x0, y0, rr0, x1, y1, rr1 = g["coords"]
            rad = np.sqrt((ux - x1) ** 2 + (uy - y1) ** 2)
            span = (rr1 - rr0) or 1e-6
            t = (rad - rr0) / span
        t = np.clip(t, 0, 1)
        stops = g["stops"] or [[0, "#000"], [1, "#000"]]
        stops = sorted(stops, key=lambda s: s[0])
        img = np.zeros((h, w, 4), np.float32)
        for i in range(len(stops) - 1):
            o0, c0 = stops[i]
            o1, c1 = stops[i + 1]
            col0 = np.array(parse_color(c0), np.float32)
            col1 = np.array(parse_color(c1), np.float32)
            span = (o1 - o0) or 1e-6
            f = np.clip((t - o0) / span, 0, 1)[..., None]
            seg = col0[None, None, :] * (1 - f) + col1[None, None, :] * f
            mask = (t >= o0) & (t <= o1)
            img[mask] = seg[mask]
        # области вне стопов
        first = np.array(parse_color(stops[0][1]), np.float32)
        last = np.array(parse_color(stops[-1][1]), np.float32)
        img[t < stops[0][0]] = first
        img[t > stops[-1][0]] = last
        self.cache[key] = img
        return img


def invert(m):
    a, b, c, d, e, f = m
    det = a * d - b * c
    if abs(det) < 1e-12:
        return [1, 0, 0, 1, 0, 0]
    return [d / det, -b / det, -c / det, a / det, (c * f - d * e) / det, (b * e - a * f) / det]


def composite(base, layer_rgba, mask, alpha):
    a = (mask.astype(np.float32) / 255.0) * alpha
    la = layer_rgba[..., 3:4].astype(np.float32) / 255.0
    w = (a[..., None] * la)
    base[..., :3] = layer_rgba[..., :3] * w + base[..., :3] * (1 - w)
    base[..., 3:4] = np.maximum(base[..., 3:4], w * 255)


def poly_mask(size, polys):
    m = Image.new("L", size, 0)
    d = ImageDraw.Draw(m)
    for p in polys:
        if len(p) < 3:
            continue
        d.polygon([tuple(pt) for pt in p], fill=255)
    return np.array(m)


def stroke_mask(size, polys, width, cap):
    m = Image.new("L", size, 0)
    d = ImageDraw.Draw(m)
    w = max(1, int(round(width)))
    for p in polys:
        if len(p) < 2:
            continue
        d.line([tuple(pt) for pt in p], fill=255, width=w, joint="curve")
        if cap == "round":
            r = w / 2
            for pt in (p[0], p[-1]):
                d.ellipse([pt[0] - r, pt[1] - r, pt[0] + r, pt[1] + r], fill=255)
    return np.array(m)


def font_for(spec, bold=False):
    mm = re.search(r"(\d+(?:\.\d+)?)px", spec or "")
    size = int(float(mm.group(1))) if mm else 12
    path = FONT_BOLD if ("900" in (spec or "") or "800" in (spec or "") or "bold" in (spec or "") or bold) else FONT_REG
    try:
        return ImageFont.truetype(path, max(4, size))
    except Exception:
        return ImageFont.load_default()


def render(doc, out_png):
    W, H = doc["w"], doc["h"]
    base = np.zeros((H, W, 4), np.float32)
    grad = GradientImg(W, H)
    fonts = {}
    for op in doc["ops"]:
        kind = op["op"]
        m = op.get("m", [1, 0, 0, 1, 0, 0])
        polys = [apply_m(m, p) for p in op.get("polys", [])]
        if kind == "clear":
            msk = poly_mask((W, H), polys)
            base[msk > 0] = 0
            continue
        alpha = op.get("alpha", 1)
        style = op.get("style", {"color": "#000"})
        if kind in ("fill", "stroke"):
            if kind == "fill":
                msk = poly_mask((W, H), polys)
            else:
                msk = stroke_mask((W, H), polys, op.get("w", 1) * scale_of(m), op.get("cap", "butt"))
            if not msk.any():
                continue
            if "gradient" in style:
                layer = grad.get(style["gradient"], m)
            else:
                col = np.array(parse_color(style.get("color")), np.float32)
                layer = np.empty((H, W, 4), np.float32)
                layer[..., :] = col[None, None, :]
            composite(base, layer, msk, alpha)
        elif kind in ("text", "textstroke"):
            f = font_for(op.get("font"))
            txt = op.get("text", "")
            x, y = apply_m(m, [(op["x"], op["y"])])[0]
            sc = scale_of(m)
            if sc < 0.35 or sc > 3.0:
                # текст в сильно масштабированном пространстве перерисовываем в экранных координатах
                size = max(6, int(f.size * sc))
                try:
                    f = ImageFont.truetype(FONT_BOLD if "900" in (op.get("font") or "") else FONT_REG, size)
                except Exception:
                    pass
            tmp = Image.new("L", (W, H), 0)
            d = ImageDraw.Draw(tmp)
            anchor = {"start": "la", "left": "la", "center": "ma", "end": "ra", "right": "ra"}.get(op.get("align", "start"), "la")
            if op.get("baseline") == "middle":
                anchor = anchor[0] + "m"
            elif op.get("baseline") == "top":
                anchor = anchor[0] + "a"
            try:
                if kind == "textstroke":
                    d.text((x, y), txt, font=f, fill=255, anchor=anchor, stroke_width=int(max(1, op.get("w", 1) * sc)), stroke_fill=255)
                else:
                    d.text((x, y), txt, font=f, fill=255, anchor=anchor)
            except Exception:
                d.text((x, y), txt, font=f, fill=255)
            msk = np.array(tmp)
            if not msk.any():
                continue
            if "gradient" in style:
                layer = grad.get(style["gradient"], m)
            else:
                col = np.array(parse_color(style.get("color")), np.float32)
                layer = np.empty((H, W, 4), np.float32)
                layer[..., :] = col[None, None, :]
            composite(base, layer, msk, alpha)
    img = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8), "RGBA")
    bg = Image.new("RGBA", (W, H), (11, 14, 19, 255))
    bg.alpha_composite(img)
    bg.convert("RGB").save(out_png)
    print("сохранено", out_png)


if __name__ == "__main__":
    src, dst = sys.argv[1], sys.argv[2]
    with open(src) as f:
        render(json.load(f), dst)
