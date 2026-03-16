# Context

## Current Behavior

- 실백엔드 검증 중 auth와 room/waiting-room 기본 계약은 정리됐지만, 접속자 목록은 `/users/online` REST snapshot과 `online_users` socket 이벤트를 함께 써서 동기화한다.
- 프론트 `OnlineUserStatus`는 `lobby | in_room | playing`을 기대한다.
- mock 모드에서는 `mockData`와 mock socket broadcast를 사용하고, real 모드에서는 초기 REST snapshot 뒤 socket 이벤트를 구독한다.
- room cleanup 이슈가 있어 서버에서 stale room/player 정리가 완전히 맞지 않을 수 있으므로, presence 계약과 room membership 문제를 분리해서 봐야 한다.

## Related Files

- `src/features/presence/api.ts`
- `src/features/presence/types.ts`
- `src/features/presence/useOnlineUsersSocket.ts`
- `src/features/presence/onlineUsersSocket.ts`
- `src/features/presence/useOnlineUsersSocket.test.tsx`
- `src/pages/lobby/LobbyPage.tsx`
- `src/pages/waiting-room/WaitingRoomPage.tsx`
- `docs/ai/manuals/lobby.md`

## Constraints

- mock 모드와 real 모드를 동시에 유지해야 한다.
- `OnlineUserStatus` literal은 backend 계약과 동일해야 한다.
- presence 갱신 때문에 DM 정책이나 unread 로직을 바꾸지 않는다.
- room cleanup 서버 이슈는 presence 계약 수정으로 우회하지 않는다.

## Decision Notes

- 이번 작업은 room cleanup을 프론트에서 덮는 게 아니라, 접속자 목록 데이터 출처와 상태값 해석을 명확히 맞추는 데 집중한다.
- 초기 REST snapshot과 이후 socket 이벤트가 같은 payload shape를 유지해야 테스트와 실환경이 덜 흔들린다.
- 필요하면 lobby/waiting-room에서 presence 소비 경계를 살짝 보정하되, source of truth는 `useOnlineUsersSocket`에 유지한다.

## Open Risks

- 서버가 stale room/player를 정리하지 못하는 경우, presence만 맞아도 room card와 waiting-room player card는 여전히 어긋날 수 있다.
- `/users/online` 응답 shape가 문서와 다르면 타입만 맞춰도 UI는 깨질 수 있어 실제 응답 예시 확인이 필요하다.
