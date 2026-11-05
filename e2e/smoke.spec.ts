import { test, expect } from '@playwright/test';

async function openMenu(page: import('@playwright/test').Page, errors: string[]) {
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('./');
  await page.waitForFunction(() => (window as any).__SORRY__?.scene.isActive('Menu'));
}

for (const modeId of ['casual', 'conscience'] as const) {
  test(`side ${modeId} starts with no console errors`, async ({ page }) => {
    const errors: string[] = [];
    await openMenu(page, errors);
    await page.evaluate(id => (window as any).__SORRY__.scene.getScene('Menu').startRun(id), modeId);
    await page.waitForFunction(() => (window as any).__SORRY__.scene.isActive('Level'));
    await page.waitForTimeout(500);
    expect(errors).toEqual([]);
  });

  test(`arena ${modeId} starts with no console errors`, async ({ page }) => {
    const errors: string[] = [];
    await openMenu(page, errors);
    await page.evaluate(id => (window as any).__SORRY__.scene.getScene('Menu').startArena(id), modeId);
    await page.waitForFunction(() => (window as any).__SORRY__.scene.isActive('ArenaGame'));
    // Let the HUD and the first wave start before judging: errors there would break the live game too.
    await page.waitForFunction(() => (window as any).__SORRY__.scene.isActive('ArenaHud'));
    await page.waitForFunction(() => (window as any).__SORRY__.scene.getScene('ArenaGame').wave === 1
      && (window as any).__SORRY__.scene.getScene('ArenaGame').director.currentWave === 1);
    await page.waitForTimeout(500);
    expect(errors).toEqual([]);
  });
}
