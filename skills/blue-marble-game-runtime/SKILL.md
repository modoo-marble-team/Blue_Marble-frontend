---
name: blue-marble-game-runtime
description: Game runtime, game socket contract handling, prompt normalization, game store flow, and board-runtime separation for Blue_Marble-frontend. Use when changing src/pages/GamePage.tsx, src/components/game, src/components/board, src/hooks/game, src/services/socket/game.handler.ts, src/stores/game.store.ts, or src/mocks/handlers/game.handler.ts.
---

# Blue Marble Game Runtime

Use this skill for game runtime changes where transport contracts, store state, and rendering boundaries must stay aligned.

## Start Sequence

1. Read `docs/ai/manuals/game-runtime.md`.
2. Read `docs/game-delivery-roadmap.md`.
3. Read [references/targets.md](references/targets.md) for key files, docs, and tests.
4. If the change touches payload or transport shape, inspect both real and mock runtime paths.
5. Run `npm run ai:check:game` after implementation.
6. Run `npm run ai:check:build` when contracts, store shape, or rendered UI paths change.

## Preserve These Invariants

- Keep `gameId` as the canonical game runtime identifier.
- Keep prompt and phase normalization in the adapter layer, not in UI components.
- Keep mock runtime and real runtime payload handling as close as possible.
- Keep server-authoritative state out of board presentation components.

## Escalate On These Changes

- If `game:prompt`, `game:ack`, `game:patch`, or `game:error` shapes change, update tests immediately.
- If `gameId` fallback logic changes, review all emit and sync entry points.
- If prompt handling changes, review `promptModalMapping` and store prompt consumption.

## Review Risks

- UI components directly interpreting raw transport exceptions
- store shape drifting away from normalized runtime contract
- mock runtime behavior diverging from real runtime behavior
- `roomId` and `gameId` responsibilities becoming mixed again

Use `blue-marble-diff-review` when the task shifts from implementation to risk review.
