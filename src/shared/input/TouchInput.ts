import Phaser from 'phaser';
import type { InputSource, Vec } from './InputSource';

const STICK_RADIUS = 60;
const DEAD_ZONE = 0.15;
const AIM_MIN_DRAG = 12;

/**
 * Two-thumb touch controls: a floating joystick on the left half, drag-to-aim with
 * auto-fire on the right half, and an optional "Sorry!" button.
 */
export class TouchInput implements InputSource {
  private moveId: number | null = null;
  private moveOrigin = new Phaser.Math.Vector2();
  private moveVec: Vec = { x: 0, y: 0 };
  private aimId: number | null = null;
  private aimOrigin = new Phaser.Math.Vector2();
  private aimDir: Vec = { x: 1, y: 0 };
  private apologyQueued = false;
  private stickBase: Phaser.GameObjects.Arc;
  private stickKnob: Phaser.GameObjects.Arc;
  private sorry?: Phaser.GameObjects.Container;

  constructor(private scene: Phaser.Scene, showSorryButton: boolean) {
    this.stickBase = scene.add.circle(0, 0, STICK_RADIUS, 0xffffff, 0.12).setStrokeStyle(2, 0xffffff, 0.4).setDepth(950).setVisible(false);
    this.stickKnob = scene.add.circle(0, 0, 26, 0xffffff, 0.35).setDepth(951).setVisible(false);
    if (showSorryButton) this.sorry = this.makeSorryButton();
    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.input.on('pointerupoutside', this.onUp, this);
  }

  move(): Vec {
    return this.moveVec;
  }

  aim(heroPos: Vec): Vec | null {
    return { x: heroPos.x + this.aimDir.x * 100, y: heroPos.y + this.aimDir.y * 100 };
  }

  firing(): boolean {
    return this.aimId !== null;
  }

  apologizePressed(): boolean {
    const pressed = this.apologyQueued;
    this.apologyQueued = false;
    return pressed;
  }

  destroy(): void {
    this.scene.input.off('pointerdown', this.onDown, this);
    this.scene.input.off('pointermove', this.onMove, this);
    this.scene.input.off('pointerup', this.onUp, this);
    this.scene.input.off('pointerupoutside', this.onUp, this);
    this.stickBase.destroy();
    this.stickKnob.destroy();
    this.sorry?.destroy();
  }

  private makeSorryButton(): Phaser.GameObjects.Container {
    const { width, height } = this.scene.scale;
    const bg = this.scene.add.circle(0, 0, 52, 0xfacc15, 0.85).setStrokeStyle(3, 0xffffff);
    const label = this.scene.add.text(0, 0, 'Sorry!', {
      fontFamily: 'monospace', fontSize: '22px', color: '#111111',
    }).setOrigin(0.5);
    return this.scene.add.container(width - 110, height - 290, [bg, label]).setDepth(960);
  }

  private onSorry(p: Phaser.Input.Pointer): boolean {
    if (!this.sorry) return false;
    return Phaser.Math.Distance.Between(p.x, p.y, this.sorry.x, this.sorry.y) <= 56;
  }

  private onDown(p: Phaser.Input.Pointer): void {
    if (this.onSorry(p)) {
      this.apologyQueued = true;
      return;
    }
    if (p.x < this.scene.scale.width / 2) {
      if (this.moveId !== null) return;
      this.moveId = p.id;
      this.moveOrigin.set(p.x, p.y);
      this.stickBase.setPosition(p.x, p.y).setVisible(true);
      this.stickKnob.setPosition(p.x, p.y).setVisible(true);
    } else if (this.aimId === null) {
      this.aimId = p.id;
      this.aimOrigin.set(p.x, p.y);
    }
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (p.id === this.moveId) {
      const dx = p.x - this.moveOrigin.x;
      const dy = p.y - this.moveOrigin.y;
      const len = Math.hypot(dx, dy);
      const clamped = Math.min(len, STICK_RADIUS);
      const nx = len > 0 ? dx / len : 0;
      const ny = len > 0 ? dy / len : 0;
      this.stickKnob.setPosition(this.moveOrigin.x + nx * clamped, this.moveOrigin.y + ny * clamped);
      const strength = clamped / STICK_RADIUS;
      this.moveVec = strength < DEAD_ZONE ? { x: 0, y: 0 } : { x: nx * strength, y: ny * strength };
    } else if (p.id === this.aimId) {
      const dx = p.x - this.aimOrigin.x;
      const dy = p.y - this.aimOrigin.y;
      const len = Math.hypot(dx, dy);
      if (len >= AIM_MIN_DRAG) this.aimDir = { x: dx / len, y: dy / len };
    }
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (p.id === this.moveId) {
      this.moveId = null;
      this.moveVec = { x: 0, y: 0 };
      this.stickBase.setVisible(false);
      this.stickKnob.setVisible(false);
    } else if (p.id === this.aimId) {
      this.aimId = null;
    }
  }
}
