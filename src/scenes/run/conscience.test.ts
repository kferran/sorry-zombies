import { describe, it, expect, vi } from 'vitest';
import { decideBow, GuiltSampler, swingGuiltLevel, wantsGrey } from './conscience';
import { GuiltMeter } from '../../features/guilt/GuiltMeter';
import { StageStats } from '../../features/scoring/Scoring';

const accepted = (cleared = 0) => () => ({ accepted: true, cleared });
const rejected = () => ({ accepted: false, cleared: 0 });

describe('decideBow', () => {
  it('Casual ignores the press entirely: no apology, no boss bow', () => {
    const apologize = vi.fn(accepted());
    const bossBow = vi.fn(() => true);
    expect(decideBow({ guiltMode: false, frozen: false }, apologize, bossBow)).toEqual({ bowed: false });
    expect(apologize).not.toHaveBeenCalled();
    expect(bossBow).not.toHaveBeenCalled();
  });

  it('a press while frozen (bow, breakdown, hurt) is discarded', () => {
    const apologize = vi.fn(accepted());
    const bossBow = vi.fn(() => true);
    expect(decideBow({ guiltMode: true, frozen: true }, apologize, bossBow)).toEqual({ bowed: false });
    expect(apologize).not.toHaveBeenCalled();
    expect(bossBow).not.toHaveBeenCalled();
  });

  it('a press the guilt cooldown rejects does nothing, and the boss never hears it', () => {
    const bossBow = vi.fn(() => true);
    expect(decideBow({ guiltMode: true, frozen: false }, rejected, bossBow)).toEqual({ bowed: false });
    expect(bossBow).not.toHaveBeenCalled();
  });

  it('an accepted bow outside a pause is a normal apology', () => {
    expect(decideBow({ guiltMode: true, frozen: false }, accepted(10), () => false))
      .toEqual({ bowed: true, line: 'apology', cleared: 10 });
  });

  it('an accepted bow the boss accepts says bossAccept, and still clears guilt', () => {
    expect(decideBow({ guiltMode: true, frozen: false }, accepted(4), () => true))
      .toEqual({ bowed: true, line: 'bossAccept', cleared: 4 });
  });

  it('the guilt meter decides first: the cooldown applies to boss bows too', () => {
    const guilt = new GuiltMeter(true);
    const bossBow = vi.fn(() => true);
    expect(decideBow({ guiltMode: true, frozen: false }, () => guilt.apologize(0), bossBow).bowed).toBe(true);
    expect(decideBow({ guiltMode: true, frozen: false }, () => guilt.apologize(999), bossBow).bowed).toBe(false);
    expect(bossBow).toHaveBeenCalledTimes(1);
    expect(decideBow({ guiltMode: true, frozen: false }, () => guilt.apologize(1000), bossBow).bowed).toBe(true);
  });
});

describe('swingGuiltLevel', () => {
  it('Casual swings at level 0 whatever the meter says', () => {
    expect(swingGuiltLevel(false, 2)).toBe(0);
  });
  it('Full Conscience swings at the meter level', () => {
    expect(swingGuiltLevel(true, 0)).toBe(0);
    expect(swingGuiltLevel(true, 1)).toBe(1);
    expect(swingGuiltLevel(true, 2)).toBe(2);
  });
});

describe('wantsGrey', () => {
  it('only level 2 greys the screen', () => {
    expect(wantsGrey(0)).toBe(false);
    expect(wantsGrey(1)).toBe(false);
    expect(wantsGrey(2)).toBe(true);
  });
});

describe('GuiltSampler', () => {
  it('is due once per 1000 ms of Level clock', () => {
    const s = new GuiltSampler();
    expect(s.due(0)).toBe(0);
    expect(s.due(999)).toBe(0);
    expect(s.due(1000)).toBe(1);
    expect(s.due(1500)).toBe(0);
    expect(s.due(2016)).toBe(1);
  });

  it('catches up after a long frame', () => {
    const s = new GuiltSampler();
    expect(s.due(3500)).toBe(3);
    expect(s.due(4000)).toBe(1);
  });

  it('feeds StageStats, which ignores time with nothing awake', () => {
    const s = new GuiltSampler();
    const stats = new StageStats();
    const sample = (now: number, v: number, awake: boolean) => {
      for (let n = s.due(now); n > 0; n--) stats.sampleGuilt(v, awake);
    };
    sample(1000, 40, true);
    sample(2000, 40, true);
    expect(stats.averageGuilt()).toBe(40);
    // An empty stretch: ten seconds with guilt 0 and nobody awake doesn't move the average.
    for (let t = 3000; t <= 12000; t += 1000) sample(t, 0, false);
    expect(stats.averageGuilt()).toBe(40);
    sample(13000, 10, true);
    expect(stats.averageGuilt()).toBe(30);
  });
});
