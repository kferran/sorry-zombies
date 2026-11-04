# Sorry, Zombies — Design

Date: 2026-11-04 · Status: Draft for review

## 1. Purpose

A top-down zombie wave shooter in which the hero apologizes every time he hurts or kills a zombie. It is Kyle's first game, built to share with friends and family as a link.

**Success for the prototype:** a friend opens the link, picks a mode, laughs at the apologies within the first wave, and plays one more round.

### Constraints

- Phaser 4, TypeScript, Vite. Runs in desktop and phone browsers; desktop is built first.
- Art comes from one free CC0 pixel-art pack (Kenney), stored with its license file.
- Hosted free on GitHub Pages at `https://kferran.github.io/sorry-zombies/`.
- One arena, one weapon, no saving beyond best scores, no accounts, no backend.
- A full run takes about 5–10 minutes.
- Sound is optional. Apologies appear as speech bubbles, not voice.

### Out of scope for the prototype

Story, multiple levels, upgrades or shops, multiplayer, voice acting, leaderboards, zombie reactions to apologies, non-lethal options (see section 9).

## 2. Core game loop (shared by both modes)

### Start screen

- Title "Sorry, Zombies".
- Two mode buttons: **Casual Remorse** (flavor) and **Full Conscience** (mechanic).
- Best score shown under each mode.
- A one-line controls hint for the current device.
- A toggle to force touch controls on or off (for touchscreen laptops).

### Arena

- One fixed screen; no scrolling or camera movement.
- Logical size 1280×720, scaled to the window with Phaser's FIT scale mode.
- The hero starts in the center. Zombies enter from random points along the four edges.

### Controls (desktop)

| Action | Input |
| --- | --- |
| Move | WASD or arrow keys |
| Aim | Mouse position |
| Shoot | Left click (hold to keep firing) |
| Apologize (Full Conscience only) | Space |
| Pause | Esc or P |

Touch controls are in section 5.

### Combat

- One weapon: a pea-shooter. It fires one pea toward the aim point, at most 4 shots per second.
- Peas travel in a straight line and are destroyed on hitting a zombie or leaving the arena.
- A standard zombie takes 3 hits; a fast zombie takes 2.
- Every hit shows a short apology bubble above the hero. A kill shows a longer one. Only one bubble shows at a time; a newer line replaces an older one.
- A zombie that touches the hero costs 1 heart. The hero then has 1 second of invulnerability (flashing) and the zombie is knocked back.
- The hero has 3 hearts per run. Hearts do not regenerate.

### Zombies

| Type | Hits to kill | Speed (relative) | First appears |
| --- | --- | --- | --- |
| Shambler | 3 | 1.0 | Wave 1 |
| Jogger | 2 | 1.6 | Wave 5 |

Zombies walk straight toward the hero's current position.

### Waves

- 10 waves. The wave table in `features/waves/waves.ts` sets, per wave: zombie count, spawn interval, speed multiplier and the share of joggers.
- Starting values: wave *n* spawns `3n + 3` zombies (6 in wave 1, 33 in wave 10), and speed is multiplied by `1 + 0.05(n − 1)`. Joggers make up 0% of a wave before wave 5, then 20% rising to 40% by wave 10. These are tuning numbers and will change in balance passes; the table is the source of truth.
- A wave ends when every zombie it spawned is dead.
- Between waves there is a 3-second breather with a banner, for example "Wave 4: They seem upset."

### Run end

- **Win:** wave 10 cleared. **Lose:** hearts reach 0.
- Both go to the summary screen: waves cleared, zombies hurt, zombies killed, apologies made, a closing line chosen by outcome, and a "Play again" button that returns to the start screen.
- In Full Conscience the summary also shows the conscience grade (section 3).

### Apology lines

- Stored in `features/apologies/lines.ts` as plain data, so friends and family can add jokes without touching game code.
- Each line has a **kind** (`hit`, `kill`, `apology`, `breakdown`, `summaryWin`, `summaryLose`) and a **tier**:
  - Tier 1, waves 1–3: polite ("Oh gosh, sorry!")
  - Tier 2, waves 4–7: flustered
  - Tier 3, waves 8–10: long and philosophical
