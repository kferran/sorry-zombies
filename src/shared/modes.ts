export type ModeId = 'casual' | 'conscience';

export type ModeConfig = {
  id: ModeId;
  label: string;
  guilt: boolean;
  /** Multiplies zombie count and speed. */
  waveScale: number;
};

export const MODES: Record<ModeId, ModeConfig> = {
  casual: { id: 'casual', label: 'Casual Remorse', guilt: false, waveScale: 1.0 },
  conscience: { id: 'conscience', label: 'Full Conscience', guilt: true, waveScale: 0.8 },
};
