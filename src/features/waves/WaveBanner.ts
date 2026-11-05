import Phaser from 'phaser';

export const WaveBanner = {
  show(scene: Phaser.Scene, text: string, durationMs: number): void {
    const { width, height } = scene.scale;
    const label = scene.add.text(width / 2, height / 2 - 120, text, {
      fontFamily: 'monospace', fontSize: '40px', color: '#ffffff',
      backgroundColor: '#000000aa', padding: { x: 24, y: 12 },
    }).setOrigin(0.5).setDepth(1000).setAlpha(0);
    scene.tweens.add({ targets: label, alpha: 1, duration: 250 });
    scene.time.delayedCall(durationMs, () => {
      scene.tweens.add({ targets: label, alpha: 0, duration: 250, onComplete: () => label.destroy() });
    });
  },
};
