# Plan

## Task

- Task name: In-game Player Rulebook Modal
- Task slug: in-game-rulebook-modal
- Created at: 2026-04-09

## Goal

- Add a player-facing in-game rulebook opened by a corner `?` icon without changing runtime game meaning.
- Show city price / toll / tier ordering with data derived from board source-of-truth code, not hardcoded UI numbers.

## WAT Workflow

1. Lock scope and source-of-truth references in task docs before edits.
2. Implement rulebook model + modal + GamePage entry point with minimal boundary-safe changes.
3. Add unit/integration/e2e coverage and record concrete validation evidence.

## In Scope

- `GamePage` corner help icon and rulebook modal open/close wiring.
- Rulebook modal content sections for player gameplay guidance.
- Auto-generated city/toll/tier table from `TILES`, `getTollCost`, `LEVEL_LABELS`.
- Auto-close rulebook on board-blocking/prompt/exit modal to avoid control collision.
- Timer visibility/assertability while rulebook is open.

## Out Of Scope

- Socket/store contract changes.
- Backend API/schema/ruleset changes.
- Runtime sequence changes for dice/event/prompt logic.

## Target Files

- `src/pages/GamePage.tsx`
- `src/components/game/modals/GameRulebookModal.tsx`
- `src/pages/game/gameRulebookModel.ts`
- `src/pages/game/gameRulebookModel.test.ts`
- `src/pages/GamePage.test.tsx`
- `src/components/game/controls/RollButton.tsx`
- `e2e/game-runtime-roll-smoke.spec.ts`

## Task Tracking

- TODO line: `- [ ] `in-game-rulebook-modal` - In-game Rulebook Modal (`docs/ai/tasks/in-game-rulebook-modal/`)`
- Session brief: `npm run ai:session:brief -- in-game-rulebook-modal`
- Reopen docs: `AGENTS.md`, `docs/ai/manuals/common.md`, `docs/rules.md`, `docs/testing.md`, `docs/ai/manuals/game-runtime.md`

## Completion Criteria

- Rulebook can open/close from game screen and does not block timer progression.
- Rulebook city table is fully derived from board constants and toll function outputs.
- Rulebook closes automatically when gameplay-critical modal surfaces appear.
- Required validations pass and evidence is captured in task docs + PR body.

## Test Plan

- `npx vitest run src/pages/game/gameRulebookModel.test.ts src/components/game/controls/RollButton.test.tsx src/pages/GamePage.test.tsx`
- `npm run lint`
- `npm run ai:check:game`
- `npm run ai:check:build`
- `npm run e2e:game`
