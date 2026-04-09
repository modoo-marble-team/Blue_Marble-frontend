# Checklist

## Implementation

- [x] Re-read required manuals before edits.
- [x] Add in-game rulebook entry point on `GamePage`.
- [x] Add `GameRulebookModal` with close interactions (backdrop/Esc/button).
- [x] Build city/toll/tier data from board constants and toll function.
- [x] Prevent control collision by auto-closing rulebook on gameplay-critical modals.
- [x] Keep socket/store/public contracts unchanged.

## Testing

- [x] `npx vitest run src/pages/game/gameRulebookModel.test.ts src/components/game/controls/RollButton.test.tsx src/pages/GamePage.test.tsx`
- [x] `npm run lint`
- [x] `npm run ai:check:game`
- [x] `npm run ai:check:build`
- [x] `npm run e2e:game`

## Review

- [x] Confirm R/P/C/U impact against `docs/rules.md`.
- [x] Confirm task docs and TODO linkage are synchronized.
- [x] Verify accessibility hooks (`aria-label`) used for stable tests.
- [x] Record concrete validation evidence in task docs and PR body.
- [x] Include changed files / executed validations / residual risks in final report.

## Evidence (2026-04-09)

- Rulebook model derivation uses `TILES`, `getTollCost`, `LEVEL_LABELS` only.
- Rulebook open-state timer progression validated in both unit/integration and e2e.
