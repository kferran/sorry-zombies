// make-maps.mjs — first-draft generator for the side-scroller's Tiled maps.
//
//   node tools/make-maps.mjs            # all maps
//   node tools/make-maps.mjs level-2    # one map
//
// Reads tools/layouts/<key>.txt and writes public/maps/<key>.json (Tiled 1.10 JSON).
// After generation the JSON is the source of truth: edit the maps in Tiled. Re-running
// this script overwrites any Tiled edits to the maps it regenerates.
//
// Layout: 15 lines, one char per 16 px tile, all lines the same width. Lines starting
// with ';' are comments.
//   #  ground (solid; must stand on ground all the way down to the bottom row)
//   =  floating platform (solid, not one-way)
//   P  pillar (solid; 2 wide, stands on ground; top row is the capital)
//   g  grave obstacle (solid; exactly 2 wide × 2 tall, stands on ground)
//   .  empty
//   H  hero start   E  exit gate   C  checkpoint lantern   B  boss
//   S  skeleton     K  hell-cat    G  ghost
// H/E/C/B/S/K stand on the surface below them: the object's y is the top of that tile.
// G floats: its y is the centre of its cell. Every object's x is the centre of its cell.
//
// Tile ids (gids) below were read off the pack's demo map ("Main Layer" ground strip
// 89-92 / 117-120 / 145-148, the mound caps 114-115 / 124-125 in "Back Layer", and the
// graves and bush in "Back Layer") and the tileset image itself (pillar column 99-240).

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LAYOUTS = join(ROOT, 'tools', 'layouts');
const OUT = join(ROOT, 'public', 'maps');

const TILE = 16;
const HEIGHT = 15;

// ---- tilesets (embedded) -------------------------------------------------------------
const TILES_FIRSTGID = 1; // gv-tiles: tileset.png 448×160, 28 × 10
const OBJECTS_FIRSTGID = 281; // gv-objects: objects.png 624×192, 39 × 12

// ---- gv-tiles: ground (grass-topped earth) ---------------------------------------------
// Each row-kind has: outer-left edge, inner-left, middle variants (cycled by x), inner-right, outer-right.
const GROUND = {
  top: { l0: 114, l1: 115, mid: [117, 118, 119, 120], r1: 124, r0: 125 }, // grass on top
  fill: { l0: 142, l1: 143, mid: [145, 146, 147, 148], r1: 152, r0: 153 }, // skull earth, 1 below top
  deep: { l0: 170, l1: 171, mid: [171], r1: 180, r0: 181 }, // dark earth, 2+ below top
};
const GRASS_TUFTS = [89, 90, 91, 92]; // decor: grass blades standing on a top tile

// ---- gv-tiles: pillar (2 wide) ------------------------------------------------------------
const PILLAR_CAPITAL = [99, 100];
const PILLAR_SHAFT = [
  [127, 128],
  [155, 156],
];
const PILLAR_FOOT = [183, 184]; // shaft with grass round its foot

// ---- gv-objects -----------------------------------------------------------------------------
// Graves are 2 × 3 in the sheet; the top row is only the rounded crown (decor), the
// bottom two rows are the solid obstacle.
const GRAVES = [
  { crown: [295, 296], body: [334, 335, 373, 374] },
  { crown: [297, 298], body: [336, 337, 375, 376] },
  { crown: [299, 300], body: [338, 339, 377, 378] },
];
const BUSH = [
  [331, 332, 333],
  [370, 371, 372],
]; // 3 × 2 decor
const DEAD_TREE = { col: 12, row: 4, w: 10, h: 8 }; // block of objects.png, decor
const ANGEL_STATUE = { col: 33, row: 2, w: 5, h: 5 }; // block of objects.png, decor

// Hand-placed decor blocks: { block, x } puts the block's left column at tile x, standing on the surface.
const LANDMARKS = {
  'level-3': [{ block: ANGEL_STATUE, x: 176 }],
  boss: [{ block: ANGEL_STATUE, x: 11 }],
};

const CAT_NAMES = ['Mr. Whiskers', 'Biscuit', 'Duchess', 'Sir Pounce'];

// -------------------------------------------------------------------------------------------
const SURFACE_MARKERS = { H: 'hero', E: 'exit', C: 'checkpoint', B: 'boss', S: 'skeleton', K: 'cat' };
const FLOAT_MARKERS = { G: 'ghost' };
const ALLOWED = new Set(['#', '=', 'P', 'g', '.', ...Object.keys(SURFACE_MARKERS), ...Object.keys(FLOAT_MARKERS)]);
const SOLID = new Set(['#', '=', 'P', 'g']);

