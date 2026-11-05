import { describe, it, expect } from 'vitest';
import { BossBrain } from './BossBrain';

const hits = (b: BossBrain, n: number) => { for (let i = 0; i < n; i++) b.hit(); };

describe('BossBrain', () => {
  it('starts in phase 1', () => {
    const b = new BossBrain(true);
    expect([b.state, b.phase, b.pause, b.accepted]).toEqual(['phase', 1, 0, 0]);
  });

  it('4 hits end phase 1 and start listening', () => {
    const b = new BossBrain(true);
    hits(b, 3);
    expect(b.state).toBe('phase');
    expect(b.hit()).toBe('counted');
    expect(b.state).toBe('listening');
    expect(b.pause).toBe(1);
  });

  it('hits during listening are ignored', () => {
    const b = new BossBrain(true);
    hits(b, 4);
    expect(b.hit()).toBe('ignored');
    expect(b.state).toBe('listening');
    expect(b.endPause()).toBe('phase');
    hits(b, 3);
    expect(b.state).toBe('phase');
  });

  it('endPause moves to phase 2', () => {
    const b = new BossBrain(true);
    hits(b, 4);
    expect(b.endPause()).toBe('phase');
    expect(b.phase).toBe(2);
  });

  it('endPause outside listening changes nothing', () => {
    const b = new BossBrain(true);
    expect(b.endPause()).toBe('phase');
    expect(b.phase).toBe(1);
  });

  it('12 hits across phases reach the third pause', () => {
    const b = new BossBrain(true);
    hits(b, 4); b.endPause();
    hits(b, 4);
    expect(b.pause).toBe(2);
    b.endPause();
    expect(b.phase).toBe(3);
    hits(b, 4);
    expect(b.state).toBe('listening');
    expect(b.pause).toBe(3);
  });

  it('bow accepted only in Full Conscience while listening, once per pause', () => {
    const b = new BossBrain(true);
    expect(b.bow()).toBe(false);
    hits(b, 4);
    expect(b.bow()).toBe(true);
    expect(b.bow()).toBe(false);
    expect(b.accepted).toBe(1);
    b.endPause();
    expect(b.bow()).toBe(false);
  });

  it('a bow lowers the next phase\'s raises by 1', () => {
    const b = new BossBrain(true);
    expect(b.raisesForPhase(1)).toBe(0);
    expect(b.raisesForPhase(2)).toBe(2);
    expect(b.raisesForPhase(3)).toBe(3);
    hits(b, 4); b.bow(); b.endPause();
    expect(b.raisesForPhase(2)).toBe(1);
    expect(b.raisesForPhase(3)).toBe(3);
    hits(b, 4); b.bow(); b.endPause();
    expect(b.raisesForPhase(3)).toBe(2);
  });

  it('three bows -> forgiven at the third pause', () => {
    const b = new BossBrain(true);
    for (let i = 0; i < 3; i++) { hits(b, 4); b.bow(); b.endPause(); }
    expect(b.state).toBe('forgiven');
    expect(b.accepted).toBe(3);
    expect(b.hit()).toBe('ignored');
  });

  it('two bows -> defeated', () => {
    const b = new BossBrain(true);
    hits(b, 4); b.bow(); b.endPause();
    hits(b, 4); b.endPause();
    hits(b, 4); b.bow();
    expect(b.endPause()).toBe('defeated');
    expect(b.accepted).toBe(2);
    expect(b.hit()).toBe('ignored');
  });

  it('casual -> always defeated', () => {
    const b = new BossBrain(false);
    for (let i = 0; i < 3; i++) { hits(b, 4); expect(b.bow()).toBe(false); b.endPause(); }
    expect(b.state).toBe('defeated');
    expect(b.accepted).toBe(0);
    expect(b.raisesForPhase(2)).toBe(2);
  });

  it('swoop intervals by phase', () => {
    const b = new BossBrain(true);
    expect(b.swoopIntervalMs()).toBe(3000);
    hits(b, 4); b.endPause();
    expect(b.swoopIntervalMs()).toBe(2500);
    hits(b, 4); b.endPause();
    expect(b.swoopIntervalMs()).toBe(2000);
  });
});
