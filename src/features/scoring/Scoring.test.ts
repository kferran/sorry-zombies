import { describe, it, expect } from 'vitest';
import { RunStats, StageStats, scoreRun, scoreStageRun, gradeFor, conscienceBonus } from './Scoring';
import { MODES } from '../../shared/modes';

function stats(waves: number, samples: number[] = []) {
  const s = new RunStats();
  s.wavesCleared = waves;
  samples.forEach(v => s.sampleGuilt(v));
  return s;
}

describe('scoring', () => {
  it('casual score is waves × 100', () => {
    expect(scoreRun(stats(7, [90, 90]), MODES.casual)).toBe(700);
  });

  it('conscience score adds the bonus', () => {
    expect(scoreRun(stats(10, [10, 30]), MODES.conscience)).toBe(1000 + 400);
  });

  it('conscience bonus rounds', () => {
    expect(conscienceBonus(33.33)).toBe(333);
  });

  it('averageGuilt is 0 with no samples', () => {
    expect(new RunStats().averageGuilt()).toBe(0);
  });

  it.each([
    [0, 'Saint'], [14, 'Saint'],
    [15, 'Decent Person'], [34, 'Decent Person'],
    [35, 'Conflicted'], [59, 'Conflicted'],
    [60, 'Callous'], [84, 'Callous'],
    [85, 'Monster'], [100, 'Monster'],
  ] as const)('grade for %d is %s', (avg, grade) => {
    expect(gradeFor(avg)).toBe(grade);
  });

  it('fractional averages fall into the lower grade', () => {
    expect(gradeFor(14.6)).toBe('Saint');
  });
});

describe('stage scoring', () => {
  function stage(cleared: number, samples: number[] = [], forgiven = false) {
    const s = new StageStats();
    s.stagesCleared = cleared;
    s.forgiven = forgiven;
    samples.forEach(v => s.sampleGuilt(v, true));
    return s;
  }

  it('0 stages cleared earns no bonus', () => {
    expect(scoreStageRun(stage(0, [0, 0]), MODES.conscience)).toBe(0);
  });

  it('4 stages at avg 20 → 1000 + 400', () => {
    expect(scoreStageRun(stage(4, [20, 20]), MODES.conscience)).toBe(1000 + 400);
  });

  it('2 stages at avg 0 → 500 + 250', () => {
    expect(scoreStageRun(stage(2, [0]), MODES.conscience)).toBe(500 + 250);
  });

  it('casual is stages × 250 only', () => {
    expect(scoreStageRun(stage(4, [20], true), MODES.casual)).toBe(1000);
  });

  it('forgiven adds 300 in conscience only', () => {
    expect(scoreStageRun(stage(4, [20], true), MODES.conscience)).toBe(1000 + 400 + 300);
    expect(scoreStageRun(stage(4, [20], true), MODES.casual)).toBe(1000);
  });

  it('samples taken while nobody is awake are ignored', () => {
    const s = new StageStats();
    s.sampleGuilt(80, false);
    expect(s.averageGuilt()).toBe(0);
    s.sampleGuilt(40, true);
    s.sampleGuilt(90, false);
    expect(s.averageGuilt()).toBe(40);
  });

  it('starts with one try and nothing forgiven', () => {
    const s = new StageStats();
    expect([s.tries, s.forgiven, s.stagesCleared]).toEqual([1, false, 0]);
  });
});
