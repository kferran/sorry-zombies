import { describe, it, expect } from 'vitest';
import { driftVelocity, bobOffset, fadeInAlpha } from './ghostMotion';

describe('driftVelocity', () => {
  it('heads straight for the hero at the given speed', () => {
    const v = driftVelocity(30, -40, 25);
    expect(v.vx).toBeCloseTo(15);
    expect(v.vy).toBeCloseTo(-20);
    expect(Math.hypot(v.vx, v.vy)).toBeCloseTo(25);
  });

  it('stops when it is on top of the hero', () => {
    expect(driftVelocity(0.5, -0.5, 25)).toEqual({ vx: 0, vy: 0 });
  });
});

describe('bobOffset', () => {
  it('bobs ±3 px at 1.5 Hz', () => {
    expect(bobOffset(0)).toBeCloseTo(0);
    expect(bobOffset(1000 / 6)).toBeCloseTo(3); // a quarter period
    expect(bobOffset(1000 / 2)).toBeCloseTo(-3); // three quarters
    expect(bobOffset(1000 / 1.5)).toBeCloseTo(0); // one period
    for (let t = 0; t < 2000; t += 37) expect(Math.abs(bobOffset(t))).toBeLessThanOrEqual(3);
  });
});

describe('fadeInAlpha', () => {
  it('goes from 0 to 1 over the fade', () => {
    expect(fadeInAlpha(0, 400)).toBe(0);
    expect(fadeInAlpha(200, 400)).toBeCloseTo(0.5);
    expect(fadeInAlpha(400, 400)).toBe(1);
    expect(fadeInAlpha(900, 400)).toBe(1);
  });
});
