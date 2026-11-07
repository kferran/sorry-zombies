// Pure: how the Groundskeeper flies. No Phaser imports. Positions are its body centre, in world px;
// times are the Level clock (`now`, ms).

type Vec = { x: number; y: number };

export const FLIGHT = {
  /** Side-to-side drift across the upper half of the room (px/s). */
  patrolSpeed: 40,
  /** Body centre height while patrolling: the 108 px body spans y ≈ 2..110, out of the whip's reach. */
  patrolY: 56,
  bobPx: 3,
  bobHz: 0.5,
  /** A swoop: dive to the target, hang there, climb out on the far side. ~1 s in all. */
  diveMs: 350,
  lowMs: 350,
  riseMs: 350,
  /** The climb ends this far past the target (as a share of the dive's sideways distance). */
  overshoot: 0.5,
  /** Half the body (GHOST_BODY × 3): the centre stays this far inside the room's sides and above/below it. */
  halfWidth: 27,
  halfHeight: 54,
  /**
   * A swoop sinks this far below the feet it dives at (a ghost passes through the ground), so its
   * body reaches the whip both from the floor and from a dais, whichever he was standing on.
   */
  sinkPx: 24,
  /** Lowest body centre: sunk below the boss room's floor (y 192). */
  lowestY: 192 - 54 + 24,
} as const;

type Mode = 'patrol' | 'swoop' | 'rise' | 'held';
type Swoop = { at: number; from: Vec; target: Vec; exit: Vec };
type Rise = { at: number; from: Vec; to: Vec };

/** Half-cosine ease, 0 → 1. */
const ease = (t: number) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, t)))) / 2;
const lerp = (a: Vec, b: Vec, t: number): Vec => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/**
 * Patrols side to side; a swoop dives at a point (the hero), hangs low, then climbs out past it.
 * A recoil (struck or after contact) or a release (after listening) climbs straight back up,
 * harmless. Held, it stays exactly where it is.
 */
export class GroundskeeperFlight {
  x: number;
  y: number = FLIGHT.patrolY;
  /** Patrol direction. */
  dir: 1 | -1 = 1;
  private mode: Mode = 'patrol';
  private lastNow?: number;
  private patrolSince = 0;
  private swoop?: Swoop;
  private rise?: Rise;

  constructor(x: number, private readonly room: { left: number; right: number }) {
    this.x = this.clampX(x);
  }

  /** In a swoop (dive, hang, climb): the only time contact hurts. */
  get swooping(): boolean { return this.mode === 'swoop'; }

  get held(): boolean { return this.mode === 'held'; }

  /** 'patrol' | 'dive' | 'low' | 'climb' | 'rise' | 'held' (play checks and the sprite's pose). */
  phaseAt(now: number): string {
    if (this.mode !== 'swoop' || !this.swoop) return this.mode;
    const t = now - this.swoop.at;
    return t < FLIGHT.diveMs ? 'dive' : t < FLIGHT.diveMs + FLIGHT.lowMs ? 'low' : 'climb';
  }

  /** Dives at the hero's `feet` (sinking FLIGHT.sinkPx below them), kept inside the room. Only from patrol. */
  startSwoop(now: number, feet: Vec): void {
    if (this.mode !== 'patrol') return;
    const y = feet.y - FLIGHT.halfHeight + FLIGHT.sinkPx;
    const to = { x: this.clampX(feet.x), y: Math.min(FLIGHT.lowestY, Math.max(FLIGHT.patrolY, y)) };
    const exit = { x: this.clampX(to.x + (to.x - this.x) * FLIGHT.overshoot), y: FLIGHT.patrolY };
    this.swoop = { at: now, from: { x: this.x, y: this.y }, target: to, exit };
    this.mode = 'swoop';
  }

  /** Struck or touched mid-swoop: climbs straight back up, harmless. */
  recoil(now: number): void {
    if (this.mode === 'swoop') this.climbFrom(now);
  }

  /** Stops dead (listening). */
  hold(): void {
    this.mode = 'held';
    this.swoop = undefined;
    this.rise = undefined;
  }

  /** Done listening: climbs straight back up, then patrols. */
  release(now: number): void {
    if (this.mode === 'held') this.climbFrom(now);
  }

  update(now: number): void {
    const dt = this.lastNow === undefined ? 0 : Math.max(0, now - this.lastNow);
    this.lastNow = now;
    switch (this.mode) {
      case 'held': return;
      case 'swoop': return this.flySwoop(now);
      case 'rise': return this.flyRise(now);
      case 'patrol': return this.patrol(now, dt);
    }
  }

  private flySwoop(now: number): void {
    const s = this.swoop!;
    const t = now - s.at;
    let p: Vec;
    if (t < FLIGHT.diveMs) p = lerp(s.from, s.target, ease(t / FLIGHT.diveMs));
    else if (t < FLIGHT.diveMs + FLIGHT.lowMs) p = s.target;
    else if (t < FLIGHT.diveMs + FLIGHT.lowMs + FLIGHT.riseMs) {
      p = lerp(s.target, s.exit, ease((t - FLIGHT.diveMs - FLIGHT.lowMs) / FLIGHT.riseMs));
    } else {
      p = s.exit;
      this.startPatrol(now);
    }
    this.x = p.x;
    this.y = p.y;
  }

  private flyRise(now: number): void {
    const r = this.rise!;
    const t = (now - r.at) / FLIGHT.riseMs;
    const p = t >= 1 ? r.to : lerp(r.from, r.to, ease(t));
    this.x = p.x;
    this.y = p.y;
    if (t >= 1) this.startPatrol(now);
  }

  private patrol(now: number, dt: number): void {
    const min = this.room.left + FLIGHT.halfWidth;
    const max = this.room.right - FLIGHT.halfWidth;
    let x = this.x + this.dir * FLIGHT.patrolSpeed * dt / 1000;
    if (x >= max) { x = max; this.dir = -1; }
    if (x <= min) { x = min; this.dir = 1; }
    this.x = x;
    this.y = FLIGHT.patrolY + FLIGHT.bobPx * Math.sin(2 * Math.PI * FLIGHT.bobHz * (now - this.patrolSince) / 1000);
  }

  private startPatrol(now: number): void {
    this.mode = 'patrol';
    this.swoop = undefined;
    this.rise = undefined;
    this.patrolSince = now;
  }

  private climbFrom(now: number): void {
    this.swoop = undefined;
    this.rise = { at: now, from: { x: this.x, y: this.y }, to: { x: this.x, y: FLIGHT.patrolY } };
    this.mode = 'rise';
  }

  private clampX(x: number): number {
    return Math.min(this.room.right - FLIGHT.halfWidth, Math.max(this.room.left + FLIGHT.halfWidth, x));
  }
}
