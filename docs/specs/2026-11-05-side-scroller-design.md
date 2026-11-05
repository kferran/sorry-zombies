# Sorry, Zombies — Side-Scroller Design

Date: 2026-11-05 · Status: Draft for review · Supersedes the arena as the main game (the arena stays as a bonus mode)

## 1. Purpose

A Castlevania-style side-scroller in which the hero apologizes every time he hurts or puts down one of the cemetery's undead. Play testing the arena showed the jokes were funny but buried by the pace. A throwaway spike (`spike/side-scroller`) showed that one-at-a-time encounters with a beat after each hit let the apologies land. This spec replaces the spike with the real thing.

**Audience:** friends and family, shared as a link.

**Success:** a friend plays without instructions, laughs at the apologies in level 1, and wants to see what the boss says.

### Constraints

- Phaser 4, TypeScript (strict), Vite, Vitest, Playwright. Same repo, same GitHub Pages deploy.
- Art: **GothicVania Cemetery** by ansimuz, artwork CC0 (OpenGameArt). Credit ansimuz on the menu and in the README. The pack's music is licensed separately (credit Pascal Belisle) and is not used unless sound is added later.
- Levels are built in **Tiled** and loaded as Tiled JSON.
- The top-down arena game stays playable from the menu as a bonus mode, unchanged in behavior.
- A full run takes about 10 minutes.

### Out of scope

New art beyond the pack (except tinting and scaling its sprites), voice, music, multiplayer, saving progress mid-run, more than three levels and one boss, level editor in the game.

## 2. Game flow

### Menu

- Title "Sorry, Zombies".
- Mode buttons: **Casual Remorse** and **Full Conscience**, each with its best score.
- Controls toggle (Auto / Touch / Mouse-keyboard) and its one-line hint, as today.
- A smaller link: **Bonus: The Arena**, which opens the existing arena menu flow.
- Footer credit: "Art: ansimuz (CC0) · Kenney (CC0)".

### A run

Three levels and a boss, in order. Each level is roughly 3 minutes.

| Stage | Name | Apology tier | Contents |
| --- | --- | --- | --- |
| 1 | The Gate | 1 (polite) | Flat ground and low graves to jump. About 8 skeletons. |
| 2 | The Old Graves | 2 (flustered) | Crumbling platforms and pillars. About 10 skeletons and 2–3 ghosts. |
| 3 | Mausoleum Hill | 3 (philosophical) | Uphill climb. About 10 skeletons and 3 hell-cats. |
| 4 | The Groundskeeper | 3, plus boss lines | Boss room (section 5). |

### Hearts, checkpoints, retries

- 3 hearts per run. At the start of each stage, 1 heart is restored, to a maximum of 3.
- Each level (not the boss) has one checkpoint lantern near its middle. Touching it lights it.
- Losing the last heart in a level restarts that level from its lit checkpoint (or its start if none is lit) with 3 hearts. Losing in the boss room restarts the boss fight with 3 hearts. A finished stage is never replayed.
- Every retry is counted and shown on the summary ("Tries: 3").

### Between stages

Reaching a level's exit gate shows a **level card**: the stage name, enemies hurt, enemies put to rest, apologies made, and one closing line (`levelCleared` kind). Any key or tap continues.

### End of run

After the boss, the **summary screen**: outcome (defeated the Groundskeeper / forgiven by the Groundskeeper), totals, tries, score, best-score flag, and in Full Conscience the grade.

## 3. Controls and combat

### Keyboard

