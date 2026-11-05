import { describe, it, expect } from 'vitest';
import { GuiltMeter, guiltLevel, wobbleForLevel } from './GuiltMeter';

describe('GuiltMeter', () => {
  it('hit adds 4, kill adds 10', () => {
    const g = new GuiltMeter(true);
    g.onHit(1);
    expect(g.value).toBe(4);
    g.onKill(2);
    expect(g.value).toBe(14);
  });

  it('apology clears only the most recent zombie\'s owed guilt', () => {
    const g = new GuiltMeter(true);
    g.onHit(1); g.onHit(1); g.onHit(2);
    expect(g.apologize(0)).toEqual({ accepted: true, cleared: 4 });
    expect(g.value).toBe(8);
  });

  it('a second apology moves on to the next most recent zombie', () => {
    const g = new GuiltMeter(true);
    g.onHit(1); g.onHit(1); g.onHit(2);
    g.apologize(0);
    expect(g.apologize(1000)).toEqual({ accepted: true, cleared: 8 });
    expect(g.value).toBe(0);
  });

  it('apology works for a zombie that already died', () => {
    const g = new GuiltMeter(true);
    g.onHit(3); g.onKill(3);
    expect(g.apologize(0).cleared).toBe(14);
    expect(g.value).toBe(0);
  });

  it('apologizing with nobody owed clears 0 but is accepted', () => {
    expect(new GuiltMeter(true).apologize(0)).toEqual({ accepted: true, cleared: 0 });
  });

  it('respects the 1000 ms cooldown', () => {
    const g = new GuiltMeter(true);
    g.onHit(1); g.onHit(2);
    expect(g.apologize(0).accepted).toBe(true);
    expect(g.apologize(500)).toEqual({ accepted: false, cleared: 0 });
    expect(g.value).toBe(4);
    expect(g.apologize(1000).accepted).toBe(true);
    expect(g.value).toBe(0);
  });

  it.each([[32, 0, 0], [33, 1, 4], [65, 1, 4], [66, 2, 10], [99, 2, 10]] as const)(
    'at %d guilt the level is %d and wobble %d°', (v, level, wobble) => {
      expect(guiltLevel(v)).toBe(level);
      expect(wobbleForLevel(guiltLevel(v))).toBe(wobble);
    });

  it('the meter reports level and wobble from its value', () => {
    const g = new GuiltMeter(true);
    g.onKill(1); g.onKill(2); g.onKill(3); g.onKill(4); // 40
    expect(g.level()).toBe(1);
    expect(g.wobbleDegrees()).toBe(4);
  });

  it('breakdown halves every debt and keeps the sum equal to the meter', () => {
    const g = new GuiltMeter(true);
    const results = Array.from({ length: 10 }, (_, i) => g.onKill(i + 1).breakdown);
    expect(results.slice(0, 9).every(b => !b)).toBe(true);
    expect(results[9]).toBe(true);
    expect(g.value).toBe(50);
    // ten debts of 5 each: five apologies (spaced past the cooldown) clear 25 of the 50.
    expect(g.apologize(0).cleared).toBe(5);
    expect(g.value).toBe(45);
    let total = 5;
    for (let i = 1; i < 10; i++) total += g.apologize(i * 1000).cleared;
    expect(total).toBe(50);
    expect(g.value).toBe(0);
  });

  it('apology after a breakdown clears the halved debt', () => {
    const g = new GuiltMeter(true);
    for (let i = 0; i < 10; i++) g.onKill(i + 1);
    expect(g.apologize(0)).toEqual({ accepted: true, cleared: 5 });
    expect(g.value).toBe(45);
  });

  it('disabled meter never changes', () => {
    const g = new GuiltMeter(false);
    for (let i = 0; i < 20; i++) expect(g.onKill(i).breakdown).toBe(false);
    g.onHit(1);
    expect(g.value).toBe(0);
    expect(g.level()).toBe(0);
    expect(g.wobbleDegrees()).toBe(0);
    expect(g.apologize(0)).toEqual({ accepted: true, cleared: 0 });
  });
});
