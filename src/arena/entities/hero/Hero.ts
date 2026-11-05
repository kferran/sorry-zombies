import Phaser from 'phaser';
import { HERO } from './hero.stats';

export class Hero extends Phaser.Physics.Arcade.Sprite {
  hearts: number = HERO.hearts;
  frozenUntil = 0;
  private invulnUntil = 0;
  private lastShotAt = -Infinity;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'hero');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    // Kenney sprite is 49×43 and faces right; keep a round body around the torso.
    this.setCircle(15, 4, 6);
  }

  isFrozen(now: number): boolean {
    return now < this.frozenUntil;
  }

  canFire(now: number): boolean {
    if (this.isFrozen(now) || now - this.lastShotAt < HERO.fireIntervalMs) return false;
    this.lastShotAt = now;
    return true;
  }

  /** Returns false while invulnerable unless forced (guilt breakdown). */
  hurt(now: number, force = false): boolean {
    if (this.hearts <= 0) return false;
    if (!force && now < this.invulnUntil) return false;
    this.hearts -= 1;
    this.invulnUntil = now + HERO.invulnMs;
    this.scene.tweens.add({
      targets: this, alpha: 0.2, duration: 100, yoyo: true, repeat: Math.floor(HERO.invulnMs / 200) - 1,
      onComplete: () => this.setAlpha(1),
    });
    return true;
  }
}
