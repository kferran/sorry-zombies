import Phaser from 'phaser';
import type { GuiltLevel } from './GuiltMeter';

const WIDTH = 400;
const HEIGHT = 16;
const COLORS: Record<GuiltLevel, number> = { 0: 0x60a5fa, 1: 0xf59e0b, 2: 0xdc2626 };

/** Guilt bar for the HUD, top centre. */
export class GuiltBar {
  private fill: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene) {
    const x = scene.scale.width / 2;
    const y = 28;
    scene.add.text(x - WIDTH / 2 - 12, y, 'Guilt', {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffffff',
    }).setOrigin(1, 0.5);
    scene.add.rectangle(x, y, WIDTH, HEIGHT, 0x000000, 0.5).setStrokeStyle(2, 0xffffff);
    this.fill = scene.add.rectangle(x - WIDTH / 2, y, 0, HEIGHT - 4, COLORS[0]).setOrigin(0, 0.5);
  }

  set(value: number, level: GuiltLevel): void {
    this.fill.width = (WIDTH * Math.max(0, Math.min(100, value))) / 100;
    this.fill.setFillStyle(COLORS[level]);
  }
}
