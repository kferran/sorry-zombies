export type BossState = 'phase' | 'listening' | 'forgiven' | 'defeated';

const HITS_PER_PHASE = 4;
const SWOOP_MS = [3000, 2500, 2000] as const;

export class BossBrain {
  private _state: BossState = 'phase';
  private _phase: 1 | 2 | 3 = 1;
  private _pause: 0 | 1 | 2 | 3 = 0;
  private _accepted = 0;
  private hitCount = 0;
  private bowedAt: boolean[] = [false, false, false, false];

  constructor(private readonly guilt: boolean) {}

  get state(): BossState { return this._state; }
  get phase(): 1 | 2 | 3 { return this._phase; }
  get pause(): 0 | 1 | 2 | 3 { return this._pause; }
  get accepted(): number { return this._accepted; }

  hit(): 'counted' | 'ignored' {
    if (this._state !== 'phase') return 'ignored';
    this.hitCount++;
    if (this.hitCount % HITS_PER_PHASE === 0) {
      this._state = 'listening';
      this._pause = (this.hitCount / HITS_PER_PHASE) as 1 | 2 | 3;
    }
    return 'counted';
  }

  bow(): boolean {
    if (!this.guilt || this._state !== 'listening' || this.bowedAt[this._pause]) return false;
    this.bowedAt[this._pause] = true;
    this._accepted++;
    return true;
  }

  endPause(): BossState {
    if (this._state !== 'listening') return this._state;
    if (this._pause === 3) {
      this._state = this._accepted === 3 ? 'forgiven' : 'defeated';
    } else {
      this._phase = (this._pause + 1) as 2 | 3;
      this._state = 'phase';
    }
    return this._state;
  }

  raisesForPhase(phase: 1 | 2 | 3): number {
    if (phase === 1) return 0;
    return phase - (this.bowedAt[phase - 1] ? 1 : 0);
  }

  swoopIntervalMs(): number {
    return SWOOP_MS[this._phase - 1];
  }
}
