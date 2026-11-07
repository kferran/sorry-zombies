"""Re-dress the GothicVania hero as a hipster (Task 12b).

Reads public/assets/gothicvania-cemetery/atlas.png + atlas.json, edits only the hero frames and writes
atlas-hero-hipster.png + atlas-hero-hipster.json beside them: hero frames only, same names, same 100x59
frame size (so origins and body offsets in the game are unchanged), packed in a compact grid.

    python3 -I tools/hipsterize.py [--sheet DIR]

--sheet DIR also writes DIR/hipster-sheet.png (contact sheet, original over re-dressed, 4x) and
DIR/hipster-preview.png (idle + attack at 8x on bg-graveyard.png).

The source frames all face right (the game flips the sprite for left), so the head props are drawn
facing right only.

Palette of the source hero (colour: count over all 21 frames, role):
  (26,24,52)    5955  outline / darkest cloth     -> kept as is
  (58,27,99)    2358  coat purple, dark           -> flannel (torso) / denim dark (legs)
  (43,20,113)   1532  coat violet shade           -> flannel (torso) / denim (legs)
  (96,33,128)    753  coat purple, mid            -> flannel (torso) / denim (legs)
  (140,36,139)   104  coat purple, highlight      -> flannel highlight
  (58,47,155)    159  coat blue highlight         -> flannel (torso) / denim highlight (legs)
  (138,121,112) 1347  spear shade / hair shade / shin bands
  (213,182,162) 1267  spear mid / hair mid / shin bands
  (255,217,185) 1102  spear light / hair light / shin bands
  (187,110,62)   225  skin mid (face, hands)
  (225,146,77)   108  skin light
  (152,62,29)    203  skin shadow
  (156,5,101)    212  lapel / sash shadow, and the eye pixel
  (213,9,100)     36  lapel / sash light
The creams are shared by spear, hair and shin bands, so they are told apart by region: hair is the
cream connected to the face inside a head box; shin bands are small cream runs low on the legs;
everything else cream (the spear-whip) is left untouched.
"""
import argparse
import json
import os
from collections import deque

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'public', 'assets', 'gothicvania-cemetery')

ORDER = ['idle-1', 'idle-2', 'idle-3', 'idle-4', 'run-1', 'run-2', 'run-3', 'run-4', 'run-5', 'run-6',
         'jump-1', 'jump-2', 'jump-3', 'jump-4', 'attack-1', 'attack-2', 'attack-3', 'attack-4', 'attack-5',
         'crouch', 'hurt']
FW, FH = 100, 59

OUTLINE = (26, 24, 52)
PURPLES = {(58, 27, 99): 0, (43, 20, 113): 1, (96, 33, 128): 2, (58, 47, 155): 2, (140, 36, 139): 3}
CREAM = {(255, 217, 185): 2, (213, 182, 162): 1, (138, 121, 112): 0}
SKIN = {(225, 146, 77), (187, 110, 62), (152, 62, 29)}
MAGENTA = {(213, 9, 100): 1, (156, 5, 101): 0}
EYE = (156, 5, 101)

# Buffalo check: 2x2-px cells; red / black cells alternate, crossings are dark red. Index = cloth shade 0..3.
FLANNEL_RED = [(122, 22, 30), (150, 28, 34), (186, 40, 40), (222, 70, 58)]
FLANNEL_MIX = [(78, 16, 26), (96, 20, 30), (122, 26, 34), (150, 40, 42)]
FLANNEL_BLACK = [(38, 20, 26), (44, 24, 30), (52, 28, 34), (66, 36, 40)]
DENIM = [(30, 40, 84), (36, 50, 104), (48, 70, 132), (68, 96, 160)]
BOOT = {'dark': (64, 36, 22), 'mid': (110, 64, 32), 'light': (156, 98, 50)}
SUSPENDER = {1: (150, 96, 50), 0: (104, 62, 32)}  # lapel strip and sash become leather (suspenders / belt)
HAIR = {2: (104, 66, 40), 1: (84, 52, 32), 0: (64, 40, 26)}
BEARD = [(50, 30, 22), (78, 48, 30)]  # dark, light
BEANIE = {'light': (226, 172, 54), 'mid': (196, 140, 40), 'dark': (150, 100, 30)}  # mustard reads on the dark cemetery
GLASS_FRAME = (12, 10, 14)
GLASS_LENS = (150, 186, 206)

