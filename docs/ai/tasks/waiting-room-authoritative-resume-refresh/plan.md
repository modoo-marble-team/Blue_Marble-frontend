# Plan

## Task

- 작업 이름: Waiting Room Authoritative Resume Refresh
- 요청 날짜: 2026-03-25
- 담당 범위: waiting-room resume authoritative refresh / presence follow-up refresh

## Goal

- game 종료 후 waiting-room 복귀 시 bootstrap snapshot이 stale player/ready 상태를 오래 보여주지 않게 한다.
- 다른 사용자의 room create/join 이동이 로비/대기방 접속자 목록에 더 빠르게 반영되게 한다.

## In Scope

- `src/pages/waiting-room/controller/lifecycle.ts`
- `src/features/presence/online-users/**`
- `src/pages/lobby/hooks.ts`
- `src/pages/waiting-room/controller/socketSync.ts`
- `src/pages/waiting-room/controller/actions.ts`
- `src/pages/GamePage.tsx`
- 관련 Vitest

## Out Of Scope

- backend contract 변경
- waiting-room seat UI 재설계
- presence source of truth 재정의

## Completion Criteria

- resume room 경로는 bootstrap snapshot이 있더라도 background `joinWaitingRoom()`으로 authoritative snapshot을 다시 적용한다.
- `room_updated`가 join refresh보다 먼저 오면 join 결과가 최신 socket snapshot을 덮지 않는다.
- `lobby_updated`와 local leave 이후 presence refresh는 즉시 1회 + follow-up 1회로 동작한다.
- 관련 lifecycle/socketSync/lobby/game/presence 테스트가 새 동작을 검증한다.

## Test Plan

- `npx vitest run src/features/presence/online-users/onlineUsersSocket.test.ts src/pages/waiting-room/controller/lifecycle.test.ts src/pages/waiting-room/controller/socketSync.test.ts src/pages/waiting-room/controller/actions.test.ts src/pages/lobby/hooks.test.tsx src/pages/GamePage.test.tsx`
- `npm run lint`
- `npm run ai:check:waiting-room`
- `npm run ai:check:lobby`
- `npm run build`
