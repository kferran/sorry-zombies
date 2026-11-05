import Phaser from 'phaser';
import { bus } from '../shared/events';
import { HERO } from '../entities/hero/hero.stats';

export class HudScene extends Phaser.Scene {
  private hearts: Phaser.GameObjects.Image[] = [];

  constructor() { super('Hud'); }

  create(): void {
    this.hearts = Array.from({ length: HERO.hearts }, (_, i) => this.add.image(28 + i * 26, 28, 'heart'));
    bus.on('heroHurt', ({ hearts }) => this.drawHearts(hearts), this);
  }

  private drawHearts(count: number): void {
    this.hearts.forEach((h, i) => h.setAlpha(i < count ? 1 : 0.2));
  }
}
