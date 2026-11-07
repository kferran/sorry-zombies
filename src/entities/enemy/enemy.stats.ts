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

/**
 * Ghost frames are 37×65 and face left; the body hugs the hooded figure. Origin at the body's
 * centre, so the map marker (the middle of its cell) is where the body sits.
 */
export const GHOST_BODY = {
  width: 18,
  height: 36,
  offsetX: 9,
  offsetY: 16,
  originX: 18 / 37,
  originY: 34 / 65,
  /** Waking: fades in this long, harmless meanwhile. */
  fadeInMs: 400,
  /** Put down: fades out this long while rising this far. */
  fadeOutMs: 700,
  fadeOutRisePx: 12,
} as const;

/** Hell-cat frames are 96×53 and face left; the body is the crouched torso, feet at the bottom. */
export const CAT_BODY = {
  width: 28,
  height: 18,
  offsetX: 24,
  offsetY: 35,
  /** Origin x at the body's centre (38 / 96), so flipping mirrors it in place. */
  originX: 38 / 96,
  /** Asleep: curled in shadow. */
  asleepAlpha: 0.6,
} as const;

/** The pounce: an arc toward the hero, then a rest of ENEMY.cat.pounceGapMs once landed. */
export const CAT_POUNCE = {
  vx: 110,
  vy: -180,
  gapMs: ENEMY.cat.pounceGapMs,
  /** Uncurling after it wakes, before the first pounce. */
  windupMs: 300,
  minAirMs: 100,
} as const;
