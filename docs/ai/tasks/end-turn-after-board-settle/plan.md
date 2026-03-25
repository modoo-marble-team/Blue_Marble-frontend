# Plan

## Task

- 작업 이름: End Turn After Board Settle
- 작업 slug: `end-turn-after-board-settle`
- 요청 날짜: 2026-03-26
- 담당 범위: `GameBoard`가 올리는 blocking 상태를 `GamePage`의 턴 제어와 다시 연결해 말 도착 후 보드 정리가 끝난 뒤에만 턴 종료를 허용

## Goal

- 말 이동 중이거나 보드 로컬 액션이 남아 있으면 `턴 종료`가 보이거나 눌리지 않는다.
- `GameBoard`가 `blocked=false`를 올린 뒤에만 `RollButton`이 `end_turn` 모드로 바뀐다.
- `START`나 일반 `PROPERTY`처럼 모달이 없는 도착 칸도 이동 완료 전에는 턴 종료가 노출되지 않는다.

## WAT Workflow

1. task 문서와 TODO를 정리해 범위 / 완료 기준 / 검증 명령을 고정한다.
2. `GamePage`에 board blocking 상태를 연결하고 턴 제어/버튼 모드/자산 액션 허용 조건을 모두 같은 기준으로 묶는다.
3. `GamePage.test.tsx`의 `GameBoard`/`RollButton` mock을 실사용 형태로 올리고 blocked/unblocked 회귀 테스트를 추가한다.

## In Scope

- `src/pages/GamePage.tsx`
- `src/pages/GamePage.test.tsx`
- `docs/ai/tasks/end-turn-after-board-settle/*`
- `TODO.md`

## Out Of Scope

- `GameBoard`의 barrier/reveal timing 로직 변경
- 게임 소켓 contract / store shape 변경
- 자동 턴 종료 UX

## Target Files

- `src/pages/GamePage.tsx`
- `src/pages/GamePage.test.tsx`
- `docs/ai/tasks/end-turn-after-board-settle/*`
- `TODO.md`

## Task Tracking

- TODO line: - [x] `end-turn-after-board-settle` - End Turn After Board Settle (`docs/ai/tasks/end-turn-after-board-settle/`)
- Session brief: `npm run ai:session:brief -- end-turn-after-board-settle`
- Reopen docs: `docs/ai/tasks/end-turn-after-board-settle/plan.md`, `context.md`, `checklist.md`, 관련 manuals

## Completion Criteria

- `GamePage`가 `BoardGame`의 `onBlockingModalChange`를 사용한다.
- blocked 상태에서는 `RollButton`이 `turn end` 모드로 바뀌지 않고 `END_TURN` emit이 발생하지 않는다.
- unblocked 상태가 된 뒤에만 `턴 종료`가 보이고 클릭 시 `END_TURN` emit이 된다.
- 관련 Vitest / lint / game check / build가 통과한다.

## Role Plan

- Planner: blocked 신호를 부모 턴 제어 정책에 어떻게 연결할지 정리
- Implementer: `GamePage` 조건과 버튼 모드 계산 복구
- Reviewer: 말 도착 전 턴 종료 선노출과 asset-action 경계 회귀 점검
- Tester: blocked/unblocked end-turn 회귀 테스트와 game 검증 실행

## Test Plan

- `npx vitest run src/pages/GamePage.test.tsx`
- `npm run lint`
- `npm run ai:check:game`
- `npm run build`
- `npm run ai:self-review -- --files TODO.md docs/ai/tasks/end-turn-after-board-settle/plan.md docs/ai/tasks/end-turn-after-board-settle/context.md docs/ai/tasks/end-turn-after-board-settle/checklist.md src/pages/GamePage.tsx src/pages/GamePage.test.tsx`
