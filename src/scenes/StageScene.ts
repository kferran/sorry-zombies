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
import { GuiltSampler, decideBow, swingGuiltLevel, wantsGrey } from './run/conscience';
import { HeroCombat } from './level/HeroCombat';
import { LevelEnemies } from './level/LevelEnemies';
import { LevelHitStop } from './level/LevelHitStop';
import type { OverlayScene } from './OverlayScene';
import type { NameTag } from '../shared/nameTags';

const ZOOM = 3;
/** A jump pressed this long before landing still happens. */
const JUMP_BUFFER_MS = 100;
/** A rise line waits while a hit apology this recent may still be showing. */
const HIT_LINE_HOLD_MS = 800;
/** Sky colour at the top of bg-moon, shown above the backgrounds (which are 224 px tall, maps 240). */
const SKY = '#000022';
/** After the last heart goes, the hero lies there this long (Level clock) before the stage restarts. */
const RETRY_BEAT_MS = 800;

const PARALLAX: [key: string, factor: number][] = [
  ['gv-bg-moon', 0.1],
  ['gv-bg-mountains', 0.3],
  ['gv-bg-graveyard', 0.6],
];

/** Something that can touch the hero and be told to back off (an enemy, the Groundskeeper). */
export type Toucher = { body: Phaser.Physics.Arcade.Body; waitFor(now: number, ms: number): void };

/** What a stage scene is started with. */
export type StageInit = {
  run?: RunState;
  stageIndex?: number;
  /** Without a run, a fresh one in this mode (debug/play checks). */
  mode?: ModeConfig;
  /** Debug/play-check override: load maps/<mapKey>.json instead of the stage's map. */
  mapKey?: string;
};

/**
 * One side-scroller room, shared by the Level and the Boss: map, hero, whip, enemies, hit-stop,
 * the Level clock, contact damage, the Overlay (hearts, bubbles, pause, touch HUD) and the
 * retry flow. Subclasses add what their room has (exit and lantern; the Groundskeeper) through
 * the protected hooks.
 */
export abstract class StageScene extends Phaser.Scene {
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

  protected controls?: PlatformInput;
  protected picker = new ApologyPicker(LINES);
  protected hitStop = this.newHitStop();
  protected hitLineAt = -Infinity;
  private jumpAt = -Infinity;
  private elapsed = 0;
  private sampler = new GuiltSampler();
  /** The stage camera's desaturation while guilt is at level 2. */
  private grey?: Phaser.Filters.ColorMatrix;
  /** For play checks: Full Conscience lines and moments (Level clock). */
  readonly conscienceLog: { kind: string; at: number; guilt: number; text?: string }[] = [];

  /** Sets up a fresh stage; subclasses call it from `init` and reset their own fields. */
  protected initStage(data: StageInit): void {
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
    this.sampler = new GuiltSampler();
    this.grey = undefined;
    this.conscienceLog.length = 0;
    this.retryAt = undefined;
    this.ending = false;
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

    this.addProps(level);
    const start = this.heroStart(level);
    const hero = new Hero(this, start.x, start.y);
    this.hero = hero;
    this.physics.add.collider(hero, ground);

    this.combat = new HeroCombat(this, hero);
    this.enemies = new LevelEnemies(this, ground, level.spawns, this.stageIndex);
    this.addCast(level, ground);

    const cam = this.cameras.main;
    cam.setBackgroundColor(SKY);
    cam.setZoom(ZOOM);
    cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.aimCamera(cam, hero, map);
    this.updateGrey(); // guilt carries over from the last stage or try

    this.controls = makePlatformInput(this, this.run.mode.guilt);
    this.controls.reset();
    this.events.on(Phaser.Scenes.Events.PAUSE, this.resetControls, this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.resetControls, this);

    const stage = STAGES[this.stageIndex];
    this.scene.launch('Overlay', {
      mode: this.run.mode, stageName: stage.name, host: this.scene.key, hearts: this.run.hearts,
      guilt: this.run.guilt.value,
    });
    // Bubbles project through this camera, so the Overlay must draw after this scene.
    this.scene.bringToTop('Overlay');
  }

