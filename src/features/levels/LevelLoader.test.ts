import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { ENEMY } from '../../entities/enemy/enemy.stats';
import { resolve } from 'node:path';
import { parseLevel, LevelError, type LevelData } from './LevelLoader';

type Obj = { type?: string; class?: string; x: number; y: number; name?: string; props?: Record<string, string> };

function map(objects: Obj[], width = 40, height = 15) {
  return {
    width,
    height,
    tilewidth: 16,
    tileheight: 16,
    layers: [
      { name: 'ground', type: 'tilelayer', width, height, data: new Array(width * height).fill(0) },
      {
        name: 'spawns',
        type: 'objectgroup',
        objects: objects.map((o, i) => ({
          id: i + 1,
          name: o.name ?? '',
          ...(o.type !== undefined ? { type: o.type } : {}),
          ...(o.class !== undefined ? { class: o.class } : {}),
          x: o.x,
          y: o.y,
          point: true,
          width: 0,
          height: 0,
          ...(o.props
            ? { properties: Object.entries(o.props).map(([name, value]) => ({ name, type: 'string', value })) }
            : {}),
        })),
      },
    ],
  };
}

const hero: Obj = { type: 'hero', x: 40, y: 192 };
const exit: Obj = { type: 'exit', x: 600, y: 192 };

function expectLevelError(fn: () => unknown, ...parts: string[]) {
  let caught: unknown;
  try {
    fn();
  } catch (e) {
    caught = e;
  }
  expect(caught).toBeInstanceOf(LevelError);
  for (const p of parts) expect((caught as Error).message).toContain(p);
}

describe('parseLevel', () => {
  it('parses hero, exit, checkpoint and every enemy type', () => {
    const level = parseLevel(
      map([
        hero,
        exit,
        { type: 'checkpoint', x: 320, y: 192 },
        { type: 'skeleton', x: 200, y: 192 },
        { class: 'ghost', x: 260, y: 100 },
        { type: 'cat', x: 400, y: 192, props: { name: 'Mittens' } },
      ]),
      'fixture',
    );
    expect(level).toEqual<LevelData>({
      widthPx: 640,
      heightPx: 240,
      heroStart: { x: 40, y: 192 },
      exit: { x: 600, y: 192 },
      checkpoint: { x: 320, y: 192 },
      bossAt: null,
      spawns: [
        { type: 'skeleton', x: 200, y: 192 },
        { type: 'ghost', x: 260, y: 100 },
        { type: 'cat', x: 400, y: 192, name: 'Mittens' },
      ],
    });
  });

  it('rejects a map with no hero', () => {
    expectLevelError(() => parseLevel(map([exit]), 'level-9'), 'level-9', 'hero');
  });

  it('rejects two exits', () => {
    expectLevelError(() => parseLevel(map([hero, exit, { type: 'exit', x: 500, y: 192 }]), 'level-9'), 'level-9', 'exit');
  });

  it('rejects an unknown type ("skeletn")', () => {
    expectLevelError(() => parseLevel(map([hero, exit, { type: 'skeletn', x: 200, y: 192 }]), 'level-9'), 'level-9', 'skeletn');
  });

  it('rejects a spawn outside the map', () => {
    expectLevelError(
      () => parseLevel(map([hero, exit, { type: 'skeleton', x: 700, y: 192 }]), 'level-9'),
      'level-9',
      'outside',
    );
  });

  it('rejects a level without an exit', () => {
    expectLevelError(() => parseLevel(map([hero]), 'level-9'), 'level-9', 'exit');
  });

  it('rejects input that is not a Tiled map', () => {
    expectLevelError(() => parseLevel({ nope: true }, 'level-9'), 'level-9');
    expectLevelError(() => parseLevel(map([hero, exit]).layers[0], 'level-9'), 'level-9');
  });

  it('boss room has bossAt and no exit', () => {
    const level = parseLevel(map([hero, { type: 'boss', x: 360, y: 192 }], 27), 'boss');
    expect(level.bossAt).toEqual({ x: 360, y: 192 });
    expect(level.exit).toBeNull();
    expect(level.checkpoint).toBeNull();
  });

  it('rejects a boss room with no boss', () => {
    expectLevelError(() => parseLevel(map([hero], 27), 'boss'), 'boss', 'boss');
  });
});

describe('every shipped map is valid', () => {
  const load = (key: string) =>
    parseLevel(JSON.parse(readFileSync(resolve(__dirname, '../../../public/maps', `${key}.json`), 'utf8')), key);
  const count = (l: LevelData, t: string) => l.spawns.filter((s) => s.type === t).length;

  it.each(['level-1', 'level-2', 'level-3'])('%s has an exit, a checkpoint and is 15 tiles tall', (key) => {
    const l = load(key);
    expect(l.exit).not.toBeNull();
    expect(l.checkpoint).not.toBeNull();
    expect(l.bossAt).toBeNull();
    expect(l.heightPx).toBe(15 * 16);
  });

  it('boss has bossAt, no exit and is one screen', () => {
    const l = load('boss');
    expect(l.bossAt).not.toBeNull();
    expect(l.exit).toBeNull();
    expect(l.checkpoint).toBeNull();
    expect(l.heightPx).toBe(15 * 16);
    expect(l.widthPx).toBe(27 * 16);
  });

  it('enemy counts match the stage table', () => {
    const [l1, l2, l3] = ['level-1', 'level-2', 'level-3'].map(load);
    expect(count(l1, 'skeleton')).toBeGreaterThanOrEqual(8);
    expect(count(l2, 'skeleton')).toBeGreaterThanOrEqual(10);
    expect(count(l2, 'ghost')).toBeGreaterThanOrEqual(2);
    expect(count(l2, 'ghost')).toBeLessThanOrEqual(3);
    expect(count(l3, 'skeleton')).toBeGreaterThanOrEqual(10);
    expect(count(l3, 'cat')).toBe(3);
  });

  // Respawning at a lit lantern wakes anything within the wake distance at once.
  it.each(['level-1', 'level-2', 'level-3'])('%s keeps every enemy out of waking range of the lantern', (key) => {
    const l = load(key);
    const wake = Math.max(ENEMY.skeleton.wake, ENEMY.ghost.wake, ENEMY.cat.wake);
    for (const s of l.spawns) expect(Math.abs(s.x - l.checkpoint!.x), `${s.type} at x ${s.x}`).toBeGreaterThan(wake);
  });
});
