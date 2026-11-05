export type WaveSpec = {
  wave: number;
  count: number;
  spawnIntervalMs: number;
  speedMultiplier: number;
  /** Fraction of the wave that is joggers. */
  joggerShare: number;
};

/** Tuning table. Change numbers here for balance; WaveDirector.test.ts pins the formula. */
export const WAVES: WaveSpec[] = Array.from({ length: 10 }, (_, i) => {
  const n = i + 1;
  return {
    wave: n,
    count: 3 * n + 3,
    spawnIntervalMs: Math.max(400, 1500 - 110 * (n - 1)),
    speedMultiplier: 1 + 0.04 * (n - 1),
    joggerShare: n < 5 ? 0 : 0.2 + 0.02 * (n - 5),
  };
});

/** Banner subtitles, one per wave: "Wave {n}: {subtitle}". */
export const WAVE_SUBTITLES: string[] = [
  'Oh no, visitors',
  'More of them. Sorry in advance',
  'They brought friends',
  'They seem upset',
  'Some of them jog now',
  'This is getting personal',
  'They have families, probably',
  'Nobody wanted this',
  'Deep breaths',
  'The last wave. Truly sorry',
];
