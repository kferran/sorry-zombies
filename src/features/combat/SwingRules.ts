export type SwingGuiltLevel = 0 | 1 | 2;

export const SWING = {
  baseCooldownMs: 450,
  hesitationMs: [0, 100, 200],
  frames: 5,
  activeFrames: [3, 4, 5],
  stopShortChance: 0.25,
} as const;

export class SwingRules {
  private lastStartMs = -Infinity;

  constructor(private readonly rng: () => number = Math.random) {}

  tryStart(nowMs: number, guiltLevel: SwingGuiltLevel): { started: boolean; stopShort: boolean } {
    const cooldown = SWING.baseCooldownMs + SWING.hesitationMs[guiltLevel];
    if (nowMs - this.lastStartMs < cooldown) return { started: false, stopShort: false };
    this.lastStartMs = nowMs;
    const stopShort = guiltLevel === 2 && this.rng() < SWING.stopShortChance;
    return { started: true, stopShort };
  }

  isActiveFrame(frame: number): boolean {
    return (SWING.activeFrames as readonly number[]).includes(frame);
  }
}
