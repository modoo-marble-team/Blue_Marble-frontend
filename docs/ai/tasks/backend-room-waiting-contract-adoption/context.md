# Context

## Current Behavior

- 로비에서 방 생성 후 `preJoinedSnapshot`을 직접 만들어 waiting-room으로 넘긴다.
- waiting-room lifecycle은 `preJoinedSnapshot`이 있으면 join API 없이 즉시 상태를 반영한다.
- 백엔드는 방 생성 직후 host가 이미 입장 상태이지만, 초기 snapshot 확보를 위해 `POST /rooms/{room_id}/join` 재호출을 권장하고 있다.
- waiting-room은 `player_ready`, `host_changed`, `chat`, `game_start`만 구독하며, 방 삭제 신호인 `lobby_updated(action: "removed")`는 아직 듣지 않는다.
- `LobbyUpdatedEventPayload`는 full room payload를 전제로 작성되어 있어 `removed`의 `{ room: { id } }` 최소 payload를 안전하게 표현하지 못한다.

## Related Files

- `src/pages/lobby/useLobbyRoomActions.ts`
- `src/pages/lobby/LobbyPage.tsx`
- `src/pages/lobby/LobbyPage.test.tsx`
- `src/pages/waiting-room/api.ts`
- `src/pages/waiting-room/types.ts`
- `src/pages/waiting-room/WaitingRoomPage.tsx`
- `src/pages/waiting-room/hooks.ts`
- `src/pages/waiting-room/controller/lifecycle.ts`
- `src/pages/waiting-room/controller/socketSync.ts`
- `src/pages/waiting-room/controller/lifecycle.test.ts`
- `src/pages/waiting-room/controller/socketSync.test.ts`
- `src/pages/waiting-room/WaitingRoomFlow.test.tsx`

## Constraints

- 수동 퇴장과 cleanup 퇴장 시퀀스 재사용 규칙을 깨면 안 된다.
- `leaveWaitingRoom` 성공 전에 `leave_room` 소켓 이벤트를 먼저 보내면 안 된다.
- host의 join 재호출은 안전하지만, UI에서 중복 입장처럼 보이면 안 된다.
- `lobby_updated`는
  - `created / updated / status_changed`: full room card + `host_id`
  - `removed`: `{ room: { id } }`
    로 분기된다.
- waiting-room 수정 시 lobby/presence 경계도 함께 봐야 하지만 DM 정책 자체는 바꾸지 않는다.

## Decision Notes

- fake `preJoinedSnapshot`은 빠른 UX를 위한 임시 가정이었고, 실제 서버 snapshot과 drift 위험이 있으므로 join 응답을 진실 소스로 맞춘다.
- waiting-room 삭제 감지는 전용 room 삭제 이벤트가 없으므로 `lobby_updated(action: "removed")`를 직접 구독하는 방식으로 간다.
- `LobbyUpdatedEventPayload`는 discriminated union으로 나눠 removed 최소 payload를 타입 안정적으로 처리한다.
- create 이후 즉시 navigate하더라도 waiting-room이 join 응답을 기준으로 렌더링을 잡게 하면 host 재진입/초기 스냅샷 불일치 위험을 줄일 수 있다.

## Open Risks

- create -> join -> enter_room 순서가 바뀌면서 기존 `WaitingRoomFlow` 테스트가 snapshot 기대를 다시 맞춰야 할 수 있다.
- waiting-room에서 lobby 이벤트를 추가 구독하면 cleanup 타이밍과 언마운트 시 중복 처리 위험이 생길 수 있다.
- mockGateway와 실제 socket 경로가 같은 삭제 계약을 따르도록 같이 맞추지 않으면 local E2E만 통과하고 real path가 어긋날 수 있다.
