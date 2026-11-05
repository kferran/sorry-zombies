import Phaser from 'phaser';
import { Button } from '../shared/ui/Button';
import { MODES, type ModeId } from '../shared/modes';
import { getBest } from '../features/scoring/bestScores';
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
      const best = getBest(id);
      if (best !== null) {
        this.add.text(width / 2 + dx, 440, `Best: ${best}`, {
          fontFamily: 'monospace', fontSize: '20px', color: '#aaaaaa',
        }).setOrigin(0.5);
      }
    });
    // SPIKE: side-scroller pacing test.
    this.add.text(width / 2, 500, '▶ Try the side-scroller (spike)', {
      fontFamily: 'monospace', fontSize: '20px', color: '#facc15',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => this.scene.start('SideScroll'));

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

    this.add.text(width / 2, 700, 'Art: Kenney.nl (CC0)', {
      fontFamily: 'monospace', fontSize: '14px', color: '#666666',
    }).setOrigin(0.5);
  }

  startRun(modeId: ModeId): void {
    this.scene.start('Game', { mode: MODES[modeId] });
  }
}
