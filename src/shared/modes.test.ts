import { describe, it, expect } from 'vitest';
import { MODES } from './modes';

describe('MODES', () => {
  it('defines Casual Remorse exactly', () => {
    expect(MODES.casual).toEqual({ id: 'casual', label: 'Casual Remorse', guilt: false, waveScale: 1.0 });
  });
  it('defines Full Conscience exactly', () => {
    expect(MODES.conscience).toEqual({ id: 'conscience', label: 'Full Conscience', guilt: true, waveScale: 0.8 });
  });
});
