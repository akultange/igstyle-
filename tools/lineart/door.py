"""The house rules' drawing (src/data/lineart.ts, 'door'; also the 404 and goodbye pages): the club's door, close.
A heavy pivot door clad in the wall's own board-formed concrete (a door you would not find unless you knew), standing
open a little; through the gap, deep inside, the logo's needle of light, and its red spilling out over the threshold
and across the polished floor. Beside the door the manager's desk: a felt-lined tray with the guests' phones sealed in
their pouches, standing in a row, each with its round lock; the open guest book and a fountain pen across it; a
banker's lamp throwing its amber on the page. Built in 3D and drawn by engine.py through the set's camera.

    python3 tools/lineart/door.py > /tmp/door.ts          the entry for lineart.ts (and /tmp/door-preview.svg)
"""
import json
import math
import re
import sys

import numpy as np
import trimesh

sys.path.insert(0, __file__.rsplit('/', 1)[0])
from engine import (Camera, Field, Line, Scene, circle3, field_lines, fmt, group, path, plen, preview_svg, rot,
                    sd_ellipsoid, sd_round_box, sd_round_cone, sharp_edges, smax, smin, smooth, ts)

BOX = (600, 400)
cam = Camera(yaw=0.0, pitch=12.5, scale=0.158, cx=128.0, cy=318.0)
V = cam.view

# ---------- the wall and its door (millimetres; the wall's face is z = 0, the floor y = 0) ----------
OPEN_X0, OPEN_X1, OPEN_H = -700.0, 500.0, 2820.0    # the opening
WALL_T = 300.0                                       # the wall's thickness (the reveal)
HINGE = np.array([OPEN_X0 + 40, 0.0, -WALL_T / 2])   # the pivot, near the left jamb, in the wall's middle
DOOR_W, DOOR_T, DOOR_H = 1150.0, 90.0, 2790.0
DOOR_OPEN = 34.0                                     # degrees, swung inward

# the needle, inside, on the far wall
FAR_Z = -2600.0
NEEDLE_X, NEEDLE_SPUR, NEEDLE_LEN = 380.0, 1060.0, 1600.0

# the desk
DESK_X0, DESK_X1, DESK_Z0, DESK_Z1, DESK_H = 760.0, 1600.0, 420.0, 930.0, 1040.0


def box(lo, hi):
    lo, hi = np.asarray(lo, float), np.asarray(hi, float)
    m = trimesh.creation.box(hi - lo)
    m.apply_translation((lo + hi) / 2)
    return m


def wall_meshes():
    far = 4000.0
    left = box([-far, 0, -WALL_T], [OPEN_X0, 3600, 0])
    right = box([OPEN_X1, 0, -WALL_T], [far, 3600, 0])
    lintel = box([OPEN_X0, OPEN_H, -WALL_T], [OPEN_X1, 3600, 0])
    floor = box([-far, -40, FAR_Z], [far, 0, 3000])
    farwall = box([-far, 0, FAR_Z - 200], [far, 3600, FAR_Z])
    return left, right, lintel, floor, farwall


Rd = rot([0, 1, 0], DOOR_OPEN)   # the door turns about its pivot, inward (its free edge goes back, away from us)


def door_world(p):
    """Points in the door's own frame (x along its width from the pivot, y up, z through it: 0 its outer face) to the
    world."""
    return (np.asarray(p, float) @ Rd.T) + HINGE + np.array([0, 0, WALL_T / 2])


def door_mesh():
    m = box([-30, 6, -DOOR_T], [DOOR_W, DOOR_H, 0])
    m.vertices = door_world(m.vertices)
    return m


# ---------- the desk and what is on it ----------
def desk(p):
    x, y, z = p[:, 0], p[:, 1], p[:, 2]
    cx, cz = (DESK_X0 + DESK_X1) / 2, (DESK_Z0 + DESK_Z1) / 2
    hx, hz = (DESK_X1 - DESK_X0) / 2, (DESK_Z1 - DESK_Z0) / 2
    body = sd_round_box(p, np.array([cx, (110 + DESK_H - 44) / 2, cz]), np.array([hx - 30, (DESK_H - 44 - 110) / 2, hz - 30]), 6)
    top = sd_round_box(p, np.array([cx, DESK_H - 22, cz]), np.array([hx, 22, hz]), 5)
    plinth = sd_round_box(p, np.array([cx, 55, cz]), np.array([hx - 34, 55, hz - 34]), 3)
    return np.minimum(np.minimum(body, top), plinth)


