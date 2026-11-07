import { describe, it, expect } from 'vitest';
import { TOUCH_BUTTONS, TouchPad, buttonAt } from './touchPad';

const W = 1280;
const at = (id: 'jump' | 'whip' | 'sorry') => TOUCH_BUTTONS.find(b => b.id === id)!;

describe('touch button layout', () => {
  it('matches the agreed screen positions', () => {
    expect(at('jump')).toMatchObject({ x: 1170, y: 610, r: 62, label: 'Jump' });
    expect(at('whip')).toMatchObject({ x: 1030, y: 640, r: 56, label: 'Whip' });
    expect(at('sorry')).toMatchObject({ x: 1100, y: 470, r: 48, label: 'Sorry!' });
  });

  it('buttons do not overlap each other or reach the left half', () => {
    for (const a of TOUCH_BUTTONS) {
      expect(a.x - a.r).toBeGreaterThan(W / 2);
      for (const b of TOUCH_BUTTONS) {
        if (a === b) continue;
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(a.r + b.r);
      }
    }
  });

  it('buttonAt hit-tests circles and skips hidden buttons', () => {
    expect(buttonAt(1170, 610, true)).toBe('jump');
    expect(buttonAt(1170 + 61, 610, true)).toBe('jump');
    expect(buttonAt(1170 + 63, 610, true)).toBeNull();
    expect(buttonAt(1030, 640, false)).toBe('whip');
    expect(buttonAt(1100, 470, true)).toBe('sorry');
    expect(buttonAt(1100, 470, false)).toBeNull();
    expect(buttonAt(300, 500, true)).toBeNull();
  });
});

describe('TouchPad', () => {
  it('left thumb walks on the horizontal axis only', () => {
    const p = new TouchPad(W, false);
    p.down(1, 200, 500);
    p.move(1, 260, 500);
    expect(p.moveX).toBeCloseTo(1);
    p.move(1, 140, 500);
    expect(p.moveX).toBeCloseTo(-1);
    p.move(1, 200, 440); // straight up: no walking
    expect(p.moveX).toBe(0);
    p.up(1);
    expect(p.moveX).toBe(0);
  });

  it('a tiny horizontal drift inside the dead zone does not walk', () => {
    const p = new TouchPad(W, false);
    p.down(1, 200, 500);
    p.move(1, 205, 445); // strong upward drag, slight drift right
    expect(p.moveX).toBe(0);
  });

  it('buttons queue once per press, holding does not repeat', () => {
    const p = new TouchPad(W, false);
    p.down(2, 1030, 640);
    expect(p.take('whip')).toBe(true);
    expect(p.take('whip')).toBe(false);
    p.move(2, 1035, 645);
    expect(p.take('whip')).toBe(false);
    expect(p.isPressed('whip')).toBe(true);
    p.up(2);
    expect(p.isPressed('whip')).toBe(false);
    p.down(3, 1030, 640);
    expect(p.take('whip')).toBe(true);
  });

  it('walks with the left thumb while the right taps jump and whip', () => {
    const p = new TouchPad(W, false);
    p.down(1, 200, 500); p.move(1, 260, 500);
    p.down(2, 1170, 610); p.up(2);
    p.down(3, 1030, 640);
    expect(p.moveX).toBeCloseTo(1);
    expect(p.take('jump')).toBe(true);
    expect(p.take('whip')).toBe(true);
    p.up(3);
    expect(p.moveX).toBeCloseTo(1);
  });

  it('a pointer that went down on a button never moves the stick, even dragged left', () => {
    const p = new TouchPad(W, false);
    p.down(2, 1030, 640);
    p.move(2, 300, 640);
    expect(p.stick).toBeNull();
    expect(p.moveX).toBe(0);
  });

  it('right-half taps off the buttons do nothing', () => {
    const p = new TouchPad(W, true);
    p.down(2, 900, 200);
    p.move(2, 960, 200);
    expect(p.moveX).toBe(0);
    expect(p.stick).toBeNull();
    for (const a of ['jump', 'whip', 'bow'] as const) expect(p.take(a)).toBe(false);
  });

  it('Sorry queues a bow only when shown', () => {
    const shown = new TouchPad(W, true);
    shown.down(2, 1100, 470);
    expect(shown.take('bow')).toBe(true);
    const hidden = new TouchPad(W, false);
    hidden.down(2, 1100, 470);
    expect(hidden.take('bow')).toBe(false);
    expect(hidden.buttons().map(b => b.id)).toEqual(['jump', 'whip']);
    expect(shown.buttons().map(b => b.id)).toEqual(['jump', 'whip', 'sorry']);
  });

  it('reset forgets held thumbs, the stick, pressed buttons and queued presses', () => {
    const p = new TouchPad(W, true);
    p.down(1, 200, 500); p.move(1, 260, 500);
    p.down(2, 1030, 640);
    p.down(3, 1170, 610);
    p.reset();
    expect(p.moveX).toBe(0);
    expect(p.stick).toBeNull();
    expect(p.buttons().some(b => b.pressed)).toBe(false);
    expect(p.take('whip')).toBe(false);
    expect(p.take('jump')).toBe(false);
    // Lifts that arrive after the reset are harmless; a later drag of the old id does nothing.
    p.move(1, 300, 500);
    expect(p.moveX).toBe(0);
    p.up(1); p.up(2); p.up(3);
    p.down(4, 200, 500); p.move(4, 260, 500);
    expect(p.moveX).toBeCloseTo(1);
  });

  it('a second left thumb does not steal the stick', () => {
    const p = new TouchPad(W, false);
    p.down(1, 200, 500); p.move(1, 260, 500);
    p.down(2, 100, 300); p.move(2, 40, 300);
    expect(p.moveX).toBeCloseTo(1);
  });
});
