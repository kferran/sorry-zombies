import type { Vec } from './InputSource';

export const STICK_RADIUS = 60;
const DEAD_ZONE = 0.15;
const AIM_MIN_DRAG = 12;

/** Pure two-thumb state: left half is a floating joystick, right half drag-to-aim. */
export class TouchSticks {
  moveVec: Vec = { x: 0, y: 0 };
  aimDir: Vec = { x: 1, y: 0 };
  /** Joystick visuals, or null when no left thumb is down. */
  stick: { origin: Vec; knob: Vec } | null = null;
  private moveId: number | null = null;
  private aimId: number | null = null;
  private aimOrigin: Vec = { x: 0, y: 0 };

  constructor(private readonly width: number) {}

  get firing(): boolean {
    return this.aimId !== null;
  }

  down(id: number, x: number, y: number): void {
    if (x < this.width / 2) {
      if (this.moveId !== null) return;
      this.moveId = id;
      this.stick = { origin: { x, y }, knob: { x, y } };
    } else if (this.aimId === null) {
      this.aimId = id;
      this.aimOrigin = { x, y };
    }
  }

  move(id: number, x: number, y: number): void {
    if (id === this.moveId && this.stick) {
      const { origin } = this.stick;
      const dx = x - origin.x;
      const dy = y - origin.y;
      const len = Math.hypot(dx, dy);
      const clamped = Math.min(len, STICK_RADIUS);
      const nx = len > 0 ? dx / len : 0;
      const ny = len > 0 ? dy / len : 0;
      this.stick.knob = { x: origin.x + nx * clamped, y: origin.y + ny * clamped };
      const strength = clamped / STICK_RADIUS;
      this.moveVec = strength < DEAD_ZONE ? { x: 0, y: 0 } : { x: nx * strength, y: ny * strength };
    } else if (id === this.aimId) {
      const dx = x - this.aimOrigin.x;
      const dy = y - this.aimOrigin.y;
      const len = Math.hypot(dx, dy);
      if (len >= AIM_MIN_DRAG) this.aimDir = { x: dx / len, y: dy / len };
    }
  }

  up(id: number): void {
    if (id === this.moveId) {
      this.moveId = null;
      this.moveVec = { x: 0, y: 0 };
      this.stick = null;
    } else if (id === this.aimId) {
      this.aimId = null;
    }
  }

  /** Forget every thumb, e.g. after a pause swallowed the lift events. Keeps the aim direction. */
  reset(): void {
    this.moveId = null;
    this.aimId = null;
    this.moveVec = { x: 0, y: 0 };
    this.stick = null;
  }
}
