import Phaser from 'phaser';
import { Button } from '../shared/ui/Button';
import { ApologyPicker } from '../features/apologies/ApologyPicker';
import { LINES } from '../features/apologies/lines';
import { gradeFor, scoreStageRun } from '../features/scoring/Scoring';
import { saveIfBest } from '../features/scoring/bestScores';
import type { RunState } from './run/RunState';

/** A run never ends on a loss: losing retries the stage. */
export type RunOutcome = 'defeated' | 'forgiven';
export type SummaryInit = { run: RunState; outcome: RunOutcome };

const TITLES: Record<RunOutcome, string> = {
  defeated: 'You made it through the cemetery.',
  forgiven: 'The Groundskeeper forgave you.',
};

/** End of a side-scroller run: totals, tries, score (saved if best), grade in Full Conscience, one closing line. */
export class SummaryScene extends Phaser.Scene {
  private run!: RunState;
  private outcome: RunOutcome = 'defeated';
  /** For play checks. */
  score = 0;
  newBest = false;
  line = '';

  constructor() { super('Summary'); }

  init(data: SummaryInit): void {
    this.run = data.run;
    this.outcome = data.outcome;
  }

  create(): void {
    const { width } = this.scale;
    const { mode, stats } = this.run;
    const style = { fontFamily: 'monospace', color: '#ffffff' };
    this.score = scoreStageRun(stats, mode);
    this.newBest = saveIfBest('side', mode.id, this.score);

    this.cameras.main.setBackgroundColor('#0b0a18');
    this.add.text(width / 2, 100, TITLES[this.outcome], { ...style, fontSize: '44px' }).setOrigin(0.5);
    this.add.text(width / 2, 155, mode.label, { ...style, fontSize: '24px', color: '#aaaaaa' }).setOrigin(0.5);
    const rows = [
      `Enemies hurt    ${stats.enemiesHurt}`,
      `Put to rest     ${stats.enemiesPutDown}`,
      `Apologies made  ${stats.apologies}`,
      `Tries           ${stats.tries}`,
      `Score           ${this.score}${this.newBest ? '   New best!' : ''}`,
    ];
    if (mode.guilt) rows.push(`Conscience      ${gradeFor(stats.averageGuilt())}`);
    this.add.text(width / 2, 200, rows.join('\n'), { ...style, fontSize: '26px', lineSpacing: 10 }).setOrigin(0.5, 0);
    this.line = new ApologyPicker(LINES).pick(this.outcome === 'forgiven' ? 'summaryForgiven' : 'summaryWin');
    this.add.text(width / 2, 500, this.line, {
      ...style, fontSize: '24px', color: '#facc15', wordWrap: { width: 900 }, align: 'center',
    }).setOrigin(0.5);
    Button(this, width / 2, 620, 'Back to menu', () => this.scene.start('Menu'));
  }
}
