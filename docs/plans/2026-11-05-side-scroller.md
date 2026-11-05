# Sorry, Zombies Side-Scroller Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the arena as the main game with a three-level-plus-boss GothicVania side-scroller in both modes, keeping the arena as a bonus mode.

**Architecture:** Pure TypeScript rules (`LevelLoader`, `SwingRules`, `BossBrain`, `GuiltMeter`, `Scoring`, `ApologyPicker`, `RunState` decisions) with Vitest tests; Phaser scenes compose them through the typed bus. Side-scroller scenes run at camera zoom 3 over Tiled maps; an unzoomed Overlay scene draws HUD and speech bubbles. The arena moves whole into `src/arena/`.

**Tech Stack:** Phaser 4 (arcade physics, tilemaps), TypeScript strict, Vite, Vitest, Playwright, Tiled JSON.

**Spec:** `docs/specs/2026-11-05-side-scroller-design.md` (arena spec `docs/specs/2026-11-04-sorry-zombies-design.md` still governs the bonus arena)

## Global Constraints

- Game 1280×720, `Phaser.Scale.FIT`, `pixelArt: true`, `roundPixels: true`. Side-scroller cameras `setZoom(3)`; world view ≈ 427×240.
- Tiles 16 px. Maps are 15 tiles tall (240 px) so the zoomed view fills the screen height. (The pack's demo map is 14 tall; ours are not.)
- Art from `public/assets/gothicvania-cemetery/` only (copied from the pack: `atlas.png/json`, `atlas-props.png/json`, `tileset.png`, `objects.png`, `bg-moon.png`, `bg-mountains.png`, `bg-graveyard.png`) plus `CREDITS.txt` ("GothicVania Cemetery by ansimuz, CC0 (OpenGameArt). Music not included.").
- Atlas frame names: `hero-idle-1..4`, `hero-run-1..6`, `hero-jump-1..4`, `hero-attack-1..5`, `hero-crouch`, `hero-hurt` (single frames, no number), `skeleton-rise-clothed-1..6`, `skeleton-clothed-1..8`, `ghost-halo-1..4`, `hell-gato-1..4`, `enemy-death-1..5`.
- Feature-sliced imports: `app → scenes → features → entities → shared`; `arena/` may import `features`, `entities`, `shared`; nothing imports `arena/` except `app/main.ts` and `MenuScene`. Features never import each other. Pure files (named in Architecture) never import `phaser`.
- Scene keys: `'Boot'`, `'Menu'`, `'Level'`, `'Boss'`, `'LevelCard'`, `'Summary'`, `'Overlay'`; arena: `'ArenaGame'`, `'ArenaHud'`, `'ArenaSummary'`.
- Spec numbers (exact): walk 90 px/s; skeleton 30 px/s, wakes within 210 px, 3 hits; ghost 25 px/s, wakes within 210 px, 1 hit; cat wakes within 120 px, 2 hits, 900 ms between pounces; swing cooldown 450 ms (+100 / +200 by guilt level), active frames 3–5; hit-stop 90 ms; enemy wait `min(1200 + 40 × line length, 3200)` ms; contact costs 1 heart, 1000 ms invulnerability; bow freeze 500 ms, cooldown 1000 ms; breakdown kneel 2000 ms; boss 12 hits in phases of 4, swoop every 3000 / 2500 / 2000 ms, raises 0 / 2 / 3 skeletons, listening pause 3000 ms; stage worth 250; bonus `round((100 − avg) × 5 × stagesCleared / 4)`; forgiveness +300.
- Stages: `[{ key: 'level-1', name: 'The Gate', tier: 1 }, { key: 'level-2', name: 'The Old Graves', tier: 2 }, { key: 'level-3', name: 'Mausoleum Hill', tier: 3 }, { key: 'boss', name: 'The Groundskeeper', tier: 3 }]`.
- Best-score keys: `best:side:<modeId>` and `best:arena:<modeId>`.
- `window.__SORRY__` stays the `Phaser.Game`; `game.registry.get('bus')` stays the bus.
- Commits end with the session's `Co-Authored-By` / `Claude-Session` trailers. Work on branch `side-scroller`.

## Review Focus

1. **Last heart lost on the same frame the hero reaches the exit or a checkpoint.** Expect the loss to win (consistent with the arena) and a clean retry. → Task 8 test `decideFrame: hearts gone beats reaching the exit`.
2. **A retry after a messy level.** Expect enemies back asleep at their markers, hearts 3, the lit checkpoint kept, guilt and run stats carried over (shame is not erased), `tries` + 1. → Task 8 tests on `RunState.retry()`.
3. **Kyle edits a map in Tiled and makes a mistake** (deletes the hero start, adds a second exit, types `skeletn`). Expect a "This level is broken: …" screen with a Back button, not a black canvas. → Task 3 tests plus the Task 8 play check that loads a broken map.
4. **Whip, jump or bow pressed during hit-stop, a pause, or the level card.** Expect nothing queued to fire afterwards. → Task 6 `reset()` contract; Task 7 play check; inputs reset on `PAUSE`, `RESUME` and stage start.
5. **An enemy knocked back off a ledge, or a hero falling while frozen in a bow or breakdown.** Expect both to land on ground and never leave the map. → Task 7/9 play checks with world-bound collisions on every body.

---

## File Structure

```
tools/make-maps.mjs                 one-off generator: ASCII layouts → Tiled JSON (output is the source of truth after)
tools/layouts/{level-1,level-2,level-3,boss}.txt
public/maps/{level-1,level-2,level-3,boss}.json
public/assets/gothicvania-cemetery/ pack files + CREDITS.txt
src/app/main.ts
src/arena/scenes/{ArenaGameScene,ArenaHudScene,ArenaSummaryScene}.ts   moved + renamed
src/arena/entities/{hero,zombie,pea}/…                                   moved
src/arena/waves/…                                                         moved from features/waves
src/scenes/{BootScene,MenuScene,LevelScene,BossScene,LevelCardScene,SummaryScene,OverlayScene}.ts
src/scenes/run/{stages.ts,RunState.ts,RunState.test.ts}
src/features/apologies/{ApologyPicker,lines,SpeechBubble}.ts
src/features/guilt/{GuiltMeter,GuiltBar}.ts
src/features/scoring/{Scoring,bestScores}.ts
src/features/levels/{LevelLoader,LevelLoader.test}.ts
src/features/combat/{SwingRules,SwingRules.test}.ts
src/features/boss/{BossBrain,BossBrain.test}.ts
src/entities/health/Health.ts                 (was ZombieHealth; used by both games)
src/entities/hero/{Hero,hero.stats}.ts         side-scroller hero
src/entities/enemy/{Enemy,Skeleton,Ghost,HellCat,Groundskeeper,enemy.stats}.ts
src/shared/input/{PlatformInput,KeyboardPlatformInput,TouchPlatformInput}.ts
src/shared/events.ts, src/shared/ui/Button.ts, …
e2e/smoke.spec.ts
```

---

### Task 1: Move the arena aside, add the pack, pixel-art settings

**Files:**
- Move: `src/scenes/{GameScene,HudScene,SummaryScene}.ts` → `src/arena/scenes/{ArenaGameScene,ArenaHudScene,ArenaSummaryScene}.ts` (keys `'ArenaGame'`, `'ArenaHud'`, `'ArenaSummary'`); `src/entities/{hero,pea,zombie}` → `src/arena/entities/…`; `src/features/waves` → `src/arena/waves`; `src/entities/zombie/ZombieHealth.ts` → `src/entities/health/Health.ts` (class `Health`, same API).
- Modify: `src/app/main.ts`, `src/scenes/MenuScene.ts`, `src/features/scoring/bestScores.ts`, `e2e/smoke.spec.ts`, `README.md`
- Delete: `src/spike/` (on this branch it was never merged; confirm absent)
- Create: `public/assets/gothicvania-cemetery/*` + `CREDITS.txt`

**Interfaces:**
- Produces: `MenuScene.startArena(modeId: ModeId): void` (starts `'ArenaGame'` with `{ mode }`); `MenuScene.startRun(modeId: ModeId): void` (Task 9 wires it; until then it starts `'Level'` stub); `getBest(game: 'side' | 'arena', modeId, store?)`, `saveIfBest(game, modeId, score, store?)`.

- [ ] **Step 1: Update `bestScores.test.ts`** to the new signatures; add `side and arena scores are separate`. Run → FAIL.
- [ ] **Step 2: Implement** the new `bestScores` keys; move files with `git mv`; fix imports; rename scene keys. Arena summary "Play again" returns to `'Menu'`.
- [ ] **Step 3:** `npm test && npm run check` → all green (arena tests unchanged in count).
- [ ] **Step 4: Assets + config.** Copy the pack files listed in Global Constraints. `main.ts`: `pixelArt: true`, `roundPixels: true`; register the new scene keys (stubs are fine). BootScene loads `atlas`, `atlas-props`, tileset images and backgrounds under keys `gv-atlas`, `gv-props`, `gv-tiles`, `gv-objects`, `gv-bg-moon`, `gv-bg-mountains`, `gv-bg-graveyard`, keeping the arena's Kenney keys and the missing-texture check for all of them.
- [ ] **Step 5: Menu.** Mode buttons call `startRun`; a smaller "Bonus: The Arena" text button opens a two-button arena mode picker (Casual Remorse / Full Conscience → `startArena`). Footer: "Art: ansimuz (CC0) · Kenney (CC0)". Best scores shown are `side`.
- [ ] **Step 6: Smoke test** gains `arena <mode>` cases that call `startArena` and wait for `'ArenaHud'` + `ArenaGame.director.currentWave === 1`. The two side cases wait only for `'Level'` active for now.
- [ ] **Step 7:** `npm run check && npm test && npm run build && npm run e2e` → PASS. Play check: arena still plays from the Bonus link (Kenney art crisp under pixelArt).
- [ ] **Step 8: Commit** `refactor: move arena into src/arena, add GothicVania pack`.

### Task 2: Guilt halving fix, stage scoring, new line kinds

**Files:**
- Modify: `src/features/guilt/GuiltMeter.ts` + test, `src/features/scoring/Scoring.ts` + test, `src/features/apologies/{ApologyPicker,lines}.ts` + test

**Interfaces:**
- Produces:
  - `GuiltMeter` breakdown: value 50, every debt × 0.5 (debts still sum to the value). All other behavior unchanged. Applies to the arena too (spec fix).
  - `class StageStats { stagesCleared = 0; enemiesHurt = 0; enemiesPutDown = 0; apologies = 0; tries = 1; forgiven = false; sampleGuilt(v: number, anyAwake: boolean): void; averageGuilt(): number }`.
  - `stageConscienceBonus(avgGuilt: number, stagesCleared: number): number`; `scoreStageRun(stats: StageStats, mode: ModeConfig): number` = `stagesCleared × 250` + (guilt mode: bonus + (forgiven ? 300 : 0)).
  - `LineKind` adds `'rise' | 'hurt' | 'ghostKill' | 'catKill' | 'preApology' | 'levelCleared' | 'bossJudge' | 'bossDisappointed' | 'bossAccept' | 'bossForgive' | 'bossDefeat' | 'summaryForgiven'`. Tiered kinds: `hit`, `kill`, `rise`.

- [ ] **Step 1: Failing tests:**
  - GuiltMeter: `breakdown halves every debt and keeps the sum equal to the meter` (kills A,B,C… to 100 → value 50; apologize clears half of the last debt, i.e. 5); `apology after a breakdown clears the halved debt`. Update the old arena test name/expectation `breakdown at 100 resets to 50 and halves owed guilt`.
  - Scoring: `0 stages cleared earns no bonus`; `4 stages at avg 20 → 1000 + 400`; `2 stages at avg 0 → 500 + 250`; `forgiven adds 300 in conscience only`; `samples taken while nobody is awake are ignored`.
  - Lines: minimum counts per spec section 7 (hit/kill per tier 10/8, rise 4 per tier, ghostKill 5, catKill 5, hurt 6, apology 8, breakdown 4, preApology 5, levelCleared 6, each boss kind 4, each summary kind 4); `no hit, kill or rise line mentions peas` (`/\bpeas?\b/i`); existing length/dup rules still hold.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3: Implement.** Write the new lines in the established voice; rewrite pea lines for a whip ("That was a whip-related incident. Sorry."). `tierForWave` stays for the arena. Extend the signature to `pick(kind: LineKind, wave = 1, tier?: Tier): string`; an explicit `tier` wins over the wave (test: `explicit tier overrides the wave`).
- [ ] **Step 4:** `npm test` → PASS. **Step 5: Commit** `feat: guilt halving fix, stage scoring, side-scroller lines`.

### Task 3: LevelLoader and the four maps

**Files:**
- Create: `src/features/levels/LevelLoader.ts` + test, `tools/make-maps.mjs`, `tools/layouts/*.txt`, `public/maps/*.json`

**Interfaces:**
- Produces: `LevelData` and `SpawnType` exactly as spec section 8; `class LevelError extends Error`; `parseLevel(json: unknown, mapName: string): LevelData` (object type read from `type` or `class`; pixel coordinates are object `x`, `y` with `y` = object bottom; `exit`/`checkpoint`/`bossAt` null when absent).

- [ ] **Step 1: Failing tests** (fixtures built inline as minimal Tiled JSON):
  - `parses hero, exit, checkpoint and every enemy type` (incl. cat `name`).
  - `rejects a map with no hero` → throws `LevelError` whose message contains the map name and "hero".
  - `rejects two exits`, `rejects an unknown type ("skeletn")`, `rejects a spawn outside the map`.
  - `boss room has bossAt and no exit`.
  - `every shipped map is valid`: for each of `level-1..3` and `boss`, read `public/maps/<key>.json` with `fs` and `parseLevel` it; levels have an exit and a checkpoint; boss has `bossAt`. Counts: level-1 ≥ 8 skeletons; level-2 ≥ 10 skeletons and 2–3 ghosts; level-3 ≥ 10 skeletons and 3 cats; all maps 15 tiles tall.
- [ ] **Step 2:** FAIL. **Step 3: Implement `parseLevel`.**
- [ ] **Step 4: Maps.** `tools/make-maps.mjs` reads `tools/layouts/<key>.txt` (one char per tile: `#` ground, `=` one-way-free platform, `.` empty, `H` hero, `E` exit, `C` checkpoint, `S` skeleton, `G` ghost, `K` cat, `B` boss) and writes Tiled 1.10 JSON with layers `ground` (tile layer), `decor` (tile layer, sparse graves/stones from `objects`), `spawns` (object layer) and tilesets `gv-tiles` (`../assets/gothicvania-cemetery/tileset.png`, 16 px, 28 columns, 280 tiles) and `gv-objects` (`objects.png`, 39 columns, 468 tiles). Choose the grass-top, fill and edge gids by reading the pack's demo `Main Layer`; put them as named constants at the top of the script. Layout lengths: level-1 ~160 tiles, level-2 ~190, level-3 ~190 (rising), boss 27 tiles (one screen). README: after generation the JSON is the source of truth; edit in Tiled.
- [ ] **Step 5:** `npm test` → PASS (shipped-map tests included). **Step 6: Commit** `feat: level loader and first maps`.

### Task 4: SwingRules

**Files:** Create `src/features/combat/SwingRules.ts` + test.

**Interfaces:**
- Produces: `SWING = { baseCooldownMs: 450, hesitationMs: [0, 100, 200], frames: 5, activeFrames: [3, 4, 5], stopShortChance: 0.25 }`; `class SwingRules { constructor(rng?: () => number); tryStart(nowMs: number, guiltLevel: 0 | 1 | 2): { started: boolean; stopShort: boolean }; isActiveFrame(frame: number /* 1-based */): boolean }`. Stop-short only at level 2. The pack's attack has 5 frames; spec "frames 3–5" is kept.

- [ ] **Step 1: Failing tests:** `swings no faster than 450 ms at level 0`; `level 1 adds 100 ms`; `level 2 adds 200 ms`; `active only on frames 3, 4, 5`; `about 1 in 4 swings stop short at level 2` (seeded rng, 400 swings → 80–120); `never stops short below level 2`.
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** PASS. **Step 5: Commit** `feat: swing rules`.

### Task 5: BossBrain

**Files:** Create `src/features/boss/BossBrain.ts` + test.

**Interfaces:**
- Produces: `type BossState = 'phase' | 'listening' | 'forgiven' | 'defeated'`; `class BossBrain { constructor(guilt: boolean); readonly state: BossState; readonly phase: 1 | 2 | 3; readonly pause: 0 | 1 | 2 | 3; readonly accepted: number; hit(): 'counted' | 'ignored'; bow(): boolean; endPause(): BossState; raisesForPhase(phase: 1 | 2 | 3): number; swoopIntervalMs(): number }`.
  - Raises: phase 1 → 0; phase 2 → `2 − (bowed at pause 1 ? 1 : 0)`; phase 3 → `3 − (bowed at pause 2 ? 1 : 0)`.
  - Swoop interval 3000 / 2500 / 2000 by phase.

- [ ] **Step 1: Failing tests:** `4 hits end phase 1 and start listening`; `hits during listening are ignored`; `endPause moves to phase 2`; `12 hits across phases reach the third pause`; `bow accepted only in Full Conscience while listening, once per pause`; `a bow lowers the next phase's raises by 1`; `three bows → forgiven at the third pause`; `two bows → defeated`; `casual → always defeated`; `swoop intervals by phase`.
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** PASS. **Step 5: Commit** `feat: boss brain`.

### Task 6: Hero, Level scene, Overlay (walk, jump, whip on level 1)

**Files:**
- Create: `src/shared/input/{PlatformInput,KeyboardPlatformInput}.ts`, `src/entities/hero/{Hero,hero.stats}.ts`, `src/scenes/LevelScene.ts`, `src/scenes/OverlayScene.ts`, `src/scenes/run/stages.ts`
- Modify: `src/features/apologies/SpeechBubble.ts`, `src/shared/events.ts`

**Interfaces:**
- Consumes: `parseLevel` (Task 3), `SwingRules` (Task 4).
- Produces:
  - `interface PlatformInput { moveX(): number /* -1..1 */; jumpPressed(): boolean; whipPressed(): boolean; bowPressed(): boolean; reset(): void; destroy(): void }` — the three `*Pressed` are edge-triggered queues (keydown events, repeats ignored), cleared by `reset()`.
  - `HERO = { walk: 90, jumpVelocity: 300, hearts: 3, invulnMs: 1000, knockback: 120 }` (tune `jumpVelocity` so a 2-tile grave is clearable and a 3-tile platform reachable at gravity 900).
  - `class Hero extends Phaser.Physics.Arcade.Sprite` with `frozenUntil`, `facing: 1 | -1`, `hurt(now, force?)`, `play` of `hero-idle|run|jump|attack|crouch|hurt` anims created once in Boot.
  - `SpeechBubble(scene, project?: (p: Vec) => Vec)`: when `project` is given, the followed world point is mapped to screen each frame.
  - `OverlayScene` (`init({ mode, stageName })`): hearts from `heartsChanged { hearts }` (new event), stage name top-centre, bubbles via `say(text: string, target: Vec)` that projects through the Level camera, pause (Esc/P, tab hidden, portrait rule) moved from the arena HUD pattern.
  - `STAGES` per Global Constraints.
  - `LevelScene.init({ run, stageIndex })` (RunState arrives in Task 8; until then a local `{ mode, hearts }`), `create()` loads `maps/<key>.json`, builds the tilemap with `ground` collisions, three parallax images (scroll 0.1 / 0.3 / 0.6), zoom 3, camera follows hero with bounds, world bounds = map size.
- [ ] **Step 1: Implement** input, hero, overlay, level scene, swing using `SwingRules` (whip hitbox: 24×20 world px in front during active frames). Inputs `reset()` on scene `PAUSE`, `RESUME` and `create`.
- [ ] **Step 2:** `npm run check && npm test && npm run build && npm run e2e` → PASS (smoke side cases now wait for `'Overlay'` too).
- [ ] **Step 3: Play check (scripted):** hero walks 90 px/s, jumps onto a 3-tile platform, cannot leave the map; whip anim plays and a swing every ≥450 ms; bubble text is crisp (Overlay unzoomed) and follows the hero across the level; pausing mid-swing then resuming fires nothing queued.
- [ ] **Step 4: Commit** `feat: hero, level scene and overlay`.

### Task 7: Skeletons, hit-stop and the wait

**Files:** Create `src/entities/enemy/{Enemy,Skeleton,enemy.stats}.ts`; modify `LevelScene.ts`, `events.ts`.

**Interfaces:**
- Consumes: `Health` (Task 1), `ApologyPicker.pick` with tier (Task 2).
- Produces:
  - `ENEMY = { skeleton: { hits: 3, speed: 30, wake: 210 }, ghost: { hits: 1, speed: 25, wake: 210 }, cat: { hits: 2, wake: 120, pounceGapMs: 900 } }`.
  - `abstract class Enemy extends Phaser.Physics.Arcade.Sprite { enemyId: number; kind: SpawnType; health: Health; awake: boolean; waitUntil: number; abstract wake(now: number): void; abstract think(hero: Vec, now: number): void; canHurt(now): boolean /* awake && now >= waitUntil && !health.dead */ }`.
  - Events `enemyRose { enemyId, kind }`, `enemyHit { enemyId, kind, stage }`, `enemyPutDown { enemyId, kind, stage }`, `heartsChanged { hearts }`.
- [ ] **Step 1: Implement** Skeleton (asleep invisible underground; wake → `skeleton-rise-clothed` anim then walk; turns at ledge edges by probing the ground tile ahead; collides with world bounds and `ground`). LevelScene: spawn from `LevelData`; swing hits every enemy overlapping the hitbox, one line per swing (put-down beats hit); 90 ms hit-stop via `physics.pause()`, white flash (`setTintMode(FILL)`), camera shake 80 ms / 0.004, knockback, `waitUntil = now + min(1200 + 40 × len, 3200)`; put-down plays `enemy-death` then removes. Contact: heart −1, knockback, 1000 ms invulnerability, `hurt` line. `rise` line on wake (tiered by stage).
- [ ] **Step 2:** check/test/build/e2e → PASS.
- [ ] **Step 3: Play check:** skeletons rise one at a time as the hero approaches; each swat freezes, flashes, knocks back, and the skeleton stays put until the bubble's time is up; a skeleton knocked off a ledge lands on lower ground; two skeletons in reach take one swing → one line; no enemy hurts the hero while asleep or waiting.
- [ ] **Step 4: Commit** `feat: skeletons, hit-stop and apology waits`.

### Task 8: Run flow — RunState, checkpoint, exit, retry, level card, summary

**Files:** Create `src/scenes/run/RunState.ts` + test, `src/scenes/LevelCardScene.ts`; rewrite `src/scenes/SummaryScene.ts` (side-scroller); modify `LevelScene.ts`, `MenuScene.ts`.

**Interfaces:**
- Consumes: `StageStats`, `scoreStageRun`, `getBest/saveIfBest('side', …)`, `GuiltMeter`, `STAGES`.
- Produces:
  - `class RunState { constructor(mode: ModeConfig); mode; stats: StageStats; guilt: GuiltMeter; hearts: number; stageIndex: number; checkpointLit: boolean; startStage(index: number): void /* hearts = min(3, hearts + 1) except first stage = 3; checkpointLit = false */; retry(): void /* hearts = 3; tries++; keeps guilt, stats, checkpointLit */; clearStage(): void /* stagesCleared++ */ }`.
  - `decideFrame(hearts: number, atExit: boolean): 'retry' | 'clear' | 'continue'` (hearts ≤ 0 wins).
  - `LevelCardScene.init({ run, stage })`; `SummaryScene.init({ run, outcome: 'defeated' | 'forgiven' | 'lost' })` shows totals, tries, score, "New best!", grade in Full Conscience, and a `summaryWin` / `summaryForgiven` closing line.
- [ ] **Step 1: Failing tests:** `startStage restores one heart up to 3`; `first stage starts with 3`; `retry resets hearts to 3, counts a try, keeps guilt, stats and the lit checkpoint`; `decideFrame: hearts gone beats reaching the exit`; `decideFrame: exit with hearts clears`.
- [ ] **Step 2:** FAIL. **Step 3: Implement**; LevelScene respawns at the checkpoint when lit; on `retry` rebuilds enemies from `LevelData` asleep. A map that throws `LevelError` shows "This level is broken: <message>" and a Back to menu `Button`.
- [ ] **Step 4:** check/test/build/e2e → PASS.
- [ ] **Step 5: Play check:** clear level 1 → level card with tally and a `levelCleared` line → level 2 starts with hearts +1; die after the checkpoint → respawn at the lantern with 3 hearts, enemies asleep again, "Tries: 2" on the summary later; rename `hero` to `heroo` in a copy of level-1 JSON served locally → broken-level screen. **Milestone: Kyle plays level 1** (publish a private preview build as in the spike if the PR is not merged).
- [ ] **Step 6: Commit** `feat: run flow, checkpoints, retries, level card, summary`.

### Task 9: Ghosts, hell-cats, levels 2 and 3

**Files:** Create `src/entities/enemy/{Ghost,HellCat}.ts`; modify `LevelScene.ts`, `lines.ts` (if counts short).

**Interfaces:**
- Consumes: `Enemy`, `ENEMY` (Task 7).
- Produces: `Ghost` (no gravity, ignores `ground`, fades in on wake, bobs ±3 px at 1.5 Hz, drifts at 25 px/s, `ghostKill` line), `HellCat` (gravity, pounce arc toward hero: vx ±110, vy −180, then 900 ms wait; name tag text from `name` or one of `['Mr. Whiskers', 'Biscuit', 'Duchess', 'Sir Pounce']`, drawn in Overlay above the cat; `catKill` line names the cat).
- [ ] **Step 1: Implement** and hook spawn types.
- [ ] **Step 2:** check/test/build/e2e → PASS.
- [ ] **Step 3: Play check:** ghosts pass through graves, die in one swat; cats pounce, rest 900 ms, show their name, die in two; level 2 and 3 are completable by the Task 13 bot (run it early here on Casual).
- [ ] **Step 4: Commit** `feat: ghosts, hell-cats, levels 2 and 3`.

### Task 10: The Groundskeeper

**Files:** Create `src/entities/enemy/Groundskeeper.ts`, `src/scenes/BossScene.ts`.

**Interfaces:**
- Consumes: `BossBrain` (Task 5), `Skeleton` (Task 7), `RunState` (Task 8).
- Produces: `BossScene.init({ run })`; events `bossListening { pause }`, `bossAccepted { pause }`, `bossForgave {}`.
- [ ] **Step 1: Implement.** Groundskeeper = `ghost-halo` frames, scale 3, tint `0xb8c4ff`, no gravity; patrols side to side; swoops at the hero every `swoopIntervalMs()`; on phase start raises `raisesForPhase` skeletons at random ground points. Listening pause 3000 ms: arms folded (stop moving, slight tint change), `bossJudge` line in a bubble above the boss; hits → `bossDisappointed`; bow (Task 11) → `bossAccept`. `endPause()` result `forgiven` → `bossForgive` line, `run.stats.forgiven = true`; `defeated` → `bossDefeat` line, fade out. Then `clearStage()` and Summary.
- [ ] **Step 2:** check/test/build/e2e → PASS.
- [ ] **Step 3: Play check:** three phases with 0 / 2 / 3 raises in Casual; hits during pauses ignored with a line; the fight ends in defeat in Casual.
- [ ] **Step 4: Commit** `feat: the Groundskeeper`.

### Task 11: Full Conscience in play

**Files:** Modify `LevelScene.ts`, `BossScene.ts`, `OverlayScene.ts` (GuiltBar), `SummaryScene.ts`.

**Interfaces:**
- Consumes: `GuiltMeter`, `SwingRules.tryStart(now, level)`, `BossBrain.bow()`, `StageStats.sampleGuilt(v, anyAwake)`.
- [ ] **Step 1: Implement.** Bow (`bowPressed`, guilt mode only): `guilt.apologize(now)`; on accept → crouch pose, `frozenUntil = now + 500`, `apology` line (or `bossAccept` in a boss pause via `BossBrain.bow()`), `stats.apologies++`. Hits/put-downs feed `onHit/onKill(enemyId)`; breakdown → kneel 2000 ms, `hurt(now, true)`, `breakdown` line. Swing uses `tryStart(now, guilt.level())`; `stopShort` → `preApology` line, no hitbox. Level 2 guilt → camera ColorMatrix saturate −0.4. Sample guilt every 1000 ms with `anyAwake`. Summary grade via `gradeFor`, score via `scoreStageRun`, best via `saveIfBest('side', …)`.
- [ ] **Step 2:** check/test/build/e2e → PASS.
- [ ] **Step 3: Play check:** Casual has no guilt bar and ↓ does nothing; ignoring bows → hesitation, stop-short lines, grey screen, breakdown costs a heart and guilt can fall below 50 again by bowing; three boss bows → forgiven ending with +300.
- [ ] **Step 4: Commit** `feat: Full Conscience in the side-scroller`.

### Task 12: Touch controls

**Files:** Create `src/shared/input/TouchPlatformInput.ts`; modify `LevelScene.ts`, `BossScene.ts`, `OverlayScene.ts`.

**Interfaces:**
- Consumes: `TouchSticks` (horizontal axis only), `chooseInput`, `getInputPref`.
- Produces: `TouchPlatformInput implements PlatformInput` — left half floating stick (x axis), right side buttons Jump (bottom-right), Whip (left of Jump), Sorry (above, Full Conscience only), drawn in Overlay (unzoomed) and hit-tested in screen space.
- [ ] **Step 1: Implement**; menu hint for touch: "Left thumb to walk · Jump · Whip · Sorry! to bow".
- [ ] **Step 2:** check/test/build/e2e → PASS.
- [ ] **Step 3: Play check (emulated phone, CDP multi-touch):** walk + whip at once; jump while walking; Sorry only in Full Conscience; rotate with thumbs down → nothing stuck after resume.
- [ ] **Step 4: Commit** `feat: touch controls for the side-scroller`.

### Task 13: Smoke, bots, balance, polish

**Files:** Modify `e2e/smoke.spec.ts`, `README.md`, stats/map files for tuning only.

- [ ] **Step 1: Smoke:** side cases wait for `'Overlay'` and `LevelScene.levelData` loaded, 500 ms, no errors; arena cases as Task 1.
- [ ] **Step 2: Bots (scratch script, not committed):** keyboard bot that walks right, swats when an enemy is within reach, jumps at walls, and in Full Conscience bows after a put-down when no enemy is within 60 px. Three seeds per mode.
- [ ] **Step 3: Balance targets:** good bot finishes Casual; bowing bot finishes Full Conscience with ≥1 heart in ≥1 of 3 seeds; full run 8–12 minutes for the bot. Knobs: map enemy counts/spacing, `ENEMY` speeds, `HERO.jumpVelocity`; for Full Conscience, kill guilt and bow freeze only with a ledger ruling (spec numbers). Keep every test green or update it in the same commit.
- [ ] **Step 4: Polish:** README (side-scroller controls, Tiled editing, credits); delete `spike/` remnants; menu credit line.
- [ ] **Step 5:** `npm run check && npm test && npm run build && npm run e2e` → PASS. **Step 6: Commit** `feat: balance pass and polish`. **Milestone: friends play test.**
