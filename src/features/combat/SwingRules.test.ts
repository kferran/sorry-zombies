import { describe, it, expect } from 'vitest';
import { SwingRules, SWING } from './SwingRules';

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe('SwingRules', () => {
  it('swings no faster than 450 ms at level 0', () => {
    const r = new SwingRules(() => 0.99);
    expect(r.tryStart(0, 0).started).toBe(true);
    expect(r.tryStart(449, 0).started).toBe(false);
    expect(r.tryStart(450, 0).started).toBe(true);
  });

  it('level 1 adds 100 ms', () => {
    const r = new SwingRules(() => 0.99);
    r.tryStart(0, 1);
    expect(r.tryStart(549, 1).started).toBe(false);
    expect(r.tryStart(550, 1).started).toBe(true);
  });

  it('level 2 adds 200 ms', () => {
    const r = new SwingRules(() => 0.99);
    r.tryStart(0, 2);
    expect(r.tryStart(649, 2).started).toBe(false);
    expect(r.tryStart(650, 2).started).toBe(true);
  });

  it('active only on frames 3, 4, 5', () => {
    const r = new SwingRules();
    expect([1, 2, 3, 4, 5, 6].map((f) => r.isActiveFrame(f))).toEqual([false, false, true, true, true, false]);
    expect(SWING.frames).toBe(5);
  });

  it('about 1 in 4 swings stop short at level 2', () => {
    const r = new SwingRules(lcg(12345));
    let short = 0;
    for (let i = 0; i < 400; i++) {
      const res = r.tryStart(i * 10000, 2);
      expect(res.started).toBe(true);
      if (res.stopShort) short++;
    }
    expect(short).toBeGreaterThanOrEqual(80);
    expect(short).toBeLessThanOrEqual(120);
  });

  it('never stops short below level 2', () => {
    const r = new SwingRules(() => 0);
    for (let i = 0; i < 50; i++) {
      expect(r.tryStart(i * 10000, (i % 2) as 0 | 1).stopShort).toBe(false);
    }
  });

  it('a rejected press neither resets the cooldown nor stops short', () => {
    const r = new SwingRules(() => 0);
    r.tryStart(0, 0);
    expect(r.tryStart(300, 2)).toEqual({ started: false, stopShort: false });
    expect(r.tryStart(450, 0).started).toBe(true);
  });
});
