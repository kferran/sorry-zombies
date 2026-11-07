// Pure: how a ghost moves and shimmers. No Phaser imports.
import { HERO_BODY, WHIP } from '../hero/hero.stats';
import { GHOST_BODY } from './enemy.stats';

type Vec = { x: number; y: number };

/** Closer than this to its target, a ghost hangs still rather than jitter. */
const NEAR_PX = 2;
const BOB_PX = 3;
const BOB_HZ = 1.5;

/** Velocity straight toward a point (`dx`, `dy` away) at `speed` px/s. */
export function driftVelocity(dx: number, dy: number, speed: number): { vx: number; vy: number } {
  const d = Math.hypot(dx, dy);
  if (d < NEAR_PX) return { vx: 0, vy: 0 };
  return { vx: (dx / d) * speed, vy: (dy / d) * speed };
}

/** Vertical drawing offset (px, ±3 at 1.5 Hz) `ms` after the bob started. Visual only. */
export function bobOffset(ms: number): number {
  return BOB_PX * Math.sin((2 * Math.PI * BOB_HZ * ms) / 1000);
}

/** Alpha `ms` into a fade-in lasting `fadeMs`. */
export function fadeInAlpha(ms: number, fadeMs: number): number {
  return Math.min(1, Math.max(0, ms / fadeMs));
}

/** A settled ghost overlaps the hero's body by this much: enough to touch him, well inside the whip's reach. */
const TOUCH_PX = 3;

/**
 * Where a ghost drifts to: beside the hero at whip height, on the side it comes from (`facing`
 * breaks a tie straight overhead). A grounded swing facing it connects, so a ghost never has to be
 * answered by jumping. `hero` is his body centre.
 */
export function ghostTarget(hero: Vec, ghostX: number, facing: 1 | -1 = 1): Vec {
  const side = ghostX > hero.x ? 1 : ghostX < hero.x ? -1 : facing;
  const top = hero.y - HERO_BODY.height / 2;
  return {
    x: hero.x + side * (HERO_BODY.width / 2 + GHOST_BODY.width / 2 - TOUCH_PX),
    y: top + WHIP.dy + WHIP.height / 2,
  };
}
