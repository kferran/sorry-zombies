import Phaser from 'phaser';
import { Enemy, type Vec } from './Enemy';
import { CAT_BODY, CAT_POUNCE, ENEMY } from './enemy.stats';
import { PounceBrain } from './PounceBrain';
import { catNameFor } from './catNames';

/**
 * Asleep: curled and dim (first frame, alpha 0.6) and harmless. Wakes within 120 px, uncurls, then
 * pounces in an arc toward the hero (vx ±110, vy −180), lands, rests 900 ms and pounces again.
 * It can hurt whenever awake except while it waits out an apology. Faces left in the atlas.
 */
export class HellCat extends Enemy {
  readonly wakeDistance = ENEMY.cat.wake;
  /** Its name tag: from the map, or picked from the list. */
  readonly catName: string;
  private brain = new PounceBrain(CAT_POUNCE);

  constructor(scene: Phaser.Scene, x: number, feetY: number, enemyId: number, name?: string) {
    super(scene, x, feetY, 'hell-gato-1', enemyId, 'cat', ENEMY.cat.hits);
    this.catName = catNameFor(enemyId, name);
    this.setOrigin(CAT_BODY.originX, 1);
    this.body.setSize(CAT_BODY.width, CAT_BODY.height, false).setOffset(CAT_BODY.offsetX, CAT_BODY.offsetY);
    this.setCollideWorldBounds(true);
    this.setDepth(5);
    this.setAlpha(CAT_BODY.asleepAlpha);
  }

  /** Mid-pounce (play checks). */
  get pouncing(): boolean {
    return this.brain.phase === 'flying';
  }

  wake(now: number): void {
    if (this.awake) return;
    this.awake = true;
    this.setAlpha(1);
    this.brain.wake(now);
  }

  think(hero: Vec, now: number): void {
    if (!this.awake || this.health.dead) return;
    const cmd = this.brain.tick({
      now,
      grounded: this.body.blocked.down,
      dx: hero.x - this.body.center.x,
      listening: now < this.waitUntil,
    });
    switch (cmd.order) {
      case 'leap':
        this.face(cmd.vx > 0 ? 1 : -1);
        this.setVelocity(cmd.vx, cmd.vy);
        this.play('cat-pounce');
        break;
      case 'stop':
        this.setVelocityX(0);
        if (this.anims.isPlaying) this.anims.stop();
        if (this.frame.name !== 'hell-gato-1') this.setFrame('hell-gato-1');
        break;
      case 'none':
        break;
    }
  }
}
