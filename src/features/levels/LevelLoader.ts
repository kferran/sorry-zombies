// LevelLoader — pure: Tiled JSON → typed level data, with validation. No Phaser imports.
//
// Coordinates: spawns are Tiled *point* objects in the `spawns` object layer, and we use
// the object's `x`, `y` as-is. For a point, `y` is the point itself, which our maps place
// on the surface the entity stands on (the top edge of the ground tile under its feet),
// so `y` is the entity's bottom. (If someone draws a rectangle or tile object in Tiled
// instead, Tiled's `y` is the rectangle's top for rectangles and the bottom for tile
// objects; we do not adjust either — use point objects.) Ghosts float, so their `y` is
// simply where they hover.
//
// Object kind comes from `type` (Tiled ≤ 1.8 and 1.10+) or `class` (Tiled 1.9).

import type { SpawnType } from '../../shared/spawnType';

export type { SpawnType };

export type LevelData = {
  widthPx: number;
  heightPx: number;
  heroStart: { x: number; y: number };
  exit: { x: number; y: number } | null;
  checkpoint: { x: number; y: number } | null;
  bossAt: { x: number; y: number } | null;
  spawns: { type: SpawnType; x: number; y: number; name?: string }[];
};

export class LevelError extends Error {
  constructor(mapName: string, problem: string) {
    super(`Map "${mapName}": ${problem}`);
    this.name = 'LevelError';
  }
}

const SPAWN_TYPES: readonly string[] = ['skeleton', 'ghost', 'cat'];
const MARKER_TYPES: readonly string[] = ['hero', 'exit', 'checkpoint', 'boss'];
const BOSS_MAP = 'boss';

type Point = { x: number; y: number };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function stringProperty(obj: Record<string, unknown>, key: string): string | undefined {
  if (!Array.isArray(obj.properties)) return undefined;
  for (const p of obj.properties) {
    if (isObject(p) && p.name === key && typeof p.value === 'string' && p.value !== '') return p.value;
  }
  return undefined;
}

export function parseLevel(json: unknown, mapName: string): LevelData {
  const fail = (problem: string): never => {
    throw new LevelError(mapName, problem);
  };

  if (!isObject(json)) return fail('not a Tiled map (expected a JSON object)');
  const { width, height, tilewidth, tileheight, layers } = json;
  if (!isNum(width) || !isNum(height) || !isNum(tilewidth) || !isNum(tileheight) || width <= 0 || height <= 0) {
    return fail('not a Tiled map (missing width/height/tilewidth/tileheight)');
  }
  if (!Array.isArray(layers)) return fail('not a Tiled map (no layers)');

  const widthPx = width * tilewidth;
  const heightPx = height * tileheight;

  if (!layers.some((l) => isObject(l) && l.name === 'ground' && l.type === 'tilelayer')) {
    fail('no "ground" tile layer');
  }
  const spawnLayer = layers.find((l) => isObject(l) && l.name === 'spawns' && l.type === 'objectgroup');
  if (!isObject(spawnLayer) || !Array.isArray(spawnLayer.objects)) return fail('no "spawns" object layer');

  const markers: Record<string, Point[]> = { hero: [], exit: [], checkpoint: [], boss: [] };
  const spawns: LevelData['spawns'] = [];

  for (const raw of spawnLayer.objects) {
    if (!isObject(raw)) return fail('a spawn object is not an object');
    const kind = typeof raw.type === 'string' && raw.type !== '' ? raw.type : raw.class;
    const label = `object ${String(raw.id ?? '?')}`;
    if (typeof kind !== 'string' || kind === '') return fail(`${label} has no type`);
    if (!isNum(raw.x) || !isNum(raw.y)) return fail(`${kind} (${label}) has no x/y`);
    const { x, y } = raw;
    if (x < 0 || x > widthPx || y < 0 || y > heightPx) {
      fail(`${kind} (${label}) at ${x},${y} is outside the map (${widthPx}×${heightPx} px)`);
    }

    if (MARKER_TYPES.includes(kind)) {
      markers[kind].push({ x, y });
    } else if (SPAWN_TYPES.includes(kind)) {
      const spawn: LevelData['spawns'][number] = { type: kind as SpawnType, x, y };
      if (kind === 'cat') {
        const name = stringProperty(raw, 'name') ?? (typeof raw.name === 'string' && raw.name !== '' ? raw.name : undefined);
        if (name !== undefined) spawn.name = name;
      }
      spawns.push(spawn);
    } else {
      fail(`unknown spawn type "${kind}" (${label}); expected one of ${[...MARKER_TYPES, ...SPAWN_TYPES].join(', ')}`);
    }
  }

  const isBossRoom = mapName === BOSS_MAP;
  if (markers.hero.length !== 1) fail(`needs exactly 1 hero, found ${markers.hero.length}`);
  if (markers.checkpoint.length > 1) fail(`allows at most 1 checkpoint, found ${markers.checkpoint.length}`);
  if (isBossRoom) {
    if (markers.boss.length !== 1) fail(`the boss room needs exactly 1 boss, found ${markers.boss.length}`);
    if (markers.exit.length !== 0) fail(`the boss room must have no exit, found ${markers.exit.length}`);
  } else {
    if (markers.exit.length !== 1) fail(`needs exactly 1 exit, found ${markers.exit.length}`);
    if (markers.boss.length !== 0) fail(`only the boss room may have a boss, found ${markers.boss.length}`);
  }

  return {
    widthPx,
    heightPx,
    heroStart: markers.hero[0],
    exit: markers.exit[0] ?? null,
    checkpoint: markers.checkpoint[0] ?? null,
    bossAt: markers.boss[0] ?? null,
    spawns,
  };
}
