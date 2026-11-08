import Phaser from 'phaser';
import { HERO, HERO_BODY } from './hero.stats';

export type HeroAnim = 'hero-idle' | 'hero-run' | 'hero-jump' | 'hero-attack' | 'hero-crouch' | 'hero-hurt';

/** How long a knocked-back hero ignores the controls. */
const HURT_FREEZE_MS = 300;

/** The side-scroller hero. Positioned by his feet: `y` is the bottom of his body. */
export class Hero extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  /** Controls are ignored until this Level-clock time (`LevelScene.now`): knockback, bow, kneel. */
  frozenUntil = 0;
  facing: 1 | -1 = 1;
  /** Level-clock time until which hits are ignored. */
  invulnerableUntil = 0;

  constructor(scene: Phaser.Scene, x: number, feetY: number) {
    super(scene, x, feetY, 'gv-atlas', 'hero-idle-1');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(HERO_BODY.originX, 1);
    this.body.setSize(HERO_BODY.width, HERO_BODY.height, false).setOffset(HERO_BODY.offsetX, HERO_BODY.offsetY);
    this.setCollideWorldBounds(true);
    this.setDepth(10);
    this.play('hero-idle');
  }

  get attacking(): boolean {
    return this.anims.currentAnim?.key === 'hero-attack' && this.anims.isPlaying;
  }

  get onGround(): boolean {
    return this.body.blocked.down;
  }

  /** 1-based frame of the current animation, read from the atlas frame name ("hero-attack-3" → 3). */
  get animFrame(): number {
    const m = /-(\d+)$/.exec(String(this.frame.name));
    return m ? Number(m[1]) : 1;
  }

  face(dir: 1 | -1): void {
    this.facing = dir;
    // The origin sits on the character's centre and the body is symmetric about it, so no offset change.
    this.setFlipX(dir < 0);
  }

  /** Plays an animation unless it is already the current one (a finished jump holds its last frame). */
  show(anim: HeroAnim): void {
    if (this.anims.currentAnim?.key !== anim) this.play(anim);
  }

  /**
   * Takes a hit unless invulnerable (`now` is the Level clock, `LevelScene.now`); `ignoreInvulnerable`
   * takes it anyway (a breakdown). `force` is the horizontal knockback (signed); default pushes him
   * backwards. A longer freeze already under way (a bow, a kneel) is kept.
   */
  hurt(now: number, force?: number, ignoreInvulnerable = false): boolean {
    if (!ignoreInvulnerable && now < this.invulnerableUntil) return false;
    this.invulnerableUntil = now + HERO.invulnMs;
    this.frozenUntil = Math.max(this.frozenUntil, now + HURT_FREEZE_MS);
    this.setVelocity(force ?? -this.facing * HERO.knockback, -HERO.knockback);
    this.play('hero-hurt');
    this.scene.tweens.add({
      targets: this, alpha: 0.3, duration: 100, yoyo: true, repeat: Math.floor(HERO.invulnMs / 200) - 1,
      onComplete: () => this.setAlpha(1),
    });
    return true;
  }

  /**
   * Guilt hits 100: he drops to his knees where he stands for `kneelMs` and loses a heart whatever
   * his invulnerability says (the scene does the heart). `hero-crouch` is the kneel: `hero-hurt` is a recoil.
   */
  breakDown(now: number, kneelMs: number): void {
    this.hurt(now, 0, true);
    this.setVelocity(0, Math.max(0, this.body.velocity.y)); // no hop, no slide; falls if in the air
    this.frozenUntil = Math.max(this.frozenUntil, now + kneelMs);
    this.play('hero-crouch');
  }

  /** A bow: the crouch pose, controls ignored for `freezeMs`. */
  bow(now: number, freezeMs: number): void {
    this.setVelocityX(0);
    this.frozenUntil = Math.max(this.frozenUntil, now + freezeMs);
    this.play('hero-crouch');
  }
}
