import type { ZombieKind } from '../../entities/zombie/zombie.stats';
import type { WaveSpec } from './waves';

export class WaveDirector {
  readonly totalWaves: number;
  private wave = 0;
  private queue: ZombieKind[] = [];
  private spawned = 0;
  private killed = 0;

  constructor(
    private readonly waves: WaveSpec[],
    private readonly waveScale: number,
    private readonly rng: () => number = Math.random,
  ) {
    this.totalWaves = waves.length;
  }

  get currentWave(): number {
    return this.wave;
  }

  /** Starts wave n (1-based) and returns its spec scaled by the mode. */
  startWave(n: number): WaveSpec {
    const base = this.waves[n - 1];
    const count = Math.max(1, Math.round(base.count * this.waveScale));
    const joggers = Math.round(count * base.joggerShare);
    this.queue = [
      ...Array<ZombieKind>(joggers).fill('jogger'),
      ...Array<ZombieKind>(count - joggers).fill('shambler'),
    ];
    for (let i = this.queue.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
    }
    this.wave = n;
    this.spawned = 0;
    this.killed = 0;
    return { ...base, count, speedMultiplier: base.speedMultiplier * this.waveScale };
  }

  nextSpawn(): ZombieKind | null {
    const kind = this.queue.shift() ?? null;
    if (kind) this.spawned++;
    return kind;
  }

  onZombieKilled(): void {
    this.killed++;
  }

  isWaveCleared(): boolean {
    return this.queue.length === 0 && this.spawned > 0 && this.killed >= this.spawned;
  }
}
