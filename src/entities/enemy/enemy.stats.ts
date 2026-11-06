// Pure: enemy numbers from the spec. No Phaser imports.

/** Hits to put down, walk/drift speed (world px/s), wake distance (horizontal world px). */
export const ENEMY = {
  skeleton: { hits: 3, speed: 30, wake: 210 },
  ghost: { hits: 1, speed: 25, wake: 210 },
  cat: { hits: 2, wake: 120, pounceGapMs: 900 },
} as const;

export const WAIT = {
  baseMs: 1200,
  perCharMs: 40,
  maxMs: 3200,
  /** After an enemy touches the hero, so it can't hit him again straight away. */
  afterContactMs: 800,
} as const;

/** A swatted enemy's knockback: away from the hero, with a small hop (px/s). */
export const ENEMY_KNOCKBACK = { x: 110, y: 110 } as const;

/** Skeleton frames are 44×52 and face left; the body hugs the torso and legs. */
export const SKELETON_BODY = {
  width: 16,
  height: 36,
  offsetX: 13,
  offsetY: 16,
  /** Origin x at the body's centre (21 / 44), so flipping mirrors him in place. */
  originX: 21 / 44,
  /** The 6-frame rise; it can't move or hurt meanwhile. */
  riseMs: 750,
} as const;

/** How long a swatted enemy waits: as long as the apology it was given, within reason. */
export function waitMsFor(line: string): number {
  return Math.min(WAIT.baseMs + WAIT.perCharMs * line.length, WAIT.maxMs);
}
