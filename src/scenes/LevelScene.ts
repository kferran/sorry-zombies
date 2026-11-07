import Phaser from 'phaser';
import { bus } from '../shared/events';
import { MODES, type ModeConfig } from '../shared/modes';
import type { Point } from '../shared/projection';
import { Button } from '../shared/ui/Button';
import type { PlatformInput } from '../shared/input/PlatformInput';
import { TouchPlatformInput } from '../shared/input/TouchPlatformInput';
import { makePlatformInput } from '../shared/input/makePlatformInput';
import type { TouchHud } from '../shared/input/touchPad';
import { LevelError, parseLevel, type LevelData } from '../features/levels/LevelLoader';
import { swingLineKind } from '../features/combat/SwingHits';
import { ApologyPicker, type LineKind } from '../features/apologies/ApologyPicker';
import { LINES } from '../features/apologies/lines';
import { nameCatLine } from '../features/apologies/catLine';
import { Hero } from '../entities/hero/Hero';
import { GRAVITY, HERO } from '../entities/hero/hero.stats';
import type { Enemy } from '../entities/enemy/Enemy';
import { HellCat } from '../entities/enemy/HellCat';
import { WAIT, waitMsFor } from '../entities/enemy/enemy.stats';
import { STAGES } from './run/stages';
import { RunState, decideFrame } from './run/RunState';
import { HeroCombat, overlaps } from './level/HeroCombat';
import { LevelEnemies } from './level/LevelEnemies';
import { LevelHitStop } from './level/LevelHitStop';
import type { OverlayScene } from './OverlayScene';
import type { NameTag } from '../shared/nameTags';

