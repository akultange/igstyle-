"""The kitchen's drawing for the line-art set (src/data/lineart.ts, 'cloche'), built the way the set was: the objects in
3D, projected through the set's one camera (a near elevation, looking down 12.5 degrees, a long lens: parallel
projection), the hidden lines removed, every ellipse exact.

A silver cloche on a dinner plate, its front lifted a little: the warm light of the dish inside spills out under the
lifted edge onto the plate (the door's idea, light through a gap), and two threads of steam rise out of it.

    python3 tools/lineart/cloche.py > /tmp/cloche.ts     (then paste the entry into src/data/lineart.ts)

Units are millimetres; the drawing's box is 480 x 600.
"""
import math
import sys

import numpy as np

TH = math.radians(12.5)          # the camera looks down this much
ALPHA = math.radians(16.5)       # the cloche's front is lifted this much, hinged on its back edge: a little past
                                 # the camera's own tilt, so the eye sees just inside the lifted rim
S = 1.12                         # drawing units per millimetre
CX, CY = 240.0, 508.0            # where the table's centre lands in the drawing
VIEW = np.array([0.0, math.sin(TH), math.cos(TH)])   # towards the camera


def proj(p):
    """World (x right, y up, z towards the viewer) to the drawing."""
    p = np.asarray(p, float)
    x, y, z = p[..., 0], p[..., 1], p[..., 2]
    return np.stack([CX + S * x, CY - S * (y * math.cos(TH) - z * math.sin(TH))], -1)


def fmt(v):
    s = f'{v:.1f}'.rstrip('0').rstrip('.')
    return '0' if s in ('-0', '') else s


def path(pts):
    """A polyline in the drawing as path data (absolute M, then relative l: short and exact enough)."""
    pts = np.asarray(pts)
    out = [f'M{fmt(pts[0][0])} {fmt(pts[0][1])}']
    px, py = round(pts[0][0], 1), round(pts[0][1], 1)
    for x, y in pts[1:]:
        x, y = round(x, 1), round(y, 1)
        dx, dy = x - px, y - py
        if abs(dx) < 0.05 and abs(dy) < 0.05:
            continue
        out.append(f'l{fmt(dx)} {fmt(dy)}' if dy < 0 else f'l{fmt(dx)} {fmt(dy)}')
        px, py = x, y
    return ''.join(out).replace(' -', '-')


def length(pts):
    pts = np.asarray(pts)
    return float(np.sum(np.hypot(*np.diff(pts, axis=0).T)))


# ---------- the plate (on the table, y = 0) ----------
WELL_Y, WELL_R = 5.0, 98.0       # the well's floor and its edge
RIM_R, RIM_Y = 152.0, 17.0       # the rim's outer edge, its top
EDGE = 4.0                       # the rim's thickness at the edge
BAND_R = 140.0                   # a fine band near the rim's edge


def rim_y(r):
    """The rim rises from the well's edge to its outer edge, a little curved."""
    t = (r - WELL_R) / (RIM_R - WELL_R)
    return WELL_Y + (RIM_Y - WELL_Y) * (t ** 0.8)


def circle(r, y, a0=0.0, a1=2 * math.pi, n=240, cx=0.0, cz=0.0):
    a = np.linspace(a0, a1, n)
    return np.stack([cx + r * np.cos(a), np.full_like(a, y), cz + r * np.sin(a)], -1)


# ---------- the cloche: a surface of revolution (its own axis), then lifted at the front ----------
LIP_R = 93.0
PROFILE = [(LIP_R, 0.0), (LIP_R + 3.2, 1.6), (LIP_R + 4.0, 4.0)]   # the lip: a little flare at the foot
DOME_R, DOME_Y0, DOME_H = LIP_R + 4.0, 4.0, 106.0
for k in range(1, 61):
    t = k / 60
    y = DOME_Y0 + DOME_H * t
    # a classic cloche: a half ellipsoid, the shoulders a touch fuller
    r = DOME_R * (1 - t ** 2.15) ** 0.5
    PROFILE.append((max(r, 0.0), y))
