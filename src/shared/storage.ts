type Backing = Pick<Storage, 'getItem' | 'setItem'>;

export type Store = {
  get(key: string): string | null;
  set(key: string, value: string): void;
};

const PREFIX = 'sorry-zombies:';

/** Storage that never throws: blocked, full or missing storage reads as empty. */
export function makeStore(backing?: Backing): Store {
  const resolve = (): Backing | undefined => {
    if (backing) return backing;
    try {
      return globalThis.localStorage ?? undefined;
    } catch {
      return undefined;
    }
  };
  return {
    get(key) {
      try {
        return resolve()?.getItem(PREFIX + key) ?? null;
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        resolve()?.setItem(PREFIX + key, value);
      } catch {
        // Storage unavailable: best scores simply aren't kept.
      }
    },
  };
}
