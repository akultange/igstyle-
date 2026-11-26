"""The wall behind every page (src/wall): its stone, baked once into three greyscale maps.

The wall is drawn by the browser (WebGL, src/wall/wall.ts): it lights the stone itself, from a height map, so each map
here carries one quantity only, in grey (grey survives the WebP's compression whole, a colour channel would not).

  wall-h.webp   768 px  height (baked at 1024, saved at 768): the formwork's faint grain, sand, the pores (bug holes) and hairline crazing of
                        fair-faced concrete; 0.5 is the mean surface, darker is lower
  wall-a.webp   512 px  albedo (baked at 1024, saved at 512): the cement's cloudiness, aggregate specks, dirt in the pores; 0.5 is the mean
  wall-n.webp   512 px  a cellular noise (billowy cells, several sizes) that breaks the edge of everything the
                        cursor uncovers, so no edge is ever a clean circle

Everything is periodic (FFT noise; pores and cracks drawn wrapped round the edges): the tiles repeat without a seam.
Run it again only to change the stone (numpy and Pillow):  python3 tools/wall/bake.py public/img/wall
"""
import os
import sys

import numpy as np
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


def stamp(field, cy, cx, r, fn):
    """Add fn(d / r) (zero outside 1) round (cy, cx), wrapped round the edges."""
    h, w = field.shape
    R = int(np.ceil(r + 2))
    ys = np.arange(int(cy) - R, int(cy) + R + 1)
    xs = np.arange(int(cx) - R, int(cx) + R + 1)
    yy, xx = np.meshgrid(ys, xs, indexing='ij')
    d = np.sqrt((yy - cy) ** 2 + (xx - cx) ** 2) / r
    v = np.where(d < 1, fn(np.clip(d, 0, 1)), 0.0)
    iy = (ys % h)[:, None].repeat(len(xs), 1)
    ix = (xs % w)[None, :].repeat(len(ys), 0)
    np.add.at(field, (iy, ix), v)


def crack_mask(size, n, rng, scale=2, width=1.0, length=(120, 420), branch=0.25, jitter=0.32):
    """Thin branching cracks as a soft mask 0..1, drawn supersampled and wrapped round the edges."""
    S = size * scale
    im = Image.new('L', (S, S), 0)
    dr = ImageDraw.Draw(im)

    def walk(x, y, ang, L, wd, depth=0):
        pts = [(x, y)]
        step = 5 * scale
        for _ in range(int(L * scale / step)):
            ang += rng.normal(0, jitter)
            x += np.cos(ang) * step
            y += np.sin(ang) * step
            pts.append((x, y))
            if depth < 2 and rng.random() < branch * 0.08:
                walk(x, y, ang + rng.choice([-1, 1]) * rng.uniform(0.5, 1.1), L * rng.uniform(0.25, 0.5), wd * 0.7, depth + 1)
        for ox in (-S, 0, S):
            for oy in (-S, 0, S):
                dr.line([(px + ox, py + oy) for px, py in pts], fill=255, width=max(1, int(round(wd * scale))))

    for _ in range(n):
        walk(rng.uniform(0, S), rng.uniform(0, S), rng.uniform(0, 2 * np.pi), rng.uniform(*length), width)
    return np.asarray(im.resize((size, size), Image.LANCZOS), dtype=np.float64) / 255


