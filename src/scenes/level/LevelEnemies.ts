import Phaser from 'phaser';
import { bus } from '../../shared/events';
import type { HitResult } from '../../entities/health/Health';
import type { Hero } from '../../entities/hero/Hero';
import type { Enemy } from '../../entities/enemy/Enemy';
import { Skeleton } from '../../entities/enemy/Skeleton';
import { ENEMY_KNOCKBACK } from '../../entities/enemy/enemy.stats';
import type { LevelData } from '../../features/levels/LevelLoader';
import { overlaps } from './HeroCombat';

/** What happened among the enemies this frame. */
export type EnemyFrame = { risen: Enemy[]; touching: Enemy | null };

/**
 * The level's enemies: spawning from the map, waking, thinking, contact with the hero, taking
 * hits (flash, knockback, events) and the put-down effect. All times are the Level clock.
 */
export class LevelEnemies {
  readonly list: Enemy[] = [];
  private effects: Phaser.GameObjects.Sprite[] = [];
  private flashing: Enemy[] = [];
  private dying: Enemy[] = [];
  private nextId = 1;

  constructor(
    private readonly scene: Phaser.Scene,
    ground: Phaser.Tilemaps.TilemapLayer,
    spawns: LevelData['spawns'],
    private readonly stage: number,
  ) {
    const probe = (x: number, y: number) => ground.hasTileAtWorldXY(x, y);
    for (const s of spawns) {
      if (s.type === 'skeleton') this.list.push(new Skeleton(scene, s.x, s.y, this.nextId++, probe));
      // Ghosts and hell-cats arrive in Task 9.
    }
    scene.physics.add.collider(this.list, ground);
  }

  /** Wakes the ones the hero has come near, runs the awake ones, and finds one that can hurt him. */
  update(hero: Hero, now: number): EnemyFrame {
    const at = { x: hero.body.center.x, y: hero.body.center.y };
    const risen: Enemy[] = [];
    let touching: Enemy | null = null;
    for (const e of this.list) {
      if (!e.awake) {
        if (Math.abs(at.x - e.x) > e.wakeDistance) continue;
        e.face(at.x > e.x ? 1 : -1);
        e.wake(now);
        risen.push(e);
        bus.emit('enemyRose', { enemyId: e.enemyId, kind: e.kind });
        continue;
      }
      e.think(at, now);
      if (!touching && e.canHurt(now) && overlaps(hero.body, e.body)) touching = e;
    }
    return { risen, touching };
  }

  /**
   * One swing's hits: each takes a hit, flashes white and is knocked away from `fromX`.
   * Put-down enemies stop at once and burn up when `finishPutDowns()` runs (after the hit-stop).
   */
  strike(hits: readonly Enemy[], fromX: number): HitResult[] {
    return hits.map(e => {
      const result = e.health.takeHit();
      if (result === 'ignored') return result;
      e.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
      this.flashing.push(e);
      if (result === 'killed') {
        e.body.enable = false;
        e.anims.stop();
        this.dying.push(e);
        bus.emit('enemyPutDown', { enemyId: e.enemyId, kind: e.kind, stage: this.stage });
      } else {
        e.knockBack(fromX, ENEMY_KNOCKBACK.x, ENEMY_KNOCKBACK.y);
        bus.emit('enemyHit', { enemyId: e.enemyId, kind: e.kind, stage: this.stage });
      }
      return result;
    });
  }

  endFlash(): void {
    for (const e of this.flashing) if (e.active) e.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
    this.flashing = [];
  }

  /** Plays the death effect where each put-down enemy stood and removes it. */
  finishPutDowns(): void {
    for (const e of this.dying) {
      const fx = this.scene.add.sprite(e.x, e.y, 'gv-atlas', 'enemy-death-1').setOrigin(0.5, 1).setDepth(6);
      this.effects.push(fx);
      fx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        this.effects = this.effects.filter(f => f !== fx);
        fx.destroy();
      });
      fx.play('enemy-death');
      this.list.splice(this.list.indexOf(e), 1);
      e.destroy();
    }
    this.dying = [];
  }

  /** Every animated sprite here (the hit-stop pauses them). */
  sprites(): Phaser.GameObjects.Sprite[] {
    return [...this.list, ...this.effects];
  }
}
