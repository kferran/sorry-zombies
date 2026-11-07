import { describe, it, expect } from 'vitest';
import { PounceBrain, type PounceInput } from './PounceBrain';

const cfg = { vx: 110, vy: -180, gapMs: 900, windupMs: 300, minAirMs: 100 };
const at = (now: number, over: Partial<PounceInput> = {}): PounceInput =>
  ({ now, grounded: true, dx: -50, listening: false, ...over });

describe('PounceBrain', () => {
  it('winds up after waking, then pounces toward the hero', () => {
    const b = new PounceBrain(cfg);
    b.wake(1000);
    expect(b.tick(at(1100))).toEqual({ order: 'stop' });
    expect(b.tick(at(1300))).toEqual({ order: 'leap', vx: -110, vy: -180 });
    expect(b.phase).toBe('flying');
  });

  it('pounces right when the hero is to the right', () => {
    const b = new PounceBrain(cfg);
    b.wake(0);
    expect(b.tick(at(300, { dx: 40 }))).toEqual({ order: 'leap', vx: 110, vy: -180 });
  });

  it('lands, then rests 900 ms before the next pounce', () => {
    const b = new PounceBrain(cfg);
    b.wake(0);
    b.tick(at(300));
    // Still on the ground the frame after the leap: not a landing yet.
    expect(b.tick(at(316))).toEqual({ order: 'none' });
    expect(b.tick(at(500, { grounded: false }))).toEqual({ order: 'none' });
    expect(b.tick(at(700))).toEqual({ order: 'stop' }); // lands
    expect(b.phase).toBe('resting');
    expect(b.tick(at(1599))).toEqual({ order: 'stop' });
    expect(b.tick(at(1600)).order).toBe('leap');
  });

  it('does not pounce while listening to an apology', () => {
    const b = new PounceBrain(cfg);
    b.wake(0);
    expect(b.tick(at(2000, { listening: true }))).toEqual({ order: 'stop' });
    expect(b.tick(at(2016)).order).toBe('leap');
  });

  it('leaves a knocked-back cat alone until it lands', () => {
    const b = new PounceBrain(cfg);
    b.wake(0);
    expect(b.tick(at(5000, { grounded: false }))).toEqual({ order: 'none' });
  });

  it('does nothing before waking', () => {
    const b = new PounceBrain(cfg);
    expect(b.tick(at(5000))).toEqual({ order: 'none' });
  });
});
