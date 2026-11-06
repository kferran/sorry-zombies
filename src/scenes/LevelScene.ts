import Phaser from 'phaser';
import { bus } from '../shared/events';
import { MODES, type ModeConfig } from '../shared/modes';
import type { Point } from '../shared/projection';
import { Button } from '../shared/ui/Button';
import type { PlatformInput } from '../shared/input/PlatformInput';
import { KeyboardPlatformInput } from '../shared/input/KeyboardPlatformInput';
import { LevelError, parseLevel, type LevelData } from '../features/levels/LevelLoader';
import { swingLineKind } from '../features/combat/SwingHits';
import { ApologyPicker, type LineKind } from '../features/apologies/ApologyPicker';
import { LINES } from '../features/apologies/lines';
import { Hero } from '../entities/hero/Hero';
import { GRAVITY, HERO } from '../entities/hero/hero.stats';
import type { Enemy } from '../entities/enemy/Enemy';
import { WAIT, waitMsFor } from '../entities/enemy/enemy.stats';
import { STAGES } from './run/stages';
import { HeroCombat } from './level/HeroCombat';
import { LevelEnemies } from './level/LevelEnemies';
import { LevelHitStop } from './level/LevelHitStop';
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
/** A rise line waits while a hit apology this recent may still be showing. */
const HIT_LINE_HOLD_MS = 800;
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
  combat?: HeroCombat;
  enemies?: LevelEnemies;
  /** Live point above the hero's head, in world coordinates; bubbles follow it. */
  readonly heroHead: Point = headOf(this);
  brokenMessage?: string;

  private controls?: PlatformInput;
  private picker = new ApologyPicker(LINES);
  private hitStop = this.newHitStop();
  private hitLineAt = -Infinity;
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
    this.combat = undefined;
    this.enemies = undefined;
    this.hitStop = this.newHitStop();
    this.hitLineAt = -Infinity;
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

    this.physics.resume(); // in case the last run ended mid hit-stop
    this.physics.world.gravity.y = GRAVITY;
    this.physics.world.setBounds(0, 0, level.widthPx, level.heightPx);

    const hero = new Hero(this, level.heroStart.x, level.heroStart.y);
    this.hero = hero;
    this.physics.add.collider(hero, ground);

    this.combat = new HeroCombat(this, hero);
    this.enemies = new LevelEnemies(this, ground, level.spawns, this.stageIndex);

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

  /** The whip's reach (24×20 world px in front of the hero); its body is enabled only on live frames. */
  get whipHitbox(): Phaser.GameObjects.Zone | undefined {
    return this.combat?.hitbox;
  }

  /** True while the swing is on a live frame (3–5). */
  get whipActive(): boolean {
    return this.combat?.active ?? false;
  }

  /** Number of swings started (play checks). */
  get swingCount(): number {
    return this.combat?.swingCount ?? 0;
  }

  /** True during the 90 ms freeze after a hit (physics, animations and the Level clock all stop). */
  get hitStopped(): boolean {
    return this.hitStop.active;
  }

  /**
   * Level time in ms: the sum of frame deltas, so it stops while paused and runs at the same rate
   * as physics, animations and timers (Phaser clamps deltas when the window is unfocused or slow).
   * Swings, the jump buffer, hero freezes and every enemy timer use it. Hit-stop stops it too.
   */
  get now(): number {
    return this.elapsed;
  }

  update(_time: number, delta: number): void {
    if (this.hitStop.tick(delta)) return; // hit-stop: the Level clock and gameplay stand still
    this.elapsed += delta;
    const hero = this.hero;
    const controls = this.controls;
    const combat = this.combat;
    const enemies = this.enemies;
    if (!hero || !controls || !combat || !enemies) return;
    const now = this.elapsed;
    const mx = controls.moveX();
    if (controls.jumpPressed()) this.jumpAt = now;
    const whip = controls.whipPressed();
    controls.bowPressed(); // Full Conscience bow arrives in Task 11; drain the queue meanwhile.

    const frozen = now < hero.frozenUntil;
    if (!frozen) {
      if (whip) combat.trySwing(now);
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

    combat.update();
    const struck = combat.newlyStruck(enemies.list);
    if (struck.length > 0) this.landSwing(struck, now);
    if (this.hitStop.active) return; // frozen from this frame on (the paused swing must not fall back to idle)

    const { risen, touching } = enemies.update(hero, now);
    if (risen.length > 0 && now - this.hitLineAt >= HIT_LINE_HOLD_MS) this.say('rise');
    if (touching) this.touched(touching, now);

    if (!(now < hero.frozenUntil) && !hero.attacking) {
      if (!hero.onGround) hero.show('hero-jump');
      else hero.show(mx !== 0 ? 'hero-run' : 'hero-idle');
    }
  }

  /** One swing's hits: one line for the lot, each survivor waits as long as that line, then hit-stop. */
  private landSwing(struck: Enemy[], now: number): void {
    const kind = swingLineKind(this.enemies!.strike(struck, this.hero!.body.center.x));
    if (!kind) return;
    const line = this.say(kind);
    this.hitLineAt = now;
    for (const e of struck) if (!e.health.dead) e.waitFor(now, waitMsFor(line));
    this.hitStop.start([this.hero!, ...this.enemies!.sprites()]);
  }

  /** An enemy that can hurt touches the hero. */
  private touched(enemy: Enemy, now: number): void {
    const hero = this.hero!;
    if (this.run.hearts <= 0) return;
    const away = hero.body.center.x >= enemy.body.center.x ? 1 : -1;
    if (!hero.hurt(now, away * HERO.knockback)) return; // still invulnerable
    enemy.waitFor(now, WAIT.afterContactMs);
    this.setHearts(this.run.hearts - 1);
    this.say('hurt');
    if (this.run.hearts <= 0) {
      hero.frozenUntil = Infinity; // Task 8 turns this into a retry
      bus.emit('heroDown', {});
    }
  }

  /** The hero says a line (tiered by stage where the kind has tiers) and returns it. */
  private say(kind: LineKind): string {
    const text = this.picker.pick(kind, 1, STAGES[this.stageIndex].tier);
    this.overlay().say(text, this.heroHead);
    return text;
  }

  /** When a hit-stop ends, the struck enemies stop flashing and put-down ones burn up. */
  private newHitStop(): LevelHitStop {
    return new LevelHitStop(this, () => {
      this.enemies?.endFlash();
      this.enemies?.finishPutDowns();
    });
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
