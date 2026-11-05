import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width - 8, height - 8).setStrokeStyle(4, 0x666666);
  }
}
