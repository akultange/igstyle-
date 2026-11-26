"""The closing card's drawing (src/data/lineart.ts, 'guest'): the man in the club chair, his back to us, facing the
club's sign. Built in 3D and drawn by engine.py through the set's camera (a near elevation, looking down 12.5 degrees,
parallel projection).

    the wall      board-formed concrete: the boards' faint lines, the panels' joints
    the sign      the logo's own needle (data/art.ts signGlow): the blade of light with its spur, on the wall, with its
                  aura, and its reflection in the polished floor
    the chair     chester.py: an English rolled-arm club chair, its outer back deep-buttoned, nailheads, bun feet
    the man       seated.py: his head and shoulders above the roll, his left arm along the chair's arm, a cigar in his
                  fingers and its smoke going up into the red; his right hand at rest
    the table     a pedestal side table at his right with a dome lamp and a glass of whisky: the room's amber
    the light     the red catches the edges that face the sign (his head, his shoulder, his sleeve, the chair's roll);
                  the lamp's amber catches those that face it

    python3 tools/lineart/guest.py > /tmp/guest.ts          the entry for lineart.ts (and /tmp/guest-preview.svg)
"""
import json
import math
import re
import sys

import numpy as np

sys.path.insert(0, __file__.rsplit('/', 1)[0])
from engine import (Camera, Field, Line, Placed, Scene, circle3, field_lines, fmt, group, path, plen, preview_svg, rot,
                    sd_ellipsoid, sd_round_cone, sd_round_box, smax, smin, smooth, surface_contour)
import chester as cz
import seated as st

BOX = (600, 560)
cam = Camera(yaw=0.0, pitch=12.5, scale=0.282, cx=250.0, cy=398.0)
V = cam.view

# ---------- where things stand (millimetres; the wall is z = 0, the floor y = 0) ----------
CHAIR_AT = np.array([110.0, 0, 980.0])
CHAIR_YAW = -142.0
SIGN_X = -660.0                      # the needle's line on the wall
SIGN_SPUR, SIGN_LEN = 960.0, 1800.0  # the spur's height; the blade's length, tip to tip
TABLE_AT = np.array([820.0, 0, 640.0])
TABLE_H, TABLE_R = 560.0, 230.0
LAMP_AT = TABLE_AT + np.array([-20.0, TABLE_H + 22, -30])

Rc = rot([0, 1, 0], CHAIR_YAW)


def placed(parts, R, o):
    return [(n, Placed(f, R, o)) for n, f in parts]


# ---------- the table and the lamp ----------
def table(p):
    q = p - TABLE_AT
    top = sd_round_box(q, np.array([0, TABLE_H - 14, 0]), np.array([TABLE_R, 14, TABLE_R]), 6)
    top = smax(top, np.hypot(q[:, 0], q[:, 2]) - TABLE_R, 6)                                   # round
    col = sd_round_cone(q, np.array([0, 40.0, 0]), np.array([0, TABLE_H - 30, 0]), 34, 28)
    base = smax(np.hypot(q[:, 0], q[:, 2]) - 160, np.abs(q[:, 1] - 14) - 14, 4)
    return smin(smin(top, col, 22), base, 26)


def lamp(p):
    q = p - LAMP_AT
    r = np.hypot(q[:, 0], q[:, 2])
    base = smax(r - 72, np.abs(q[:, 1] - 9) - 9, 3)
    stem = sd_round_cone(q, np.array([0, 10.0, 0]), np.array([0, 330.0, 0]), 7, 6)
    # the dome: an ellipsoid shell cut flat below, open
    dome = sd_ellipsoid(q, np.array([0, 318.0, 0]), (168, 118, 168))
    dome = smax(dome, -(sd_ellipsoid(q, np.array([0, 318.0, 0]), (160, 110, 160))), 1.5)
    dome = smax(dome, 318 - q[:, 1], 1.5)
    knob = sd_ellipsoid(q, np.array([0, 446.0, 0]), (16, 12, 16))
    return smin(smin(smin(base, stem, 6), dome, 4), knob, 6)


