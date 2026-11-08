import Phaser from 'phaser';
import { bus } from '../shared/events';
import type { ModeConfig } from '../shared/modes';
import type { LevelData } from '../features/levels/LevelLoader';
import { BossBrain } from '../features/boss/BossBrain';
import { pickRaisePoints } from '../features/boss/raisePoints';
import type { LineKind } from '../features/apologies/ApologyPicker';
import type { Hero } from '../entities/hero/Hero';
import { Groundskeeper } from '../entities/enemy/Groundskeeper';
import { waitMsFor } from '../entities/enemy/enemy.stats';
import { overlaps, type HeroCombat } from './level/HeroCombat';
import type { RunState } from './run/RunState';
import type { RunOutcome } from './SummaryScene';
import { StageScene } from './StageScene';

export type BossInit = {
  run?: RunState;
  /** Without a run, a fresh one in this mode (debug/play checks). */
  mode?: ModeConfig;
};

/** The boss room is the run's fourth stage. */
const BOSS_STAGE = 3;
const TILE = 16;
/** A listening pause lasts this long (Level clock). */
const LISTEN_MS = 3000;
/** After the forgiving or the fading line, at least this long (Level clock) before the summary. */
const END_BEAT_MS = 2500;

type Point = { x: number; y: number };

/**
 * The Groundskeeper's room: the shared stage (hero, whip, hit-stop, skeletons, Overlay, retry) plus
 * the boss. One screen, camera locked, no exit. BossBrain decides phases, pauses and the ending; this
 * scene flies the boss, raises skeletons, speaks its lines and ends the run in the Summary.
 */
export class BossScene extends StageScene {
  brain = new BossBrain(false);
  boss?: Groundskeeper;
  /** Level-clock time of the next swoop. */
  nextSwoopAt = Infinity;
  /** Level-clock time the current listening pause ends. */
  listenUntil?: number;
  /** Level-clock time the run moves on to the Summary, once the ending has begun. */
  endAt?: number;
  outcome?: RunOutcome;
  /** For play checks: swoop starts (Level clock), skeletons raised per phase, the boss's lines. */
  readonly log = { swoops: [] as number[], raised: [] as { phase: number; count: number }[], lines: [] as { kind: LineKind; text: string; at: number }[] };
  private floor: Point[] = [];
  private done = false;

  constructor() { super('Boss'); }

  init(data: BossInit): void {
    // LevelCard starts stage 3 before the boss; a run handed in at another stage (play checks) starts it here.
    if (data.run && data.run.stageIndex !== BOSS_STAGE) data.run.startStage(BOSS_STAGE);
    this.initStage({ run: data.run, mode: data.mode, stageIndex: BOSS_STAGE });
    this.brain = new BossBrain(this.run.mode.guilt);
    this.boss = undefined;
    this.nextSwoopAt = Infinity;
    this.listenUntil = undefined;
    this.endAt = undefined;
    this.outcome = undefined;
    this.log.swoops = [];
    this.log.raised = [];
    this.log.lines = [];
    this.floor = [];
    this.done = false;
  }

  protected override addCast(level: LevelData, ground: Phaser.Tilemaps.TilemapLayer): void {
    this.floor = floorPoints(ground, level);
    const x = level.bossAt?.x ?? level.widthPx * 0.75;
    this.boss = new Groundskeeper(this, x, { left: 0, right: level.widthPx });
    this.startPhase(this.now);
  }

  /** One screen: the camera stays put. */
  protected override aimCamera(cam: Phaser.Cameras.Scene2D.Camera, _hero: Hero, map: Phaser.Tilemaps.Tilemap): void {
    cam.centerOn(map.widthInPixels / 2, map.heightInPixels / 2);
  }

  /** Full Conscience: a bow the guilt meter accepted, while it listens, is accepted once per pause. */
  protected override bossBow(): boolean {
    if (!this.brain.bow()) return false;
    this.sayBoss('bossAccept');
    bus.emit('bossAccepted', { pause: this.brain.pause as 1 | 2 | 3 });
    return true;
  }

  /** The skeletons, or the Groundskeeper while it is fighting (a phase). */
  protected override anyAwake(): boolean {
    return super.anyAwake() || (this.boss !== undefined && this.brain.state === 'phase');
  }

  /** The skeletons as in a level, then the Groundskeeper. */
  protected override strike(combat: HeroCombat, now: number): void {
    super.strike(combat, now);
    const boss = this.boss;
    if (boss && combat.newlyStruck([boss]).length > 0) this.hitBoss(boss, now);
  }

  protected override afterEnemies(now: number): void {
    const boss = this.boss;
    const hero = this.hero;
    if (!boss || !hero) return;
    if (this.listenUntil !== undefined && now >= this.listenUntil && this.retryAt === undefined) this.endListening(now);
    if (this.brain.state === 'phase' && now >= this.nextSwoopAt && boss.flight.phaseAt(now) === 'patrol') {
      boss.swoop(now, { x: hero.body.center.x, y: hero.body.bottom }); // at his feet
      this.log.swoops.push(now);
      this.nextSwoopAt = now + this.brain.swoopIntervalMs();
    }
    boss.fly(now, hero.body.center.x);
    if (boss.canHurt && overlaps(hero.body, boss.body)) this.touched(boss, now);
    if (this.endAt !== undefined && now >= this.endAt) this.finish();
  }