PROF = np.array(PROFILE)
TOP_Y = DOME_Y0 + DOME_H
# the knob: a short stem and a flattened ball
STEM_R, STEM_Y0, STEM_Y1 = 6.5, TOP_Y - 3.0, TOP_Y + 9.0
KNOB_C, KNOB_RX, KNOB_RY = TOP_Y + 19.0, 15.0, 11.0

PIVOT = np.array([0.0, WELL_Y, -LIP_R])          # the back of the lip, resting on the well
CA, SA = math.cos(ALPHA), math.sin(ALPHA)


def lift(p):
    """Local cloche coordinates (y up its axis, its foot centred on the well) to the world: the front lifted."""
    p = np.asarray(p, float)
    q = p + np.array([0.0, WELL_Y, 0.0]) - PIVOT
    y = q[..., 1] * CA + q[..., 2] * SA
    z = -q[..., 1] * SA + q[..., 2] * CA
    return np.stack([q[..., 0], y, z], -1) + PIVOT


def lift_dir(v):
    v = np.asarray(v, float)
    y = v[..., 1] * CA + v[..., 2] * SA
    z = -v[..., 1] * SA + v[..., 2] * CA
    return np.stack([v[..., 0], y, z], -1)


def surf(r, y, phi):
    return lift(np.stack([r * np.cos(phi), np.full_like(phi, y), r * np.sin(phi)], -1))


def normal(i, phi):
    """The outward normal of the profile's i-th ring at angle phi (in the world)."""
    j0, j1 = max(i - 1, 0), min(i + 1, len(PROF) - 1)
    dr, dy = PROF[j1, 0] - PROF[j0, 0], PROF[j1, 1] - PROF[j0, 1]
    n = np.stack([dy * np.cos(phi), -dr * np.ones_like(phi), dy * np.sin(phi)], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return lift_dir(n)


# The outline: where the surface turns away from the camera. For each ring, the two angles where the normal is at
# right angles to the view; the two branches meet over the back of the dome.
left, right = [], []
W = lift_dir(np.eye(3)).T @ VIEW   # (not used directly; kept for clarity)
w = np.array([0.0, math.sin(TH - ALPHA), math.cos(TH - ALPHA)])  # the view in the cloche's own frame
for i in range(len(PROF)):
    j0, j1 = max(i - 1, 0), min(i + 1, len(PROF) - 1)
    dr, dy = PROF[j1, 0] - PROF[j0, 0], PROF[j1, 1] - PROF[j0, 1]
    # n_local = (dy cos phi, -dr, dy sin phi); n . w = 0  ->  dy sin(phi) w_z = dr w_y
    if abs(dy) < 1e-9:
        continue
    s = dr * w[1] / (dy * w[2])
    if abs(s) > 1:
        break
    a = math.asin(s)
    r, y = PROF[i]
    right.append(surf(np.array([r]), y, np.array([a]))[0])
    left.append(surf(np.array([r]), y, np.array([math.pi - a]))[0])
outline3 = np.array(left + right[::-1])
outline = proj(outline3)

# the lip's front: its foot, from the right through the front to the left (the side towards us)
lip_front = proj(surf(np.full(200, LIP_R), 0.0, np.linspace(0.02, math.pi - 0.02, 200)))
lip_top = proj(surf(np.full(200, LIP_R + 3.6), 2.6, np.linspace(0.05, math.pi - 0.05, 200)))
# the lip's back half: seen from inside, through the opening (the eye is a little below the lifted rim's plane)
lip_back = proj(surf(np.full(200, LIP_R), 0.0, np.linspace(math.pi + 0.02, 2 * math.pi - 0.02, 200)))
lower = lip_back if lip_back[100, 1] > lip_front[100, 1] else lip_front
# the cloche's footprint in the drawing, the opening under its rim included: what it hides
shape = np.vstack([outline, lower[::-1] if lower is lip_front else lower])


def inside(pt, poly):
    x, y = pt
    n = len(poly)
    c = False
    j = n - 1
    for i in range(n):
        xi, yi = poly[i]
        xj, yj = poly[j]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi):
            c = not c
        j = i
    return c


