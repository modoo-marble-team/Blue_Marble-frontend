# Context

## Current Behavior

- Board rendering relied on static `TILES` for names/types/icons/prices.
- useGameState skipped initial sync when local players existed, even if tiles were empty.
- Mock tiles were out of date vs latest backend board list.

## Related Files

- src/hooks/game/useGameState.ts
- src/components/board/GameBoard.tsx
- src/components/board/useBoardEventQueue.ts
- src/components/board/board.constants.ts
- src/mocks/gameMockData.ts
- src/services/socket/gameContractAdapters.ts
- tests: src/hooks/game/useGameState.test.tsx, src/components/board/useBoardEventQueue.test.tsx

## Relevant Manuals

- AGENTS.md
- docs/ai/manuals/common.md
- docs/ai/manuals/game-runtime.md
- docs/rules.md
- docs/testing.md
- docs/socket-mock-server.md

## Constraints

- Keep server-authoritative state (no local board SoT).
- Mock and real socket paths must stay aligned.
- Board layout assumes 32 tiles and existing grid mapping.

## Decision Notes

- Build a merged `boardTiles` catalog from store tiles, falling back to static constants.
- Normalize tile types from both transportType + lowercase types (city/property/etc).
- Force full sync when tiles are missing (knownRevision = -1).

## Session Handoff Notes

- Run vitest targets in plan and update checklist status.
- Verify TODO.md status and session brief output if handing off.

## Open Risks

- Backend tile payload missing name/type could fall back to static constants unexpectedly.
- Tile order changes on backend require coordinated layout update.
