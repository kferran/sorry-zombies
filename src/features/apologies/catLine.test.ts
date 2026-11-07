import { describe, it, expect } from 'vitest';
import { nameCatLine } from './catLine';
import { LINES } from './lines';

describe('nameCatLine', () => {
  it('fills in every {name}', () => {
    expect(nameCatLine('{name}? Sorry, {name}.', 'Biscuit')).toBe('Biscuit? Sorry, Biscuit.');
  });

  it('prefixes the name when the line has no {name}', () => {
    expect(nameCatLine('Bad kitty.', 'Duchess')).toBe('Sorry, Duchess. Bad kitty.');
  });
});

describe('catKill lines', () => {
  const cat = LINES.filter(l => l.kind === 'catKill');

  it('some name the cat in the middle of the line', () => {
    expect(cat.filter(l => l.text.includes('{name}')).length).toBeGreaterThanOrEqual(2);
  });

  it('still fit the bubble with the longest name', () => {
    for (const l of cat) expect(nameCatLine(l.text, 'Mr. Whiskers').length).toBeLessThanOrEqual(110);
  });

  it('no other kind uses {name}', () => {
    LINES.filter(l => l.kind !== 'catKill').forEach(l => expect(l.text).not.toContain('{name}'));
  });
});
