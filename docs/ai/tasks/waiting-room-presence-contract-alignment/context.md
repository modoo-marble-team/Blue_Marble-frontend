# Context

## Background

- backend 계약이 바뀌면서 room membership / presence authoritative 전환 시점이 REST와 snapshot 중심으로 정리되었다.
- `POST /rooms`, `POST /rooms/:roomId/join`, `POST /rooms/:roomId/leave`, `POST /rooms/:roomId/start`, game 종료 finalize가 membership + presence를 확정한다.
- `enter_room` / `leave_room`은 room socket 구독 제어만 담당하고 membership / presence를 바꾸지 않는다.
- `online_users`는 authoritative snapshot, `user_status_changed`는 빠른 증분 반영이다.

## Current Problems

- game 종료 후 `GamePage -> /rooms/:roomId` 복귀가 waiting-room lifecycle에서 새 room 참가처럼 `joinWaitingRoom()`을 다시 호출한다.
- waiting-room / lobby 접속자 목록은 existing `online_users` status를 `room.status` 기반 fallback으로 덮어써 stale 상태를 더 오래 보여줄 수 있다.
- waiting-room leave, game leave 이후에는 접속자 목록 재동기화 요청이 없어 새로고침 전까지 `playing` / `in_room`이 남는 사례가 있다.

## Key Files

- `src/pages/GamePage.tsx`
- `src/pages/waiting-room/page/WaitingRoomPage.tsx`
- `src/pages/waiting-room/hooks/hooks.ts`
- `src/pages/waiting-room/controller/lifecycle.ts`
- `src/pages/waiting-room/controller/actions.ts`
- `src/features/presence/online-users/onlineUsersModel.ts`
- `src/pages/lobby/LobbyPage.tsx`

## Constraints

- `useWaitingRoomController`는 조립 계층으로 유지하고 상세 전이는 lifecycle/actions에 둔다.
- `leaveWaitingRoom` API 성공 전에 `leave_room`을 먼저 보내면 안 된다.
- 접속자 목록 반환 형태와 `useOnlineUsersSocket()` API는 유지한다.
- mock 모드와 실제 모드에 보이는 동작 차이를 만들지 않는다.
