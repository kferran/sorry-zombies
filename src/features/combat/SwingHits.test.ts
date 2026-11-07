import { describe, it, expect } from 'vitest';
import { SwingHits, swingLineKind } from './SwingHits';

describe('SwingHits', () => {
  it('admits each enemy at most once per swing', () => {
    const s = new SwingHits();
    s.begin();
    expect(s.admit(1)).toBe(true);
    expect(s.admit(2)).toBe(true);
    expect(s.admit(1)).toBe(false);
    expect(s.admit(2)).toBe(false);
  });

  it('a new swing forgets the last one', () => {
    const s = new SwingHits();
    s.begin();
    s.admit(1);
    s.begin();
    expect(s.admit(1)).toBe(true);
  });

  it('admits nothing before the first swing', () => {
    expect(new SwingHits().admit(1)).toBe(false);
  });
});

describe('swingLineKind', () => {
  it('says nothing when nothing was struck', () => {
    expect(swingLineKind([])).toBeNull();
    expect(swingLineKind(['ignored'])).toBeNull();
  });

  it('says a hit line for hits', () => {
    expect(swingLineKind(['hit'])).toBe('hit');
    expect(swingLineKind(['hit', 'hit', 'ignored'])).toBe('hit');
  });

  it('a put-down beats a hit', () => {
    expect(swingLineKind(['hit', 'killed'])).toBe('kill');
    expect(swingLineKind(['killed', 'hit'])).toBe('kill');
  });
});

describe('swingLineKind with enemy kinds', () => {
  it('a ghost put-down says a ghostKill line', () => {
    expect(swingLineKind(['killed'], ['ghost'])).toBe('ghostKill');
  });

  it('a cat put-down says a catKill line', () => {
    expect(swingLineKind(['killed'], ['cat'])).toBe('catKill');
  });

  it('a skeleton put-down still says a kill line', () => {
    expect(swingLineKind(['killed'], ['skeleton'])).toBe('kill');
  });

  it('hitting a cat (not putting it down) says a hit line', () => {
    expect(swingLineKind(['hit'], ['cat'])).toBe('hit');
  });

  it('several put-downs in one swing: cat beats ghost beats skeleton', () => {
    expect(swingLineKind(['killed', 'killed'], ['skeleton', 'ghost'])).toBe('ghostKill');
    expect(swingLineKind(['killed', 'killed', 'killed'], ['ghost', 'cat', 'skeleton'])).toBe('catKill');
    expect(swingLineKind(['killed', 'hit'], ['skeleton', 'cat'])).toBe('kill');
  });
});
