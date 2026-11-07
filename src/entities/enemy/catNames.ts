// Pure: hell-cat name tags. No Phaser imports.

/** Names for cats the map doesn't name. */
export const CAT_NAMES = ['Mr. Whiskers', 'Biscuit', 'Duchess', 'Sir Pounce'] as const;

/** The map's `name` if it has one, else a name from the list picked by enemy id (stable across replays). */
export function catNameFor(enemyId: number, name?: string): string {
  const given = name?.trim();
  if (given) return given;
  return CAT_NAMES[((enemyId % CAT_NAMES.length) + CAT_NAMES.length) % CAT_NAMES.length];
}