def visible_runs(pts3, hide=True, min_len=3):
    """Split a 3D polyline into the runs the cloche doesn't hide, in the drawing."""
    p2 = proj(pts3)
    runs, cur = [], []
    for q in p2:
        if hide and inside(q, shape):
            if len(cur) > 1:
                runs.append(np.array(cur))
            cur = []
        else:
            cur.append(q)
    if len(cur) > 1:
        runs.append(np.array(cur))
    return [r for r in runs if length(r) >= min_len]


def front(points3, normals3):
    """Only the parts of a line on the cloche that face the camera."""
    keep = normals3 @ VIEW > 0.02
    runs, cur = [], []
    for k, q in zip(keep, proj(points3)):
        if k:
            cur.append(q)
        elif len(cur) > 1:
            runs.append(np.array(cur))
            cur = []
        else:
            cur = []
    if len(cur) > 1:
        runs.append(np.array(cur))
    return runs


contour, detail, hint = [], [], []

# --- the plate
contour += visible_runs(circle(RIM_R, RIM_Y, n=520))                                    # the rim's edge
contour += visible_runs(circle(RIM_R, RIM_Y - EDGE, 0.0, math.pi, n=260))               # the edge's thickness, in front
for sx in (-1, 1):                                                                       # its two ends
    contour.append(proj(np.array([[sx * RIM_R, RIM_Y, 0.0], [sx * RIM_R, RIM_Y - EDGE, 0.0]])))
detail += visible_runs(circle(WELL_R, WELL_Y, n=420))                                    # where the well meets the rim
hint += visible_runs(circle(BAND_R, rim_y(BAND_R), n=420))                               # the fine band on the rim
hint += visible_runs(circle(BAND_R - 3.0, rim_y(BAND_R - 3.0), n=420))

# --- the cloche: its outline, broken at the top left where the lamp catches its shoulder
o = outline
d = np.hypot(*np.diff(o, axis=0).T)
s_along = np.concatenate([[0], np.cumsum(d)])
tot = s_along[-1]
gap0, gap1 = 0.205 * tot, 0.245 * tot          # the catch-light on the left shoulder
contour.append(o[s_along <= gap0])
contour.append(o[s_along >= gap1])
contour.append(lip_front)                       # the lip's foot, lifted off the plate
detail.append(lip_top)                          # the lip's upper edge (its flare)

# reflections on the polished dome: the lamp as a narrow window on the left (two meridians), the plate's rim as a
# band low across the front
for ph in (math.radians(128), math.radians(136)):
    idx = [i for i in range(len(PROF)) if 14 <= PROF[i, 1] <= 92]
    pts = np.array([surf(np.array([PROF[i, 0]]), PROF[i, 1], np.array([ph]))[0] for i in idx])
    nrm = np.array([normal(i, np.array([ph]))[0] for i in idx])
    detail += front(pts, nrm)
for yy, a0, a1 in ((17.0, 0.55, 2.55), (21.5, 0.75, 2.35)):
    i = int(np.argmin(np.abs(PROF[:, 1] - yy)))
    ph = np.linspace(a0, a1, 160)
    pts = surf(np.full_like(ph, PROF[i, 0]), PROF[i, 1], ph)
    detail += front(pts, normal(i, ph)) if yy < 20 else []
# --- the knob: its stem and its ball (seen almost from the side: an ellipse and two short lines)
st = [lift(np.array([[sx * STEM_R, STEM_Y0, 0.0], [sx * STEM_R, STEM_Y1, 0.0]])) for sx in (-1, 1)]
for s_ in st:
    detail.append(proj(s_))
a = np.linspace(0, 2 * math.pi, 220)
# the ball's outline, nearly an ellipse: its widest ring and its top and bottom
ball = lift(np.stack([KNOB_RX * np.cos(a), KNOB_C + KNOB_RY * np.sin(a), np.zeros_like(a)], -1))
contour.append(proj(ball))
hint.append(proj(lift(np.stack([KNOB_RX * 0.62 * np.cos(np.linspace(2.0, 2.9, 40)), KNOB_C + KNOB_RY * 0.62 * np.sin(np.linspace(2.0, 2.9, 40)), np.full(40, 1.0)], -1))))
detail.append(proj(lift(np.stack([STEM_R * 1.6 * np.cos(np.linspace(0.1, math.pi - 0.1, 60)), np.full(60, STEM_Y1), STEM_R * 1.6 * np.sin(np.linspace(0.1, math.pi - 0.1, 60))], -1))))

