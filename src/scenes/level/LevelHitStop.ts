import Phaser from 'phaser';
import { HitStop, mergeHeld } from '../../features/combat/HitStop';

/**
 * The 90 ms freeze after a hit: arcade physics, the given sprites' animations and the scene's tweens
 * stop, and the camera shakes. The scene also skips its update (so the Level clock stops) for every
 * frame `tick()` reports frozen. The countdown runs on real frame time.
 */
export class LevelHitStop {
  readonly countdown = new HitStop();
  private paused: Phaser.GameObjects.Sprite[] = [];

  constructor(private readonly scene: Phaser.Scene, private readonly onEnd: () => void) {}

  get active(): boolean {
    return this.countdown.active;
  }

  /**
   * Freezes for 90 ms. A start while already frozen extends the freeze to the longer of the two and
   * holds the new sprites too (the ones held by the first start stay held and are resumed at the end).
   */
  start(sprites: Phaser.GameObjects.Sprite[]): void {
    const already = this.countdown.active;
    this.countdown.start();
    this.scene.physics.pause();
    this.scene.tweens.pauseAll();
    const held = mergeHeld(this.paused, sprites, s => s.anims.isPlaying);
    for (const s of held.slice(this.paused.length)) s.anims.pause();
    this.paused = held;
    if (!already) this.scene.cameras.main.shake(80, 0.004);
  }

  /**
   * Spends a frame's delta. True means the frame is frozen and gameplay skips it, including the
   * frame the freeze ends on: physics already skipped that frame's step, so the clock skips it too.
   */
  tick(delta: number): boolean {
    const state = this.countdown.tick(delta);
    if (state === 'ended') this.end();
    return state !== 'idle';
  }

  private end(): void {
    this.scene.physics.resume();
    this.scene.tweens.resumeAll();
    for (const s of this.paused) if (s.active) s.anims.resume();
    this.paused = [];
    this.onEnd();
  }
}
