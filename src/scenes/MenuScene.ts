import Phaser from 'phaser';
import { Button } from '../shared/ui/Button';

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create(): void {
    const { width } = this.scale;
    this.add.text(width / 2, 180, 'Sorry, Zombies', {
      fontFamily: 'monospace', fontSize: '72px', color: '#ffffff',
    }).setOrigin(0.5);
    Button(this, width / 2 - 220, 380, 'Casual Remorse', () => this.startRun('casual'));
    Button(this, width / 2 + 220, 380, 'Full Conscience', () => this.startRun('conscience'));
    this.add.text(width / 2, 640, 'WASD to move · mouse to aim · click to shoot · Space to apologize', {
      fontFamily: 'monospace', fontSize: '18px', color: '#aaaaaa',
    }).setOrigin(0.5);
  }

  startRun(modeId: 'casual' | 'conscience'): void {
    this.scene.start('Game', { modeId });
  }
}
