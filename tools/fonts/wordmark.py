"""HOTLAND as outlines for the hero and the footer's masthead (src/data/wordmark.ts): the letters H O T L A N D of
the site's own face, Geologica, heavy and cut sharp (SHRP 100), sized to the box the pages cut for the word: the O
runs from 725 above the line to 10 below it (so the capitals stand about 705 high, a hair above the line), y pointing
down. Curves are written as cubic (M, L, C only).

  cd tools/fonts && npm i @fontsource-variable/geologica --no-save
  python3 wordmark.py [weight] [fine weight]        (defaults 800 and 400; needs fonttools and brotli)
"""
import os, sys
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.basePen import BasePen
from fontTools.pens.boundsPen import BoundsPen

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
FS = next((d for d in (os.path.join(HERE, 'node_modules', '@fontsource-variable'), os.path.join(ROOT, 'node_modules', '@fontsource-variable'))
           if os.path.isdir(d)), '')
WEIGHT = int(sys.argv[1]) if len(sys.argv) > 1 else 800
FINE = int(sys.argv[2]) if len(sys.argv) > 2 else 400
CAP = 714
# spacing between each pair, in the output's units, on top of the font's own (set by eye for the giant word; the T
# and the L stand apart: the line of red light runs between them)
KERN = {'HO': 0, 'OT': -8, 'TL': 84, 'LA': -44, 'AN': -8, 'ND': 0}


class Path(BasePen):
    def __init__(self, glyphs, s, dy):
        super().__init__(glyphs)
        self.s, self.dy, self.out = s, dy, []
    def _n(self, v):
        r = round(v * self.s, 1)
        return str(int(r)) if r == int(r) else str(r)
    def _pt(self, p):
        return f'{self._n(p[0])} {self._n(-p[1] + self.dy / self.s)}'
    def _moveTo(self, p): self.out.append('M' + self._pt(p))
    def _lineTo(self, p): self.out.append('L' + self._pt(p))
    def _curveToOne(self, a, b, c): self.out.append('C' + ' '.join(self._pt(p) for p in (a, b, c)))
    def _closePath(self): self.out.append('Z')
    def _endPath(self): pass


def glyph_rows(weight):
    font = TTFont(os.path.join(FS, 'geologica', 'files', 'geologica-latin-full-normal.woff2'))
    font = instancer.instantiateVariableFont(font, {'wght': weight, 'SHRP': 100, 'CRSV': 0, 'slnt': 0})
    glyphs, cmap, hmtx = font.getGlyphSet(), font.getBestCmap(), font['hmtx']
    def bounds(ch):
        bp = BoundsPen(glyphs); glyphs[cmap[ord(ch)]].draw(bp); return bp.bounds
    cap = bounds('H')[3]
    o = bounds('O')
    # the O fills the box the pages cut for the word: 725 above the line, 10 below
    s = (CAP + 11 + 10) / (o[3] - o[1])
    dy = 10 + o[1] * s
    rows = []
    for ch in 'HOTLAND':
        g = cmap[ord(ch)]
        pen = Path(glyphs, s, dy); glyphs[g].draw(pen)
        b = bounds(ch)
        rows.append(f"  {ch}: [{round(hmtx[g][0] * s)}, {round(b[0] * s)}, {round(b[2] * s)}, '{''.join(pen.out)}'],")
    print('weight', weight, 'scale', round(s, 4), 'capitals', round(cap * s, 1), 'line at', round(dy, 1))
    return rows


def main():
    rows, fine = glyph_rows(WEIGHT), glyph_rows(FINE)
    kern = ', '.join(f'{k}: {v}' for k, v in KERN.items())
    p = os.path.join(ROOT, 'src', 'data', 'wordmark.ts')
    src = open(p, encoding='utf-8').read()
    b = src.index('/** Scale an outline by s')
    head = ('// The HOTLAND logotype as vector outlines, shared by the home hero (Hero.astro) and the footer\'s masthead\n'
            '// (Mast.astro), so the name is set in one face everywhere on the page.\n'
            f'// HOTLAND in Geologica (weight {WEIGHT}, cut sharp: SHRP 100), the site\'s own face, as outlines (tools/fonts/wordmark.py\n'
            '// writes them): the O runs from 725 above the line to 10 below it. As vectors the word is sharp at any size,\n'
            '// needs no web font to load and can be cut out of black for the film. [advance, ink left, ink right, outline]\n')
    body = ('export const GLYPHS: Record<string, [number, number, number, string]> = {\n' + '\n'.join(rows) + '\n};\n'
            f'// The same letters at weight {FINE}: the name as the wall carries it, in fine steel capitals set wide apart\n'
            '// (the 18+ door, AgeGate.astro; the header).\n'
            'export const FINE: Record<string, [number, number, number, string]> = {\n' + '\n'.join(fine) + '\n};\n'
            '// display spacing for the giant word, on top of the font\'s own\n'
            f'export const KERN: Record<string, number> = {{ {kern} }};\n')
    open(p, 'w', encoding='utf-8', newline='\n').write(head + body + src[b:])


if __name__ == '__main__':
    main()
