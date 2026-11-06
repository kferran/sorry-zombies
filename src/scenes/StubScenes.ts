import Phaser from 'phaser';
import { Button } from '../shared/ui/Button';
import type { RunState } from './run/RunState';

/** Placeholder boss room until Task 10: Continue counts the boss as cleared and ends the run. */
class BossStubScene extends Phaser.Scene {
  private run!: RunState;

  constructor() { super('Boss'); }

  init(data: { run: RunState }): void {
    this.run = data.run;
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2 - 60, 'The Groundskeeper is on his way. (Boss fight coming soon.)', {
      fontFamily: 'monospace', fontSize: '28px', color: '#ffffff', align: 'center', wordWrap: { width: width - 160 },
    }).setOrigin(0.5);
    Button(this, width / 2, height / 2 + 60, 'Continue', () => this.continueRun());
  }

  continueRun(): void {
    this.run.clearStage();
    this.scene.start('Summary', { run: this.run, outcome: 'defeated' });
  }
}

export const STUB_SCENES = [BossStubScene];
