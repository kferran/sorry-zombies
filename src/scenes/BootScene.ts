import Phaser from 'phaser';

/** Generates placeholder textures until the Kenney art lands (Task 13). */
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create(): void {
    const g = this.add.graphics();
    const circle = (key: string, color: number, r: number) => {
      g.clear().fillStyle(color).fillCircle(r, r, r).generateTexture(key, r * 2, r * 2);
    };
    circle('hero', 0x3b82f6, 16);
    circle('shambler', 0x22c55e, 16);
    circle('jogger', 0xa3e635, 14);
    circle('pea', 0xffffff, 4);
    g.clear().fillStyle(0xef4444).fillRect(0, 0, 16, 16).generateTexture('heart', 16, 16);
    g.destroy();
    this.scene.start('Menu');
  }
}