  protected override hitStopSprites(): Phaser.GameObjects.Sprite[] {
    const sprites = super.hitStopSprites();
    return this.boss ? [...sprites, this.boss] : sprites;
  }

  protected override onHitStopEnd(): void {
    super.onHitStopEnd();
    this.boss?.endFlash();
    // A freeze started earlier in the same frame (a skeleton struck by the same swing) held ghost-float
    // and has just resumed it: put the arms back.
    if (this.boss?.isListening) this.boss.holdPose();
  }

  /** Counted: flash, hit-stop and an apology from the hero (the boss says nothing). Ignored while it listens: it's disappointed. */
  private hitBoss(boss: Groundskeeper, now: number): void {
    if (this.brain.hit() === 'ignored') {
      if (this.brain.state === 'listening') this.sayBoss('bossDisappointed');
      return;
    }
    this.run.stats.enemiesHurt++; // whip hits on the Groundskeeper count as enemies hurt (not put to rest)
    const brokeDown = this.addGuilt(boss.enemyId, 'hit'); // a hit, never a put-down: it isn't put to rest
    boss.flash();
    if (this.hitLineAt !== now) { // one line per swing: a skeleton struck by the same swing already got one
      this.say('hit');
      this.hitLineAt = now;
    }
    if (brokeDown) this.breakDown(now);
    // Fold its arms before the freeze, so the hit-stop doesn't hold (and later resume) ghost-float.
    if (this.brain.state === 'listening') this.startListening(boss, now);
    else boss.recoil(now);
    this.hitStop.start(this.hitStopSprites());
  }

  /** The 4th hit of a phase: it stops, folds its arms and judges; the skeletons stand still meanwhile. */
  private startListening(boss: Groundskeeper, now: number): void {
    boss.listen();
    this.listenUntil = now + LISTEN_MS;
    for (const e of this.enemies!.list) e.waitFor(now, LISTEN_MS);
    bus.emit('bossListening', { pause: this.brain.pause as 1 | 2 | 3 });
    this.sayBoss('bossJudge');
  }

  private endListening(now: number): void {
    const boss = this.boss!;
    this.listenUntil = undefined;
    switch (this.brain.endPause()) {
      case 'phase':
        boss.unlisten(now);
        this.startPhase(now);
        break;
      case 'forgiven': {
        boss.forgive();
        const line = this.sayBoss('bossForgive');
        this.run.stats.forgiven = true;
        bus.emit('bossForgave', {});
        this.beginEnd(now, 'forgiven', line);
        break;
      }
      case 'defeated': {
        const line = this.sayBoss('bossDefeat');
        boss.fadeOut();
        this.beginEnd(now, 'defeated', line);
        break;
      }
      case 'listening':
        break;
    }
  }

  /** Swoops on the phase's beat; raises its skeletons at random floor points clear of the hero. */
  private startPhase(now: number): void {
    const phase = this.brain.phase;
    this.nextSwoopAt = now + this.brain.swoopIntervalMs();
    const heroX = this.hero!.body.center.x;
    const points = pickRaisePoints(this.floor, heroX, this.brain.raisesForPhase(phase), Math.random);
    for (const p of points) this.enemies!.raiseSkeleton(p.x, p.y, heroX, now);
    this.log.raised.push({ phase, count: points.length });
    if (points.length > 0) this.say('rise');
  }

  /** The fight is over: nothing can hurt him any more, and after the line has been read, the Summary. */
  private beginEnd(now: number, outcome: RunOutcome, line: string): void {
    this.ending = true; // no retry from here on
    this.outcome = outcome;
    for (const e of this.enemies!.list) e.waitUntil = Infinity;
    this.endAt = now + Math.max(END_BEAT_MS, waitMsFor(line));
  }

  /** Once only, however many frames or taps reach it. */
  private finish(): void {
    if (this.done || !this.outcome) return;
    this.done = true;
    this.run.clearStage();
    bus.emit('stageCleared', { stage: BOSS_STAGE });
    this.scene.start('Summary', { run: this.run, outcome: this.outcome });
  }

  /** The Groundskeeper says a line in its own bubble, above its head. */
  private sayBoss(kind: LineKind): string {
    const text = this.picker.pick(kind);
    if (this.boss) this.overlay().say(text, this.boss.head, 'boss');
    this.log.lines.push({ kind, text, at: this.now });
    return text;
  }
}

/** Surface points on the room's floor (its lowest top surface), one per tile column, edges left out. */
function floorPoints(ground: Phaser.Tilemaps.TilemapLayer, level: LevelData): Point[] {
  const cols = Math.round(level.widthPx / TILE);
  const rows = Math.round(level.heightPx / TILE);
  const tops: { col: number; row: number }[] = [];
  for (let col = 1; col < cols - 1; col++) {
    for (let row = 0; row < rows; row++) {
      if (ground.hasTileAt(col, row)) { tops.push({ col, row }); break; }
    }
  }
  const floorRow = Math.max(...tops.map(t => t.row));
  // Skeletons can't climb: on a dais they'd pace there for good, so they only rise from the floor.
  return tops.filter(t => t.row === floorRow).map(t => ({ x: t.col * TILE + TILE / 2, y: t.row * TILE }));
}
