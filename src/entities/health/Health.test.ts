import { describe, it, expect } from 'vitest';
import { Health } from './Health';

describe('Health', () => {
  it('3 hits: dies on the third hit', () => {
    const h = new Health(3);
    expect([h.takeHit(), h.takeHit(), h.takeHit()]).toEqual(['hit', 'hit', 'killed']);
    expect(h.dead).toBe(true);
  });

  it('2 hits: dies on the second hit', () => {
    const h = new Health(2);
    expect([h.takeHit(), h.takeHit()]).toEqual(['hit', 'killed']);
  });

  it('ignores hits after death', () => {
    const h = new Health(3);
    h.takeHit(); h.takeHit(); h.takeHit();
    expect(h.takeHit()).toBe('ignored');
    expect(h.dead).toBe(true);
  });
});
