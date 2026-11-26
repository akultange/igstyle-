"""A Chesterfield club chair for the closing card's drawing (tools/lineart/guest.py): an English rolled-arm armchair
in deep-buttoned leather, as one would be built: a plinth on four bun feet; the arms and the back one horseshoe of
the same height, each wall padded and topped by a fat roll; the arm fronts flat, the roll's end a scroll with its
leather gathered in pleats round a button; deep diamond buttoning inside the back and the arms; a loose seat cushion;
a row of dome nailheads round the base and up the arm fronts.

Units are millimetres. The chair's own frame: x across (its left to right as you face it), y up, z out of its front.
"""
import math

import numpy as np

from engine import Field, Line, sd_round_box, sd_round_cone, sd_ellipsoid, smin, smax, smooth, surface_contour

W, D = 500.0, 445.0             # half its width; its depth from the back (-) to the front (+): -D .. +D
TOP = 760.0                     # the top of the rolls, arms and back alike
ROLL = 112.0                    # the roll's radius
ARM_IN = 285.0                  # the arms' inner faces (|x|)
BACK_IN = -232.0                # the back's inner face (z)
BASE = 108.0                    # the underside of the body, above the feet
SEAT = 462.0                    # the cushion's top
FRONT = 432.0                   # the arm fronts (z)

ARM_C = (W + ARM_IN) / 2        # the arm roll's centre line (|x|)
BACK_C = (-D + BACK_IN) / 2     # the back roll's centre line (z)
ROLL_Y = TOP - ROLL


def body(p):
    """The horseshoe of arms and back, on its plinth."""
    x, y, z = p[:, 0], p[:, 1], p[:, 2]
    # the walls: padded slabs below the rolls
    arm_w = smax(smax(np.abs(np.abs(x) - ARM_C) - (W - ARM_IN) / 2 + 6, np.abs(z - (FRONT - D) / 2) - (FRONT + D) / 2, 4),
                 np.abs(y - (BASE + ROLL_Y) / 2) - (ROLL_Y - BASE) / 2, 4)
    back_w = smax(smax(np.abs(z - BACK_C) - (BACK_IN + D) / 2 + 6, np.abs(x) - W + 6, 4),
                  np.abs(y - (BASE + ROLL_Y) / 2) - (ROLL_Y - BASE) / 2, 4)
    d = smin(arm_w, back_w, 30)
    # the rolls: a fat tube along each arm and across the back, turning the back corners
    for s in (-1, 1):
        d = smin(d, sd_round_cone(p, np.array([s * ARM_C, ROLL_Y, FRONT - 4]), np.array([s * ARM_C, ROLL_Y, BACK_C + 20]), ROLL, ROLL), 26)
    d = smin(d, sd_round_cone(p, np.array([-ARM_C + 20, ROLL_Y, BACK_C]), np.array([ARM_C - 20, ROLL_Y, BACK_C]), ROLL, ROLL), 26)
    # the plinth: the whole footprint, from the base up to the seat deck
    plinth = sd_round_box(p, np.array([0, (BASE + 318) / 2, (FRONT - D) / 2]), np.array([W - 4, (318 - BASE) / 2, (FRONT + D) / 2]), 10)
    d = smin(d, plinth, 10)
    # the arm fronts are cut flat, the back is flat behind
    d = smax(d, z - FRONT, 3)
    d = smax(d, -D - z, 3)
    return d


def cushion(p):
    return sd_round_box(p, np.array([0, (318 + SEAT) / 2, (BACK_IN + FRONT + 14) / 2]),
                        np.array([ARM_IN - 6, (SEAT - 318) / 2, (FRONT + 14 - BACK_IN) / 2]), 44)


def foot(p, s, t):
    c = np.array([s * (W - 62), 0, t * (D - 62) if t < 0 else FRONT - 62])
    d = sd_ellipsoid(p, c + np.array([0, 50, 0]), (52, 46, 52))
    d = smin(d, sd_round_cone(p, c + np.array([0, 10, 0]), c + np.array([0, 4, 0]), 30, 30), 8)
    return smax(d, p[:, 1] - BASE - 4, 2)


