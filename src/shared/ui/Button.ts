import Phaser from 'phaser';

export function Button(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
): Phaser.GameObjects.Container {
  const text = scene.add.text(0, 0, label, {
    fontFamily: 'monospace', fontSize: '28px', color: '#ffffff',
  }).setOrigin(0.5);
  const bg = scene.add.rectangle(0, 0, text.width + 48, text.height + 24, 0x444444)
    .setStrokeStyle(2, 0xffffff);
  const container = scene.add.container(x, y, [bg, text]);
  bg.setInteractive({ useHandCursor: true })
    .on('pointerover', () => bg.setFillStyle(0x666666))
    .on('pointerout', () => bg.setFillStyle(0x444444))
    .on('pointerup', onClick);
  return container;
}
