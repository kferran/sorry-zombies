import type { Tier } from '../../features/apologies/ApologyPicker';

export type Stage = { key: string; name: string; tier: Tier };

export const STAGES: readonly Stage[] = [
  { key: 'level-1', name: 'The Gate', tier: 1 },
  { key: 'level-2', name: 'The Old Graves', tier: 2 },
  { key: 'level-3', name: 'Mausoleum Hill', tier: 3 },
  { key: 'boss', name: 'The Groundskeeper', tier: 3 },
];
