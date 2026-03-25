# Plan

## Task

- 작업 이름: Presence Realtime Room Transitions
- 요청 날짜: 2026-03-25
- 담당 범위: 로비/대기방 접속자 목록 실시간 상태 반영

## Goal

- 대기방에서는 현재 room 참가자를 `room.players + room.status` 기준으로 즉시 `in_room`/`playing`으로 보이게 한다.
- 로비에서는 `lobby_updated` 직후 접속자 snapshot을 다시 읽어 다른 사용자의 room 이동이 새로고침 없이 반영되게 한다.

## In Scope

- `src/features/presence/online-users/**`
- `src/pages/waiting-room/page/WaitingRoomPage.tsx`
- `src/pages/lobby/hooks.ts`
- 관련 Vitest 보강

## Out Of Scope

- backend presence 이벤트 계약 변경
- waiting-room resume loading follow-up
- DM 정책 또는 접속자 목록 정렬 정책 변경

## Completion Criteria

- waiting-room에서는 stale `online_users`가 `lobby`여도 현재 room 참가자는 `대기방` 또는 `게임중`으로 보인다.
- waiting-room에서는 `online_users` snapshot에 없는 현재 room 참가자도 접속자 목록에 보인다.
- lobby에서는 `lobby_updated` 수신 시 room query invalidation과 함께 `requestOnlineUsersSnapshotSync()`가 호출된다.
- model/page/hook 테스트가 새 정책 기준으로 통과한다.

## Test Plan

- `npx vitest run src/features/presence/online-users/onlineUsersModel.test.ts src/pages/waiting-room/page/WaitingRoomPage.test.tsx src/pages/lobby/hooks.test.tsx`
- `npm run lint`
- 필요 시 `npm run ai:check:lobby`
