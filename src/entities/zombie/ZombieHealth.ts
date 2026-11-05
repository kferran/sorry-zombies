export type HitResult = 'hit' | 'killed' | 'ignored';

export class ZombieHealth {
  private remaining: number;

  constructor(hits: number) {
    this.remaining = hits;
  }

  get dead(): boolean {
    return this.remaining <= 0;
  }

  /** A hit on an already-dead zombie is ignored, so two peas on one frame can't kill twice. */
  takeHit(): HitResult {
    if (this.dead) return 'ignored';
    this.remaining -= 1;
    return this.dead ? 'killed' : 'hit';
  }
}
