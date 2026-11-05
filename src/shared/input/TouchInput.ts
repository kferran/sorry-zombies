import Phaser from 'phaser';
import type { InputSource, Vec } from './InputSource';
import { STICK_RADIUS, TouchSticks } from './touchSticks';

/** Phaser wiring and visuals for TouchSticks, plus the optional "Sorry!" button. */
export class TouchInput implements InputSource {
  private sticks: TouchSticks;
  private apologyQueued = false;
  private stickBase: Phaser.GameObjects.Arc;
  private stickKnob: Phaser.GameObjects.Arc;
  private sorry?: Phaser.GameObjects.Container;

  constructor(private scene: Phaser.Scene, showSorryButton: boolean) {
    this.sticks = new TouchSticks(scene.scale.width);
    this.stickBase = scene.add.circle(0, 0, STICK_RADIUS, 0xffffff, 0.12).setStrokeStyle(2, 0xffffff, 0.4).setDepth(950).setVisible(false);
    this.stickKnob = scene.add.circle(0, 0, 26, 0xffffff, 0.35).setDepth(951).setVisible(false);
    if (showSorryButton) this.sorry = this.makeSorryButton();
    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.input.on('pointerupoutside', this.onUp, this);
  }

  move(): Vec {
    return this.sticks.moveVec;
  }

  aim(heroPos: Vec): Vec | null {
    const d = this.sticks.aimDir;
    return { x: heroPos.x + d.x * 100, y: heroPos.y + d.y * 100 };
  }

  firing(): boolean {
    return this.sticks.firing;
  }

  apologizePressed(): boolean {
    const pressed = this.apologyQueued;
    this.apologyQueued = false;
    return pressed;
  }

  reset(): void {
    this.sticks.reset();
    this.apologyQueued = false;
    this.drawStick();
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
    this.sticks.down(p.id, p.x, p.y);
    this.drawStick();
  }

  private onMove(p: Phaser.Input.Pointer): void {
    this.sticks.move(p.id, p.x, p.y);
    this.drawStick();
  }

  private onUp(p: Phaser.Input.Pointer): void {
    this.sticks.up(p.id);
    this.drawStick();
  }

  private drawStick(): void {
    const s = this.sticks.stick;
    this.stickBase.setVisible(!!s);
    this.stickKnob.setVisible(!!s);
    if (s) {
      this.stickBase.setPosition(s.origin.x, s.origin.y);
      this.stickKnob.setPosition(s.knob.x, s.knob.y);
    }
  }
}
