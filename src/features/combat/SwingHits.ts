// Pure: which enemies one swing has struck, and which line the hero says for it.
import type { HitResult } from '../../entities/health/Health';
import type { SpawnType } from '../../shared/spawnType';

/** Remembers the enemies struck by the current swing so each is hit at most once per swing. */
export class SwingHits {
  private struck: Set<number> | null = null;

  /** A new swing starts. */
  begin(): void {
    this.struck = new Set();
  }

  /** True the first time `enemyId` is offered during the current swing. */
  admit(enemyId: number): boolean {
    if (!this.struck || this.struck.has(enemyId)) return false;
    this.struck.add(enemyId);
    return true;
  }
}

export type SwingLineKind = 'catKill' | 'ghostKill' | 'kill' | 'hit';

/** The put-down line for each kind; when one swing puts down several kinds the first listed wins. */
const PUT_DOWN_LINES: [SpawnType, SwingLineKind][] = [['cat', 'catKill'], ['ghost', 'ghostKill']];

/**
 * One line per swing, for the most serious result: a put-down beats a hit. `kinds[i]` is the kind
 * of the enemy behind `results[i]`; put-downs say cat > ghost > skeleton (`kill`) lines.
 */
export function swingLineKind(results: readonly HitResult[], kinds: readonly SpawnType[] = []): SwingLineKind | null {
  if (results.includes('killed')) {
    const downed = new Set(kinds.filter((_, i) => results[i] === 'killed'));
    return PUT_DOWN_LINES.find(([kind]) => downed.has(kind))?.[1] ?? 'kill';
  }
  if (results.includes('hit')) return 'hit';
  return null;
}
