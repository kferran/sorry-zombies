import { describe, it, expect } from 'vitest';
import { HitStop, mergeHeld } from './HitStop';

describe('HitStop', () => {
  it('is idle until started', () => {
    const h = new HitStop();
    expect(h.active).toBe(false);
    expect(h.tick(16)).toBe('idle');
  });

  it('holds for the given ms of real frame time, then ends once', () => {
    const h = new HitStop();
    h.start(90);
    expect(h.active).toBe(true);
    expect(h.tick(16.7)).toBe('frozen');
    expect(h.tick(16.7)).toBe('frozen');
    expect(h.tick(16.7)).toBe('frozen');
    expect(h.tick(16.7)).toBe('frozen');
    expect(h.tick(16.7)).toBe('frozen'); // 83.5 ms
    expect(h.tick(16.7)).toBe('ended'); // 100.2 ms
    expect(h.active).toBe(false);
    expect(h.tick(16.7)).toBe('idle');
  });

  it('ends on the frame that reaches the duration exactly', () => {
    const h = new HitStop();
    h.start(90);
    expect(h.tick(45)).toBe('frozen');
    expect(h.tick(45)).toBe('ended');
  });

  it('a start while frozen extends to the longer of the two', () => {
    const h = new HitStop();
    h.start(90);
    h.tick(60);
    h.start(90);
    expect(h.tick(60)).toBe('frozen');
    expect(h.tick(30)).toBe('ended');
  });
});

describe('mergeHeld', () => {
  const playing = (s: { playing: boolean }) => s.playing;

  it('holds the playing ones of a first start', () => {
    const a = { playing: true }, b = { playing: false };
    expect(mergeHeld([], [a, b], playing)).toEqual([a]);
  });

  it('a second start keeps the sprites already held (now paused) and adds newly playing ones once', () => {
    const a = { playing: true }, b = { playing: true }, c = { playing: true };
    let held = mergeHeld([], [a, b], playing);
    a.playing = false; b.playing = false; // the first start paused them
    held = mergeHeld(held, [a, b, c, c], playing);
    expect(held).toEqual([a, b, c]);
  });
});
