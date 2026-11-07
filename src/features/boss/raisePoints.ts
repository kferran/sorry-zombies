// Pure: where the Groundskeeper raises skeletons. No Phaser imports.

type Point = { x: number; y: number };

export const RAISE = {
  /** No skeleton climbs out closer than this (horizontally) to the hero. */
  clearOfHeroPx: 64,
  /** Picks keep at least this far apart while there is room. */
  apartPx: 32,
} as const;

/**
 * Up to `count` of `points` (ground surfaces, x centre and y the surface), at random by `rng`,
 * none within RAISE.clearOfHeroPx of the hero, spread RAISE.apartPx apart while possible.
 */
export function pickRaisePoints(points: readonly Point[], heroX: number, count: number, rng: () => number): Point[] {
  const pool = points.filter(p => Math.abs(p.x - heroX) >= RAISE.clearOfHeroPx);
  const picked: Point[] = [];
  while (picked.length < count && pool.length > 0) {
    const spaced = pool.filter(p => picked.every(q => Math.abs(p.x - q.x) >= RAISE.apartPx));
    const from = spaced.length > 0 ? spaced : pool;
    const p = from[Math.min(from.length - 1, Math.floor(rng() * from.length))];
    picked.push(p);
    pool.splice(pool.indexOf(p), 1);
  }
  return picked;
}
