/**
 * Side-scroller hero. World gravity is GRAVITY px/s². Jump apex ≈ jumpVelocity² / (2 × GRAVITY):
 * 330² / 1800 ≈ 60.5 px in theory, 57.75 px measured with Arcade's 60 Hz fixed step. So a
 * 3-tile (48 px) ledge is reached with ~10 px to spare and a 2-tile (32 px) grave is cleared easily.
 */
export const GRAVITY = 900;

export const HERO = {
  walk: 90,
  jumpVelocity: 330,
  hearts: 3,
  invulnMs: 1000,
  knockback: 120,
  /** Full Conscience: a bow freezes him this long. */
  bowFreezeMs: 500,
  /** Full Conscience: a breakdown (guilt 100) keeps him on his knees this long. */
  breakdownKneelMs: 2000,
} as const;

/** Hero frames are 100×59 with the character drawn inside; the body hugs the character. */
export const HERO_BODY = {
  width: 20,
  height: 40,
  offsetX: 42,
  offsetY: 19,
  /** Origin x at the character's centre (52 / 100), so flipping mirrors him in place. */
  originX: 0.52,
} as const;

/** The whip's reach: a box in front of the body, live on swing frames 3–5. */
export const WHIP = { width: 24, height: 20, /** from the body's top to the box's top */ dy: 8 } as const;
