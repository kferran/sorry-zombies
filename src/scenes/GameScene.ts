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
import { WAVES, WAVE_SUBTITLES, type WaveSpec } from '../features/waves/waves';
import { WaveDirector } from '../features/waves/WaveDirector';
import { WaveBanner } from '../features/waves/WaveBanner';
import { RunStats, scoreRun } from '../features/scoring/Scoring';
import type { HudScene } from './HudScene';
import { ApologyPicker } from '../features/apologies/ApologyPicker';
import { LINES } from '../features/apologies/lines';
import { SpeechBubble } from '../features/apologies/SpeechBubble';

const BREATHER_MS = 3000;
const MAX_ZOMBIES = 80;

export class GameScene extends Phaser.Scene {
  mode: ModeConfig = MODES.casual;
  hero!: Hero;
  zombies!: Phaser.Physics.Arcade.Group;
  peas!: Phaser.Physics.Arcade.Group;
  private controls!: InputSource;
  wave = 1;
  director!: WaveDirector;
  runStats!: RunStats;
  private spawnTimer?: Phaser.Time.TimerEvent;
  private betweenWaves = false;
  private ended = false;
  picker = new ApologyPicker(LINES);
  bubble!: SpeechBubble;

  constructor() { super('Game'); }

  init(data: { mode?: ModeConfig }): void {
    this.mode = data.mode ?? MODES.casual;
    this.wave = 1;
    this.director = new WaveDirector(WAVES, this.mode.waveScale);
    this.runStats = new RunStats();
    this.betweenWaves = false;
    this.ended = false;
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width - 8, height - 8).setStrokeStyle(4, 0x666666);
    this.physics.world.setBounds(0, 0, width, height);

    this.hero = new Hero(this, width / 2, height / 2);
    this.zombies = this.physics.add.group({ classType: Zombie, maxSize: MAX_ZOMBIES });
    this.peas = this.physics.add.group({ classType: Pea, maxSize: 40, runChildUpdate: false });
    this.controls = new KeyboardMouseInput(this);

    this.physics.add.overlap(this.peas, this.zombies, (p, z) => this.onPeaHitsZombie(p as Pea, z as Zombie));
    this.physics.add.overlap(this.hero, this.zombies, (_h, z) => this.onZombieTouchesHero(z as Zombie));

    this.bubble = new SpeechBubble(this);
    bus.on('zombieHit', ({ wave }) => this.bubble.say(this.picker.pick('hit', wave), this.hero));
    bus.on('zombieKilled', ({ wave }) => this.bubble.say(this.picker.pick('kill', wave), this.hero));

    this.scene.launch('Hud');
    const onVisibility = () => { if (document.hidden) this.hud().pauseGame(); };
    document.addEventListener('visibilitychange', onVisibility);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.controls.destroy();
      this.bubble.destroy();
      document.removeEventListener('visibilitychange', onVisibility);
      bus.clear();
    });

    // Let the HUD subscribe before the first wave announces itself.
    this.time.delayedCall(0, () => this.startWave(1));
  }

  private hud(): HudScene {
    return this.scene.get('Hud') as HudScene;
  }

  private startWave(n: number): void {
    const spec = this.director.startWave(n);
    this.wave = n;
    this.betweenWaves = false;
    bus.emit('waveStarted', { wave: n });
    WaveBanner.show(this, `Wave ${n}: ${WAVE_SUBTITLES[n - 1]}`, 1800);
    this.spawnTimer?.remove();
    this.spawnTimer = this.time.addEvent({
      delay: spec.spawnIntervalMs, loop: true, callback: () => this.spawnNext(spec),
    });
  }

  private spawnNext(spec: WaveSpec): void {
    if (this.zombies.countActive(true) >= MAX_ZOMBIES) return; // wait for room; never drop a spawn
    const kind = this.director.nextSpawn();
    if (!kind) {
      this.spawnTimer?.remove();
      return;
    }
    this.spawnZombie(kind, spec.speedMultiplier);
  }

  private onWaveCleared(): void {
    this.runStats.wavesCleared++;
    bus.emit('waveCleared', { wave: this.wave });
    if (this.wave >= this.director.totalWaves) {
      this.endRun('win');
      return;
    }
    this.betweenWaves = true;
    this.time.delayedCall(BREATHER_MS, () => this.startWave(this.wave + 1));
  }

  private endRun(outcome: 'win' | 'lose'): void {
    if (this.ended) return;
    this.ended = true;
    this.spawnTimer?.remove();
    bus.emit('runEnded', { outcome });
    const score = scoreRun(this.runStats, this.mode);
    this.scene.stop('Hud');
    this.scene.start('Summary', { mode: this.mode, stats: this.runStats, outcome, score });
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
      this.runStats.zombiesHurt++;
      bus.emit('zombieHit', { zombieId: zombie.zombieId, wave: this.wave });
    } else if (result === 'killed') {
      this.runStats.zombiesHurt++;
      this.runStats.zombiesKilled++;
      zombie.retire();
      this.director.onZombieKilled();
      bus.emit('zombieKilled', { zombieId: zombie.zombieId, wave: this.wave });
    }
  }

  private onZombieTouchesHero(zombie: Zombie): void {
    if (!zombie.active) return;
    const now = this.time.now;
    if (!this.hero.hurt(now)) return;
    zombie.knockBack(this.hero, HERO.knockback, now);
    bus.emit('heroHurt', { hearts: this.hero.hearts });
  }

  update(): void {
    if (this.ended) return;
    // Hearts are checked before wave-clear, so a last kill and a last heart on one frame is a loss.
    if (this.hero.hearts <= 0) {
      this.endRun('lose');
      return;
    }
    if (!this.betweenWaves && this.director.isWaveCleared()) this.onWaveCleared();
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
