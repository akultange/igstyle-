"""HOTLAND concrete: tileable detail maps for CSS overlay blending.

Each map is greyscale, centred on mid grey (128): darker than 128 darkens the surface it is laid on, lighter lightens
it (CSS background-blend-mode: overlay). One map serves every surface: black page, graphite sections, the door wall;
the surface's own colour sets how dark it is, the map only carries the stone. Everything is periodic (FFT noise,
features drawn wrapped round the edges), so the tile repeats without a seam.

  detail   768 px: sand grain, aggregate specks, pores (bug holes) lit from the top left, faint crazing
  mottle   256 px: large clouds and darker patches, shown big (about 1800 px) over the detail so the repeat of the
                   detail tile never lines up with its own
  streaks  512x1024: weathering, water runs down from the top, for the wall only

Run it again only to change the stone (needs numpy and Pillow):
  python3 tools/concrete.py public/img/concrete
In the styles: --stone and --stone-size (global.css); the wall of the 18+ door adds the streaks (gate.css).
"""
import numpy as np, sys, os
from PIL import Image, ImageDraw

OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
os.makedirs(OUT, exist_ok=True)


def spectral(shape, beta, rng, stretch=(1.0, 1.0)):
    h, w = shape
    F = np.fft.fft2(rng.standard_normal(shape))
    ky = np.fft.fftfreq(h)[:, None] * stretch[0]
    kx = np.fft.fftfreq(w)[None, :] * stretch[1]
    k = np.sqrt(kx ** 2 + ky ** 2)
    k[0, 0] = 1.0
    F = F / k ** beta
    F[0, 0] = 0
    r = np.real(np.fft.ifft2(F))
    return (r - r.mean()) / r.std()


def blur(a, sigma):
    h, w = a.shape
    ky = np.fft.fftfreq(h)[:, None]
    kx = np.fft.fftfreq(w)[None, :]
    g = np.exp(-2 * (np.pi * sigma) ** 2 * (kx ** 2 + ky ** 2))
    return np.real(np.fft.ifft2(np.fft.fft2(a) * g))


def disc_wrapped(field, cy, cx, r, val, soft=0.8, mode='add'):
    """Add a soft-edged disc (periodic) to field."""
    h, w = field.shape
    R = int(np.ceil(r + 2 * soft + 1))
    ys = np.arange(int(cy) - R, int(cy) + R + 1)
    xs = np.arange(int(cx) - R, int(cx) + R + 1)
    yy, xx = np.meshgrid(ys, xs, indexing='ij')
    d = np.sqrt((yy - cy) ** 2 + (xx - cx) ** 2)
    m = np.clip((r + soft - d) / (2 * soft), 0, 1)
    iy, ix = np.ix_(ys % h, xs % w)
    if mode == 'add':
        np.add.at(field, (iy.repeat(len(xs), 1), ix.repeat(len(ys), 0)), val * m)
    return field


def bowl_wrapped(field, cy, cx, r, depth):
    """A smooth dip (a pore): -depth * (1 - (d/r)^2)^1.5 inside r."""
    h, w = field.shape
    R = int(np.ceil(r + 1))
    ys = np.arange(int(cy) - R, int(cy) + R + 1)
    xs = np.arange(int(cx) - R, int(cx) + R + 1)
    yy, xx = np.meshgrid(ys, xs, indexing='ij')
    d2 = ((yy - cy) ** 2 + (xx - cx) ** 2) / (r * r)
    v = -depth * np.clip(1 - d2, 0, 1) ** 1.5
    iy = (ys % h)[:, None].repeat(len(xs), 1)
    ix = (xs % w)[None, :].repeat(len(ys), 0)
    np.add.at(field, (iy, ix), v)


def crack_mask(size, n, rng, scale=2, width=1.0, length=(120, 420), branch=0.25, jitter=0.32):
    """Thin branching cracks as a soft mask 0..1, drawn on a supersampled canvas, wrapped round the edges."""
    S = size * scale
    im = Image.new('L', (S, S), 0)
    dr = ImageDraw.Draw(im)
    def walk(x, y, ang, L, wd, depth=0):
        pts = [(x, y)]
        step = 5 * scale
        for _ in range(int(L * scale / step)):
            ang += rng.normal(0, jitter)
            x += np.cos(ang) * step; y += np.sin(ang) * step
            pts.append((x, y))
            if depth < 2 and rng.random() < branch * 0.08:
                walk(x, y, ang + rng.choice([-1, 1]) * rng.uniform(0.5, 1.1), L * rng.uniform(0.25, 0.5), wd * 0.7, depth + 1)
        for ox in (-S, 0, S):
            for oy in (-S, 0, S):
                dr.line([(px + ox, py + oy) for px, py in pts], fill=255, width=max(1, int(round(wd * scale))))
    for _ in range(n):
        walk(rng.uniform(0, S), rng.uniform(0, S), rng.uniform(0, 2 * np.pi), rng.uniform(*length), width)
    m = np.asarray(im.resize((size, size), Image.LANCZOS), dtype=np.float64) / 255
    return m