function readLayout(key) {
  const text = readFileSync(join(LAYOUTS, `${key}.txt`), 'utf8');
  const rows = text.split(/\r?\n/).filter((l) => l.length > 0 && !l.startsWith(';'));
  const errors = [];
  if (rows.length !== HEIGHT) errors.push(`${rows.length} rows, expected ${HEIGHT}`);
  const width = rows[0]?.length ?? 0;
  rows.forEach((r, y) => {
    if (r.length !== width) errors.push(`row ${y} is ${r.length} wide, expected ${width}`);
    for (const ch of r) if (!ALLOWED.has(ch)) errors.push(`row ${y}: unknown char "${ch}"`);
  });
  if (errors.length) throw new Error(`${key}: ${errors.join('; ')}`);
  return { rows, width };
}

function validate(key, rows, width) {
  const at = (x, y) => (x < 0 || x >= width || y < 0 || y >= HEIGHT ? '#' : rows[y][x]);
  const solid = (x, y) => SOLID.has(at(x, y));
  const errors = [];
  const warnings = [];

  for (let x = 0; x < width; x++) {
    if (rows[HEIGHT - 1][x] !== '#') errors.push(`col ${x}: bottom row must be ground (no pits)`);
    for (let y = 0; y < HEIGHT; y++) {
      const ch = rows[y][x];
      if (ch === '#' && y < HEIGHT - 1 && rows[y + 1][x] !== '#') errors.push(`(${x},${y}): ground floats`);
      if ((ch === 'P' || ch === 'g') && !['P', 'g', '#'].includes(at(x, y + 1)))
        errors.push(`(${x},${y}): ${ch} must stand on ground`);
      if (ch in SURFACE_MARKERS) {
        if (!solid(x, y + 1)) errors.push(`(${x},${y}): ${SURFACE_MARKERS[ch]} must stand on a surface`);
        for (const dy of [1, 2]) if (solid(x, y - dy)) errors.push(`(${x},${y}): no head room for ${SURFACE_MARKERS[ch]}`);
      }
    }
  }
  // grave blocks are exactly 2 × 2; pillars exactly 2 wide
  for (let y = 0; y < HEIGHT; y++) {
    for (const ch of ['g', 'P']) {
      const re = new RegExp(`${ch}+`, 'g');
      for (const m of rows[y].matchAll(re)) if (m[0].length !== 2) errors.push(`row ${y} col ${m.index}: ${ch} run must be 2 wide`);
    }
  }
  for (let x = 0; x < width; x++) {
    let run = 0;
    for (let y = 0; y <= HEIGHT; y++) {
      if (y < HEIGHT && rows[y][x] === 'g') run++;
      else {
        if (run && run !== 2) errors.push(`col ${x}: grave must be 2 tall`);
        run = 0;
      }
    }
  }
  // walkable floor profile: rises of at most 3 tiles and 3 free tiles of head room everywhere
  const surface = [];
  for (let x = 0; x < width; x++) {
    let y = HEIGHT - 1;
    while (y > 0 && solid(x, y - 1)) y--;
    surface.push(y);
    for (let dy = 1; dy <= 3; dy++) if (y - dy >= 0 && solid(x, y - dy)) errors.push(`col ${x}: floor has under 3 tiles of head room`);
  }
  for (let x = 0; x + 1 < width; x++) {
    if (Math.abs(surface[x] - surface[x + 1]) > 3) errors.push(`cols ${x}-${x + 1}: step of ${Math.abs(surface[x] - surface[x + 1])} tiles (max 3)`);
  }
  // counts and spacing
  const count = (ch) => rows.join('').split(ch).length - 1;
  if (count('H') !== 1) errors.push(`needs exactly 1 H`);
  if (key === 'boss') {
    if (count('B') !== 1 || count('E') || count('C')) errors.push('boss room: 1 B, no E, no C');
  } else if (count('E') !== 1 || count('C') !== 1 || count('B')) errors.push('level: 1 E, 1 C, no B');
  const skx = [];
  rows.forEach((r) => [...r].forEach((ch, x) => ch === 'S' && skx.push(x)));
  skx.sort((a, b) => a - b);
  for (let i = 1; i < skx.length; i++) if (skx[i] - skx[i - 1] < 8) warnings.push(`skeletons at cols ${skx[i - 1]} and ${skx[i]} are ${skx[i] - skx[i - 1]} apart`);
  if (errors.length) throw new Error(`${key}:\n  ${errors.join('\n  ')}`);
  return warnings;
}

