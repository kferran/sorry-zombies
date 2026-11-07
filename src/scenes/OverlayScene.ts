import Phaser from 'phaser';
import { bus } from '../shared/events';
import { MODES, type ModeConfig } from '../shared/modes';
import { viewportNeedsLandscape } from '../shared/orientation';
import { worldToScreen, type Point } from '../shared/projection';
import { SpeechBubble } from '../features/apologies/SpeechBubble';
import { hasNameTags } from '../shared/nameTags';
import { HERO } from '../entities/hero/hero.stats';
import { STICK_RADIUS } from '../shared/input/touchSticks';
import { hasTouchHud, type TouchButtonId, type TouchHud } from '../shared/input/touchPad';

export type OverlayData = {
  mode: ModeConfig;
  stageName: string;
  /** The zoomed scene underneath (whose camera bubbles project through and which pause pauses). */
  host?: string;
  hearts?: number;
};

/** Touch buttons: fill alpha at rest and while pressed. */
const BUTTON_ALPHA = { rest: 0.18, pressed: 0.5 } as const;
const BUTTON_FILL: Record<TouchButtonId, number> = { jump: 0xffffff, whip: 0xffffff, sorry: 0xfacc15 };
const TOUCH_DEPTH = 900;

const PAUSED = 'Paused\n\nPress Esc or tap to resume';
const ROTATE = 'Please rotate your phone\nto landscape';

/** Unzoomed layer above the Level/Boss scenes: hearts, stage name, speech bubbles and pause. */
export class OverlayScene extends Phaser.Scene {
  private mode: ModeConfig = MODES.casual;
  private stageName = '';
  private host = 'Level';
  private startHearts: number = HERO.hearts;
  private hearts: Phaser.GameObjects.Image[] = [];
  private bubble!: SpeechBubble;
  private pauseOverlay?: Phaser.GameObjects.Container;
  private pauseLabel?: Phaser.GameObjects.Text;
  /** Name tags on screen, by tag id (a hell-cat's enemy id). */
  private tags = new Map<number, Phaser.GameObjects.Text>();
  /** Touch buttons by id, built the first frame the host has touch controls. */
  private touchButtons = new Map<TouchButtonId, { disc: Phaser.GameObjects.Arc; label: Phaser.GameObjects.Text }>();
  private stickBase?: Phaser.GameObjects.Arc;
  private stickKnob?: Phaser.GameObjects.Arc;

  constructor() { super('Overlay'); }

  init(data: OverlayData): void {
    this.mode = data.mode ?? MODES.casual;
    this.stageName = data.stageName ?? '';
    this.host = data.host ?? 'Level';
    this.startHearts = data.hearts ?? HERO.hearts;
  }

