import Phaser from 'phaser';

const MAX_WIDTH = 260;
const PAD = 10;
const MARGIN = 8;
/** Keeps bubbles clear of the HUD row (hearts, wave counter). */
const TOP_RESERVED = 52;
const GAP = 26;

type Point = { x: number; y: number };
export type Vec = Point;

/**
 * One bubble at a time above the hero; a new line replaces the current one.
 * With `project`, the followed point is in another camera's world (the side-scroller's zoomed
 * Level) and is mapped to this scene's screen each frame, just before this scene draws.
 */
export class SpeechBubble {
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private text: Phaser.GameObjects.Text;
  private follow?: Point;
  private hideTimer?: Phaser.Time.TimerEvent;
  private below = false;
  private dirty = true;

  private readonly frameEvent: string;

  constructor(private scene: Phaser.Scene, private project?: (p: Vec) => Vec) {
    this.bg = scene.add.graphics();
    this.text = scene.add.text(0, 0, '', {
      fontFamily: 'monospace', fontSize: '16px', color: '#111111',
      wordWrap: { width: MAX_WIDTH - PAD * 2 }, align: 'center',
    }).setOrigin(0.5, 1);
    this.container = scene.add.container(0, 0, [this.bg, this.text]).setDepth(900).setVisible(false);
    // A projected point depends on the other camera, which only settles when that scene renders.
    this.frameEvent = project ? Phaser.Scenes.Events.PRE_RENDER : Phaser.Scenes.Events.UPDATE;
    scene.events.on(this.frameEvent, this.reposition, this);
  }

  /** The line on show now, or null (play checks). */
  get shownText(): string | null {
    return this.container.visible ? this.text.text : null;
  }

  say(text: string, follow: Point): void {
    this.follow = follow;
    this.text.setText(text);
    this.container.setSize(Math.min(MAX_WIDTH, this.text.width + PAD * 2), this.text.height + PAD * 2);
    this.dirty = true;
    this.container.setVisible(true);
    this.reposition();
    this.hideTimer?.remove();
    this.hideTimer = this.scene.time.delayedCall(1200 + 40 * text.length, () => this.container.setVisible(false));
  }

  /** Sits above the hero, or below when the top of the arena is too close. */
  private reposition(): void {
    if (!this.follow || !this.container.visible) return;
    const at = this.project ? this.project(this.follow) : this.follow;
    const { width } = this.scene.scale;
    const w = this.container.width;
    const h = this.container.height;
    const x = Phaser.Math.Clamp(at.x, w / 2 + MARGIN, width - w / 2 - MARGIN);
    const below = at.y - GAP - h < TOP_RESERVED;
    if (this.dirty || below !== this.below) this.draw(w, h, below);
    this.container.setPosition(x, below ? at.y + GAP : at.y - GAP);
  }

  private draw(w: number, h: number, below: boolean): void {
    this.below = below;
    this.dirty = false;
    this.bg.clear().fillStyle(0xffffff, 0.95);
    if (below) {
      this.bg.fillRoundedRect(-w / 2, 0, w, h, 10).fillTriangle(-8, 0, 8, 0, 0, -10);
      this.text.setOrigin(0.5, 0).setPosition(0, PAD);
    } else {
      this.bg.fillRoundedRect(-w / 2, -h, w, h, 10).fillTriangle(-8, 0, 8, 0, 0, 10);
      this.text.setOrigin(0.5, 1).setPosition(0, -PAD);
    }
  }

  destroy(): void {
    this.scene.events.off(this.frameEvent, this.reposition, this);
    this.hideTimer?.remove();
    this.container.destroy();
  }
}
