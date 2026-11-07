import Phaser from 'phaser';
import { Enemy, type Vec } from './Enemy';
import { ENEMY, GHOST_BODY } from './enemy.stats';
import { bobOffset, driftVelocity, fadeInAlpha, ghostTarget } from './ghostMotion';

/** It turns to face the hero only once he is this far to the other side (no flicker overhead). */
const TURN_PX = 3;

/**
 * Asleep: fully faded (alpha 0) and harmless. Wakes into a 400 ms fade-in (harmless meanwhile),
 * then drifts at 25 px/s to a point beside the hero at whip height (`ghostTarget`) through graves and walls (no gravity, no ground
 * collision), bobbing ±3 px at 1.5 Hz. The bob moves only the drawing: the display origin and
 * the body offset shift together, so the body stays where physics put it. Faces left in the atlas.
 */
export class Ghost extends Enemy {
  readonly wakeDistance = ENEMY.ghost.wake;
  private wokeAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, enemyId: number) {
    super(scene, x, y, 'ghost-halo-1', enemyId, 'ghost', ENEMY.ghost.hits);
    this.body.setSize(GHOST_BODY.width, GHOST_BODY.height, false);
    this.body.setAllowGravity(false);
    this.setBob(0);
    this.setCollideWorldBounds(true);
    this.setDepth(7); // floats in front of graves and skeletons
    this.setAlpha(0);
  }

  /** Still fading in: harmless. */
  fading(now: number): boolean {
    return this.awake && now - this.wokeAt < GHOST_BODY.fadeInMs;
  }

  override canHurt(now: number): boolean {
    return super.canHurt(now) && !this.fading(now);
  }

  wake(now: number): void {
    if (this.awake) return;
    this.awake = true;
    this.wokeAt = now;
    this.play('ghost-float');
  }

  think(hero: Vec, now: number): void {
    if (!this.awake || this.health.dead) return;
    const t = now - this.wokeAt;
    this.setAlpha(fadeInAlpha(t, GHOST_BODY.fadeInMs));
    this.setBob(bobOffset(t));
    if (now < this.waitUntil) { this.setVelocity(0, 0); return; } // listening
    const toHero = hero.x - this.body.center.x;
    if (Math.abs(toHero) > TURN_PX) this.face(toHero > 0 ? 1 : -1);
    // Heads for whip height beside him (it faces him, so `-facing` is the side it's on).
    const target = ghostTarget(hero, this.body.center.x, this.facing === 1 ? -1 : 1);
    const { vx, vy } = driftVelocity(target.x - this.body.center.x, target.y - this.body.center.y, ENEMY.ghost.speed);
    this.setVelocity(vx, vy);
  }

  /**
   * Draws it `px` lower (positive) or higher, leaving the body where it is. Sets the normalised
   * origin (not the display origin) so animation frame changes, which recompute the display origin
   * from it, keep the bob.
   */
  private setBob(px: number): void {
    this.setOrigin(GHOST_BODY.originX, GHOST_BODY.originY - px / this.height);
    this.body.setOffset(GHOST_BODY.offsetX, GHOST_BODY.offsetY - px);
  }
}
