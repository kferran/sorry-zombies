import { describe, it, expect } from 'vitest';
import { GroundskeeperFlight, FLIGHT } from './groundskeeperFlight';

const ROOM = { left: 0, right: 432 };
const SWOOP_MS = FLIGHT.diveMs + FLIGHT.lowMs + FLIGHT.riseMs;
/** Hero's feet on the floor and on a dais; where the body centre ends up over each. */
const FLOOR = 192, DAIS = 160;
const LOW = (feet: number) => feet - FLIGHT.halfHeight + FLIGHT.sinkPx;

/** Steps the flight in 16 ms frames from `from` to `to` (inclusive of `to`). */
function run(f: GroundskeeperFlight, from: number, to: number): void {
  for (let t = from; t < to; t += 16) f.update(t);
  f.update(to);
}

describe('GroundskeeperFlight', () => {
  it('patrols the upper half side to side at its speed, turning inside the room', () => {
    const f = new GroundskeeperFlight(300, ROOM);
    f.update(0);
    expect(f.y).toBeLessThan(120);
    run(f, 0, 1000);
    expect(f.x).toBeCloseTo(300 + FLIGHT.patrolSpeed, 0);
    let minX = Infinity, maxX = -Infinity;
    for (let t = 1000; t < 40000; t += 16) {
      f.update(t);
      minX = Math.min(minX, f.x); maxX = Math.max(maxX, f.x);
      expect(f.y).toBeLessThan(120);
      expect(f.swooping).toBe(false);
    }
    expect(minX).toBeCloseTo(ROOM.left + FLIGHT.halfWidth, 0);
    expect(maxX).toBeCloseTo(ROOM.right - FLIGHT.halfWidth, 0);
  });

  it('a swoop dives to the target, hangs low, then climbs back up, about a second in all', () => {
    const f = new GroundskeeperFlight(300, ROOM);
    f.update(0);
    const startY = f.y;
    f.startSwoop(0, { x: 200, y: FLOOR });
    expect(f.swooping).toBe(true);
    run(f, 0, FLIGHT.diveMs);
    expect(f.x).toBeCloseTo(200, 0);
    expect(f.y).toBeCloseTo(LOW(FLOOR), 0);
    run(f, FLIGHT.diveMs, FLIGHT.diveMs + FLIGHT.lowMs);
    expect(f.x).toBeCloseTo(200, 0);
    expect(f.y).toBeCloseTo(LOW(FLOOR), 0);
    expect(f.swooping).toBe(true);
    run(f, FLIGHT.diveMs + FLIGHT.lowMs, SWOOP_MS - 1);
    expect(f.swooping).toBe(true);
    f.update(SWOOP_MS);
    expect(f.swooping).toBe(false);
    expect(f.y).toBeCloseTo(startY, 0);
    expect(SWOOP_MS).toBeGreaterThanOrEqual(900);
    expect(SWOOP_MS).toBeLessThanOrEqual(1200);
  });

  it('climbs out on the far side of the target, kept inside the room', () => {
    const f = new GroundskeeperFlight(300, ROOM);
    f.update(0);
    f.startSwoop(0, { x: 60, y: FLOOR });
    run(f, 0, SWOOP_MS);
    expect(f.x).toBeLessThan(60);
    expect(f.x).toBeGreaterThanOrEqual(ROOM.left + FLIGHT.halfWidth);
  });

  it('keeps the target inside the room and no lower than over the floor', () => {
    const f = new GroundskeeperFlight(300, ROOM);
    f.update(0);
    f.startSwoop(0, { x: -50, y: 500 });
    run(f, 0, FLIGHT.diveMs);
    expect(f.x).toBe(ROOM.left + FLIGHT.halfWidth);
    expect(f.y).toBe(FLIGHT.lowestY);
  });

  it('hangs low enough to be whipped from the floor and from a dais, wherever it dives', () => {
    // The whip box spans 12..32 px above the hero's feet (body 40 tall, box 20 tall from 8 below its top).
    const whip = (feet: number) => ({ top: feet - 32, bottom: feet - 12 });
    for (const target of [FLOOR, DAIS]) {
      const f = new GroundskeeperFlight(300, ROOM);
      f.update(0);
      f.startSwoop(0, { x: 200, y: target });
      run(f, 0, FLIGHT.diveMs);
      const body = { top: f.y - FLIGHT.halfHeight, bottom: f.y + FLIGHT.halfHeight };
      for (const feet of [FLOOR, DAIS]) {
        expect(body.top).toBeLessThan(whip(feet).bottom);
        expect(body.bottom).toBeGreaterThan(whip(feet).top);
      }
    }
  });

  it('patrols out of reach from the floor and the daises', () => {
    const f = new GroundskeeperFlight(300, ROOM);
    for (let t = 0; t < 5000; t += 16) {
      f.update(t);
      expect(f.y + FLIGHT.halfHeight).toBeLessThan(DAIS - 32);
    }
  });

  it('ignores a swoop while already swooping', () => {
    const f = new GroundskeeperFlight(300, ROOM);
    f.update(0);
    f.startSwoop(0, { x: 200, y: FLOOR });
    f.startSwoop(100, { x: 400, y: FLOOR });
    run(f, 0, FLIGHT.diveMs);
    expect(f.x).toBeCloseTo(200, 0);
  });

  it('recoil: a struck swoop climbs straight back up, harmless', () => {
    const f = new GroundskeeperFlight(300, ROOM);
    f.update(0);
    const top = f.y;
    f.startSwoop(0, { x: 200, y: FLOOR });
    run(f, 0, FLIGHT.diveMs + 100);
    f.recoil(FLIGHT.diveMs + 100);
    expect(f.swooping).toBe(false);
    run(f, FLIGHT.diveMs + 100, FLIGHT.diveMs + 100 + FLIGHT.riseMs);
    expect(f.x).toBeCloseTo(200, 0);
    expect(f.y).toBeCloseTo(top, 0);
  });

  it('hold stops it dead wherever it is; release climbs back and patrols again', () => {
    const f = new GroundskeeperFlight(300, ROOM);
    f.update(0);
    f.startSwoop(0, { x: 200, y: FLOOR });
    run(f, 0, FLIGHT.diveMs);
    f.hold();
    expect(f.swooping).toBe(false);
    run(f, FLIGHT.diveMs, FLIGHT.diveMs + 3000);
    expect(f.x).toBeCloseTo(200, 0);
    expect(f.y).toBeCloseTo(LOW(FLOOR), 0);
    expect(f.held).toBe(true);
    f.startSwoop(FLIGHT.diveMs + 3000, { x: 100, y: FLOOR }); // no swooping while held
    expect(f.swooping).toBe(false);
    const t0 = FLIGHT.diveMs + 3000;
    f.release(t0);
    expect(f.held).toBe(false);
    run(f, t0, t0 + FLIGHT.riseMs);
    expect(f.y).toBeLessThan(120);
    const x = f.x;
    run(f, t0 + FLIGHT.riseMs, t0 + FLIGHT.riseMs + 500);
    expect(Math.abs(f.x - x)).toBeCloseTo(FLIGHT.patrolSpeed / 2, 0);
  });

  it('patrol after a swoop carries on from where the climb ended', () => {
    const f = new GroundskeeperFlight(300, ROOM);
    f.update(0);
    f.startSwoop(0, { x: 200, y: FLOOR });
    run(f, 0, SWOOP_MS);
    const x = f.x, y = f.y;
    f.update(SWOOP_MS + 16);
    expect(Math.abs(f.x - x)).toBeLessThan(2);
    expect(Math.abs(f.y - y)).toBeLessThan(2);
  });
});
