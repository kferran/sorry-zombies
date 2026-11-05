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

## Docs

- Design: `docs/specs/2026-11-04-sorry-zombies-design.md`
- Plan: `docs/plans/2026-11-04-sorry-zombies.md`
