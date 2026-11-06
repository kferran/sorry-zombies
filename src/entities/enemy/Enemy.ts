import Phaser from 'phaser';
import { Health } from '../health/Health';
import type { SpawnType } from '../../shared/spawnType';
import type { Point as Vec } from '../../shared/projection';

export type { Vec };

/**
 * A side-scroller enemy, positioned by its feet. All times (`now`, `waitUntil`) are the Level clock
 * (`LevelScene.now`), which stops during pause and hit-stop.
 */
export abstract class Enemy extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  readonly enemyId: number;
  readonly kind: SpawnType;
  readonly health: Health;
  awake = false;
  /** The enemy stands still (and can't hurt) until this time: it's listening to an apology. */
  waitUntil = 0;
  facing: 1 | -1 = -1;

  constructor(scene: Phaser.Scene, x: number, y: number, frame: string, enemyId: number, kind: SpawnType, hits: number) {
    super(scene, x, y, 'gv-atlas', frame);
    this.enemyId = enemyId;
    this.kind = kind;
    this.health = new Health(hits);
    scene.add.existing(this);
    scene.physics.add.existing(this);
  }

  /** Wakes when the hero comes within this many px horizontally. */
  abstract readonly wakeDistance: number;

  abstract wake(now: number): void;

  /** One frame of behaviour once awake. */
  abstract think(hero: Vec, now: number): void;

  /** Can it be struck by the whip right now? */
  get hittable(): boolean {
    return this.awake && !this.health.dead;
  }

  canHurt(now: number): boolean {
    return this.awake && now >= this.waitUntil && !this.health.dead;
  }

  /** The pack's enemies face left, so facing right flips them. */
  face(dir: 1 | -1): void {
    this.facing = dir;
    this.setFlipX(dir > 0);
  }

  /** Makes it wait (never shortens a longer wait already running). */
  waitFor(now: number, ms: number): void {
    this.waitUntil = Math.max(this.waitUntil, now + ms);
  }

  /** Swatted: pushed away from `fromX` with a small hop. */
  knockBack(fromX: number, vx: number, vy: number): void {
    const dir = this.body.center.x >= fromX ? 1 : -1;
    this.setVelocity(dir * vx, -vy);
  }
}
