import { TouchSticks } from './touchSticks';
import type { Vec } from './InputSource';

export type TouchButtonId = 'jump' | 'whip' | 'sorry';
export type TouchAction = 'jump' | 'whip' | 'bow';
export type TouchButtonSpec = { id: TouchButtonId; x: number; y: number; r: number; label: string };
export type TouchButtonView = TouchButtonSpec & { pressed: boolean };
/** What the Overlay draws: visible buttons (with pressed state) and the joystick, in game/screen px. */
export type TouchHud = { buttons: TouchButtonView[]; stick: { origin: Vec; knob: Vec } | null };

/** Side-scroller touch buttons, in game (1280×720 screen) coordinates. Sorry shows only with guilt. */
export const TOUCH_BUTTONS: readonly TouchButtonSpec[] = [
  { id: 'jump', x: 1170, y: 610, r: 62, label: 'Jump' },
  { id: 'whip', x: 1030, y: 640, r: 56, label: 'Whip' },
  { id: 'sorry', x: 1100, y: 470, r: 48, label: 'Sorry!' },
];

const ACTION: Record<TouchButtonId, TouchAction> = { jump: 'jump', whip: 'whip', sorry: 'bow' };
/** Horizontal walking ignores less than this much of the stick's x (on top of TouchSticks' own dead zone). */
const X_DEAD_ZONE = 0.15;

/** The button under (x, y), or null. Hidden Sorry is never hit. */
export function buttonAt(x: number, y: number, showSorry: boolean): TouchButtonId | null {
  for (const b of TOUCH_BUTTONS) {
    if (b.id === 'sorry' && !showSorry) continue;
    if (Math.hypot(x - b.x, y - b.y) <= b.r) return b.id;
  }
  return null;
}

/**
 * Pure side-scroller touch state: routes each pointer either to a button (on its down position) or,
 * on the left half, to the floating joystick. Buttons queue their action once per press.
 */
export class TouchPad {
  private sticks: TouchSticks;
  /** Pointer id → the button it went down on. */
  private onButton = new Map<number, TouchButtonId>();
  private queued: Record<TouchAction, boolean> = { jump: false, whip: false, bow: false };

  constructor(private readonly width: number, readonly showSorry: boolean) {
    this.sticks = new TouchSticks(width);
  }

  down(id: number, x: number, y: number): void {
    if (this.onButton.has(id)) return;
    const hit = buttonAt(x, y, this.showSorry);
    if (hit) {
      this.onButton.set(id, hit);
      this.queued[ACTION[hit]] = true;
      return;
    }
    // Only the left half drives the stick; TouchSticks' right-half aim thumb is not used here.
    if (x < this.width / 2) this.sticks.down(id, x, y);
  }

  move(id: number, x: number, y: number): void {
    if (this.onButton.has(id)) return;
    this.sticks.move(id, x, y);
  }

  up(id: number): void {
    if (this.onButton.delete(id)) return;
    this.sticks.up(id);
  }

  /** -1..1 from the stick's horizontal axis. */
  get moveX(): number {
    const x = this.sticks.moveVec.x;
    return Math.abs(x) < X_DEAD_ZONE ? 0 : x;
  }

  get stick(): { origin: Vec; knob: Vec } | null {
    return this.sticks.stick;
  }

  /** True once per press of the action's button. */
  take(action: TouchAction): boolean {
    const v = this.queued[action];
    this.queued[action] = false;
    return v;
  }

  isPressed(id: TouchButtonId): boolean {
    for (const b of this.onButton.values()) if (b === id) return true;
    return false;
  }

  buttons(): TouchButtonView[] {
    return TOUCH_BUTTONS
      .filter(b => b.id !== 'sorry' || this.showSorry)
      .map(b => ({ ...b, pressed: this.isPressed(b.id) }));
  }

  hud(): TouchHud {
    return { buttons: this.buttons(), stick: this.stick };
  }

  /** Forget every thumb and queued press, e.g. after a pause swallowed the lift events. */
  reset(): void {
    this.sticks.reset();
    this.onButton.clear();
    this.queued = { jump: false, whip: false, bow: false };
  }
}

/** A host scene with touch controls to show; the Overlay asks it every frame (null: none). */
export type TouchHudHost = { touchHud(): TouchHud | null };

export function hasTouchHud(scene: unknown): scene is TouchHudHost {
  return typeof (scene as Partial<TouchHudHost> | undefined)?.touchHud === 'function';
}
