# Writes the campaign map room (register 932) from the plan: python3 mapRoom.py plan.json out.wee
import json

import sys
plan = json.load(open(sys.argv[1]))
by = {int(p['id']): {'main': p['id'], 'side': p['side']} for p in plan}
BANDS = [
    [('Start', [1]), ('Door land', [2, 3, 4])],
    [('Box land', [5, 6]), ('Button land', [7, 8])],
    [('One-way land', [9, 10]), ('Powered land', [12, 13])],
    [('Laser land', [14, 15, 17]), ('Relay land', [18, 19, 20])],
    [('Spike land', [21, 22, 23, 24])],
]
SCENERY = {
    'Start': [('goal', 0, 0), ('goal', 3, 1)],
    'Door land': [('door:blue', 0, 0), ('toggle:blue', 3, 2), ('door:blue', 1, 2)],
    'Box land': [('box', 0, 0), ('box', 2, 1), ('box', 3, 0)],
    'Button land': [('button:blue', 0, 1), ('button:blue', 3, 0), ('box', 1, 0)],
    'One-way land': [('gate:right', 0, 0), ('gate:up', 2, 1), ('gate:left', 3, 2)],
    'Powered land': [('button:red', 0, 0), ('gate:up@red', 3, 1)],
    'Laser land': [('turret:right', 0, 0), ('turret:left', 4, 1)],
    'Relay land': [('turret:right', 0, 0), ('sensor:blue', 1, 0), ('sensor:blue', 4, 1)],
    'Spike land': [('death', 0, 0), ('death', 1, 0), ('death', 3, 1), ('death', 2, 2), ('death', 0, 2)],
}
PLAZA = 5; SLOT = 9; X0 = 2; BW = 64
W = X0 + BW + 2; BAND_H = 9; H = 3 + len(BANDS) * BAND_H + 1
cells = [['wall'] * W for _ in range(H)]; ents = []; place = []; signs = []
def setc(x, y, v): cells[y][x] = v
prev_end = None
for b, band in enumerate(BANDS):
    y = 5 + b * BAND_H; east = b % 2 == 0
    widths = [PLAZA + SLOT * len(l) for _, l in band]
    total = sum(widths)
    # street spans the whole band so the corner connectors meet it
    for x in range(X0, X0 + BW): setc(x, y, '')
    cur = X0 if east else X0 + BW - 1
    for (name, lvs), w in zip(band, widths):
        # plaza: the land's own scenery round the street
        px = cur if east else cur - PLAZA + 1
        step = (lambda d: px + d) if east else (lambda d: px + PLAZA - 1 - d)
        def piece(kind, xx, yy):
            if kind == 'box': setc(xx, yy, ''); ents.append({'kind': 'box', 'x': xx, 'y': yy, 'dir': 1, 'mode': 'input'})
            elif kind.startswith('turret'): setc(xx, yy, ''); ents.append({'kind': 'turret', 'x': xx, 'y': yy, 'turret': {'dirs': [kind.split(':')[1]], 'mode': 'input'}})
            else: setc(xx, yy, kind)
        # the land's pieces lie about in the ground below it, off the path
        span = PLAZA + SLOT * len(lvs); left = px if east else cur - span + 1
        signx = px if east else px + PLAZA - 6
        for k in range(3):
            bx = left + 7 + k * ((span - 12) // 3) if east else left + 1 + k * ((span - 12) // 3)
            for kind, dx, dy in SCENERY[name]:
                piece(kind, bx + dx, y + 4 + dy)
        # what happens on the way in, once, by itself
        way = 'right' if east else 'left'
        ENTRY = {'Door land': [('toggle:blue', 1), ('door:blue', 3)], 'Box land': [('box', 1)],
                 'Button land': [('box', 1), ('button:blue', 3)], 'One-way land': [('gate:' + way, 2)],
                 'Powered land': [('button:red', 1), ('gate:' + way + '@red', 3)]}
        for kind, dd in ENTRY.get(name, []): piece(kind, step(dd), y)
        signs.append({'name': name, 'x': signx, 'y': y + 5, 'right': not east})
        cur = cur + PLAZA if east else cur - PLAZA
        for lv in lvs:
            x0 = cur if east else cur - SLOT + 1
            s = by.get(lv)
            stop = (x0 + 4, y)
            setc(*stop, 'gravel')
            place.append({'for': s['main'], 'stop': stop, 'card': 'up'})
            side = s['side']
            if len(side) == 1:
                place.append({'for': side[0], 'stop': stop, 'card': 'down'})
            for j, f in enumerate(side if len(side) == 2 else []):
                st = (x0 + j * 5 + 2, y)
                setc(*st, 'gravel')
                place.append({'for': f, 'stop': st, 'card': 'down'})
            if lv == 1: wee = stop
            cur = cur + SLOT if east else cur - SLOT
    # corner down to the next band at this band's far end
    if b < len(BANDS) - 1:
        cx = X0 + BW if east else X0 - 1
        for yy in range(y, y + BAND_H + 1): setc(cx, yy, '')
        for x in (range(X0 + BW - 1, X0 + BW + 1) if east else range(X0 - 1, X0 + 1)): setc(x, y + BAND_H, '')
level = {'format': 'wee-level', 'version': 1, 'name': 'Map', 'map': True, 'w': W, 'h': H, 'cells': [c for row in cells for c in row],
         'start': {'x': wee[0], 'y': wee[1]}, 'entities': ents,
         'powers': {k: False for k in ['boomerang', 'dive', 'laser', 'cycle', 'swim', 'light', 'armored']}, 'clock': 'tile',
         'spots': [{'x': p['stop'][0], 'y': p['stop'][1], 'for': p['for'], 'card': p['card']} for p in place],
         'signs': [{'x': g['x'], 'y': g['y'], 'text': g['name']} for g in signs]}
json.dump(level, open(sys.argv[2], 'w'), indent=1)
print(W, H, len(place))
