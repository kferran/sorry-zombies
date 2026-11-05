import { describe, it, expect } from 'vitest';
import { ZOMBIE_STATS } from './zombie.stats';

describe('zombie stats', () => {
  it('shambler takes 3 hits, jogger 2', () => {
    expect(ZOMBIE_STATS.shambler.hits).toBe(3);
    expect(ZOMBIE_STATS.jogger.hits).toBe(2);
  });

  it('jogger speed is 1.6x shambler', () => {
    expect(ZOMBIE_STATS.jogger.speed).toBeCloseTo(ZOMBIE_STATS.shambler.speed * 1.6);
  });
});
