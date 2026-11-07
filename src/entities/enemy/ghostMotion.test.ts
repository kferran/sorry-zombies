import { describe, it, expect } from 'vitest';
import { driftVelocity, bobOffset, fadeInAlpha, ghostTarget } from './ghostMotion';

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

describe('ghostTarget', () => {
  // Hero body centre (100, 172): 20 wide, 40 tall, so its top is 152. The whip band is top+8..top+28.
  const hero = { x: 100, y: 172 };

  it('aims at whip height', () => {
    expect(ghostTarget(hero, 160).y).toBe(152 + 8 + 10);
    expect(ghostTarget(hero, 40).y).toBe(170);
  });

  it('aims beside the hero on the side the ghost comes from', () => {
    expect(ghostTarget(hero, 160).x).toBe(116);
    expect(ghostTarget(hero, 40).x).toBe(84);
  });

  it('a ghost settled on the target is inside a grounded swing facing it, and just touching the hero', () => {
    const t = ghostTarget(hero, 160);
    const ghost = { left: t.x - 9, right: t.x + 9, top: t.y - 18, bottom: t.y + 18 };
    const whip = { left: 110, right: 134, top: 160, bottom: 180 };
    const body = { left: 90, right: 110, top: 152, bottom: 192 };
    const overlaps = (a: typeof ghost, b: typeof ghost) =>
      a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    expect(overlaps(ghost, whip)).toBe(true);
    expect(overlaps(ghost, body)).toBe(true);
  });

  it('straight overhead, it picks its facing side', () => {
    expect(ghostTarget(hero, 100, 1).x).toBe(116);
    expect(ghostTarget(hero, 100, -1).x).toBe(84);
  });
});
