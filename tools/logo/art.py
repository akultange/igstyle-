# The club's glowing artwork (its Illustrator SVG files) as markup the site can set straight into a page: the logo's
# glowing sign with its aura, contour, white-hot core and the reflection on the letters; the glowing flower.
# Nothing is redrawn: every shape, gradient and opacity is the club's own. What changes is only what an inline SVG
# needs: the file's style classes become attributes on the shapes, the gradients' names become short and unique
# (hl-…, hd-…, hf-…), and the parts come out one by one, so a page can light them one after another.
#
#   python3 -I tools/logo/art.py <folder with the club's SVG files> [src/data/art.ts]
#
# The folder is the one the club sent on 2026-11-20 (01_Logo Light.svg, 01_Logo Dark.svg, Sign Glow.svg, Flower
# Glow.svg; it is the club's and is not kept in this repository). data/wordmark.ts (the letters as outlines,
# tools/logo/conv.py) and this file's output are two readings of the same logo file.
#
# Two things are put right, both checked against the club's own PNG of the logo (01_Logo Light.png):
#   - 01_Logo Light.svg was exported with one decimal place, gradients included. That rounded two different stops of
#     the needle's gradient onto the same place (a hard step across the needle 60% of the way down, which the PNG
#     does not have) and flattened its opacities. The club's Sign Glow.svg is the same sign written with two
#     decimal places, so the logo's sign (aura, contour, core) is taken from that file and set where the logo has
#     it (SIGN_DX to the right); only the letters and their reflection come from the logo file.
#   - the same rounding put the reflection's second stop on its first (offset 0), which lost the white-hot middle at
#     the L's foot. The PNG shows that middle about 8 units wide: the stop is set back to .07.
import re, sys, os, json
import xml.etree.ElementTree as ET

if len(sys.argv) < 2: raise SystemExit('usage: python3 -I tools/logo/art.py <folder with the club\'s SVG files> [out.ts]')
SRC = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), '../../src/data/art.ts')
SVG = '{http://www.w3.org/2000/svg}'

def num(v):
    """a number as short as it can be written"""
    s = ('%.3f' % float(v)).rstrip('0').rstrip('.')
    return '0' if s in ('', '-0') else s.replace('0.', '.', 1) if s.startswith('0.') else s.replace('-0.', '-.', 1) if s.startswith('-0.') else s

def read(name, prefix):
    text = open(os.path.join(SRC, name), encoding='utf-8').read()
    if '<!DOCTYPE' in text or '<!ENTITY' in text: raise SystemExit(name + ': a document type or an entity, not read')
    root = ET.fromstring(text)
    box = [float(v) for v in root.get('viewBox').split()]
    # the style sheet: class -> declarations
    css = {}
    st = root.find(f'.//{SVG}style')
    for sel, body in re.findall(r'([^{}]+)\{([^}]*)\}', st.text if st is not None else ''):
        decl = dict((k.strip(), v.strip()) for k, v in (d.split(':', 1) for d in body.split(';') if ':' in d))
        for s in sel.split(','):
            css.setdefault(s.strip().lstrip('.'), {}).update(decl)
    # ids: short and unique
    ids = {}
    for el in root.iter():
        i = el.get('id')
        if i and el.tag in (SVG + 'linearGradient', SVG + 'radialGradient', SVG + 'clipPath'):
            ids[i] = f'{prefix}{len(ids) + 1}'
    def url(v): return re.sub(r'url\(#([^)]+)\)', lambda m: f'url(#{ids.get(m.group(1), m.group(1))})', v)
    def attrs(el, skip=()):
        a = {}
        for k, v in el.attrib.items():
            if k.startswith('data-') or k in ('class', 'id') or k in skip: continue
            a[k] = v
        for c in (el.get('class') or '').split():
            for k, v in css.get(c, {}).items():
                if k in ('isolation', 'mix-blend-mode'): continue  # (they change nothing: the art's root is isolated and the glow has nothing under it)
                if k == 'fill' and v == 'none' and el.tag == SVG + 'path' and False: continue
                a[k] = v
        return a
    def tag(el): return el.tag.replace(SVG, '')
    def write(el, skip=()):
        a = attrs(el, skip)
        if el.get('id') in ids: a['id'] = ids[el.get('id')]
        for k in list(a):
            a[k] = url(a[k])
        if 'opacity' in a and float(a['opacity']) == 1: del a['opacity']
        if a.get('opacity') == '0': return ''  # (a shape the designer switched off)
        s = '<' + tag(el) + ''.join(f' {k}="{v}"' for k, v in a.items())
        kids = ''.join(write(c) for c in el)
        return s + ('>' + kids + f'</{tag(el)}>' if kids else '/>')
    # the gradients and clips, each by its new name
    defmap = {ids[el.get('id')]: write(el) for el in root.iter() if el.tag in (SVG + 'linearGradient', SVG + 'radialGradient', SVG + 'clipPath') and el.get('id') in ids}
    defs = ''.join(defmap.values())
    return root, box, defs, write, ids, css, defmap

