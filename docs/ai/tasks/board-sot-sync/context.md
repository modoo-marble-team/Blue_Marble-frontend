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

## 2026-03-30 Context Note

- Workflow-gate for high-risk PR requires explicit task-document evidence.
- This context file is updated to keep plan/context/checklist in sync with TODO `board-sot-sync`.
- Immediate scope remains runtime parity in mock mode without changing backend contracts.

## 2026-04-01 Context Update

- High-risk runtime files in this PR:
  - src/pages/GamePage.tsx
  - src/components/board/GameBoard.tsx
  - src/mocks/handlers/game.handler.ts
- Validation focus in this cycle:
  - remove zero-balance bankrupt false positives
  - preserve server-authoritative totalAssets rendering path

## 2026-04-03 Context Update

- Backend SoT diff check against `default.v1.json` confirmed a single board-name drift:
  - tile 24 expected `무인도로 이동`, frontend fallback/mock still had `섬으로 이동`.
- Tile metadata normalization gap:
  - adapter did not preserve `transportType` for `TRAVEL`, causing mock/real payload semantics to be weaker than server payload.

## 2026-04-03 Runtime Parity Recheck

- `src/mocks/handlers/game.handler.ts` parity updates:
  - event/chance card pool separation (`EVENT` uses event pool)
  - strict spend rules (`balance > cost`) for buy/build/acquire
  - toll settlement parity (`balance <= toll` -> bankrupt) with ownership cleanup
  - travel prompt response move trigger aligned to `travel`
  - chance forward move now applies pass-go salary semantics
  - island lock duration aligned to 3 turns
  - global effect / extra-turn effect state now affects turn progression
- TODO sync:
  - `chance-move-direction-animation`, `game-board-result-and-travel-fix`,
    `island-speed-and-exit-modal-style` moved to `Done`
  - `board-sot-sync` remains `In Progress` until workflow-gate follow-up item closes
