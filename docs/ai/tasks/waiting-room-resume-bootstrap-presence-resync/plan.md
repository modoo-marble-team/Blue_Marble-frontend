# Plan

## Task

- 작업 이름: Waiting Room Resume Bootstrap Presence Resync
- 요청 날짜: 2026-03-25
- 담당 범위: game 종료 후 waiting-room resume bootstrap / waiting-room 전역 presence resync

## Goal

- game 종료 후 waiting-room 복귀가 `room_updated`만 기다리다 무한 로딩되는 경로를 제거한다.
- waiting-room에서도 `lobby_updated`를 전역 presence 재동기화 신호로 사용해 다른 사용자의 room 이동이 바로 접속자 목록에 반영되게 한다.

## In Scope

- `src/pages/GamePage.tsx`
- `src/pages/waiting-room/**`
- 관련 Vitest 보강

## Out Of Scope

- backend contract 변경
- 로비 접속자 목록 병합 정책 재설계
- waiting-room seat / DM UI 변경

## Completion Criteria

- `game -> waiting-room` 복귀 시 `resumeRoomMembership + lastRoomSnapshot` state가 전달된다.
- resume bootstrap snapshot이 있으면 waiting-room이 즉시 room/chat 상태를 그리며 loading을 해제한다.
- waiting-room의 모든 `lobby_updated` 수신은 `requestOnlineUsersSnapshotSync()`를 호출한다.
- 현재 방 `removed`는 기존 cleanup 동작을 유지한다.
- lifecycle/socketSync/page/game 테스트가 새 경로를 검증한다.

## Test Plan

- `npx vitest run src/pages/waiting-room/controller/lifecycle.test.ts src/pages/GamePage.test.tsx src/pages/waiting-room/page/WaitingRoomPage.test.tsx src/pages/waiting-room/controller/socketSync.test.ts`
- `npm run lint`
- `npm run ai:check:waiting-room`
- `npm run ai:check:lobby`
- `npm run build`
