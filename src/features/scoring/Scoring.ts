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

/** Side-scroller run stats. Guilt is sampled only while at least one enemy is awake. */
export class StageStats {
  stagesCleared = 0;
  enemiesHurt = 0;
  enemiesPutDown = 0;
  apologies = 0;
  tries = 1;
  forgiven = false;
  private guiltTotal = 0;
  private guiltCount = 0;

  sampleGuilt(v: number, anyAwake: boolean): void {
    if (!anyAwake) return;
    this.guiltTotal += v;
    this.guiltCount++;
  }

  averageGuilt(): number {
    return this.guiltCount === 0 ? 0 : this.guiltTotal / this.guiltCount;
  }
}

/** Scales with stages cleared, so a run that never fought earns nothing. */
export function stageConscienceBonus(avgGuilt: number, stagesCleared: number): number {
  return Math.round(((100 - avgGuilt) * 5 * stagesCleared) / 4);
}

export function scoreStageRun(stats: StageStats, mode: ModeConfig): number {
  const base = stats.stagesCleared * 250;
  if (!mode.guilt) return base;
  return base + stageConscienceBonus(stats.averageGuilt(), stats.stagesCleared) + (stats.forgiven ? 300 : 0);
}