TRAY = dict(cx=1290.0, cz=640.0, w=560.0, d=170.0, h=34.0)


def tray(p):
    c = np.array([TRAY['cx'], DESK_H + TRAY['h'] / 2, TRAY['cz']])
    outer = sd_round_box(p, c, np.array([TRAY['w'] / 2, TRAY['h'] / 2, TRAY['d'] / 2]), 6)
    inner = sd_round_box(p, c + np.array([0, 8, 0]), np.array([TRAY['w'] / 2 - 9, TRAY['h'] / 2, TRAY['d'] / 2 - 9]), 4)
    return smax(outer, -inner, 1.5)


POUCH_TILT = 14.0                                     # they lean back against the tray's back
POUCHES = [TRAY['cx'] - 225 + 90 * i for i in range(6)]
_Rp = rot([1, 0, 0], -POUCH_TILT)


def pouch_frame(i):
    o = np.array([POUCHES[i], DESK_H + 12, TRAY['cz'] - 10])
    return o


def pouch(p, i):
    o = pouch_frame(i)
    q = (p - o) @ _Rp                                  # into the pouch's own frame (upright)
    return sd_round_box(q, np.array([0, 92, 0]), np.array([40, 92, 9]), 8)


LAMP_AT = np.array([860.0, 1040.0, 520.0])


def lamp(p):
    """The dome lamp of the closing card's table, smaller: a round foot, a thin stem, a dome open below."""
    q = p - LAMP_AT
    r = np.hypot(q[:, 0], q[:, 2])
    base = smax(r - 58, np.abs(q[:, 1] - 8) - 8, 3)
    stem = sd_round_cone(q, np.array([0, 10.0, 0]), np.array([0, 270.0, 0]), 6, 5)
    dome = sd_ellipsoid(q, np.array([0, 262.0, 0]), (132, 92, 132))
    dome = smax(dome, -(sd_ellipsoid(q, np.array([0, 262.0, 0]), (125, 85, 125))), 1.5)
    dome = smax(dome, 262 - q[:, 1], 1.5)
    knob = sd_ellipsoid(q, np.array([0, 362.0, 0]), (13, 10, 13))
    return np.minimum(np.minimum(np.minimum(base, stem), dome), knob)


# ---------- the coat stand by the wall, a fedora on its hook ----------
STAND_AT = np.array([2050.0, 0.0, 300.0])


def stand(p):
    q = p - STAND_AT
    pole = sd_round_cone(q, np.array([0, 40.0, 0]), np.array([0, 1790.0, 0]), 16, 13)
    knob = sd_ellipsoid(q, np.array([0, 1800.0, 0]), (26, 22, 26))
    d = np.minimum(pole, knob)
    for k in range(3):                                                 # the feet, splayed
        a = math.radians(90 + k * 120)
        tip = np.array([math.cos(a) * 300, 8, math.sin(a) * 300])
        d = np.minimum(d, sd_round_cone(q, np.array([0, 140.0, 0]), tip, 14, 9))
    for k in range(4):                                                 # the hooks, curling up at their ends
        a = math.radians(45 + k * 90)
        o = np.array([math.cos(a), 0, math.sin(a)])
        h0 = np.array([0, 1700.0, 0]) + o * 10
        h1 = np.array([0, 1660.0, 0]) + o * 150
        h2 = np.array([0, 1700.0, 0]) + o * 190
        d = np.minimum(d, np.minimum(sd_round_cone(q, h0, h1, 8, 7), sd_round_cone(q, h1, h2, 7, 9)))
    return d


