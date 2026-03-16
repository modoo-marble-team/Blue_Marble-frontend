# Plan

## Task

- 작업 이름: presence 실백엔드 계약 반영
- 요청 날짜: 2026-03-16
- 담당 범위: lobby presence, online users snapshot/socket 정렬

## Goal

- 실백엔드 기준으로 `/users/online` REST 스냅샷과 `online_users` 소켓 이벤트 계약을 프론트와 일치시킨다.
- `lobby | in_room | playing` 상태값과 접속자 목록 갱신 흐름이 mock/real 모두에서 같은 의미로 동작하도록 정리한다.
- 로비와 대기방에서 접속자 목록이 실데이터와 어긋나지 않도록 초기화/구독 경계를 안정화한다.

## In Scope

- `/api/users/online` 응답 shape와 프론트 `OnlineUserPayload` 매핑 재확인
- `online_users` 이벤트 수신 시 상태 업데이트 규칙 점검
- real 모드 초기 REST snapshot + socket 후속 동기화 흐름 정렬
- `OnlineUserStatus` enum과 backend 계약 literal 재확인
- presence 관련 mock/real 분기와 테스트 기대값 정리
- 필요 시 lobby/waiting-room에서 presence 데이터 소비 방식 보정

## Out Of Scope

- DM 정책 변경
- room cleanup/disconnect 서버 처리 변경
- waiting-room ready/start/leave 플로우 재수정
- game runtime 관련 상태 복구

## Target Files

- `src/features/presence/api.ts`
- `src/features/presence/types.ts`
- `src/features/presence/useOnlineUsersSocket.ts`
- `src/features/presence/onlineUsersSocket.ts`
- `src/features/presence/useOnlineUsersSocket.test.tsx`
- 필요 시 `src/pages/lobby/LobbyPage.tsx`
- 필요 시 `src/pages/waiting-room/WaitingRoomPage.tsx`

## Completion Criteria

- real 모드에서 `/users/online` 초기 snapshot이 실백엔드 응답 기준으로 정상 반영된다.
- `online_users` 소켓 이벤트가 `lobby | in_room | playing` 상태값을 프론트 enum과 일치하게 갱신한다.
- mock 모드와 real 모드가 같은 `OnlineUserPayload` 의미를 유지한다.
- 접속자 목록 관련 Vitest와 필요한 lobby 검증이 통과한다.

## Test Plan

- 최소 실행 테스트
  - `npx vitest run src/features/presence/useOnlineUsersSocket.test.tsx`
- 추가 검증
  - `npm run ai:check:lobby`
  - 필요 시 `npm run lint`
  - 필요 시 `npm run build`
