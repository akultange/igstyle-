"""The site's own web fonts (public/fonts), instead of Google Fonts.

Google's stylesheet held up the first paint (another server to reach before anything shows) and the ruble sign
alone pulled in a 300 KB "latin-ext" file. Here the faces come from the site itself, under the SIL Open Font License
(Google's own fonts, which the Fontsource packages mirror).

The faces of «Между» (2026-11-21; three voices since 2026-11-23): two fonts.
  Inter Tight          Text: everything a guest reads, 400 and 500.
  Roboto Flex          Dial: the big voice (page names, section headings, numbers). Its widths (25 to 151) and weights (100 to 1000) stay
                       variable; its optical size is set to 144, the drawing for display sizes. (Roboto Flex changes
                       a great deal with optical size: at 14, its narrowest width is barely narrow and its hairline
                       is a text weight. The approved board was drawn at 144 for everything big, so that is the cut.)
  Roboto Flex Label    Label: navigation, buttons, short dates, prices in lists, serial numbers, 11 to 15px. The same
                       font cut once more at the optical size of small type (14), at the one width (40) and weight
                       (600) the voice uses, so it is a single small file.
Roboto Flex's other axes (grade, slant and the parametric ones) are set to their defaults.
(Geologica and Geologica Sharp, the faces of the burgundy site until 2026-11-20, were taken out on 2026-11-23: no part
used them.) The Dial's faces wait for their file (font-display: block; the first screen preloads them): in a
stand-in a hairline condensed title came up heavy and wide, then jumped. The text and the Label show at once (swap).

Each face comes in two files per alphabet: a core with every letter and sign the pages use today (the Russian
alphabet; plain Latin, the digits and the punctuation in use, and the ruble sign, moved in from Google's latin-ext
file), and the rest of that alphabet in a second file, fetched only by a page that uses one of those letters (a
bar menu's Moët). The core is what a page needs; at a third lighter, the first screen comes sooner.

Run it again only to change the fonts:
  cd tools/fonts && npm i @fontsource-variable/inter-tight @fontsource-variable/roboto-flex --no-save --prefix .
  python3 build.py [face ...]     (needs fonttools and brotli: pip install fonttools brotli)
(--prefix . keeps the packages in tools/fonts/node_modules, out of the site's own node_modules.)
With no names it rebuilds every face whose package is installed. With names (the files' stems: inter-tight,
roboto-flex, roboto-flex-label) it rebuilds only those, and every other face keeps its
files and its rules exactly as they are, so a new face doesn't reissue the others under new names.
It writes public/fonts/*.woff2 (named by their contents, so they can be cached for good), src/styles/fonts.css, and
the files to preload into src/data/fonts.json (Base.astro picks the ones the first screen needs).
"""
import hashlib, io, json, os, re, sys
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
# the Fontsource packages: installed here, or (npm's choice when this folder has no package.json and --prefix is left
# out) in the site's own
FS = next((d for d in (os.path.join(HERE, 'node_modules', '@fontsource-variable'), os.path.join(ROOT, 'node_modules', '@fontsource-variable'))
           if os.path.isdir(d)), os.path.join(HERE, 'node_modules', '@fontsource-variable'))
OUT = os.path.join(ROOT, 'public', 'fonts')
CSS = os.path.join(ROOT, 'src', 'styles', 'fonts.css')
JSON = os.path.join(ROOT, 'src', 'data', 'fonts.json')

# Google's split (what each source file covers)
CYR = 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116'
LAT = ('U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, '
       'U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD')
RUB = 0x20BD
# The core: every character the pages use today (2026-11-13: 146 of them). Outside the Russian alphabet and plain
# Latin: the no-break space, © « » · ‑ – — ’ “ ” „ … ₽ and the minus.
CORE = {
    'cyr': 'U+0401, U+0410-044F, U+0451, U+2116',
    'lat': 'U+0020-007E, U+00A0, U+00A9, U+00AB, U+00B7, U+00BB, U+2010-2015, U+2018-201E, U+2026, U+20BD, U+2212',
}

# family; source package and file stem; the site's own name for it; the axes kept, as (lowest, default, highest);
# the axes set to one value. Any other axis of the font is set to its default. A face whose weight or width is set
# to one value says so in its rule (font-weight 600, font-stretch 40%), so the browser never mistakes it for a range.
FACES = [
    ('Inter Tight', 'inter-tight', 'inter-tight-{}-wght-normal', 'inter-tight',
     {'wght': (400, 400, 500)}, {}),
    ('Roboto Flex', 'roboto-flex', 'roboto-flex-{}-full-normal', 'roboto-flex',
     {'wght': (100, 400, 1000), 'wdth': (25, 100, 151)}, {'opsz': 144}),
    ('Roboto Flex Label', 'roboto-flex', 'roboto-flex-{}-full-normal', 'roboto-flex-label',
     {}, {'opsz': 14, 'wdth': 40, 'wght': 600}),
]


