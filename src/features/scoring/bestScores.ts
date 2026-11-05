import type { ModeId } from '../../shared/modes';
import { makeStore, type Store } from '../../shared/storage';

const defaultStore = makeStore();
const key = (modeId: ModeId) => `best:${modeId}`;

export function getBest(modeId: ModeId, store: Store = defaultStore): number | null {
  const raw = store.get(key(modeId));
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Saves the score if it beats the stored best; returns whether it did. */
export function saveIfBest(modeId: ModeId, score: number, store: Store = defaultStore): boolean {
  const best = getBest(modeId, store);
  if (best !== null && score <= best) return false;
  store.set(key(modeId), String(score));
  return true;
}