def fedora(p):
    """A fedora on the stand's front hook: a creased crown, pinched at the front, a ribbon band, a wide brim."""
    c = STAND_AT + np.array([0.0, 1728.0, 150.0])
    R = rot([1, 0, 0], 16) @ rot([0, 1, 0], -24)
    q = (p - c) @ R
    crown = sd_ellipsoid(q, np.array([0, 52.0, 0]), (84, 62, 100))
    crown = smax(crown, 2 - q[:, 1], 3)                                         # flat at its foot
    crown = smax(crown, -sd_ellipsoid(q, np.array([0, 124.0, -4]), (20, 40, 70)), 9)    # the centre dent
    for s_ in (1, -1):
        crown = smax(crown, -sd_ellipsoid(q, np.array([s_ * 76, 92.0, 58]), (22, 32, 26)), 8)   # the pinches
    brim = sd_ellipsoid(q, np.array([0, 4.0, 0]), (170, 5, 184))
    band = smax(sd_ellipsoid(q, np.array([0, 46.0, 0]), (87, 62, 103)), np.abs(q[:, 1] - 18) - 14, 2)
    return np.minimum(np.minimum(crown, brim), band)


BOOK = dict(cx=990.0, cz=760.0, w=440.0, d=290.0, th=26.0, ang=-6.0)


def book_lines():
    """The open guest book lying on the desk: two pages, the gutter, the leather cover's edge, ruled lines, a pen."""
    c = np.array([BOOK['cx'], DESK_H + BOOK['th'], BOOK['cz']])
    R = rot([0, 1, 0], BOOK['ang'])
    def P(u, v, h=0.0):
        return c + R @ np.array([u, h, v])
    W2, D2 = BOOK['w'] / 2, BOOK['d'] / 2
    out = []
    # the cover, a little larger than the pages, at the desk
    cov = [P(-W2 - 12, -D2 - 10, -BOOK['th']), P(W2 + 12, -D2 - 10, -BOOK['th']), P(W2 + 12, D2 + 10, -BOOK['th']), P(-W2 - 12, D2 + 10, -BOOK['th']), P(-W2 - 12, -D2 - 10, -BOOK['th'])]
    out.append(Line(np.array(cov), 1, None, 'book'))
    # the pages: each rises to the gutter a little
    for s in (-1, 1):
        pg = [P(0, -D2, 4), P(s * W2, -D2, 0), P(s * W2, D2, 0), P(0, D2, 4)]
        out.append(Line(np.array(pg), 1, None, 'page'))
        for k in range(1, 12):
            v = -D2 + k * (2 * D2) / 12
            if s > 0 and k > 7:
                continue                         # the right page is written only half way
            out.append(Line(np.array([P(s * 22, v, 2), P(s * (W2 - 26), v, 0)]), 3, None, 'rule'))
        # writing on the left page: a few short strokes on each ruled line
    out.append(Line(np.array([P(0, -D2, 4), P(0, D2, 4)]), 2, None, 'gutter'))
    # the fountain pen, across the right page
    a, b = P(70, 40, 9), P(W2 + 40, -70, 9)
    out.append(Line(np.array([a, b]), 1, None, 'pen'))
    return out, P


def pen(p):
    _, P = book_lines()
    a, b = P(70, 40, 9), P(BOOK['w'] / 2 + 40, -70, 9)
    return sd_round_cone(p, a, b, 4.5, 6.5)


def build():
    sc = Scene(cam)
    walls = wall_meshes()
    for m in walls:
        sc.solid(m)
    dm = door_mesh()
    sc.solid(dm)
    fields = [('desk', Field(desk, [DESK_X0 - 10, -4, DESK_Z0 - 10], [DESK_X1 + 10, DESK_H + 4, DESK_Z1 + 10], 4.0, 'desk')),
              ('tray', Field(tray, [TRAY['cx'] - 300, DESK_H - 4, TRAY['cz'] - 100], [TRAY['cx'] + 300, DESK_H + 50, TRAY['cz'] + 100], 2.0, 'tray')),
              ('lamp', Field(lamp, LAMP_AT + np.array([-150, -4, -150]), LAMP_AT + np.array([150, 380, 150]), 2.0, 'lamp')),
              ('stand', Field(stand, STAND_AT + np.array([-320, -4, -320]), STAND_AT + np.array([320, 1830, 320]), 4.0, 'stand')),
              ('fedora', Field(fedora, STAND_AT + np.array([-220, 1640, -60]), STAND_AT + np.array([220, 1900, 400]), 2.5, 'fedora')),
              ('pen', Field(pen, [1000, DESK_H, 600], [1320, DESK_H + 60, 900], 1.0, 'pen'))]
    for i in range(6):
        fields.append((f'pouch{i}', Field(lambda p, i=i: pouch(p, i), [POUCHES[i] - 60, DESK_H, TRAY['cz'] - 90], [POUCHES[i] + 60, DESK_H + 220, TRAY['cz'] + 70], 1.6, f'pouch{i}')))
    for n, f in fields:
        sc.solid(f.mesh())
    sc.build()
    return sc, walls, dm, dict(fields)


