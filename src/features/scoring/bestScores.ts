import type { ModeId } from '../../shared/modes';
import { makeStore, type Store } from '../../shared/storage';

const defaultStore = makeStore();
export type ScoreGame = 'side' | 'arena';
const key = (game: ScoreGame, modeId: ModeId) => `best:${game}:${modeId}`;

export function getBest(game: ScoreGame, modeId: ModeId, store: Store = defaultStore): number | null {
  const raw = store.get(key(game, modeId));
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Saves the score if it beats the stored best; returns whether it did. */
export function saveIfBest(game: ScoreGame, modeId: ModeId, score: number, store: Store = defaultStore): boolean {
  const best = getBest(game, modeId, store);
  if (best !== null && score <= best) return false;
  store.set(key(game, modeId), String(score));
  return true;
}
