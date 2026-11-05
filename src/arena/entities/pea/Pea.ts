import Phaser from 'phaser';
import { PEA_SPEED } from '../hero/hero.stats';

export class Pea extends Phaser.Physics.Arcade.Image {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'pea');
  }

  /** Fires along `angle` (radians) from `from`. */
  fire(from: { x: number; y: number }, angle: number): void {
    this.enableBody(true, from.x, from.y, true, true);
    this.scene.physics.velocityFromRotation(angle, PEA_SPEED, (this.body as Phaser.Physics.Arcade.Body).velocity);
  }

  retire(): void {
    this.disableBody(true, true);
  }

  /** Images aren't on the update list, so the scene calls this each frame. */
  retireIfOffscreen(): void {
    if (!this.active) return;
    const { width, height } = this.scene.scale;
    if (this.x < -10 || this.y < -10 || this.x > width + 10 || this.y > height + 10) this.retire();
  }
}
