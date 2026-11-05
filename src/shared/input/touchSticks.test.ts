import { describe, it, expect } from 'vitest';
import { TouchSticks } from './touchSticks';

const W = 1280;

describe('TouchSticks', () => {
  it('left thumb moves, right thumb aims and fires', () => {
    const t = new TouchSticks(W);
    t.down(1, 200, 500); t.down(2, 1000, 500);
    t.move(1, 260, 500); t.move(2, 1000, 400);
    expect(t.moveVec.x).toBeCloseTo(1);
    expect(t.aimDir).toEqual({ x: 0, y: -1 });
    expect(t.firing).toBe(true);
  });

  it('lifting thumbs stops movement and firing', () => {
    const t = new TouchSticks(W);
    t.down(1, 200, 500); t.move(1, 260, 500); t.down(2, 1000, 500);
    t.up(1); t.up(2);
    expect(t.moveVec).toEqual({ x: 0, y: 0 });
    expect(t.firing).toBe(false);
  });

  it('reset forgets thumbs whose lift was missed during a pause', () => {
    const t = new TouchSticks(W);
    t.down(1, 200, 500); t.move(1, 260, 500); t.down(2, 1000, 500);
    t.reset();
    expect(t.moveVec).toEqual({ x: 0, y: 0 });
    expect(t.firing).toBe(false);
    expect(t.stick).toBeNull();
    t.down(3, 100, 300); // a fresh left touch is accepted again
    expect(t.stick).toEqual({ origin: { x: 100, y: 300 }, knob: { x: 100, y: 300 } });
  });

  it('ignores tiny drags below the dead zone', () => {
    const t = new TouchSticks(W);
    t.down(1, 200, 500); t.move(1, 205, 500);
    expect(t.moveVec).toEqual({ x: 0, y: 0 });
  });
});