- Summary lines have no tier.
- The picker draws at random without repeating within a kind and tier until all lines in that group have been used, then reshuffles.
- The prototype ships with at least 10 `hit` and 8 `kill` lines per tier, plus 8 `apology`, 4 `breakdown` and 4 of each summary kind.

## 3. Modes

The mode is a config object passed to `GameScene` when a run starts. Every system reads from it. There is one codebase and no fork.

```ts
type ModeConfig = {
  id: 'casual' | 'conscience';
  label: string;
  guilt: boolean;
  waveScale: number; // multiplies zombie count and speed
};
```

### Casual Remorse (flavor)

`{ id: 'casual', label: 'Casual Remorse', guilt: false, waveScale: 1.0 }`

The core loop as in section 2, nothing added. Apologies are comedy only. Score is waves cleared.

### Full Conscience (mechanic)

`{ id: 'conscience', label: 'Full Conscience', guilt: true, waveScale: 0.8 }`

Adds three rules on top of the core loop.

**Guilt meter (0–100), shown as a bar at the top of the screen.**

- A hit adds 4 guilt; a kill adds 10.
- The guilt from each zombie is tracked as that zombie's **unapologized guilt**.

**Apologize (Space or the "Sorry!" button).**

- The hero freezes for 0.5 seconds (no moving or shooting) and says an `apology` line.
- It clears the unapologized guilt from the most recently hurt zombie that still carries any, including one that just died, and subtracts that amount from the meter.
- If no zombie carries unapologized guilt, the hero still freezes and says the line, but nothing changes. (Apologizing for nothing is a joke, and a cost.)
- Cooldown: 1 second.

**Effects of guilt.**

| Guilt | Effect |
| --- | --- |
| 33–65 | Aim wobble: each shot is rotated by a random angle up to ±4° |
| 66–99 | Aim wobble up to ±10°; the screen desaturates by 40% (or the music shifts to the sad track once audio exists) |
| 100 | Breakdown: the hero freezes for 2 seconds, says a `breakdown` line, loses 1 heart, and the meter resets to 50 |

**Score and grade.**

- Score = waves cleared × 100 + conscience bonus.
- Conscience bonus = round((100 − average guilt) × 5), where average guilt is sampled once per second during waves.
- Grade by average guilt: 0–14 **Saint**, 15–34 **Decent Person**, 35–59 **Conflicted**, 60–84 **Callous**, 85–100 **Monster**.

## 4. Architecture

### Principle

Game rules live in plain TypeScript with no Phaser imports and are unit-tested. Phaser draws the game and handles physics and input.

### Layout (feature-sliced, adapted from FSD)

```
src/
  app/              main.ts, Phaser config, scene registration       (FSD: app)
  scenes/           BootScene, MenuScene, GameScene, HudScene,
                    SummaryScene — compose features, hold no rules  (FSD: pages)
  features/
    guilt/          GuiltMeter.ts, GuiltBar.ts, GuiltMeter.test.ts
    apologies/      ApologyPicker.ts, SpeechBubble.ts, lines.ts,
                    ApologyPicker.test.ts
    waves/          WaveDirector.ts, waves.ts, WaveBanner.ts,
                    WaveDirector.test.ts
    scoring/        Scoring.ts, bestScores.ts, Scoring.test.ts,
                    bestScores.test.ts
  entities/
    hero/           Hero.ts, hero.stats.ts
    zombie/         Zombie.ts, zombie.stats.ts
    pea/            Pea.ts
  shared/
    events.ts       typed event names and payloads
    modes.ts        ModeConfig and the two modes
    input/          InputSource interface, KeyboardMouseInput, TouchInput
    ui/             Button.ts and other small UI pieces
    storage.ts      safe localStorage wrapper
public/assets/      Kenney CC0 pack and its License.txt
```

**Import rules (as in FSD):** `app` → `scenes` → `features` → `entities` → `shared`. A layer imports only from layers below it. Features do not import each other; scenes connect them through events. Within a feature, the pure logic file never imports the Phaser view file.

### Data flow

