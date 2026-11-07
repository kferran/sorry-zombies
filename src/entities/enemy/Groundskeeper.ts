import Phaser from 'phaser';
import type { Point as Vec } from '../../shared/projection';
import { GHOST_BODY } from './enemy.stats';
import { GroundskeeperFlight } from './groundskeeperFlight';

export const GROUNDSKEEPER = {
  scale: 3,
  tint: 0xb8c4ff,
  /** Arms folded, listening: a little dimmer and greyer. */
  listeningTint: 0x8d96c8,
  /** Whip-strike id: enemies count up from 1, so 0 is free. */
  enemyId: 0,
  fadeOutMs: 1500,
} as const;

/**
 * The boss: the pack's ghost at 3× (body 54×108), tinted. No gravity and no ground collision; it
 * flies by GroundskeeperFlight (patrol, swoops, recoil, hold) and the sprite follows. Positioned
 * by its body centre. Times are the Level clock.
 */
export class Groundskeeper extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  readonly enemyId = GROUNDSKEEPER.enemyId;
  readonly flight: GroundskeeperFlight;
  private gone = false;
  private listening = false;

  constructor(scene: Phaser.Scene, x: number, room: { left: number; right: number }) {
    super(scene, x, 0, 'gv-atlas', 'ghost-halo-1');
    this.flight = new GroundskeeperFlight(x, room);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setScale(GROUNDSKEEPER.scale);
    this.setOrigin(GHOST_BODY.originX, GHOST_BODY.originY);
    this.body.setSize(GHOST_BODY.width, GHOST_BODY.height, false).setOffset(GHOST_BODY.offsetX, GHOST_BODY.offsetY);
    this.body.setAllowGravity(false);
    this.body.moves = false; // the flight places it; the body follows
    this.setCollideWorldBounds(true);
    this.setTint(GROUNDSKEEPER.tint);
    this.setDepth(8); // in front of skeletons and ghosts, behind the hero
    this.play('ghost-float');
    this.place();
  }

  /** The whip can reach it whenever its body is enabled (it is low only in and just after a swoop, or listening). */
  get hittable(): boolean {
    return !this.gone;
  }

  /** Contact hurts only in a swoop. */
  get canHurt(): boolean {
    return !this.gone && this.flight.swooping;
  }

  /** A live point at the top of its body, for its speech bubble. */
  readonly head: Vec = topOf(this);

  /** One frame: fly, then face the hero. */
  fly(now: number, heroX: number): void {
    if (this.gone) return;
    this.flight.update(now);
    this.place();
    if (!this.listening) this.setFlipX(heroX > this.body.center.x); // the atlas ghost faces left
  }

  /** Dives at the hero's feet (see GroundskeeperFlight.startSwoop). */
  swoop(now: number, feet: Vec): void {
    if (!this.gone && !this.listening) this.flight.startSwoop(now, feet);
  }

  /** Struck mid-swoop: climbs away. */
  recoil(now: number): void {
    this.flight.recoil(now);
  }

  /** Touched the hero (`StageScene.touched`): climbs away rather than hit him again. */
  waitFor(now: number, _ms: number): void {
    this.flight.recoil(now);
  }

  /** Stops where it is with its arms folded: animation held on a frame, a slightly different tint. */
  listen(): void {
    this.listening = true;
    this.flight.hold();
    this.anims.stop();
    this.setFrame('ghost-halo-1');
    this.setTint(GROUNDSKEEPER.listeningTint);
  }

  /** Done listening: back up to its patrol. */
  unlisten(now: number): void {
    this.listening = false;
    this.flight.release(now);
    this.setTint(GROUNDSKEEPER.tint);
    this.play('ghost-float');
  }

  get isListening(): boolean {
    return this.listening;
  }

  flash(): void {
    this.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
  }

  endFlash(): void {
    if (!this.active) return;
    this.setTintMode(Phaser.TintModes.MULTIPLY);
    this.setTint(this.listening ? GROUNDSKEEPER.listeningTint : GROUNDSKEEPER.tint);
  }

  /** Defeated: harmless and unhittable, fades out where it is. */
  fadeOut(): void {
    this.gone = true;
    this.body.enable = false;
    this.scene.tweens.add({ targets: this, alpha: 0, duration: GROUNDSKEEPER.fadeOutMs });
  }

  /** Forgiving: unfolds its arms and floats where it is, no longer swooping or taking hits. */
  forgive(): void {
    this.gone = true;
    this.listening = false;
    this.setTint(GROUNDSKEEPER.tint);
    this.play('ghost-float');
  }

  private place(): void {
    this.setPosition(this.flight.x, this.flight.y);
    this.body.updateFromGameObject();
  }
}

/** A live point at the top-centre of a sprite's body. */
function topOf(sprite: { body: Phaser.Physics.Arcade.Body }): Vec {
  return {
    get x() { return sprite.body.center.x; },
    get y() { return sprite.body.top; },
  };
}
