import { describe, it, expect } from 'vitest';
import { ENEMY, WAIT, waitMsFor } from './enemy.stats';

describe('ENEMY stats', () => {
  it('match the spec numbers', () => {
    expect(ENEMY).toEqual({
      skeleton: { hits: 3, speed: 30, wake: 210 },
      ghost: { hits: 1, speed: 25, wake: 210 },
      cat: { hits: 2, wake: 120, pounceGapMs: 900 },
    });
  });
});

describe('waitMsFor', () => {
  it('is 1200 ms plus 40 ms per character of the line said', () => {
    expect(waitMsFor('')).toBe(1200);
    expect(waitMsFor('Pardon me!')).toBe(1200 + 40 * 10);
  });

  it('caps at 3200 ms', () => {
    expect(waitMsFor('x'.repeat(50))).toBe(3200);
    expect(waitMsFor('x'.repeat(51))).toBe(3200);
    expect(waitMsFor('x'.repeat(200))).toBe(3200);
  });

  it('exposes the contact wait', () => {
    expect(WAIT.afterContactMs).toBe(800);
  });
});
