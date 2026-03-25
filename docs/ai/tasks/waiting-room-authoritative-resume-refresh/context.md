# Context

## Background

- 기존 `waiting-room-resume-bootstrap-presence-resync` 작업으로 game 종료 후 waiting-room 복귀 무한 로딩은 해소했다.
- 하지만 resume 경로가 `lastRoomSnapshot`을 즉시 보여준 뒤 authoritative room snapshot으로 다시 덮지 않아서, 실제로는 로비에 나간 플레이어가 waiting-room player/ready 상태로 남아 보였다.
- waiting-room과 lobby는 `lobby_updated -> requestOnlineUsersSnapshotSync()`를 이미 수행했지만, 다른 사용자의 room create/join 직후에는 `/users/online` snapshot 반영이 살짝 늦어 접속자 목록이 stale하게 남는 경우가 있었다.

## Current Decision

- resume 경로는 bootstrap snapshot을 유지하되, 항상 background `joinWaitingRoom()`으로 authoritative room snapshot을 재검증한다.
- presence refresh helper는 optional follow-up refresh를 지원하고, room create/join/leave처럼 snapshot 반영 시차가 있는 경로에서 이를 사용한다.

## Risks

- background join refresh는 backend가 idempotent rejoin을 허용한다는 전제에 의존한다.
- follow-up refresh는 추가 REST 요청 1회를 발생시키므로, `lobby_updated` burst 시 요청 수가 약간 늘 수 있다.
