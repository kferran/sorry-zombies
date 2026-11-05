export type Vec = { x: number; y: number };

export interface InputSource {
  /** -1..1 per axis; length at most 1. */
  move(): Vec;
  /** World point to aim at, or null when not aiming. */
  aim(heroPos: Vec): Vec | null;
  firing(): boolean;
  /** True once per press. */
  apologizePressed(): boolean;
  /** Drop held state; called when the game pauses or resumes, since input events stop while paused. */
  reset(): void;
  destroy(): void;
}