| Action | Keys |
| --- | --- |
| Walk | ← → or A / D |
| Jump | W, ↑ or Space |
| Whip | J or left mouse button |
| Apologize (Full Conscience) | S or ↓ — the hero bows (pack's crouch pose) |
| Pause | Esc or P |

### Touch

Floating joystick on the left half (horizontal axis walks). Three buttons on the right: **Jump**, **Whip**, and **Sorry** (Full Conscience only). Landscape only, with the existing rotate overlay. Touch state resets on pause and resume.

### The hero

- Walk speed 90 world px/s, jump velocity tuned so the hero clears a 2-tile grave and reaches a 3-tile platform. Values live in `entities/hero/hero.stats.ts`.
- Animations from the pack: idle, run, jump, attack (6 frames), hurt, crouch (used as the bow), death.

### The whip

- Swing cooldown 450 ms. The pack's 6-frame attack plays over that time.
- The hitbox is active only on frames 3–5 and reaches about 1.5 hero-widths in front.
- A swing hits every enemy in reach. The hero says **one** line per swing (the line for the most serious result: a put-down beats a hit).

### On every hit

- 90 ms hit-stop (physics paused), a white flash on the enemy, and a small camera shake.
- Knockback away from the hero.
- The hero's apology bubble appears. The hit enemy waits until `min(1200 + 40 × line length, 3200)` ms have passed before acting again.
- An enemy that is put down plays the pack's enemy-death effect and is removed.

### Getting hurt

- Contact with an awake, non-waiting enemy costs 1 heart, knocks the hero back, and gives 1000 ms of flashing invulnerability.
- The hero says a `hurt` line.
- Levels have no bottomless pits.

## 4. Enemies

Every enemy is placed by a marker in the Tiled map's `spawns` layer.

| Enemy | Wakes when | Behavior | Hits | Stages |
| --- | --- | --- | --- | --- |
| Skeleton (clothed) | Hero within 210 world px horizontally (about half the view) | Plays the rise animation (the hero says a `rise` line), then walks toward the hero at 30 px/s. Cannot jump; turns around at ledge edges. | 3 | 1–4 |
| Ghost | Hero within 210 px | Fades in, drifts toward the hero at 25 px/s through terrain, bobbing. Fades out with a sigh when put down. | 1 | 2 |
| Hell-cat | Hero within 120 px | Pounces in an arc toward the hero, lands, waits 900 ms, repeats. Shows a name tag picked from a list. | 2 | 3 |

Asleep enemies are invisible (skeletons underground, ghosts faded, cats curled in shadow) and cannot hurt the hero.

## 5. The boss: the Groundskeeper

A large ghost (the pack's ghost, scaled 3× and tinted) who has tended this cemetery for 200 years and is furious about the whipping.

- **Room:** one screen, camera locked, two low platforms.
- **Health:** 12 hits, in three phases of 4.
- **Phase 1:** drifts side to side, swoops at the hero every 3 s.
- **Phase 2:** swoops every 2.5 s; raises 2 skeletons when the phase starts.
- **Phase 3:** swoops every 2 s; raises 3 skeletons when the phase starts.
- **Listening pause:** after each phase's 4th hit, the boss stops for 3 s, folds its arms and listens. It says a `bossJudge` line about the hero's apologies. Hits during the pause do nothing except trigger a `bossDisappointed` line.
- **The third pause** comes after the 12th hit and decides the ending.
- **Full Conscience:** bowing during a listening pause counts as a proper apology. The boss says a `bossAccept` line, and after pauses 1 and 2 the next phase raises one fewer skeleton. If the hero bowed in all three pauses, the third pause ends in **forgiveness** (`bossForgive` line); otherwise it ends in defeat. A bow outside a pause works as a normal apology.
- **Casual Remorse:** no bow exists, so pauses are comedy only and the third pause always ends in defeat.
- **Defeat:** the boss fades out with a `bossDefeat` line.

## 6. Full Conscience

### Guilt meter (existing `GuiltMeter`, with one fix)

- A hit adds 4, a put-down adds 10, tracked per enemy as debt, in hurt order.
- A bow freezes the hero for 500 ms, has a 1000 ms cooldown, and clears the debt of the most recently hurt enemy still owing any (alive or put down).
- **Breakdown at 100:** the hero kneels for 2000 ms, says a `breakdown` line, and loses 1 heart (ignoring invulnerability). The meter becomes 50 and **every debt is multiplied by 0.5**, so the debts still sum to the meter. (Fix: the arena version wiped the debts, leaving guilt that could never be cleared.)

### Effects of guilt

| Guilt | Effect |
| --- | --- |
| 0–32 | None |
| 33–65 | +100 ms swing cooldown (the hero hesitates) |
| 66–99 | +200 ms swing cooldown; 1 swing in 4 stops short with a `preApology` line and hits nothing; the camera desaturates 40% |
| 100 | Breakdown |

### Scoring

- `stagesCleared` counts levels and the boss (0–4).
- Base score: `stagesCleared × 250`.
- Conscience bonus (Full Conscience only): `round((100 − averageGuilt) × 5 × stagesCleared / 4)`. (Fix: the arena version paid the full bonus to a run that never fought.)
- Forgiveness bonus: +300.
- Average guilt is sampled once per second **only while at least one enemy is awake**.
- Grades unchanged: average guilt 0–14 Saint, 15–34 Decent Person, 35–59 Conflicted, 60–84 Callous, 85–100 Monster.
- Best score per mode, stored as today. Side-scroller and arena best scores are kept separately.

### Balance target

A scripted bot that bows after most put-downs finishes the run with at least one heart left in at least one of three seeds. Knobs if it doesn't: kill guilt and the 500 ms bow freeze.

## 7. Lines

`src/features/apologies/lines.ts` stays the single, family-editable file. New kinds are added; existing kinds keep their tiers.

| Kind | Tiered | Minimum count | Used when |
| --- | --- | --- | --- |
| hit, kill | yes (1–3) | 10 hit / 8 kill per tier | Skeleton hit or put down |
| rise | yes (1–3) | 4 per tier | A skeleton climbs out |
| ghostKill | no | 5 | A ghost is put down |
| catKill | no | 5 | A hell-cat is put down |
| hurt | no | 6 | The hero takes a hit |
| apology, breakdown | no | 8 / 4 | As today |
| preApology | no | 5 | A guilty swing stops short |
| levelCleared | no | 6 | Level card |
| bossJudge, bossDisappointed, bossAccept, bossForgive, bossDefeat | no | 4 each | Boss fight |
| summaryWin, summaryLose, summaryForgiven | no | 4 each | Summary |

The level's tier is used for `hit`, `kill` and `rise` (boss room uses tier 3). Existing lines that mention peas are rewritten for the whip. The arena keeps reading its own kinds and still works if a line mentions a whip.

## 8. Architecture

### Resolution

- The game stays 1280×720 with `Phaser.Scale.FIT`. `pixelArt: true` and `roundPixels: true` globally.
- Side-scroller scenes set camera zoom 3, so the visible world is about 427×240 px, matching the pack's 16 px tiles.
- An unzoomed **Overlay** scene runs above Level and Boss scenes. It draws hearts, the guilt bar, the stage name, the pause screen and the speech bubbles. Bubbles follow the hero by converting his world position to screen position each frame.

### Layout (feature-sliced; same import rules as the arena spec)

```
src/
  app/            main.ts — one Phaser game, every scene registered
  scenes/         Boot, Menu, Level, Boss, LevelCard, Summary, Overlay
  arena/          the bonus arena, moved here unchanged:
                  scenes/ (ArenaGame, ArenaHud, ArenaSummary), entities/, waves/
  features/
    apologies/    ApologyPicker, lines.ts, SpeechBubble (now drawn in Overlay)
    guilt/        GuiltMeter (halving fix), GuiltBar
    scoring/      Scoring (stage scoring, scaled bonus), bestScores
    levels/       LevelLoader — Tiled JSON → typed level data; validation
    combat/       SwingRules — cooldown, hesitation, active frames, stop-short
    boss/         BossBrain — phases, listening pauses, bows, forgiveness
  entities/       hero, skeleton, ghost, hellcat, groundskeeper (Phaser sprites)
  shared/         events, modes, storage, orientation, input/, ui/
public/
  maps/           level-1.json, level-2.json, level-3.json, boss.json
  assets/gothicvania-cemetery/   tileset, backgrounds, atlases used; CREDITS.txt
```

Pure logic files (`LevelLoader`, `SwingRules`, `BossBrain`, `GuiltMeter`, `Scoring`, `ApologyPicker`, `bestScores`, `storage`, `modes`) do not import Phaser.

### Tiled maps

- 16 px tiles, using the pack's tileset.
- Layers: `ground` (tile layer, collides), `decor` (tile layer, no collision), `spawns` (object layer).
- `spawns` object types: `hero` (exactly 1), `exit` (exactly 1 in levels, 0 in the boss room), `checkpoint` (0–1), `skeleton`, `ghost`, `cat`, `boss` (exactly 1 in the boss room). Optional property `name` on cats.
- Three parallax backgrounds from the pack (moon sky, mountains, graveyard) behind the map, at scroll factors 0.1, 0.3 and 0.6.
- First versions of all four maps are built by the implementer, starting from the pack's demo map. Kyle can edit them in Tiled afterwards.

### Level data (from `LevelLoader`)

```ts
type SpawnType = 'skeleton' | 'ghost' | 'cat';
type LevelData = {
  widthPx: number; heightPx: number;
  heroStart: { x: number; y: number };
  exit: { x: number; y: number } | null;
  checkpoint: { x: number; y: number } | null;
  bossAt: { x: number; y: number } | null;
  spawns: { type: SpawnType; x: number; y: number; name?: string }[];
};
```

`parseLevel(json): LevelData` throws a clear error naming the map and the problem (missing hero, two exits, unknown type, spawn outside the map).

### Events (typed bus, extended)

Existing events plus: `enemyRose { enemyId, kind }`, `enemyHit { enemyId, kind, stage }`, `enemyPutDown { enemyId, kind, stage }`, `stageCleared { stage }`, `bossListening { pause }`, `bossAccepted { pause }`, `bossForgave {}`, `retry { stage }`. Arena events stay as they are.

### Error handling

- A map that fails `parseLevel` shows "This level is broken: <reason>" with a Back to menu button instead of crashing.
- Asset load failure shows the existing load-error message.
- Pause on hidden tab and the portrait rule work as in the arena.

## 9. Testing

### Unit tests (Vitest, test-first)

- **LevelLoader:** parses each object type; rejects missing hero, duplicate exit, unknown type, out-of-bounds spawn; every shipped map in `public/maps/` passes.
- **SwingRules:** 450 ms base cooldown, +100 / +200 ms by guilt level; active frames 3–5 only; with a seeded random, about 1 in 4 swings stops short at level 2 and none below.
- **BossBrain:** 12 hits in phases of 4; listening pause after hits 4, 8 and 12 where hits are ignored; bow accepted only in Full Conscience during a pause; each accepted bow lowers the next phase's raise count by 1; three accepted bows → forgiven at the third pause, fewer → defeated; Casual → always defeated at the third pause.
- **GuiltMeter:** breakdown halves every debt and debts still sum to the meter; an apology after a breakdown clears the halved debt.
- **Scoring:** 250 per stage; scaled bonus (0 stages → 0 bonus); forgiveness +300; guilt sampling only counts awake time.
- **Lines:** minimum counts per kind; no `hit`/`kill`/`rise` line contains "pea".

### Not unit-tested

Phaser scenes, sprites and physics. Each build stage has a scripted play check (Playwright drives the game and reads state, with screenshots).

### Smoke test (Playwright)

Starts a side-scroller run in each mode and the arena, waits for the Overlay (or Arena HUD) and the first stage to be running, and checks for no console errors.

### Bots

Scripted players run both modes. Pass: a good bot finishes Casual Remorse; a bot that bows after most put-downs finishes Full Conscience (section 6 target).

## 10. Build order

1. Move the arena into `src/arena/`, tests green; add the pack; pixel-art settings; menu with the Bonus link.
2. Hero: run, jump, whip with animations on the pack's demo map; Overlay with hearts and bubbles.
3. Skeletons: rise, walk, hit-stop, wait-for-apology; new line kinds.
4. LevelLoader and level 1 in Tiled, with checkpoint, exit and level card. **Milestone: Kyle plays level 1.**
5. Ghosts, hell-cats, levels 2 and 3, run flow, summary.
6. The Groundskeeper.
7. Full Conscience: bow, guilt effects, halving fix, scoring and grades; bot balance pass.
8. Touch controls, rewritten lines, polish. **Milestone: friends play test.**

## 11. Later

- Music and sound effects (the pack's music with credit).
- More enemy variety from GothicVania Swamp (CC0).
- Lines written by friends and family, credited on the summary.