  create(): void {
    this.pauseOverlay = undefined;
    this.pauseLabel = undefined;
    this.tags = new Map();
    this.touchButtons = new Map();
    this.stickBase = undefined;
    this.stickKnob = undefined;
    this.hearts = Array.from({ length: HERO.hearts }, (_, i) => this.add.image(28 + i * 26, 28, 'heart'));
    this.drawHearts(this.startHearts);
    this.add.text(this.scale.width / 2, 16, this.stageName, {
      fontFamily: 'monospace', fontSize: '22px', color: '#ffffff', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5, 0);
    this.bubble = new SpeechBubble(this, p => this.project(p));

    bus.on('heartsChanged', this.onHearts, this);
    const kb = this.input.keyboard!;
    kb.on('keydown-ESC', this.togglePause, this);
    kb.on('keydown-P', this.togglePause, this);

    const onVisibility = () => { if (document.hidden) this.pauseGame(); };
    document.addEventListener('visibilitychange', onVisibility);
    const onResize = () => this.checkOrientation();
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);
    this.scale.on(Phaser.Scale.Events.ORIENTATION_CHANGE, onResize);
    this.time.delayedCall(0, onResize);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      bus.off('heartsChanged', this.onHearts, this);
      kb.off('keydown-ESC', this.togglePause, this);
      kb.off('keydown-P', this.togglePause, this);
      document.removeEventListener('visibilitychange', onVisibility);
      this.scale.off(Phaser.Scale.Events.RESIZE, onResize);
      this.scale.off(Phaser.Scale.Events.ORIENTATION_CHANGE, onResize);
      this.bubble.destroy();
    });
  }

  /** Keeps a name tag above each thing the host lists, dropping tags it no longer lists. */
  update(): void {
    const host = this.scene.get(this.host);
    const wanted = hasNameTags(host) ? host.nameTags() : [];
    const seen = new Set<number>();
    for (const tag of wanted) {
      seen.add(tag.id);
      let label = this.tags.get(tag.id);
      if (!label) {
        label = this.add.text(0, 0, tag.text, {
          fontFamily: 'monospace', fontSize: '14px', color: '#ffd6f0', stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5, 1).setDepth(800);
        this.tags.set(tag.id, label);
      }
      const at = this.project(tag);
      label.setText(tag.text).setPosition(Math.round(at.x), Math.round(at.y));
    }
    for (const [id, label] of this.tags) {
      if (seen.has(id)) continue;
      label.destroy();
      this.tags.delete(id);
    }
    this.drawTouch(hasTouchHud(host) ? host.touchHud() : null);
  }

  /** Touch buttons drawn now, with pressed state (play checks). */
  get touchButtonsShown(): { id: TouchButtonId; pressed: boolean }[] {
    return [...this.touchButtons].filter(([, v]) => v.disc.visible)
      .map(([id, v]) => ({ id, pressed: v.disc.fillAlpha > BUTTON_ALPHA.rest }));
  }

  /** Buttons (semi-transparent, white outline, brighter while held) and the floating stick, in screen px. */
  private drawTouch(hud: TouchHud | null): void {
    const shown = new Set<TouchButtonId>();
    for (const b of hud?.buttons ?? []) {
      shown.add(b.id);
      let view = this.touchButtons.get(b.id);
      if (!view) {
        const disc = this.add.circle(b.x, b.y, b.r, BUTTON_FILL[b.id], BUTTON_ALPHA.rest)
          .setStrokeStyle(3, 0xffffff, 0.85).setDepth(TOUCH_DEPTH);
        const label = this.add.text(b.x, b.y, b.label, {
          fontFamily: 'monospace', fontSize: b.r > 50 ? '24px' : '20px', color: '#ffffff', stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0.5).setDepth(TOUCH_DEPTH + 1);
        view = { disc, label };
        this.touchButtons.set(b.id, view);
      }
      view.disc.setVisible(true).setFillStyle(BUTTON_FILL[b.id], b.pressed ? BUTTON_ALPHA.pressed : BUTTON_ALPHA.rest);
      view.label.setVisible(true).setAlpha(b.pressed ? 1 : 0.85);
    }
    for (const [id, view] of this.touchButtons) {
      if (shown.has(id)) continue;
      view.disc.setVisible(false);
      view.label.setVisible(false);
    }

    const stick = hud?.stick ?? null;
    if (stick && !this.stickBase) {
      this.stickBase = this.add.circle(0, 0, STICK_RADIUS, 0xffffff, 0.12)
        .setStrokeStyle(2, 0xffffff, 0.4).setDepth(TOUCH_DEPTH);
      this.stickKnob = this.add.circle(0, 0, 26, 0xffffff, 0.35).setDepth(TOUCH_DEPTH + 1);
    }
    this.stickBase?.setVisible(!!stick);
    this.stickKnob?.setVisible(!!stick);
    if (stick) {
      this.stickBase!.setPosition(stick.origin.x, stick.origin.y);
      this.stickKnob!.setPosition(stick.knob.x, stick.knob.y);
    }
  }

  /** Name tags on screen now (play checks). */
  get nameTagTexts(): string[] {
    return [...this.tags.values()].map(t => t.text);
  }

  get guiltEnabled(): boolean {
    return this.mode.guilt;
  }

  /** Shows `text` above `target`, a live point in the host scene's world (read every frame). */
  say(text: string, target: Point): void {
    this.bubble.say(text, target);
  }

  /** Host world → this scene's screen, through the host's (zoomed, scrolling) main camera. */
  project(p: Point): Point {
    const cam = this.scene.get(this.host)?.cameras?.main;
    if (!cam) return p;
    return worldToScreen(p, cam.worldView, cam.zoom, { x: cam.x, y: cam.y });
  }

  get paused(): boolean {
    return this.pauseOverlay !== undefined;
  }

  togglePause(): void {
    if (this.paused) this.resumeGame();
    else this.pauseGame();
  }

  pauseGame(message = PAUSED): void {
    if (this.paused || !this.scene.isActive(this.host)) return;
    this.scene.pause(this.host);
    const { width, height } = this.scale;
    const shade = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6).setInteractive();
    const label = this.add.text(width / 2, height / 2, message, {
      fontFamily: 'monospace', fontSize: '36px', color: '#ffffff', align: 'center',
    }).setOrigin(0.5);
    shade.on('pointerup', () => this.resumeGame());
    this.pauseLabel = label;
    this.pauseOverlay = this.add.container(0, 0, [shade, label]).setDepth(2000);
  }

  resumeGame(): void {
    if (!this.paused) return;
    if (viewportNeedsLandscape()) return; // phone still in portrait: stay paused
    this.pauseOverlay?.destroy();
    this.pauseOverlay = undefined;
    this.pauseLabel = undefined;
    this.scene.resume(this.host);
  }

  /** Landscape only on touch screens: a portrait phone pauses behind a "please rotate" message. */
  private checkOrientation(): void {
    if (viewportNeedsLandscape()) {
      if (this.paused) this.pauseLabel?.setText(ROTATE);
      else this.pauseGame(ROTATE);
    } else if (this.paused) {
      this.pauseLabel?.setText(PAUSED);
    }
  }

  private onHearts({ hearts }: { hearts: number }): void {
    this.drawHearts(hearts);
  }

  private drawHearts(count: number): void {
    this.hearts.forEach((h, i) => h.setAlpha(i < count ? 1 : 0.2));
  }
}
