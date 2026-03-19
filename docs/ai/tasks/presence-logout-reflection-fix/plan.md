# Plan

## Task

- 작업 이름: Presence Logout Reflection Fix
- 요청 날짜: 2026-03-18
- 담당 범위: 입력 파일 기준 초안 생성

## Goal

- 상대 사용자가 로그아웃하거나 연결이 끊겼을 때 로비/대기방 접속자 목록이 즉시 반영되도록 수정한다.
- `online_users` 실시간 이벤트가 늦게 도착한 REST snapshot에 덮어써지지 않게 하고, 대기방은 stale `room.players`를 근거로 오프라인 사용자를 다시 추가하지 않게 한다.

## In Scope

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

## Out Of Scope

- backend의 room cleanup 정책 변경
- DM 정책이나 unread 계산 방식 변경
- waiting-room seat 카드 자체의 player snapshot 정합성 수정

## Target Files

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

## Completion Criteria

- 로비에서 `online_users` 이벤트로 빠진 사용자가 늦게 도착한 snapshot 때문에 다시 나타나지 않는다.
- `user_status_changed`의 `offline` 이벤트가 들어오면 새로고침 없이 해당 사용자가 목록에서 바로 제거된다.
- 대기방 접속자 목록은 online snapshot에 없는 room player를 다시 추가하지 않는다.
- 관련 presence/waiting-room 테스트가 회귀 케이스를 포함해 통과한다.

## Role Plan

- Planner: 범위 / 완료 기준 / 참고 문서 정리
- Implementer: 최소 범위 구현
- Reviewer: diff / self-review / 위험 신호 확인
- Tester: 검증 명령 실행과 결과 정리

## Test Plan

- `npm run lint`
- `npm run ai:check:lobby`
- `npm run ai:check:waiting-room`
- `npm run ai:check:chat-e2e`
- `npm run ai:check:waiting-room-e2e`
- `npm run ai:check:build`
