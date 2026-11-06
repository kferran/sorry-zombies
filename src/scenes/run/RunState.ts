// RunState — pure: one side-scroller run across its stages. No Phaser imports.
import type { ModeConfig } from '../../shared/modes';
import { StageStats } from '../../features/scoring/Scoring';
import { GuiltMeter } from '../../features/guilt/GuiltMeter';

/** Hearts per run, and the most a stage start can restore to (the hero's HERO.hearts). */
const MAX_HEARTS = 3;

export type StageTally = { enemiesHurt: number; enemiesPutDown: number; apologies: number };

/**
 * A run's mode, totals, guilt and hearts. Survives scene restarts: the Level is restarted with
 * `{ run, stageIndex }` on a retry, and handed on to the level card, boss and summary.
 */
export class RunState {
  readonly stats = new StageStats();
  readonly guilt: GuiltMeter;
  hearts = MAX_HEARTS;
  stageIndex = 0;
  checkpointLit = false;
  private stageStart: StageTally = { enemiesHurt: 0, enemiesPutDown: 0, apologies: 0 };

  constructor(readonly mode: ModeConfig) {
    this.guilt = new GuiltMeter(mode.guilt);
  }

  /** The first stage starts with 3 hearts; each later one restores 1, up to 3. The checkpoint starts unlit. */
  startStage(index: number): void {
    this.hearts = index === 0 ? MAX_HEARTS : Math.min(MAX_HEARTS, this.hearts + 1);
    this.stageIndex = index;
    this.checkpointLit = false;
    this.stageStart = this.totals();
  }

  /** The last heart is gone: the same stage again with 3 hearts. Guilt, stats and the lit checkpoint stay. */
  retry(): void {
    this.hearts = MAX_HEARTS;
    this.stats.tries++;
  }

  clearStage(): void {
    this.stats.stagesCleared++;
  }

  /** What happened in the current stage (all its tries), for the level card. */
  stageTally(): StageTally {
    const now = this.totals();
    return {
      enemiesHurt: now.enemiesHurt - this.stageStart.enemiesHurt,
      enemiesPutDown: now.enemiesPutDown - this.stageStart.enemiesPutDown,
      apologies: now.apologies - this.stageStart.apologies,
    };
  }

  private totals(): StageTally {
    const { enemiesHurt, enemiesPutDown, apologies } = this.stats;
    return { enemiesHurt, enemiesPutDown, apologies };
  }
}

/** Once per frame, after combat: losing the last heart wins over reaching the exit on the same frame. */
export function decideFrame(hearts: number, atExit: boolean): 'retry' | 'clear' | 'continue' {
  if (hearts <= 0) return 'retry';
  if (atExit) return 'clear';
  return 'continue';
}
