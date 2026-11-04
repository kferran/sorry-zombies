# Sorry, Zombies Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy the Sorry, Zombies browser prototype: a 10-wave top-down shooter with two modes (Casual Remorse, Full Conscience), desktop and touch controls, live on GitHub Pages.

**Architecture:** Feature-sliced layout (`app → scenes → features → entities → shared`). Game rules are pure TypeScript classes with Vitest tests; Phaser scenes only compose them, draw, and handle physics and input. Scenes communicate through one typed event bus.

**Tech Stack:** Phaser 4 (`phaser@^4`), TypeScript (strict), Vite, Vitest, Playwright, GitHub Actions + GitHub Pages.

**Spec:** `docs/specs/2026-11-04-sorry-zombies-design.md`

## Global Constraints

- Phaser 4 only (`"phaser": "^4.1.0"`). TypeScript `strict: true`.
- Import direction: `app` → `scenes` → `features` → `entities` → `shared`. Features never import other features. Files ending in `.test.ts` and every pure logic file (`GuiltMeter.ts`, `ApologyPicker.ts`, `WaveDirector.ts`, `waves.ts`, `Scoring.ts`, `bestScores.ts`, `ZombieHealth.ts`, `storage.ts`, `modes.ts`) must not import `phaser`.
- Logical game size 1280×720, `Phaser.Scale.FIT`, `autoCenter: CENTER_BOTH`.
- Vite `base: '/sorry-zombies/'`. Live URL `https://kferran.github.io/sorry-zombies/`.
- Mode configs exactly: `{ id: 'casual', label: 'Casual Remorse', guilt: false, waveScale: 1.0 }` and `{ id: 'conscience', label: 'Full Conscience', guilt: true, waveScale: 0.8 }`.
- Hero: 3 hearts, no regeneration, 1000 ms invulnerability after a hit, max 4 shots/second (250 ms between shots).
- Scene keys: `'Boot'`, `'Menu'`, `'Game'`, `'Hud'`, `'Summary'`.
- `window.__SORRY__` is set to the `Phaser.Game` instance (used by the smoke test).
- Commits end with the session's `Co-Authored-By` / `Claude-Session` trailer lines.
- Placeholder art (shapes generated with `Graphics.generateTexture` in `BootScene`) is used until Task 13. Texture keys: `'hero'`, `'shambler'`, `'jogger'`, `'pea'`, `'heart'`.

## Review Focus

1. **Tab hidden mid-wave, then shown again.** Expect the game to be paused on return with no burst of queued spawns. → Task 7, play check + `visibilitychange` handler.
2. **Apologize mashed or held.** Expect one apology per press and nothing more often than the 1000 ms cooldown. → Task 10 test `respects the 1000 ms cooldown`; Task 11 uses `apologizePressed()` edge detection.
3. **Two peas hit a zombie on the same frame it dies.** Expect exactly one kill event and no hits counted on a dead zombie. → Task 3 test `ignores hits after death`.
4. **Best-score storage holds garbage** (a hand-edited or corrupted value). Expect "no best score" rather than a crash or `NaN`. → Task 2 test `returns null for non-numeric stored value`.
5. **A family member empties a line group in `lines.ts`.** Expect the picker to fall back (other tiers of the same kind, then `"Sorry!"`) rather than throw. → Task 8 test `falls back when a group is empty`.

---

## File Structure

```
index.html                         page shell, #game container
vite.config.ts                     base path, vitest config
tsconfig.json
playwright.config.ts
.github/workflows/deploy.yml       check → test → build → smoke → Pages
e2e/smoke.spec.ts                  Playwright smoke test
src/app/main.ts                    Phaser.Game config, scene list, window.__SORRY__
src/scenes/BootScene.ts            textures (placeholder → Kenney), load-error message
src/scenes/MenuScene.ts            title, mode buttons, best scores, touch toggle
src/scenes/GameScene.ts            arena, spawning, collisions, input; emits events
src/scenes/HudScene.ts             hearts, wave banner, guilt bar (overlay)
src/scenes/SummaryScene.ts         results, grade, closing line, play again
src/features/waves/waves.ts        WAVES table
src/features/waves/WaveDirector.ts spawn queue per wave
src/features/waves/WaveBanner.ts   Phaser text banner
src/features/apologies/lines.ts    all lines (family-editable)
src/features/apologies/ApologyPicker.ts
src/features/apologies/SpeechBubble.ts
src/features/guilt/GuiltMeter.ts
src/features/guilt/GuiltBar.ts
src/features/scoring/Scoring.ts    RunStats, score, bonus, grade
src/features/scoring/bestScores.ts
src/entities/hero/Hero.ts, hero.stats.ts
src/entities/zombie/Zombie.ts, zombie.stats.ts, ZombieHealth.ts
src/entities/pea/Pea.ts
src/shared/modes.ts
src/shared/events.ts               event names, payload types, typed bus
src/shared/storage.ts
src/shared/input/InputSource.ts, KeyboardMouseInput.ts, TouchInput.ts, selectInput.ts
src/shared/ui/Button.ts
public/assets/kenney-topdown/      art + License.txt (Task 13)
```

