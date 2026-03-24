# Context

## Current Behavior

- `GameBoard.tsx`의 `PLAYER_MOVED` 처리 callback은 `startTravelTokenFx`, `clearTravelTokenFx`를 참조하지만 dependency array에 포함하지 않아 lint warning이 난다
- `GamePage.test.tsx`는 Zustand store mutation과 test cleanup이 `act(...)` 바깥에서 실행되어 React state update warning이 반복 출력된다
- 두 경고 모두 현재 기능 버그보다는 기존 테스트/코드 품질 warning에 가깝다

## Related Files

- `docs/ai/manuals/common.md`
- `docs/rules.md`
- `docs/testing.md`
- `docs/ai/manuals/game-runtime.md`
- `src/components/board/GameBoard.tsx`
- `src/pages/GamePage.test.tsx`
- `src/test/setup.ts`
- `TODO.md`

## Constraints

- warning 제거 외의 런타임 동작 변경은 피한다
- `GamePage.test` 경고 정리는 런타임 코드가 아니라 테스트 정리로 해결한다
- 커밋은 `GameBoard` / `GamePage.test`로 분리한다

## Decision Notes

- `GameBoard`는 dependency array만 최소 수정한다
- `GamePage.test`는 store seed/reset helper와 explicit cleanup 순서 정리로 warning을 없앤다
- 전역 `src/test/setup.ts`는 유지하고, 대상 테스트 파일에서 cleanup 이후 store reset을 보장한다
