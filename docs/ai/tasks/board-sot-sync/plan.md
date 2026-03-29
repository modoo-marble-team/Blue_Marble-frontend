# Plan

## Task

- 작업 이름: Board SoT sync + initial full sync
- 작업 slug: board-sot-sync
- 요청 날짜: 2026-03-23
- 담당 범위: game runtime sync, board tile mapping, mock data alignment

## Goal

- Board tile metadata (name/type/price/color) should come from backend snapshot/patch.
- First entry should request full sync with knownRevision = -1 when local tiles are empty.

## WAT Workflow

1. Read manuals + scan board/sync pipeline and mock paths.
2. Update sync gating + board tile mapping to use backend tile metadata with safe fallback.
3. Align mock tiles and update tests for new inputs.

## In Scope

- useGameState initial sync logic to force full snapshot when tiles are missing.
- GameBoard rendering/events using merged board tiles derived from store tiles.
- Mock tile data aligned with new board list.

## Out Of Scope

- Backend contract changes.
- Pricing/tier balance redesign.
- Board layout CSS refactor.

## Target Files

- src/hooks/game/useGameState.ts
- src/components/board/GameBoard.tsx
- src/components/board/useBoardEventQueue.ts
- src/mocks/gameMockData.ts
- src/components/board/board.constants.ts

## Task Tracking

- TODO line: TODO.md In Progress `board-sot-sync`
- Session brief: npm run ai:session:brief -- board-sot-sync (pending)
- Reopen docs: docs/ai/tasks/board-sot-sync/{plan,context,checklist}.md

## Completion Criteria

- Board renders tile names/types/prices from server tiles when available.
- Initial entry requests full sync with knownRevision = -1 if tiles are missing.
- Mock path still renders correctly with updated board list.

## Role Plan

- Planner: Codex
- Implementer: Codex
- Reviewer: TBD
- Tester: TBD

## Test Plan

- npx vitest run src/hooks/game/useGameState.test.tsx
- npx vitest run src/components/board/useBoardEventQueue.test.tsx
- Optional: npm run build

## 2026-03-30 Update

- This task document triplet is actively maintained for workflow-gate evidence.
- Current cycle focus: mock parity with server-authoritative game runtime.
- Follow-up PR sequence: board SoT sync -> chance direction animation -> island/modal polish.