# Head poses the profile detector can't read (no eye pixel in the face): hand-placed from the zoomed
# source frames. eye = the pixel the glasses centre on; None = face not visible (glasses skipped).
# Keys: face (x0,y0,x1,y1 box of the visible face), eye (glasses centre, None = no glasses), facing
# (1 right profile, -1 left profile, 0 seen from the front), hairbox (where hair may be), seed_all (seed
# the hair from every cream pixel in the hairbox, for heads with no face showing), beard_from (first
# beard row when there is no eye to count from).
POSE_OVERRIDES = {
    # Swing wind-up: the spear-whip crosses just under the hair; keep the hair box above it.
    'hero-attack-1': {'hairbox': (39, 14, 50, 29)},
    'hero-attack-2': {'hairbox': (44, 18, 57, 28)},
    # Lunge: the head is turned away, only a 1-px sliver of cheek shows. No glasses; stubble on the sliver.
    'hero-attack-3': {'face': (61, 25, 61, 28), 'eye': None, 'beard_from': 27, 'hairbox': (55, 20, 65, 31)},
    'hero-attack-5': {'face': (61, 25, 61, 28), 'eye': None, 'beard_from': 27, 'hairbox': (55, 20, 65, 31)},
    # Lunge, back of the head only: beanie and hair colour, nothing else. The spear starts at x 67.
    'hero-attack-4': {'face': None, 'eye': None, 'hairbox': (55, 20, 66, 31), 'seed_all': True},
    # Jumping tuck: head seen from above/front, face below the hair.
    'hero-jump-3': {'face': (57, 15, 61, 18), 'eye': (59, 16), 'facing': 0, 'hairbox': (47, 8, 66, 22)},
    'hero-jump-4': {'face': (56, 15, 61, 18), 'eye': (59, 16), 'facing': 0, 'hairbox': (47, 8, 66, 22)},
    # Crouch: head bowed, face framed by hair on both sides.
    'hero-crouch': {'face': (53, 39, 55, 43), 'eye': (54, 40), 'facing': 0, 'hairbox': (48, 33, 59, 48)},
    # Hurt: head thrown back, face turned to the left.
    'hero-hurt': {'face': (29, 24, 31, 29), 'eye': (30, 26), 'facing': -1, 'hairbox': (24, 18, 38, 34)},
}


def rgb(p):
    return p[:3]


def components(px, pred):
    seen, out = set(), []
    for y in range(FH):
        for x in range(FW):
            if (x, y) in seen or not pred(x, y):
                continue
            q, pts = deque([(x, y)]), []
            seen.add((x, y))
            while q:
                a, b = q.popleft()
                pts.append((a, b))
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        n = (a + dx, b + dy)
                        if 0 <= n[0] < FW and 0 <= n[1] < FH and n not in seen and pred(*n):
                            seen.add(n)
                            q.append(n)
            out.append(pts)
    return out


def bbox(pts):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)


def find_head(px, name):
    """Face = the skin component holding the eye pixel; hair = cream joined to it inside a head box."""
    skin = components(px, lambda x, y: px[x, y][3] and rgb(px[x, y]) in SKIN)
    face, eye = None, None
    for comp in skin:
        x0, y0, x1, y1 = bbox(comp)
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if px[x, y][3] and rgb(px[x, y]) == EYE:
                    face, eye = comp, (x, y)
    ov = POSE_OVERRIDES.get(name, {})
    if 'face' in ov:
        face = []
        if ov['face']:
            fx0, fy0, fx1, fy1 = ov['face']
            face = [(x, y) for y in range(fy0, fy1 + 1) for x in range(fx0, fx1 + 1) if rgb(px[x, y]) in SKIN]
    elif face is None:
        raise SystemExit(f'{name}: no eye pixel in any face; add a POSE_OVERRIDES entry')
    if 'eye' in ov:
        eye = ov['eye']
    fx0, fy0, fx1, fy1 = ov['face'] if ov.get('face') else bbox(face) if face else ov['hairbox']
    hb = ov.get('hairbox', (fx0 - 10, fy0 - 6, fx1 + 3, fy1 + 7))
    inbox = lambda x, y: hb[0] <= x <= hb[2] and hb[1] <= y <= hb[3]
    face_set = set(face)
    # Seed the hair from cream pixels touching the face, then grow through cream inside the head box.
    hair, q = set(), deque()
    if ov.get('seed_all'):
        for y in range(hb[1], hb[3] + 1):
            for x in range(hb[0], hb[2] + 1):
                if px[x, y][3] and rgb(px[x, y]) in CREAM:
                    hair.add((x, y))
    for (x, y) in face_set:
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                n = (x + dx, y + dy)
                if 0 <= n[0] < FW and 0 <= n[1] < FH and inbox(*n) and px[n][3] and rgb(px[n]) in CREAM and n not in hair:
                    hair.add(n)
                    q.append(n)
    while q:
        a, b = q.popleft()
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                n = (a + dx, b + dy)
                if 0 <= n[0] < FW and 0 <= n[1] < FH and inbox(*n) and n not in hair and px[n][3] and rgb(px[n]) in CREAM:
                    hair.add(n)
                    q.append(n)
    return {'face': face_set, 'fbox': (fx0, fy0, fx1, fy1), 'eye': eye, 'hair': hair, 'ov': ov,
            'facing': ov.get('facing', 1)}


