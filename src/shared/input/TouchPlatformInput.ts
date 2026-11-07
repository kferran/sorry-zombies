import Phaser from 'phaser';
import type { PlatformInput } from './PlatformInput';
import { TouchPad, type TouchHud } from './touchPad';

/**
 * Side-scroller touch controls: left-half floating stick (horizontal axis walks), Jump / Whip / Sorry
 * buttons on the right. Listens to the host scene's pointers in screen space (pointer.x/y, not world);
 * the Overlay draws `hud()`. Deliberately not built on KeyboardPlatformInput, which whips on every tap.
 */
export class TouchPlatformInput implements PlatformInput {
  private pad: TouchPad;

  private readonly onDown = (p: Phaser.Input.Pointer) => this.pad.down(p.id, p.x, p.y);
  private readonly onMove = (p: Phaser.Input.Pointer) => { if (p.isDown) this.pad.move(p.id, p.x, p.y); };
  private readonly onUp = (p: Phaser.Input.Pointer) => this.pad.up(p.id);

  constructor(private scene: Phaser.Scene, showSorry: boolean) {
    this.pad = new TouchPad(scene.scale.width, showSorry);
    const input = scene.input;
    input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown);
    input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove);
    input.on(Phaser.Input.Events.POINTER_UP, this.onUp);
    input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp);
  }

  moveX(): number { return this.pad.moveX; }
  jumpPressed(): boolean { return this.pad.take('jump'); }
  whipPressed(): boolean { return this.pad.take('whip'); }
  bowPressed(): boolean { return this.pad.take('bow'); }

  /** Buttons and stick for the Overlay to draw. */
  hud(): TouchHud { return this.pad.hud(); }

  /** Held thumbs, the stick, pressed buttons and queued presses all go (pause eats the lift events). */
  reset(): void { this.pad.reset(); }

  destroy(): void {
    const input = this.scene.input;
    input.off(Phaser.Input.Events.POINTER_DOWN, this.onDown);
    input.off(Phaser.Input.Events.POINTER_MOVE, this.onMove);
    input.off(Phaser.Input.Events.POINTER_UP, this.onUp);
    input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp);
  }
}
