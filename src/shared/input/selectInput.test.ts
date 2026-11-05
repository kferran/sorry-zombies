import { describe, it, expect } from 'vitest';
import { chooseInput, getInputPref, setInputPref, nextInputPref } from './selectInput';
import { makeStore } from '../storage';

function memoryStore() {
  const data = new Map<string, string>();
  return makeStore({ getItem: k => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) });
}

describe('chooseInput', () => {
  it('auto picks touch when touch exists', () => expect(chooseInput('auto', true)).toBe('touch'));
  it('auto picks mouse otherwise', () => expect(chooseInput('auto', false)).toBe('mouse'));
  it('explicit preference wins', () => {
    expect(chooseInput('mouse', true)).toBe('mouse');
    expect(chooseInput('touch', false)).toBe('touch');
  });
});

describe('input preference storage', () => {
  it('defaults to auto', () => expect(getInputPref(memoryStore())).toBe('auto'));
  it('round-trips a preference', () => {
    const store = memoryStore();
    setInputPref('touch', store);
    expect(getInputPref(store)).toBe('touch');
  });
  it('unknown stored value reads as auto', () => {
    const store = memoryStore();
    store.set('inputPref', 'joystick-of-doom');
    expect(getInputPref(store)).toBe('auto');
  });
  it('the menu toggle cycles Auto → Touch → Mouse → Auto', () => {
    expect([nextInputPref('auto'), nextInputPref('touch'), nextInputPref('mouse')]).toEqual(['touch', 'mouse', 'auto']);
  });
});