function build(key, rows, width) {
  const at = (x, y) => (x < 0 || x >= width || y < 0 || y >= HEIGHT ? '#' : rows[y][x]);
  const solid = (x, y) => SOLID.has(at(x, y));
  const terrain = (x, y) => at(x, y) === '#' || at(x, y) === '=';
  const ground = new Array(width * HEIGHT).fill(0);
  const decor = new Array(width * HEIGHT).fill(0);
  const idx = (x, y) => y * width + x;

  // terrain (# and =): pick the row kind by depth below open air, the column by distance to an edge
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < width; x++) {
      if (!terrain(x, y)) continue;
      let depth = 0;
      while (y - depth - 1 >= 0 && terrain(x, y - depth - 1)) depth++;
      const kind = depth === 0 ? GROUND.top : depth === 1 ? GROUND.fill : GROUND.deep;
      // a cell is "open" sideways when the neighbour is not terrain (pillars and graves count as open
      // when they stand on this row's surface, so a mound next to a pillar still gets its edge)
      const open = (nx) => !terrain(nx, y);
      let gid;
      if (open(x - 1)) gid = kind.l0;
      else if (open(x + 1)) gid = kind.r0;
      else if (open(x - 2)) gid = kind.l1;
      else if (open(x + 2)) gid = kind.r1;
      else gid = kind.mid[x % kind.mid.length];
      ground[idx(x, y)] = gid;
      // grass tufts above plain top tiles with open air
      if (depth === 0 && kind.mid.includes(gid) && y > 0 && !solid(x, y - 1)) decor[idx(x, y - 1)] = GRASS_TUFTS[x % 4];
      // a floating platform gets an earth underside in decor (drawn, not solid) so it is not paper-thin
      if (at(x, y) === '=' && y + 1 < HEIGHT && !solid(x, y + 1)) {
        const f = GROUND.fill;
        decor[idx(x, y + 1)] = open(x - 1) ? f.l0 : open(x + 1) ? f.r0 : open(x - 2) ? f.l1 : open(x + 2) ? f.r1 : f.mid[x % 4];
      }
    }
  }

  // pillars
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < width; x++) {
      if (at(x, y) !== 'P' || at(x - 1, y) === 'P') continue; // left column of a pillar
      const isTop = at(x, y - 1) !== 'P';
      const isFoot = at(x, y + 1) !== 'P';
      const pair = isTop ? PILLAR_CAPITAL : isFoot ? PILLAR_FOOT : PILLAR_SHAFT[y % 2];
      ground[idx(x, y)] = pair[0];
      ground[idx(x + 1, y)] = pair[1];
    }
  }

  // graves (2 × 2 solid body, crown in decor)
  let graveN = 0;
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < width; x++) {
      if (at(x, y) !== 'g' || at(x - 1, y) === 'g' || at(x, y - 1) === 'g') continue; // top-left cell
      const g = GRAVES[graveN++ % GRAVES.length];
      ground[idx(x, y)] = g.body[0];
      ground[idx(x + 1, y)] = g.body[1];
      ground[idx(x, y + 1)] = g.body[2];
      ground[idx(x + 1, y + 1)] = g.body[3];
      if (y > 0) {
        decor[idx(x, y - 1)] = g.crown[0];
        decor[idx(x + 1, y - 1)] = g.crown[1];
      }
    }
  }

  // sparse decor on flat floor: bushes and the odd dead tree, deterministic per map
  const free = (x, y) => x >= 0 && x < width && y >= 0 && !solid(x, y);
  const flat = (x0, w, s) => {
    for (let x = x0; x < x0 + w; x++) {
      if (x < 0 || x >= width || !terrain(x, s) || solid(x, s - 1)) return false;
    }
    return true;
  };
  const surfaceAt = (x) => {
    let y = HEIGHT - 1;
    while (y > 0 && solid(x, y - 1)) y--;
    return y;
  };
  const placeBlock = (block, x, s) => {
    for (let dx = 0; dx < block.w; dx++) {
      for (let dy = 0; dy < block.h; dy++) {
        const gid = OBJECTS_FIRSTGID + (block.row + dy) * 39 + block.col + dx;
        decor[idx(x + dx, s - block.h + dy)] = gid;
      }
    }
  };
  const blockFits = (block, x, s) => {
    if (!flat(x, block.w, s) || s - block.h < 0) return false;
    for (let dx = 0; dx < block.w; dx++) for (let dy = 1; dy <= block.h; dy++) if (!free(x + dx, s - dy)) return false;
    return true;
  };
  for (const { block, x } of LANDMARKS[key] ?? []) {
    const s = surfaceAt(x);
    if (!blockFits(block, x, s)) throw new Error(`${key}: landmark at col ${x} does not fit on flat, open ground`);
    placeBlock(block, x, s);
  }
  const taken = (x0, w, s, h) => {
    for (let dx = 0; dx < w; dx++) for (let dy = 1; dy <= h; dy++) if (x0 + dx < width && decor[idx(x0 + dx, s - dy)] && !GRASS_TUFTS.includes(decor[idx(x0 + dx, s - dy)])) return true;
    return false;
  };
  let seed = [...key].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
  const rand = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);
  let treeDone = key === 'boss';
  for (let x = 6; x < width - 12; ) {
    const s = surfaceAt(x);
    if (!treeDone && x > width / 3 && blockFits(DEAD_TREE, x, s) && !taken(x, DEAD_TREE.w, s, DEAD_TREE.h)) {
      placeBlock(DEAD_TREE, x, s);
      treeDone = true;
      x += DEAD_TREE.w + 6;
      continue;
    }
    if (flat(x, 3, s) && free(x, s - 2) && free(x + 1, s - 2) && free(x + 2, s - 2) && !taken(x, 3, s, 2)) {
      for (let dx = 0; dx < 3; dx++) {
        decor[idx(x + dx, s - 2)] = BUSH[0][dx];
        decor[idx(x + dx, s - 1)] = BUSH[1][dx];
      }
      x += 9 + Math.floor(rand() * 10);
      continue;
    }
    x++;
  }

  // spawns
  const objects = [];
  let catN = 0;
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < width; x++) {
      const ch = rows[y][x];
      const type = SURFACE_MARKERS[ch] ?? FLOAT_MARKERS[ch];
      if (!type) continue;
      const o = {
        id: objects.length + 1,
        name: '',
        type,
        x: x * TILE + TILE / 2,
        y: ch in FLOAT_MARKERS ? y * TILE + TILE / 2 : (y + 1) * TILE,
        width: 0,
        height: 0,
        rotation: 0,
        visible: true,
        point: true,
      };
      if (type === 'cat') o.properties = [{ name: 'name', type: 'string', value: CAT_NAMES[catN++ % CAT_NAMES.length] }];
      objects.push(o);
    }
  }
  objects.sort((a, b) => a.x - b.x || a.y - b.y).forEach((o, i) => (o.id = i + 1));

  const tileLayer = (id, name, data) => ({ id, name, type: 'tilelayer', x: 0, y: 0, width, height: HEIGHT, opacity: 1, visible: true, data });
  return {
    type: 'map',
    version: '1.10',
    tiledversion: '1.10.2',
    orientation: 'orthogonal',
    renderorder: 'right-down',
    infinite: false,
    compressionlevel: -1,
    width,
    height: HEIGHT,
    tilewidth: TILE,
    tileheight: TILE,
    nextlayerid: 4,
    nextobjectid: objects.length + 1,
    layers: [
      tileLayer(1, 'decor', decor),
      tileLayer(2, 'ground', ground),
      { id: 3, name: 'spawns', type: 'objectgroup', draworder: 'topdown', x: 0, y: 0, opacity: 1, visible: true, objects },
    ],
    tilesets: [
      {
        firstgid: TILES_FIRSTGID,
        name: 'gv-tiles',
        image: '../assets/gothicvania-cemetery/tileset.png',
        imagewidth: 448,
        imageheight: 160,
        tilewidth: TILE,
        tileheight: TILE,
        tilecount: 280,
        columns: 28,
        margin: 0,
        spacing: 0,
      },
      {
        firstgid: OBJECTS_FIRSTGID,
        name: 'gv-objects',
        image: '../assets/gothicvania-cemetery/objects.png',
        imagewidth: 624,
        imageheight: 192,
        tilewidth: TILE,
        tileheight: TILE,
        tilecount: 468,
        columns: 39,
        margin: 0,
        spacing: 0,
      },
    ],
  };
}

// Tiled-style JSON: one row of tile data per line so diffs stay readable.
function stringify(map) {
  const json = JSON.stringify(map, null, 1);
  return json.replace(/"data": \[\n([\d,\s]+)\]/g, (_, body) => {
    const nums = body.split(',').map((s) => s.trim());
    const lines = [];
    for (let i = 0; i < nums.length; i += map.width) lines.push(nums.slice(i, i + map.width).join(','));
    return `"data": [\n${lines.join(',\n')}]`;
  });
}

const keys = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(LAYOUTS)
      .filter((f) => f.endsWith('.txt'))
      .map((f) => f.slice(0, -4));
mkdirSync(OUT, { recursive: true });
for (const key of keys) {
  const { rows, width } = readLayout(key);
  const warnings = validate(key, rows, width);
  const map = build(key, rows, width);
  writeFileSync(join(OUT, `${key}.json`), stringify(map) + '\n');
  const n = (t) => map.layers[2].objects.filter((o) => o.type === t).length;
  console.log(`${key}: ${width}×${HEIGHT} tiles, skeletons ${n('skeleton')}, ghosts ${n('ghost')}, cats ${n('cat')}`);
  for (const w of warnings) console.log(`  note: ${w}`);
}
