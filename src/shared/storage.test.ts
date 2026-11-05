import { describe, it, expect, afterEach, vi } from 'vitest';
import { makeStore } from './storage';

function memory() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}

describe('makeStore', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('round-trips a value', () => {
    const store = makeStore(memory());
    store.set('best', '700');
    expect(store.get('best')).toBe('700');
  });

  it('returns null and does not throw when getItem throws', () => {
    const store = makeStore({ getItem: () => { throw new Error('blocked'); }, setItem: () => {} });
    expect(store.get('best')).toBeNull();
  });

  it('does not throw when setItem throws', () => {
    const store = makeStore({ getItem: () => null, setItem: () => { throw new Error('full'); } });
    expect(() => store.set('best', '1')).not.toThrow();
  });

  it('returns null when no backing exists', () => {
    vi.stubGlobal('localStorage', undefined);
    const store = makeStore();
    expect(store.get('best')).toBeNull();
    expect(() => store.set('best', '1')).not.toThrow();
  });

  it('prefixes keys', () => {
    const backing = memory();
    makeStore(backing).set('best', '5');
    expect(backing.getItem('sorry-zombies:best')).toBe('5');
  });
});
