import Phaser from 'phaser';
import { ZOMBIE_STATS, type ZombieKind } from './zombie.stats';
import { ZombieHealth } from './ZombieHealth';

let nextId = 1;

export class Zombie extends Phaser.Physics.Arcade.Sprite {
  zombieId = 0;
  kind: ZombieKind = 'shambler';
  health = new ZombieHealth(ZOMBIE_STATS.shambler.hits);
  private speed = ZOMBIE_STATS.shambler.speed;
  private stunnedUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'shambler');
  }

  spawn(kind: ZombieKind, x: number, y: number, speedMultiplier: number): void {
    this.zombieId = nextId++;
    this.kind = kind;
    this.health = new ZombieHealth(ZOMBIE_STATS[kind].hits);
    this.speed = ZOMBIE_STATS[kind].speed * speedMultiplier;
    this.stunnedUntil = 0;
    this.setTexture(kind);
    this.enableBody(true, x, y, true, true);
    this.setCircle(kind === 'jogger' ? 12 : 14, 2, 2);
  }

  /** Pushes the zombie away from `from`; it stops chasing briefly. */
  knockBack(from: { x: number; y: number }, force: number, now: number): void {
    const angle = Phaser.Math.Angle.Between(from.x, from.y, this.x, this.y);
    this.scene.physics.velocityFromRotation(angle, force, (this.body as Phaser.Physics.Arcade.Body).velocity);
    this.stunnedUntil = now + 300;
  }

  chase(target: { x: number; y: number }, now: number): void {
    if (!this.active || now < this.stunnedUntil) return;
    this.scene.physics.moveToObject(this, target, this.speed);
  }

  retire(): void {
    this.disableBody(true, true);
  }
}
