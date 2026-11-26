# The 3D door's surfaces, made here: architectural concrete for the two slabs (cast in formwork panels, with their
# tie holes, pour lines, pores and weather streaks), the same as a tile for the wall round them, and a wet stone floor.
# Each as three pictures: colour, a normal map (the relief the light rakes across) and one of occlusion (R) and
# roughness (G).   python3 tools/door3d/textures.py   ->  tools/door3d/out/*.webp
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

OUT = 'tools/door3d/out/'
import os
os.makedirs(OUT, exist_ok=True)


def fbm(h, w, beta, seed, stretch=(1.0, 1.0)):
    """Noise with a 1/f^beta spectrum (periodic, so it tiles); stretch < 1 on an axis draws it out along that axis."""
    rng = np.random.default_rng(seed)
    white = rng.standard_normal((h, w))
    fy = np.fft.fftfreq(h)[:, None] / stretch[0]
    fx = np.fft.fftfreq(w)[None, :] / stretch[1]
    f = np.sqrt(fx ** 2 + fy ** 2)
    f[0, 0] = 1.0
    spec = np.fft.fft2(white) / np.power(f, beta / 2)
    spec[0, 0] = 0
    out = np.real(np.fft.ifft2(spec))
    return (out - out.mean()) / out.std()


def discs(h, w, pts, radius, wrap=False):
    """A soft-edged disc of the given radius at each point."""
    m = np.zeros((h, w), np.float32)
    for y, x in pts:
        yy, xx = int(round(y)), int(round(x))
        if wrap:
            m[yy % h, xx % w] = 1
        elif 0 <= yy < h and 0 <= xx < w:
            m[yy, xx] = 1
    k = int(np.ceil(radius)) * 2 + 3
    ky, kx = np.mgrid[:k, :k] - k // 2
    kern = np.clip(radius + 0.5 - np.sqrt(ky ** 2 + kx ** 2), 0, 1).astype(np.float32)
    return np.clip(ndi.convolve(m, kern, mode='wrap' if wrap else 'constant'), 0, 1)


