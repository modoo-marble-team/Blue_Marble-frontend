# Plan

## Task

- 작업 이름: 방 생성 및 대기방 계약 반영
- 요청 날짜: 2026-03-16
- 담당 범위: lobby, waiting-room, presence 연결 계약 정렬

## Goal

- 백엔드 최종 계약에 맞춰 방 생성 이후 진입 흐름을 `create -> join -> enter_room` 순서로 정렬한다.
- waiting-room이 `lobby_updated(action: "removed")`를 감지해 방 삭제 시 안전하게 로비로 복귀하도록 만든다.
- `lobby_updated` payload를 `removed` 최소 payload / 그 외 full room card로 타입 분리해 socket 계약을 안정화한다.

## In Scope

- `POST /rooms` 이후 fake `preJoinedSnapshot` 가정을 줄이고 `POST /rooms/{room_id}/join` 기반 초기 snapshot 사용
- waiting-room 초기화에서 `preJoinedSnapshot` 우선 처리 규칙 재검토
- `enter_room` 소켓 송신 시점 정렬
- `lobby_updated` 타입을 discriminated union으로 분리
- waiting-room에서 `lobby_updated(action: "removed")` 구독 추가
- 방 삭제 시 stale room state 정리 및 로비 복귀
- 필요 시 로비 방 생성/입장 테스트 기대값 갱신

## Out Of Scope

- auth 세션/카카오 로그인 흐름 수정
- game runtime 전면 수정
- DM/접속자 목록 정책 변경
- `/users/online` 계약 반영

## Target Files

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
- 필요 시 `src/pages/waiting-room/mockGateway.ts`

## Completion Criteria

- 방 생성 후 waiting-room 진입은 `POST /rooms -> POST /rooms/{room_id}/join -> enter_room` 순서로 맞춘다.
- waiting-room은 join 응답 snapshot을 기준으로 초기 상태를 구성한다.
- `lobby_updated`는 `removed`와 full payload action을 구분한 타입으로 정리된다.
- waiting-room에서 현재 room이 `removed`되면 중복 퇴장 없이 로비로 복귀한다.
- 관련 lobby/waiting-room Vitest와 시작/채팅 E2E가 통과한다.

## Test Plan

- 최소 실행 테스트
  - `npx vitest run src/pages/waiting-room/controller/lifecycle.test.ts`
  - `npx vitest run src/pages/waiting-room/controller/socketSync.test.ts`
  - `npx vitest run src/pages/lobby/LobbyPage.test.tsx`
- 추가 검증
  - `npm run ai:check:waiting-room`
  - `npm run ai:check:lobby`
  - `npm run ai:check:waiting-room-e2e`
  - 필요 시 `npm run ai:check:chat-e2e`
