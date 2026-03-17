# Context

## Current Behavior

- 로비는 `/users/online` 결과에 현재 세션 사용자가 빠질 때, 페이지 내부에서 직접 `lobby` 상태로 보정하고 있다.
- 대기방은 `/users/online` 결과와 `room.players`를 섞어 현재 room 참가자를 `in_room/playing` 상태로 직접 보정하고 있다.
- 두 로직은 모두 “접속자 목록 최종 표시 모델 보정”이라는 같은 책임이지만, 현재는 각 페이지에 흩어져 있다.

## Related Files

- `src/features/presence/onlineUsersModel.ts`
- `src/features/presence/types.ts`
- `src/pages/lobby/LobbyPage.tsx`
- `src/pages/waiting-room/WaitingRoomPage.tsx`
- `src/pages/lobby/LobbyPage.test.tsx`
- `src/pages/waiting-room/WaitingRoomPage.test.tsx`
- `docs/ai/manuals/lobby.md`
- `docs/ai/manuals/waiting-room.md`

## Constraints

- mock/real 모드 모두 같은 사용자 경험을 유지해야 한다.
- `OnlineUser` 반환 형태와 기존 `useOnlineUsersSocket` 반환 형태는 유지한다.
- DM 정책이나 unread badge 규칙은 건드리지 않는다.
- 최근 회귀를 막기 위해 현재 사용자 누락 방지와 `room.players` 기반 보정은 동작을 바꾸지 않는다.

## Decision Notes

- 공통화는 “정말 함께 바뀌는가”가 확인되는 범위만 한다. 이번 작업은 status 보정 규칙이 로비와 대기방에서 함께 바뀌는 성격이므로 helper 추출 근거가 충분하다.
- helper는 `presence` feature에 두고, 페이지에서는 source data와 session/room 정보를 넘겨 결과만 받는 형태가 가장 읽기 쉽다.
- waiting-room lifecycle/socket/action 구조는 그대로 두고, user list 표시 모델 계산만 이동한다.

## Open Risks

- helper 추출 과정에서 로비와 대기방의 미세한 상태 규칙 차이를 과도하게 공통화하면 오히려 결합도가 올라갈 수 있다.
- waiting-room은 `room.players`가 source of truth에 더 가깝고, 로비는 session 보정이 핵심이라, helper API를 너무 일반화하면 읽기 어려워질 수 있다.
- 백엔드 room cleanup 이슈는 이번 작업으로 해결되지 않는다.