def load(pkg, stem, subset_name):
    # (every font keeps its source's own date: with the date of the build in it, every run renamed every file, and
    # browsers fetched again fonts that hadn't changed)
    return TTFont(os.path.join(FS, pkg, 'files', stem.format(subset_name) + '.woff2'), recalcTimestamp=False)


def installed(pkg, stem):
    return all(os.path.exists(os.path.join(FS, pkg, 'files', stem.format(s) + '.woff2')) for s in ('cyrillic', 'latin', 'latin-ext'))


def trimmed(font, keep, pins):
    """Only the axes the site uses, over the range it uses; every other axis set to one value (its default, unless
    it is pinned to another)."""
    limits = {}
    for a in font['fvar'].axes:
        if a.axisTag in keep:
            lo, default, hi = keep[a.axisTag]
            limits[a.axisTag] = instancer.AxisTriple(max(lo, a.minValue), default, min(hi, a.maxValue))
        else:
            limits[a.axisTag] = pins.get(a.axisTag, a.defaultValue)
    return instancer.instantiateVariableFont(font, limits)


def codepoints(ranges):
    out = set()
    for part in ranges.split(','):
        a, _, b = part.strip()[2:].partition('-')
        out.update(range(int(a, 16), int(b or a, 16) + 1))
    return out


def as_range(cps):
    """Code points as a unicode-range: runs written as U+XXXX-YYYY."""
    cps = sorted(cps)
    runs, start = [], None
    for i, c in enumerate(cps):
        if start is None:
            start = c
        if i + 1 == len(cps) or cps[i + 1] != c + 1:
            runs.append(f'U+{start:04X}' if start == c else f'U+{start:04X}-{c:04X}')
            start = None
    return ', '.join(runs)


def with_ruble(font, donor):
    """The ruble sign moved into this (Latin) file from Google's latin-ext one: its outline, its variations and its
    width. The advance widths' own variation tables (HVAR, VVAR) are dropped, as the font format allows: the widths
    then follow the outline's variations (gvar), which carry them too."""
    font.ensureDecompiled()  # every table read in, before the glyph order changes
    donor.ensureDecompiled()
    name = donor.getBestCmap()[RUB]
    order = font.getGlyphOrder()
    if name in order:
        name = name + '.rub'
    font['glyf'].glyphs[name] = donor['glyf'][donor.getBestCmap()[RUB]]
    font['glyf'].glyphOrder = order + [name]
    font.setGlyphOrder(order + [name])
    font['hmtx'].metrics[name] = donor['hmtx'].metrics[donor.getBestCmap()[RUB]]
    font['gvar'].variations[name] = donor['gvar'].variations[donor.getBestCmap()[RUB]]
    if 'vmtx' in font:  # (Golos also carries vertical metrics)
        font['vmtx'].metrics[name] = donor['vmtx'].metrics[donor.getBestCmap()[RUB]] if 'vmtx' in donor else (font['vhea'].advanceHeightMax, 0)
    for table in font['cmap'].tables:
        if table.isUnicode():
            table.cmap[RUB] = name
    for tag in ('HVAR', 'VVAR'):
        if tag in font:
            del font[tag]
    # round-trip, so every table agrees on the new glyph count
    b = io.BytesIO()
    font.save(b)
    b.seek(0)
    return TTFont(b, recalcTimestamp=False)


def with_hyphens(font):
    """The hyphen (U+2010) and the no-break hyphen (U+2011) drawn as the plain hyphen, where a font leaves them out
    (Inter Tight and Roboto Flex do). The pages join words with the no-break one («шоу‑программа»), and without
    it the browser takes that one sign from another font."""
    for table in font['cmap'].tables:
        if table.isUnicode() and 0x2D in table.cmap:
            for cp in (0x2010, 0x2011):
                table.cmap.setdefault(cp, table.cmap[0x2D])
    return font


def only(font, unicodes):
    opts = subset.Options()
    opts.layout_features = ['*']
    opts.flavor = 'woff2'
    opts.notdef_outline = True
    s = subset.Subsetter(opts)
    s.populate(unicodes=unicodes)
    s.subset(font)
    return font


def save(font, name):
    font.flavor = 'woff2'
    font.recalcTimestamp = False
    b = io.BytesIO()
    font.save(b)
    data = b.getvalue()
    file = f'{name}.{hashlib.sha1(data).hexdigest()[:8]}.woff2'
    with open(os.path.join(OUT, file), 'wb') as f:
        f.write(data)
    return file, len(data)