  // ---- Hooks for the room on top (all optional) ----

  /** Static things on the map, built before the hero (exit gate, lantern). */
  protected addProps(_level: LevelData): void {}

  /** Where the hero stands at the start. */
  protected heroStart(level: LevelData): { x: number; y: number } {
    return level.heroStart;
  }

  /** Things built after the hero and the enemies (the Groundskeeper). */
  protected addCast(_level: LevelData, _ground: Phaser.Tilemaps.TilemapLayer): void {}

  /** The camera follows the hero by default. */
  protected aimCamera(cam: Phaser.Cameras.Scene2D.Camera, hero: Hero, _map: Phaser.Tilemaps.Tilemap): void {
    cam.startFollow(hero, true);
  }

  /** A bow the guilt meter accepted, offered to the room: the Boss accepts one per listening pause. */
  protected bossBow(): boolean {
    return false;
  }

  /** Is anything awake that could be fought? Guilt is only sampled then. */
  protected anyAwake(): boolean {
    return this.enemies?.list.some(e => e.awake && !e.health.dead) ?? false;
  }

  /** The whip's hits this frame. The Level strikes its enemies; the Boss adds the Groundskeeper. */
  protected strike(combat: HeroCombat, now: number): void {
    const struck = combat.newlyStruck(this.enemies!.list);
    if (struck.length > 0) this.landSwing(struck, now);
  }

  /** After the enemies' turn, before the hero's pose and the decision (the Groundskeeper flies). */
  protected afterEnemies(_now: number): void {}

  /** Once a frame before the decision, with the hero's body (the lantern). */
  protected checkZones(_body: Phaser.Physics.Arcade.Body): void {}

  /** Is the hero at the exit? Rooms without one never clear this way. */
  protected atExit(_body: Phaser.Physics.Arcade.Body): boolean {
    return false;
  }

  /** The stage is cleared through its exit. */
  protected onClear(): void {}

  /** What the scene restarts with on a retry. */
  protected retryData(): StageInit {
    return { run: this.run, stageIndex: this.stageIndex };
  }

  /** Every animated sprite a hit-stop freezes. */
  protected hitStopSprites(): Phaser.GameObjects.Sprite[] {
    return [this.hero!, ...this.enemies!.sprites()];
  }

  /** A hit-stop ended: flashing stops, put-down enemies burn up. */
  protected onHitStopEnd(): void {
    this.enemies?.endFlash();
    this.enemies?.finishPutDowns();
  }

  // ---- Shared ----

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
    if (controls.bowPressed()) this.bow(now); // drained every frame; Casual and a frozen hero ignore it
    this.sampleGuilt(now);

    const frozen = now < hero.frozenUntil;
    if (!frozen) {
      if (whip) this.swing(combat, now);
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
    this.strike(combat, now);
    if (this.hitStop.active) return; // frozen from this frame on (the paused swing must not fall back to idle)

    const { risen, touching } = enemies.update(hero, now);
    // Only skeletons announce themselves; ghosts and hell-cats wake silently.
    const climbed = risen.some(e => e.kind === 'skeleton');
    if (climbed && now - this.hitLineAt >= HIT_LINE_HOLD_MS) this.say('rise');
    if (touching) this.touched(touching, now);
    this.afterEnemies(now);

    if (!(now < hero.frozenUntil) && !hero.attacking) {
      if (!hero.onGround) hero.show('hero-jump');
      else hero.show(mx !== 0 ? 'hero-run' : 'hero-idle');
    }
    this.decide(now);
  }

