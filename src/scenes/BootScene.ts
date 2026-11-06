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
    this.drawLanterns(g);
    this.drawGate(g);
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

  /** The checkpoint lantern on its post (12×32 world px, feet at the bottom), unlit and lit, and its glow. */
  private drawLanterns(g: Phaser.GameObjects.Graphics): void {
    const lantern = (glass: number, core: number | null, key: string) => {
      g.clear()
        .fillStyle(0x4a4660).fillRect(5, 12, 2, 18).fillRect(3, 30, 6, 2) // post and foot
        .fillTriangle(1, 4, 11, 4, 6, 0).fillRect(5, 0, 2, 1) // roof and finial
        .fillRect(2, 4, 8, 1).fillRect(2, 11, 8, 1).fillRect(2, 4, 1, 8).fillRect(9, 4, 1, 8) // frame
        .fillStyle(glass).fillRect(3, 5, 6, 6);
      if (core !== null) g.fillStyle(core).fillRect(5, 7, 2, 3);
      g.generateTexture(key, 12, 32);
    };
    lantern(0x343a52, null, 'lantern-unlit');
    lantern(0xf6b93b, 0xfff4c2, 'lantern-lit');
    g.clear();
    for (let r = 24; r > 0; r -= 4) g.fillStyle(0xffc857, 0.06).fillCircle(24, 24, r);
    g.generateTexture('lantern-glow', 48, 48);
  }

  /** The exit: an open stone arch (32×48 world px, feet at the bottom). */
  private drawGate(g: Phaser.GameObjects.Graphics): void {
    const stone = 0x5b4a5e;
    const light = 0x7d6a82;
    g.clear()
      .fillStyle(0x05040c, 0.75).fillRect(6, 14, 20, 34).fillCircle(16, 15, 10) // the dark way through
      .lineStyle(5, stone).beginPath().arc(16, 15, 12.5, Math.PI, 0).strokePath()
      .fillStyle(stone).fillRect(1, 14, 6, 34).fillRect(25, 14, 6, 34) // pillars
      .fillStyle(light).fillRect(1, 14, 1, 34).fillRect(25, 14, 1, 34)
      .fillRect(0, 12, 8, 3).fillRect(24, 12, 8, 3) // capitals
      .fillRect(14, 0, 4, 4); // keystone
    g.generateTexture('exit-gate', 32, 48);
  }

  private createAnims(defs: Phaser.Types.Animations.Animation[]): void {
    for (const def of defs) {
      if (!this.anims.exists(def.key!)) this.anims.create(def);
    }
  }
}
