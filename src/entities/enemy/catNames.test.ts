import { describe, it, expect } from 'vitest';
import { CAT_NAMES, catNameFor } from './catNames';

describe('catNameFor', () => {
  it('uses the name from the map when there is one', () => {
    expect(catNameFor(7, 'Mittens')).toBe('Mittens');
  });

  it('ignores a blank map name', () => {
    expect(CAT_NAMES).toContain(catNameFor(7, '  '));
  });

  it('otherwise picks from the list, the same every time for the same enemy', () => {
    expect(CAT_NAMES).toEqual(['Mr. Whiskers', 'Biscuit', 'Duchess', 'Sir Pounce']);
    for (let id = 1; id <= 12; id++) {
      expect(CAT_NAMES).toContain(catNameFor(id));
      expect(catNameFor(id)).toBe(catNameFor(id));
    }
  });

  it('consecutive enemies get different names', () => {
    const names = [1, 2, 3, 4].map(id => catNameFor(id));
    expect(new Set(names).size).toBe(4);
  });
});
