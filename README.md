# Sorry, Zombies

A top-down zombie wave shooter where the hero apologizes every time he hurts or kills a zombie.

**Play:** https://kferran.github.io/sorry-zombies/

Two modes:

- **Casual Remorse:** the apologies are pure comedy.
- **Full Conscience:** unapologized hits build guilt, and guilt has consequences.

## Run it locally

```bash
npm install
npm run dev        # http://localhost:5173/sorry-zombies/
npm test           # unit tests (Vitest)
npm run build && npm run e2e   # smoke test (Playwright)
```

## Add your own apology lines

All lines live in `src/features/apologies/lines.ts`. Add an entry to the list, pick its kind (`hit`, `kill`, `apology`, `breakdown`, `summaryWin`, `summaryLose`), and give `hit` and `kill` lines a tier: 1 for waves 1–3 (polite), 2 for waves 4–7 (flustered), 3 for waves 8–10 (philosophical).

## Editing levels

The side-scroller's maps are Tiled JSON files in `public/maps/` (`level-1.json`, `level-2.json`, `level-3.json`, `boss.json`). Open them in [Tiled](https://www.mapeditor.org/) and save as JSON; the tilesets are embedded, so no `.tsx` files are needed. Maps are 15 tiles (240 px) tall, 16 px tiles.

- `ground`: tile layer, solid. Everything drawn here collides (earth, platforms, pillars, the low graves you jump).
- `decor`: tile layer, no collision (grass tufts, grave crowns, bushes, trees, statues).
- `spawns`: object layer of **point** objects. Set each object's Type (Class in Tiled 1.9) to one of `hero` (exactly 1), `exit` (exactly 1 in a level, none in the boss room), `checkpoint` (one per level, none in the boss room), `skeleton`, `ghost`, `cat`, `boss` (only in `boss.json`). Put the point on the surface the thing stands on; ghosts float wherever the point is. A cat can have a string property `name` for its name tag.

The game checks every map when it loads it (`src/features/levels/LevelLoader.ts`), and `npm test` checks the shipped maps.

`tools/make-maps.mjs` built the first drafts from the text layouts in `tools/layouts/` (`node tools/make-maps.mjs`). It is only for first drafts: the JSON is now the source of truth, and re-running the generator overwrites any edits made in Tiled.

## Layout

The original top-down arena now lives in `src/arena/` and is reached from the menu's "Bonus: The Arena" link. Nothing outside `src/app/main.ts` and `MenuScene` imports from it.

## Credits

Side-scroller art: [GothicVania Cemetery](https://opengameart.org/) by ansimuz (CC0), in `public/assets/gothicvania-cemetery/` (music not included).

Arena character art: [Top-down Shooter](https://www.kenney.nl/assets/top-down-shooter) by Kenney (CC0). License in `public/assets/kenney-topdown/License.txt`.

## Docs

- Design: `docs/specs/2026-11-04-sorry-zombies-design.md`
- Plan: `docs/plans/2026-11-04-sorry-zombies.md`