LEG_TONES = {(43, 20, 113), (58, 47, 155)}


def flannel(x, y, shade):
    cx, cy = (x // 2) % 2, (y // 2) % 2
    pal = FLANNEL_RED if (cx, cy) == (0, 0) else FLANNEL_BLACK if (cx, cy) == (1, 1) else FLANNEL_MIX
    return pal[shade]


def opaque(px, x, y):
    return 0 <= x < FW and 0 <= y < FH and px[x, y][3] > 0


def hipsterize(src, name):
    im = src.copy()
    px = im.load()
    sp = src.load()
    head = find_head(sp, name)
    fx0, fy0, fx1, fy1 = head['fbox']
    hair = head['hair']

    # Waist: lowest lapel/sash pixel (the sash sits on the belt line); fallback for frames without one.
    mag = [(x, y) for y in range(FH) for x in range(FW)
           if sp[x, y][3] and rgb(sp[x, y]) in MAGENTA and (x, y) != head['eye']]
    body = [(x, y) for y in range(FH) for x in range(FW) if sp[x, y][3]]
    by0, by1 = min(p[1] for p in body), max(p[1] for p in body)
    waist = head['ov'].get('waist', max((p[1] for p in mag), default=by0 + int((by1 - by0) * 0.55)))

    # Shin bands: small cream components below the waist, not hair -> boot tops.
    bands = [c for c in components(sp, lambda x, y: sp[x, y][3] and rgb(sp[x, y]) in CREAM)
             if len(c) <= 8 and bbox(c)[1] > waist and not (set(c) & hair)]
    band_px = set(p for c in bands for p in c)
    band_tops = {}
    for (x, y) in band_px:
        band_tops[x] = min(band_tops.get(x, 99), y)

    for y in range(FH):
        for x in range(FW):
            p = sp[x, y]
            if not p[3]:
                continue
            c = rgb(p)
            if c in PURPLES:
                shade = PURPLES[c]
                # The violet/blue tones below the waist are the legs -> jeans; the purple coat tail that
                # hangs below the waist stays shirt (an untucked flannel).
                if y > waist and c in LEG_TONES:
                    px[x, y] = DENIM[shade] + (255,)
                else:
                    px[x, y] = flannel(x, y, shade) + (255,)
            elif c in MAGENTA and (x, y) != head['eye']:
                px[x, y] = SUSPENDER[MAGENTA[c]] + (255,)
            elif (x, y) in hair:
                px[x, y] = HAIR[CREAM[c]] + (255,)
            elif (x, y) in band_px:
                px[x, y] = BOOT['light'] + (255,)

    # Boots: the few rows under each shin band (the foot) turn brown; the outer outline stays.
    for (x, top) in band_tops.items():
        for y in range(top + 1, min(top + 5, FH)):
            if not opaque(sp, x, y) or (x, y) in band_px:
                continue
            edge = any(not opaque(sp, x + dx, y + dy) for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)))
            if rgb(sp[x, y]) == OUTLINE and edge:
                continue
            px[x, y] = (BOOT['dark'] if rgb(sp[x, y]) == OUTLINE else BOOT['mid']) + (255,)

    draw_head(px, sp, head, name)
    return im