def glass_lines():
    """A rocks glass on the table: its rim, its base, its sides; the whisky's surface."""
    c = TABLE_AT + np.array([128.0, TABLE_H, 92])
    rim = circle3(c + np.array([0, 92, 0]), 41, n=180)
    base = circle3(c + np.array([0, 2, 0]), 39, n=180)
    base_in = circle3(c + np.array([0, 15, 0]), 36, n=180)
    liquid = circle3(c + np.array([0, 44, 0]), 38.5, n=180)
    return c, rim, base, base_in, liquid


# ---------- build ----------
def build():
    parts = placed(cz.parts() + st.parts(), Rc, CHAIR_AT)
    parts += [('table', Field(table, TABLE_AT + np.array([-TABLE_R - 10, -4, -TABLE_R - 10]), TABLE_AT + np.array([TABLE_R + 10, TABLE_H + 4, TABLE_R + 10]), 3.0, 'table')),
              ('lamp', Field(lamp, LAMP_AT + np.array([-180, -4, -180]), LAMP_AT + np.array([180, 470, 180]), 2.5, 'lamp'))]
    sc = Scene(cam)
    for n, f in parts:
        sc.solid(f.mesh())
    sc.build()
    P = dict(parts)
    return sc, P


def light_dirs(pts, src):
    d = src - pts
    return d / np.maximum(np.linalg.norm(d, axis=-1, keepdims=True), 1e-9)


