import Phaser from 'phaser';

export type GameEventMap = {
  zombieHit: { zombieId: number; wave: number };
  zombieKilled: { zombieId: number; wave: number };
  heroHurt: { hearts: number };
  apologized: { cleared: number };
  guiltChanged: { guilt: number; level: 0 | 1 | 2 };
  waveStarted: { wave: number };
  waveCleared: { wave: number };
  runEnded: { outcome: 'win' | 'lose' };
};

export type GameEventName = keyof GameEventMap;

/** Typed wrapper over a Phaser emitter, shared by Game and Hud scenes. */
export class GameBus {
  private emitter = new Phaser.Events.EventEmitter();

  on<K extends GameEventName>(k: K, fn: (p: GameEventMap[K]) => void, ctx?: unknown): void {
    this.emitter.on(k, fn, ctx);
  }

  off<K extends GameEventName>(k: K, fn: (p: GameEventMap[K]) => void, ctx?: unknown): void {
    this.emitter.off(k, fn, ctx);
  }

  emit<K extends GameEventName>(k: K, p: GameEventMap[K]): void {
    this.emitter.emit(k, p);
  }

  clear(): void {
    this.emitter.removeAllListeners();
  }
}

export const bus = new GameBus();
