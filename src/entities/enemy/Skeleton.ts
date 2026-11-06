import Phaser from 'phaser';
import { Enemy, type Vec } from './Enemy';
import { ENEMY, SKELETON_BODY } from './enemy.stats';

/** Is there solid ground at this world point? (The Level's `ground` layer.) */
export type GroundProbe = (worldX: number, worldY: number) => boolean;

const TILE = 16;
/** After turning at a ledge it keeps walking away this long before heading for the hero again. */
const TURN_MS = 1200;
/** Closer than this (horizontally) to the hero, it stops rather than jitter. */
const NEAR_PX = 4;

/**
 * Asleep: invisible and bodiless underground. Wakes into the 6-frame rise (can't move or hurt), then
 * shambles toward the hero at 30 px/s, turning back at ledge edges and at graves or walls in its way. Faces left in the atlas.
 */
export class Skeleton extends Enemy {
  readonly wakeDistance = ENEMY.skeleton.wake;
  private riseUntil = 0;
  private turnedUntil = 0;

  constructor(scene: Phaser.Scene, x: number, feetY: number, enemyId: number, private readonly ground: GroundProbe) {
    super(scene, x, feetY, 'skeleton-rise-clothed-1', enemyId, 'skeleton', ENEMY.skeleton.hits);
    this.setOrigin(SKELETON_BODY.originX, 1);
    this.body.setSize(SKELETON_BODY.width, SKELETON_BODY.height, false)
      .setOffset(SKELETON_BODY.offsetX, SKELETON_BODY.offsetY);
    this.setCollideWorldBounds(true);
    this.setDepth(5);
    this.setVisible(false);
    this.body.enable = false;
  }

  get rising(): boolean {
    return this.awake && this.riseUntil > 0;
  }

  override canHurt(now: number): boolean {
    return super.canHurt(now) && !this.rising;
  }

  /** Climbs out where it lies (`face` the hero first). */
  wake(now: number): void {
    if (this.awake) return;
    this.awake = true;
    this.riseUntil = now + SKELETON_BODY.riseMs;
    this.setVisible(true);
    this.body.enable = true;
    this.body.reset(this.x, this.y);
    this.play('skeleton-rise');
  }

  think(hero: Vec, now: number): void {
    if (!this.awake || this.health.dead) return;
    const grounded = this.body.blocked.down;
    // Mid-knockback (still rising from the hop or in the air): let it fly.
    if (!grounded || this.body.velocity.y < 0) return;

    if (this.riseUntil > 0) {
      if (now < this.riseUntil) { this.setVelocityX(0); return; }
      this.riseUntil = 0;
    }
    if (now < this.waitUntil) {
      this.setVelocityX(0);
      this.anims.stop(); // holds still, listening
      return;
    }

    const dx = hero.x - this.body.center.x;
    if (now >= this.turnedUntil) {
      if (Math.abs(dx) < NEAR_PX) { this.standStill(); return; }
      this.face(dx > 0 ? 1 : -1);
    }
    if (!this.canGo(this.facing)) {
      this.face(this.facing === 1 ? -1 : 1);
      this.turnedUntil = now + TURN_MS;
      if (!this.canGo(this.facing)) { this.standStill(); return; } // a one-tile perch, or boxed in
    }
    this.setVelocityX(this.facing * ENEMY.skeleton.speed);
    if (this.anims.currentAnim?.key !== 'skeleton-walk' || !this.anims.isPlaying) this.play('skeleton-walk');
  }

  /** Ground ahead and nothing in the way (a grave or wall blocked the last step in that direction). */
  private canGo(dir: 1 | -1): boolean {
    const blocked = dir === 1 ? this.body.blocked.right : this.body.blocked.left;
    return !blocked && this.groundAhead(dir);
  }

  /** The ground tile one tile ahead of its centre, one tile below its feet. */
  private groundAhead(dir: 1 | -1): boolean {
    return this.ground(this.body.center.x + dir * TILE, this.body.bottom + TILE / 2);
  }

  private standStill(): void {
    this.setVelocityX(0);
    if (this.anims.isPlaying) this.anims.stop();
  }
}
