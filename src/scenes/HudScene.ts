import Phaser from 'phaser';
import { bus } from '../shared/events';
import { HERO } from '../entities/hero/hero.stats';
import { MODES, type ModeConfig } from '../shared/modes';
import { GuiltBar } from '../features/guilt/GuiltBar';

export class HudScene extends Phaser.Scene {
  private hearts: Phaser.GameObjects.Image[] = [];
  private waveLabel!: Phaser.GameObjects.Text;
  private pauseOverlay?: Phaser.GameObjects.Container;
  private pauseLabel?: Phaser.GameObjects.Text;

  private mode: ModeConfig = MODES.casual;

  constructor() { super('Hud'); }

  init(data: { mode?: ModeConfig }): void {
    this.mode = data.mode ?? MODES.casual;
  }

  create(): void {
    this.pauseOverlay = undefined;
    this.hearts = Array.from({ length: HERO.hearts }, (_, i) => this.add.image(28 + i * 26, 28, 'heart'));
    this.waveLabel = this.add.text(this.scale.width - 20, 18, '', {
      fontFamily: 'monospace', fontSize: '22px', color: '#ffffff',
    }).setOrigin(1, 0);
    bus.on('heroHurt', ({ hearts }) => this.drawHearts(hearts), this);
    if (this.mode.guilt) {
      const bar = new GuiltBar(this);
      bus.on('guiltChanged', ({ guilt, level }) => bar.set(guilt, level), this);
    }
    bus.on('waveStarted', ({ wave }) => this.waveLabel.setText(`Wave ${wave}/10`), this);

    const kb = this.input.keyboard!;
    kb.on('keydown-ESC', () => this.togglePause());
    kb.on('keydown-P', () => this.togglePause());
  }

  get paused(): boolean {
    return this.pauseOverlay !== undefined;
  }

  togglePause(): void {
    if (this.paused) this.resumeGame();
    else this.pauseGame();
  }

  pauseGame(message = 'Paused\n\nPress Esc or tap to resume'): void {
    if (this.paused || !this.scene.isActive('Game')) return;
    this.scene.pause('Game');
    const { width, height } = this.scale;
    const shade = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6).setInteractive();
    const label = this.add.text(width / 2, height / 2, message, {
      fontFamily: 'monospace', fontSize: '36px', color: '#ffffff', align: 'center',
    }).setOrigin(0.5);
    shade.on('pointerup', () => this.resumeGame());
    this.pauseLabel = label;
    this.pauseOverlay = this.add.container(0, 0, [shade, label]).setDepth(2000);
  }

  setPauseMessage(message: string): void {
    this.pauseLabel?.setText(message);
  }

  resumeGame(): void {
    if (!this.paused) return;
    if (window.innerHeight > window.innerWidth) return; // still portrait: stay paused
    this.pauseOverlay?.destroy();
    this.pauseOverlay = undefined;
    this.scene.resume('Game');
  }

  private drawHearts(count: number): void {
    this.hearts.forEach((h, i) => h.setAlpha(i < count ? 1 : 0.2));
  }
}
