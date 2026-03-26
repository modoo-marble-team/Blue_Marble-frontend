# Context

## Current Behavior

- `GameBoard`는 `canRevealBoardActionModal` 하나로 prompt/local board modal visibility를 공통 제어한다.
- 이 gate는 `pendingMovePlayerIdSet`, `animatedPositions`, `isMoving`, `boardActionModalBarrier`를 함께 보므로, queued future move가 있는 경우 카드/여행 같은 pre-move modal도 같이 지연될 수 있다.
- 반대로 post-move result modal과 pre-move choice modal의 reveal 목적이 달라 예외가 계속 생긴다.

## Related Files

- `src/components/board/GameBoard.tsx`
- `src/components/board/gameBoardEventQueueUtils.ts`
- `docs/ai/tasks/game-board-modal-reveal-timing/*`
- `docs/ai/tasks/chance-money-and-modal-order/*`

## Relevant Manuals

- `docs/ai/manuals/common.md`
- `docs/ai/manuals/game-runtime.md`
- `docs/rules.md`
- `docs/testing.md`

## Constraints

- 서버 권위 event/prompt 계약은 유지한다.
- `GameBoard`는 render/reveal ordering만 조정하고 socket/store shape는 바꾸지 않는다.
- queued future move를 막기 위해 pre-move modal이 보이는 동안 event queue pause 의미가 유지되어야 한다.

## Decision Notes

- pre-move surface는 pending future move를 reveal blocker로 보지 않는다.
- post-move surface는 기존처럼 pending move / animated position / barrier가 모두 해소된 뒤에만 보인다.
- local mock chain move(`go_to_island`, fallback island event)는 barrier를 명시적으로 걸어 post-move island modal timing을 맞춘다.

## Session Handoff Notes

- 다음 세션에서 다시 읽을 문서: `docs/ai/tasks/game-board-modal-reveal-policy-split/*`, `docs/ai/manuals/game-runtime.md`
- 바로 이어서 할 1개 단계: 없음
- pending decision / blocker: 없음
- 검증 재개 지점: 없음, 계획된 검증을 모두 통과함

## Open Risks

- mock travel destination selection은 여전히 local animation보다 immediate store update에 가깝다.
- prompt-driven go-to-island/island surface는 현재 repo에서 실사용 경로가 얕아, 이번 회귀는 local modal 중심으로 확인한다.
