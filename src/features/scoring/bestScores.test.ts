import { describe, it, expect } from 'vitest';
import { getBest, saveIfBest } from './bestScores';
import { makeStore } from '../../shared/storage';

function memoryStore() {
  const data = new Map<string, string>();
  return makeStore({ getItem: k => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) });
}

describe('bestScores', () => {
  it('saves a higher score and reports true', () => {
    const store = memoryStore();
    expect(saveIfBest('casual', 500, store)).toBe(true);
    expect(getBest('casual', store)).toBe(500);
  });

  it('keeps the old best when lower', () => {
    const store = memoryStore();
    saveIfBest('casual', 500, store);
    expect(saveIfBest('casual', 300, store)).toBe(false);
    expect(getBest('casual', store)).toBe(500);
  });

  it('scores are per mode', () => {
    const store = memoryStore();
    saveIfBest('casual', 500, store);
    expect(getBest('conscience', store)).toBeNull();
  });

  it('returns null for non-numeric stored value', () => {
    const store = memoryStore();
    store.set('best:casual', 'banana');
    expect(getBest('casual', store)).toBeNull();
    expect(saveIfBest('casual', 100, store)).toBe(true);
  });

  it('returns null when storage throws', () => {
    const store = makeStore({ getItem: () => { throw new Error('no'); }, setItem: () => { throw new Error('no'); } });
    expect(getBest('casual', store)).toBeNull();
    expect(() => saveIfBest('casual', 1, store)).not.toThrow();
  });
});
