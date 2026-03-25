# Plan

## Task

- 작업 이름: Forced Island Fast Move Fix
- 작업 slug: `forced-island-fast-move-fix`
- 요청 날짜: 2026-03-25
- 담당 범위: 무인도 강제 이동 fast animation을 `MOVE_TO_ISLAND`/카드 강제 이동에만 제한

## Goal

- `섬으로 이동` 칸에서 무인도로 강제 이동할 때만 빠른 이동 애니메이션을 적용한다.
- 카드/이벤트로 무인도로 강제 이동하는 mock 연출도 같은 fast timing으로 맞춘다.
- 일반 주사위로 무인도에 도착하거나 무인도에서 출발하는 이동은 기존 일반 속도를 유지한다.

## WAT Workflow

1. task 문서와 TODO를 만들어 범위 / 완료 기준 / 검증 명령을 고정한다.
2. 보드 이동 helper에서 fast 판정 기준을 `travel` 또는 `MOVE_TO_ISLAND -> ISLAND` 강제 이동으로 좁힌다.
3. `GameBoard`의 카드 기반 무인도 강제 이동 연출도 같은 fast 옵션을 사용하도록 정리하고 관련 테스트로 마감한다.

## In Scope

- `src/components/board/gameBoardEventQueueUtils.ts`
- `src/components/board/gameBoardEventQueueUtils.test.ts`
- `src/components/board/GameBoard.tsx`
- task 문서와 TODO 상태 정리

## Out Of Scope

- 게임 종료 모달 스타일
- 일반 travel 이동 UX
- 무인도 탈출 규칙 / skipTurns / 서버 authoritative state
- socket contract / store shape 변경

## Target Files

- `src/components/board/gameBoardEventQueueUtils.ts`
- `src/components/board/gameBoardEventQueueUtils.test.ts`
- `src/components/board/GameBoard.tsx`
- `docs/ai/tasks/forced-island-fast-move-fix/*`
- `TODO.md`

## Task Tracking

- TODO line: - [ ] `forced-island-fast-move-fix` - Forced Island Fast Move Fix (`docs/ai/tasks/forced-island-fast-move-fix/`)
- Session brief: `npm run ai:session:brief -- forced-island-fast-move-fix`
- Reopen docs: `docs/ai/tasks/forced-island-fast-move-fix/plan.md`, `context.md`, `checklist.md`, 관련 manuals

## Completion Criteria

- `trigger === 'travel'` 이동은 기존처럼 fast다.
- `MOVE_TO_ISLAND -> ISLAND` 강제 이동은 fast다.
- `ISLAND` 출발 일반 이동은 fast가 아니다.
- 카드/이벤트 무인도 강제 이동 연출은 `stepDelayMs: 80`, `initialDelayMs: 200`, `endDelayMs: 100`을 사용한다.

## Role Plan

- Planner: 강제 무인도 이동과 일반 무인도 이동의 UX 기준 정리
- Implementer: helper 판정과 카드 무인도 이동 연출 정렬
- Reviewer: 일반 무인도 착지/출발이 fast로 회귀하지 않는지 점검
- Tester: 관련 Vitest와 game/build 검증 실행

## Test Plan

- `npx vitest run src/components/board/gameBoardEventQueueUtils.test.ts`
- `npm run lint`
- `npm run ai:check:game`
- `npm run build`
- `npm run ai:self-review -- --files TODO.md docs/ai/tasks/forced-island-fast-move-fix/plan.md docs/ai/tasks/forced-island-fast-move-fix/context.md docs/ai/tasks/forced-island-fast-move-fix/checklist.md src/components/board/GameBoard.tsx src/components/board/gameBoardEventQueueUtils.ts src/components/board/gameBoardEventQueueUtils.test.ts`
