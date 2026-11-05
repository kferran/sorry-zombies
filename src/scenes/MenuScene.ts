import Phaser from 'phaser';
import { Button } from '../shared/ui/Button';
import { MODES, type ModeId } from '../shared/modes';
import { getBest } from '../features/scoring/bestScores';

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create(): void {
    const { width } = this.scale;
    this.add.text(width / 2, 180, 'Sorry, Zombies', {
      fontFamily: 'monospace', fontSize: '72px', color: '#ffffff',
    }).setOrigin(0.5);
    Button(this, width / 2 - 220, 380, MODES.casual.label, () => this.startRun('casual'));
    Button(this, width / 2 + 220, 380, MODES.conscience.label, () => this.startRun('conscience'));
    ([['casual', -220], ['conscience', 220]] as const).forEach(([id, dx]) => {
      const best = getBest(id);
      if (best !== null) {
        this.add.text(width / 2 + dx, 440, `Best: ${best}`, {
          fontFamily: 'monospace', fontSize: '20px', color: '#aaaaaa',
        }).setOrigin(0.5);
      }
    });
    this.add.text(width / 2, 640, 'WASD to move · mouse to aim · click to shoot · Space to apologize', {
      fontFamily: 'monospace', fontSize: '18px', color: '#aaaaaa',
    }).setOrigin(0.5);
  }

  startRun(modeId: ModeId): void {
    this.scene.start('Game', { mode: MODES[modeId] });
  }
}
