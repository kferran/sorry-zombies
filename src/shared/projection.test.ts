import { describe, expect, it } from 'vitest';
import { worldToScreen } from './projection';

describe('worldToScreen', () => {
  it('maps the view origin to the viewport origin', () => {
    expect(worldToScreen({ x: 100, y: 40 }, { x: 100, y: 40 }, 3)).toEqual({ x: 0, y: 0 });
  });

  it('scales the offset from the view by zoom', () => {
    expect(worldToScreen({ x: 110, y: 50 }, { x: 100, y: 40 }, 3)).toEqual({ x: 30, y: 30 });
  });

  it('adds the viewport position', () => {
    expect(worldToScreen({ x: 1, y: 2 }, { x: 0, y: 0 }, 2, { x: 10, y: 20 })).toEqual({ x: 12, y: 24 });
  });
});
