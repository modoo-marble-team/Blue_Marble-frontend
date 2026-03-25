# Context

## Current Behavior

- `shouldApplyTravelMoveAnimation`은 `trigger === 'travel'` 또는 출발 타일이 `TRAVEL` / `ISLAND`일 때 fast animation을 적용한다.
- 이 때문에 일반 주사위로 무인도에서 출발하는 이동이 fast로 분류되고, 반대로 `섬으로 이동` 칸에서 무인도로 강제 이동하는 경로는 일반 속도로 보일 수 있다.
- 카드/이벤트로 무인도로 이동하는 mock 연출은 `handleCardConfirm()`에서 직접 `movePlayerSequentially()`를 호출하지만, 현재는 fast timing을 재사용하지 않는다.

## Related Files

- `src/components/board/gameBoardEventQueueUtils.ts`
- `src/components/board/gameBoardEventQueueUtils.test.ts`
- `src/components/board/GameBoard.tsx`
- `docs/ai/tasks/island-speed-and-exit-modal-style/*`
- `docs/ai/tasks/game-board-result-and-travel-fix/*`

## Relevant Manuals

- `docs/ai/manuals/common.md`
- `docs/ai/manuals/game-runtime.md`
- `docs/rules.md`
- `docs/testing.md`

## Constraints

- 서버 authoritative state나 socket event shape는 바꾸지 않는다.
- fast 판정은 UI animation 로직에만 한정한다.
- 카드 무인도 이동은 mock 경로 연출이므로 기존 skipTurns/state 갱신 로직은 유지한다.
- 일반 무인도 착지/출발과 travel tile 동작은 회귀시키면 안 된다.

## Decision Notes

- fast 이동의 정의는 `travel` 또는 `MOVE_TO_ISLAND -> ISLAND` 강제 이동으로 제한한다.
- `ISLAND` 출발만으로 fast 처리하는 규칙은 제거한다.
- 카드/이벤트 무인도 이동도 사용자 기대상 “강제 이동”에 포함하므로 같은 fast timing 상수를 재사용한다.

## Session Handoff Notes

- 다음 세션에서 다시 읽을 문서: `docs/ai/tasks/forced-island-fast-move-fix/*`, `docs/ai/manuals/game-runtime.md`
- 바로 이어서 할 1개 단계: 없음
- pending decision / blocker: 없음
- 검증 재개 지점: `npx vitest run src/components/board/gameBoardEventQueueUtils.test.ts`, `npm run lint`, `npm run ai:check:game`, `npm run build`, `npm run ai:self-review -- --files ...` 실행 완료

## Open Risks

- 실서버가 별도 `go_to_island` trigger를 보내지 않아도 `from=MOVE_TO_ISLAND`, `to=ISLAND` fallback 판정이 필요하다.
- 카드 무인도 이동은 mock 전용 로컬 연출이라 실서버 경로와 다르지만, 현재 UX 기준상 같은 fast 속도로 맞추는 것이 자연스럽다.