def draw_head(px, sp, head, name):
    ov = head['ov']
    fx0, fy0, fx1, fy1 = head['fbox']
    hair = head['hair']
    eye = head['eye']
    facing = head['facing']
    # The spear-whip stays as drawn: head props never paint over cream pixels that aren't hair.
    spear = lambda x, y: sp[x, y][3] and rgb(sp[x, y]) in CREAM and (x, y) not in hair

    def put(x, y, c):
        if 0 <= x < FW and 0 <= y < FH and not spear(x, y):
            px[x, y] = c + (255,)
    ey = eye[1] if eye else ov.get('beard_from', fy0 + 2) - 2
    top = min(y for _, y in hair) if hair else fy0
    cuff = top + 2

    # Hair: short under the beanie. Long hair that hung past the jaw becomes beard along the jaw line
    # (within reach of the face) or the dark shirt collar behind the neck.
    def beard_reach(x):
        if not head['face']:
            return False
        if facing == 1:
            return x >= fx0 - 2
        if facing == -1:
            return x <= fx1 + 2
        return fx0 - 1 <= x <= fx1 + 1
    for (x, y) in hair:
        in_front = head['face'] and ((facing == 1 and x > fx1) or (facing == -1 and x < fx0))
        if in_front and y < ey + 2:
            # The source hair hung in front of the face; short hair doesn't, so this becomes the face's outline.
            put(x, y, OUTLINE)
        elif y >= ey + 2:
            if beard_reach(x) and y <= fy1 + 2:
                put(x, y, BEARD[0])
            else:
                put(x, y, flannel(x, y, 0))

    # Beard: face skin from two rows under the eye down, and one row of chin beard below the jaw.
    if head['face']:
        for (x, y) in head['face']:
            if y >= ey + 2:
                lit = (facing == 1 and x == fx1) or (facing == -1 and x == fx0)
                put(x, y, BEARD[1] if lit and y == ey + 2 else BEARD[0])
        jaw = {}
        for (x, y) in head['face']:
            jaw[x] = max(jaw.get(x, -1), y)
        for x, y in jaw.items():
            if y >= ey + 2:
                put(x, y + 1, BEARD[0])
                if not opaque(sp, x, y + 2):
                    put(x, y + 2, OUTLINE)

    # Glasses: thick black rectangular frames (2 rows tall) with a pale lens pixel; in profile the arm
    # runs back to the hair, seen from the front there are two lenses with a bridge between.
    if eye:
        ex, eyy = eye
        if facing == 0:
            gx0, gx1 = min(fx0, ex - 2), max(fx1, ex + 2)
            for x in range(gx0, gx1 + 1):
                put(x, eyy - 1, GLASS_FRAME)
                put(x, eyy, GLASS_FRAME)
            put(ex - 1, eyy, GLASS_LENS)
            put(ex + 1, eyy, GLASS_LENS)
        else:
            for x in range(ex - 1, ex + 2):
                put(x, eyy - 1, GLASS_FRAME)
                put(x, eyy, GLASS_FRAME)
            put(ex, eyy, GLASS_LENS)
            x = ex - 2 * facing
            while 0 <= x < FW and (x, eyy) not in hair and abs(x - ex) < 6:
                put(x, eyy, GLASS_FRAME)
                x -= facing
            if (x, eyy) in hair:
                put(x, eyy, GLASS_FRAME)

    # Beanie: three rows over the top of the hair (crown, body, ribbed cuff), front corner rounded,
    # and the slouch: a sack of knit drooping off the back of the head. Outlined like the pack.
    if not hair:
        return
    cols = sorted({x for (x, y) in hair if y <= cuff})
    back, front = (cols[0], cols[-1]) if facing != -1 else (cols[-1], cols[0])
    if head['face'] and facing == 1:
        front = max(front, fx1)
    if head['face'] and facing == -1:
        front = min(front, fx0)
    lo, hi = min(back, front), max(back, front)
    fill = {}
    for x in range(lo, hi + 1):
        for y in range(top, cuff + 1):
            if y == top and x == front:
                continue  # rounded front-top corner
            if y == cuff:
                fill[(x, y)] = BEANIE['dark'] if x % 2 else BEANIE['mid']
            elif x == back or (y == top and x != front and abs(x - back) <= 1):
                fill[(x, y)] = BEANIE['mid']
            else:
                fill[(x, y)] = BEANIE['light']
    if facing != 0:
        d = -facing  # towards the back
        # Crown: one more row on top, set back from the forehead, so the knit sits tall and slouchy.
        for x in range(lo, hi + 1):
            if (x - back) * d <= 0 and (front - x) * d < -1:
                fill[(x, top - 1)] = BEANIE['mid'] if x == back else BEANIE['light']
        for (x, y, c) in ((back + d, top - 1, 'mid'), (back + d, top, 'mid'), (back + d, top + 1, 'mid'),
                          (back + d, top + 2, 'dark'), (back + 2 * d, top, 'dark'), (back + 2 * d, top + 1, 'dark'),
                          (back + 2 * d, top + 2, 'dark')):
            fill[(x, y)] = BEANIE[c]
    else:
        # Seen from the front: the slouch shows as a bump on top.
        mid = (lo + hi) // 2
        for x in range(mid - 1, mid + 2):
            fill[(x, top - 1)] = BEANIE['mid']
    for (x, y), c in fill.items():
        put(x, y, c)
    for (x, y) in fill:
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            n = (x + dx, y + dy)
            if n in fill or not (0 <= n[0] < FW and 0 <= n[1] < FH):
                continue
            if not opaque(sp, *n) or (n in hair and n[1] < cuff):
                put(n[0], n[1], OUTLINE)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--sheet', help='directory for the contact sheet and preview')
    args = ap.parse_args()

    meta = json.load(open(os.path.join(ASSETS, 'atlas.json')))
    atlas = Image.open(os.path.join(ASSETS, 'atlas.png')).convert('RGBA')
    frames = {f['filename']: f for f in meta['frames']}

    cols, pad = 7, 2
    rows = (len(ORDER) + cols - 1) // cols
    out = Image.new('RGBA', (cols * (FW + pad) + pad, rows * (FH + pad) + pad), (0, 0, 0, 0))
    out_frames, pairs = [], []
    for i, n in enumerate(ORDER):
        key = 'hero-' + n
        f = frames[key]['frame']
        src = atlas.crop((f['x'], f['y'], f['x'] + FW, f['y'] + FH))
        new = hipsterize(src, key)
        x, y = pad + (i % cols) * (FW + pad), pad + (i // cols) * (FH + pad)
        out.paste(new, (x, y))
        entry = dict(frames[key])
        entry['frame'] = {'x': x, 'y': y, 'w': FW, 'h': FH}
        out_frames.append(entry)
        pairs.append((key, src, new))

    out.save(os.path.join(ASSETS, 'atlas-hero-hipster.png'))
    out_meta = {'frames': out_frames,
                'meta': {'app': 'tools/hipsterize.py', 'version': '1.0', 'image': 'atlas-hero-hipster.png',
                         'format': 'RGBA8888', 'size': {'w': out.width, 'h': out.height}, 'scale': '1'}}
    with open(os.path.join(ASSETS, 'atlas-hero-hipster.json'), 'w') as fh:
        json.dump(out_meta, fh, indent=1)
        fh.write('\n')

    if args.sheet:
        write_sheet(pairs, args.sheet)


def write_sheet(pairs, outdir):
    S, cols, label = 4, 7, 14
    cw, ch = FW * S + 8, FH * S * 2 + label + 12
    rows = (len(pairs) + cols - 1) // cols
    sheet = Image.new('RGBA', (cols * cw + 8, rows * ch + 8), (28, 26, 44, 255))
    d = ImageDraw.Draw(sheet)
    for i, (key, src, new) in enumerate(pairs):
        x, y = 8 + (i % cols) * cw, 8 + (i // cols) * ch
        d.text((x, y), key, fill=(230, 220, 200, 255))
        sheet.alpha_composite(src.resize((FW * S, FH * S), Image.NEAREST), (x, y + label))
        sheet.alpha_composite(new.resize((FW * S, FH * S), Image.NEAREST), (x, y + label + FH * S + 2))
        d.line((x, y + label + FH * S + 1, x + FW * S, y + label + FH * S + 1), fill=(60, 58, 84, 255))
    sheet.save(os.path.join(outdir, 'hipster-sheet.png'))

    # The level's backdrop: moon, mountains and graveyard layers stacked as the game does; the heroes
    # stand on the graves at the bottom left, at the same 1:1 scale, then the lot is blown up 8x.
    bg = Image.open(os.path.join(ASSETS, 'bg-moon.png')).convert('RGBA')
    for layer in ('bg-mountains.png', 'bg-graveyard.png'):
        bg.alpha_composite(Image.open(os.path.join(ASSETS, layer)).convert('RGBA'))
    S = 8
    picks = [p for p in pairs if p[0] in ('hero-idle-1', 'hero-attack-3')]
    view = bg.crop((10, 224 - 110, 10 + 190, 224))
    for j, (_, _, new) in enumerate(picks):
        view.alpha_composite(new, (j * 92, view.height - FH - 6))
    view.resize((view.width * S, view.height * S), Image.NEAREST).save(os.path.join(outdir, 'hipster-preview.png'))

if __name__ == '__main__':
    main()