def main():
    sc, P = build()
    lines = []
    for n, f in P.items():
        for ln in field_lines(f, cam, 1, min_len=3):
            ln.tag = n
            lines.append(ln)
    for a, b in (('m_sleeve_r', 'm_jacket'), ('m_sleeve_l', 'm_jacket'), ('m_collar', 'm_jacket')):
        mb = P[b].mesh()
        for c in surface_contour(mb, P[a](mb.vertices)):
            lines.append(Line(smooth(c, 2), 2, P[b].grad(c), f'{a}|{b}'))
    lines += cz.details(P)
    lines += st.details(P)

    # the glass on the table, the lamp's rim (where the light comes out)
    gc, rim, base, base_in, liquid = glass_lines()
    lines += [Line(rim, 1, None, 'glass'), Line(base, 1, None, 'glass'), Line(base_in, 3, None, 'glass'), Line(liquid, 2, None, 'whisky')]
    for ang in (-1, 1):
        side = gc + np.array([0, 0, 0])
    # the glass's sides: its two outlines as seen
    perp = np.cross(V, [0, 1.0, 0]); perp /= np.linalg.norm(perp)
    for sgn in (-1, 1):
        lines.append(Line(np.array([gc + sgn * perp * 39 + [0, 2, 0], gc + sgn * perp * 41 + [0, 92, 0]]), 1, None, 'glass'))
    lamp_rim = circle3(LAMP_AT + np.array([0, 318.5, 0]), 168, n=240)

    # ---------- the wall and the floor ----------
    rng = np.random.default_rng(3)
    wall = []
    x0, x1 = -2200.0, 2600.0
    for y in np.arange(150.0, 3600.0, 150.0):                 # the boards' lines, faint, broken where they fade
        x = x0
        while x < x1:
            L = rng.uniform(260, 900)
            if rng.uniform() < 0.72:
                wall.append(Line(np.array([[x, y + rng.uniform(-3, 3), 0], [min(x + L, x1), y + rng.uniform(-3, 3), 0]]), 3, None, 'board'))
            x += L + rng.uniform(40, 160)
    for x in np.arange(-2400.0, 2600.0, 1200.0):               # the panels' joints
        wall.append(Line(np.array([[x, 0, 0], [x, 3600, 0]]), 2, None, 'joint'))
    wall.append(Line(np.array([[x0, 1200.0, 0], [x1, 1200.0, 0]]), 3, None, 'joint'))
    floor_line = Line(np.array([[x0, 0, 0], [x1, 0, 0]]), 1, None, 'floor')
    holes = []
    lines += wall + [floor_line] + holes

    # ---------- draw ----------
    sign_c = np.array([SIGN_X, SIGN_SPUR, 0.0])
    lamp_c = LAMP_AT + np.array([0, 300.0, 0])
    W = {1: [], 2: [], 3: []}
    red, amber = [], []
    for ln in lines:
        short = 3.0 if ('ear' in ln.tag or ln.tag in ('m_collar', 'm_shirt')) else 0.6
        for q, P3, N in sc.runs(ln, min_px=short):
            W[ln.w].append(q)
            if N is None or ln.w == 3:
                continue
            # the light each piece catches: its edge facing the sign (red), or the lamp (amber)
            for src, sink, reach, k0 in ((sign_c, red, 1480.0, .2), (lamp_c, amber, 900.0, .2)):
                L = light_dirs(P3, src)
                facing = np.sum(N * L, -1)
                dist = np.linalg.norm(P3 - src, axis=-1)
                flat = np.hypot(P3[:, 0] - src[0], P3[:, 2] - src[2])           # how far, across the floor
                k = facing * np.clip(1.25 - dist / (reach * 1.35), 0, 1) * (flat < reach)
                lit = k > k0
                cur = []
                for i, on in enumerate(list(lit) + [False]):
                    if on:
                        cur.append(i)
                    elif cur:
                        if len(cur) > 2:
                            seg = q[cur[0]:cur[-1] + 1]
                            if plen(seg) > 2:
                                sink.append((seg, float(np.mean(k[cur]))))
                        cur = []

    # ---------- the sign: the logo's needle, set on the wall ----------
    art = open(__file__.rsplit('/', 3)[0] + '/src/data/art.ts', encoding='utf-8').read()
    i = art.index('export const signGlow = ') + len('export const signGlow = ')
    sg, _ = json.JSONDecoder().raw_decode(art[i:])
    top_tip, bot_tip, spur_y, needle_x = 53.89, 550.97, 302.17, 58.85
    mm = SIGN_LEN / (bot_tip - top_tip)                        # millimetres per unit of the artwork
    sx = mm * cam.s
    sy = mm * cam.s * math.cos(cam.pitch)                      # (the wall is upright: only the tilt shortens it)
    spur2 = cam.proj(np.array([SIGN_X, SIGN_SPUR, 0.0]))
    tx, ty = spur2[0] - needle_x * sx, spur2[1] - spur_y * sy
    mat = f'matrix({sx:.4f} 0 0 {sy:.4f} {tx:.2f} {ty:.2f})'
    mat_r = f'matrix({sx:.4f} 0 0 {-sy:.4f} {tx:.2f} {2 * cam.proj(np.array([SIGN_X, 0, 0.0]))[1] - ty:.2f})'   # mirrored in the floor
    own = lambda s: re.sub(r'id="(hs\d+)"', r'id="{id}-\1"', s).replace('url(#hs', 'url(#{id}-hs')
    defs_sign = own(sg['defs'])
    aura, sign, core = own(sg['aura']), own(sg['sign']), own(sg['core'])
    floor_y = cam.proj(np.array([SIGN_X, 0, 0.0]))[1]

    # ---------- the strokes of light ----------
    def strokes(items, color_var, wmin, wmax, omin, omax):
        out = []
        for seg, k in items:
            w = wmin + (wmax - wmin) * min(1, k)
            o = omin + (omax - omin) * min(1, k)
            out.append(f'<path class="la-g" d="{path(seg)}" stroke-width="{w:.2f}" stroke-opacity="{o:.2f}" style="stroke:{color_var}"/>')
        return ''.join(out)

    red_s = strokes(red, 'var(--la-red)', .8, 1.25, .45, .95)
    amber_s = strokes(amber, '#ffcf96', .7, 1.1, .35, .85)

    # the cigar's lit end and its smoke, going up into the red
    a, b = st.cigar_axis()
    tip = Rc @ b + CHAIR_AT
    tip2 = cam.proj(tip)
    smoke = []
    srng = np.random.default_rng(9)
    for j in range(3):
        pts = [tip + np.array([0, 4.0, 0])]
        drift = np.array([-1.0, 0, -0.4]) * (0.3 + 0.25 * j)
        phase = srng.uniform(0, 6.28)
        for t in range(46):
            h = 14.0 + 0.4 * t
            wob = np.array([math.sin(phase + t * .23) * (3 + t * .5), 0, math.cos(phase + t * .19) * (2 + t * .3)])
            pts.append(pts[-1] + np.array([0, h, 0]) * 1.0 + drift * h * 0.35 + wob * .25)
        q = cam.proj(np.array(pts))
        smoke.append(q)

    defs = (defs_sign +
            '<linearGradient id="{id}-sm" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ffcf96" stop-opacity=".75"/>'
            '<stop offset=".25" style="stop-color:var(--la-red)" stop-opacity=".55"/><stop offset="1" style="stop-color:var(--la-red)" stop-opacity="0"/></linearGradient>'
            '<radialGradient id="{id}-f"><stop offset="0" style="stop-color:var(--la-red)" stop-opacity=".42"/><stop offset=".4" style="stop-color:var(--la-red)" stop-opacity=".14"/><stop offset="1" style="stop-color:var(--la-red)" stop-opacity="0"/></radialGradient>'
            '<radialGradient id="{id}-p" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffdcab" stop-opacity=".85"/><stop offset=".3" stop-color="#ffdcab" stop-opacity=".45"/><stop offset=".65" stop-color="#e3963a" stop-opacity=".16"/><stop offset="1" stop-color="#e3963a" stop-opacity="0"/></radialGradient>'
            '<linearGradient id="{id}-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffdcab" stop-opacity=".2"/><stop offset=".7" stop-color="#ffdcab" stop-opacity=".06"/><stop offset="1" stop-color="#ffdcab" stop-opacity=".02"/></linearGradient>'
            '<radialGradient id="{id}-e"><stop offset="0" stop-color="#fff1d8"/><stop offset=".35" stop-color="#ffb35c" stop-opacity=".9"/><stop offset="1" stop-color="#e3963a" stop-opacity="0"/></radialGradient>'
            '<radialGradient id="{id}-s"><stop offset="0" stop-color="#000" stop-opacity=".8"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>'
            '<linearGradient id="{id}-rf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset=".8" stop-color="#fff" stop-opacity="0"/></linearGradient>'
            f'<mask id="{{id}}-rm" maskUnits="userSpaceOnUse" x="0" y="{floor_y:.1f}" width="{BOX[0]}" height="{BOX[1] - floor_y:.1f}"><rect x="0" y="{floor_y:.1f}" width="{BOX[0]}" height="{BOX[1] - floor_y:.1f}" fill="url(#{{id}}-rf)"/></mask>'
            '<filter id="{id}-x" x="-200%" y="-20%" width="500%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>'
            '<filter id="{id}-h" x="-20%" y="-10%" width="140%" height="120%"><feGaussianBlur stdDeviation="4"/></filter>'
            '<filter id="{id}-sb" x="-50%" y="-10%" width="200%" height="120%"><feGaussianBlur stdDeviation="1.1"/></filter>')

    # the soft shadows on the floor: under the chair, under the table
    ch2 = cam.proj(CHAIR_AT)
    tb2 = cam.proj(TABLE_AT)
    shade = (f'<ellipse cx="{fmt(ch2[0])}" cy="{fmt(ch2[1] + 2)}" rx="{fmt(150)}" ry="{fmt(34)}" fill="url(#{{id}}-s)"/>'
             f'<ellipse cx="{fmt(tb2[0])}" cy="{fmt(tb2[1] + 1)}" rx="{fmt(62)}" ry="{fmt(14)}" fill="url(#{{id}}-s)"/>')

    # the lamp's light: the cone under the dome, the pool on the table, the dome's lit rim; the glass of whisky
    rim2 = cam.proj(lamp_rim)
    pool_c = cam.proj(TABLE_AT + np.array([-20.0, TABLE_H, -30]))
    cone = cam.proj(np.array([LAMP_AT + [-150, 318, 0], LAMP_AT + [150, 318, 0], TABLE_AT + [210, TABLE_H, -30], TABLE_AT + [-230, TABLE_H, -30]]))
    gl2 = cam.proj(glass_lines()[4])
    warm = (f'<path d="M{fmt(cone[0][0])} {fmt(cone[0][1])}L{fmt(cone[1][0])} {fmt(cone[1][1])}L{fmt(cone[2][0])} {fmt(cone[2][1])}L{fmt(cone[3][0])} {fmt(cone[3][1])}Z" fill="url(#{{id}}-b)" filter="url(#{{id}}-h)"/>'
            f'<ellipse cx="{fmt(pool_c[0])}" cy="{fmt(pool_c[1])}" rx="{fmt(TABLE_R * cam.s * .95)}" ry="{fmt(TABLE_R * cam.s * .95 * math.sin(cam.pitch))}" fill="url(#{{id}}-p)"/>'
            f'<path class="la-g" d="{path(rim2)}" stroke="#ffdcab" stroke-width="1" stroke-opacity=".9"/>'
            f'<path class="la-g" d="{path(gl2)}" stroke="#ffb35c" stroke-width=".9" stroke-opacity=".9"/>'
            + amber_s)

    ember = (f'<circle cx="{fmt(tip2[0])}" cy="{fmt(tip2[1])}" r="5" fill="url(#{{id}}-e)"/>'
             f'<circle cx="{fmt(tip2[0])}" cy="{fmt(tip2[1])}" r="1.3" fill="#fff1d8"/>')
    smoke_s = ''.join(f'<path class="la-g" d="{path(q, .15)}" stroke="url(#{{id}}-sm)" stroke-width="{.7 - .15 * j:.2f}" filter="url(#{{id}}-sb)" style="vector-effect:none"/>' for j, q in enumerate(smoke))

    floor_glow = f'<ellipse cx="{fmt(spur2[0])}" cy="{fmt(floor_y + 3)}" rx="70" ry="9" fill="url(#{{id}}-f)"/>'
    needle = (
        '<g class="la-needle">'
        f'<g class="la-foot">{floor_glow}<g mask="url(#{{id}}-rm)"><g transform="{mat_r}" opacity=".8">{aura}{sign}</g></g></g>'
        f'<g class="la-breath"><g class="la-aura" transform="{mat}">{aura}</g></g>'
        f'<ellipse class="la-flare" cx="{fmt(spur2[0])}" cy="{fmt(spur2[1])}" rx="80" ry="230" fill="url(#{{id}}-f)" filter="url(#{{id}}-x)" opacity="0"/>'
        f'<g class="la-flick"><g class="la-blade" style="transform-origin:50% {100 * (spur_y - top_tip) / (bot_tip - top_tip):.1f}%"><g transform="{mat}">{sign}{core}</g></g></g>'
        f'<g class="la-catch">{red_s}{smoke_s}{ember}</g>'
        '</g>'
        f'<g class="la-warm">{warm}</g>'
    )

    C, D, H = group(W[1]), group(W[2]), group(W[3])
    return C, D, H, defs, shade, needle


