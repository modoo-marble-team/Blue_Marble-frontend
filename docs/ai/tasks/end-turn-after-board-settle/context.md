# Context

## Current Behavior

- `GamePage`는 현재 `phase === 'resolving' && !prompt`만 보면 즉시 `end_turn` 모드로 전환한다.
- `GameBoard`는 이미 `onBlockingModalChange`로 `isEventQueuePaused`를 부모에 올릴 수 있지만, `GamePage`는 이 신호를 사용하지 않는다.
- 그래서 말 이동 중이거나 `Chance/Event/Travel/Island` 같은 보드 액션이 남아 있어도 부모 기준에서는 턴 종료가 가능해 보일 수 있다.

## Related Files

- `src/pages/GamePage.tsx`
- `src/pages/GamePage.test.tsx`
- `src/components/board/GameBoard.tsx`
- `docs/ai/tasks/game-board-modal-reveal-timing/*`

## Relevant Manuals

- `docs/ai/manuals/common.md`
- `docs/ai/manuals/game-runtime.md`
- `docs/rules.md`
- `docs/testing.md`

## Constraints

- `GameBoard`의 blocking 의미와 barrier/reveal timing 로직은 유지한다.
- public socket contract와 store shape는 바꾸지 않는다.
- 버튼 UX는 숨김이 아니라 `roll` 모드 disabled 유지 -> `end_turn` 전환으로 맞춘다.

## Decision Notes

- 턴 종료 허용 기준과 버튼 모드 전환 시점을 같은 `isBoardBlockingModalOpen` 상태에 묶는다.
- `START`/일반 `PROPERTY`처럼 모달이 없는 도착 칸도 `GameBoard`의 blocked 신호로 막는다.
- `canManageAssetsThisTurn`도 같은 기준을 써서 보드가 아직 정리되지 않았을 때 자산 액션이 열리지 않게 한다.

## Session Handoff Notes

- 다음 세션에서 다시 읽을 문서: `docs/ai/tasks/end-turn-after-board-settle/*`, `docs/ai/manuals/game-runtime.md`
- 바로 이어서 할 1개 단계: 필요 시 실제 게임에서 modal 있는 경로 / 없는 경로 수동 확인
- pending decision / blocker: 없음
- 검증 재개 지점: `npx vitest run src/pages/GamePage.test.tsx`, `npm run lint`, `npm run ai:check:game`, `npm run build`, `npm run ai:self-review -- --files ...`

## Open Risks

- `GameBoard`가 올리는 blocked 상태가 보수적으로 잡혀 있으면 턴 종료가 의도보다 조금 늦게 풀릴 수 있다.
- 이번 테스트는 `GamePage` 부모-자식 연결 회귀를 검증한 것이고, 실제 이동 타이밍의 세부 연출은 여전히 `GameBoard` 쪽 barrier 로직에 의존한다.