def parts():
    out = []
    def F(name, f, lo, hi, step):
        out.append((name, Field(f, lo, hi, step, name)))
    F('chair', body, [-W - 20, BASE - 20, -D - 20], [W + 20, TOP + 20, FRONT + 20], 5.0)
    F('cushion', cushion, [-ARM_IN, 300, BACK_IN - 20], [ARM_IN, SEAT + 20, FRONT + 40], 4.0)
    for i, (s, t) in enumerate(((-1, -1), (1, -1), (-1, 1), (1, 1))):
        F(f'foot{i}', lambda p, s=s, t=t: foot(p, s, t), [s * (W - 62) - 70, -4, (t * (D - 62) if t < 0 else FRONT - 62) - 70],
          [s * (W - 62) + 70, BASE + 10, (t * (D - 62) if t < 0 else FRONT - 62) + 70], 3.0)
    return out


def _circle(c, r, n=24, normal=(0, 0, 1.0)):
    normal = np.asarray(normal, float); normal /= np.linalg.norm(normal)
    u = np.cross(normal, [0, 1.0, 0]) if abs(normal[1]) < 0.9 else np.cross(normal, [1.0, 0, 0])
    u /= np.linalg.norm(u)
    v = np.cross(normal, u)
    a = np.linspace(0, 2 * math.pi, n)
    return c + np.outer(np.cos(a) * r, u) + np.outer(np.sin(a) * r, v)


