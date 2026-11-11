# Builds fonts/wee-hand.woff2 (register 890): Short Stack (OFL, Sorkin Type Co) redrawn on a pixel grid.
# Each glyph is drawn large and a grid cell is inked when enough of it is covered, at a size where the
# face's stroke is one pixel wide, so letters keep their hand and their counters stay open. Letters are set
# one pixel apart. Run: python3 tools/pixelFont.py <ShortStack-Regular.ttf>
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

SRC = sys.argv[1]
EM, SS, TH, U = 12, 8, 0.40, 100       # grid cells per em, samples per cell, cover needed, font units per cell
CHARS = [chr(c) for c in range(33, 127)] + list('’‘“”…–×·≤≥←→↑↓é')
have = TTFont(SRC).getBestCmap()
f = ImageFont.truetype(SRC, EM * SS)
asc, desc = f.getmetrics()
top = -asc % SS                         # so the baseline falls between two cells
base = (top + asc) // SS

# The face's own figures are too loose to tell apart at this size (its 1 reads as an exclamation mark), so the
# ten figures are drawn by hand here, eight cells tall like its capitals, a little uneven like the letters.
DIGITS = {
    '0': ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '#..#.', '.##..'],
    '1': ['..#.', '.##.', '#.#.', '..#.', '..#.', '..#.', '..#.', '.###'],
    '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#....', '####.'],
    '3': ['###..', '...#.', '...#.', '.##..', '...#.', '....#', '#...#', '.###.'],
    '4': ['...#.', '..##.', '.#.#.', '#..#.', '#..#.', '#####', '...#.', '...#.'],
    '5': ['.####', '.#...', '#....', '###..', '...#.', '....#', '#...#', '.###.'],
    '6': ['..##.', '.#...', '#....', '###..', '#..#.', '#...#', '#...#', '.###.'],
    '7': ['#####', '....#', '...#.', '...#.', '..#..', '..#..', '.#...', '.#...'],
    '8': ['.##..', '#..#.', '#..#.', '.##..', '#..#.', '#...#', '#...#', '.###.'],
    '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '...#.', '.##..'],
}
def cells(ch):
    if ch in DIGITS:
        g = np.zeros((base + 4, len(DIGITS[ch][0])), bool)
        for i, row in enumerate(DIGITS[ch]): g[base - 8 + i] = [c == '#' for c in row]
        return g
    w = int(f.getlength(ch)) + 4 * SS; h = top + asc + desc + 2 * SS
    w += -w % SS; h += -h % SS
    im = Image.new('L', (w, h), 0); ImageDraw.Draw(im).text((2 * SS, top), ch, 255, font=f)
    g = (np.array(im) / 255).reshape(h // SS, SS, w // SS, SS).mean((1, 3)) >= TH
    cols = np.where(g.any(0))[0]
    return g[:, cols[0]:cols[-1] + 1] if len(cols) else None

glyphs, metrics, cmap, order = {}, {}, {}, ['.notdef', 'space']
def empty():
    return TTGlyphPen(None).glyph()
glyphs['.notdef'] = empty(); metrics['.notdef'] = (4 * U, 0)
glyphs['space'] = empty(); metrics['space'] = (4 * U, 0); cmap[32] = 'space'; cmap[0xA0] = 'space'
for ch in CHARS:
    if ord(ch) not in have: continue
    g = cells(ch)
    if g is None: continue
    name = 'u%04X' % ord(ch); pen = TTGlyphPen(None)
    for y, row in enumerate(g):
        x = 0
        while x < len(row):
            if not row[x]: x += 1; continue
            n = 1
            while x + n < len(row) and row[x + n]: n += 1
            x0, x1, y1, y0 = x * U, (x + n) * U, (base - y) * U, (base - y - 1) * U
            pen.moveTo((x0, y0)); pen.lineTo((x0, y1)); pen.lineTo((x1, y1)); pen.lineTo((x1, y0)); pen.closePath()
            x += n
    glyphs[name] = pen.glyph(); metrics[name] = ((g.shape[1] + 1) * U, 0); cmap[ord(ch)] = name; order.append(name)

fb = FontBuilder(EM * U, isTTF=True)
fb.setupGlyphOrder(order); fb.setupCharacterMap(cmap); fb.setupGlyf(glyphs); fb.setupHorizontalMetrics(metrics)
fb.setupHorizontalHeader(ascent=base * U, descent=-(-(-desc // SS)) * U)
fb.setupNameTable({'familyName': 'Wee Hand', 'styleName': 'Regular', 'copyright': 'Derived from Short Stack, Copyright (c) 2011 by Sorkin Type Co. SIL Open Font License 1.1.', 'licenseDescription': 'SIL Open Font License 1.1'})
fb.setupOS2(sTypoAscender=base * U, sTypoDescender=-(-(-desc // SS)) * U, usWinAscent=base * U, usWinDescent=-(-desc // SS) * U)
fb.setupPost()
fb.font.flavor = 'woff2'; fb.save('fonts/wee-hand.woff2')
print(len(order), 'glyphs, baseline at cell', base)
