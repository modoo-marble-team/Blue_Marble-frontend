# Checklist

## Implementation

- [ ] Re-read required manuals before edits.
- [ ] Define drift-detection rule and record source-of-truth references.
- [ ] Add/adjust adapter parity regression tests for `tile_type` and `transportType`.
- [ ] Harden smoke scenario helper for modal overlay interception edge cases.
- [ ] Keep contract types/mock behavior/test assertions aligned.

## Testing

- [ ] `npx vitest run src/components/board/gameBoardEventQueueUtils.test.ts src/services/socket/gameContractAdapters.test.ts`
- [ ] `npm run lint`
- [ ] `npm run ai:check:game`
- [ ] `npm run ai:check:build`
- [ ] `npm run e2e:game`
- [ ] `npx playwright test e2e/game-runtime-roll-smoke.spec.ts --grep "@game" --project=chromium --repeat-each=5`

## Review

- [ ] Validate R/P/C/U impact with `docs/rules.md`.
- [ ] Confirm TODO/task-doc status synchronization.
- [ ] Update context + handoff notes with concrete evidence.
- [ ] Verify `npm run ai:session:brief -- runtime-parity-regression-guard` reflects latest state.
- [ ] Report changed files, validations run, and residual risks.
