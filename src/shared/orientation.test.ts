import { describe, it, expect } from 'vitest';
import { needsLandscape } from './orientation';

describe('needsLandscape', () => {
  it('asks a portrait phone to rotate', () => expect(needsLandscape(412, 915, true)).toBe(true));
  it('leaves a landscape phone alone', () => expect(needsLandscape(915, 412, true)).toBe(false));
  it('never blocks a tall desktop window', () => expect(needsLandscape(960, 1040, false)).toBe(false));
});
