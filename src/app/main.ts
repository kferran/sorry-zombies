import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { MenuScene } from '../scenes/MenuScene';
import { GameScene } from '../scenes/GameScene';

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#2b2b2b',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { debug: false } },
  scene: [BootScene, MenuScene, GameScene],
});

(window as unknown as { __SORRY__: Phaser.Game }).__SORRY__ = game;