if __name__ == '__main__':
    C, D, H, defs, shade, light = main()
    alt_ru = 'Мужчина в кожаном честерфилде спиной к нам, перед красной иглой света на стене; дым сигары, лампа на столике'
    alt_en = 'A man in a leather Chesterfield, his back to us, before the red needle of light on the wall; cigar smoke, a lamp on a side table'
    from engine import ts
    print("""  // The guest in the club chair, his back to us, facing the logo's needle of light on the wall: an English rolled-arm
  // Chesterfield, deep-buttoned on its outer back, nailheads, bun feet; his head and shoulders above the roll, his
  // left arm along the chair's arm with a cigar, its smoke going up into the red; a side table with a dome lamp and a
  // glass at his right. The red catches whatever faces the needle, the lamp's amber whatever faces it.
  // (tools/lineart/guest.py builds it: chester.py, seated.py, figure.py, engine.py.)
  guest: {
    box: [%d, %d],
    alt: { ru: '%s', en: '%s' },
    lines: {""" % (BOX[0], BOX[1], alt_ru, alt_en))
    print(f"      contour: [{ts(C)}],")
    print(f"      detail: [{ts(D)}],")
    print(f"      hint: [{ts(H)}],")
    print("    },")
    print(f"    defs: '{defs}',")
    print(f"    shade: '{shade}',")
    print(f"    light: '{light}',")
    print("  },")
    open('/tmp/guest-preview.svg', 'w').write(preview_svg(BOX, [(1, [C]), (2, [D]), (3, [H])],
                                                          extra_back=f'<g>{shade}</g><g>{light}</g>'.replace('{id}', 'pv'),
                                                          defs=defs.replace('{id}', 'pv'), width=1200))
    sys.stderr.write(f'contour {C[1]}, detail {D[1]}, hint {H[1]}, red {light.count("--la-red")}, size {len(C[0]) + len(D[0]) + len(H[0]) + len(defs) + len(light)}\n')