Tests sit next to the file they test (`X.ts` → `X.test.ts`).

---

### Task 1: Skeleton and deploy (stage 1)

**Files:**
- Create: `package.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, `playwright.config.ts`, `src/app/main.ts`, `src/scenes/BootScene.ts`, `src/scenes/MenuScene.ts`, `src/scenes/GameScene.ts`, `src/shared/ui/Button.ts`, `e2e/smoke.spec.ts`, `.github/workflows/deploy.yml`, `README.md`, `.gitignore`

**Interfaces:**
- Produces: `MenuScene.startRun(modeId: 'casual' | 'conscience'): void` (starts `'Game'` with `{ modeId }`); `Button(scene, x, y, label, onClick): Phaser.GameObjects.Container`; npm scripts `dev`, `build`, `preview`, `check` (`tsc --noEmit`), `test` (`vitest run`), `e2e` (`playwright test`).

- [ ] **Step 1: Initialise the project.** `npm init -y`; install `phaser@^4.1.0`; dev deps `typescript vite vitest @playwright/test`; `npx playwright install --with-deps chromium`. Add the scripts above. `.gitignore`: `node_modules`, `dist`, `test-results`, `playwright-report`.
- [ ] **Step 2: Config.** `vite.config.ts` sets `base: '/sorry-zombies/'` and `test: { include: ['src/**/*.test.ts'] }`. `tsconfig.json` strict, `target: ES2022`, `moduleResolution: bundler`. `playwright.config.ts` runs `npm run preview -- --port 4173` as `webServer` and uses `baseURL: 'http://localhost:4173/sorry-zombies/'`.
- [ ] **Step 3: Write the failing smoke test** in `e2e/smoke.spec.ts`:

```ts
for (const modeId of ['casual', 'conscience'] as const) {
  test(`starts ${modeId} with no console errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', m => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('./');
    await page.waitForFunction(() => (window as any).__SORRY__?.scene.isActive('Menu'));
    await page.evaluate(id => (window as any).__SORRY__.scene.getScene('Menu').startRun(id), modeId);
    await page.waitForFunction(() => (window as any).__SORRY__.scene.isActive('Game'));
    expect(errors).toEqual([]);
  });
}
```

- [ ] **Step 4: Run it.** `npm run build && npm run e2e` → FAIL (no game yet).
- [ ] **Step 5: Implement.** `main.ts` per Global Constraints, background `#2b2b2b`, arcade physics, scenes `[BootScene, MenuScene, GameScene]`. `BootScene` generates the five placeholder textures (hero blue circle r=16, shambler green circle r=16, jogger lime circle r=14, pea white circle r=4, heart red square 16) then starts `'Menu'`. `MenuScene` shows the title "Sorry, Zombies" and two `Button`s labelled from the mode configs (hard-code the two labels until Task 2). `GameScene` draws an arena border.
- [ ] **Step 6: Verify.** `npm run check && npm run build && npm run e2e` → both smoke tests PASS. `npm run dev`, open the page: title and two buttons; clicking one shows the arena.
- [ ] **Step 7: Deploy workflow.** `deploy.yml` on push to `main`: `actions/checkout`, `actions/setup-node` (node 22, npm cache), `npm ci`, `npm run check`, `npm test`, `npm run build`, `npx playwright install --with-deps chromium`, `npm run e2e`, `actions/upload-pages-artifact` (`path: dist`), then a `deploy` job with `actions/deploy-pages`. Permissions `pages: write`, `id-token: write`. README: how to run, how to add apology lines, live link.
- [ ] **Step 8: Commit and push.** `git add -A && git commit -m "feat: project skeleton, smoke test and Pages deploy"`; `git push`. **Kyle:** in repo Settings → Pages, set Source to "GitHub Actions". Confirm the live URL shows the menu.

### Task 2: Shared foundations (modes, events, storage)

**Files:**
- Create: `src/shared/modes.ts`, `src/shared/events.ts`, `src/shared/storage.ts`, `src/shared/storage.test.ts`, `src/shared/modes.test.ts`
- Modify: `src/scenes/MenuScene.ts` (labels from `MODES`, pass `ModeConfig`)

**Interfaces:**
- Produces:
  - `type ModeId = 'casual' | 'conscience'`; `type ModeConfig = { id: ModeId; label: string; guilt: boolean; waveScale: number }`; `MODES: Record<ModeId, ModeConfig>`.
  - `events.ts`: `type GameEventMap = { zombieHit: { zombieId: number; wave: number }; zombieKilled: { zombieId: number; wave: number }; heroHurt: { hearts: number }; apologized: { cleared: number }; guiltChanged: { guilt: number; level: 0 | 1 | 2 }; waveStarted: { wave: number }; waveCleared: { wave: number }; runEnded: { outcome: 'win' | 'lose' } }`; `class GameBus { on<K>(k: K, fn: (p: GameEventMap[K]) => void, ctx?: unknown): void; off<K>(...); emit<K>(k: K, p: GameEventMap[K]): void; clear(): void }` wrapping a `Phaser.Events.EventEmitter` (this file may import Phaser; it is not a pure logic file). Export one instance `bus`.
  - `storage.ts`: `makeStore(backing?: Pick<Storage, 'getItem' | 'setItem'>)` returning `{ get(key: string): string | null; set(key: string, value: string): void }`; default backing is `globalThis.localStorage`, accessed lazily inside try/catch. Every call is wrapped in try/catch; failures return `null` / do nothing. Keys are prefixed `sorry-zombies:`.

- [ ] **Step 1: Write failing tests.** `modes.test.ts`: `MODES.casual` and `MODES.conscience` deep-equal the Global Constraints objects. `storage.test.ts`:
  - `round-trips a value` (in-memory fake backing).
  - `returns null and does not throw when getItem throws`.
  - `does not throw when setItem throws`.
  - `returns null when no backing exists` (`makeStore(undefined)` with `localStorage` deleted from `globalThis`).
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3: Implement** the three files; MenuScene reads labels from `MODES` and `startRun(id)` passes `{ mode: MODES[id] }` as scene data.
- [ ] **Step 4:** `npm test && npm run check && npm run build && npm run e2e` → PASS.
- [ ] **Step 5: Commit** `feat: mode configs, typed event bus, safe storage`.

### Task 3: Zombie stats and health

**Files:**
- Create: `src/entities/zombie/zombie.stats.ts`, `src/entities/zombie/ZombieHealth.ts`, `src/entities/zombie/ZombieHealth.test.ts`

**Interfaces:**
- Produces: `type ZombieKind = 'shambler' | 'jogger'`; `ZOMBIE_STATS: Record<ZombieKind, { hits: number; speed: number }>` = `{ shambler: { hits: 3, speed: 60 }, jogger: { hits: 2, speed: 96 } }` (speed in px/s, jogger = 1.6 × shambler); `class ZombieHealth { constructor(hits: number); takeHit(): 'hit' | 'killed' | 'ignored'; readonly dead: boolean }`.

- [ ] **Step 1: Failing tests** in `ZombieHealth.test.ts`:
  - `shambler dies on the third hit`: three `takeHit()` calls return `'hit'`, `'hit'`, `'killed'`.
  - `jogger dies on the second hit`.
  - `ignores hits after death`: a fourth call returns `'ignored'` and `dead` stays `true`.
  - `jogger speed is 1.6x shambler`.
- [ ] **Step 2:** `npm test` → FAIL. **Step 3:** implement. **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** `feat: zombie stats and health`.

### Task 4: Walk and shoot (stage 2)

**Files:**
- Create: `src/entities/hero/hero.stats.ts`, `src/entities/hero/Hero.ts`, `src/entities/pea/Pea.ts`, `src/entities/zombie/Zombie.ts`, `src/shared/input/InputSource.ts`, `src/shared/input/KeyboardMouseInput.ts`, `src/scenes/HudScene.ts`
- Modify: `src/scenes/GameScene.ts`, `src/app/main.ts` (add `HudScene`)

**Interfaces:**
- Consumes: `ZombieHealth`, `ZOMBIE_STATS` (Task 3); `bus`, `ModeConfig` (Task 2).
- Produces:
  - `hero.stats.ts`: `HERO = { speed: 200, hearts: 3, fireIntervalMs: 250, invulnMs: 1000, knockback: 220 }`; `PEA_SPEED = 600`.
  - `InputSource` exactly as spec section 5: `move(): { x: number; y: number }`, `aim(heroPos: { x: number; y: number }): { x: number; y: number } | null`, `firing(): boolean`, `apologizePressed(): boolean`, plus `destroy(): void`.
  - `class KeyboardMouseInput implements InputSource { constructor(scene: Phaser.Scene) }`: WASD + arrows (diagonal normalised), pointer world position, left button held, Space via `JustDown`.
  - `class Hero extends Phaser.Physics.Arcade.Sprite`: `hearts: number`, `frozenUntil: number`, `canFire(now): boolean`, `hurt(now): boolean` (false while invulnerable; otherwise decrements hearts, starts flashing), `isFrozen(now): boolean`.
  - `class Zombie extends Phaser.Physics.Arcade.Sprite`: `zombieId: number`, `kind: ZombieKind`, `health: ZombieHealth`, `spawn(kind, x, y, speedMultiplier): void` (resets health, used by the pool), `chase(target: { x: number; y: number }): void`.
  - `class Pea extends Phaser.Physics.Arcade.Image`: `fire(from, to): void`; deactivated when off-arena.
  - `GameScene.init(data: { mode: ModeConfig })`; zombies and peas are pooled `Phaser.Physics.Arcade.Group`s (`classType`, `maxSize` 60 / 40).
  - `HudScene`: draws `hearts` from `heroHurt`; launched by `GameScene.create` with `this.scene.launch('Hud')`.

- [ ] **Step 1: Implement entities and input** per the interfaces. Zombies spawn at a random point on a random edge, 20 px outside the arena.
- [ ] **Step 2: GameScene loop.** Temporary spawner: one shambler every 2 s (removed in Task 7). Overlap pea↔zombie: deactivate pea; `health.takeHit()` → `'hit'` emits `zombieHit`, `'killed'` emits `zombieKilled` and returns the zombie to the pool, `'ignored'` does nothing. Overlap hero↔zombie: if `hero.hurt(now)` then emit `heroHurt`, knock the zombie back by `HERO.knockback`. Hearts 0 → restart to `'Menu'` (replaced in Task 7).
- [ ] **Step 3: Verify.** `npm run check && npm test && npm run build && npm run e2e` → PASS.
- [ ] **Step 4: Play checklist** (`npm run dev`):
  - Hero moves at the same speed diagonally as straight.
  - Holding click fires no faster than 4 peas/second.
  - Shamblers die on the third pea; spraying peas at a dying zombie never counts it twice (watch the console log of `zombieKilled` events, added temporarily).
  - Touching a zombie removes one heart, the hero flashes for 1 s, and the zombie is pushed back.
- [ ] **Step 5: Commit** `feat: hero, peas, zombies, hearts`.

### Task 5: Wave table and WaveDirector

**Files:**
- Create: `src/features/waves/waves.ts`, `src/features/waves/WaveDirector.ts`, `src/features/waves/WaveDirector.test.ts`

**Interfaces:**
- Consumes: `ZombieKind` (Task 3).
- Produces:
  - `type WaveSpec = { wave: number; count: number; spawnIntervalMs: number; speedMultiplier: number; joggerShare: number }`.
  - `WAVES: WaveSpec[]` of length 10, built from: `count = 3n + 3`; `speedMultiplier = 1 + 0.05(n − 1)`; `spawnIntervalMs = max(400, 1500 − 110(n − 1))`; `joggerShare = n < 5 ? 0 : 0.2 + 0.04(n − 5)` (0.2 at wave 5, 0.4 at wave 10).
  - `class WaveDirector { constructor(waves: WaveSpec[], waveScale: number, rng?: () => number); readonly totalWaves: number; readonly currentWave: number; startWave(n: number): WaveSpec /* scaled */; nextSpawn(): ZombieKind | null; onZombieKilled(): void; isWaveCleared(): boolean }`.
  - Scaling: `count = max(1, round(count × waveScale))`, `speedMultiplier × waveScale`. Joggers in a wave = `round(scaledCount × joggerShare)`, positions shuffled with `rng`.

- [ ] **Step 1: Failing tests:**
  - `wave 1 spawns 6 and wave 10 spawns 33` (scale 1).
  - `speed rises 5% per wave` (wave 10 → 1.45).
  - `no joggers before wave 5`; `wave 10 is 40% joggers` (13 of 33).
  - `waveScale 0.8 scales count and speed` (wave 10 → 26 zombies, speed 1.16).
  - `nextSpawn returns null once count is reached`.
  - `wave is cleared only when every spawned zombie has been killed` (false after spawning all, true after the last `onZombieKilled`).
  - `same rng gives the same spawn order`.
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** `feat: wave table and director`.

### Task 6: Scoring and best scores

**Files:**
- Create: `src/features/scoring/Scoring.ts`, `src/features/scoring/Scoring.test.ts`, `src/features/scoring/bestScores.ts`, `src/features/scoring/bestScores.test.ts`

**Interfaces:**
- Consumes: `ModeConfig`, `ModeId`, `makeStore` (Task 2).
- Produces:
  - `class RunStats { wavesCleared = 0; zombiesHurt = 0; zombiesKilled = 0; apologies = 0; sampleGuilt(v: number): void; averageGuilt(): number /* 0 when no samples */ }`.
  - `type Grade = 'Saint' | 'Decent Person' | 'Conflicted' | 'Callous' | 'Monster'`; `gradeFor(avgGuilt: number): Grade`; `conscienceBonus(avgGuilt: number): number` = `round((100 − avg) × 5)`; `scoreRun(stats: RunStats, mode: ModeConfig): number` = `wavesCleared × 100` plus the bonus only when `mode.guilt`.
  - `bestScores.ts`: `getBest(modeId: ModeId, store?): number | null`; `saveIfBest(modeId: ModeId, score: number, store?): boolean`. Key `best:<modeId>`.

- [ ] **Step 1: Failing tests:**
  - `casual score is waves × 100` (7 waves → 700, guilt samples ignored).
  - `conscience score adds the bonus` (10 waves, avg 20 → 1000 + 400).
  - Grade boundaries: 0 and 14 → Saint; 15 and 34 → Decent Person; 35 and 59 → Conflicted; 60 and 84 → Callous; 85 and 100 → Monster.
  - `averageGuilt is 0 with no samples`.
  - bestScores: `saves a higher score and reports true`; `keeps the old best when lower`; `scores are per mode`; `returns null for non-numeric stored value` (store holds `"banana"`); `returns null when storage throws`.
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** PASS.
- [ ] **Step 5: Commit** `feat: scoring, grades, best scores`.

### Task 7: Waves in play, run end, summary, pause (stage 3)

**Files:**
- Create: `src/features/waves/WaveBanner.ts`, `src/scenes/SummaryScene.ts`
- Modify: `src/scenes/GameScene.ts`, `src/scenes/HudScene.ts`, `src/app/main.ts`

**Interfaces:**
- Consumes: `WaveDirector`, `WAVES` (Task 5); `RunStats`, `scoreRun` (Task 6); `bus`.
- Produces:
  - `WaveBanner.show(scene, text: string, durationMs: number): void`. Banner text `"Wave {n}: {subtitle}"`; subtitles in `WAVE_SUBTITLES: string[]` (10 entries, in `waves.ts`, e.g. wave 4 "They seem upset").
  - `SummaryScene.init(data: { mode: ModeConfig; stats: RunStats; outcome: 'win' | 'lose'; score: number })`. Shows waves cleared, hurt, killed, apologies, score, and a "Play again" `Button` to `'Menu'`.
  - `GameScene` exposes `runStats: RunStats` for later tasks.

- [ ] **Step 1: Replace the temporary spawner** with `WaveDirector(WAVES, mode.waveScale)`. A Phaser `TimerEvent` every `spawnIntervalMs` pulls `nextSpawn()`; zombie speed = `ZOMBIE_STATS[kind].speed × speedMultiplier`. On `zombieKilled` → `director.onZombieKilled()`; when `isWaveCleared()`: emit `waveCleared`, `runStats.wavesCleared++`, then either end the run (wave 10) or show the banner and start the next wave after 3000 ms. Tally `zombiesHurt` on every hit and kill, `zombiesKilled` on kills.
- [ ] **Step 2: Run end.** Hearts 0 → `runEnded` `'lose'`. Check hearts before wave-clear in the same frame, so a simultaneous last kill and last heart is a loss. Stop `'Hud'`, start `'Summary'`. Clear the bus listeners for the run (`bus.clear()` on `GameScene` shutdown) so a second run does not double-fire.
- [ ] **Step 3: Pause.** Esc or P toggles `scene.pause('Game')` with a "Paused" overlay; `document.visibilitychange` to hidden pauses. Resuming is only by key or tap on the overlay.
- [ ] **Step 4: Verify** `npm run check && npm test && npm run build && npm run e2e` → PASS.
- [ ] **Step 5: Play checklist:**
  - Banner appears between waves; wave 1 has 6 zombies.
  - Clearing wave 10 shows the summary with outcome win; losing all hearts shows lose.
  - Play again → Menu → a second run starts at wave 1 with 3 hearts, and every event fires once (not twice).
  - Switch tabs for 10 s mid-wave: on return the game is paused and no burst of zombies appears after resuming.
- [ ] **Step 6: Commit** `feat: waves, run end, summary, pause`.

### Task 8: Apology lines and picker

**Files:**
- Create: `src/features/apologies/lines.ts`, `src/features/apologies/ApologyPicker.ts`, `src/features/apologies/ApologyPicker.test.ts`

**Interfaces:**
- Produces:
  - `type LineKind = 'hit' | 'kill' | 'apology' | 'breakdown' | 'summaryWin' | 'summaryLose'`; `type Tier = 1 | 2 | 3`; `type Line = { kind: LineKind; tier?: Tier; text: string }`. Only `hit` and `kill` lines carry a tier.
  - `LINES: Line[]` in `lines.ts`, with a short comment at the top explaining how to add a line.
  - `tierForWave(wave: number): Tier` (1–3 → 1, 4–7 → 2, 8–10 → 3).
  - `class ApologyPicker { constructor(lines: Line[], rng?: () => number); pick(kind: LineKind, wave?: number): string }`.
  - Fallback order when a group is empty: same kind any tier → `"Sorry!"`.

- [ ] **Step 1: Failing tests:**
  - `tierForWave maps 3→1, 4→2, 7→2, 8→3`.
  - `picks only tier 2 hit lines on wave 5`.
  - `no repeats until the group is exhausted` (group of 3, 3 picks are distinct).
  - `reshuffles after exhaustion` (4th pick is from the group).
  - `falls back when a group is empty` (no tier 3 kills → returns a tier 1 kill; no kills at all → `"Sorry!"`).
  - `ships enough lines`: on `LINES`, ≥ 10 `hit` and ≥ 8 `kill` per tier; ≥ 8 `apology`; ≥ 4 `breakdown`, `summaryWin`, `summaryLose`; no empty or duplicate texts.
- [ ] **Step 2:** FAIL. **Step 3:** implement the picker; write the lines. Tone per spec: tier 1 polite and short, tier 2 flustered, tier 3 long and philosophical (still under ~110 characters so the bubble stays readable). **Step 4:** PASS.
- [ ] **Step 5: Commit** `feat: apology lines and picker`.

### Task 9: Speech bubbles — Casual Remorse complete (stage 4)

**Files:**
- Create: `src/features/apologies/SpeechBubble.ts`
- Modify: `src/scenes/GameScene.ts`, `src/scenes/SummaryScene.ts`

**Interfaces:**
- Consumes: `ApologyPicker`, `LINES` (Task 8); `bus` events.
- Produces: `class SpeechBubble { constructor(scene: Phaser.Scene); say(text: string, follow: { x: number; y: number }): void; destroy(): void }`. One bubble at a time; a new `say` replaces the current one. Visible for `1200 + 40 × text.length` ms. Word-wrapped to 260 px, follows the hero, stays inside the arena.

- [ ] **Step 1: Implement and wire.** On `zombieHit` → `say(picker.pick('hit', wave))`; on `zombieKilled` → `pick('kill', wave)`. Summary shows `pick('summaryWin' | 'summaryLose')` as its closing line.
- [ ] **Step 2: Verify** `npm run check && npm test && npm run build && npm run e2e` → PASS.
- [ ] **Step 3: Play checklist:**
  - Every hit shows a bubble; kills show a different line.
  - Wave 8+ lines are visibly longer than wave 1 lines.
  - Bubbles never leave the screen when the hero hugs an edge.
- [ ] **Step 4: Commit and push** `feat: speech bubbles; Casual Remorse complete`.
- [ ] **Step 5: Milestone.** Kyle shares the live link with 2–3 people. If wave 1 doesn't get a laugh, rewrite lines in `lines.ts` before Task 10.

### Task 10: GuiltMeter

**Files:**
- Create: `src/features/guilt/GuiltMeter.ts`, `src/features/guilt/GuiltMeter.test.ts`

**Interfaces:**
- Produces: `class GuiltMeter { constructor(enabled: boolean); readonly value: number; level(): 0 | 1 | 2; wobbleDegrees(): 0 | 4 | 10; onHit(zombieId: number): { breakdown: boolean }; onKill(zombieId: number): { breakdown: boolean }; apologize(nowMs: number): { accepted: boolean; cleared: number } }`.
  - Hit +4, kill +10, tracked per zombie as owed guilt, in hurt order.
  - `level`: 0 below 33, 1 for 33–65, 2 for 66 and up. `wobbleDegrees` = 0 / 4 / 10 by level.
  - Reaching 100: clamp to 100, return `breakdown: true`, then set value to 50 and clear all owed guilt.
  - `apologize`: rejected (`accepted: false`, nothing changes) within 1000 ms of the last accepted call. Otherwise accepted; clears the owed guilt of the most recently hurt zombie that still owes any (dead or alive), subtracts it from `value` (floor 0), returns the amount (0 when nobody is owed).
  - Disabled: every method is a no-op; `value` stays 0, `breakdown` false, `apologize` returns `{ accepted: true, cleared: 0 }`.

- [ ] **Step 1: Failing tests:**
  - `hit adds 4, kill adds 10`.
  - `apology clears only the most recent zombie's owed guilt` (hit A twice, hit B once → apologize clears 4, value 8).
  - `apology works for a zombie that already died` (kill C → apologize clears C's 10 + its earlier hits).
  - `apologizing with nobody owed clears 0 but is accepted`.
  - `respects the 1000 ms cooldown` (calls at 0 and 500 → second rejected; at 1000 → accepted).
  - Levels at 32/33/65/66; wobble 0/4/10.
  - `breakdown at 100 resets to 50 and clears owed guilt` (10 kills → 10th returns breakdown, value 50, next apologize clears 0).
  - `disabled meter never changes`.
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** PASS.
- [ ] **Step 5: Commit** `feat: guilt meter`.

### Task 11: Full Conscience in play (stage 5)

**Files:**
- Create: `src/features/guilt/GuiltBar.ts`
- Modify: `src/scenes/GameScene.ts`, `src/scenes/HudScene.ts`, `src/scenes/SummaryScene.ts`, `src/scenes/MenuScene.ts`

**Interfaces:**
- Consumes: `GuiltMeter` (Task 10); `gradeFor`, `scoreRun`, `getBest`, `saveIfBest` (Task 6); `InputSource.apologizePressed()`; `Hero.frozenUntil`.
- Produces: `GuiltBar` (HUD, 400×16 at top centre, colour shifts at levels 1 and 2), shown only when `mode.guilt`.

- [ ] **Step 1: Wire guilt.** `GameScene` creates `GuiltMeter(mode.guilt)`; feeds `onHit`/`onKill` with `zombieId`; emits `guiltChanged`. Breakdown: `hero.frozenUntil = now + 2000`, `hero.hurt` ignoring invulnerability (one heart), `say(pick('breakdown'))`. On `apologizePressed()` when `mode.guilt`: if `apologize(now).accepted` → `hero.frozenUntil = now + 500`, `say(pick('apology'))`, `runStats.apologies++`, emit `apologized`. Frozen hero cannot move or fire.
- [ ] **Step 2: Effects.** Each shot's angle is rotated by a random value in `±wobbleDegrees()`. Level 2 applies 40% desaturation to the Game camera (Phaser 4 camera filter, ColorMatrix saturate), removed when the level drops.
- [ ] **Step 3: Score.** Sample guilt once per second while a wave is active (`runStats.sampleGuilt`). On run end compute `scoreRun`, call `saveIfBest`, pass score to Summary. Summary shows the grade (conscience only) and "New best!" when saved. Menu shows `Best: {n}` under each mode button when `getBest` is not null.
- [ ] **Step 4: Verify** `npm run check && npm test && npm run build && npm run e2e` → PASS.
- [ ] **Step 5: Play checklist:**
  - Casual Remorse shows no guilt bar and Space does nothing.
  - Holding Space produces one apology per second at most.
  - Ignoring apologies: aim visibly wobbles past a third, screen greys past two-thirds, breakdown freezes the hero and costs a heart.
  - Summary grade matches play style (apologize after everything → Saint/Decent Person).
  - Best score persists after a page reload; in a private window with storage blocked the game still runs.
- [ ] **Step 6: Commit and push** `feat: Full Conscience mode`.

### Task 12: Touch controls (stage 6)

**Files:**
- Create: `src/shared/input/TouchInput.ts`, `src/shared/input/selectInput.ts`, `src/shared/input/selectInput.test.ts`
- Modify: `src/scenes/GameScene.ts`, `src/scenes/MenuScene.ts`, `src/app/main.ts` (`input.activePointers: 3`)

**Interfaces:**
- Consumes: `InputSource` (Task 4); `makeStore` (Task 2).
- Produces:
  - `class TouchInput implements InputSource { constructor(scene: Phaser.Scene, showSorryButton: boolean) }`: left-half floating joystick (radius 60, dead zone 0.15), right-half drag-to-aim with `firing()` true while held, "Sorry!" button (only when `showSorryButton`) above the right thumb area; multi-touch.
  - `type InputPref = 'auto' | 'touch' | 'mouse'`; `chooseInput(pref: InputPref, hasTouch: boolean): 'touch' | 'mouse'`; `getInputPref(store?)` / `setInputPref(pref, store?)` (key `inputPref`, unknown values → `'auto'`).
  - Menu toggle cycles Auto → Touch → Mouse. The menu's one-line controls hint follows the chosen input: mouse "WASD to move · mouse to aim · click to shoot · Space to apologize"; touch "Left thumb to move · drag right to aim and fire · tap Sorry! to apologize". (Task 1 shows the mouse hint as static text.)

- [ ] **Step 1: Failing tests** in `selectInput.test.ts`: `auto picks touch when touch exists`; `auto picks mouse otherwise`; `explicit preference wins`; `unknown stored value reads as auto`.
- [ ] **Step 2:** FAIL. **Step 3:** implement; `GameScene` builds its `InputSource` via `chooseInput`. Portrait (`scale.isPortrait`) shows a "Please rotate your phone" overlay and pauses; landscape removes it. **Step 4:** `npm test && npm run check && npm run build && npm run e2e` → PASS.
- [ ] **Step 5: Play checklist** (real phone on the live link, plus Chrome device emulation):
  - Move and aim at the same time with two thumbs.
  - Sorry! button appears only in Full Conscience.
  - Rotating to portrait pauses with the overlay; rotating back resumes on tap.
  - Menu toggle forces mouse controls on a touchscreen laptop.
- [ ] **Step 6: Commit and push** `feat: touch controls`.

### Task 13: Art, error handling and balance (stage 7)

**Files:**
- Create: `public/assets/kenney-topdown/` (sprites used + `License.txt`)
- Modify: `src/scenes/BootScene.ts`, entity files as needed for frame sizes, `src/features/waves/waves.ts` (tuning only), `README.md` (credits)

**Interfaces:**
- Consumes: the texture keys from Global Constraints (keep the same keys so no scene changes).

- [ ] **Step 1: Assets.** Kenney "Top-down Shooter" pack (CC0, kenney.nl). If the workspace can't download it, Kyle downloads the zip and adds it; copy only the survivor, two zombie variants, a small round projectile and a heart into `public/assets/kenney-topdown/` with the pack's `License.txt`. Credit Kenney in the README and on the menu's footer.
- [ ] **Step 2: BootScene loads the files** under the existing texture keys. On `this.load.on('loaderror')` show "Couldn't load the game. Try refreshing." and do not start `'Menu'`. Hero sprite rotates to face the aim point; zombies face the hero.
- [ ] **Step 3: Verify** `npm run check && npm test && npm run build && npm run e2e` → PASS. Manually rename an asset in `dist/` and run `npm run preview`: the error message shows instead of a blank screen.
- [ ] **Step 4: Balance pass.** Play each mode start to finish twice. Adjust only `waves.ts` numbers, `HERO`, and `ZOMBIE_STATS` speed; keep Task 5's tests passing or update them in the same commit with the new values. Target: a first-time player reaches wave 5–7 in Casual Remorse; Full Conscience is winnable while apologizing after most kills.
- [ ] **Step 5: Commit and push** `feat: Kenney art, load error, balance pass`.
- [ ] **Step 6: Milestone.** Second play test with 2–3 people, no instructions. Pass: laughs in wave 1 and they choose to play again.
