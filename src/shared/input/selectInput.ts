import { makeStore, type Store } from '../storage';

export type InputPref = 'auto' | 'touch' | 'mouse';
const PREFS: InputPref[] = ['auto', 'touch', 'mouse'];
const KEY = 'inputPref';
const defaultStore = makeStore();

export function chooseInput(pref: InputPref, hasTouch: boolean): 'touch' | 'mouse' {
  if (pref === 'auto') return hasTouch ? 'touch' : 'mouse';
  return pref;
}

export function getInputPref(store: Store = defaultStore): InputPref {
  const raw = store.get(KEY);
  return PREFS.includes(raw as InputPref) ? (raw as InputPref) : 'auto';
}

export function setInputPref(pref: InputPref, store: Store = defaultStore): void {
  store.set(KEY, pref);
}

export function nextInputPref(pref: InputPref): InputPref {
  return PREFS[(PREFS.indexOf(pref) + 1) % PREFS.length];
}
