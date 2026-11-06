import Phaser from 'phaser';
import { bus } from '../shared/events';
import { MODES, type ModeConfig } from '../shared/modes';
import type { Point } from '../shared/projection';
import { Button } from '../shared/ui/Button';
import type { PlatformInput } from '../shared/input/PlatformInput';
import { KeyboardPlatformInput } from '../shared/input/KeyboardPlatformInput';
import { LevelError, parseLevel, type LevelData } from '../features/levels/LevelLoader';
import { SwingRules } from '../features/combat/SwingRules';
import { Hero } from '../entities/hero/Hero';
import { GRAVITY, HERO, WHIP } from '../entities/hero/hero.stats';
import { STAGES } from './run/stages';
import type { OverlayScene } from './OverlayScene';

/** Until RunState lands (Task 8), a run is just the mode and the hearts left. */
export type LocalRun = { mode: ModeConfig; hearts: number };

export type LevelInit = {
  run?: LocalRun;
  stageIndex?: number;
  /** Legacy shape from MenuScene.startRun. */
  mode?: ModeConfig;
  /** Debug/play-check override: load maps/<mapKey>.json instead of the stage's map. */
  mapKey?: string;
};

const ZOOM = 3;
/** A jump pressed this long before landing still happens. */
const JUMP_BUFFER_MS = 100;
/** Sky colour at the top of bg-moon, shown above the backgrounds (which are 224 px tall, maps 240). */
const SKY = '#000022';
const PARALLAX: [key: string, factor: number][] = [
  ['gv-bg-moon', 0.1],
  ['gv-bg-mountains', 0.3],
  ['gv-bg-graveyard', 0.6],
];

export class LevelScene extends Phaser.Scene {
  run: LocalRun = { mode: MODES.casual, hearts: HERO.hearts };
  stageIndex = 0;
  mapKey = STAGES[0].key;
  level?: LevelData;
  hero?: Hero;
  /** The whip's reach (24×20 world px in front of the hero); its body is enabled only on live frames. */
  whipHitbox!: Phaser.GameObjects.Zone;
  /** Number of swings started (play checks). */
  swingCount = 0;
  /** Live point above the hero's head, in world coordinates; bubbles follow it. */
  readonly heroHead: Point = headOf(this);
  brokenMessage?: string;

  private controls?: PlatformInput;
  private swing = new SwingRules();
  private stopShort = false;
  private jumpAt = -Infinity;
  private elapsed = 0;

  constructor() { super('Level'); }

  init(data: LevelInit): void {
    this.run = data.run ?? { mode: data.mode ?? MODES.casual, hearts: HERO.hearts };
    this.stageIndex = data.stageIndex ?? 0;
    this.mapKey = data.mapKey ?? STAGES[this.stageIndex].key;
    this.level = undefined;
    this.hero = undefined;
    this.controls = undefined;
    this.brokenMessage = undefined;
    this.swing = new SwingRules();
    this.swingCount = 0;
    this.stopShort = false;
    this.jumpAt = -Infinity;
    this.elapsed = 0;
  }

  preload(): void {
    // The loader skips keys already in the cache, so a restart doesn't refetch.
    if (!this.cache.tilemap.exists(this.mapKey)) {
      this.load.tilemapTiledJSON(this.mapKey, `maps/${this.mapKey}.json`);
    }
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.teardown, this);
    let map: Phaser.Tilemaps.Tilemap;
    let ground: Phaser.Tilemaps.TilemapLayer;
    try {
      ({ map, ground } = this.buildMap());
    } catch (err) {
      this.showBroken(err instanceof Error ? err.message : String(err));
      return;
    }
    const level = this.level!;

    this.physics.world.gravity.y = GRAVITY;
    this.physics.world.setBounds(0, 0, level.widthPx, level.heightPx);

    const hero = new Hero(this, level.heroStart.x, level.heroStart.y);
    this.hero = hero;
    this.physics.add.collider(hero, ground);

    this.whipHitbox = this.add.zone(0, 0, WHIP.width, WHIP.height);
    this.physics.add.existing(this.whipHitbox);
    const whipBody = this.whipHitbox.body as Phaser.Physics.Arcade.Body;
    whipBody.setAllowGravity(false).setImmovable(true);
    whipBody.moves = false;
    whipBody.enable = false;

    const cam = this.cameras.main;
    cam.setBackgroundColor(SKY);
    cam.setZoom(ZOOM);
    cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    cam.startFollow(hero, true);

    this.controls = new KeyboardPlatformInput(this);
    this.controls.reset();
    this.events.on(Phaser.Scenes.Events.PAUSE, this.resetControls, this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.resetControls, this);