def group(root, write, gid=None, name=None):
    for g in root.iter(SVG + 'g'):
        if (gid and g.get('id') == gid) or (name and g.get('data-name') == name):
            return ''.join(write(c) for c in g)
    raise SystemExit(f'no group {gid or name}')

def used(defmap, *markup):
    """the gradients and clips some markup points to (and those they point to in turn)"""
    need, seen = set(re.findall(r'url\(#([^)]+)\)', ''.join(markup))), set()
    while need - seen:
        i = (need - seen).pop(); seen.add(i)
        need |= set(re.findall(r'url\(#([^)]+)\)', defmap.get(i, '')))
    return ''.join(v for k, v in defmap.items() if k in seen)

out = {}
# ---- the sign, glowing, on its own (the club's "Sign Glow": 127.8 by 596.58, the needle at x 58.85)
root, box, defs, write, ids, css, defmap = read('Sign Glow.svg', 'hs')
sign = {'aura': group(root, write, gid='glow-screen'), 'sign': group(root, write, gid='approved-sign'), 'core': group(root, write, gid='light-core')}
out['signGlow'] = {'box': box, 'defs': defs, **sign}
# ---- the logo for dark ground: its letters and their reflection, and the sign above set where the logo has it
# (the sign's file starts 291.15 units into the logo: its needle begins at x 59.24, the logo's at 350.4)
SIGN_DX = 291.15
root, box, defs, write, ids, css, defmap = read('01_Logo Light.svg', 'hl')
letters = [g for g in root.iter(SVG + 'g') if any((c.get('class') or '') == 'st14' for c in g)][0]
refl = [g for g in root.iter(SVG + 'g') if 'clip-path' in ''.join(css.get(c, {}).keys() and ' '.join(css.get(c, {}).keys()) or '' for c in (g.get('class') or '').split())][0]
reflect = ''.join(write(c) for c in refl)
clip = [v for k, v in ids.items() if k == 'clippath'][0]
# (the reflection's second stop, back off its first: see the top of this file)
for k in re.findall(r'url\(#([^)]+)\)', reflect):
    fixed, n = re.subn(r'(<stop offset="0" stop-color="#fff1d5"/><stop offset=)"0"( stop-color="#ffbb90"/>)', r'\1".07"\2', defmap[k])
    if n != 1: raise SystemExit('the reflection\'s gradient is not as expected: ' + defmap[k][:200])
    defmap[k] = fixed
moved = lambda m: f'<g transform="translate({SIGN_DX} 0)">{m}</g>'
out['logoLight'] = {
    'box': box, 'defs': used(defmap, reflect) + defmap[clip],
    'aura': moved(sign['aura']), 'sign': moved(sign['sign']), 'core': moved(sign['core']),
    'letters': ''.join(write(c) for c in letters),
    'reflect': reflect, 'clip': clip,
    # where things stand, in the file's own units: the capitals' top and foot, the left edge of the L's stem
    'top': 257.1, 'foot': 304.5, 'stem': 350.4,
}
# ---- the logo for light ground ("Red light, adapted to light surface")
root, box, defs, write, ids, css, defmap = read('01_Logo Dark.svg', 'hd')
out['logoDark'] = {
    'box': box, 'defs': defs,
    'aura': group(root, write, name='Soft red falloff'), 'sign': group(root, write, gid='approved-sign'), 'core': group(root, write, name='Warm luminous core'),
    'letters': group(root, write, name='Dark graphite letters'),
    # (this file's reflection carries its own clip: nothing to add)
    'reflect': group(root, write, name='Hot edge and subtle letter reflection'), 'clip': '',
    # (the same drawing at 0.72 of the size; measured from the letters' own outlines)
    'top': 185.06, 'foot': 219.2, 'stem': 252.29,
}
# ---- the flower, glowing
root, box, defs, write, ids, css, defmap = read('Flower Glow.svg', 'hf')
out['flowerGlow'] = { 'box': box, 'defs': defs, 'aura': group(root, write, gid='red-wall-glow'), 'lily': group(root, write, gid='original-lily') }

ts = ['// The club\'s glowing artwork as inline SVG markup: written by tools/logo/art.py from the club\'s own files. Not edited',
      '// by hand (run the tool again if the club sends new files). Each part is a string of SVG shapes in the file\'s own',
      '// units; `defs` holds the gradients they point to (ids hs…, hl…, hd…, hf…), set into a page once. The light',
      '// logo\'s sign is signGlow\'s, moved to its place: a page that sets logoLight needs both sets of gradients.',
      '/* eslint-disable */']
for k, v in out.items():
    ts.append(f'export const {k} = {json.dumps(v, ensure_ascii=False)} as const;')
open(OUT, 'w', encoding='utf-8', newline='\n').write('\n'.join(ts) + '\n')
print('written', OUT, {k: {kk: (len(vv) if isinstance(vv, str) else vv) for kk, vv in v.items()} for k, v in out.items()})
