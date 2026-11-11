# Builds fonts/wee-hand.woff2 (register 890): Short Stack (OFL, Sorkin Type Co) redrawn on a pixel grid.
# Each glyph is drawn large and a grid cell is inked when enough of it is covered, at a size where the
# face's stroke is one pixel wide, so letters keep their hand and their counters stay open. Letters are set
# one pixel apart. Run from the repo: PYTHONPATH=tools python3 tools/pixelFont.py <ShortStack-Regular.ttf> [proof.png]
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from pixelGlyphs import DRAWN

SRC = sys.argv[1]
EM, SS, TH, U = 12, 8, 0.40, 100       # grid cells per em, samples per cell, cover needed, font units per cell
CHARS = [chr(c) for c in range(33, 127)] + list('’‘“”…–×·≤≥←→↑↓é')
have = TTFont(SRC).getBestCmap()
f = ImageFont.truetype(SRC, EM * SS)
asc, desc = f.getmetrics()
top = -asc % SS                         # so the baseline falls between two cells
base = (top + asc) // SS

# The clean-up (register 893), so a letter is one line of single pixels:
# 1. no double lines: where four cells make a full square, one that the shape does not need is taken out;
# 2. no stray dots: a cell touching nothing is dropped, unless the letter is one that has a dot.
DOTTED = set('ij.:;!?…·\'"’‘“”é%')
RING = [(-1, -1), (-1, 0), (-1, 1), (0, 1), (1, 1), (1, 0), (1, -1), (0, -1)]
def spare(g, y, x):
    """True when the cell at y, x can go: it is no line's end and its neighbours stay joined without it."""
    on = [bool(g[y + dy, x + dx]) for dy, dx in RING]
    if sum(on) < 2: return False
    # the neighbours, walked round the ring, must be one run (cells joined edge to edge or corner to corner)
    runs = sum(1 for i in range(8) if on[i] and not on[i - 1])
    if runs == 0: return False
    if runs == 1: return True
    # two runs that touch across a corner are still one group
    groups = runs
    for i in (0, 2, 4, 6):
        if not on[i] and on[i - 1] and on[(i + 1) % 8]: groups -= 1
    return groups <= 1
def clean(g, ch):
    g = np.pad(g, 1)
    changed = True
    while changed:
        changed = False
        for y in range(1, g.shape[0] - 2):
            for x in range(1, g.shape[1] - 2):
                if g[y, x] and g[y, x + 1] and g[y + 1, x] and g[y + 1, x + 1]:
                    # take the corner with the fewest neighbours outside the square: the one that sticks out least
                    best = None
                    for cy, cx in ((y, x), (y, x + 1), (y + 1, x), (y + 1, x + 1)):
                        if not spare(g, cy, cx): continue
                        n = g[cy - 1:cy + 2, cx - 1:cx + 2].sum()
                        if best is None or n < best[0]: best = (n, cy, cx)
                    if best: g[best[1], best[2]] = False; changed = True
    if ch not in DOTTED:
        for y in range(1, g.shape[0] - 1):
            for x in range(1, g.shape[1] - 1):
                if g[y, x] and g[y - 1:y + 2, x - 1:x + 2].sum() == 1: g[y, x] = False
    return g[1:-1, 1:-1]
def cells(ch):
    if ch in DRAWN:
        rs, drop = DRAWN[ch]; w = max(len(r) for r in rs)
        g = np.zeros((base + 4, w), bool)
        for i, row in enumerate(rs): g[base + drop - len(rs) + i, :len(row)] = [c == '#' for c in row]
        return g
    w = int(f.getlength(ch)) + 4 * SS; h = top + asc + desc + 2 * SS
    w += -w % SS; h += -h % SS
    im = Image.new('L', (w, h), 0); ImageDraw.Draw(im).text((2 * SS, top), ch, 255, font=f)
    g = (np.array(im) / 255).reshape(h // SS, SS, w // SS, SS).mean((1, 3)) >= TH
    g = clean(g, ch)
    cols = np.where(g.any(0))[0]
    return g[:, cols[0]:cols[-1] + 1] if len(cols) else None

glyphs, metrics, cmap, order = {}, {}, {}, ['.notdef', 'space']
def empty():
    return TTGlyphPen(None).glyph()
glyphs['.notdef'] = empty(); metrics['.notdef'] = (4 * U, 0)
glyphs['space'] = empty(); metrics['space'] = (4 * U, 0); cmap[32] = 'space'; cmap[0xA0] = 'space'
for ch in CHARS:
    if ord(ch) not in have and ch not in DRAWN: continue
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

# The rules every drawn letter keeps (registers 894 to 896): no full square of four cells, and no cell that
# touches nothing unless the letter has a dot. The build stops on a letter that breaks one.
for ch in DRAWN:
    g = np.pad(cells(ch), 1)
    square = any(g[y:y + 2, x:x + 2].all() for y in range(g.shape[0] - 1) for x in range(g.shape[1] - 1))
    loose = ch not in DOTTED and any(g[y, x] and g[y - 1:y + 2, x - 1:x + 2].sum() == 1 for y in range(1, g.shape[0] - 1) for x in range(1, g.shape[1] - 1))
    widths = {len(r) for r in DRAWN[ch][0]}
    assert not square and not loose and len(widths) == 1, (ch, 'square' if square else 'loose cell' if loose else 'uneven rows')
fb = FontBuilder(EM * U, isTTF=True)
fb.setupGlyphOrder(order); fb.setupCharacterMap(cmap); fb.setupGlyf(glyphs); fb.setupHorizontalMetrics(metrics)
fb.setupHorizontalHeader(ascent=base * U, descent=-(-(-desc // SS)) * U)
fb.setupNameTable({'familyName': 'Wee Hand', 'styleName': 'Regular', 'copyright': 'Derived from Short Stack, Copyright (c) 2011 by Sorkin Type Co. SIL Open Font License 1.1.', 'licenseDescription': 'SIL Open Font License 1.1'})
fb.setupOS2(sTypoAscender=base * U, sTypoDescender=-(-(-desc // SS)) * U, usWinAscent=base * U, usWinDescent=-(-desc // SS) * U)
fb.setupPost()
fb.font.flavor = 'woff2'; fb.save('fonts/wee-hand.woff2')
print(len(order), 'glyphs, baseline at cell', base)
# A proof sheet for the eye: each line in the hand, and under it the same line in the face it was drawn from.
# python3 tools/pixelFont.py <ttf> <out.png>
if len(sys.argv) > 2:
    text = ['abcdefghijklmnopqrstuvwxyz', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '0123456789 ?!:;.,()+-=/\'"%&#@', 'Swipe across the room, or press an', 'arrow key, to slide Wee.']
    S = 6; img = Image.new('RGB', (230 * S, len(text) * 34 * S), '#f7f1de'); d = ImageDraw.Draw(img); big = ImageFont.truetype(SRC, EM * S)
    for r, line in enumerate(text):
        x = 2
        for ch in line:
            g = cells(ch) if ch != ' ' else None
            if g is not None:
                for yy, xx in zip(*np.where(g)): d.rectangle([(x + xx) * S, (r * 34 + yy) * S, (x + xx + 1) * S - 1, (r * 34 + yy + 1) * S - 1], fill='#4a3526')
            x += (g.shape[1] + 1) if g is not None else 4
        d.text((2 * S, (r * 34 + 17) * S), line, '#c9571a', font=big)
    img.save(sys.argv[2])
