import Phaser from 'phaser';
import type { SpawnType } from './spawnType';

export type GameEventMap = {
  zombieHit: { zombieId: number; wave: number };
  zombieKilled: { zombieId: number; wave: number };
  heroHurt: { hearts: number };
  /** Side-scroller: the hero's hearts changed (start of a stage, hurt, refill). */
  heartsChanged: { hearts: number };
  /** Side-scroller: an enemy woke (a skeleton climbs out). */
  enemyRose: { enemyId: number; kind: SpawnType };
  /** Side-scroller: the whip struck an enemy that survived. `stage` is the stage index. */
  enemyHit: { enemyId: number; kind: SpawnType; stage: number };
  /** Side-scroller: an enemy was put down. */
  enemyPutDown: { enemyId: number; kind: SpawnType; stage: number };
  /** Side-scroller: the hero's last heart is gone (Task 8 turns this into a retry). */
  heroDown: Record<string, never>;
  /** Side-scroller: the hero reached the exit. `stage` is the stage index. */
  stageCleared: { stage: number };
  /** Side-scroller: the stage restarts after the last heart went. */
  retry: { stage: number };
  /** Boss: the Groundskeeper stops to listen after the 4th hit of a phase (`pause` 1–3). */
  bossListening: { pause: 1 | 2 | 3 };
  /** Boss: a bow during a listening pause was accepted (Full Conscience). */
  bossAccepted: { pause: 1 | 2 | 3 };
  /** Boss: the third pause ended in forgiveness. */
  bossForgave: Record<string, never>;
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
