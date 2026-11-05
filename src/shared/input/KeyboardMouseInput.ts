import Phaser from 'phaser';
import type { InputSource, Vec } from './InputSource';

export class KeyboardMouseInput implements InputSource {
  private keys: Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd', Phaser.Input.Keyboard.Key>;
  private apologyQueued = false;
  private readonly onSpace = (e: KeyboardEvent) => { if (!e.repeat) this.apologyQueued = true; };

  constructor(private scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      up: kb.addKey(K.UP), down: kb.addKey(K.DOWN), left: kb.addKey(K.LEFT), right: kb.addKey(K.RIGHT),
      w: kb.addKey(K.W), a: kb.addKey(K.A), s: kb.addKey(K.S), d: kb.addKey(K.D),
    };
    // An event, not JustDown: a quick tap whose up and down land in one frame still counts.
    kb.addCapture(K.SPACE);
    kb.on('keydown-SPACE', this.onSpace);
  }

  move(): Vec {
    const k = this.keys;
    const x = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
    const y = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);
    const len = Math.hypot(x, y);
    return len > 0 ? { x: x / len, y: y / len } : { x: 0, y: 0 };
  }

  aim(): Vec | null {
    const p = this.scene.input.activePointer;
    return { x: p.worldX, y: p.worldY };
  }

  firing(): boolean {
    return this.scene.input.activePointer.leftButtonDown();
  }

  apologizePressed(): boolean {
    const pressed = this.apologyQueued;
    this.apologyQueued = false;
    return pressed;
  }

  reset(): void {
    this.apologyQueued = false;
  }

  destroy(): void {
    Object.values(this.keys).forEach(key => this.scene.input.keyboard?.removeKey(key));
    this.scene.input.keyboard?.off('keydown-SPACE', this.onSpace);
  }
}
