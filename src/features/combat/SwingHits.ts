// Pure: which enemies one swing has struck, and which line the hero says for it.
import type { HitResult } from '../../entities/health/Health';

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

/** One line per swing, for the most serious result: a put-down beats a hit. */
export function swingLineKind(results: readonly HitResult[]): 'kill' | 'hit' | null {
  if (results.includes('killed')) return 'kill';
  if (results.includes('hit')) return 'hit';
  return null;
}
