import Phaser from 'phaser';
import { bus } from '../shared/events';
import { MODES, type ModeConfig } from '../shared/modes';
import { viewportNeedsLandscape } from '../shared/orientation';
import { worldToScreen, type Point } from '../shared/projection';
import { SpeechBubble } from '../features/apologies/SpeechBubble';
import { hasNameTags } from '../shared/nameTags';
import { HERO } from '../entities/hero/hero.stats';

export type OverlayData = {
  mode: ModeConfig;
  stageName: string;
  /** The zoomed scene underneath (whose camera bubbles project through and which pause pauses). */
  host?: string;
  hearts?: number;
};

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
    this.tags = new Map();
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