def concrete(w, h, ppm, seed, panel=(1.233, 2.6), tile=False, edges=True):
    """One cast surface, w x h pixels at ppm pixels per metre; panel: the formwork panel's width and height in metres."""
    rng = np.random.default_rng(seed)
    mott = fbm(h, w, 3.3, seed + 1)
    mid = fbm(h, w, 2.1, seed + 2)
    fine = fbm(h, w, 0.8, seed + 3)
    streak = fbm(h, w, 2.6, seed + 4, stretch=(14.0, 1.0))        # long vertical weather marks
    lift = fbm(h, w, 2.4, seed + 5, stretch=(1.0, 9.0))           # faint horizontal pour lines
    lum = 0.46 * (1 + 0.20 * np.tanh(mott * 0.8) + 0.085 * mid + 0.03 * fine)
    lum *= 1 - 0.11 * np.clip(streak, 0, 2.6) / 2.6
    lum *= 1 + 0.03 * np.tanh(lift)
    height = 0.55 * np.tanh(mott * 0.7) * 0.25 + 0.10 * mid + 0.06 * fine      # arbitrary units; pits and holes go below
    rough = 0.88 + 0.06 * np.tanh(mid) - 0.05 * np.tanh(mott)
    ao = np.ones((h, w), np.float32)

    # formwork panels: each a little lighter or darker than its neighbours, seams between them
    pw, ph = panel[0] * ppm, panel[1] * ppm
    xs = np.arange(0, w + 1, pw)
    ys = np.arange(0, h + 1, ph)
    yy, xx = np.mgrid[:h, :w]
    pi, pj = np.minimum((xx // pw).astype(int), len(xs) - 1), np.minimum((yy // ph).astype(int), len(ys) - 1)
    tone = rng.normal(0, 0.035, (len(ys) + 1, len(xs) + 1))
    lum *= 1 + tone[pj, pi]
    seam = np.zeros((h, w), np.float32)
    for x in xs[(1 if not tile else 0):]:
        xi = int(round(x)) % w if tile else int(round(x))
        if 0 < xi < w - 1 or tile: seam[:, max(0, xi - 1):xi + 1] = 1
    for y in ys[(1 if not tile else 0):]:
        yi = int(round(y)) % h if tile else int(round(y))
        if 0 < yi < h - 1 or tile: seam[max(0, yi - 1):yi + 1, :] = 1
    seam_soft = ndi.gaussian_filter(seam, 1.1, mode='wrap')
    lum *= 1 - 0.34 * np.clip(seam_soft * 1.6, 0, 1)
    height -= 0.9 * np.clip(seam_soft * 1.6, 0, 1)
    ao *= 1 - 0.35 * ndi.gaussian_filter(seam, 3.0, mode='wrap') * 2

    # tie holes: four to a panel, a hand's breadth in from its corners
    pts = []
    for x0 in xs[:-1] if not tile else xs[:-1]:
        for y0 in ys[:-1] if not tile else ys[:-1]:
            for fx in (0.22, 0.78):
                for fy in (0.2, 0.8):
                    pts.append((y0 + fy * ph, x0 + fx * pw))
    r = 0.019 * ppm
    hole = discs(h, w, pts, r, wrap=tile)
    rim = np.clip(discs(h, w, pts, r + 2.2, wrap=tile) - hole, 0, 1)
    lum = lum * (1 - 0.72 * hole) * (1 + 0.10 * rim)
    height -= 2.6 * ndi.gaussian_filter(hole, 1.0, mode='wrap')
    ao *= 1 - 0.75 * hole
    # (a dark tear of weather under each hole)
    tear = ndi.gaussian_filter(np.roll(hole, int(0.05 * ppm), axis=0), (0.11 * ppm, 1.6), mode='wrap')
    lum *= 1 - 0.5 * np.clip(tear * 6, 0, 0.22)

    # pores: the small pits air leaves in a cast face, in three sizes
    for radius, per_m2, depth in ((0.7, 520, 0.35), (1.5, 150, 0.6), (2.8, 26, 0.9)):
        n = int(per_m2 * (w / ppm) * (h / ppm))
        pp = np.column_stack([rng.uniform(0, h, n), rng.uniform(0, w, n)])
        d = discs(h, w, pp, radius, wrap=True)
        lum *= 1 - 0.42 * d
        height -= depth * d
        rough += 0.06 * d
        ao *= 1 - 0.3 * d

    if edges:   # the slab's own arrises: a hair of wear along its long edges
        e = np.minimum(xx, w - 1 - xx).astype(np.float32)
        wear = np.clip(1 - e / 5.0, 0, 1) * (0.5 + 0.5 * np.tanh(fbm(h, w, 1.6, seed + 9) * 1.2))
        lum *= 1 + 0.16 * wear
        height -= 0.5 * np.clip(1 - e / 3.0, 0, 1)

    gy, gx = np.gradient(ndi.gaussian_filter(height, 0.6, mode='wrap'))
    k = 2.3
    nx, ny, nz = -gx * k, gy * k, np.ones_like(gx)
    ln = np.sqrt(nx ** 2 + ny ** 2 + nz ** 2)
    normal = np.dstack([nx / ln, ny / ln, nz / ln]) * 0.5 + 0.5
    # colour: a cool neutral grey, the darker parts a touch warmer
    lum = np.clip(lum, 0.02, 1)
    rgb = np.dstack([lum * (1.0 + 0.012 * (0.46 - lum) / 0.46), lum * 1.004, lum * (1.03 - 0.02 * (0.46 - lum) / 0.46)])
    orm = np.dstack([np.clip(ao, 0, 1), np.clip(rough, 0.55, 1), np.zeros_like(ao)])
    return rgb, normal, orm


def save(name, arr, q=88):
    Image.fromarray(np.clip(arr * 255 + 0.5, 0, 255).astype(np.uint8)).save(OUT + name, quality=q, method=6)
    print(name, arr.shape[1], 'x', arr.shape[0])


# ---- a slab: 3.7 m x 13 m
W, H = 768, 2704
rgb, n, orm = concrete(W, H, W / 3.7, 11)
save('slab-c.webp', rgb, 86); save('slab-n.webp', n, 92); save('slab-o.webp', orm, 84)
# ---- the wall round the door, as a tile: 4.932 m x 5.2 m (four panels across, two up)
T = 1024
rgb, n, orm = concrete(T, 1080, T / 4.932, 37, tile=True, edges=False)
save('wall-c.webp', rgb, 86); save('wall-n.webp', n, 92); save('wall-o.webp', orm, 84)

# ---- the floor: wet stone, a tile 8 m square. R: how wet (pools), G: the joints between its slabs, B: fine grain;
# and a second picture, the small ripples that break a reflection up, as two slopes (R, G)
F = 1024
pools = fbm(F, F, 3.0, 71)
pools = np.clip((pools + 0.15) * 1.1, -2, 2)
wet = 1 / (1 + np.exp(-pools * 2.2))
yy, xx = np.mgrid[:F, :F]
sw, sh = F / 4, F / 8            # stone slabs 2 m x 1 m, each course half a slab along from the last
row = (yy // sh).astype(int)
xo = (xx + (row % 2) * sw / 2) % sw
joint = np.clip(1 - np.minimum(np.minimum(xo, sw - xo), np.minimum(yy % sh, sh - (yy % sh))) / 1.6, 0, 1)
joint = ndi.gaussian_filter(joint.astype(np.float32), 0.8, mode='wrap')
grain = fbm(F, F, 1.2, 73) * 0.5 + 0.5
save('floor-m.webp', np.dstack([wet, np.clip(joint * 1.4, 0, 1), np.clip(grain, 0, 1)]), 86)
rip = ndi.gaussian_filter(fbm(512, 512, 1.9, 75), 1.2, mode='wrap')
gy, gx = np.gradient(rip)
s = 1 / max(np.abs(gx).max(), np.abs(gy).max())
save('floor-r.webp', np.dstack([gx * s * 0.5 + 0.5, gy * s * 0.5 + 0.5, np.full_like(gx, 0.5)]), 90)

# ---- soft drifting noise for fog and for the light in the air (tileable, one channel each: R broad, G finer, B streaks)
a = fbm(512, 512, 3.2, 81); b = fbm(512, 512, 2.2, 82); c = fbm(512, 512, 2.6, 83, stretch=(1.0, 10.0))
norm = lambda v: np.clip(v * 0.22 + 0.5, 0, 1)
save('haze.webp', np.dstack([norm(a), norm(b), norm(c)]), 82)

# ---- the club's glowing sign as a card of light (drawn by raster.mjs from the club's artwork): halved, for the page
sign = Image.open(OUT + 'sign-on-black.png').convert('RGB').resize((256, 1194), Image.LANCZOS)
sign.save(OUT + 'sign.webp', quality=92, method=6)
core = Image.open(OUT + 'sign-core-on-black.png').convert('RGB').resize((256, 1194), Image.LANCZOS)
core.save(OUT + 'sign-core.webp', quality=92, method=6)
print('sign 256 x 1194')
