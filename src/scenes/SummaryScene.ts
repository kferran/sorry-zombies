import Phaser from 'phaser';
import type { ModeConfig } from '../shared/modes';
import type { RunStats } from '../features/scoring/Scoring';
import { Button } from '../shared/ui/Button';

export type SummaryData = {
  mode: ModeConfig;
  stats: RunStats;
  outcome: 'win' | 'lose';
  score: number;
};

export class SummaryScene extends Phaser.Scene {
  protected summary!: SummaryData;

  constructor() { super('Summary'); }

  init(data: SummaryData): void {
    this.summary = data;
  }

  create(): void {
    const { width } = this.scale;
    const { mode, stats, outcome, score } = this.summary;
    const style = { fontFamily: 'monospace', color: '#ffffff' };
    this.add.text(width / 2, 110, outcome === 'win' ? 'You survived.' : 'You were overwhelmed.', { ...style, fontSize: '56px' }).setOrigin(0.5);
    this.add.text(width / 2, 170, mode.label, { ...style, fontSize: '24px', color: '#aaaaaa' }).setOrigin(0.5);
    const rows = [
      `Waves cleared   ${stats.wavesCleared}`,
      `Zombies hurt    ${stats.zombiesHurt}`,
      `Zombies killed  ${stats.zombiesKilled}`,
      `Apologies made  ${stats.apologies}`,
      `Score           ${score}`,
    ];
    this.add.text(width / 2, 300, rows.join('\n'), { ...style, fontSize: '26px', lineSpacing: 10 }).setOrigin(0.5);
    Button(this, width / 2, 620, 'Play again', () => this.scene.start('Menu'));
  }
}
