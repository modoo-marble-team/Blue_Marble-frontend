# Plan

## Task

- Task name: chance money mismatch and prompt-before-move modal ordering
- Requested at: 2026-03-22
- Scope: game runtime (`GameBoard`, `useBoardEventQueue`, socket money adapter, related tests)

## Goal

- Fix chance amount mismatch where modal text and actual balance update diverge.
- Fix UI ordering so movement animation is rendered before prompt modals (buy/build/toll/etc.) when both arrive in same turn flow.

## In Scope

- Update money normalization policy in socket adapter to match current server contract unit.
- Gate prompt modal visibility while pending move events or move animation is active.
- Keep queue consumption unblocked until movement-related events are consumed.
- Add or update unit tests for changed behavior.

## Out Of Scope

- Backend game rule changes.
- Game balance tuning (price/tier design itself).
- New gameplay UX beyond current flow ordering bug fix.

## Target Files

- `src/services/socket/gameContractAdapters.ts`
- `src/services/socket/gameContractAdapters.test.ts`
- `src/components/board/GameBoard.tsx`
- `src/components/board/useBoardEventQueue.test.tsx` (if needed)
- `src/components/board/gameBoardEventQueueUtils.test.ts` (if needed)

## Completion Criteria

- Chance/event related money changes shown in UI align with actual player balance updates.
- Buy/build/toll/acquisition/sell prompt modal is not shown before movement animation completes.
- Existing related tests pass, and new regression checks cover the fixed paths.

## Test Plan

- `npx vitest run src/services/socket/gameContractAdapters.test.ts`
- `npx vitest run src/components/board/useBoardEventQueue.test.tsx src/components/board/gameBoardEventQueueUtils.test.ts`
- `npm run lint`
- `npm run build`
- Playwright game flow sanity run (where environment allows)