export type LevelInit = {
  run?: RunState;
  stageIndex?: number;
  /** Without a run, a fresh one in this mode (debug/play checks). */
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
/** After the last heart goes, the hero lies there this long (Level clock) before the stage restarts. */
const RETRY_BEAT_MS = 800;
/** Touch zones at the exit and the lantern: this wide and tall, standing on the marker. */
const ZONE = { width: 16, height: 40 } as const;
type Box = { left: number; right: number; top: number; bottom: number };

const PARALLAX: [key: string, factor: number][] = [
  ['gv-bg-moon', 0.1],
  ['gv-bg-mountains', 0.3],
  ['gv-bg-graveyard', 0.6],
];

export class LevelScene extends Phaser.Scene {
  run = new RunState(MODES.casual);
  stageIndex = 0;
  mapKey = STAGES[0].key;
  level?: LevelData;
  hero?: Hero;
  combat?: HeroCombat;
  enemies?: LevelEnemies;
  /** Live point above the hero's head, in world coordinates; bubbles follow it. */
  readonly heroHead: Point = headOf(this);
  brokenMessage?: string;
  /** Level-clock time the retry happens (set when the last heart goes). */
  retryAt?: number;
  /** Set once the stage is cleared or a retry is under way: nothing else is decided. */
  ending = false;

  private controls?: PlatformInput;
  private picker = new ApologyPicker(LINES);
  private hitStop = this.newHitStop();
  private hitLineAt = -Infinity;
  private jumpAt = -Infinity;
  private elapsed = 0;
  private exitZone?: Box;
  private checkpointZone?: Box;
  private lantern?: Phaser.GameObjects.Image;
  private lanternGlow?: Phaser.GameObjects.Image;

  constructor() { super('Level'); }

  init(data: LevelInit): void {
    this.stageIndex = data.stageIndex ?? 0;
    if (data.run) {
      this.run = data.run;
    } else {
      this.run = new RunState(data.mode ?? MODES.casual);
      this.run.startStage(this.stageIndex);
    }
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
    this.retryAt = undefined;
    this.ending = false;
    this.exitZone = undefined;
    this.checkpointZone = undefined;
    this.lantern = undefined;
    this.lanternGlow = undefined;
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

    this.addExit(level.exit);
    this.addLantern(level.checkpoint);
    const start = this.run.checkpointLit && level.checkpoint ? level.checkpoint : level.heroStart;
    const hero = new Hero(this, start.x, start.y);
    this.hero = hero;
    this.physics.add.collider(hero, ground);

    this.combat = new HeroCombat(this, hero);
    this.enemies = new LevelEnemies(this, ground, level.spawns, this.stageIndex);

    const cam = this.cameras.main;
    cam.setBackgroundColor(SKY);
    cam.setZoom(ZOOM);
    cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    cam.startFollow(hero, true);

    this.controls = makePlatformInput(this, this.run.mode.guilt);
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
    if (this.retryAt !== undefined && now >= this.retryAt) { this.retry(); return; }
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
    // Only skeletons announce themselves; ghosts and hell-cats wake silently.
    const climbed = risen.some(e => e.kind === 'skeleton');
    if (climbed && now - this.hitLineAt >= HIT_LINE_HOLD_MS) this.say('rise');
    if (touching) this.touched(touching, now);

    if (!(now < hero.frozenUntil) && !hero.attacking) {
      if (!hero.onGround) hero.show('hero-jump');
      else hero.show(mx !== 0 ? 'hero-run' : 'hero-idle');
    }
    this.decide(now);
  }

  /** Once a frame, after combat: light the lantern, then retry, clear or carry on. */
  private decide(now: number): void {
    if (this.ending) return;
    const body = this.hero!.body;
    if (!this.run.checkpointLit && this.checkpointZone && overlaps(body, this.checkpointZone)) this.lightLantern();
    const atExit = this.exitZone !== undefined && overlaps(body, this.exitZone);
    switch (decideFrame(this.run.hearts, atExit)) {
      case 'retry':
        this.ending = true;
        this.retryAt = now + RETRY_BEAT_MS;
        break;
      case 'clear':
        this.ending = true;
        this.run.clearStage();
        bus.emit('stageCleared', { stage: this.stageIndex });
        this.scene.start('LevelCard', { run: this.run, stage: this.stageIndex });
        break;
      case 'continue':
        break;
    }
  }

  /** Same stage again with 3 hearts, from the lantern if lit; the restart rebuilds every enemy asleep. */
  private retry(): void {
    this.retryAt = undefined;
    this.run.retry();
    bus.emit('retry', { stage: this.stageIndex });
    const data: LevelInit = { run: this.run, stageIndex: this.stageIndex };
    if (this.mapKey !== STAGES[this.stageIndex].key) data.mapKey = this.mapKey;
    this.scene.restart(data);
  }

  /** Hell-cat name tags for the Overlay (world px). */
  nameTags(): NameTag[] {
    return this.enemies?.nameTags() ?? [];
  }

  /** Touch buttons and stick for the Overlay to draw, or null with keyboard controls. */
  touchHud(): TouchHud | null {
    return this.controls instanceof TouchPlatformInput ? this.controls.hud() : null;
  }

  /** 'touch' or 'keyboard' (play checks). */
  get inputKind(): 'touch' | 'keyboard' | undefined {
    if (!this.controls) return undefined;
    return this.controls instanceof TouchPlatformInput ? 'touch' : 'keyboard';
  }

  /** Is the checkpoint lantern lit? (Play checks.) */
  get lanternLit(): boolean {
    return this.run.checkpointLit;
  }

  private addExit(exit: LevelData['exit']): void {
    if (!exit) return;
    this.add.image(exit.x, exit.y, 'exit-gate').setOrigin(0.5, 1).setDepth(2);
    this.exitZone = standingBox(exit);
  }

  private addLantern(at: LevelData['checkpoint']): void {
    if (!at) return;
    this.lanternGlow = this.add.image(at.x, at.y - 24, 'lantern-glow')
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(3).setVisible(false);
    this.lantern = this.add.image(at.x, at.y, 'lantern-unlit').setOrigin(0.5, 1).setDepth(4);
    this.checkpointZone = standingBox(at);
    if (this.run.checkpointLit) this.showLit();
  }

  private lightLantern(): void {
    this.run.checkpointLit = true;
    this.showLit();
  }

  private showLit(): void {
    this.lantern?.setTexture('lantern-lit');
    const glow = this.lanternGlow;
    if (!glow) return;
    glow.setVisible(true);
    this.tweens.add({ targets: glow, alpha: { from: 1, to: 0.6 }, duration: 700, yoyo: true, repeat: -1 });
  }

  /** One swing's hits: one line for the lot, each survivor waits as long as that line, then hit-stop. */
  private landSwing(struck: Enemy[], now: number): void {
    const results = this.enemies!.strike(struck, this.hero!.body.center.x);
    const stats = this.run.stats;
    for (const r of results) {
      if (r === 'ignored') continue;
      stats.enemiesHurt++;
      if (r === 'killed') stats.enemiesPutDown++;
    }
    const kind = swingLineKind(results, struck.map(e => e.kind));
    if (!kind) return;
    const cat = kind === 'catKill'
      ? struck.find((e, i): e is HellCat => e instanceof HellCat && results[i] === 'killed')
      : undefined;
    const line = this.say(kind, cat ? text => nameCatLine(text, cat.catName) : undefined);
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
      hero.frozenUntil = Infinity; // decide() schedules the retry this frame
      bus.emit('heroDown', {});
    }
  }

  /** The hero says a line (tiered by stage where the kind has tiers, `edit`ed if given) and returns it. */
  private say(kind: LineKind, edit?: (text: string) => string): string {
    const picked = this.picker.pick(kind, 1, STAGES[this.stageIndex].tier);
    const text = edit ? edit(picked) : picked;
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

/** A ZONE-sized box standing on a map marker (x centre, y the surface under it). */
function standingBox(at: { x: number; y: number }): Box {
  return { left: at.x - ZONE.width / 2, right: at.x + ZONE.width / 2, top: at.y - ZONE.height, bottom: at.y };
}

/** A live point at the top-centre of the hero's body; reads (0, 0) before he exists. */
function headOf(scene: LevelScene): Point {
  return {
    get x() { return scene.hero?.body.center.x ?? 0; },
    get y() { return scene.hero?.body.top ?? 0; },
  };
}
