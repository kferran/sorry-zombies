import { describe, it, expect } from 'vitest';
import { WAVES } from './waves';
import { WaveDirector } from './WaveDirector';

function seeded(seed = 1) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

function drain(d: WaveDirector) {
  const kinds = [];
  for (let k = d.nextSpawn(); k; k = d.nextSpawn()) kinds.push(k);
  return kinds;
}

describe('WAVES', () => {
  it('has 10 waves', () => expect(WAVES).toHaveLength(10));
  it('wave 1 spawns 6 and wave 10 spawns 33', () => {
    expect(WAVES[0].count).toBe(6);
    expect(WAVES[9].count).toBe(33);
  });
  it('speed rises 4% per wave (balance pass; spec started at 5%)', () => {
    expect(WAVES[0].speedMultiplier).toBeCloseTo(1);
    expect(WAVES[9].speedMultiplier).toBeCloseTo(1.36);
  });
  it('spawn interval shrinks but never below 400 ms', () => {
    expect(WAVES[0].spawnIntervalMs).toBe(1500);
    expect(WAVES[9].spawnIntervalMs).toBe(510);
    WAVES.forEach(w => expect(w.spawnIntervalMs).toBeGreaterThanOrEqual(400));
  });
});

describe('WaveDirector', () => {
  it('no joggers before wave 5', () => {
    const d = new WaveDirector(WAVES, 1, seeded());
    for (let n = 1; n <= 4; n++) {
      d.startWave(n);
      expect(drain(d)).not.toContain('jogger');
    }
  });

  it('wave 10 is 30% joggers (balance pass; spec started at 40%)', () => {
    const d = new WaveDirector(WAVES, 1, seeded());
    d.startWave(10);
    const kinds = drain(d);
    expect(kinds).toHaveLength(33);
    expect(kinds.filter(k => k === 'jogger')).toHaveLength(10);
  });

  it('waveScale 0.8 scales count and speed', () => {
    const d = new WaveDirector(WAVES, 0.8, seeded());
    const spec = d.startWave(10);
    expect(spec.count).toBe(26);
    expect(spec.speedMultiplier).toBeCloseTo(1.088);
    expect(drain(d)).toHaveLength(26);
  });

  it('nextSpawn returns null once count is reached', () => {
    const d = new WaveDirector(WAVES, 1, seeded());
    d.startWave(1);
    drain(d);
    expect(d.nextSpawn()).toBeNull();
  });

  it('wave is cleared only when every spawned zombie has been killed', () => {
    const d = new WaveDirector(WAVES, 1, seeded());
    d.startWave(1);
    expect(d.isWaveCleared()).toBe(false);
    drain(d);
    for (let i = 0; i < 5; i++) d.onZombieKilled();
    expect(d.isWaveCleared()).toBe(false);
    d.onZombieKilled();
    expect(d.isWaveCleared()).toBe(true);
  });

  it('same rng gives the same spawn order', () => {
    const a = new WaveDirector(WAVES, 1, seeded(7)); a.startWave(8);
    const b = new WaveDirector(WAVES, 1, seeded(7)); b.startWave(8);
    expect(drain(a)).toEqual(drain(b));
  });

  it('tracks the current wave and total', () => {
    const d = new WaveDirector(WAVES, 1);
    d.startWave(3);
    expect(d.currentWave).toBe(3);
    expect(d.totalWaves).toBe(10);
  });
});
