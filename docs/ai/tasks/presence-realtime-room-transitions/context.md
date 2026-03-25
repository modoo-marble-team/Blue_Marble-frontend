# Context

## Background

- backend 새 계약에서는 `online_users`가 authoritative snapshot이지만, room membership 변화 직후 snapshot 전파가 늦을 수 있다.
- waiting-room은 이미 현재 room의 `players`와 `status`를 알고 있으므로, 그 범위에서는 online snapshot보다 더 강한 로컬 truth를 가질 수 있다.

## Current Problems

- 다른 사용자가 대기방에 들어와도 접속자 목록에는 잠시 `로비`로 남는다.
- `online_users` snapshot에 없는 room player는 waiting-room 접속자 목록에서 아예 빠질 수 있다.
- lobby는 `lobby_updated` 시 방 목록만 다시 읽고 presence snapshot은 재동기화하지 않아, 다른 사용자의 join/leave 직후 stale 상태가 남을 수 있다.

## Key Files

- `src/features/presence/online-users/onlineUsersModel.ts`
- `src/pages/waiting-room/page/WaitingRoomPage.tsx`
- `src/pages/lobby/hooks.ts`

## Constraints

- `useOnlineUsersSocket()` 반환 형태와 `LobbyPage`의 전체 구조는 유지한다.
- waiting-room status override는 현재 room 참가자에만 한정한다.
- mock/real socket 경로 모두 같은 화면 정책을 유지해야 한다.
