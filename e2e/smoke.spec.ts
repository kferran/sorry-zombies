import { test, expect } from '@playwright/test';

for (const modeId of ['casual', 'conscience'] as const) {
  test(`starts ${modeId} with no console errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('./');
    await page.waitForFunction(() => (window as any).__SORRY__?.scene.isActive('Menu'));
    await page.evaluate(id => (window as any).__SORRY__.scene.getScene('Menu').startRun(id), modeId);
    await page.waitForFunction(() => (window as any).__SORRY__.scene.isActive('Game'));
    // Let the HUD and the first wave start before judging: errors there would break the live game too.
    await page.waitForFunction(() => (window as any).__SORRY__.scene.isActive('Hud'));
    await page.waitForFunction(() => (window as any).__SORRY__.scene.getScene('Game').wave === 1
      && (window as any).__SORRY__.scene.getScene('Game').director.currentWave === 1);
    await page.waitForTimeout(500);
    expect(errors).toEqual([]);
  });
}
