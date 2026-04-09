# Context

## Current Behavior

- Game runtime UI had no in-game player rulebook entry point.
- City price/toll/tier information existed only implicitly in board constants and runtime computation.
- QA/support required repeated manual explanation for city economy rules during play.

## Related Files

- `src/pages/GamePage.tsx`
- `src/components/game/modals/GameRulebookModal.tsx`
- `src/pages/game/gameRulebookModel.ts`
- `src/pages/game/gameRulebookModel.test.ts`
- `src/pages/GamePage.test.tsx`
- `src/components/game/controls/RollButton.tsx`
- `e2e/game-runtime-roll-smoke.spec.ts`

## Relevant Manuals

- `AGENTS.md`
- `docs/ai/manuals/common.md`
- `docs/rules.md`
- `docs/testing.md`
- `docs/ai/manuals/game-runtime.md`

## Constraints

- Keep socket/store/public contracts unchanged.
- Preserve gameplay semantics; rulebook is read-only UI.
- Keep mock/real runtime behavior parity unchanged.
- Use board constants/functions as source-of-truth for city economy table.

## Decision Notes

- Added a dedicated rulebook data builder module to avoid hardcoded modal table numbers.
- Reused `LEVEL_LABELS` from board constants to keep toll labels canonical.
- Added `aria-label` on timer for deterministic test/e2e selection instead of brittle selectors.
- Rulebook auto-close uses existing gameplay modal visibility signals in `GamePage` only.

## Session Handoff Notes

- Current implementation is complete and validated; next step is PR review and merge.
- If board constants/ruleset change, rerun rulebook model tests to detect drift immediately.

## 2026-04-09 Implementation Update

- Added `GameRulebookModal` with close-by-backdrop/Esc/button behaviors.
- Added `?` icon trigger in top-right of `GamePage` (`aria-label: ���� ��� ����`).
- Added `buildGameRulebookData()` and money formatter derived from board constants.
- Added rulebook auto-close effect when board-blocking modal/prompt/exit modal opens.
- Added unit tests for model derivation + formatting + tier ordering.
- Added GamePage tests for open/close, auto-close triggers, and timer progression while open.
- Extended `@game` smoke e2e with rulebook open/close and timer decrease verification.

## 2026-04-09 Validation Evidence

- `npx vitest run src/pages/game/gameRulebookModel.test.ts src/components/game/controls/RollButton.test.tsx src/pages/GamePage.test.tsx` (pass)
- `npm run lint` (pass)
- `npm run ai:check:game` (pass)
- `npm run ai:check:build` (pass)
- `npm run e2e:game` (pass)

## Open Risks

- Rulebook content text is static copy; future ruleset text-level changes need manual wording sync.
- `@game` e2e still depends on runtime timing; CI resource contention can increase variability.
