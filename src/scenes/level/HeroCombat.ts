import Phaser from 'phaser';
import { SwingRules } from '../../features/combat/SwingRules';
import { SwingHits } from '../../features/combat/SwingHits';
import type { Hero } from '../../entities/hero/Hero';
import { WHIP } from '../../entities/hero/hero.stats';
/** Something the whip can strike: an enemy or the Groundskeeper. `enemyId` must be unique in the room. */
export type Strikeable = { readonly enemyId: number; readonly hittable: boolean; body: Phaser.Physics.Arcade.Body | null };

/**
 * The hero's whip: swing timing, the hitbox (a 24×20 zone in front of him, live on attack frames 3–5)
 * and which enemies the current swing has reached (each at most once per swing).
 */
export class HeroCombat {
  /** The whip's reach; its body is enabled only on live frames. */
  readonly hitbox: Phaser.GameObjects.Zone;
  /** Number of swings started (play checks). */
  swingCount = 0;

  private rules = new SwingRules();
  private hits = new SwingHits();
  private stopShort = false;

  constructor(scene: Phaser.Scene, private readonly hero: Hero) {
    this.hitbox = scene.add.zone(0, 0, WHIP.width, WHIP.height);
    scene.physics.add.existing(this.hitbox);
    const body = this.body;
    body.setAllowGravity(false).setImmovable(true);
    body.moves = false;
    body.enable = false;
  }

  /** True while the swing is on a live frame (3–5). */
  get active(): boolean {
    return this.body.enable;
  }

  /** Starts a swing if the cooldown allows (`now` is the Level clock). */
  trySwing(now: number): boolean {
    const { started, stopShort } = this.rules.tryStart(now, 0); // guilt wiring: Task 11
    if (!started) return false;
    this.swingCount += 1;
    this.stopShort = stopShort;
    this.hits.begin();
    this.hero.play('hero-attack');
    return true;
  }

  /** Puts the hitbox in front of the hero and switches it on for live frames. Call every frame. */
  update(): void {
    const hero = this.hero;
    const body = this.body;
    let active = hero.attacking && this.rules.isActiveFrame(hero.animFrame);
    if (active && this.stopShort) {
      hero.anims.stop(); // hesitation: the swing dies before it lands
      active = false;
    }
    const hb = hero.body;
    const x = hero.facing > 0 ? hb.right + WHIP.width / 2 : hb.left - WHIP.width / 2;
    // reset() moves zone and body together; moving only the zone would let the body's stale
    // previous position drag the zone on the next physics step.
    body.reset(x, hb.top + WHIP.dy + WHIP.height / 2);
    body.enable = active;
  }

  /** Targets the live hitbox overlaps that this swing hasn't struck yet. Call right after `update()`. */
  newlyStruck<T extends Strikeable>(targets: readonly T[]): T[] {
    if (!this.active) return [];
    const w = this.body;
    return targets.filter(e => e.hittable && e.body?.enable && overlaps(w, e.body) && this.hits.admit(e.enemyId));
  }

  private get body(): Phaser.Physics.Arcade.Body {
    return this.hitbox.body as Phaser.Physics.Arcade.Body;
  }
}

type Edges = { left: number; right: number; top: number; bottom: number };

/** Do two boxes (Arcade bodies or plain edges) overlap? (Touching edges don't count.) */
export function overlaps(a: Edges, b: Edges): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}
