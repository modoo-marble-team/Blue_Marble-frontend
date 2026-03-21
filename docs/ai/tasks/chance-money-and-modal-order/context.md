# Context

## Current Behavior

- `game:prompt` is applied to store immediately on socket receipt.
- Event queue (`DICE_ROLLED`, `PLAYER_MOVED`, `LANDED`, ...) is consumed with per-event delay.
- In some cases prompt modal opens before movement finishes, then queue pauses, causing inverted UX order.
- Chance money text and effective balance updates can diverge due frontend unit normalization mismatch.

## Related Files

- `src/services/socket/game.handler.ts`
- `src/services/socket/gameContractAdapters.ts`
- `src/components/board/GameBoard.tsx`
- `src/components/board/useBoardEventQueue.ts`
- `src/components/board/gameBoardEventQueueUtils.ts`

## Constraints

- Server authoritative game runtime: frontend must not finalize state independently.
- Prompt/action flow must stay compatible with real socket payloads.
- Mock/real coexistence should not regress.

## Decision Notes

- Use server payload as source of truth for amounts; frontend does only contract-aligned unit conversion.
- Delay prompt modal visibility while relevant move is pending/animating, instead of forcing queue pause early.
- Keep minimal change footprint around current architecture.

## Open Risks

- If backend sends mixed money units across fields, frontend heuristic can still fail in rare edge cases.
- If prompt arrives without playerId and queue has unrelated moves, modal delay may be slightly conservative.
