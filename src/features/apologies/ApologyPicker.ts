export type LineKind =
  | 'hit' | 'kill' | 'rise' | 'hurt' | 'ghostKill' | 'catKill'
  | 'apology' | 'breakdown' | 'preApology' | 'levelCleared'
  | 'bossJudge' | 'bossDisappointed' | 'bossAccept' | 'bossForgive' | 'bossDefeat'
  | 'summaryWin' | 'summaryLose' | 'summaryForgiven';
export type Tier = 1 | 2 | 3;
/** Only hit, kill and rise lines carry a tier. */
export type Line = { kind: LineKind; tier?: Tier; text: string };

const FALLBACK = 'Sorry!';

export function tierForWave(wave: number): Tier {
  if (wave <= 3) return 1;
  if (wave <= 7) return 2;
  return 3;
}

/** Draws lines at random without repeats inside a group until the group is used up. */
export class ApologyPicker {
  private bags = new Map<string, string[]>();

  constructor(private readonly lines: Line[], private readonly rng: () => number = Math.random) {}

  /** An explicit `tier` (side-scroller levels) wins over the wave (arena). */
  pick(kind: LineKind, wave = 1, tier?: Tier): string {
    const tiered = kind === 'hit' || kind === 'kill' || kind === 'rise';
    tier = tiered ? tier ?? tierForWave(wave) : undefined;
    let group = this.group(kind, tier);
    // Someone emptied this tier in lines.ts: borrow from any tier of the same kind.
    if (group.length === 0 && tiered) group = this.group(kind, undefined, true);
    if (group.length === 0) return FALLBACK;

    const key = `${kind}:${tier ?? '-'}:${group.length}`;
    let bag = this.bags.get(key);
    if (!bag || bag.length === 0) {
      bag = this.shuffle([...group]);
      this.bags.set(key, bag);
    }
    return bag.pop()!;
  }

  private group(kind: LineKind, tier: Tier | undefined, anyTier = false): string[] {
    return this.lines
      .filter(l => l.kind === kind && (anyTier || l.tier === tier))
      .map(l => l.text);
  }

  private shuffle(items: string[]): string[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }
}
