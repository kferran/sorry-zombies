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
