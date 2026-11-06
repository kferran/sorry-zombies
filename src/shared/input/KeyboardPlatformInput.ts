import Phaser from 'phaser';
import type { PlatformInput } from './PlatformInput';

const K = Phaser.Input.Keyboard.KeyCodes;

type Action = 'jump' | 'whip' | 'bow';

/** ← → / A D walk · W ↑ Space jump · J or left mouse whip · S ↓ bow. */
export class KeyboardPlatformInput implements PlatformInput {
  private held: Phaser.Input.Keyboard.Key[];
  private left: Phaser.Input.Keyboard.Key[];
  private right: Phaser.Input.Keyboard.Key[];
  private queued: Record<Action, boolean> = { jump: false, whip: false, bow: false };

  // Events rather than JustDown, so a tap whose down and up land in one frame still counts.
  private readonly onKey = (e: KeyboardEvent) => {
    if (e.repeat) return;
    switch (e.keyCode) {
      case K.W: case K.UP: case K.SPACE: this.queued.jump = true; break;
      case K.J: this.queued.whip = true; break;
      case K.S: case K.DOWN: this.queued.bow = true; break;
    }
  };

  private readonly onPointer = (p: Phaser.Input.Pointer) => {
    if (p.leftButtonDown()) this.queued.whip = true;
  };

  constructor(private scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    this.left = [kb.addKey(K.LEFT), kb.addKey(K.A)];
    this.right = [kb.addKey(K.RIGHT), kb.addKey(K.D)];
    this.held = [...this.left, ...this.right];
    kb.addCapture([K.SPACE, K.UP, K.DOWN, K.LEFT, K.RIGHT]);
    kb.on('keydown', this.onKey);
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointer);
  }

  moveX(): number {
    const r = this.right.some(k => k.isDown) ? 1 : 0;
    const l = this.left.some(k => k.isDown) ? 1 : 0;
    return r - l;
  }

  jumpPressed(): boolean { return this.take('jump'); }
  whipPressed(): boolean { return this.take('whip'); }
  bowPressed(): boolean { return this.take('bow'); }

  private take(k: Action): boolean {
    const v = this.queued[k];
    this.queued[k] = false;
    return v;
  }

  reset(): void {
    this.queued = { jump: false, whip: false, bow: false };
    // A key released while the scene was paused never sends its keyup to us.
    this.held.forEach(k => k.reset());
  }

  destroy(): void {
    this.held.forEach(k => this.scene.input.keyboard?.removeKey(k));
    this.scene.input.keyboard?.off('keydown', this.onKey);
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onPointer);
  }
}
