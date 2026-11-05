import type { ModeConfig } from '../../shared/modes';

export class RunStats {
  wavesCleared = 0;
  zombiesHurt = 0;
  zombiesKilled = 0;
  apologies = 0;
  private guiltTotal = 0;
  private guiltCount = 0;

  sampleGuilt(v: number): void {
    this.guiltTotal += v;
    this.guiltCount++;
  }

  averageGuilt(): number {
    return this.guiltCount === 0 ? 0 : this.guiltTotal / this.guiltCount;
  }
}

export type Grade = 'Saint' | 'Decent Person' | 'Conflicted' | 'Callous' | 'Monster';

/** Boundaries from the spec: 0–14, 15–34, 35–59, 60–84, 85–100 (fractions round down). */
export function gradeFor(avgGuilt: number): Grade {
  const g = Math.floor(avgGuilt);
  if (g <= 14) return 'Saint';
  if (g <= 34) return 'Decent Person';
  if (g <= 59) return 'Conflicted';
  if (g <= 84) return 'Callous';
  return 'Monster';
}

export function conscienceBonus(avgGuilt: number): number {
  return Math.round((100 - avgGuilt) * 5);
}

export function scoreRun(stats: RunStats, mode: ModeConfig): number {
  const base = stats.wavesCleared * 100;
  return mode.guilt ? base + conscienceBonus(stats.averageGuilt()) : base;
}
