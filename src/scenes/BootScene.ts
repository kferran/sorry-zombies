import Phaser from 'phaser';

const ART = 'assets/kenney-topdown';

/** Loads the Kenney CC0 sprites and draws the small shapes the pack doesn't have. */
export class BootScene extends Phaser.Scene {
  private failed = false;

  constructor() { super('Boot'); }

  preload(): void {
    this.failed = false;
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, () => { this.failed = true; });
    this.load.image('hero', `${ART}/survivor1_gun.png`);
    this.load.image('shambler', `${ART}/zoimbie1_hold.png`);
    this.load.image('jogger', `${ART}/zoimbie1_hold.png`);
  }

  create(): void {
    // Some hosts answer a missing file with an HTML page (200), which fails to decode
    // without a load error, so also confirm every texture actually arrived.
    const missing = ['hero', 'shambler', 'jogger'].some(key => !this.textures.exists(key));
    if (this.failed || missing) {
      const { width, height } = this.scale;
      this.add.text(width / 2, height / 2, 'Couldn’t load the game. Try refreshing.', {
        fontFamily: 'monospace', fontSize: '32px', color: '#ffffff',
      }).setOrigin(0.5);
      return;
    }
    const g = this.add.graphics();
    g.fillStyle(0xffffff).fillCircle(4, 4, 4).generateTexture('pea', 8, 8);
    // A small heart: two circles and a triangle.
    g.clear().fillStyle(0xef4444)
      .fillCircle(5, 5, 5).fillCircle(13, 5, 5)
      .fillTriangle(0, 7, 18, 7, 9, 17)
      .generateTexture('heart', 18, 18);
    g.destroy();
    this.scene.start('Menu');
  }
}
