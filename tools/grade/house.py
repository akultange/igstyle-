"""The house grade: one colour grade for every photograph and film on the site (LUKA LATEST, 2026-11-23).

The club's light is red and amber, its materials black, steel and concrete: the generated pictures came with neon
purple, pink and blue that the club never has. The grade pulls purple, magenta and pink into the club's crimson and
burgundy, cools blue and cyan into steel, keeps skin and lamplight warm (a touch held back), lifts nothing out of the
blacks, and splits the tone: steel in the shadows, amber in the highlights. Everything happens in OKLab (a perceptual
space), so a hue turns without its lightness jumping.

    python3 tools/grade/house.py cube tools/grade/house.cube          the 3D LUT (33 points a side), for ffmpeg's lut3d
    python3 tools/grade/house.py image <in.webp> <out.webp> [quality]   one picture, graded exactly (not through the LUT)

tools/grade/apply.sh grades public/media and public/video in place from the untouched originals in git.
"""
import math
import sys

import numpy as np


def srgb_to_lin(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def lin_to_srgb(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055)


M1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929], [0.2119034982, 0.6806995451, 0.1073969566], [0.0883024619, 0.2817188376, 0.6299787005]])
M2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468], [1.9779984951, -2.4285922050, 0.4505937099], [0.0259040371, 0.7827717662, -0.8086757660]])
M2i = np.linalg.inv(M2)
M1i = np.linalg.inv(M1)


def to_oklab(rgb):
    lms = srgb_to_lin(rgb) @ M1.T
    return np.cbrt(np.maximum(lms, 0)) @ M2.T


def from_oklab(lab):
    lms = (lab @ M2i.T) ** 3
    return lin_to_srgb(lms @ M1i.T)


def periodic(xs, ys, h):
    """A smooth curve through control points on the hue circle (degrees): linear between them, eased (smoothstep)."""
    xs = np.asarray(xs, float)
    ys = np.asarray(ys, float)
    x = np.concatenate([xs - 360, xs, xs + 360])
    y = np.concatenate([ys, ys, ys])
    i = np.clip(np.searchsorted(x, h) - 1, 0, len(x) - 2)
    t = (h - x[i]) / (x[i + 1] - x[i])
    t = t * t * (3 - 2 * t)
    return y[i] + (y[i + 1] - y[i]) * t


# hue (OKLCH degrees): red 29, orange 55, skin 50-75, yellow 110, green 142, cyan 195, blue 264, violet 285,
# purple 300, magenta 328, pink 350
HUE_IN = [0, 29, 55, 75, 110, 142, 195, 240, 264, 285, 300, 328, 350]
# where each goes: purple, magenta and pink to crimson and wine; blue and cyan a little towards the steel's blue
HUE_SHIFT = [21, 0, 0, -3, -10, 0, 12, 8, 0, 90, 78, 52, 31]
# how much colour each keeps: the club's reds and the skin full, the neons' blue and green almost grey (steel)
CHROMA = [0.96, 1.0, 0.95, 0.92, 0.78, 0.32, 0.28, 0.32, 0.36, 0.42, 0.72, 0.84, 0.92]
# and its lightness: the purples a little deeper as they turn to wine
LIGHT = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.97, 0.96, 0.95, 0.86, 0.82, 0.86, 0.94]


def grade(rgb):
    """sRGB (0..1, any shape ending in 3) to the graded sRGB."""
    lab = to_oklab(rgb)
    L, a, b = lab[..., 0], lab[..., 1], lab[..., 2]
    C = np.hypot(a, b)
    h = np.degrees(np.arctan2(b, a)) % 360
    # the more colour a pixel has, the more of the turn it takes (greys and near-greys stay where they are)
    w = np.clip(C / 0.06, 0, 1)
    h2 = h + periodic(HUE_IN, HUE_SHIFT, h) * w
    C2 = C * (1 - w + w * periodic(HUE_IN, CHROMA, h)) * 0.97
    L2 = L * (1 - w * (1 - periodic(HUE_IN, LIGHT, h)))
    # a gentle S in lightness, the blacks held at black
    L2 = np.clip(L2 + 0.035 * np.sin(2 * math.pi * (L2 - 0.5)) * np.clip(L2 / 0.12, 0, 1), 0, 1)
    a2 = C2 * np.cos(np.radians(h2))
    b2 = C2 * np.sin(np.radians(h2))
    # split tone: steel in the shadows, amber in the highlights
    sh = np.clip(1 - L2 / 0.42, 0, 1) ** 2
    hi = np.clip((L2 - 0.62) / 0.38, 0, 1) ** 2
    a2 = a2 - 0.003 * sh + 0.005 * hi
    b2 = b2 - 0.011 * sh + 0.014 * hi
    return np.clip(from_oklab(np.stack([L2, a2, b2], -1)), 0, 1)


def cube(path, n=33):
    g = np.linspace(0, 1, n)
    # .cube order: red fastest, then green, then blue
    b, gg, r = np.meshgrid(g, g, g, indexing='ij')
    rgb = np.stack([r, gg, b], -1).reshape(-1, 3)
    out = grade(rgb)
    with open(path, 'w') as f:
        f.write('TITLE "HOTLAND house grade"\n')
        f.write(f'LUT_3D_SIZE {n}\n')
        for v in out:
            f.write(f'{v[0]:.6f} {v[1]:.6f} {v[2]:.6f}\n')


def image(src, dst, quality=88):
    from PIL import Image
    im = Image.open(src)
    alpha = im.getchannel('A') if im.mode in ('RGBA', 'LA') else None
    rgb = np.asarray(im.convert('RGB')).astype(np.float32) / 255
    out = Image.fromarray((grade(rgb) * 255 + 0.5).astype(np.uint8), 'RGB')
    if alpha is not None:
        out.putalpha(alpha)
    kw = {'quality': int(quality), 'method': 6} if dst.lower().endswith('.webp') else {'quality': int(quality)}
    out.save(dst, **kw)


if __name__ == '__main__':
    if sys.argv[1] == 'cube':
        cube(sys.argv[2])
    elif sys.argv[1] == 'image':
        image(sys.argv[2], sys.argv[3], *(sys.argv[4:5] or [88]))
