export type ZombieKind = 'shambler' | 'jogger';

/** speed is in pixels per second before the wave's speed multiplier. */
export const ZOMBIE_STATS: Record<ZombieKind, { hits: number; speed: number }> = {
  shambler: { hits: 3, speed: 60 },
  jogger: { hits: 2, speed: 96 },
};