def shade(height, strength, light=(-0.55, -0.75, 1.0)):
    dx = (np.roll(height, -1, 1) - np.roll(height, 1, 1)) / 2
    dy = (np.roll(height, -1, 0) - np.roll(height, 1, 0)) / 2
    nx, ny, nz = -strength * dx, -strength * dy, np.ones_like(height)
    n = np.sqrt(nx ** 2 + ny ** 2 + nz ** 2)
    L = np.array(light) / np.linalg.norm(light)
    return (nx * L[0] + ny * L[1] + nz * L[2]) / n / L[2]


def save(a, name, q=82):
    img = Image.fromarray(np.clip(np.round(a * 255), 0, 255).astype(np.uint8), 'L')
    img.save(os.path.join(OUT, name), 'WEBP', quality=q, method=6)
    print(name, img.size, os.path.getsize(os.path.join(OUT, name)) // 1024, 'KB', 'mean', round(float(a.mean()) * 255, 1))


# ---------- detail ----------
rng = np.random.default_rng(1919)
N = 768
height = np.zeros((N, N))
albedo = np.zeros((N, N))
# cloudiness of the cement paste
albedo += 0.035 * spectral((N, N), 1.6, rng)
height += 0.6 * spectral((N, N), 1.8, rng)
# sand grain
g = blur(rng.standard_normal((N, N)), 0.55)
g = g / g.std()
height += 0.22 * g
albedo += 0.018 * g
# aggregate specks: mostly light (quartz, limestone), some dark
for _ in range(1800):
    r = rng.lognormal(np.log(0.9), 0.45)
    v = rng.choice([1, 1, 1, -1]) * rng.uniform(0.02, 0.09)
    disc_wrapped(albedo, rng.uniform(0, N), rng.uniform(0, N), r, v, soft=0.6)
# pores: bug holes, lit from the top left by the shading below
for _ in range(150):
    r = min(7.5, rng.lognormal(np.log(1.6), 0.5))
    cy, cx = rng.uniform(0, N), rng.uniform(0, N)
    bowl_wrapped(height, cy, cx, r, depth=1.6 * r)
    disc_wrapped(albedo, cy, cx, r * 0.55, -0.05 - 0.02 * r, soft=0.7)
# faint crazing
cr = crack_mask(N, 5, rng, width=1.0, length=(80, 300), branch=0.5)
height -= 1.6 * cr
albedo -= 0.05 * cr
s = shade(height, 1.15)
detail = 0.5 + albedo + 0.16 * (s - 1)
detail = detail - detail.mean() + 0.5
save(detail, "concrete.webp", q=66)

# ---------- mottle ----------
rng = np.random.default_rng(2611)
M = 256
mot = 0.06 * spectral((M, M), 2.4, rng) + 0.02 * spectral((M, M), 1.5, rng)
# a few darker patches (damp, older repairs)
patch = spectral((M, M), 2.8, rng)
mot -= 0.05 * np.clip(patch - 1.1, 0, None)
mot = mot - mot.mean() + 0.5
save(mot, 'mottle.webp', q=90)

# ---------- streaks (wall) ----------
rng = np.random.default_rng(77)
H, W = 1024, 512
st = spectral((H, W), 1.7, rng, stretch=(0.12, 1.0))
runs = np.clip(spectral((H, W), 1.3, rng, stretch=(0.06, 1.0)) - 0.6, 0, None)
y = np.linspace(0, 1, H)[:, None]
fade = np.exp(-y * 2.2)  # stronger near the top, where water comes over the edge
streak = 0.5 + 0.035 * st - 0.07 * runs * (0.45 + fade)
streak = streak - streak.mean() + 0.5
save(streak, 'streaks.webp', q=85)
