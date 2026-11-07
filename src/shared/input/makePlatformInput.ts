import type Phaser from 'phaser';
import type { PlatformInput } from './PlatformInput';
import { KeyboardPlatformInput } from './KeyboardPlatformInput';
import { TouchPlatformInput } from './TouchPlatformInput';
import { chooseInput, getInputPref } from './selectInput';

/** One input per run: touch or keyboard/mouse, by the menu's Controls setting and the device. */
export function makePlatformInput(scene: Phaser.Scene, showSorry: boolean): PlatformInput {
  const kind = chooseInput(getInputPref(), scene.sys.game.device.input.touch);
  return kind === 'touch' ? new TouchPlatformInput(scene, showSorry) : new KeyboardPlatformInput(scene);
}
