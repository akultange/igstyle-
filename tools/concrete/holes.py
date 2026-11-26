"""Bullet holes for the club's concrete (global.css, .soot): a few impacts scattered over a large tile, so they never
fall into a grid. Each: a powder-dark halo, the spall (the face chipped away round the hole, a shade paler than the
weathered face, its lower inner wall catching the light from above, its upper one in shadow), the hole itself, and a
few hairline cracks running out of it, each a dark line with a pale lip.

    python3 tools/concrete/holes.py          prints the CSS custom properties (paste into global.css)

The holes are drawn in an SVG of their own (nothing to fetch: a data URL), in the concrete's own greys at low
opacity, so they sit in the wall rather than on it.
"""
import math
import random
import sys
from urllib.parse import quote


def hole(rng, x, y, s=1.0, rot=None):
    """One impact at (x, y), s its size (1: a spall about 15px across)."""
    out = [f"<g transform='translate({x:.1f} {y:.1f}) scale({s:.2f})'>"]
    # the powder-dark halo, faint
    out.append("<circle r='13' fill='url(%23b)'/>")
    # the spall: the face chipped away in a ragged ring of chips, a shade paler than the weathered face
    n = 22
    pts = []
    for i in range(n):
        t = 2 * math.pi * (i + rng.uniform(-.3, .3)) / n
        r = rng.uniform(5.2, 8.4) if i % 2 else rng.uniform(6.4, 8.0)
        pts.append((r * math.cos(t), r * math.sin(t) * .94))
    d = 'M' + 'L'.join(f'{px:.1f} {py:.1f}' for px, py in pts) + 'Z'
    out.append(f"<path d='{d}' fill='url(%23s)'/>")
    out.append(f"<path d='{d}' fill='none' stroke='%23fff' stroke-opacity='.07' stroke-width='.5'/>")
    # the crater: its upper wall in shadow, its lower wall catching the light from above
    out.append("<ellipse cx='.2' cy='-.9' rx='4.4' ry='3.9' fill='%23000' fill-opacity='.38'/>")
    out.append("<path d='M-3.6 1.4Q0 4.4 3.6 1.4' fill='none' stroke='%23fff' stroke-opacity='.07' stroke-width='1'/>")
    # the hole, a touch oval
    out.append(f"<ellipse rx='2.3' ry='2.1' transform='rotate({rng.uniform(0, 180):.0f})' fill='%23000' fill-opacity='.9'/>")
    out.append("<circle cy='.4' r='1.2' fill='%23000'/>")
    # hairline cracks: two to four, short, kinked, fading out
    n = rng.randint(2, 4)
    base = rng.uniform(0, 2 * math.pi)
    for j in range(n):
        t = base + j * 2 * math.pi / n + rng.uniform(-.6, .6)
        r0 = rng.uniform(6.2, 7.6)
        L = rng.uniform(5, 13) if j else rng.uniform(10, 17)
        px, py = r0 * math.cos(t), r0 * math.sin(t)
        seg = [(px, py)]
        steps = rng.randint(3, 5)
        for _ in range(steps):
            t += rng.uniform(-.55, .55)
            px += L / steps * math.cos(t)
            py += L / steps * math.sin(t)
            seg.append((px, py))
        dd = 'M' + 'L'.join(f'{qx:.1f} {qy:.1f}' for qx, qy in seg)
        out.append(f"<path d='{dd}' fill='none' stroke='url(%23c{j % 2})' stroke-width='.6' stroke-linecap='round'/>")
    out.append("</g>")
    return ''.join(out)


DEFS = ("<defs>"
        "<radialGradient id='b'><stop offset='0' stop-color='%23000' stop-opacity='.24'/><stop offset='.5' stop-color='%23000' stop-opacity='.07'/><stop offset='1' stop-color='%23000' stop-opacity='0'/></radialGradient>"
        "<radialGradient id='s' cx='.5' cy='.44' r='.62'><stop offset='0' stop-color='%23000' stop-opacity='.45'/><stop offset='.5' stop-color='%23000' stop-opacity='.12'/><stop offset='.78' stop-color='%23fff' stop-opacity='.045'/><stop offset='1' stop-color='%23fff' stop-opacity='.08'/></radialGradient>"
        "<linearGradient id='c0' gradientUnits='objectBoundingBox'><stop offset='0' stop-color='%23000' stop-opacity='.62'/><stop offset='1' stop-color='%23000' stop-opacity='0'/></linearGradient>"
        "<linearGradient id='c1' gradientUnits='objectBoundingBox' x1='1' x2='0'><stop offset='0' stop-color='%23000' stop-opacity='.62'/><stop offset='1' stop-color='%23000' stop-opacity='0'/></linearGradient>"
        "</defs>")


def svg(w, h, holes):
    body = ''.join(holes)
    s = f"<svg xmlns='http://www.w3.org/2000/svg' width='{w}' height='{h}' viewBox='0 0 {w} {h}'>{DEFS}{body}</svg>"
    s = s.replace('<', '%3C').replace('>', '%3E').replace('"', "'")
    return f'url("data:image/svg+xml,{s}")'


rng = random.Random(7)
# A wide screen: over a tile of 1460 x 1340, a pair close together (two shots, one hand), a single, and a group of
# three a little apart; nothing on a grid. The tile is large, so a screen shows one or two impacts, rarely more.
wide = [
    hole(rng, 312, 236, 1.22), hole(rng, 345, 266, 1.04),
    hole(rng, 1122, 418, 1.3),
    hole(rng, 760, 1018, 1.14), hole(rng, 818, 1046, 1.0), hole(rng, 786, 1106, 1.1),
    hole(rng, 140, 1210, .98),
]
# A phone: two narrow strips, one down each margin, the impacts never under the words
left = [hole(rng, 15, 300, .9), hole(rng, 20, 328, .78), hole(rng, 13, 1180, .86)]
right = [hole(rng, 22, 760, .92), hole(rng, 15, 1620, .82), hole(rng, 23, 1648, .74)]

print('  --holes: ' + svg(1460, 1340, wide) + ';')
print('  --holes-l: ' + svg(34, 1900, left) + ';')
print('  --holes-r: ' + svg(38, 1900, right) + ';')
