# Plan

## Task

- 작업 이름: 접속자 목록 보정 로직 공통화
- 요청 날짜: 2026-03-17
- 담당 범위: lobby / waiting-room / presence user merge helper

## Goal

- 로비와 대기방이 각자 직접 계산하는 접속자 목록 보정 로직을 `presence` feature helper로 이동한다.
- 페이지 컴포넌트는 보정 규칙 자체보다 화면 조합에 집중하도록 정리한다.
- 현재 사용자 누락, `room.players` 기반 상태 보정 같은 최근 회귀 방지 로직은 유지한다.

## In Scope

- `src/features/presence/**`에 online user merge helper 추가 또는 기존 model 확장
- 로비의 현재 사용자 `lobby` 상태 보정 로직 이전
- 대기방의 `room.players` 기반 `in_room/playing` 상태 보정 로직 이전
- 로비/대기방이 helper 결과만 소비하도록 단순화
- 관련 Vitest 보강

## Out Of Scope

- `useOnlineUsersSocket` reconnect/error 정책 재수정
- room cleanup / stale membership 서버 이슈 대응
- DM unread 정책 변경
- waiting-room leave/start lifecycle 구조 변경

## Target Files

- `src/features/presence/onlineUsersModel.ts`
- 필요 시 `src/features/presence/types.ts`
- `src/pages/lobby/LobbyPage.tsx`
- `src/pages/waiting-room/WaitingRoomPage.tsx`
- `src/pages/lobby/LobbyPage.test.tsx`
- 필요 시 `src/pages/waiting-room/WaitingRoomPage.test.tsx`

## Completion Criteria

- 로비와 대기방 모두 접속자 목록 보정 규칙을 page inline 로직이 아니라 `presence` helper를 통해 계산한다.
- 현재 사용자 누락 방지와 waiting-room player 상태 보정이 기존과 동일하게 유지된다.
- 페이지 파일은 보정 규칙보다 화면 조합이 더 먼저 보이도록 단순화된다.
- 관련 Vitest와 최소 lint가 통과한다.

## Test Plan

- 최소 실행 테스트
  - `npx vitest run src/pages/lobby/LobbyPage.test.tsx`
- 추가 검증
  - 필요 시 `npx vitest run src/pages/waiting-room/WaitingRoomPage.test.tsx`
  - `npm run lint -- src/pages/lobby/LobbyPage.tsx src/pages/waiting-room/WaitingRoomPage.tsx src/features/presence/onlineUsersModel.ts`