def main():
    sc, walls, dm, F = build()
    lines = []
    # the hard edges: the wall's opening, the floor's edge with the wall, the door
    for m in walls[:3]:
        for e in sharp_edges(m, V):
            lines.append(Line(e, 1, None, 'wall'))
    for e in sharp_edges(dm, V):
        lines.append(Line(e, 1, None, 'door'))
    # the floor line, outside and in
    lines.append(Line(np.array([[-4000, 0, 0.5], [OPEN_X0, 0, 0.5]]), 1, None, 'floor'))
    lines.append(Line(np.array([[OPEN_X1, 0, 0.5], [4000, 0, 0.5]]), 1, None, 'floor'))
    # the smooth things: their outlines
    for n, f in F.items():
        for ln in field_lines(f, cam, 1, min_len=2):
            ln.tag = n
            lines.append(ln)
    # the board-formed concrete: the boards' lines on the wall and, matching, on the door's face; the panels' joints
    rng = np.random.default_rng(4)
    for y in np.arange(160.0, 3500.0, 160.0):
        x = -3000.0
        while x < 3500:
            L = rng.uniform(300, 1100)
            a, b = x, min(x + L, 3500)
            if rng.uniform() < 0.75:
                for lo, hi in ((a, min(b, OPEN_X0)), (max(a, OPEN_X1), b)):
                    if hi - lo > 40:
                        lines.append(Line(np.array([[lo, y, 0.4], [hi, y, 0.4]]), 3, None, 'board'))
                if OPEN_X0 < x < OPEN_X1 and y > OPEN_H and rng.uniform() < 1:
                    lines.append(Line(np.array([[max(a, OPEN_X0), y, 0.4], [min(b, OPEN_X1), y, 0.4]]), 3, None, 'board'))
            x += L + rng.uniform(40, 160)
        # on the door's face, the same boards, so the door disappears into the wall when shut
        if y < DOOR_H - 20:
            u0 = rng.uniform(0, 120)
            lines.append(Line(door_world(np.array([[u0, y, 0.6], [DOOR_W - rng.uniform(0, 140), y, 0.6]])), 3, None, 'door-board'))
    for x in (-1900.0, -1300.0, 1100.0, 1700.0, 2300.0):
        lines.append(Line(np.array([[x, 0, 0.4], [x, 3600, 0.4]]), 2, None, 'joint'))
    # the door's pull: a long steel bar standing off its face near the free edge
    pull = door_world(np.array([[DOOR_W - 120, 900, 60], [DOOR_W - 120, 2100, 60]]))
    lines.append(Line(pull, 1, None, 'pull'))
    for yy in (980.0, 2020.0):
        lines.append(Line(door_world(np.array([[DOOR_W - 120, yy, 0.5], [DOOR_W - 120, yy, 60]])), 1, None, 'pull'))
    # the threshold: a steel plate across the opening's floor
    lines.append(Line(np.array([[OPEN_X0, 2, -20], [OPEN_X1, 2, -20]]), 2, None, 'threshold'))
    lines.append(Line(np.array([[OPEN_X0, 2, -WALL_T + 20], [OPEN_X1, 2, -WALL_T + 20]]), 2, None, 'threshold'))
    # the desk: the top's leather inlay, the plinth's shadow line
    cx, cz = (DESK_X0 + DESK_X1) / 2, (DESK_Z0 + DESK_Z1) / 2
    inlay = np.array([[DESK_X0 + 50, DESK_H + .6, DESK_Z0 + 50], [DESK_X1 - 50, DESK_H + .6, DESK_Z0 + 50], [DESK_X1 - 50, DESK_H + .6, DESK_Z1 - 50], [DESK_X0 + 50, DESK_H + .6, DESK_Z1 - 50], [DESK_X0 + 50, DESK_H + .6, DESK_Z0 + 50]])
    lines.append(Line(inlay, 2, None, 'inlay'))
    for x in np.arange(DESK_X0 + 64, DESK_X1 - 40, 34.0):
        lines.append(Line(np.array([[x, 140, DESK_Z1 - 29.4], [x, DESK_H - 70, DESK_Z1 - 29.4]]), 3, np.repeat([[0, 0, 1.0]], 2, 0), 'flute'))
    lines.append(Line(np.array([[DESK_X0 + 30, 112, DESK_Z1 - 29.4], [DESK_X1 - 30, 112, DESK_Z1 - 29.4]]), 2, None, 'kick'))
    lines.append(Line(np.array([[DESK_X0 + 30, DESK_H - 58, DESK_Z1 - 29.4], [DESK_X1 - 30, DESK_H - 58, DESK_Z1 - 29.4]]), 2, None, 'apron'))
    # the fedora's band, its ribbon's edge
    # the pouches: each its round lock near the top, a stitched seam inside its edge (dashes), the phone's shape inside
    for i in range(6):
        o = pouch_frame(i)
        def W_(q, o=o):
            return np.asarray(q, float) @ _Rp.T + o
        nrm = _Rp @ np.array([0, 0, 1.0])
        lock_c = W_([0, 150, 9.6])
        lines.append(Line(circle3(lock_c, 14, normal=nrm, n=40), 1, np.repeat(nrm[None], 40, 0), 'lock'))
        lines.append(Line(circle3(lock_c + nrm * 0.4, 7, normal=nrm, n=28), 2, np.repeat(nrm[None], 28, 0), 'lock'))
        # the stitching: short dashes round the pouch, 6mm in
        rect = [(-33, 10), (33, 10), (33, 176), (-33, 176), (-33, 10)]
        for (u0, v0), (u1, v1) in zip(rect[:-1], rect[1:]):
            L = math.hypot(u1 - u0, v1 - v0)
            for t in np.arange(0, L - 6, 11):
                a = np.array([u0 + (u1 - u0) * t / L, v0 + (v1 - v0) * t / L, 9.4])
                b = np.array([u0 + (u1 - u0) * (t + 6) / L, v0 + (v1 - v0) * (t + 6) / L, 9.4])
                lines.append(Line(W_(np.array([a, b])), 3, np.repeat(nrm[None], 2, 0), 'stitch'))
    # the book and its pen
    bl, _ = book_lines()
    lines += bl

    # ---------- draw ----------
    needle_c = np.array([NEEDLE_X, NEEDLE_SPUR, FAR_Z])
    Wt = {1: [], 2: [], 3: []}
    red, amber = [], []
    lamp_c = LAMP_AT + np.array([0, 240.0, 0])
    gap_c = np.array([(OPEN_X1 + 206) / 2, 1100.0, -WALL_T])
    for ln in lines:
        for q, P3, N in sc.runs(ln, min_px=0.6):
            Wt[ln.w].append(q)
            if N is None:
                continue
            for src, sink, reach, k0 in ((gap_c, red, 1800.0, .18), (lamp_c, amber, 520.0, .2)):
                L = (src - P3) / np.maximum(np.linalg.norm(src - P3, axis=1, keepdims=True), 1e-9)
                facing = np.sum(N * L, -1)
                dist = np.linalg.norm(P3 - src, axis=1)
                k = facing * np.clip(1.25 - dist / (reach * 1.3), 0, 1)
                cur = []
                for i, on in enumerate(list(k > k0) + [False]):
                    if on:
                        cur.append(i)
                    elif cur:
                        if len(cur) > 2 and plen(q[cur[0]:cur[-1] + 1]) > 2:
                            sink.append((q[cur[0]:cur[-1] + 1], float(np.mean(k[cur]))))
                        cur = []

    # the door's free edge and the right jamb, lit by the light coming through the gap (they face it)
    edge = door_world(np.array([[DOOR_W, 10, -DOOR_T / 2], [DOOR_W, DOOR_H - 10, -DOOR_T / 2]]))
    jamb = np.array([[OPEN_X1 - 2, 4, -6], [OPEN_X1 - 2, OPEN_H - 4, -6]])

    # ---------- the needle inside, set on the far wall ----------
    art = open(__file__.rsplit('/', 3)[0] + '/src/data/art.ts', encoding='utf-8').read()
    i0 = art.index('export const signGlow = ') + len('export const signGlow = ')
    sg, _ = json.JSONDecoder().raw_decode(art[i0:])
    top_tip, bot_tip, spur_y, needle_x = 53.89, 550.97, 302.17, 58.85
    mm = NEEDLE_LEN / (bot_tip - top_tip)
    sx, sy = mm * cam.s, mm * cam.s * math.cos(cam.pitch)
    sp2 = cam.proj(needle_c)
    tx, ty = sp2[0] - needle_x * sx, sp2[1] - spur_y * sy
    mat = f'matrix({sx:.4f} 0 0 {sy:.4f} {tx:.2f} {ty:.2f})'
    own = lambda s: re.sub(r'id="(hs\d+)"', r'id="{id}-\1"', s).replace('url(#hs', 'url(#{id}-hs')
    aura, sign, core = own(sg['aura']), own(sg['sign']), own(sg['core'])

    # the gap, as seen: the clip for what is inside (the needle and its glow are seen only through it)
    fe_bot, fe_top = cam.proj(edge[0]), cam.proj(edge[1])
    jb_bot, jb_top = cam.proj(np.array([OPEN_X1, 0, 0.0])), cam.proj(np.array([OPEN_X1, OPEN_H, 0.0]))
    gap_poly = [fe_top, jb_top, jb_bot, fe_bot]
    gp = 'M' + 'L'.join(f'{fmt(x)} {fmt(y)}' for x, y in gap_poly) + 'Z'
    # the spill: the gap's light on the floor, a wedge widening towards us
    th_l, th_r = cam.proj(np.array([206.0, 0, -WALL_T / 2])), cam.proj(np.array([OPEN_X1, 0, 0.0]))
    far_l, far_r = cam.proj(np.array([60.0, 0, 1900])), cam.proj(np.array([1150.0, 0, 1900]))
    spill = f'M{fmt(th_l[0])} {fmt(th_l[1])}L{fmt(th_r[0])} {fmt(th_r[1])}L{fmt(far_r[0])} {fmt(far_r[1])}L{fmt(far_l[0])} {fmt(far_l[1])}Z'
    sp_a, sp_b = (th_l + th_r) / 2, (far_l + far_r) / 2

    def strokes(items, color, wmin, wmax, omin, omax):
        return ''.join(f'<path class="la-g" d="{path(seg)}" stroke-width="{wmin + (wmax - wmin) * min(1, k):.2f}" stroke-opacity="{omin + (omax - omin) * min(1, k):.2f}" style="stroke:{color}"/>' for seg, k in items)

    red_s = strokes(red, 'var(--la-red)', .8, 1.3, .45, .95)
    amber_s = strokes(amber, '#ffcf96', .7, 1.1, .4, .9)
    edge2, jamb2 = cam.proj(edge), cam.proj(jamb)

    defs = (own(sg['defs']) +
            f'<clipPath id="{{id}}-gap"><path d="{gp}"/></clipPath>'
            f'<linearGradient id="{{id}}-sp" gradientUnits="userSpaceOnUse" x1="{fmt(sp_a[0])}" y1="{fmt(sp_a[1])}" x2="{fmt(sp_b[0])}" y2="{fmt(sp_b[1])}">'
            '<stop offset="0" style="stop-color:var(--la-red)" stop-opacity=".5"/><stop offset=".35" style="stop-color:var(--la-red)" stop-opacity=".16"/><stop offset="1" style="stop-color:var(--la-red)" stop-opacity="0"/></linearGradient>'
            '<linearGradient id="{id}-in" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--la-red)" stop-opacity=".05"/><stop offset=".6" style="stop-color:var(--la-red)" stop-opacity=".16"/><stop offset="1" style="stop-color:var(--la-red)" stop-opacity=".3"/></linearGradient>'
            '<radialGradient id="{id}-p" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffdcab" stop-opacity=".8"/><stop offset=".35" stop-color="#ffdcab" stop-opacity=".4"/><stop offset=".7" stop-color="#e3963a" stop-opacity=".14"/><stop offset="1" stop-color="#e3963a" stop-opacity="0"/></radialGradient>'
            '<filter id="{id}-bl" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3"/></filter>'
            '<radialGradient id="{id}-s"><stop offset="0" stop-color="#000" stop-opacity=".75"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>')
    dk = cam.proj(np.array([(DESK_X0 + DESK_X1) / 2, 0, (DESK_Z0 + DESK_Z1) / 2]))
    shade = f'<ellipse cx="{fmt(dk[0])}" cy="{fmt(dk[1] + 4)}" rx="{fmt((DESK_X1 - DESK_X0) * cam.s * .62)}" ry="{fmt(16)}" fill="url(#{{id}}-s)"/>'
    pool = cam.proj(LAMP_AT + np.array([60.0, 0, 120]))
    shade_lamp = cam.proj(np.array([LAMP_AT + [-118, 262, 0], LAMP_AT + [118, 262, 0], LAMP_AT + [260, 0, 160], LAMP_AT + [-200, 0, 160]]))
    warm = (f'<path d="M' + 'L'.join(f'{fmt(x)} {fmt(y)}' for x, y in shade_lamp) + 'Z" fill="#ffdcab" fill-opacity=".07" filter="url(#{id}-bl)"/>'
            f'<ellipse cx="{fmt(pool[0])}" cy="{fmt(pool[1])}" rx="{fmt(300 * cam.s)}" ry="{fmt(300 * cam.s * .38)}" fill="url(#{{id}}-p)"/>'
            f'<path class="la-g" d="{path(cam.proj(circle3(LAMP_AT + np.array([0, 262.5, 0]), 132, n=160)))}" stroke="#ffdcab" stroke-width=".9" stroke-opacity=".85"/>'
            + amber_s)
    needle = (
        '<g class="la-needle">'
        f'<g class="la-foot"><path d="{spill}" fill="url(#{{id}}-sp)"/><path d="{gp}" fill="url(#{{id}}-in)"/></g>'
        f'<g clip-path="url(#{{id}}-gap)"><g class="la-breath"><g class="la-aura" transform="{mat}">{aura}</g></g>'
        f'<g class="la-flick"><g class="la-blade" style="transform-origin:50% {100 * (spur_y - top_tip) / (bot_tip - top_tip):.1f}%"><g transform="{mat}">{sign}{core}</g></g></g></g>'
        f'<g class="la-catch"><path class="la-g" d="{path(edge2)}" stroke-width="1.4" stroke-opacity=".95" style="stroke:var(--la-red)"/>'
        f'<path class="la-g" d="{path(jamb2)}" stroke-width="1.1" stroke-opacity=".7" style="stroke:var(--la-red)"/>{red_s}</g>'
        '</g>'
        f'<g class="la-warm">{warm}</g>'
    )
    C, D, H = group(Wt[1]), group(Wt[2]), group(Wt[3], tol=0.12)
    return C, D, H, defs, shade, needle


