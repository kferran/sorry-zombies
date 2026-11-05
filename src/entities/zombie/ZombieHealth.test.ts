import { describe, it, expect } from 'vitest';
import { ZombieHealth } from './ZombieHealth';
import { ZOMBIE_STATS } from './zombie.stats';

describe('ZombieHealth', () => {
  it('shambler dies on the third hit', () => {
    const h = new ZombieHealth(ZOMBIE_STATS.shambler.hits);
    expect([h.takeHit(), h.takeHit(), h.takeHit()]).toEqual(['hit', 'hit', 'killed']);
    expect(h.dead).toBe(true);
  });

  it('jogger dies on the second hit', () => {
    const h = new ZombieHealth(ZOMBIE_STATS.jogger.hits);
    expect([h.takeHit(), h.takeHit()]).toEqual(['hit', 'killed']);
  });

  it('ignores hits after death', () => {
    const h = new ZombieHealth(3);
    h.takeHit(); h.takeHit(); h.takeHit();
    expect(h.takeHit()).toBe('ignored');
    expect(h.dead).toBe(true);
  });

  it('jogger speed is 1.6x shambler', () => {
    expect(ZOMBIE_STATS.jogger.speed).toBeCloseTo(ZOMBIE_STATS.shambler.speed * 1.6);
  });
});
