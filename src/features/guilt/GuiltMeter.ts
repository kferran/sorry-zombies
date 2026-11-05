export const GUILT = {
  hit: 4,
  kill: 10,
  max: 100,
  afterBreakdown: 50,
  apologyCooldownMs: 1000,
} as const;

export type GuiltLevel = 0 | 1 | 2;

/** 0 below 33, 1 for 33–65, 2 for 66 and up. */
export function guiltLevel(value: number): GuiltLevel {
  if (value >= 66) return 2;
  if (value >= 33) return 1;
  return 0;
}

export function wobbleForLevel(level: GuiltLevel): 0 | 4 | 10 {
  return ([0, 4, 10] as const)[level];
}

/**
 * Full Conscience guilt. Each zombie's unapologized guilt is tracked in the order it
 * was hurt; an apology settles the most recent debt (alive or dead).
 */
export class GuiltMeter {
  private current = 0;
  /** zombieId → owed guilt; Map keeps insertion order, re-inserted on each new hurt. */
  private owed = new Map<number, number>();
  private lastApologyAt = -Infinity;

  constructor(private readonly enabled: boolean) {}

  get value(): number {
    return this.current;
  }

  level(): GuiltLevel {
    return guiltLevel(this.current);
  }

  wobbleDegrees(): 0 | 4 | 10 {
    return wobbleForLevel(this.level());
  }

  onHit(zombieId: number): { breakdown: boolean } {
    return this.add(zombieId, GUILT.hit);
  }

  onKill(zombieId: number): { breakdown: boolean } {
    return this.add(zombieId, GUILT.kill);
  }

  apologize(nowMs: number): { accepted: boolean; cleared: number } {
    if (!this.enabled) return { accepted: true, cleared: 0 };
    if (nowMs - this.lastApologyAt < GUILT.apologyCooldownMs) return { accepted: false, cleared: 0 };
    this.lastApologyAt = nowMs;
    const last = [...this.owed.keys()].pop();
    if (last === undefined) return { accepted: true, cleared: 0 };
    const cleared = this.owed.get(last)!;
    this.owed.delete(last);
    this.current = Math.max(0, this.current - cleared);
    return { accepted: true, cleared };
  }

  private add(zombieId: number, amount: number): { breakdown: boolean } {
    if (!this.enabled) return { breakdown: false };
    const prior = this.owed.get(zombieId) ?? 0;
    this.owed.delete(zombieId);
    this.owed.set(zombieId, prior + amount);
    this.current = Math.min(GUILT.max, this.current + amount);
    if (this.current < GUILT.max) return { breakdown: false };
    this.current = GUILT.afterBreakdown;
    // Halve every debt so the debts still sum to the meter and can all be apologized away.
    for (const [id, debt] of this.owed) this.owed.set(id, debt * 0.5);
    return { breakdown: true };
  }
}
