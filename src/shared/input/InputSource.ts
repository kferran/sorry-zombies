export type Vec = { x: number; y: number };

export interface InputSource {
  /** -1..1 per axis; length at most 1. */
  move(): Vec;
  /** World point to aim at, or null when not aiming. */
  aim(heroPos: Vec): Vec | null;
  firing(): boolean;
  /** True once per press. */
  apologizePressed(): boolean;
  destroy(): void;
}
