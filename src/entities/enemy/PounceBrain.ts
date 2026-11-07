// Pure: the hell-cat's pounce rhythm. No Phaser imports. Times are the Level clock.

export type PounceConfig = {
  /** Leap velocity (px/s): `vx` toward the hero, `vy` up (negative). */
  vx: number;
  vy: number;
  /** Rest after landing before the next pounce. */
  gapMs: number;
  /** Uncurling after waking, before the first pounce. */
  windupMs: number;
  /** A leap counts as landed only after this long (the frame after the leap it is still on the ground). */
  minAirMs: number;
};

export type PounceInput = {
  now: number;
  /** Standing on something. */
  grounded: boolean;
  /** Hero x minus cat x. */
  dx: number;
  /** Waiting out an apology or a contact. */
  listening: boolean;
};

export type PounceOrder =
  | { order: 'leap'; vx: number; vy: number }
  /** Stand still. */
  | { order: 'stop' }
  /** Leave the body alone (in the air: mid-leap or knocked back). */
  | { order: 'none' };

/** asleep → (wake) resting → leap → flying → (lands) resting for gapMs → leap → … */
export class PounceBrain {
  phase: 'asleep' | 'resting' | 'flying' = 'asleep';
  private restUntil = 0;
  private leapAt = 0;

  constructor(private readonly cfg: PounceConfig) {}

  wake(now: number): void {
    if (this.phase !== 'asleep') return;
    this.phase = 'resting';
    this.restUntil = now + this.cfg.windupMs;
  }

  tick({ now, grounded, dx, listening }: PounceInput): PounceOrder {
    if (this.phase === 'asleep') return { order: 'none' };
    if (this.phase === 'flying') {
      if (!grounded || now - this.leapAt < this.cfg.minAirMs) return { order: 'none' };
      this.phase = 'resting';
      this.restUntil = now + this.cfg.gapMs;
      return { order: 'stop' };
    }
    if (!grounded) return { order: 'none' };
    if (listening || now < this.restUntil) return { order: 'stop' };
    this.phase = 'flying';
    this.leapAt = now;
    const dir = dx >= 0 ? 1 : -1;
    return { order: 'leap', vx: dir * this.cfg.vx, vy: this.cfg.vy };
  }
}
