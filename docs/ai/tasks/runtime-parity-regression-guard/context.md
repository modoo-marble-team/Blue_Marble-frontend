# Context

## Current Behavior

- `board-sot-sync` has been completed and workflow-gate follow-up evidence was closed.
- Mock/real parity fixes already landed for island turns, chance timing, movement sequencing, and e2e overlay handling.
- Remaining work is to prevent regressions by adding explicit guards and repeatable verification.

## Related Files

- `src/services/socket/gameContractAdapters.ts`
- `src/components/board/gameBoardEventQueueUtils.ts`
- `e2e/game-runtime-roll-smoke.spec.ts`
- `docs/ai/tasks/runtime-parity-regression-guard/*`

## Relevant Manuals

- `AGENTS.md`
- `docs/ai/manuals/common.md`
- `docs/rules.md`
- `docs/testing.md`
- `docs/ai/manuals/game-runtime.md`
- `docs/socket-mock-server.md`

## Constraints

- Keep mock and real socket paths aligned.
- Keep backend contracts unchanged.
- Preserve server-authoritative runtime semantics.
- Prefer minimal changes and explicit regression evidence.

## Decision Notes

- Prioritize semantic parity checks over UI-level assertions.
- Add deterministic checks where possible to reduce flake.
- Keep the task as a guardrail cycle; avoid broad refactors.

## Session Handoff Notes

- Start with `npm run ai:session:brief -- runtime-parity-regression-guard`.
- Confirm target files and test scope before coding.
- Record evidence links/run IDs in checklist after execution.

## 2026-04-03 Implementation Update

- Added board drift guard test: `src/components/board/board.constants.parity.test.ts`
  - Asserts static `TILES` and `mockTiles` both match backend `default.v1.json` board order/name/type.
- Added adapter regression case: `src/services/socket/gameContractAdapters.test.ts`
  - Asserts `normalizePatchEnvelopePayload` preserves `transportType` when tile objects are set with `tile_type` aliases (`TRAVEL`, `EVENT`).
- Hardened smoke scenario modal click helper: `e2e/game-runtime-roll-smoke.spec.ts`
  - Uses safer action-button click helper with fallback to `force` click after normal click failure to reduce overlay interception flake.

## 2026-04-03 Validation Evidence

- `npx vitest run src/components/board/board.constants.parity.test.ts src/components/board/gameBoardEventQueueUtils.test.ts src/services/socket/gameContractAdapters.test.ts` (pass)
- `npm run lint` (pass)
- `npm run ai:check:game` (pass)
- `npm run ai:check:build` (pass)
- `npm run e2e:game` (pass)
- `npx playwright test e2e/game-runtime-roll-smoke.spec.ts --grep "@game" --project=chromium --repeat-each=5` (pass)
- `npm run ai:workflow:audit` (Warnings: none)

## Open Risks

- Backend ruleset updates can reintroduce tile metadata/name drifts.
- E2E selectors may need maintenance when overlay hierarchy changes.
- Adapter normalization can regress silently without dedicated tests.
