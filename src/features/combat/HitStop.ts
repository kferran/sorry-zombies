// Pure: the hit-stop countdown, in real frame time (the Level clock is stopped meanwhile).

export const HIT_STOP_MS = 90;

export class HitStop {
  private left = 0;

  get active(): boolean {
    return this.left > 0;
  }

  start(ms: number = HIT_STOP_MS): void {
    this.left = Math.max(this.left, ms);
  }

  /** Spends one frame's delta: 'frozen' while it holds, 'ended' on the frame it runs out. */
  tick(deltaMs: number): 'idle' | 'frozen' | 'ended' {
    if (!this.active) return 'idle';
    this.left -= deltaMs;
    if (this.left > 0) return 'frozen';
    this.left = 0;
    return 'ended';
  }
}

/**
 * The sprites a hit-stop holds after another start: those already held (now paused, so no longer
 * "playing") stay, and the incoming ones still playing join them, each once. A second start while
 * frozen must not drop the first start's sprites, or they would never be resumed.
 */
export function mergeHeld<T>(held: readonly T[], incoming: readonly T[], playing: (s: T) => boolean): T[] {
  const out = [...held];
  for (const s of incoming) if (!out.includes(s) && playing(s)) out.push(s);
  return out;
}