1. `MenuScene` starts `GameScene` and `HudScene` with the chosen `ModeConfig`.
2. `GameScene` asks `WaveDirector` what to spawn and when, spawns zombies from a pooled Phaser Group, and handles input, movement and collisions.
3. On collisions, `GameScene` emits typed events on a shared emitter: `zombieHit`, `zombieKilled`, `heroHurt`, `apologized`, `waveStarted`, `waveCleared`, `runEnded`.
4. Feature logic reacts: `ApologyPicker` returns a line for `SpeechBubble`; `GuiltMeter` updates when the mode has guilt on; `Scoring` tallies.
5. `HudScene` listens to the same events to redraw hearts, the wave banner and the guilt bar.
6. On `runEnded`, `GameScene` starts `SummaryScene` with the final tallies; `bestScores` saves the result per mode.

### Error handling

- `bestScores` reads and writes through `shared/storage.ts`, which wraps every call in try/catch. Blocked or full storage means best scores are simply not shown; the game never throws.
- If the art pack fails to load, `BootScene` shows a plain message ("Couldn't load the game. Try refreshing.") instead of a blank screen.
- The game pauses when the browser tab is hidden and resumes on the pause screen.

## 5. Touch controls

The input layer sits behind one interface, so `GameScene` does not know which device it runs on:

```ts
interface InputSource {
  move(): { x: number; y: number };   // -1..1 per axis
  aim(heroPos): { x: number; y: number } | null;
  firing(): boolean;
  apologizePressed(): boolean;        // true once per press
}
```

- **Left half of the screen:** a floating virtual joystick appears where the thumb lands.
- **Right half:** touch and drag to aim; auto-fire while held.
- **"Sorry!" button:** above the right-thumb area, shown only in Full Conscience.
- **Orientation:** landscape only. Portrait shows a "please rotate your phone" overlay and pauses the game.
- Touch input is chosen automatically when the device reports touch support; the menu toggle overrides it.

## 6. Build order

Each stage ends playable and deployed to the live link.

1. **Skeleton:** Vite + Phaser 4 + TypeScript, the sliced folders, Vitest, Playwright, the GitHub Pages deploy action. A blank arena is live.
2. **Walk and shoot:** hero, aiming, peas, shamblers, collisions, hearts, knockback.
3. **Waves:** WaveDirector, the wave table, banners, win and lose, the summary screen.
4. **The joke:** ApologyPicker, speech bubbles, all three tiers of lines. Casual Remorse is complete. **Milestone: two or three people play it.**
5. **Full Conscience:** guilt meter, apologize key, thresholds, breakdown, scoring and grades, best scores, mode buttons on the menu.
6. **Touch controls:** InputSource split, joystick, drag-to-aim, Sorry button, rotate overlay.
7. **Polish:** full art pass, joggers from wave 5, optional sound, balance passes for both modes. **Milestone: second play test.**

If stage 4 doesn't get laughs, the writing is fixed before stages 5–7.

## 7. Testing

### Unit tests (Vitest, written test-first)

- **GuiltMeter:** hit +4, kill +10; apology clears the most recent zombie's unapologized guilt; thresholds at 33, 66, 100; breakdown resets to 50; with guilt off, nothing changes.
- **ApologyPicker:** tier by wave (1–3, 4–7, 8–10); no repeats within a kind and tier until exhausted; reshuffle afterward.
- **WaveDirector:** count, interval and speed per wave; `waveScale` applied; joggers only from wave 5; wave ends when all spawned zombies are dead.
- **Scoring:** score formula, conscience bonus, grade boundaries.
- **bestScores:** saves and reads per mode; returns empty rather than throwing when storage is unavailable.

### Not unit-tested

Phaser scenes, sprites, physics and input. Each build stage instead has a short play checklist in the implementation plan.

### Automated smoke test (Playwright)

Loads the production build, clicks each mode button, checks that the game scene starts with no console errors. Runs in the GitHub Action before deploy, so a broken build never replaces the live link.

### Human tests

After stages 4 and 7, two or three people play without instructions. Pass: they laugh in wave 1 and choose to play again.

## 8. Deploy

- A GitHub Action on every push to `main`: install, type-check, unit tests, build, Playwright smoke test, publish `dist/` to GitHub Pages.
- Vite `base` is set to `/sorry-zombies/` for the Pages path.

## 9. Later, if Full Conscience proves fun

- Zombies react to apologies: some accept and wander off, some get angrier.
- Named zombies with name tags (the neighbor, the dentist).
- Non-lethal options (push back, trap, herd into a pen) that score higher than kills.
- Sound and a sad-piano track.
- Lines written by friends and family, credited on the summary screen.
