# Checklist

## Implementation

- [x] Re-read required manuals before edits.
- [x] Define drift-detection rule and record source-of-truth references.
- [x] Add/adjust adapter parity regression tests for `tile_type` and `transportType`.
- [x] Harden smoke scenario helper for modal overlay interception edge cases.
- [x] Keep contract types/mock behavior/test assertions aligned.

## Testing

- [x] `npx vitest run src/components/board/board.constants.parity.test.ts src/components/board/gameBoardEventQueueUtils.test.ts src/services/socket/gameContractAdapters.test.ts`
- [x] `npm run lint`
- [x] `npm run ai:check:game`
- [x] `npm run ai:check:build`
- [x] `npm run e2e:game`
- [x] `npx playwright test e2e/game-runtime-roll-smoke.spec.ts --grep "@game" --project=chromium --repeat-each=5`

## Review

- [x] Validate R/P/C/U impact with `docs/rules.md`.
- [x] Confirm TODO/task-doc status synchronization.
- [x] Update context + handoff notes with concrete evidence.
- [x] Verify `npm run ai:session:brief -- runtime-parity-regression-guard` reflects latest state.
- [x] Report changed files, validations run, and residual risks.

## Evidence (2026-04-03)

- Backend SoT reference checked: `modoo-marble-backend/develop/app/game/rulesets/default.v1.json` (`board` tile id/name/tile_type baseline).
- Workflow audit: `npm run ai:workflow:audit` (Warnings: none).