  /** Once a frame, after combat: zones (the lantern), then retry, clear or carry on. */
  private decide(now: number): void {
    if (this.ending) return;
    const body = this.hero!.body;
    this.checkZones(body);
    switch (decideFrame(this.run.hearts, this.atExit(body))) {
      case 'retry':
        this.ending = true;
        this.retryAt = now + RETRY_BEAT_MS;
        break;
      case 'clear':
        this.ending = true;
        this.onClear();
        break;
      case 'continue':
        break;
    }
  }

  /** Same stage again with 3 hearts; the restart rebuilds every enemy asleep. */
  private retry(): void {
    this.retryAt = undefined;
    this.run.retry();
    bus.emit('retry', { stage: this.stageIndex });
    this.scene.restart(this.retryData());
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

  /** One swing's hits: one line for the lot, each survivor waits as long as that line, then hit-stop. */
  protected landSwing(struck: Enemy[], now: number): void {
    const results = this.enemies!.strike(struck, this.hero!.body.center.x);
    const stats = this.run.stats;
    let brokeDown = false;
    results.forEach((r, i) => {
      if (r === 'ignored') return;
      stats.enemiesHurt++;
      if (r === 'killed') stats.enemiesPutDown++;
      if (this.addGuilt(struck[i].enemyId, r === 'killed' ? 'kill' : 'hit')) brokeDown = true;
    });
    const kind = swingLineKind(results, struck.map(e => e.kind));
    if (!kind) return;
    const cat = kind === 'catKill'
      ? struck.find((e, i): e is HellCat => e instanceof HellCat && results[i] === 'killed')
      : undefined;
    const line = this.say(kind, cat ? text => nameCatLine(text, cat.catName) : undefined);
    this.hitLineAt = now;
    for (const e of struck) if (!e.health.dead) e.waitFor(now, waitMsFor(line));
    if (brokeDown) this.breakDown(now); // after the hit line, so the breakdown line is the one shown
    this.hitStop.start(this.hitStopSprites());
  }

  /**
   * Full Conscience: a hit (+4) or put-down (+10) on `enemyId` goes on the guilt meter; tells the
   * Overlay. Returns true if that broke him down (the caller calls `breakDown`). Casual: nothing.
   */
  protected addGuilt(enemyId: number, what: 'hit' | 'kill'): boolean {
    if (!this.run.mode.guilt) return false;
    const guilt = this.run.guilt;
    const { breakdown } = what === 'kill' ? guilt.onKill(enemyId) : guilt.onHit(enemyId);
    this.guiltChanged();
    return breakdown;
  }

  /** Guilt hit 100 (the meter is now 50): he kneels 2 s, says so, and loses a heart through any invulnerability. */
  protected breakDown(now: number): void {
    const hero = this.hero!;
    if (this.run.hearts <= 0) return;
    hero.breakDown(now, HERO.breakdownKneelMs);
    const text = this.say('breakdown');
    this.conscienceLog.push({ kind: 'breakdown', at: now, guilt: this.run.guilt.value, text });
    this.loseHeart(now);
  }

  /** Something that can hurt touches the hero. */
  protected touched(by: Toucher, now: number): void {
    const hero = this.hero!;
    if (this.run.hearts <= 0) return;
    const away = hero.body.center.x >= by.body.center.x ? 1 : -1;
    if (!hero.hurt(now, away * HERO.knockback)) return; // still invulnerable
    by.waitFor(now, WAIT.afterContactMs);
    this.say('hurt');
    this.loseHeart(now);
  }

  /** One heart gone (already shown as hurt); the last one sends him down and decide() schedules the retry. */
  private loseHeart(_now: number): void {
    this.setHearts(this.run.hearts - 1);
    if (this.run.hearts <= 0) {
      this.hero!.frozenUntil = Infinity; // decide() schedules the retry this frame
      bus.emit('heroDown', {});
    }
  }

  /** A whip press: the swing is judged at the guilt level; one that stops short says a `preApology` line. */
  private swing(combat: HeroCombat, now: number): void {
    const level = swingGuiltLevel(this.run.mode.guilt, this.run.guilt.level());
    const { started, stopShort } = combat.trySwing(now, level);
    if (!started || !stopShort) return;
    const text = this.say('preApology');
    this.conscienceLog.push({ kind: 'preApology', at: now, guilt: this.run.guilt.value, text });
  }

  /**
   * A bow press. Full Conscience only, and not while frozen. The guilt meter decides (1000 ms
   * cooldown on the Level clock); an accepted bow crouches him for 500 ms, counts as an apology and
   * says `apology` — or, if the room accepts it too (a listening pause), the boss's `bossAccept`.
   */
  private bow(now: number): void {
    const hero = this.hero!;
    const guilt = this.run.guilt;
    const outcome = decideBow(
      { guiltMode: this.run.mode.guilt, frozen: now < hero.frozenUntil },
      () => guilt.apologize(now),
      () => this.bossBow(),
    );
    if (!outcome.bowed) return;
    hero.bow(now, HERO.bowFreezeMs);
    this.run.stats.apologies++;
    // The boss speaks its own bossAccept line (bossBow); the hero only apologizes outside a pause.
    const text = outcome.line === 'apology' ? this.say('apology') : undefined;
    this.conscienceLog.push({ kind: outcome.line, at: now, guilt: guilt.value, text });
    bus.emit('apologized', { cleared: outcome.cleared });
    this.guiltChanged();
  }

  /** Every 1000 ms of Level clock, the guilt meter goes into the average if anything is awake (Full Conscience). */
  private sampleGuilt(now: number): void {
    const due = this.sampler.due(now);
    if (due === 0 || !this.run.mode.guilt) return;
    const awake = this.anyAwake();
    for (let i = 0; i < due; i++) this.run.stats.sampleGuilt(this.run.guilt.value, awake);
  }

  /** Tells the Overlay the meter moved and greys or un-greys the camera. */
  private guiltChanged(): void {
    const guilt = this.run.guilt;
    bus.emit('guiltChanged', { guilt: guilt.value, level: guilt.level() });
    this.updateGrey();
  }

  /** Level 2 guilt desaturates the stage camera by 40%; one filter at most, gone when the level drops. */
  private updateGrey(): void {
    const want = this.run.mode.guilt && wantsGrey(this.run.guilt.level());
    const filters = this.cameras.main.filters.internal;
    if (want && !this.grey) {
      this.grey = filters.addColorMatrix();
      this.grey.colorMatrix.saturate(-0.4);
    } else if (!want && this.grey) {
      filters.remove(this.grey);
      this.grey = undefined;
    }
  }

  /** Is the stage camera greyed now? (Play checks: also counts the camera's filters, to catch stacking.) */
  get greyed(): { on: boolean; filters: number } {
    return { on: this.grey !== undefined, filters: this.cameras.main.filters.internal.getActive().length };
  }

  /** The hero says a line (tiered by stage where the kind has tiers, `edit`ed if given) and returns it. */
  protected say(kind: LineKind, edit?: (text: string) => string): string {
    const picked = this.picker.pick(kind, 1, STAGES[this.stageIndex].tier);
    const text = edit ? edit(picked) : picked;
    this.overlay().say(text, this.heroHead);
    return text;
  }

  private newHitStop(): LevelHitStop {
    return new LevelHitStop(this, () => this.onHitStopEnd());
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
    // The camera manager shuts down first and takes the camera (and its filters) with it; if a camera
    // is still there, take the filter off it so a restart can't stack a second one.
    const cam = this.cameras.main as Phaser.Cameras.Scene2D.Camera | undefined;
    if (this.grey && cam) cam.filters.internal.remove(this.grey);
    this.grey = undefined;
    this.scene.stop('Overlay');
  }
}

/** A live point at the top-centre of the hero's body; reads (0, 0) before he exists. */
function headOf(scene: StageScene): Point {
  return {
    get x() { return scene.hero?.body.center.x ?? 0; },
    get y() { return scene.hero?.body.top ?? 0; },
  };
}