def details(P):
    """The buttoning, the pleats, the nailheads, the seams: Lines on the chair's solids. P: name -> placed field."""
    out = []
    ch = P['chair']

    def snapped(pts, field=ch):
        """Points given in the chair's own frame, set into the world and laid onto the surface."""
        q = field.snap(field.world(np.asarray(pts, float)), 4)
        return q, field.grad(q)

    def add(pts, w=2, field=ch, tag=''):
        q, n = snapped(pts, field)
        out.append(Line(q, w, n, tag))

    # --- deep buttoning: a diamond grid inside the back and both arms ---
    rows = [512, 592, 672]
    # inside the back: buttons across, the middle row offset by half a step
    xs = np.arange(-ARM_IN + 66, ARM_IN - 40, 112.0)
    grid_b = []
    for i, y in enumerate(rows):
        off = 56.0 if i % 2 else 0.0
        grid_b.append([(x + off, y) for x in xs if -ARM_IN + 40 < x + off < ARM_IN - 40])
    # inside each arm: along z
    zs = np.arange(BACK_IN + 70, FRONT - 70, 112.0)
    grid_a = []
    for i, y in enumerate(rows):
        off = 56.0 if i % 2 else 0.0
        grid_a.append([(z + off, y) for z in zs if BACK_IN + 50 < z + off < FRONT - 60])

    def back_pt(x, y):
        return np.array([world_ok(x), y, BACK_IN + 60.0])

    def world_ok(v):
        return v

    def arm_pt(s, z, y):
        return np.array([s * (ARM_IN - 60.0), y, z])

    def tuft(points_fn, grid, tag):
        # buttons: small dimples, a ring each
        for row in grid:
            for a, b in row:
                c = points_fn(a, b)
                q, n = snapped(c[None])
                out.append(Line(q[0] + _circle(np.zeros(3), 7.5, 14, n[0]) + n[0] * 1.2, 2, np.repeat(n, 14, 0), tag + '-button'))
        # the creases: from each button to its diagonal neighbours above and below, a slight sag in the middle
        for i in range(len(grid) - 1):
            for a, b in grid[i]:
                for a2, b2 in grid[i + 1]:
                    if abs(a2 - a) < 60:
                        seg = np.array([points_fn(a + (a2 - a) * t, b + (b2 - b) * t) for t in np.linspace(0.12, 0.88, 9)])
                        add(seg, 2, tag=tag + '-crease')
        # the pleats from the top row up into the roll: short straight folds
        for a, b in grid[-1]:
            seg = np.array([points_fn(a, b + 14), points_fn(a, b + 70)])
            add(seg, 3, tag=tag + '-pleat')
        # and from the bottom row down into the seat: the leather tucked in
        for a, b in grid[0]:
            seg = np.array([points_fn(a, b - 14), points_fn(a, b - 52)])
            add(seg, 3, tag=tag + '-tuck')

    tuft(lambda a, b: back_pt(a, b), grid_b, 'back')

    # --- the outer back, buttoned too (a fully buttoned chair): a deeper diamond grid over the whole panel ---
    rows_o = [230, 322, 414, 506, 598]
    xs_o = np.arange(-W + 82, W - 60, 104.0)
    grid_o = []
    for i, y in enumerate(rows_o):
        off = 52.0 if i % 2 else 0.0
        grid_o.append([(x + off, y) for x in xs_o if -W + 60 < x + off < W - 60])
    tuft(lambda a, b: np.array([a, b, -D - 30.0]), grid_o, 'outback')
    for s in (-1, 1):
        tuft(lambda a, b, s=s: arm_pt(s, a, b), grid_a, f'arm{s}')

    # --- the scrolls: each arm's front, the roll's end gathered in pleats round a button ---
    for s in (-1, 1):
        c = np.array([s * ARM_C, ROLL_Y, FRONT + 2])
        q, n = snapped(c[None])
        out.append(Line(q[0] + n[0] * 1.5 + _circle(np.zeros(3), 10, 16, n[0]), 2, np.repeat(n, 16, 0), 'scroll-button'))
        # the pleats: gathered into the scroll's button, each a slightly turning fold, some running out short
        rng = np.random.default_rng(5 + s)
        for k in range(18):
            a0 = 2 * math.pi * k / 18 + rng.uniform(-.06, .06)
            frac = 1.0 if k % 3 else rng.uniform(.55, .75)
            rs = np.linspace(16, 16 + (ROLL - 24) * frac, 9)
            pts = [c + np.array([math.cos(a0 + s * .38 * (r - 16) / (ROLL - 24)) * r, math.sin(a0 + s * .38 * (r - 16) / (ROLL - 24)) * r, -0.02 * r])
                   for r in rs]
            add(np.array(pts), 2 if k % 2 == 0 else 3, tag='scroll-pleat')
        # the scroll's rim: the roll's end, its edge standing a little proud
        rim = np.array([c + np.array([math.cos(a) * (ROLL - 6), math.sin(a) * (ROLL - 6), 0]) for a in np.linspace(0, 2 * math.pi, 80)])
        add(rim, 2, tag='scroll-rim')
        # the scroll's seam: where the roll's end meets the flat panel below it
        arc = np.array([c + np.array([math.cos(a) * (ROLL - 2), math.sin(a) * (ROLL - 2), 0]) for a in np.linspace(math.pi * 1.05, math.pi * 1.95, 30)])
        add(arc, 2, tag='scroll-seam')

    # --- the nailheads: round the base, front and sides, and up the arm fronts' outer edges ---
    def nails(path_pts, step=26.0, r=6.0):
        path_pts = np.asarray(path_pts, float)
        seg = np.linalg.norm(np.diff(path_pts, axis=0), axis=1)
        t = np.concatenate([[0], np.cumsum(seg)])
        for d in np.arange(step / 2, t[-1], step):
            pnt = np.array([np.interp(d, t, path_pts[:, i]) for i in range(3)])
            q, n = snapped(pnt[None])
            ring = q[0] + n[0] * 2.5 + _circle(np.zeros(3), r, 10, n[0])
            out.append(Line(ring, 2, np.repeat(n, 10, 0), 'nail'))
    y_n = BASE + 38
    nails([[-W, y_n, FRONT - 20], [W * 0 - W, y_n, -D + 20]])            # the left side
    nails([[W, y_n, FRONT - 20], [W, y_n, -D + 20]])                      # the right side
    nails([[-W + 20, y_n, FRONT], [W - 20, y_n, FRONT]])                  # across the front of the plinth
    for s in (-1, 1):
        nails([[s * (W - 16), y_n + 30, FRONT], [s * (W - 16), ROLL_Y - 30, FRONT]])   # up each arm front's outer edge
        nails([[s * (ARM_IN + 16), SEAT + 40, FRONT], [s * (ARM_IN + 16), ROLL_Y - 30, FRONT]])  # and its inner edge
    nails([[-W + 20, y_n, -D], [W - 20, y_n, -D]])                                     # along the back's foot
    for s in (-1, 1):
        nails([[s * (W - 14), y_n + 30, -D], [s * (W - 14), ROLL_Y - 40, -D]])        # up its two sides
    # --- the seams: the welt round the plinth's top, the cushion's piping is its outline ---
    for s in (-1, 1):
        add(np.array([[s * W, 318, z] for z in np.linspace(FRONT - 10, -D + 10, 40)]), 2, tag='welt')
    add(np.array([[x, 318, FRONT] for x in np.linspace(-W + 10, W - 10, 60)]), 2, tag='welt')
    return out
