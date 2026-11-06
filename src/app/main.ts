import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { MenuScene } from '../scenes/MenuScene';
import { STUB_SCENES } from '../scenes/StubScenes';
import { LevelScene } from '../scenes/LevelScene';
import { OverlayScene } from '../scenes/OverlayScene';
import { LevelCardScene } from '../scenes/LevelCardScene';
import { SummaryScene } from '../scenes/SummaryScene';
import { ArenaGameScene } from '../arena/scenes/ArenaGameScene';
import { ArenaHudScene } from '../arena/scenes/ArenaHudScene';
import { ArenaSummaryScene } from '../arena/scenes/ArenaSummaryScene';
import { bus } from '../shared/events';

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#2b2b2b',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { debug: false } },
  input: { activePointers: 3 },
  // Overlay after Level/Boss: it draws (and projects bubbles) after them.
  scene: [BootScene, MenuScene, LevelScene, ...STUB_SCENES, OverlayScene, LevelCardScene, SummaryScene, ArenaGameScene, ArenaHudScene, ArenaSummaryScene],
});

// Debug handles for the smoke test and play checks.
game.registry.set('bus', bus);
(window as unknown as { __SORRY__: Phaser.Game }).__SORRY__ = game;
