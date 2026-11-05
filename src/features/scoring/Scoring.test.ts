import { describe, it, expect } from 'vitest';
import { RunStats, scoreRun, gradeFor, conscienceBonus } from './Scoring';
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
