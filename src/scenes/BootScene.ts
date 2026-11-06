import Phaser from 'phaser';
import { SKELETON_BODY } from '../entities/enemy/enemy.stats';

const ART = 'assets/kenney-topdown';
const GV = 'assets/gothicvania-cemetery';
const KENNEY_KEYS = ['hero', 'shambler', 'jogger'];
const GV_KEYS = ['gv-atlas', 'gv-props', 'gv-tiles', 'gv-objects', 'gv-bg-moon', 'gv-bg-mountains', 'gv-bg-graveyard'];

/** Loads the Kenney CC0 sprites and the GothicVania Cemetery pack and draws the small shapes the pack doesn't have. */
export class BootScene extends Phaser.Scene {
  private failed = false;

  constructor() { super('Boot'); }

  preload(): void {
    this.failed = false;
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, () => { this.failed = true; });
    this.load.image('hero', `${ART}/survivor1_gun.png`);
    this.load.image('shambler', `${ART}/zoimbie1_hold.png`);
    this.load.image('jogger', `${ART}/zoimbie1_hold.png`);
    this.load.atlas('gv-atlas', `${GV}/atlas.png`, `${GV}/atlas.json`);
    this.load.atlas('gv-props', `${GV}/atlas-props.png`, `${GV}/atlas-props.json`);
    this.load.image('gv-tiles', `${GV}/tileset.png`);
    this.load.image('gv-objects', `${GV}/objects.png`);
    this.load.image('gv-bg-moon', `${GV}/bg-moon.png`);
    this.load.image('gv-bg-mountains', `${GV}/bg-mountains.png`);
    this.load.image('gv-bg-graveyard', `${GV}/bg-graveyard.png`);
  }

  create(): void {
    // Some hosts answer a missing file with an HTML page (200), which fails to decode
    // without a load error, so also confirm every texture actually arrived.
    const missing = [...KENNEY_KEYS, ...GV_KEYS].some(key => !this.textures.exists(key));
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
    this.dropAtlasPivots();
    this.createHeroAnims();
    this.createEnemyAnims();
    this.scene.start('Menu');
  }

  /**
   * The pack's atlases give every frame a 0.5/0.5 "pivot", which Phaser applies as the origin on each
   * animation frame, overriding a sprite's own setOrigin (the hero stands on his feet: origin y 1).
   * 0.5/0.5 is the default origin anyway, so dropping the pivots changes nothing else.
   */
  private dropAtlasPivots(): void {
    for (const key of ['gv-atlas', 'gv-props']) {
      const texture = this.textures.get(key);
      texture.getFrameNames().forEach(name => { texture.get(name).customPivot = false; });
    }
  }

  /** Global animations, created once (Boot can run again after a load error refresh). */
  private createHeroAnims(): void {
    const frames = (name: string, count: number) =>
      this.anims.generateFrameNames('gv-atlas', { prefix: `hero-${name}-`, start: 1, end: count });
    const defs: Phaser.Types.Animations.Animation[] = [
      { key: 'hero-idle', frames: frames('idle', 4), frameRate: 6, repeat: -1 },
      { key: 'hero-run', frames: frames('run', 6), frameRate: 12, repeat: -1 },
      { key: 'hero-jump', frames: frames('jump', 4), frameRate: 10, repeat: 0 },
      // 5 frames over the 450 ms swing cooldown: 90 ms a frame, live on frames 3–5.
      { key: 'hero-attack', frames: frames('attack', 5), duration: 450, repeat: 0 },
      { key: 'hero-crouch', frames: [{ key: 'gv-atlas', frame: 'hero-crouch' }], frameRate: 1, repeat: 0 },
      { key: 'hero-hurt', frames: [{ key: 'gv-atlas', frame: 'hero-hurt' }], frameRate: 1, repeat: 0 },
    ];
    this.createAnims(defs);
  }

  private createEnemyAnims(): void {
    const frames = (prefix: string, count: number) =>
      this.anims.generateFrameNames('gv-atlas', { prefix: `${prefix}-`, start: 1, end: count });
    this.createAnims([
      // SKELETON_BODY.riseMs: the skeleton can't move or hurt until the rise is over.
      { key: 'skeleton-rise', frames: frames('skeleton-rise-clothed', 6), duration: SKELETON_BODY.riseMs, repeat: 0 },
      { key: 'skeleton-walk', frames: frames('skeleton-clothed', 8), frameRate: 8, repeat: -1 },
      { key: 'enemy-death', frames: frames('enemy-death', 5), frameRate: 12, repeat: 0 },
    ]);
  }

  private createAnims(defs: Phaser.Types.Animations.Animation[]): void {
    for (const def of defs) {
      if (!this.anims.exists(def.key!)) this.anims.create(def);
    }
  }
}
