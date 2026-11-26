# A sheet of black liquid metal, drawn from nothing: a smooth folded surface (waves bent by other waves), lit as
# polished metal is, by what it reflects: a dark room with a few long soft lights. Cold, mostly black.
#   python3 flow.py <out.png> [seed] [steepness]
import sys
import numpy as np
from PIL import Image
out = sys.argv[1]; seed = int(sys.argv[2]) if len(sys.argv) > 2 else 7; steep = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
W, H = 2400, 1350
y, x = np.mgrid[0:H, 0:W].astype(np.float32)
u = x / W * 2.0; v = y / W * 2.0
def waves(u, v, n, s, f0, f1):
    r = np.random.default_rng(s); o = np.zeros_like(u)
    for _ in range(n):
        a = r.uniform(0, 2 * np.pi); f = r.uniform(f0, f1); ph = r.uniform(0, 2 * np.pi)
        o += np.sin((u * np.cos(a) + v * np.sin(a)) * f * 2 * np.pi + ph) / f
    return o
wu = waves(u, v, 3, seed + 1, .3, .7) * .22
wv = waves(u, v, 3, seed + 2, .3, .7) * .22
uu, vv = u + wu, v + wv
h = waves(uu, vv, 4, seed + 3, .35, .95) * .5 + waves(uu + wv * .5, vv + wu * .5, 2, seed + 4, 1.0, 1.5) * .06
gy, gx = np.gradient(h)
k = 300.0 * steep
nx, ny, nz = -gx * k, -gy * k, np.ones_like(h)
ln = np.sqrt(nx * nx + ny * ny + nz * nz); nx /= ln; ny /= ln; nz /= ln
rx, ry, rz = 2 * nz * nx, 2 * nz * ny, 2 * nz * nz - 1
def light(cx, cy, sx, sy, amp): return amp * np.exp(-(((rx - cx) / sx) ** 2 + ((ry - cy) / sy) ** 2))
env = light(-.28, -.5, .6, .16, .95) + light(.5, -.15, .16, .55, .42) + light(-.6, .4, .4, .13, .3) + light(.15, .68, .7, .1, .16) + light(0, -.1, .9, .9, .05)
rim = (1 - np.clip(rz, 0, 1)) ** 1.5
img = .012 + env * (.3 + .7 * rim) + rim * .035
img = np.clip(img, 0, 1) ** .9
rgb = np.stack([img * .95, img * .975, img * 1.02], -1)
Image.fromarray((np.clip(rgb, 0, 1) * 255).astype(np.uint8)).save(out)
print(out, float(img.mean()))
