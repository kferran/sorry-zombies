import Phaser from 'phaser';
import { ApologyPicker } from '../features/apologies/ApologyPicker';
import { LINES } from '../features/apologies/lines';
import { STAGES } from './run/stages';
import type { RunState } from './run/RunState';

export type LevelCardData = { run: RunState; stage: number };

/**
 * Keys and taps are ignored this long after the card appears, so a held key or a last swing doesn't skip it.
 * After that a tap must also go down afresh (a thumb held from the Level lifting doesn't count).
 */
const ARM_MS = 400;

/** Between stages: the cleared stage's tally and one line. Any key or tap goes on to the next stage. */
export class LevelCardScene extends Phaser.Scene {
  private run!: RunState;
  private stage = 0;
  private done = false;
  /** The closing line shown (play checks). */
  line = '';

  constructor() { super('LevelCard'); }

  init(data: LevelCardData): void {
    this.run = data.run;
    this.stage = data.stage;
    this.done = false;
  }

  create(): void {
    const { width } = this.scale;
    const style = { fontFamily: 'monospace', color: '#ffffff' };
    const tally = this.run.stageTally();
    this.cameras.main.setBackgroundColor('#0b0a18');
    this.add.text(width / 2, 140, STAGES[this.stage].name, { ...style, fontSize: '56px' }).setOrigin(0.5);
    this.add.text(width / 2, 200, 'cleared', { ...style, fontSize: '24px', color: '#aaaaaa' }).setOrigin(0.5);
    const rows = [
      `Enemies hurt    ${tally.enemiesHurt}`,
      `Put to rest     ${tally.enemiesPutDown}`,
      `Apologies made  ${tally.apologies}`,
    ];
    this.add.text(width / 2, 260, rows.join('\n'), { ...style, fontSize: '28px', lineSpacing: 12 }).setOrigin(0.5, 0);
    this.line = new ApologyPicker(LINES).pick('levelCleared');
    this.add.text(width / 2, 470, `“${this.line}”`, {
      ...style, fontSize: '24px', color: '#facc15', wordWrap: { width: 900 }, align: 'center',
    }).setOrigin(0.5);
    const prompt = this.add.text(width / 2, 610, 'Press any key or tap to continue', {
      ...style, fontSize: '22px', color: '#cccccc',
    }).setOrigin(0.5).setAlpha(0);

    this.time.delayedCall(ARM_MS, () => {
      prompt.setAlpha(1);
      this.tweens.add({ targets: prompt, alpha: 0.4, duration: 800, yoyo: true, repeat: -1 });
      this.input.keyboard?.on('keydown', (e: KeyboardEvent) => { if (!e.repeat) this.continueRun(); });
      // Only a tap that starts now counts: a thumb still down from the Level (its lift) must not skip the card.
      let tapStarted = false;
      this.input.on('pointerdown', () => { tapStarted = true; });
      this.input.on('pointerup', () => { if (tapStarted) this.continueRun(); });
    });
  }

  /** The next level, or the boss after the last level. */
  continueRun(): void {
    if (this.done) return;
    this.done = true;
    const next = this.stage + 1;
    this.run.startStage(next);
    if (STAGES[next].key === 'boss') this.scene.start('Boss', { run: this.run });
    else this.scene.start('Level', { run: this.run, stageIndex: next });
  }
}
