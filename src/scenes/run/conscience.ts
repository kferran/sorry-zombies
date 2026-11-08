// Full Conscience decisions for the side-scroller — pure: no Phaser imports.
import type { GuiltLevel } from '../../features/guilt/GuiltMeter';

/** Guilt is sampled for the average this often (Level clock). */
export const GUILT_SAMPLE_MS = 1000;

export type BowOutcome =
  | { bowed: false }
  | { bowed: true; line: 'apology' | 'bossAccept'; cleared: number };

/**
 * A bow press. Casual ignores it; a frozen hero (bowing, kneeling, knocked back) discards it.
 * Otherwise the guilt meter decides first (`apologize`, with its 1000 ms cooldown): a rejected
 * press does nothing and the boss never hears it. An accepted bow the boss also accepts
 * (`bossBow`, only true in a listening pause) says `bossAccept`; any other is a plain `apology`.
 */
export function decideBow(
  state: { guiltMode: boolean; frozen: boolean },
  apologize: () => { accepted: boolean; cleared: number },
  bossBow: () => boolean,
): BowOutcome {
  if (!state.guiltMode || state.frozen) return { bowed: false };
  const { accepted, cleared } = apologize();
  if (!accepted) return { bowed: false };
  return { bowed: true, line: bossBow() ? 'bossAccept' : 'apology', cleared };
}

/** The guilt level a swing is judged at: Casual always swings at 0. */
export function swingGuiltLevel(guiltMode: boolean, level: GuiltLevel): GuiltLevel {
  return guiltMode ? level : 0;
}

/** Level 2 guilt (66 and up) greys the stage camera. */
export function wantsGrey(level: GuiltLevel): boolean {
  return level === 2;
}

/** Says how many guilt samples are due by each Level-clock time: one per `everyMs`, from `everyMs` on. */
export class GuiltSampler {
  private next: number;

  constructor(private readonly everyMs = GUILT_SAMPLE_MS) {
    this.next = everyMs;
  }

  due(now: number): number {
    let n = 0;
    while (now >= this.next) {
      n++;
      this.next += this.everyMs;
    }
    return n;
  }
}