if __name__ == '__main__':
    C, D, H, defs, shade, light = main()
    print("""  // The club's door, close: a heavy pivot door clad in the wall's own board-formed concrete, standing open a little;
  // through the gap the logo's needle of light, deep inside, its red spilling over the threshold and across the
  // polished floor. Beside it the manager's desk: the guests' phones sealed in their pouches, standing in a felt tray,
  // each with its round lock; the open guest book with a fountain pen; a banker's lamp. (tools/lineart/door.py)
  door: {
    box: [%d, %d],
    alt: { ru: 'Дверь клуба приоткрыта, внутри красная игла света; рядом стойка менеджера: запечатанные чехлы для телефонов, книга гостей, лампа', en: 'The club door ajar, the red needle of light inside; beside it the manager’s desk: sealed phone pouches, the guest book, a lamp' },
    lines: {""" % BOX)
    print(f"      contour: [{ts(C)}],")
    print(f"      detail: [{ts(D)}],")
    print(f"      hint: [{ts(H)}],")
    print("    },")
    print(f"    defs: '{defs}',")
    print(f"    shade: '{shade}',")
    print(f"    light: '{light}',")
    print("  },")
    open('/tmp/door-preview.svg', 'w').write(preview_svg(BOX, [(1, [C]), (2, [D]), (3, [H])],
                                                         extra_back=f'<g>{shade}</g><g>{light}</g>'.replace('{id}', 'pv'),
                                                         defs=defs.replace('{id}', 'pv'), width=1200))
    sys.stderr.write(f'contour {C[1]}, detail {D[1]}, hint {H[1]}, size {len(C[0]) + len(D[0]) + len(H[0]) + len(defs) + len(light)}\n')
