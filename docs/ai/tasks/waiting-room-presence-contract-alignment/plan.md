# Plan

## Task

- 작업 이름: Waiting Room Presence Contract Alignment
- 요청 날짜: 2026-03-25
- 담당 범위: game 종료 복귀 / waiting-room lifecycle / lobby-presence 동기화

## Goal

- game 종료 후 waiting-room 복귀를 새 `join`이 아니라 기존 room membership resume으로 처리한다.
- 대기방/로비 접속자 목록이 `online_users` authoritative snapshot을 기준으로 보이도록 정렬한다.
- leave 성공 직후 presence stale 때문에 새로고침해야 정상화되는 경로를 줄인다.

## In Scope

- `src/pages/GamePage.tsx`
- `src/pages/waiting-room/**`
- `src/features/presence/online-users/**`
- 필요 시 `src/pages/lobby/LobbyPage.tsx`
- 관련 Vitest 보강

## Out Of Scope

- backend room cleanup 정책 자체 수정
- waiting-room seat UI 스타일 변경
- DM unread 정책 변경
- game socket contract 자체 변경

## Completion Criteria

- game 종료 후 waiting-room으로 돌아갈 때 `/rooms/:roomId/join` 재호출 없이 room socket 구독만 복구한다.
- resume 직후 첫 `room_updated`를 authoritative room snapshot으로 반영하고, 그 전까지는 loading 상태를 유지한다.
- `mergeOnlineUsersWithRoomPlayers` / `mergeOnlineUsersWithCurrentUser`는 기존 `online_users` status를 덮어쓰지 않고 missing user만 fallback status로 보강한다.
- waiting-room leave / game leave 후 접속자 목록 재동기화 요청이 발생한다.
- 관련 lifecycle/actions/model/page 테스트가 새 계약 기준으로 통과한다.

## Test Plan

- `npx vitest run src/pages/waiting-room/controller/lifecycle.test.ts src/pages/waiting-room/controller/actions.test.ts src/features/presence/online-users/onlineUsersModel.test.ts src/pages/GamePage.test.tsx src/pages/waiting-room/page/WaitingRoomPage.test.tsx`
- `npm run lint`
- `npm run build`
- `npm run ai:check:game`
