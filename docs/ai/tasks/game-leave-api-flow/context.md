# Context

## Current Behavior

- `GamePage.tsx`의 나가기 버튼은 확인 모달을 띄운 뒤, 확인 시 `window.location.href = '/lobby'`로 바로 이동한다.
- 현재 프론트에는 room leave API 호출이나 socket emit이 없다.
- 페이지 이동으로 socket disconnect는 발생할 수 있지만, 버튼 기반 leave와 disconnect를 프론트에서 구분하지 못한다.

## Problem

- 서버에는 사용자가 명시적으로 게임을 나갔다는 상태 변경이 반영되지 않는다.
- leave 실패를 사용자에게 보여줄 수 없고, 서버 정리 전에 화면이 사라진다.
- reconnect timeout 복구와 명시적 leave가 같은 disconnect 의미로 섞일 수 있다.
- 백엔드 계약이 `POST /api/rooms/{room_id}/leave`로 정리되었는데, 프론트는 여전히 game leave 기준으로 구현돼 있다.

## Related Files

- `src/pages/GamePage.tsx`
- `src/components/game/modals/ExitGameModal.tsx`
- `src/pages/game/*`
- `src/stores/game.store.ts`
- `src/features/presence/mock/mockData.ts`
- `docs/ai/manuals/common.md`
- `docs/ai/manuals/game-runtime.md`
- `docs/rules.md`
- `docs/testing.md`

## Constraints

- 게임 canonical identifier는 `gameId`를 유지한다.
- 명시적 leave 호출은 `roomId` 기준으로 통일한다.
- leave 성공 전에는 화면을 유지하고, 실패 시 사용자가 재시도할 수 있어야 한다.
- mock 모드에서도 room membership / presence 상태를 실제 room leave 의미에 가깝게 정리한다.
- 기존 채팅/보드/game state 렌더링 흐름은 건드리지 않는다.

## Decision Notes

- leave는 `src/pages/game/api.ts`에 room leave helper로 분리한다.
- `GamePage`는 leave helper 결과만 보고 store reset + navigate를 수행한다.
- exit modal은 `isSubmitting`을 받아 요청 중 중복 클릭과 취소를 막는다.
- mock 경로는 `mockLeaveWaitingRoom`을 재사용해 room membership 정리까지 맞춘다.

## Open Risks

- leave 이후 room membership 정리와 다른 참가자에 대한 broadcast는 서버 정책에 의존한다.
- mock 모드 leave는 presence를 `lobby`로 바꾸는 최소 fallback만 제공하므로, 실서버와 완전히 동일한 상태 정리는 아니다.