    const stage = STAGES[this.stageIndex];
    this.scene.launch('Overlay', {
      mode: this.run.mode, stageName: stage.name, host: this.scene.key, hearts: this.run.hearts,
    });
    // Bubbles project through this camera, so the Overlay must draw after this scene.
    this.scene.bringToTop('Overlay');
  }

  /** Updates the run's hearts and tells the Overlay. */
  setHearts(hearts: number): void {
    this.run.hearts = hearts;
    bus.emit('heartsChanged', { hearts });
  }

  /** The Overlay, for speech bubbles: `overlay().say(text, this.heroHead)`. */
  overlay(): OverlayScene {
    return this.scene.get('Overlay') as OverlayScene;
  }

  /** True while the swing is on a live frame (3–5); Task 7 overlaps `whipHitbox` against enemies. */
  get whipActive(): boolean {
    return (this.whipHitbox?.body as Phaser.Physics.Arcade.Body | undefined)?.enable ?? false;
  }

  /**
   * Level time in ms: the sum of frame deltas, so it stops while paused and runs at the same rate
   * as physics, animations and timers (Phaser clamps deltas when the window is unfocused or slow).
   * Swings, the jump buffer and hero freezes all use it.
   */
  get now(): number {
    return this.elapsed;
  }

  update(_time: number, delta: number): void {
    this.elapsed += delta;
    const hero = this.hero;
    const controls = this.controls;
    if (!hero || !controls) return;
    const now = this.elapsed;
    const mx = controls.moveX();
    if (controls.jumpPressed()) this.jumpAt = now;
    const whip = controls.whipPressed();
    controls.bowPressed(); // Full Conscience bow arrives in Task 11; drain the queue meanwhile.

    const frozen = now < hero.frozenUntil;
    if (!frozen) {
      if (whip) this.trySwing(now);
      if (hero.attacking && hero.onGround) {
        hero.setVelocityX(0); // a grounded swing plants his feet
      } else {
        hero.setVelocityX(mx * HERO.walk);
        if (mx !== 0 && !hero.attacking) hero.face(mx > 0 ? 1 : -1);
      }
      if (now - this.jumpAt <= JUMP_BUFFER_MS && hero.onGround) {
        hero.setVelocityY(-HERO.jumpVelocity);
        this.jumpAt = -Infinity;
      }
    }

    this.updateWhip();
    if (!frozen && !hero.attacking) {
      if (!hero.onGround) hero.show('hero-jump');
      else hero.show(mx !== 0 ? 'hero-run' : 'hero-idle');
    }
  }

  private trySwing(now: number): void {
    const { started, stopShort } = this.swing.tryStart(now, 0); // guilt wiring: Task 11
    if (!started) return;
    this.swingCount += 1;
    this.stopShort = stopShort;
    this.hero!.play('hero-attack');
  }

  private updateWhip(): void {
    const hero = this.hero!;
    const body = this.whipHitbox.body as Phaser.Physics.Arcade.Body;
    let active = hero.attacking && this.swing.isActiveFrame(hero.animFrame);
    if (active && this.stopShort) {
      hero.anims.stop(); // hesitation: the swing dies before it lands
      active = false;
    }
    const hb = hero.body;
    const x = hero.facing > 0 ? hb.right + WHIP.width / 2 : hb.left - WHIP.width / 2;
    // reset() moves zone and body together; moving only the zone would let the body's stale
    // previous position drag the zone on the next physics step.
    body.reset(x, hb.top + WHIP.dy + WHIP.height / 2);
    body.enable = active;
  }

  private resetControls(): void {
    this.controls?.reset();
    this.jumpAt = -Infinity;
  }

  private buildMap(): { map: Phaser.Tilemaps.Tilemap; ground: Phaser.Tilemaps.TilemapLayer } {
    const key = this.mapKey;
    const entry = this.cache.tilemap.get(key) as { data?: unknown } | undefined;
    if (!entry?.data) throw new LevelError(key, `couldn't load maps/${key}.json`);
    this.level = parseLevel(entry.data, key);

    const map = this.make.tilemap({ key });
    const tiles = map.addTilesetImage('gv-tiles', 'gv-tiles');
    const objects = map.addTilesetImage('gv-objects', 'gv-objects');
    if (!tiles || !objects) throw new LevelError(key, 'needs the tilesets "gv-tiles" and "gv-objects"');

    this.addParallax(map.widthInPixels, map.heightInPixels);
    map.createLayer('decor', [tiles, objects]);
    const ground = map.createLayer('ground', [tiles, objects]) as Phaser.Tilemaps.TilemapLayer | null;
    if (!ground) throw new LevelError(key, 'no "ground" tile layer');
    ground.setCollisionByExclusion([-1]);
    return { map, ground };
  }

  /**
   * Three backgrounds, bottoms on the map's bottom edge, repeated sideways as plain images. With zoom z the camera's
   * scrollX runs c = W·(1 − 1/z)/2 behind its worldView, so a scroll-factor-s layer shows local x
   * from c·(1 − s) to (mapW − viewW − c)·s + c + viewW; copies reaching mapW + viewW cover every
   * s in 0..1. The map never scrolls vertically (it is exactly the view's height).
   */
  private addParallax(mapW: number, mapH: number): void {
    const viewW = Math.ceil(this.scale.width / ZOOM);
    PARALLAX.forEach(([key, factor]) => {
      const { width: w } = this.textures.get(key).getSourceImage();
      for (let x = 0; x < mapW + viewW; x += w) {
        this.add.image(x, mapH, key).setOrigin(0, 1).setScrollFactor(factor, 1);
      }
    });
  }

  private showBroken(reason: string): void {
    this.brokenMessage = reason;
    this.children.removeAll(true); // anything built before the map failed
    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2 - 60, `This level is broken: ${reason}`, {
      fontFamily: 'monospace', fontSize: '26px', color: '#ffffff', align: 'center',
      wordWrap: { width: width - 160 },
    }).setOrigin(0.5);
    Button(this, width / 2, height / 2 + 60, 'Back to menu', () => this.scene.start('Menu'));
  }

  private teardown(): void {
    this.events.off(Phaser.Scenes.Events.PAUSE, this.resetControls, this);
    this.events.off(Phaser.Scenes.Events.RESUME, this.resetControls, this);
    this.controls?.destroy();
    this.controls = undefined;
    this.scene.stop('Overlay');
  }
}

/** A live point at the top-centre of the hero's body; reads (0, 0) before he exists. */
function headOf(scene: LevelScene): Point {
  return {
    get x() { return scene.hero?.body.center.x ?? 0; },
    get y() { return scene.hero?.body.top ?? 0; },
  };
}