# --- steam: two threads out of the gap at the front, rising and drifting, as the cigar's smoke does
lip_mid = proj(surf(np.array([LIP_R]), 0.0, np.array([math.pi / 2])))[0]
plate_front = proj(np.array([0.0, WELL_Y, LIP_R * 0.75]))
gap_y = (lip_mid[1] + plate_front[1]) / 2


def chaikin(p, k=4):
    for _ in range(k):
        q = np.empty((2 * (len(p) - 1), 2))
        q[0::2] = 0.75 * p[:-1] + 0.25 * p[1:]
        q[1::2] = 0.25 * p[:-1] + 0.75 * p[1:]
        p = np.vstack([p[:1], q, p[-1:]])
    return p


def hug(side, top, gap0, gap1, rise, sway, seed):
    """A thread of steam out from under the rim at one end, up along the dome's shoulder a little off it (steam hugs
    a warm lid), then off it and up, wavering and fading: side -1 the left, 1 the right; top: how far up the shoulder
    (0..1). Drawn through a few guide points and smoothed, as a hand would."""
    half = outline[: len(outline) // 2] if side < 0 else outline[len(outline) // 2:][::-1]   # bottom to top
    n = max(3, int(len(half) * top))
    seg = half[:n]
    tan = np.gradient(seg, axis=0)
    nrm = np.stack([tan[:, 1], -tan[:, 0]], -1) * (-1 if side > 0 else 1)
    nrm /= np.linalg.norm(nrm, axis=1, keepdims=True)
    if nrm[n // 2, 0] * side < 0:
        nrm = -nrm
    k = np.linspace(0, 1, n)
    hugging = seg + nrm * (gap0 + (gap1 - gap0) * k ** 1.2)[:, None]
    guide = [proj(surf(np.array([LIP_R]), 0.0, np.array([math.pi if side < 0 else 0.0])))[0] + [side * 2, -1]]
    guide += list(hugging[:: max(1, n // 5)])
    x0, y0 = hugging[-1]
    for j, t in enumerate(np.linspace(0.12, 1, 7)):
        guide.append([x0 + side * 14 * t ** 1.4 + sway * math.sin(2 * math.pi * 1.05 * t + seed + j * 0.2) * t, y0 - rise * t])
    return chaikin(np.array(guide), 5)


steam = [hug(-1, 0.6, 5, 24, 236, 12, 0.3), hug(1, 0.42, 4, 17, 150, 9, 2.2)]

# ---------- the light: the dish's warmth under the lifted edge, on the plate and on the lip's underside ----------
# the opening (between the rim's front, above, and its back, below), lit from inside: hottest at its middle
opening = np.vstack([lip_front, lip_back[::-1] if lip_back[0, 0] > lip_back[-1, 0] else lip_back])
ox, oy = float(np.mean(lip_front[:, 0])), float((lip_front[100, 1] + lip_back[100, 1]) / 2)
oh = abs(lip_back[100, 1] - lip_front[100, 1])
pool_y = float(proj(np.array([0.0, WELL_Y, LIP_R * 0.9]))[1])


def poly_d(p):
    return path(np.vstack([p, p[:1]])) + 'z'


def ell(cx, cy, rx, ry, id_, stops):
    return (f'<radialGradient id="{{id}}-{id_}" cx="{fmt(cx)}" cy="{fmt(cy)}" r="{fmt(rx)}" gradientTransform="translate({fmt(cx)} {fmt(cy)}) '
            f'scale(1 {fmt(ry / rx) if ry / rx >= 0.05 else round(ry / rx, 3)}) translate({fmt(-cx)} {fmt(-cy)})" gradientUnits="userSpaceOnUse">' + stops + '</radialGradient>')


defs = (
    ell(ox, oy, S * LIP_R * 1.02, max(oh, 4) * 0.9, 'd', '<stop offset="0" stop-color="#fff1d8" stop-opacity="1"/><stop offset=".3" stop-color="#ffdcab" stop-opacity=".9"/><stop offset=".75" stop-color="#e3963a" stop-opacity=".55"/><stop offset="1" stop-color="#e3963a" stop-opacity=".18"/>')
    + ell(ox, pool_y, S * 160, S * 160 * 0.2, 'p', '<stop offset="0" stop-color="#e3963a" stop-opacity=".5"/><stop offset=".45" stop-color="#e3963a" stop-opacity=".16"/><stop offset="1" stop-color="#e3963a" stop-opacity="0"/></radialGradient>'.replace('</radialGradient>', ''))
    + ell(ox, lip_front[100, 1] - 30, S * 120, 60, 'h', '<stop offset="0" stop-color="#e3963a" stop-opacity=".16"/><stop offset="1" stop-color="#e3963a" stop-opacity="0"/>')
    + '<linearGradient id="{id}-k" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ffdcab" stop-opacity=".7"/><stop offset=".22" stop-color="#ecece8" stop-opacity=".5"/><stop offset="1" stop-color="#ecece8" stop-opacity="0"/></linearGradient>'
    '<radialGradient id="{id}-s"><stop offset="0" stop-color="#000" stop-opacity=".7"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>'
)
shade_c = proj(np.array([0.0, 0.0, 0.0]))
shade = f'<ellipse cx="{fmt(shade_c[0])}" cy="{fmt(shade_c[1] + 6)}" rx="{fmt(S * 182)}" ry="{fmt(S * 182 * math.sin(TH) * 1.05)}" fill="url(#{{id}}-s)"/>'
light = (
    f'<ellipse cx="{fmt(ox)}" cy="{fmt(pool_y)}" rx="{fmt(S * 160)}" ry="{fmt(S * 160 * 0.2)}" fill="url(#{{id}}-p)"/>'
    f'<ellipse cx="{fmt(ox)}" cy="{fmt(lip_front[100, 1] - 30)}" rx="{fmt(S * 120)}" ry="60" fill="url(#{{id}}-h)"/>'
    f'<path d="{poly_d(opening)}" fill="url(#{{id}}-d)"/>'
    f'<path class="la-g" d="{path(lip_back)}" stroke="#ffdcab" stroke-width=".9" stroke-opacity=".85"/>'
    f'<path class="la-g" d="{path(lip_front[30:-30])}" stroke="#e3963a" stroke-width="1.6" stroke-opacity=".5"/>'
)


def group(runs):
    runs = [r for r in runs if len(r) > 1 and length(r) > 2]
    d = ''.join(path(r) for r in runs)
    longest = max(length(r) for r in runs)
    total = sum(length(r) for r in runs)
    return [d, round(total / longest, 2)]


C, D, H = group(contour), group(detail), group(hint)
steam_strokes = [[path(s_), 1, 'stroke:url(#{id}-k);stroke-opacity:1'] for s_ in steam[:1]] + [[path(s_), 1, 'stroke:url(#{id}-k);stroke-opacity:.6'] for s_ in steam[1:]]


def ts(x):
    if isinstance(x, list):
        return '[' + ', '.join(ts(v) for v in x) + ']'
    if isinstance(x, str):
        return "'" + x + "'"
    return fmt(x) if not float(x).is_integer() else str(int(x))


print("""  // A silver cloche on a dinner plate (a fine band round its rim), its front lifted a hand's width: the dish's warm
  // light spilling out under the lifted edge onto the plate, the lamp caught on the dome's left shoulder, two threads
  // of steam rising out of the gap. (tools/lineart/cloche.py builds it.)
  cloche: {
    box: [480, 600],
    alt: { ru: 'Серебряный колпак на тарелке, приподнятый: из-под края тёплый свет и пар', en: 'A silver cloche on a plate, lifted: warm light and steam from under its edge' },
    lines: {""")
print(f"      contour: [{ts(C)}],")
print(f"      detail: [{ts(D)}, {', '.join(ts(s) for s in steam_strokes)}],")
print(f"      hint: [{ts(H)}],")
print("    },")
print(f"    defs: '{defs}',")
print(f"    shade: '{shade}',")
print(f"    light: '{light}',")
print("  },")
sys.stderr.write(f'outline points {len(outline)}, contour {C[1]}, detail {D[1]}, hint {H[1]}, gap y {gap_y:.1f}\n')
