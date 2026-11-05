import { describe, it, expect } from 'vitest';
import { ApologyPicker, tierForWave, type Line } from './ApologyPicker';
import { LINES } from './lines';

const t = (kind: Line['kind'], tier: Line['tier'], text: string): Line => ({ kind, tier, text });

describe('tierForWave', () => {
  it('maps waves to tiers', () => {
    expect([1, 3, 4, 7, 8, 10].map(tierForWave)).toEqual([1, 1, 2, 2, 3, 3]);
  });
});

describe('ApologyPicker', () => {
  const lines: Line[] = [
    t('hit', 1, 'a1'), t('hit', 1, 'a2'),
    t('hit', 2, 'b1'), t('hit', 2, 'b2'), t('hit', 2, 'b3'),
    t('kill', 1, 'k1'),
    { kind: 'apology', text: 'sorry-1' },
  ];

  it('picks only tier 2 hit lines on wave 5', () => {
    const picker = new ApologyPicker(lines);
    for (let i = 0; i < 10; i++) expect(['b1', 'b2', 'b3']).toContain(picker.pick('hit', 5));
  });

  it('no repeats until the group is exhausted', () => {
    const picker = new ApologyPicker(lines);
    const picks = [picker.pick('hit', 5), picker.pick('hit', 5), picker.pick('hit', 5)];
    expect(new Set(picks).size).toBe(3);
  });

  it('reshuffles after exhaustion', () => {
    const picker = new ApologyPicker(lines);
    for (let i = 0; i < 3; i++) picker.pick('hit', 5);
    expect(['b1', 'b2', 'b3']).toContain(picker.pick('hit', 5));
  });

  it('untiered kinds ignore the wave', () => {
    expect(new ApologyPicker(lines).pick('apology', 9)).toBe('sorry-1');
  });

  it('falls back when a group is empty', () => {
    const picker = new ApologyPicker(lines);
    expect(picker.pick('kill', 9)).toBe('k1');
    expect(picker.pick('breakdown')).toBe('Sorry!');
  });
});

describe('LINES', () => {
  const count = (kind: Line['kind'], tier?: Line['tier']) =>
    LINES.filter(l => l.kind === kind && (tier === undefined || l.tier === tier)).length;

  it('ships enough hit and kill lines per tier', () => {
    for (const tier of [1, 2, 3] as const) {
      expect(count('hit', tier)).toBeGreaterThanOrEqual(10);
      expect(count('kill', tier)).toBeGreaterThanOrEqual(8);
    }
  });

  it('ships enough of the untiered kinds', () => {
    expect(count('apology')).toBeGreaterThanOrEqual(8);
    expect(count('breakdown')).toBeGreaterThanOrEqual(4);
    expect(count('summaryWin')).toBeGreaterThanOrEqual(4);
    expect(count('summaryLose')).toBeGreaterThanOrEqual(4);
  });

  it('only hit and kill lines carry a tier', () => {
    LINES.forEach(l => expect(l.tier !== undefined).toBe(l.kind === 'hit' || l.kind === 'kill'));
  });

  it('has no empty or duplicate lines, and none too long for the bubble', () => {
    const texts = LINES.map(l => l.text.trim());
    texts.forEach(text => {
      expect(text.length).toBeGreaterThan(0);
      expect(text.length).toBeLessThanOrEqual(110);
    });
    expect(new Set(texts).size).toBe(texts.length);
  });
});
