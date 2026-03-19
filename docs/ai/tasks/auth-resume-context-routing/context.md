# Context

## Current Behavior

- 앱은 persisted access token이 있으면 `restoreAuthSession`으로 세션만 복구한다.
- 복구가 끝난 뒤 홈 화면에서는 `useRedirectAuthenticatedToLobby`가 무조건 `/lobby`로 보낸다.
- 새로고침/재접속 시 사용자가 실제로 참가 중인 방/게임 문맥을 서버 기준으로 복원하는 API 분기가 없다.

## Related Files

- `src/App.tsx`
- `src/pages/HomePage.tsx`
- `src/features/auth/api/api.ts`
- `src/features/auth/session/hooks/useAuthBootstrap.ts`
- `src/pages/waiting-room/page/WaitingRoomPage.tsx`
- `src/pages/GamePage.tsx`
- `docs/ai/manuals/common.md`
- `docs/ai/manuals/lobby.md`
- `docs/ai/manuals/waiting-room.md`
- `docs/rules.md`
- `docs/testing.md`

## Constraints

- `resume_target`을 최우선 분기 기준으로 사용한다.
- `room_status`, `presence_status`는 보조 정보로만 사용한다.
- callback 페이지와 nickname setup 페이지의 기존 흐름은 유지한다.
- waiting-room/game 페이지는 location state가 없어도 동작해야 하며, 가능한 최소 state만 주입한다.

## Decision Notes

- 복귀 분기는 HomePage가 아니라 App 공통 훅에서 한 번 처리한다.
- `resume_target = room`이면 `room_status = playing`이어도 room 경로를 유지한다.
- mock auth 모드에서는 기본값으로 lobby context를 반환해 기존 mock 개발 흐름을 깨지 않는다.

## Open Risks

- `users/me/context` 호출 실패 시 앱은 fallback 경로를 선택해야 하므로, 홈 경로에서만 `/lobby` fallback을 사용한다.
- 게임 경로가 이미 맞는 경우에도 location state에 `roomId`가 없으면 채팅 문맥이 늦게 붙을 수 있다.