def span(axis, keep, pins, unit=''):
    """What a rule says about an axis: the range kept, or the one value it is set to (None: not the face's to say)."""
    if axis in keep:
        return f'{keep[axis][0]}{unit} {keep[axis][2]}{unit}'
    if axis in pins:
        return f'{pins[axis]}{unit}'
    return None


def face(family, file, rng, keep, pins):
    weight = span('wght', keep, pins) or '400'
    stretch = span('wdth', keep, pins, '%')
    return ('@font-face {\n'
            f"  font-family: '{family}';\n  font-style: normal;\n  font-weight: {weight};\n"
            + (f'  font-stretch: {stretch};\n' if stretch else '')
            + f"  font-display: {'block' if family == 'Roboto Flex' else 'swap'};\n  src: url('/fonts/{file}') format('woff2');\n  unicode-range: {rng};\n}}")


def current():
    """The rules and files there are now: what a face that isn't being rebuilt keeps."""
    rules = []
    if os.path.exists(CSS):
        for block in re.findall(r'@font-face \{.*?\n\}', open(CSS, encoding='utf-8').read(), re.S):
            fam = re.search(r"font-family: '([^']+)'", block).group(1)
            src = re.search(r"url\('/fonts/([^']+)'\)", block).group(1)
            rules.append((fam, src, block))
    files = json.load(open(JSON, encoding='utf-8')) if os.path.exists(JSON) else {}
    return rules, files


def main(names):
    os.makedirs(OUT, exist_ok=True)
    known = {f[3] for f in FACES}
    unknown = set(names) - known
    if unknown:
        sys.exit(f'no such face: {", ".join(sorted(unknown))} (the faces: {", ".join(f[3] for f in FACES)})')
    rebuild = [f for f in FACES if (f[3] in names if names else installed(f[1], f[2]))]
    for f in rebuild:
        if not installed(f[1], f[2]):
            sys.exit(f'{f[0]}: the package @fontsource-variable/{f[1]} is not installed (see the top of this file)')
    old_rules, old_files = current()
    families = {f[0] for f in rebuild}
    stems = {f[3] for f in rebuild}
    # a rebuilt face's old files go (only theirs: the others stay exactly as they are)
    for key, path in old_files.items():
        if re.sub(r'-(cyr|lat)(-x)?$', '', key) in stems:
            p = os.path.join(OUT, os.path.basename(path))
            if os.path.exists(p):
                os.remove(p)
    core_css, rest_css, files = [], [], {}
    for family, pkg, stem, name, keep, pins in FACES:
        if name not in stems:
            # kept as it is: its rules (the cores first, then the rest, as they stood) and its files
            for fam, src, block in old_rules:
                if fam == family:
                    (rest_css if re.search(r'-x\.[0-9a-f]{8}\.woff2$', src) else core_css).append(block)
            files.update({k: v for k, v in old_files.items() if re.sub(r'-(cyr|lat)(-x)?$', '', k) == name})
            continue
        for part, src_subset, rng in (('cyr', 'cyrillic', CYR), ('lat', 'latin', LAT)):
            whole = codepoints(rng)
            source = load(pkg, stem, src_subset)
            if part == 'lat':
                source = with_hyphens(with_ruble(source, load(pkg, stem, 'latin-ext')))
                whole.add(RUB)
            source = trimmed(source, keep, pins)
            have = set(source.getBestCmap()) & whole
            core = have & codepoints(CORE[part])
            for key, cps, out in ((f'{name}-{part}', core, core_css), (f'{name}-{part}-x', have - core, rest_css)):
                if not cps:
                    continue
                font = only(TTFont(_copy(source), recalcTimestamp=False), sorted(cps))
                file, size = save(font, key)
                files[key] = f'/fonts/{file}'
                print(f'{file:44} {size / 1024:6.1f} KB  {len(cps)} characters')
                out.append(face(family, file, CORE[part] if out is core_css else as_range(cps), keep, pins))
    head = ['/* The site\'s web fonts, served by the site itself (tools/fonts/build.py writes this file and public/fonts).',
            '   Per face and alphabet: the core (what the pages use) and the rest (fetched only where a page uses it).',
            '   Inter Tight is the text; Roboto Flex (cut at the optical size for display) is the Dial; Roboto Flex Label (cut at',
            '   the optical size of small type, one width and weight) is the Label. The Dial waits for its own face (font-display:',
            '   block, a moment at most: the first screen preloads it) where the text and the Label show at once in a stand-in:',
            '   in Arial a hairline condensed title came up heavy and wide, then jumped to the Dial. */']
    with open(CSS, 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(head + core_css + rest_css) + '\n')
    with open(JSON, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(dict(sorted(files.items())), f, indent=2)
        f.write('\n')


def _copy(font):
    font.recalcTimestamp = False
    b = io.BytesIO()
    font.save(b)
    b.seek(0)
    return b


if __name__ == '__main__':
    main(sys.argv[1:])