def save(a, name, q, size=None):
    img = Image.fromarray(np.clip(np.round(a * 255), 0, 255).astype(np.uint8), 'L')
    if size and size != img.width:
        # made smaller from a 3 x 3 tiling of itself, so the filter reads across the edges and the tile stays seamless
        n = img.width
        big = Image.new('L', (3 * n, 3 * n))
        for y in range(3):
            for x in range(3):
                big.paste(img, (x * n, y * n))
        img = big.resize((3 * size, 3 * size), Image.LANCZOS).crop((size, size, 2 * size, 2 * size))
    path = os.path.join(OUT, name)
    img.save(path, 'WEBP', quality=q, method=6)
    print(name, img.size, os.path.getsize(path) // 1024, 'KB', 'mean', round(float(a.mean()) * 255, 1), 'sd', round(float(a.std()) * 255, 1))


# ---------- height and albedo ----------
rng = np.random.default_rng(2611)
N = 1024
h = np.zeros((N, N))
a = np.zeros((N, N))

# the pour: broad, gentle undulation, and the cloudiness of the cement paste
h += 0.55 * spectral((N, N), 2.3, rng)
a += 0.05 * spectral((N, N), 1.7, rng)
# the formwork's plywood: a faint horizontal grain pressed into the face
h += 0.16 * spectral((N, N), 1.4, rng, stretch=(1.0, 0.09))
# sand: the fine tooth of the surface
g = blur(rng.standard_normal((N, N)), 0.6)
g /= g.std()
h += 0.2 * g
a += 0.02 * g
# aggregate showing through the paste: specks, mostly lighter (limestone), some darker
for _ in range(2600):
    r = rng.lognormal(np.log(1.0), 0.45)
    v = rng.choice([1, 1, 1, -1]) * rng.uniform(0.03, 0.1)
    stamp(a, rng.uniform(0, N), rng.uniform(0, N), r + 0.6, lambda d, v=v: v * np.clip((1 - d) * 2.2, 0, 1))
# bug holes: the air the pour trapped against the form; clustered in bands, as a pour lays them
band = 0.5 + 0.5 * np.sin(np.linspace(0, 2 * np.pi * 3, N))
for _ in range(420):
    cy = rng.uniform(0, N)
    if rng.random() > 0.35 + 0.65 * band[int(cy) % N]:
        continue
    cx = rng.uniform(0, N)
    r = min(8.0, rng.lognormal(np.log(1.7), 0.55))
    stamp(h, cy, cx, r, lambda d, r=r: -1.9 * r * (1 - d * d) ** 1.5)
    stamp(a, cy, cx, r * 0.7, lambda d, r=r: -(0.06 + 0.02 * r) * (1 - d * d))
# crazing: a fine network of hairline cracks, shallow and darker
cr = crack_mask(N, 4, rng, width=1.0, length=(70, 220), branch=0.45)
h -= 0.55 * cr
a -= 0.035 * cr

# dirt settles in what is low: darken the albedo where the surface dips below its neighbourhood
cav = blur(h, 2.5) - h
a -= 0.05 * np.clip(cav, 0, None)

h = (h - h.mean()) / (h.std() * 7.0) + 0.5   # about 3.5 standard deviations either side of the mean in range
a = a - a.mean() + 0.5
a = (a - 0.5) * 1.6 + 0.5
save(np.clip(h, 0, 1), 'wall-h.webp', q=84, size=768)
save(np.clip(a, 0, 1), 'wall-a.webp', q=82, size=512)


# ---------- the cellular noise of every edge ----------
def worley(size, cells, rng):
    """F1 distance to jittered points, one per cell of a cells x cells grid, periodic; normalised to about 0..1."""
    pts = rng.random((cells, cells, 2))
    yy, xx = np.meshgrid(np.arange(size) + 0.5, np.arange(size) + 0.5, indexing='ij')
    u, v = yy * cells / size, xx * cells / size
    iu, iv = np.floor(u).astype(int), np.floor(v).astype(int)
    best = np.full((size, size), 9.0)
    for du in (-1, 0, 1):
        for dv in (-1, 0, 1):
            cu, cv = iu + du, iv + dv
            p = pts[cu % cells, cv % cells]
            d = np.sqrt((cu + p[..., 0] - u) ** 2 + (cv + p[..., 1] - v) ** 2)
            best = np.minimum(best, d)
    return best / 1.1


rng = np.random.default_rng(1404)
M = 512
n = np.zeros((M, M))
amp, tot = 1.0, 0.0
for cells in (4, 8, 16, 32, 64):
    n += amp * worley(M, cells, rng)
    tot += amp
    amp *= 0.55
n /= tot
n = (n - n.min()) / (n.max() - n.min())
save(n, 'wall-n.webp', q=92)
