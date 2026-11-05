import Phaser from 'phaser';
import type { ModeConfig } from '../shared/modes';
import { MODES } from '../shared/modes';
import { bus } from '../shared/events';
import type { InputSource } from '../shared/input/InputSource';
import { KeyboardMouseInput } from '../shared/input/KeyboardMouseInput';
import { Hero } from '../entities/hero/Hero';
import { HERO } from '../entities/hero/hero.stats';
import { Pea } from '../entities/pea/Pea';
import { Zombie } from '../entities/zombie/Zombie';
import type { ZombieKind } from '../entities/zombie/zombie.stats';

export class GameScene extends Phaser.Scene {
  mode: ModeConfig = MODES.casual;
  hero!: Hero;
  zombies!: Phaser.Physics.Arcade.Group;
  peas!: Phaser.Physics.Arcade.Group;
  private controls!: InputSource;
  wave = 1;

  constructor() { super('Game'); }

  init(data: { mode?: ModeConfig }): void {
    this.mode = data.mode ?? MODES.casual;
    this.wave = 1;
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width - 8, height - 8).setStrokeStyle(4, 0x666666);
    this.physics.world.setBounds(0, 0, width, height);

    this.hero = new Hero(this, width / 2, height / 2);
    this.zombies = this.physics.add.group({ classType: Zombie, maxSize: 60 });
    this.peas = this.physics.add.group({ classType: Pea, maxSize: 40, runChildUpdate: false });
    this.controls = new KeyboardMouseInput(this);

    this.physics.add.overlap(this.peas, this.zombies, (p, z) => this.onPeaHitsZombie(p as Pea, z as Zombie));
    this.physics.add.overlap(this.hero, this.zombies, (_h, z) => this.onZombieTouchesHero(z as Zombie));

    this.scene.launch('Hud');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.controls.destroy());

    // Temporary spawner; Task 7 replaces it with the WaveDirector.
    this.time.addEvent({ delay: 2000, loop: true, callback: () => this.spawnZombie('shambler', 1) });
  }

  spawnZombie(kind: ZombieKind, speedMultiplier: number): Zombie | null {
    const z = this.zombies.get(0, 0) as Zombie | null;
    if (!z) return null;
    const { x, y } = this.randomEdgePoint();
    z.spawn(kind, x, y, speedMultiplier);
    return z;
  }

  private randomEdgePoint(): { x: number; y: number } {
    const { width, height } = this.scale;
    const pad = 20;
    switch (Phaser.Math.Between(0, 3)) {
      case 0: return { x: Phaser.Math.Between(0, width), y: -pad };
      case 1: return { x: width + pad, y: Phaser.Math.Between(0, height) };
      case 2: return { x: Phaser.Math.Between(0, width), y: height + pad };
      default: return { x: -pad, y: Phaser.Math.Between(0, height) };
    }
  }

  private onPeaHitsZombie(pea: Pea, zombie: Zombie): void {
    if (!pea.active || !zombie.active) return;
    pea.retire();
    const result = zombie.health.takeHit();
    if (result === 'hit') {
      bus.emit('zombieHit', { zombieId: zombie.zombieId, wave: this.wave });
    } else if (result === 'killed') {
      zombie.retire();
      bus.emit('zombieKilled', { zombieId: zombie.zombieId, wave: this.wave });
    }
  }

  private onZombieTouchesHero(zombie: Zombie): void {
    if (!zombie.active) return;
    const now = this.time.now;
    if (!this.hero.hurt(now)) return;
    zombie.knockBack(this.hero, HERO.knockback, now);
    bus.emit('heroHurt', { hearts: this.hero.hearts });
    if (this.hero.hearts <= 0) this.onHeroDown();
  }

  /** Task 7 replaces this with the summary screen. */
  protected onHeroDown(): void {
    this.scene.stop('Hud');
    this.scene.start('Menu');
  }

  update(): void {
    const now = this.time.now;
    const body = this.hero.body as Phaser.Physics.Arcade.Body;
    if (this.hero.isFrozen(now)) {
      body.setVelocity(0, 0);
    } else {
      const m = this.controls.move();
      body.setVelocity(m.x * HERO.speed, m.y * HERO.speed);
      const target = this.controls.aim(this.hero);
      if (target) this.hero.setRotation(Phaser.Math.Angle.Between(this.hero.x, this.hero.y, target.x, target.y));
      if (target && this.controls.firing() && this.hero.canFire(now)) this.firePea(target);
    }
    this.zombies.getChildren().forEach(z => (z as Zombie).chase(this.hero, now));
    this.peas.getChildren().forEach(p => (p as Pea).retireIfOffscreen());
  }

  protected firePea(target: { x: number; y: number }): void {
    const pea = this.peas.get(this.hero.x, this.hero.y) as Pea | null;
    if (!pea) return;
    pea.fire(this.hero, Phaser.Math.Angle.Between(this.hero.x, this.hero.y, target.x, target.y));
  }
}
