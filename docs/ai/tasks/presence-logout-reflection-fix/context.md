# Context

## Current Behavior

- `useOnlineUsersSocket`는 초기/재동기화 시 `/users/online` REST snapshot을 읽고, 이후 `online_users` 소켓 이벤트로 접속자 목록을 갱신한다.
- 실서버는 전체 `online_users` 스냅샷 외에 `user_status_changed` 증분 이벤트도 보내며, 로그아웃/연결 종료 시 `status: offline`이 들어온다.
- 현재 구현은 소켓 이벤트가 먼저 최신 목록을 반영해도, 이미 진행 중이던 이전 snapshot 응답이 늦게 돌아오면 그 오래된 결과가 다시 목록을 덮어쓸 수 있다.
- 기존 프론트는 `user_status_changed`를 전혀 구독하지 않아, 상대 로그아웃은 새로고침 전까지 목록에서 빠지지 않았다.
- 대기방은 `room.players`를 접속자 목록에 다시 합치고 있어, online snapshot에서 빠진 사용자를 stale room snapshot이 다시 되살릴 수 있다.

## Related Files

- `docs/ai/manuals/common.md`
- `docs/rules.md`
- `docs/testing.md`
- `docs/ai/manuals/lobby.md`
- `docs/ai/manuals/waiting-room.md`
- `docs/socket-mock-server.md`
- `src/features/presence/online-users/useOnlineUsersSocket.ts`
- `src/features/presence/online-users/onlineUsersModel.ts`
- `src/features/presence/online-users/api.ts`
- `src/features/presence/online-users/useOnlineUsersSocket.test.tsx`
- `src/features/presence/online-users/onlineUsersModel.test.ts`
- `src/features/presence/online-users/api.test.ts`
- `src/contracts/socket/events.ts`
- `src/contracts/socket/schemas.ts`
- `src/contracts/socket/schemas.test.ts`
- `src/pages/waiting-room/page/WaitingRoomPage.tsx`
- `src/pages/waiting-room/page/WaitingRoomPage.test.tsx`

## Relevant Manuals

- `docs/ai/manuals/common.md`
- `docs/rules.md`
- `docs/testing.md`
- `docs/ai/manuals/lobby.md`
- `docs/ai/manuals/waiting-room.md`
- `docs/socket-mock-server.md`

## Constraints

- 접속자 목록의 source of truth는 `/users/online` + `online_users` + `user_status_changed` 조합으로 유지한다.
- mock 모드와 real 모드의 visible behavior를 크게 벌리지 않는다.
- current user는 접속자 목록에서 계속 보여야 한다.

## Decision Notes

- 실시간 `online_users` 이벤트를 받으면 pending snapshot 결과를 무효화해 오래된 REST 응답이 최신 socket 상태를 덮어쓰지 못하게 한다.
- `user_status_changed`는 `offline`이면 제거, 그 외 상태면 upsert로 처리해 실서버 증분 이벤트를 바로 반영한다.
- 대기방 user list는 online snapshot에 존재하는 유저만 room status로 보정하고, 현재 사용자만 별도로 보정한다.
- stale room/player 문제를 프론트에서 광범위하게 덮기보다, 접속자 목록 merge 범위만 최소 수정한다.

## Open Risks

- backend가 room snapshot에서 로그아웃 유저를 늦게 정리하면 seat 카드와 user list가 일시적으로 다르게 보일 수 있다.
- snapshot fallback을 더 공격적으로 줄이면 초기 로딩 중 유저 표시 정책이 달라질 수 있어 테스트로 확인이 필요하다.
