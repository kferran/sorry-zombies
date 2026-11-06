import Phaser from 'phaser';
import { Button } from '../shared/ui/Button';
import { MODES, type ModeId } from '../shared/modes';
import { getBest } from '../features/scoring/bestScores';
import { RunState } from './run/RunState';
import { chooseInput, getInputPref, nextInputPref, setInputPref, type InputPref } from '../shared/input/selectInput';

const HINTS = {
  mouse: 'WASD to move · mouse to aim · click to shoot · Space to apologize',
  touch: 'Left thumb to move · drag right to aim and fire · tap Sorry! to apologize',
};
const PREF_LABELS: Record<InputPref, string> = { auto: 'Controls: Auto', touch: 'Controls: Touch', mouse: 'Controls: Mouse' };

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create(): void {
    const { width } = this.scale;
    this.add.text(width / 2, 180, 'Sorry, Zombies', {
      fontFamily: 'monospace', fontSize: '72px', color: '#ffffff',
    }).setOrigin(0.5);
    Button(this, width / 2 - 220, 380, MODES.casual.label, () => this.startRun('casual'));
    Button(this, width / 2 + 220, 380, MODES.conscience.label, () => this.startRun('conscience'));
    ([['casual', -220], ['conscience', 220]] as const).forEach(([id, dx]) => {
      const best = getBest('side', id);
      if (best !== null) {
        this.add.text(width / 2 + dx, 440, `Best: ${best}`, {
          fontFamily: 'monospace', fontSize: '20px', color: '#aaaaaa',
        }).setOrigin(0.5);
      }
    });
    const bonus = this.add.text(width / 2, 500, 'Bonus: The Arena', {
      fontFamily: 'monospace', fontSize: '20px', color: '#cccccc',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    bonus.on('pointerup', () => this.showArenaPicker());
    const hint = this.add.text(width / 2, 640, '', {
      fontFamily: 'monospace', fontSize: '18px', color: '#aaaaaa',
    }).setOrigin(0.5);
    const hasTouch = this.sys.game.device.input.touch;
    let pref = getInputPref();
    const toggle = this.add.text(width / 2, 560, '', {
      fontFamily: 'monospace', fontSize: '20px', color: '#ffffff', backgroundColor: '#333333', padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const render = () => {
      toggle.setText(PREF_LABELS[pref]);
      hint.setText(HINTS[chooseInput(pref, hasTouch)]);
    };
    toggle.on('pointerup', () => { pref = nextInputPref(pref); setInputPref(pref); render(); });
    render();

    this.add.text(width / 2, 700, 'Art: ansimuz (CC0) · Kenney (CC0)', {
      fontFamily: 'monospace', fontSize: '14px', color: '#666666',
    }).setOrigin(0.5);
  }

  /** Side-scroller run: a fresh RunState, stage 0. */
  startRun(modeId: ModeId): void {
    const run = new RunState(MODES[modeId]);
    run.startStage(0);
    this.scene.start('Level', { run, stageIndex: 0 });
  }

  startArena(modeId: ModeId): void {
    this.scene.start('ArenaGame', { mode: MODES[modeId] });
  }

  private showArenaPicker(): void {
    const { width, height } = this.scale;
    const items: Phaser.GameObjects.GameObject[] = [];
    items.push(this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85).setInteractive());
    items.push(this.add.text(width / 2, 240, 'Bonus: The Arena', {
      fontFamily: 'monospace', fontSize: '40px', color: '#ffffff',
    }).setOrigin(0.5));
    items.push(Button(this, width / 2 - 220, 380, MODES.casual.label, () => this.startArena('casual')));
    items.push(Button(this, width / 2 + 220, 380, MODES.conscience.label, () => this.startArena('conscience')));
    const back = this.add.text(width / 2, 520, 'Back', {
      fontFamily: 'monospace', fontSize: '20px', color: '#ffffff', backgroundColor: '#333333', padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    items.push(back);
    back.on('pointerup', () => items.forEach(o => o.destroy()));
  }
}
