# Plan

## Task

- 작업 이름: Game Board Modal Reveal Policy Split
- 작업 slug: `game-board-modal-reveal-policy-split`
- 요청 날짜: 2026-03-26
- 담당 범위: `GameBoard` modal timing을 pre-move / post-move reveal policy로 분리하고 관련 회귀 테스트를 추가

## Goal

- 여행/무인도 이동/카드 설명처럼 다음 이동을 유발하는 modal은 queued future move에 막히지 않고 먼저 보인다.
- buy/build/toll/acquisition/sell/island 같은 도착 결과 modal은 이동 완료 후 다음 프레임 뒤에만 보인다.
- 카드 modal이 열린 상태에서는 후속 chance move 결과 modal이 먼저 끼어들지 않는다.

## WAT Workflow

1. task 문서와 TODO를 만들어 범위 / 완료 기준 / 검증 명령을 고정한다.
2. `gameBoardEventQueueUtils`에 pre/post surface reveal 유틸을 추가하고 `GameBoard` visibility gate를 분리한다.
3. travel / go-to-island / chance chain move 회귀 테스트를 추가해 ordering을 검증한다.

## In Scope

- `src/components/board/GameBoard.tsx`
- `src/components/board/GameBoard.test.tsx`
- `src/components/board/gameBoardEventQueueUtils.ts`
- `src/components/board/gameBoardEventQueueUtils.test.ts`
- task 문서와 TODO 상태 정리

## Out Of Scope

- backend game contract 변경
- travel/chance rule 자체 변경
- mock travel 목적지 선택 경로의 이동 계산 방식 리팩터링

## Target Files

- `src/components/board/GameBoard.tsx`
- `src/components/board/GameBoard.test.tsx`
- `src/components/board/gameBoardEventQueueUtils.ts`
- `src/components/board/gameBoardEventQueueUtils.test.ts`
- `docs/ai/tasks/game-board-modal-reveal-policy-split/*`
- `TODO.md`

## Completion Criteria

- `CHANCE_RESOLVED` 카드 modal은 queued `PLAYER_MOVED`가 있어도 먼저 보이고, 닫기 전까지 후속 move 소비가 멈춘다.
- travel modal은 travel arrival move가 끝난 뒤 다음 프레임에만 보인다.
- go-to-island confirm 뒤 chain move가 끝나기 전에는 island modal이 보이지 않고, chain move 완료 후 다음 프레임에 보인다.
- buy/build/toll/acquisition/sell/island는 post-move reveal gate를 유지한다.

## Test Plan

- `npx vitest run src/components/board/GameBoard.test.tsx src/components/board/gameBoardEventQueueUtils.test.ts`
- `npm run lint`
- `npm run ai:check:game`
- `npm run build`
- `npm run ai:self-review -- --files TODO.md docs/ai/tasks/game-board-modal-reveal-policy-split/plan.md docs/ai/tasks/game-board-modal-reveal-policy-split/context.md docs/ai/tasks/game-board-modal-reveal-policy-split/checklist.md src/components/board/GameBoard.tsx src/components/board/GameBoard.test.tsx src/components/board/gameBoardEventQueueUtils.ts src/components/board/gameBoardEventQueueUtils.test.ts`
