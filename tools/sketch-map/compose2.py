import json
from PIL import Image, ImageDraw, ImageFont, ImageEnhance

room = Image.open('map2-room.png').convert('RGB')
meta = json.load(open('map2-place.json')); level = json.load(open('map2-level.json'))
T = room.width // meta['w']
WALL = (161, 170, 228); INK = (70, 52, 40); PAPER = (247, 240, 222)
FONT = ImageFont.truetype('../fonts/ShortStack-Regular.ttf', 20)
img = room.copy(); d = ImageDraw.Draw(img)
cells = level['cells']; di = next(i for i, v in enumerate(cells) if v == 'door:red')
DOOR = room.crop(((di % meta['w']) * T, (di // meta['w']) * T, (di % meta['w'] + 1) * T, (di // meta['w'] + 1) * T))

def stairs(cx, top, bottom, down):
    w = T * 0.7; x0, x1 = cx - w / 2, cx + w / 2
    d.rectangle((x0, top, x1, bottom), fill=(58, 44, 40))
    for k in range(3):
        y = top + 3 + k * 5 if down else bottom - 5 - k * 5
        d.rectangle((x0 + 3, y, x1 - 3, y + 2), fill=(170, 140, 110))

for p in meta['place']:
    card = Image.open(p['f']).convert('RGB').resize((p['w'] * T, p['h'] * T), Image.LANCZOS)
    if p.get('lv') and p['locked']:
        card = Image.blend(card, Image.new('RGB', card.size, (232, 226, 210)), 0.55)
    x, y = p['x'] * T, p['y'] * T
    img.paste(card, (x, y))
    sx, sy = p['stop']; cx = sx * T + T / 2
    if p['way'] == 'down': stairs(cx, y + p['h'] * T - 10, sy * T, True)
    else:
        stairs(cx, (sy + 1) * T, y + 10, False)
        if p['locked'] and p['w'] == 7: img.paste(DOOR.resize((T, 18)), (sx * T, (sy + 1) * T - 2))
for s in meta['signs']:
    w = d.textlength(s['name'], font=FONT) + 20
    x = s['x'] * T + 4; y = s['y'] * T - 14
    d.rectangle((x, y, x + w, y + 30), fill=PAPER, outline=INK, width=2); d.text((x + 10, y + 3), s['name'], font=FONT, fill=INK)
img.save('map2-full.png')
img.resize((img.width // 2, img.height // 2), Image.LANCZOS).save('map2-overview.png')
# phone view: tiles at 24 css (48 px at 2x), centred on Wee, under the real top bar
k = 48 / T; big = img.resize((round(img.width * k), round(img.height * k)), Image.LANCZOS)
wx, wy = level['start']['x'] * 48, level['start']['y'] * 48
vx = max(0, min(big.width - 786, wx - 330)); vy = max(0, min(big.height - 1586, wy - 620))
head = Image.open('list-now.png').convert('RGB').crop((0, 0, 786, 118))
phone = Image.new('RGB', (786, 1704), PAPER); phone.paste(head, (0, 0)); phone.paste(big.crop((vx, vy, vx + 786, vy + 1586)), (0, 118))
phone.save('map2-phone.png'); print(T, img.size)
