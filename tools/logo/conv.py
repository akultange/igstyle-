# The club's logo (its Illustrator SVG files) as outlines in the site's own units: capitals 705 tall standing on
# y -5 (as data/wordmark.ts has them), each half's ink starting at x 0. Absolute M, L, C and Z only.
# It reads three of the files the club sent on 2026-11-20 (01_Logo Light.svg, Sign Light.svg, Flower Light.svg; they
# are the club's and are not kept in this repository) and writes one JSON file, whose values were pasted into
# data/wordmark.ts (LOGO, SIGN, FLOWER):
#
#   python3 -I tools/logo/conv.py <folder with the club's SVG files> [out.json]
#
# (TOP and BOT below are the capitals' top and foot in the logo file's own units, 358.05 the right edge of the L's
# stem: measured in that file. A redrawn logo needs them measured again.)
import re, json, sys, os
if len(sys.argv) < 2: raise SystemExit(__doc__ or 'usage: python3 -I tools/logo/conv.py <folder with the club\'s SVG files> [out.json]')
SRC = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else 'logo.json'
src = open(os.path.join(SRC, '01_Logo Light.svg'), encoding='utf-8').read()
NUM = re.compile(r'[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?')
def tokens(d):
    for m in re.finditer(r'([MmLlHhVvCcSsQqTtZzAa])|(' + NUM.pattern + ')', d):
        yield m.group(1) or float(m.group(2))
def absolute(d):
    """-> list of ('M'|'L'|'C'|'Z', [abs coords])"""
    out = []; t = list(tokens(d)); i = 0; cx = cy = sx = sy = 0.0; cmd = None; last = None; lc = None
    def take(n):
        nonlocal i
        v = t[i:i + n]; i += n; return v
    while i < len(t):
        if isinstance(t[i], str): cmd = t[i]; i += 1
        if cmd in 'Zz': out.append(('Z', [])); cx, cy = sx, sy; last = 'Z'; lc = None; continue
        rel = cmd.islower(); c = cmd.upper()
        if c == 'M':
            x, y = take(2)
            if rel: x += cx; y += cy
            cx, cy = x, y; sx, sy = x, y; out.append(('M', [x, y])); cmd = 'l' if rel else 'L'; lc = None
        elif c == 'L':
            x, y = take(2)
            if rel: x += cx; y += cy
            cx, cy = x, y; out.append(('L', [x, y])); lc = None
        elif c == 'H':
            (x,) = take(1)
            if rel: x += cx
            cx = x; out.append(('L', [cx, cy])); lc = None
        elif c == 'V':
            (y,) = take(1)
            if rel: y += cy
            cy = y; out.append(('L', [cx, cy])); lc = None
        elif c == 'C':
            x1, y1, x2, y2, x, y = take(6)
            if rel: x1 += cx; y1 += cy; x2 += cx; y2 += cy; x += cx; y += cy
            out.append(('C', [x1, y1, x2, y2, x, y])); lc = (x2, y2); cx, cy = x, y
        elif c == 'S':
            x2, y2, x, y = take(4)
            if rel: x2 += cx; y2 += cy; x += cx; y += cy
            x1, y1 = (2 * cx - lc[0], 2 * cy - lc[1]) if lc else (cx, cy)
            out.append(('C', [x1, y1, x2, y2, x, y])); lc = (x2, y2); cx, cy = x, y
        else:
            raise SystemExit('command not handled: ' + cmd)
    return out
shapes = []
for m in re.finditer(r'<(path|polygon)\b[^>]*class="st14"[^>]*>', src):
    tag = m.group(0)
    if m.group(1) == 'polygon':
        pts = [float(v) for v in NUM.findall(re.search(r'points="([^"]*)"', tag).group(1))]
        segs = [('M', pts[0:2])] + [('L', pts[i:i + 2]) for i in range(2, len(pts), 2)] + [('Z', [])]
    else:
        segs = absolute(re.search(r'\sd="([^"]*)"', tag).group(1))
    xs = [v for c, a in segs for v in a[0::2]]; ys = [v for c, a in segs for v in a[1::2]]
    shapes.append({'segs': segs, 'x0': min(xs), 'x1': max(xs), 'y0': min(ys), 'y1': max(ys)})
shapes.sort(key=lambda s: s['x0'])
for s in shapes: print('  shape x %.1f..%.1f  y %.1f..%.1f  (%d segments)' % (s['x0'], s['x1'], s['y0'], s['y1'], len(s['segs'])))

# ---- to the site's units
TOP, BOT = 257.1, 304.5
S = 705 / (BOT - TOP)
def emit(segs, x0):
    out = []
    for c, a in segs:
        if c == 'Z': out.append('Z'); continue
        pts = []
        for i in range(0, len(a), 2):
            pts.append('%s %s' % (('%.1f' % ((a[i] - x0) * S)).rstrip('0').rstrip('.'), ('%.1f' % ((a[i + 1] - BOT) * S - 5)).rstrip('0').rstrip('.')))
        out.append(c + ' '.join(pts))
    return ''.join(out)
H, O, T, L, A, N, D = shapes
lx = L['x0']
data = {
  'hot': [emit(s['segs'], 0) for s in (H, O, T)], 'land': [emit(s['segs'], lx) for s in (L, A, N, D)],
  'hotWidth': round(T['x1'] * S), 'landWidth': round((D['x1'] - lx) * S), 'gap': round((lx - T['x1']) * S), 'stem': round((358.05 - lx) * S),
}
print({k: v for k, v in data.items() if not isinstance(v, list)}, [len(p) for p in data['hot'] + data['land']])
sign = re.search(r'\sd="([^"]*)"', open(os.path.join(SRC, 'Sign Light.svg'), encoding='utf-8').read()).group(1)
fl = open(os.path.join(SRC, 'Flower Light.svg'), encoding='utf-8').read()
flower = sorted(set(re.findall(r'\sd="([^"]*)"', fl)), key=len)
print('sign', len(sign), '| flower paths distinct:', len(flower), [len(f) for f in flower])
json.dump({'name': data, 'sign': re.sub(r'\s+', ' ', sign).strip(), 'flower': [re.sub(r'\s+', ' ', f).strip() for f in flower]}, open(OUT, 'w'))
print('written to', OUT)
