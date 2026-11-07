// Pure: how a ghost moves and shimmers. No Phaser imports.

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
