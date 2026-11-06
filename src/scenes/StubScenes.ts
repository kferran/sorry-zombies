import Phaser from 'phaser';

/** Placeholder scenes so `startRun` has somewhere to go; replaced by the real ones in later tasks. */
function stub(key: string): typeof Phaser.Scene {
  return class extends Phaser.Scene {
    constructor() { super(key); }
    create(): void {
      const { width, height } = this.scale;
      this.add.text(width / 2, height / 2, `${key} (coming soon)`, {
        fontFamily: 'monospace', fontSize: '32px', color: '#ffffff',
      }).setOrigin(0.5);
    }
  };
}

export const STUB_SCENES = ['Boss', 'LevelCard'].map(stub);
