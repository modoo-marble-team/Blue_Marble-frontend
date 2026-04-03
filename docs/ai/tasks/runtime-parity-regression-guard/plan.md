# Plan

## Task

- Task name: Runtime Parity Regression Guard
- Task slug: runtime-parity-regression-guard
- Created at: 2026-04-03

## Goal

- Prevent mock/real runtime meaning drift from reappearing after backend reconnect.
- Keep parity checks focused on domain semantics, not visual styling.

## WAT Workflow

1. Fix scope and acceptance criteria in task docs before implementation.
2. Add minimum regression checks for adapter, board source-of-truth drift, and e2e modal interception stability.
3. Run required validations and record evidence in checklist/context/handoff.

## In Scope

- Ruleset board-name/tile-order drift detection rule.
- `tile_type`/`transportType` parity regression tests.
- `@game` smoke scenario stability against modal overlay click interception.

## Out Of Scope

- Backend contract/schema changes.
- Gameplay feature additions or UI redesign.
- Refactoring unrelated runtime modules.

## Target Files

- `src/services/socket/gameContractAdapters.ts`
- `src/components/board/gameBoardEventQueueUtils.ts`
- `e2e/game-runtime-roll-smoke.spec.ts`
- related tests/docs under `docs/ai/tasks/runtime-parity-regression-guard/`

## Task Tracking

- TODO line: `- [ ] `runtime-parity-regression-guard` - Runtime Parity Regression Guard (`docs/ai/tasks/runtime-parity-regression-guard/`)`
- Session brief: `npm run ai:session:brief -- runtime-parity-regression-guard`
- Reopen docs: `AGENTS.md`, `docs/ai/manuals/common.md`, `docs/rules.md`, `docs/testing.md`, `docs/ai/manuals/game-runtime.md`, `docs/socket-mock-server.md`

## Completion Criteria

- Drift-detection check is documented and reproducible.
- Adapter parity regression tests fail before/fail on drift and pass on current baseline.
- `@game` smoke is stable with no modal-overlay interception timeout in repeated runs.
- Task docs + TODO status + validation evidence are synchronized.

## Test Plan

- `npx vitest run src/components/board/gameBoardEventQueueUtils.test.ts src/services/socket/gameContractAdapters.test.ts`
- `npm run lint`
- `npm run ai:check:game`
- `npm run ai:check:build`
- `npm run e2e:game`
- `npx playwright test e2e/game-runtime-roll-smoke.spec.ts --grep "@game" --project=chromium --repeat-each=5`
