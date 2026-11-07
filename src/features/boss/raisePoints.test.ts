import { describe, it, expect } from 'vitest';
import { pickRaisePoints, RAISE } from './raisePoints';

const floor = Array.from({ length: 25 }, (_, i) => ({ x: 24 + i * 16, y: 192 }));
/** A fixed sequence standing in for Math.random. */
const seq = (...v: number[]) => { let i = 0; return () => v[i++ % v.length]; };

describe('pickRaisePoints', () => {
  it('picks none for a count of 0', () => {
    expect(pickRaisePoints(floor, 100, 0, Math.random)).toEqual([]);
  });

  it('never picks a point within 64 px of the hero', () => {
    for (let trial = 0; trial < 200; trial++) {
      const heroX = 24 + Math.random() * 384;
      const picked = pickRaisePoints(floor, heroX, 3, Math.random);
      expect(picked).toHaveLength(3);
      for (const p of picked) expect(Math.abs(p.x - heroX)).toBeGreaterThanOrEqual(RAISE.clearOfHeroPx);
    }
  });

  it('spreads the picks apart', () => {
    for (let trial = 0; trial < 200; trial++) {
      const picked = pickRaisePoints(floor, 216, 3, Math.random);
      for (let i = 0; i < picked.length; i++) {
        for (let j = i + 1; j < picked.length; j++) {
          expect(Math.abs(picked[i].x - picked[j].x)).toBeGreaterThanOrEqual(RAISE.apartPx);
        }
      }
    }
  });

  it('draws with the given rng', () => {
    const a = pickRaisePoints(floor, 24, 2, seq(0, 0.99));
    // Candidates are the points ≥ 64 px from x = 24: the first (x = 88) and then the last (x = 408).
    expect(a).toEqual([{ x: 88, y: 192 }, { x: 408, y: 192 }]);
  });

  it('gives up spacing rather than come up short, but never comes near the hero', () => {
    const tight = [{ x: 200, y: 192 }, { x: 210, y: 192 }, { x: 220, y: 192 }, { x: 20, y: 192 }];
    const picked = pickRaisePoints(tight, 20, 3, Math.random);
    expect(picked.map(p => p.x).sort()).toEqual([200, 210, 220]);
  });

  it('returns fewer when there are not enough points clear of the hero', () => {
    expect(pickRaisePoints([{ x: 10, y: 0 }, { x: 200, y: 0 }], 20, 2, Math.random)).toEqual([{ x: 200, y: 0 }]);
  });
});
